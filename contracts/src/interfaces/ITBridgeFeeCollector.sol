// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title ITBridgeFeeCollector
/// @notice Interface for the tBridge-v2 protocol fee collector
/// @dev Collects and manages protocol fees for multiple tokens
interface ITBridgeFeeCollector {
    // ============ Events ============

    event FeeCollected(address indexed token, uint256 amount);
    event FeesWithdrawn(address indexed token, address indexed treasury, uint256 amount);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);

    // ============ Errors ============

    error InvalidAddress();
    error NoFeesToWithdraw();
    error InvalidAmount();

    // ============ Functions ============

    /// @notice Record a collected protocol fee
    /// @param token The token the fee is in
    /// @param amount The fee amount
    function collectFee(address token, uint256 amount) external;

    /// @notice Withdraw collected fees for a specific token to treasury
    /// @param token The token to withdraw fees for
    /// @return amount The amount withdrawn
    function withdrawFees(address token) external returns (uint256 amount);

    /// @notice Withdraw all collected fees to treasury
    /// @param tokens Array of token addresses to withdraw
    function withdrawAllFees(address[] calldata tokens) external;

    // ============ View Functions ============

    /// @notice Get the fee balance for a token
    /// @param token The token address
    /// @return The fee balance
    function feeBalance(address token) external view returns (uint256);

    /// @notice Get total fees collected for a token (lifetime)
    /// @param token The token address
    /// @return The total fees collected
    function totalFeesCollected(address token) external view returns (uint256);

    /// @notice Get the treasury address
    /// @return The treasury address
    function treasury() external view returns (address);

    // ============ Admin Functions ============

    /// @notice Set the treasury address
    /// @param newTreasury The new treasury address
    function setTreasury(address newTreasury) external;
}
