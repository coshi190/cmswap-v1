// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Test, console} from "forge-std/Test.sol";
import {TBridgeV2} from "../src/TBridgeV2.sol";
import {TBridgeTokenRegistry} from "../src/TBridgeTokenRegistry.sol";
import {TBridgeVault} from "../src/TBridgeVault.sol";
import {TBridgeFeeCollector} from "../src/TBridgeFeeCollector.sol";
import {ITBridgeV2} from "../src/interfaces/ITBridgeV2.sol";
import {ITBridgeTokenRegistry} from "../src/interfaces/ITBridgeTokenRegistry.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

contract TBridgeV2Test is Test {
    // Contracts
    TBridgeV2 public bridge;
    TBridgeTokenRegistry public registry;
    TBridgeVault public vault;
    TBridgeFeeCollector public feeCollector;

    // Mock tokens
    MockERC20 public usdt;
    MockERC20 public usdc;

    // Addresses
    address public owner = address(this);
    address public relayer = makeAddr("relayer");
    address public treasury = makeAddr("treasury");
    address public lp = makeAddr("lp");
    address public user = makeAddr("user");
    address public recipient = makeAddr("recipient");

    // Chain IDs
    uint256 public constant KUB_CHAIN_ID = 96;
    uint256 public constant JBC_CHAIN_ID = 8081;
    uint256 public constant BSC_CHAIN_ID = 56;

    // Remote token addresses
    address public constant JUSDT = address(0xFD8Ef75c1cB00A594D02df48ADdc27414Bd07F8a);
    address public constant BSC_USDT = address(0x55d398326f99059fF775485246999027B3197955);

    // Events
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

    function setUp() public {
        // Deploy mock tokens
        usdt = new MockERC20("USDT", "USDT", 18);
        usdc = new MockERC20("USDC", "USDC", 6);

        // Deploy fee collector
        feeCollector = new TBridgeFeeCollector(treasury);

        // Deploy and initialize registry
        TBridgeTokenRegistry registryImpl = new TBridgeTokenRegistry();
        bytes memory registryInitData = abi.encodeCall(TBridgeTokenRegistry.initialize, ());
        ERC1967Proxy registryProxy = new ERC1967Proxy(address(registryImpl), registryInitData);
        registry = TBridgeTokenRegistry(address(registryProxy));

        // Deploy bridge implementation first to get address for vault
        TBridgeV2 bridgeImpl = new TBridgeV2();

        // Deploy and initialize vault with a temporary bridge address
        TBridgeVault vaultImpl = new TBridgeVault();
        bytes memory vaultInitData = abi.encodeCall(TBridgeVault.initialize, (address(1))); // Temporary address
        ERC1967Proxy vaultProxy = new ERC1967Proxy(address(vaultImpl), vaultInitData);
        vault = TBridgeVault(address(vaultProxy));

        // Deploy and initialize bridge
        bytes memory bridgeInitData = abi.encodeCall(
            TBridgeV2.initialize,
            (KUB_CHAIN_ID, address(registry), address(vault), address(feeCollector), relayer)
        );
        ERC1967Proxy bridgeProxy = new ERC1967Proxy(address(bridgeImpl), bridgeInitData);
        bridge = TBridgeV2(address(bridgeProxy));

        // Update vault with correct bridge address
        vault.setBridge(address(bridge));

        // Configure registry with USDT
        registry.registerToken(address(usdt), JBC_CHAIN_ID, JUSDT, 1e18, 1_000_000e18, 100_000e18);
        registry.addRemoteToken(address(usdt), BSC_CHAIN_ID, BSC_USDT);

        // Configure supported chains
        bridge.setSupportedChain(JBC_CHAIN_ID, true);
        bridge.setSupportedChain(BSC_CHAIN_ID, true);

        // Setup LP with liquidity
        usdt.mint(lp, 1_000_000e18);
        vm.prank(lp);
        usdt.approve(address(vault), type(uint256).max);
        vm.prank(lp);
        vault.deposit(address(usdt), 500_000e18);

        // Setup user with tokens
        usdt.mint(user, 100_000e18);
        vm.prank(user);
        usdt.approve(address(bridge), type(uint256).max);
    }

    // ============ Initialize Tests ============

    function test_initialize() public view {
        assertEq(bridge.chainId(), KUB_CHAIN_ID);
        assertEq(address(bridge.tokenRegistry()), address(registry));
        assertEq(address(bridge.vault()), address(vault));
        assertEq(address(bridge.feeCollector()), address(feeCollector));
        assertEq(bridge.relayer(), relayer);
    }

    // ============ Initiate Bridge Tests ============

    function test_initiateBridge_success() public {
        uint256 amount = 1000e18;

        // Calculate expected fees (default 0.5% each)
        uint256 expectedBridgeFee = (amount * 50) / 10_000; // 5e18
        uint256 expectedProtocolFee = (amount * 50) / 10_000; // 5e18
        uint256 expectedNetAmount = amount - expectedBridgeFee - expectedProtocolFee; // 990e18

        uint256 userBalanceBefore = usdt.balanceOf(user);
        uint256 vaultBalanceBefore = usdt.balanceOf(address(vault));
        uint256 feeCollectorBalanceBefore = usdt.balanceOf(address(feeCollector));

        vm.prank(user);
        uint256 nonce = bridge.initiateBridge(address(usdt), JBC_CHAIN_ID, recipient, amount);

        assertEq(nonce, 0);
        assertEq(bridge.getOutgoingNonce(user), 1);

        // Check balances
        assertEq(usdt.balanceOf(user), userBalanceBefore - amount);
        assertEq(usdt.balanceOf(address(vault)), vaultBalanceBefore + expectedNetAmount + expectedBridgeFee);
        assertEq(usdt.balanceOf(address(feeCollector)), feeCollectorBalanceBefore + expectedProtocolFee);
    }

    function test_initiateBridge_multipleTransfers() public {
        vm.startPrank(user);

        uint256 nonce1 = bridge.initiateBridge(address(usdt), JBC_CHAIN_ID, recipient, 1000e18);
        uint256 nonce2 = bridge.initiateBridge(address(usdt), BSC_CHAIN_ID, recipient, 2000e18);
        uint256 nonce3 = bridge.initiateBridge(address(usdt), JBC_CHAIN_ID, recipient, 500e18);

        vm.stopPrank();

        assertEq(nonce1, 0);
        assertEq(nonce2, 1);
        assertEq(nonce3, 2);
        assertEq(bridge.getOutgoingNonce(user), 3);
    }

    function test_initiateBridge_revert_unsupportedChain() public {
        vm.prank(user);
        vm.expectRevert(ITBridgeV2.UnsupportedChain.selector);
        bridge.initiateBridge(address(usdt), 999, recipient, 1000e18);
    }

    function test_initiateBridge_revert_unsupportedToken() public {
        vm.prank(user);
        vm.expectRevert(ITBridgeV2.UnsupportedToken.selector);
        bridge.initiateBridge(address(usdc), JBC_CHAIN_ID, recipient, 1000e6);
    }

    function test_initiateBridge_revert_belowMinimum() public {
        vm.prank(user);
        vm.expectRevert(ITBridgeV2.AmountBelowMinimum.selector);
        bridge.initiateBridge(address(usdt), JBC_CHAIN_ID, recipient, 0.5e18);
    }

    function test_initiateBridge_revert_aboveMaximum() public {
        usdt.mint(user, 2_000_000e18);

        vm.prank(user);
        vm.expectRevert(ITBridgeV2.AmountAboveMaximum.selector);
        bridge.initiateBridge(address(usdt), JBC_CHAIN_ID, recipient, 1_500_000e18);
    }

    function test_initiateBridge_revert_dailyLimitExceeded() public {
        // Daily limit is 100_000e18
        vm.startPrank(user);

        // First transfer: 90,000
        bridge.initiateBridge(address(usdt), JBC_CHAIN_ID, recipient, 90_000e18);

        // Second transfer: 20,000 - should exceed
        vm.expectRevert(ITBridgeV2.DailyLimitExceeded.selector);
        bridge.initiateBridge(address(usdt), JBC_CHAIN_ID, recipient, 20_000e18);

        vm.stopPrank();
    }

    function test_initiateBridge_dailyLimitResets() public {
        vm.startPrank(user);

        // Use up most of daily limit
        bridge.initiateBridge(address(usdt), JBC_CHAIN_ID, recipient, 90_000e18);

        // Advance time by 1 day
        vm.warp(block.timestamp + 1 days + 1);

        // Should be able to bridge again
        bridge.initiateBridge(address(usdt), JBC_CHAIN_ID, recipient, 1000e18);

        vm.stopPrank();
    }

    function test_initiateBridge_revert_paused() public {
        bridge.pause();

        vm.prank(user);
        vm.expectRevert();
        bridge.initiateBridge(address(usdt), JBC_CHAIN_ID, recipient, 1000e18);
    }

    // ============ Release Funds Tests ============

    function test_releaseFunds_success() public {
        uint256 amount = 1000e18;
        uint256 recipientBalanceBefore = usdt.balanceOf(recipient);

        vm.prank(relayer);
        bridge.releaseFunds(0, JBC_CHAIN_ID, address(usdt), recipient, amount);

        assertEq(usdt.balanceOf(recipient), recipientBalanceBefore + amount);
        assertTrue(bridge.isNonceProcessed(JBC_CHAIN_ID, 0));
    }

    function test_releaseFunds_revert_onlyRelayer() public {
        vm.prank(user);
        vm.expectRevert(ITBridgeV2.OnlyRelayer.selector);
        bridge.releaseFunds(0, JBC_CHAIN_ID, address(usdt), recipient, 1000e18);
    }

    function test_releaseFunds_revert_nonceAlreadyProcessed() public {
        vm.prank(relayer);
        bridge.releaseFunds(0, JBC_CHAIN_ID, address(usdt), recipient, 1000e18);

        vm.prank(relayer);
        vm.expectRevert(ITBridgeV2.NonceAlreadyProcessed.selector);
        bridge.releaseFunds(0, JBC_CHAIN_ID, address(usdt), recipient, 1000e18);
    }

    function test_releaseFunds_revert_insufficientLiquidity() public {
        vm.prank(relayer);
        vm.expectRevert(ITBridgeV2.InsufficientLiquidity.selector);
        bridge.releaseFunds(0, JBC_CHAIN_ID, address(usdt), recipient, 1_000_000e18);
    }

    function test_releaseFunds_revert_paused() public {
        bridge.pause();

        vm.prank(relayer);
        vm.expectRevert();
        bridge.releaseFunds(0, JBC_CHAIN_ID, address(usdt), recipient, 1000e18);
    }

    // ============ Get Bridge Quote Tests ============

    function test_getBridgeQuote() public view {
        uint256 amount = 1000e18;

        ITBridgeV2.BridgeQuote memory quote = bridge.getBridgeQuote(address(usdt), amount);

        // Default fees: 0.5% each
        assertEq(quote.bridgeFee, 5e18); // 0.5%
        assertEq(quote.protocolFee, 5e18); // 0.5%
        assertEq(quote.totalFee, 10e18); // 1%
        assertEq(quote.netAmount, 990e18);
    }

    function test_getBridgeQuote_customFees() public {
        // Set custom fees
        bridge.setBridgeFee(address(usdt), 100); // 1%
        bridge.setProtocolFee(address(usdt), 200); // 2%

        uint256 amount = 1000e18;
        ITBridgeV2.BridgeQuote memory quote = bridge.getBridgeQuote(address(usdt), amount);

        assertEq(quote.bridgeFee, 10e18); // 1%
        assertEq(quote.protocolFee, 20e18); // 2%
        assertEq(quote.totalFee, 30e18); // 3%
        assertEq(quote.netAmount, 970e18);
    }

    // ============ Get Remaining Daily Limit Tests ============

    function test_getRemainingDailyLimit() public {
        // Initially full limit
        assertEq(bridge.getRemainingDailyLimit(user, address(usdt)), 100_000e18);

        // After some usage
        vm.prank(user);
        bridge.initiateBridge(address(usdt), JBC_CHAIN_ID, recipient, 30_000e18);

        assertEq(bridge.getRemainingDailyLimit(user, address(usdt)), 70_000e18);
    }

    // ============ Admin Functions Tests ============

    function test_setBridgeFee_success() public {
        bridge.setBridgeFee(address(usdt), 100); // 1%

        assertEq(bridge.getBridgeFee(address(usdt)), 100);
    }

    function test_setBridgeFee_revert_tooHigh() public {
        vm.expectRevert(ITBridgeV2.InvalidFee.selector);
        bridge.setBridgeFee(address(usdt), 6000); // 60% > 50% max
    }

    function test_setProtocolFee_success() public {
        bridge.setProtocolFee(address(usdt), 200); // 2%

        assertEq(bridge.getProtocolFee(address(usdt)), 200);
    }

    function test_setRelayer_success() public {
        address newRelayer = makeAddr("newRelayer");

        bridge.setRelayer(newRelayer);

        assertEq(bridge.relayer(), newRelayer);

        // Old relayer can't release
        vm.prank(relayer);
        vm.expectRevert(ITBridgeV2.OnlyRelayer.selector);
        bridge.releaseFunds(0, JBC_CHAIN_ID, address(usdt), recipient, 1000e18);

        // New relayer can
        vm.prank(newRelayer);
        bridge.releaseFunds(0, JBC_CHAIN_ID, address(usdt), recipient, 1000e18);
    }

    function test_setSupportedChain() public {
        // Initially not supported
        assertFalse(bridge.isChainSupported(999));

        // Add support
        bridge.setSupportedChain(999, true);
        assertTrue(bridge.isChainSupported(999));

        // Remove support
        bridge.setSupportedChain(999, false);
        assertFalse(bridge.isChainSupported(999));
    }

    function test_pauseUnpause() public {
        assertFalse(bridge.paused());

        bridge.pause();
        assertTrue(bridge.paused());

        bridge.unpause();
        assertFalse(bridge.paused());
    }

    // ============ Integration Test ============

    function test_fullBridgeFlow() public {
        uint256 amount = 1000e18;

        // 1. User initiates bridge from KUB to JBC
        vm.prank(user);
        uint256 nonce = bridge.initiateBridge(address(usdt), JBC_CHAIN_ID, recipient, amount);

        // 2. Get quote to verify fees
        ITBridgeV2.BridgeQuote memory quote = bridge.getBridgeQuote(address(usdt), amount);

        // 3. Verify fee collector received protocol fee
        assertEq(usdt.balanceOf(address(feeCollector)), quote.protocolFee);

        // 4. Verify vault received net amount + bridge fee
        // (vault already had 500_000e18 from LP deposit)
        assertEq(usdt.balanceOf(address(vault)), 500_000e18 + quote.netAmount + quote.bridgeFee);

        // 5. LP can claim bridge fees
        assertEq(vault.getClaimableFees(address(usdt), lp), quote.bridgeFee);

        // 6. Relayer releases funds on destination (simulated on same chain for testing)
        vm.prank(relayer);
        bridge.releaseFunds(nonce, JBC_CHAIN_ID, address(usdt), recipient, quote.netAmount);

        // 7. Recipient received funds
        assertEq(usdt.balanceOf(recipient), quote.netAmount);

        // 8. Nonce is processed
        assertTrue(bridge.isNonceProcessed(JBC_CHAIN_ID, nonce));
    }
}
