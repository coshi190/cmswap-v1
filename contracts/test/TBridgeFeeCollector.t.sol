// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Test, console} from "forge-std/Test.sol";
import {TBridgeFeeCollector} from "../src/TBridgeFeeCollector.sol";
import {ITBridgeFeeCollector} from "../src/interfaces/ITBridgeFeeCollector.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

contract TBridgeFeeCollectorTest is Test {
    TBridgeFeeCollector public feeCollector;
    MockERC20 public usdt;
    MockERC20 public usdc;

    address public owner = address(this);
    address public treasury = makeAddr("treasury");
    address public user = makeAddr("user");

    event FeeCollected(address indexed token, uint256 amount);
    event FeesWithdrawn(address indexed token, address indexed treasury, uint256 amount);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);

    function setUp() public {
        feeCollector = new TBridgeFeeCollector(treasury);

        usdt = new MockERC20("USDT", "USDT", 18);
        usdc = new MockERC20("USDC", "USDC", 6);
    }

    // ============ Constructor Tests ============

    function test_constructor() public view {
        assertEq(feeCollector.treasury(), treasury);
        assertEq(feeCollector.owner(), owner);
    }

    function test_constructor_revert_invalidTreasury() public {
        vm.expectRevert(ITBridgeFeeCollector.InvalidAddress.selector);
        new TBridgeFeeCollector(address(0));
    }

    // ============ Collect Fee Tests ============

    function test_collectFee_success() public {
        uint256 feeAmount = 100e18;

        vm.expectEmit(true, false, false, true);
        emit FeeCollected(address(usdt), feeAmount);

        feeCollector.collectFee(address(usdt), feeAmount);

        assertEq(feeCollector.totalFeesCollected(address(usdt)), feeAmount);
    }

    function test_collectFee_multiple() public {
        feeCollector.collectFee(address(usdt), 100e18);
        feeCollector.collectFee(address(usdt), 50e18);
        feeCollector.collectFee(address(usdc), 25e6);

        assertEq(feeCollector.totalFeesCollected(address(usdt)), 150e18);
        assertEq(feeCollector.totalFeesCollected(address(usdc)), 25e6);
    }

    function test_collectFee_revert_invalidToken() public {
        vm.expectRevert(ITBridgeFeeCollector.InvalidAddress.selector);
        feeCollector.collectFee(address(0), 100e18);
    }

    function test_collectFee_revert_invalidAmount() public {
        vm.expectRevert(ITBridgeFeeCollector.InvalidAmount.selector);
        feeCollector.collectFee(address(usdt), 0);
    }

    // ============ Withdraw Fees Tests ============

    function test_withdrawFees_success() public {
        uint256 feeAmount = 100e18;

        // Transfer fees to collector
        usdt.mint(address(feeCollector), feeAmount);

        vm.expectEmit(true, true, false, true);
        emit FeesWithdrawn(address(usdt), treasury, feeAmount);

        uint256 withdrawn = feeCollector.withdrawFees(address(usdt));

        assertEq(withdrawn, feeAmount);
        assertEq(usdt.balanceOf(treasury), feeAmount);
        assertEq(usdt.balanceOf(address(feeCollector)), 0);
    }

    function test_withdrawFees_revert_noFees() public {
        vm.expectRevert(ITBridgeFeeCollector.NoFeesToWithdraw.selector);
        feeCollector.withdrawFees(address(usdt));
    }

    // ============ Withdraw All Fees Tests ============

    function test_withdrawAllFees_success() public {
        // Transfer fees for multiple tokens
        usdt.mint(address(feeCollector), 100e18);
        usdc.mint(address(feeCollector), 50e6);

        address[] memory tokens = new address[](2);
        tokens[0] = address(usdt);
        tokens[1] = address(usdc);

        feeCollector.withdrawAllFees(tokens);

        assertEq(usdt.balanceOf(treasury), 100e18);
        assertEq(usdc.balanceOf(treasury), 50e6);
        assertEq(usdt.balanceOf(address(feeCollector)), 0);
        assertEq(usdc.balanceOf(address(feeCollector)), 0);
    }

    function test_withdrawAllFees_skipZeroBalance() public {
        // Only USDT has balance
        usdt.mint(address(feeCollector), 100e18);

        address[] memory tokens = new address[](2);
        tokens[0] = address(usdt);
        tokens[1] = address(usdc);

        // Should not revert even though USDC has 0 balance
        feeCollector.withdrawAllFees(tokens);

        assertEq(usdt.balanceOf(treasury), 100e18);
        assertEq(usdc.balanceOf(treasury), 0);
    }

    // ============ View Functions Tests ============

    function test_feeBalance() public {
        assertEq(feeCollector.feeBalance(address(usdt)), 0);

        usdt.mint(address(feeCollector), 100e18);
        assertEq(feeCollector.feeBalance(address(usdt)), 100e18);
    }

    // ============ Set Treasury Tests ============

    function test_setTreasury_success() public {
        address newTreasury = makeAddr("newTreasury");

        vm.expectEmit(true, true, false, false);
        emit TreasuryUpdated(treasury, newTreasury);

        feeCollector.setTreasury(newTreasury);

        assertEq(feeCollector.treasury(), newTreasury);
    }

    function test_setTreasury_revert_invalidAddress() public {
        vm.expectRevert(ITBridgeFeeCollector.InvalidAddress.selector);
        feeCollector.setTreasury(address(0));
    }

    function test_setTreasury_revert_notOwner() public {
        vm.prank(user);
        vm.expectRevert();
        feeCollector.setTreasury(user);
    }
}
