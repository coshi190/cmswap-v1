// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title ITBridgeVault
/// @notice Interface for the tBridge-v2 multi-token liquidity vault
/// @dev Manages liquidity deposits from LPs and releases funds for bridge operations
interface ITBridgeVault {
    // ============ Events ============

    event Deposited(address indexed token, address indexed provider, uint256 amount);
    event Withdrawn(address indexed token, address indexed provider, uint256 amount);
    event FundsLocked(address indexed token, address indexed from, uint256 amount);
    event FundsReleased(address indexed token, address indexed to, uint256 amount);
    event FeesAdded(address indexed token, uint256 amount);
    event FeesClaimed(address indexed token, address indexed provider, uint256 amount);
    event EmergencyWithdrawal(address indexed token, address indexed to, uint256 amount);
    event BridgeUpdated(address indexed oldBridge, address indexed newBridge);

    // ============ Errors ============

    error OnlyBridge();
    error InsufficientBalance();
    error InsufficientLiquidity();
    error InvalidAmount();
    error InvalidAddress();
    error NoFeesToClaim();

    // ============ LP Functions ============

    /// @notice Deposit liquidity for a specific token
    /// @param token The token to deposit
    /// @param amount The amount to deposit
    function deposit(address token, uint256 amount) external;

    /// @notice Withdraw liquidity for a specific token
    /// @param token The token to withdraw
    /// @param amount The amount to withdraw
    function withdraw(address token, uint256 amount) external;

    /// @notice Claim accumulated bridge fees for a specific token
    /// @param token The token to claim fees for
    /// @return amount The amount of fees claimed
    function claimFees(address token) external returns (uint256 amount);

    // ============ Bridge Functions ============

    /// @notice Lock funds when bridge is initiated (receives tokens)
    /// @param token The token being locked
    /// @param from The user initiating the bridge
    /// @param amount The amount being locked
    function lock(address token, address from, uint256 amount) external;

    /// @notice Release funds when bridge is completed
    /// @param token The token to release
    /// @param to The recipient address
    /// @param amount The amount to release
    function release(address token, address to, uint256 amount) external;

    /// @notice Add bridge fees to the vault for LP distribution
    /// @param token The token the fees are in
    /// @param amount The fee amount
    function addFees(address token, uint256 amount) external;

    // ============ View Functions ============

    /// @notice Get available liquidity for a token
    /// @param token The token address
    /// @return The available liquidity amount
    function availableLiquidity(address token) external view returns (uint256);

    /// @notice Get LP's deposit amount for a token
    /// @param token The token address
    /// @param provider The LP address
    /// @return The deposit amount
    function getLpDeposit(address token, address provider) external view returns (uint256);

    /// @notice Get LP's claimable fees for a token
    /// @param token The token address
    /// @param provider The LP address
    /// @return The claimable fee amount
    function getClaimableFees(address token, address provider) external view returns (uint256);

    /// @notice Get total deposits for a token
    /// @param token The token address
    /// @return The total deposit amount
    function getTotalDeposits(address token) external view returns (uint256);

    /// @notice Get LP's share percentage for a token (in basis points)
    /// @param token The token address
    /// @param provider The LP address
    /// @return The share percentage in basis points (10000 = 100%)
    function getLpShareBps(address token, address provider) external view returns (uint256);

    // ============ Admin Functions ============

    /// @notice Set the bridge contract address
    /// @param newBridge The new bridge address
    function setBridge(address newBridge) external;

    /// @notice Emergency withdrawal (owner only)
    /// @param token The token to withdraw
    /// @param to The recipient address
    /// @param amount The amount to withdraw
    function emergencyWithdraw(address token, address to, uint256 amount) external;
}
