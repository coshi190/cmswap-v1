// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {ITBridgeV2} from "./interfaces/ITBridgeV2.sol";
import {ITBridgeTokenRegistry} from "./interfaces/ITBridgeTokenRegistry.sol";
import {ITBridgeVault} from "./interfaces/ITBridgeVault.sol";
import {ITBridgeFeeCollector} from "./interfaces/ITBridgeFeeCollector.sol";

/// @title TBridgeV2
/// @notice Core bridge contract for cross-chain ERC20 token bridging
/// @dev UUPS upgradeable contract implementing lock-and-unlock mechanism
contract TBridgeV2 is
    ITBridgeV2,
    OwnableUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable
{
    using SafeERC20 for IERC20;

    // ============ Constants ============

    uint256 public constant BPS_DENOMINATOR = 10_000;
    uint256 public constant MAX_FEE_BPS = 5_000;
    uint256 public constant DEFAULT_BRIDGE_FEE_BPS = 50;
    uint256 public constant DEFAULT_PROTOCOL_FEE_BPS = 50;

    // ============ Storage ============

    uint256 public chainId;
    ITBridgeTokenRegistry public tokenRegistry;
    ITBridgeVault public vault;

    /// @notice Fee collector contract for protocol fees
    ITBridgeFeeCollector public feeCollector;

    address public relayer;
    mapping(address => uint256) private _bridgeFeeBps;
    mapping(address => uint256) private _protocolFeeBps;

    /// @notice Outgoing nonce per user
    mapping(address => uint256) private _outgoingNonces;

    /// @notice Processed incoming nonces: sourceChain => nonce => processed
    mapping(uint256 => mapping(uint256 => bool)) private _processedNonces;

    /// @notice Supported destination chains
    mapping(uint256 => bool) private _supportedChains;

    /// @notice User daily usage per token: user => token => amount
    mapping(address => mapping(address => uint256)) private _userDailyUsage;

    /// @notice User daily reset timestamp: user => token => timestamp
    mapping(address => mapping(address => uint256)) private _userDailyResetTime;

    /// @notice Storage gap for future upgrades
    uint256[40] private __gap;

    // ============ Modifiers ============

    modifier onlyRelayer() {
        if (msg.sender != relayer) revert OnlyRelayer();
        _;
    }

    // ============ Constructor ============

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    // ============ Initializer ============

    /// @notice Initialize the bridge
    function initialize(
        uint256 _chainId,
        address _tokenRegistry,
        address _vault,
        address _feeCollector,
        address _relayer
    ) external initializer {
        if (_chainId == 0) revert UnsupportedChain();
        if (_tokenRegistry == address(0)) revert InvalidAddress();
        if (_vault == address(0)) revert InvalidAddress();
        if (_feeCollector == address(0)) revert InvalidAddress();
        if (_relayer == address(0)) revert InvalidAddress();

        __Ownable_init();
        __Pausable_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        chainId = _chainId;
        tokenRegistry = ITBridgeTokenRegistry(_tokenRegistry);
        vault = ITBridgeVault(_vault);
        feeCollector = ITBridgeFeeCollector(_feeCollector);
        relayer = _relayer;
    }

    // ============ User Functions ============

    /// @inheritdoc ITBridgeV2
    function initiateBridge(
        address token,
        uint256 destChain,
        address recipient,
        uint256 amount
    ) external override nonReentrant whenNotPaused returns (uint256 nonce) {
        if (token == address(0)) revert InvalidAddress();
        if (recipient == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();
        if (!_supportedChains[destChain]) revert UnsupportedChain();
        if (!tokenRegistry.isTokenSupported(token)) revert UnsupportedToken();
        address remoteToken = tokenRegistry.getRemoteToken(token, destChain);
        if (remoteToken == address(0)) revert TokenNotSupportedOnDestination();
        ITBridgeTokenRegistry.TokenConfigView memory config = tokenRegistry.getTokenConfig(token);
        if (amount < config.minAmount) revert AmountBelowMinimum();
        if (amount > config.maxAmount) revert AmountAboveMaximum();

        _checkAndUpdateDailyLimit(msg.sender, token, amount, config.dailyLimit);

        uint256 bridgeFee = _calculateFee(token, amount, _getBridgeFee(token));
        uint256 protocolFee = _calculateFee(token, amount, _getProtocolFee(token));
        uint256 totalFee = bridgeFee + protocolFee;
        uint256 netAmount = amount - totalFee;

        nonce = _outgoingNonces[msg.sender]++;

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        if (netAmount + bridgeFee > 0) {
            IERC20(token).safeTransfer(address(vault), netAmount + bridgeFee);
            vault.lock(token, msg.sender, netAmount);
            
            if (bridgeFee > 0) {
                vault.addFees(token, bridgeFee);
            }
        }

        if (protocolFee > 0) {
            IERC20(token).safeTransfer(address(feeCollector), protocolFee);
            feeCollector.collectFee(token, protocolFee);
        }

        emit BridgeInitiated(
            nonce,
            token,
            msg.sender,
            recipient,
            chainId,
            destChain,
            netAmount,
            bridgeFee,
            protocolFee,
            block.timestamp
        );

        return nonce;
    }

    // ============ Relayer Functions ============

    /// @inheritdoc ITBridgeV2
    function releaseFunds(
        uint256 nonce,
        uint256 sourceChain,
        address token,
        address recipient,
        uint256 amount
    ) external override onlyRelayer nonReentrant whenNotPaused {
        if (recipient == address(0)) revert InvalidAddress();
        if (token == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();
        if (_processedNonces[sourceChain][nonce]) revert NonceAlreadyProcessed();
        if (!tokenRegistry.isTokenSupported(token)) revert UnsupportedToken();
        if (vault.availableLiquidity(token) < amount) revert InsufficientLiquidity();

        _processedNonces[sourceChain][nonce] = true;

        vault.release(token, recipient, amount);

        emit BridgeCompleted(nonce, sourceChain, token, recipient, amount, block.timestamp);
    }

    // ============ View Functions ============

    /// @inheritdoc ITBridgeV2
    function getBridgeQuote(address token, uint256 amount) external view override returns (BridgeQuote memory quote) {
        uint256 bridgeFee = _calculateFee(token, amount, _getBridgeFee(token));
        uint256 protocolFee = _calculateFee(token, amount, _getProtocolFee(token));

        quote.bridgeFee = bridgeFee;
        quote.protocolFee = protocolFee;
        quote.totalFee = bridgeFee + protocolFee;
        quote.netAmount = amount - quote.totalFee;

        return quote;
    }

    /// @inheritdoc ITBridgeV2
    function isNonceProcessed(uint256 sourceChain, uint256 nonce) external view override returns (bool) {
        return _processedNonces[sourceChain][nonce];
    }

    /// @inheritdoc ITBridgeV2
    function getRemainingDailyLimit(address user, address token) external view override returns (uint256) {
        ITBridgeTokenRegistry.TokenConfigView memory config = tokenRegistry.getTokenConfig(token);

        if (block.timestamp >= _userDailyResetTime[user][token] + 1 days) {
            return config.dailyLimit;
        }

        uint256 used = _userDailyUsage[user][token];
        return used >= config.dailyLimit ? 0 : config.dailyLimit - used;
    }

    /// @inheritdoc ITBridgeV2
    function getOutgoingNonce(address user) external view override returns (uint256) {
        return _outgoingNonces[user];
    }

    /// @inheritdoc ITBridgeV2
    function getBridgeFee(address token) external view override returns (uint256) {
        return _getBridgeFee(token);
    }

    /// @inheritdoc ITBridgeV2
    function getProtocolFee(address token) external view override returns (uint256) {
        return _getProtocolFee(token);
    }

    /// @inheritdoc ITBridgeV2
    function isChainSupported(uint256 _chainId) external view override returns (bool) {
        return _supportedChains[_chainId];
    }

    // ============ Admin Functions ============

    /// @inheritdoc ITBridgeV2
    function setBridgeFee(address token, uint256 newFeeBps) external override onlyOwner {
        if (newFeeBps > MAX_FEE_BPS) revert InvalidFee();

        uint256 oldFee = _bridgeFeeBps[token];
        _bridgeFeeBps[token] = newFeeBps;

        emit BridgeFeeUpdated(token, oldFee, newFeeBps);
    }

    /// @inheritdoc ITBridgeV2
    function setProtocolFee(address token, uint256 newFeeBps) external override onlyOwner {
        if (newFeeBps > MAX_FEE_BPS) revert InvalidFee();

        uint256 oldFee = _protocolFeeBps[token];
        _protocolFeeBps[token] = newFeeBps;

        emit ProtocolFeeUpdated(token, oldFee, newFeeBps);
    }

    /// @inheritdoc ITBridgeV2
    function setRelayer(address newRelayer) external override onlyOwner {
        if (newRelayer == address(0)) revert InvalidAddress();

        address oldRelayer = relayer;
        relayer = newRelayer;

        emit RelayerUpdated(oldRelayer, newRelayer);
    }

    /// @inheritdoc ITBridgeV2
    function setSupportedChain(uint256 _chainId, bool supported) external override onlyOwner {
        _supportedChains[_chainId] = supported;

        emit SupportedChainUpdated(_chainId, supported);
    }

    /// @inheritdoc ITBridgeV2
    function pause() external override onlyOwner {
        _pause();
    }

    /// @inheritdoc ITBridgeV2
    function unpause() external override onlyOwner {
        _unpause();
    }

    // ============ Internal Functions ============

    function _getBridgeFee(address token) internal view returns (uint256) {
        uint256 fee = _bridgeFeeBps[token];
        return fee > 0 ? fee : DEFAULT_BRIDGE_FEE_BPS;
    }

    function _getProtocolFee(address token) internal view returns (uint256) {
        uint256 fee = _protocolFeeBps[token];
        return fee > 0 ? fee : DEFAULT_PROTOCOL_FEE_BPS;
    }

    function _calculateFee(address, uint256 amount, uint256 feeBps) internal pure returns (uint256) {
        return (amount * feeBps) / BPS_DENOMINATOR;
    }

    function _checkAndUpdateDailyLimit(
        address user,
        address token,
        uint256 amount,
        uint256 dailyLimit
    ) internal {
        if (block.timestamp >= _userDailyResetTime[user][token] + 1 days) {
            _userDailyUsage[user][token] = 0;
            _userDailyResetTime[user][token] = block.timestamp;
        }

        if (_userDailyUsage[user][token] + amount > dailyLimit) {
            revert DailyLimitExceeded();
        }

        _userDailyUsage[user][token] += amount;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
