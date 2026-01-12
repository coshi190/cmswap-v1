// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ITBridgeFeeCollector} from "./interfaces/ITBridgeFeeCollector.sol";

/// @title TBridgeFeeCollector
/// @notice Collects and manages protocol fees for tBridge-v2
/// @dev Non-upgradeable contract for protocol fee management
contract TBridgeFeeCollector is ITBridgeFeeCollector, Ownable {
    using SafeERC20 for IERC20;

    // ============ Storage ============

    address private _treasury;

    /// @notice Total fees collected per token (lifetime)
    mapping(address => uint256) private _totalFeesCollected;

    // ============ Constructor ============

    constructor(address initialTreasury) Ownable() {
        if (initialTreasury == address(0)) revert InvalidAddress();
        _treasury = initialTreasury;
    }

    // ============ External Functions ============

    /// @inheritdoc ITBridgeFeeCollector
    function collectFee(address token, uint256 amount) external override {
        if (token == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();

        _totalFeesCollected[token] += amount;

        emit FeeCollected(token, amount);
    }

    /// @inheritdoc ITBridgeFeeCollector
    function withdrawFees(address token) external override returns (uint256 amount) {
        if (token == address(0)) revert InvalidAddress();

        amount = IERC20(token).balanceOf(address(this));
        if (amount == 0) revert NoFeesToWithdraw();

        IERC20(token).safeTransfer(_treasury, amount);

        emit FeesWithdrawn(token, _treasury, amount);

        return amount;
    }

    /// @inheritdoc ITBridgeFeeCollector
    function withdrawAllFees(address[] calldata tokens) external override {
        for (uint256 i = 0; i < tokens.length; i++) {
            address token = tokens[i];
            uint256 balance = IERC20(token).balanceOf(address(this));

            if (balance > 0) {
                IERC20(token).safeTransfer(_treasury, balance);
                emit FeesWithdrawn(token, _treasury, balance);
            }
        }
    }

    // ============ View Functions ============

    /// @inheritdoc ITBridgeFeeCollector
    function feeBalance(address token) external view override returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    /// @inheritdoc ITBridgeFeeCollector
    function totalFeesCollected(address token) external view override returns (uint256) {
        return _totalFeesCollected[token];
    }

    /// @inheritdoc ITBridgeFeeCollector
    function treasury() external view override returns (address) {
        return _treasury;
    }

    // ============ Admin Functions ============

    /// @inheritdoc ITBridgeFeeCollector
    function setTreasury(address newTreasury) external override onlyOwner {
        if (newTreasury == address(0)) revert InvalidAddress();

        address oldTreasury = _treasury;
        _treasury = newTreasury;

        emit TreasuryUpdated(oldTreasury, newTreasury);
    }
}
