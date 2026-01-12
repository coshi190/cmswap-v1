// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title ITBridgeTokenRegistry
/// @notice Interface for the tBridge-v2 token registry
/// @dev Manages token whitelist and cross-chain token mappings
interface ITBridgeTokenRegistry {
    // ============ Structs ============

    /// @notice Token configuration without the nested mapping
    struct TokenConfigView {
        bool enabled;
        uint256 minAmount;
        uint256 maxAmount;
        uint256 dailyLimit;
    }

    // ============ Events ============

    event TokenRegistered(address indexed localToken, uint256 indexed remoteChainId, address remoteToken);
    event TokenEnabled(address indexed token, bool enabled);
    event TokenLimitsUpdated(address indexed token, uint256 minAmount, uint256 maxAmount, uint256 dailyLimit);
    event RemoteTokenUpdated(address indexed localToken, uint256 indexed remoteChainId, address remoteToken);

    // ============ Errors ============

    error TokenNotRegistered();
    error TokenAlreadyRegistered();
    error InvalidAddress();
    error InvalidAmount();
    error InvalidChainId();
    error TokenNotEnabled();

    // ============ View Functions ============

    /// @notice Check if a token is supported (registered and enabled)
    /// @param token The token address to check
    /// @return True if the token is supported for bridging
    function isTokenSupported(address token) external view returns (bool);

    /// @notice Check if a token is registered (may be disabled)
    /// @param token The token address to check
    /// @return True if the token is registered
    function isTokenRegistered(address token) external view returns (bool);

    /// @notice Get the corresponding token address on a remote chain
    /// @param localToken The local token address
    /// @param remoteChainId The destination chain ID
    /// @return The token address on the remote chain
    function getRemoteToken(address localToken, uint256 remoteChainId) external view returns (address);

    /// @notice Get the token configuration
    /// @param token The token address
    /// @return config The token configuration
    function getTokenConfig(address token) external view returns (TokenConfigView memory config);

    /// @notice Get all supported tokens
    /// @return Array of supported token addresses
    function getSupportedTokens() external view returns (address[] memory);

    /// @notice Validate if an amount is within the token's limits
    /// @param token The token address
    /// @param amount The amount to validate
    /// @return True if the amount is within limits
    function validateAmount(address token, uint256 amount) external view returns (bool);

    // ============ Admin Functions ============

    /// @notice Register a new token with remote chain mapping
    /// @param localToken The local token address
    /// @param remoteChainId The remote chain ID
    /// @param remoteToken The token address on the remote chain
    /// @param minAmount Minimum bridge amount
    /// @param maxAmount Maximum bridge amount
    /// @param dailyLimit Daily limit per user
    function registerToken(
        address localToken,
        uint256 remoteChainId,
        address remoteToken,
        uint256 minAmount,
        uint256 maxAmount,
        uint256 dailyLimit
    ) external;

    /// @notice Add a remote chain mapping for an existing token
    /// @param localToken The local token address
    /// @param remoteChainId The remote chain ID
    /// @param remoteToken The token address on the remote chain
    function addRemoteToken(address localToken, uint256 remoteChainId, address remoteToken) external;

    /// @notice Enable or disable a token
    /// @param token The token address
    /// @param enabled True to enable, false to disable
    function setTokenEnabled(address token, bool enabled) external;

    /// @notice Update token limits
    /// @param token The token address
    /// @param minAmount New minimum bridge amount
    /// @param maxAmount New maximum bridge amount
    /// @param dailyLimit New daily limit per user
    function setTokenLimits(address token, uint256 minAmount, uint256 maxAmount, uint256 dailyLimit) external;
}
