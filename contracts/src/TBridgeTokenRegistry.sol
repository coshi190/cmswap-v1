// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {ITBridgeTokenRegistry} from "./interfaces/ITBridgeTokenRegistry.sol";

/// @title TBridgeTokenRegistry
/// @notice Manages token whitelist and cross-chain token mappings for tBridge-v2
/// @dev UUPS upgradeable contract for token registration and configuration
contract TBridgeTokenRegistry is ITBridgeTokenRegistry, OwnableUpgradeable, UUPSUpgradeable {
    using EnumerableSet for EnumerableSet.AddressSet;

    // ============ Storage ============

    /// @notice Internal token configuration with remote token mappings
    struct TokenConfig {
        bool enabled;
        uint256 minAmount;
        uint256 maxAmount;
        uint256 dailyLimit;
    }

    /// @notice Token configurations by token address
    mapping(address => TokenConfig) private _tokenConfigs;

    /// @notice Remote token mappings: localToken => chainId => remoteToken
    mapping(address => mapping(uint256 => address)) private _remoteTokens;

    /// @notice Set of all registered tokens
    EnumerableSet.AddressSet private _registeredTokens;

    /// @notice Storage gap for future upgrades
    uint256[47] private __gap;

    // ============ Constructor ============

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    // ============ Initializer ============

    function initialize() external initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();
    }

    // ============ View Functions ============

    /// @inheritdoc ITBridgeTokenRegistry
    function isTokenSupported(address token) external view override returns (bool) {
        return _registeredTokens.contains(token) && _tokenConfigs[token].enabled;
    }

    /// @inheritdoc ITBridgeTokenRegistry
    function isTokenRegistered(address token) external view override returns (bool) {
        return _registeredTokens.contains(token);
    }

    /// @inheritdoc ITBridgeTokenRegistry
    function getRemoteToken(address localToken, uint256 remoteChainId) external view override returns (address) {
        return _remoteTokens[localToken][remoteChainId];
    }

    /// @inheritdoc ITBridgeTokenRegistry
    function getTokenConfig(address token) external view override returns (TokenConfigView memory config) {
        TokenConfig storage cfg = _tokenConfigs[token];
        return TokenConfigView({
            enabled: cfg.enabled,
            minAmount: cfg.minAmount,
            maxAmount: cfg.maxAmount,
            dailyLimit: cfg.dailyLimit
        });
    }

    /// @inheritdoc ITBridgeTokenRegistry
    function getSupportedTokens() external view override returns (address[] memory) {
        uint256 length = _registeredTokens.length();
        uint256 count = 0;

        // First pass: count enabled tokens
        for (uint256 i = 0; i < length; i++) {
            if (_tokenConfigs[_registeredTokens.at(i)].enabled) {
                count++;
            }
        }

        // Second pass: populate array
        address[] memory tokens = new address[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < length; i++) {
            address token = _registeredTokens.at(i);
            if (_tokenConfigs[token].enabled) {
                tokens[index++] = token;
            }
        }

        return tokens;
    }

    /// @inheritdoc ITBridgeTokenRegistry
    function validateAmount(address token, uint256 amount) external view override returns (bool) {
        if (!_registeredTokens.contains(token)) return false;

        TokenConfig storage cfg = _tokenConfigs[token];
        return amount >= cfg.minAmount && amount <= cfg.maxAmount;
    }

    // ============ Admin Functions ============

    /// @inheritdoc ITBridgeTokenRegistry
    function registerToken(
        address localToken,
        uint256 remoteChainId,
        address remoteToken,
        uint256 minAmount,
        uint256 maxAmount,
        uint256 dailyLimit
    ) external override onlyOwner {
        if (localToken == address(0)) revert InvalidAddress();
        if (remoteToken == address(0)) revert InvalidAddress();
        if (remoteChainId == 0) revert InvalidChainId();
        if (minAmount == 0 || maxAmount == 0 || minAmount > maxAmount) revert InvalidAmount();
        if (dailyLimit == 0) revert InvalidAmount();

        // Add to registered tokens if not already registered
        bool isNew = _registeredTokens.add(localToken);

        if (isNew) {
            _tokenConfigs[localToken] = TokenConfig({
                enabled: true,
                minAmount: minAmount,
                maxAmount: maxAmount,
                dailyLimit: dailyLimit
            });
        }

        _remoteTokens[localToken][remoteChainId] = remoteToken;

        emit TokenRegistered(localToken, remoteChainId, remoteToken);

        if (isNew) {
            emit TokenEnabled(localToken, true);
            emit TokenLimitsUpdated(localToken, minAmount, maxAmount, dailyLimit);
        }
    }

    /// @inheritdoc ITBridgeTokenRegistry
    function addRemoteToken(address localToken, uint256 remoteChainId, address remoteToken) external override onlyOwner {
        if (!_registeredTokens.contains(localToken)) revert TokenNotRegistered();
        if (remoteToken == address(0)) revert InvalidAddress();
        if (remoteChainId == 0) revert InvalidChainId();

        _remoteTokens[localToken][remoteChainId] = remoteToken;

        emit RemoteTokenUpdated(localToken, remoteChainId, remoteToken);
    }

    /// @inheritdoc ITBridgeTokenRegistry
    function setTokenEnabled(address token, bool enabled) external override onlyOwner {
        if (!_registeredTokens.contains(token)) revert TokenNotRegistered();

        _tokenConfigs[token].enabled = enabled;

        emit TokenEnabled(token, enabled);
    }

    /// @inheritdoc ITBridgeTokenRegistry
    function setTokenLimits(
        address token,
        uint256 minAmount,
        uint256 maxAmount,
        uint256 dailyLimit
    ) external override onlyOwner {
        if (!_registeredTokens.contains(token)) revert TokenNotRegistered();
        if (minAmount == 0 || maxAmount == 0 || minAmount > maxAmount) revert InvalidAmount();
        if (dailyLimit == 0) revert InvalidAmount();

        TokenConfig storage cfg = _tokenConfigs[token];
        cfg.minAmount = minAmount;
        cfg.maxAmount = maxAmount;
        cfg.dailyLimit = dailyLimit;

        emit TokenLimitsUpdated(token, minAmount, maxAmount, dailyLimit);
    }

    // ============ Internal Functions ============

    /// @notice Authorize upgrade (only owner)
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
