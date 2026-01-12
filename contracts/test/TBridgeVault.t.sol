// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Test, console} from "forge-std/Test.sol";
import {TBridgeVault} from "../src/TBridgeVault.sol";
import {ITBridgeVault} from "../src/interfaces/ITBridgeVault.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

contract TBridgeVaultTest is Test {
    TBridgeVault public vaultImpl;
    TBridgeVault public vault;
    MockERC20 public usdt;
    MockERC20 public usdc;

    address public owner = address(this);
    address public bridge = makeAddr("bridge");
    address public lp1 = makeAddr("lp1");
    address public lp2 = makeAddr("lp2");
    address public user = makeAddr("user");

    event Deposited(address indexed token, address indexed provider, uint256 amount);
    event Withdrawn(address indexed token, address indexed provider, uint256 amount);
    event FundsLocked(address indexed token, address indexed from, uint256 amount);
    event FundsReleased(address indexed token, address indexed to, uint256 amount);
    event FeesAdded(address indexed token, uint256 amount);
    event FeesClaimed(address indexed token, address indexed provider, uint256 amount);
    event BridgeUpdated(address indexed oldBridge, address indexed newBridge);

    function setUp() public {
        // Deploy implementation
        vaultImpl = new TBridgeVault();

        // Deploy proxy
        bytes memory initData = abi.encodeCall(TBridgeVault.initialize, (bridge));
        ERC1967Proxy proxy = new ERC1967Proxy(address(vaultImpl), initData);
        vault = TBridgeVault(address(proxy));

        // Deploy mock tokens
        usdt = new MockERC20("USDT", "USDT", 18);
        usdc = new MockERC20("USDC", "USDC", 6);

        // Mint tokens to LPs
        usdt.mint(lp1, 1_000_000e18);
        usdt.mint(lp2, 1_000_000e18);
        usdc.mint(lp1, 1_000_000e6);

        // Approve vault
        vm.prank(lp1);
        usdt.approve(address(vault), type(uint256).max);
        vm.prank(lp1);
        usdc.approve(address(vault), type(uint256).max);
        vm.prank(lp2);
        usdt.approve(address(vault), type(uint256).max);
    }

    // ============ Initialize Tests ============

    function test_initialize() public view {
        assertEq(vault.bridge(), bridge);
        assertEq(vault.owner(), owner);
    }

    function test_initialize_revert_invalidBridge() public {
        TBridgeVault impl = new TBridgeVault();
        bytes memory initData = abi.encodeCall(TBridgeVault.initialize, (address(0)));
        vm.expectRevert(ITBridgeVault.InvalidAddress.selector);
        new ERC1967Proxy(address(impl), initData);
    }

    // ============ Deposit Tests ============

    function test_deposit_success() public {
        vm.expectEmit(true, true, false, true);
        emit Deposited(address(usdt), lp1, 100e18);

        vm.prank(lp1);
        vault.deposit(address(usdt), 100e18);

        assertEq(vault.getLpDeposit(address(usdt), lp1), 100e18);
        assertEq(vault.getTotalDeposits(address(usdt)), 100e18);
        assertEq(vault.availableLiquidity(address(usdt)), 100e18);
    }

    function test_deposit_multipleLPs() public {
        vm.prank(lp1);
        vault.deposit(address(usdt), 100e18);

        vm.prank(lp2);
        vault.deposit(address(usdt), 200e18);

        assertEq(vault.getLpDeposit(address(usdt), lp1), 100e18);
        assertEq(vault.getLpDeposit(address(usdt), lp2), 200e18);
        assertEq(vault.getTotalDeposits(address(usdt)), 300e18);
    }

    function test_deposit_revert_invalidToken() public {
        vm.prank(lp1);
        vm.expectRevert(ITBridgeVault.InvalidAddress.selector);
        vault.deposit(address(0), 100e18);
    }

    function test_deposit_revert_invalidAmount() public {
        vm.prank(lp1);
        vm.expectRevert(ITBridgeVault.InvalidAmount.selector);
        vault.deposit(address(usdt), 0);
    }

    // ============ Withdraw Tests ============

    function test_withdraw_success() public {
        vm.startPrank(lp1);
        vault.deposit(address(usdt), 100e18);

        uint256 balanceBefore = usdt.balanceOf(lp1);

        vm.expectEmit(true, true, false, true);
        emit Withdrawn(address(usdt), lp1, 50e18);

        vault.withdraw(address(usdt), 50e18);
        vm.stopPrank();

        assertEq(vault.getLpDeposit(address(usdt), lp1), 50e18);
        assertEq(usdt.balanceOf(lp1), balanceBefore + 50e18);
    }

    function test_withdraw_revert_insufficientBalance() public {
        vm.startPrank(lp1);
        vault.deposit(address(usdt), 100e18);

        vm.expectRevert(ITBridgeVault.InsufficientBalance.selector);
        vault.withdraw(address(usdt), 150e18);
        vm.stopPrank();
    }

    // ============ LP Share Tests ============

    function test_getLpShareBps() public {
        vm.prank(lp1);
        vault.deposit(address(usdt), 100e18);

        vm.prank(lp2);
        vault.deposit(address(usdt), 100e18);

        // Each LP has 50% share (5000 bps)
        assertEq(vault.getLpShareBps(address(usdt), lp1), 5000);
        assertEq(vault.getLpShareBps(address(usdt), lp2), 5000);

        // LP1 deposits more
        vm.prank(lp1);
        vault.deposit(address(usdt), 200e18);

        // LP1 now has 75% (7500 bps), LP2 has 25% (2500 bps)
        assertEq(vault.getLpShareBps(address(usdt), lp1), 7500);
        assertEq(vault.getLpShareBps(address(usdt), lp2), 2500);
    }

    // ============ Bridge Functions Tests ============

    function test_release_success() public {
        // Setup: LP deposits
        vm.prank(lp1);
        vault.deposit(address(usdt), 1000e18);

        // Bridge releases to user
        vm.prank(bridge);
        vm.expectEmit(true, true, false, true);
        emit FundsReleased(address(usdt), user, 100e18);
        vault.release(address(usdt), user, 100e18);

        assertEq(usdt.balanceOf(user), 100e18);
        assertEq(vault.availableLiquidity(address(usdt)), 900e18);
    }

    function test_release_revert_onlyBridge() public {
        vm.prank(lp1);
        vault.deposit(address(usdt), 1000e18);

        vm.prank(user);
        vm.expectRevert(ITBridgeVault.OnlyBridge.selector);
        vault.release(address(usdt), user, 100e18);
    }

    function test_release_revert_insufficientLiquidity() public {
        vm.prank(lp1);
        vault.deposit(address(usdt), 100e18);

        vm.prank(bridge);
        vm.expectRevert(ITBridgeVault.InsufficientLiquidity.selector);
        vault.release(address(usdt), user, 150e18);
    }

    // ============ Fee Distribution Tests ============

    function test_addFees_singleLP() public {
        // LP deposits
        vm.prank(lp1);
        vault.deposit(address(usdt), 1000e18);

        // Bridge adds fees
        usdt.mint(address(vault), 100e18); // Simulate fee transfer
        vm.prank(bridge);
        vault.addFees(address(usdt), 100e18);

        // LP can claim all fees
        assertEq(vault.getClaimableFees(address(usdt), lp1), 100e18);
    }

    function test_addFees_multipleLPs() public {
        // LP1 deposits 75%
        vm.prank(lp1);
        vault.deposit(address(usdt), 300e18);

        // LP2 deposits 25%
        vm.prank(lp2);
        vault.deposit(address(usdt), 100e18);

        // Bridge adds fees
        usdt.mint(address(vault), 100e18);
        vm.prank(bridge);
        vault.addFees(address(usdt), 100e18);

        // LP1 gets 75% of fees, LP2 gets 25%
        assertEq(vault.getClaimableFees(address(usdt), lp1), 75e18);
        assertEq(vault.getClaimableFees(address(usdt), lp2), 25e18);
    }

    function test_claimFees_success() public {
        // Setup
        vm.prank(lp1);
        vault.deposit(address(usdt), 1000e18);

        usdt.mint(address(vault), 100e18);
        vm.prank(bridge);
        vault.addFees(address(usdt), 100e18);

        // Claim fees
        uint256 balanceBefore = usdt.balanceOf(lp1);

        vm.prank(lp1);
        vm.expectEmit(true, true, false, true);
        emit FeesClaimed(address(usdt), lp1, 100e18);
        uint256 claimed = vault.claimFees(address(usdt));

        assertEq(claimed, 100e18);
        assertEq(usdt.balanceOf(lp1), balanceBefore + 100e18);
        assertEq(vault.getClaimableFees(address(usdt), lp1), 0);
    }

    function test_claimFees_revert_noFees() public {
        vm.prank(lp1);
        vault.deposit(address(usdt), 1000e18);

        vm.prank(lp1);
        vm.expectRevert(ITBridgeVault.NoFeesToClaim.selector);
        vault.claimFees(address(usdt));
    }

    function test_feeAccounting_afterDepositWithdraw() public {
        // LP1 deposits
        vm.prank(lp1);
        vault.deposit(address(usdt), 1000e18);

        // Fees added
        usdt.mint(address(vault), 100e18);
        vm.prank(bridge);
        vault.addFees(address(usdt), 100e18);

        // LP1 should have 100e18 claimable
        assertEq(vault.getClaimableFees(address(usdt), lp1), 100e18);

        // LP2 deposits after fees were added
        vm.prank(lp2);
        vault.deposit(address(usdt), 1000e18);

        // LP2 should have 0 claimable (joined after fees)
        assertEq(vault.getClaimableFees(address(usdt), lp2), 0);

        // LP1 still has their fees
        assertEq(vault.getClaimableFees(address(usdt), lp1), 100e18);

        // New fees added - split 50/50
        usdt.mint(address(vault), 100e18);
        vm.prank(bridge);
        vault.addFees(address(usdt), 100e18);

        assertEq(vault.getClaimableFees(address(usdt), lp1), 150e18); // 100 + 50
        assertEq(vault.getClaimableFees(address(usdt), lp2), 50e18); // 50
    }

    // ============ Admin Functions Tests ============

    function test_setBridge_success() public {
        address newBridge = makeAddr("newBridge");

        vm.expectEmit(true, true, false, false);
        emit BridgeUpdated(bridge, newBridge);

        vault.setBridge(newBridge);

        assertEq(vault.bridge(), newBridge);
    }

    function test_setBridge_revert_notOwner() public {
        vm.prank(user);
        vm.expectRevert();
        vault.setBridge(user);
    }

    function test_emergencyWithdraw() public {
        usdt.mint(address(vault), 1000e18);

        vault.emergencyWithdraw(address(usdt), owner, 1000e18);

        assertEq(usdt.balanceOf(owner), 1000e18);
    }
}
