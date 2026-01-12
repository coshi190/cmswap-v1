// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {ITBridgeVault} from "./interfaces/ITBridgeVault.sol";

/// @title TBridgeVault
/// @notice Multi-token liquidity vault for tBridge-v2
/// @dev UUPS upgradeable contract for managing LP deposits and bridge releases
contract TBridgeVault is ITBridgeVault, OwnableUpgradeable, UUPSUpgradeable, ReentrancyGuardUpgradeable {
    using SafeERC20 for IERC20;

    // ============ Constants ============

    uint256 public constant BPS_DENOMINATOR = 10_000;

    // ============ Storage ============

    address public bridge;

    /// @notice LP deposits per token: token => provider => amount
    mapping(address => mapping(address => uint256)) private _lpDeposits;

    /// @notice Total deposits per token: token => totalAmount
    mapping(address => uint256) private _totalDeposits;

    /// @notice Accumulated fees per token (for distribution): token => amount
    mapping(address => uint256) private _accumulatedFees;

    /// @notice Fee index per token (for pro-rata calculation): token => index
    mapping(address => uint256) private _feeIndex;

    /// @notice LP's last fee index snapshot: token => provider => index
    mapping(address => mapping(address => uint256)) private _lpFeeIndexSnapshot;

    /// @notice LP's unclaimed fees: token => provider => amount
    mapping(address => mapping(address => uint256)) private _lpUnclaimedFees;

    /// @notice Storage gap for future upgrades
    uint256[43] private __gap;

    // ============ Modifiers ============

    modifier onlyBridge() {
        if (msg.sender != bridge) revert OnlyBridge();
        _;
    }

    // ============ Constructor ============

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    // ============ Initializer ============

    function initialize(address initialBridge) external initializer {
        if (initialBridge == address(0)) revert InvalidAddress();

        __Ownable_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();

        bridge = initialBridge;
    }

    // ============ LP Functions ============

    /// @inheritdoc ITBridgeVault
    function deposit(address token, uint256 amount) external override nonReentrant {
        if (token == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();

        _updateFeeAccounting(token, msg.sender);

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        _lpDeposits[token][msg.sender] += amount;
        _totalDeposits[token] += amount;

        emit Deposited(token, msg.sender, amount);
    }

    /// @inheritdoc ITBridgeVault
    function withdraw(address token, uint256 amount) external override nonReentrant {
        if (token == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();
        uint256 lpBalance = _lpDeposits[token][msg.sender];
        if (lpBalance < amount) revert InsufficientBalance();

        // Check available liquidity (excluding accumulated fees)
        uint256 available = _getAvailableLiquidity(token);
        if (available < amount) revert InsufficientLiquidity();

        _updateFeeAccounting(token, msg.sender);

        _lpDeposits[token][msg.sender] -= amount;
        _totalDeposits[token] -= amount;

        IERC20(token).safeTransfer(msg.sender, amount);

        emit Withdrawn(token, msg.sender, amount);
    }

    /// @inheritdoc ITBridgeVault
    function claimFees(address token) external override nonReentrant returns (uint256 amount) {
        if (token == address(0)) revert InvalidAddress();

        _updateFeeAccounting(token, msg.sender);

        amount = _lpUnclaimedFees[token][msg.sender];
        if (amount == 0) revert NoFeesToClaim();

        // Reset unclaimed fees
        _lpUnclaimedFees[token][msg.sender] = 0;
        _accumulatedFees[token] -= amount;

        IERC20(token).safeTransfer(msg.sender, amount);

        emit FeesClaimed(token, msg.sender, amount);

        return amount;
    }

    // ============ Bridge Functions ============

    /// @inheritdoc ITBridgeVault
    function lock(address token, address from, uint256 amount) external override onlyBridge {
        emit FundsLocked(token, from, amount);
    }

    /// @inheritdoc ITBridgeVault
    function release(address token, address to, uint256 amount) external override onlyBridge nonReentrant {
        if (to == address(0)) revert InvalidAddress();

        uint256 available = _getAvailableLiquidity(token);
        if (available < amount) revert InsufficientLiquidity();

        IERC20(token).safeTransfer(to, amount);

        emit FundsReleased(token, to, amount);
    }

    /// @inheritdoc ITBridgeVault
    function addFees(address token, uint256 amount) external override onlyBridge {
        if (amount == 0) return;

        // Only distribute fees if there are deposits
        uint256 totalDep = _totalDeposits[token];
        if (totalDep > 0) {
            // Update fee index (scaled by 1e18 for precision)
            _feeIndex[token] += (amount * 1e18) / totalDep;
        }

        _accumulatedFees[token] += amount;

        emit FeesAdded(token, amount);
    }

    // ============ View Functions ============

    /// @inheritdoc ITBridgeVault
    function availableLiquidity(address token) external view override returns (uint256) {
        return _getAvailableLiquidity(token);
    }

    /// @inheritdoc ITBridgeVault
    function getLpDeposit(address token, address provider) external view override returns (uint256) {
        return _lpDeposits[token][provider];
    }

    /// @inheritdoc ITBridgeVault
    function getClaimableFees(address token, address provider) external view override returns (uint256) {
        uint256 currentIndex = _feeIndex[token];
        uint256 lastIndex = _lpFeeIndexSnapshot[token][provider];
        uint256 lpDeposit = _lpDeposits[token][provider];

        uint256 pendingFees = 0;
        if (lpDeposit > 0 && currentIndex > lastIndex) {
            pendingFees = (lpDeposit * (currentIndex - lastIndex)) / 1e18;
        }

        return _lpUnclaimedFees[token][provider] + pendingFees;
    }

    /// @inheritdoc ITBridgeVault
    function getTotalDeposits(address token) external view override returns (uint256) {
        return _totalDeposits[token];
    }

    /// @inheritdoc ITBridgeVault
    function getLpShareBps(address token, address provider) external view override returns (uint256) {
        uint256 totalDep = _totalDeposits[token];
        if (totalDep == 0) return 0;

        return (_lpDeposits[token][provider] * BPS_DENOMINATOR) / totalDep;
    }

    // ============ Admin Functions ============

    /// @inheritdoc ITBridgeVault
    function setBridge(address newBridge) external override onlyOwner {
        if (newBridge == address(0)) revert InvalidAddress();

        address oldBridge = bridge;
        bridge = newBridge;

        emit BridgeUpdated(oldBridge, newBridge);
    }

    /// @inheritdoc ITBridgeVault
    function emergencyWithdraw(address token, address to, uint256 amount) external override onlyOwner {
        if (to == address(0)) revert InvalidAddress();

        IERC20(token).safeTransfer(to, amount);

        emit EmergencyWithdrawal(token, to, amount);
    }

    // ============ Internal Functions ============

    /// @notice Get available liquidity (total balance minus accumulated fees)
    function _getAvailableLiquidity(address token) internal view returns (uint256) {
        uint256 balance = IERC20(token).balanceOf(address(this));
        uint256 fees = _accumulatedFees[token];

        // Fees are included in balance, so we need to subtract them
        // to get the liquidity available for bridge operations
        return balance > fees ? balance - fees : 0;
    }

    /// @notice Update fee accounting for an LP
    function _updateFeeAccounting(address token, address provider) internal {
        uint256 currentIndex = _feeIndex[token];
        uint256 lastIndex = _lpFeeIndexSnapshot[token][provider];
        uint256 lpDeposit = _lpDeposits[token][provider];

        if (lpDeposit > 0 && currentIndex > lastIndex) {
            uint256 pendingFees = (lpDeposit * (currentIndex - lastIndex)) / 1e18;
            _lpUnclaimedFees[token][provider] += pendingFees;
        }

        _lpFeeIndexSnapshot[token][provider] = currentIndex;
    }

    /// @notice Authorize upgrade (only owner)
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
