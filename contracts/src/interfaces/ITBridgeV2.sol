// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title ITBridgeV2
/// @notice Interface for the tBridge-v2 core bridge contract
/// @dev Main entry point for cross-chain ERC20 token bridging
interface ITBridgeV2 {
    // ============ Structs ============

    /// @notice Quote result for a bridge operation
    struct BridgeQuote {
        uint256 bridgeFee;
        uint256 protocolFee;
        uint256 totalFee;
        uint256 netAmount;
    }

    // ============ Events ============

    event BridgeInitiated(
        uint256 indexed nonce,
        address indexed token,
        address indexed sender,
        address recipient,
        uint256 sourceChain,
        uint256 destChain,
        uint256 amount,
        uint256 bridgeFee,
        uint256 protocolFee,
        uint256 timestamp
    );
    event BridgeCompleted(
        uint256 indexed nonce,
        uint256 indexed sourceChain,
        address indexed token,
        address recipient,
        uint256 amount,
        uint256 timestamp
    );
    event BridgeFeeUpdated(address indexed token, uint256 oldFeeBps, uint256 newFeeBps);
    event ProtocolFeeUpdated(address indexed token, uint256 oldFeeBps, uint256 newFeeBps);
    event RelayerUpdated(address indexed oldRelayer, address indexed newRelayer);
    event SupportedChainUpdated(uint256 indexed chainId, bool supported);

    // ============ Errors ============

    error InvalidAmount();
    error UnsupportedChain();
    error UnsupportedToken();
    error InsufficientLiquidity();
    error NonceAlreadyProcessed();
    error DailyLimitExceeded();
    error InvalidAddress();
    error InvalidFee();
    error OnlyRelayer();
    error TokenNotSupportedOnDestination();
    error AmountBelowMinimum();
    error AmountAboveMaximum();

    // ============ User Functions ============

    /// @notice Initiate a bridge transfer to another chain
    /// @param token The token to bridge
    /// @param destChain The destination chain ID
    /// @param recipient The recipient address on destination chain
    /// @param amount The amount to bridge
    /// @return nonce The unique nonce for this bridge request
    function initiateBridge(address token, uint256 destChain, address recipient, uint256 amount)
        external
        returns (uint256 nonce);

    // ============ Relayer Functions ============

    /// @notice Release funds on destination chain (called by relayer)
    /// @param nonce The bridge request nonce
    /// @param sourceChain The source chain ID
    /// @param token The token to release
    /// @param recipient The recipient address
    /// @param amount The amount to release
    function releaseFunds(uint256 nonce, uint256 sourceChain, address token, address recipient, uint256 amount)
        external;

    // ============ View Functions ============

    /// @notice Get quote for a bridge transfer
    /// @param token The token to bridge
    /// @param amount The amount to bridge
    /// @return quote The bridge quote with fees and net amount
    function getBridgeQuote(address token, uint256 amount) external view returns (BridgeQuote memory quote);

    /// @notice Check if a nonce has been processed
    /// @param sourceChain The source chain ID
    /// @param nonce The nonce to check
    /// @return True if the nonce has been processed
    function isNonceProcessed(uint256 sourceChain, uint256 nonce) external view returns (bool);

    /// @notice Get user's remaining daily limit for a token
    /// @param user The user address
    /// @param token The token address
    /// @return The remaining daily limit
    function getRemainingDailyLimit(address user, address token) external view returns (uint256);

    /// @notice Get the current outgoing nonce for a user
    /// @param user The user address
    /// @return The current nonce
    function getOutgoingNonce(address user) external view returns (uint256);

    /// @notice Get the bridge fee for a token (in basis points)
    /// @param token The token address
    /// @return The bridge fee in basis points
    function getBridgeFee(address token) external view returns (uint256);

    /// @notice Get the protocol fee for a token (in basis points)
    /// @param token The token address
    /// @return The protocol fee in basis points
    function getProtocolFee(address token) external view returns (uint256);

    /// @notice Check if a chain is supported
    /// @param chainId The chain ID to check
    /// @return True if the chain is supported
    function isChainSupported(uint256 chainId) external view returns (bool);

    /// @notice Get this bridge's chain ID
    /// @return The chain ID
    function chainId() external view returns (uint256);

    // ============ Admin Functions ============

    /// @notice Set the bridge fee for a token
    /// @param token The token address
    /// @param newFeeBps The new fee in basis points
    function setBridgeFee(address token, uint256 newFeeBps) external;

    /// @notice Set the protocol fee for a token
    /// @param token The token address
    /// @param newFeeBps The new fee in basis points
    function setProtocolFee(address token, uint256 newFeeBps) external;

    /// @notice Set the relayer address
    /// @param newRelayer The new relayer address
    function setRelayer(address newRelayer) external;

    /// @notice Set a chain as supported or not
    /// @param chainId The chain ID
    /// @param supported True to support, false to unsupport
    function setSupportedChain(uint256 chainId, bool supported) external;

    /// @notice Pause the bridge
    function pause() external;

    /// @notice Unpause the bridge
    function unpause() external;
}
