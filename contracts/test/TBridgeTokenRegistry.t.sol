// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Test, console} from "forge-std/Test.sol";
import {TBridgeTokenRegistry} from "../src/TBridgeTokenRegistry.sol";
import {ITBridgeTokenRegistry} from "../src/interfaces/ITBridgeTokenRegistry.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

contract TBridgeTokenRegistryTest is Test {
    TBridgeTokenRegistry public registryImpl;
    TBridgeTokenRegistry public registry;
    MockERC20 public usdt;
    MockERC20 public usdc;

    address public owner = address(this);
    address public user = makeAddr("user");

    uint256 public constant KUB_CHAIN_ID = 96;
    uint256 public constant JBC_CHAIN_ID = 8899;
    uint256 public constant BSC_CHAIN_ID = 56;

    address public constant KUSDT = 0x7d984C24d2499D840eB3b7016077164e15E5faA6;
    address public constant JUSDT = 0xFD8Ef75c1cB00A594D02df48ADdc27414Bd07F8a;

    event TokenRegistered(address indexed localToken, uint256 indexed remoteChainId, address remoteToken);
    event TokenEnabled(address indexed token, bool enabled);
    event TokenLimitsUpdated(address indexed token, uint256 minAmount, uint256 maxAmount, uint256 dailyLimit);
    event RemoteTokenUpdated(address indexed localToken, uint256 indexed remoteChainId, address remoteToken);

    function setUp() public {
        // Deploy implementation
        registryImpl = new TBridgeTokenRegistry();

        // Deploy proxy
        bytes memory initData = abi.encodeCall(TBridgeTokenRegistry.initialize, ());
        ERC1967Proxy proxy = new ERC1967Proxy(address(registryImpl), initData);
        registry = TBridgeTokenRegistry(address(proxy));

        // Deploy mock tokens
        usdt = new MockERC20("USDT", "USDT", 18);
        usdc = new MockERC20("USDC", "USDC", 6);
    }

    // ============ Register Token Tests ============

    function test_registerToken_success() public {
        vm.expectEmit(true, true, false, true);
        emit TokenRegistered(address(usdt), JBC_CHAIN_ID, JUSDT);

        vm.expectEmit(true, false, false, true);
        emit TokenEnabled(address(usdt), true);

        vm.expectEmit(true, false, false, true);
        emit TokenLimitsUpdated(address(usdt), 1e18, 1_000_000e18, 100_000e18);

        registry.registerToken(address(usdt), JBC_CHAIN_ID, JUSDT, 1e18, 1_000_000e18, 100_000e18);

        assertTrue(registry.isTokenSupported(address(usdt)));
        assertTrue(registry.isTokenRegistered(address(usdt)));
        assertEq(registry.getRemoteToken(address(usdt), JBC_CHAIN_ID), JUSDT);

        ITBridgeTokenRegistry.TokenConfigView memory config = registry.getTokenConfig(address(usdt));
        assertTrue(config.enabled);
        assertEq(config.minAmount, 1e18);
        assertEq(config.maxAmount, 1_000_000e18);
        assertEq(config.dailyLimit, 100_000e18);
    }

    function test_registerToken_multipleChains() public {
        // Register for JBC
        registry.registerToken(address(usdt), JBC_CHAIN_ID, JUSDT, 1e18, 1_000_000e18, 100_000e18);

        // Add BSC mapping
        registry.addRemoteToken(address(usdt), BSC_CHAIN_ID, address(0x55d398326f99059fF775485246999027B3197955));

        assertEq(registry.getRemoteToken(address(usdt), JBC_CHAIN_ID), JUSDT);
        assertEq(
            registry.getRemoteToken(address(usdt), BSC_CHAIN_ID), address(0x55d398326f99059fF775485246999027B3197955)
        );
    }

    function test_registerToken_revert_invalidLocalToken() public {
        vm.expectRevert(ITBridgeTokenRegistry.InvalidAddress.selector);
        registry.registerToken(address(0), JBC_CHAIN_ID, JUSDT, 1e18, 1_000_000e18, 100_000e18);
    }

    function test_registerToken_revert_invalidRemoteToken() public {
        vm.expectRevert(ITBridgeTokenRegistry.InvalidAddress.selector);
        registry.registerToken(address(usdt), JBC_CHAIN_ID, address(0), 1e18, 1_000_000e18, 100_000e18);
    }

    function test_registerToken_revert_invalidChainId() public {
        vm.expectRevert(ITBridgeTokenRegistry.InvalidChainId.selector);
        registry.registerToken(address(usdt), 0, JUSDT, 1e18, 1_000_000e18, 100_000e18);
    }

    function test_registerToken_revert_invalidAmount() public {
        // Min = 0
        vm.expectRevert(ITBridgeTokenRegistry.InvalidAmount.selector);
        registry.registerToken(address(usdt), JBC_CHAIN_ID, JUSDT, 0, 1_000_000e18, 100_000e18);

        // Max = 0
        vm.expectRevert(ITBridgeTokenRegistry.InvalidAmount.selector);
        registry.registerToken(address(usdt), JBC_CHAIN_ID, JUSDT, 1e18, 0, 100_000e18);

        // Min > Max
        vm.expectRevert(ITBridgeTokenRegistry.InvalidAmount.selector);
        registry.registerToken(address(usdt), JBC_CHAIN_ID, JUSDT, 1_000_000e18, 1e18, 100_000e18);

        // Daily limit = 0
        vm.expectRevert(ITBridgeTokenRegistry.InvalidAmount.selector);
        registry.registerToken(address(usdt), JBC_CHAIN_ID, JUSDT, 1e18, 1_000_000e18, 0);
    }

    function test_registerToken_revert_notOwner() public {
        vm.prank(user);
        vm.expectRevert();
        registry.registerToken(address(usdt), JBC_CHAIN_ID, JUSDT, 1e18, 1_000_000e18, 100_000e18);
    }

    // ============ Add Remote Token Tests ============

    function test_addRemoteToken_success() public {
        registry.registerToken(address(usdt), JBC_CHAIN_ID, JUSDT, 1e18, 1_000_000e18, 100_000e18);

        address bscUsdt = address(0x55d398326f99059fF775485246999027B3197955);

        vm.expectEmit(true, true, false, true);
        emit RemoteTokenUpdated(address(usdt), BSC_CHAIN_ID, bscUsdt);

        registry.addRemoteToken(address(usdt), BSC_CHAIN_ID, bscUsdt);

        assertEq(registry.getRemoteToken(address(usdt), BSC_CHAIN_ID), bscUsdt);
    }

    function test_addRemoteToken_revert_notRegistered() public {
        vm.expectRevert(ITBridgeTokenRegistry.TokenNotRegistered.selector);
        registry.addRemoteToken(address(usdt), BSC_CHAIN_ID, address(0x55d398326f99059fF775485246999027B3197955));
    }

    // ============ Set Token Enabled Tests ============

    function test_setTokenEnabled_success() public {
        registry.registerToken(address(usdt), JBC_CHAIN_ID, JUSDT, 1e18, 1_000_000e18, 100_000e18);

        assertTrue(registry.isTokenSupported(address(usdt)));

        vm.expectEmit(true, false, false, true);
        emit TokenEnabled(address(usdt), false);

        registry.setTokenEnabled(address(usdt), false);

        assertFalse(registry.isTokenSupported(address(usdt)));
        assertTrue(registry.isTokenRegistered(address(usdt))); // Still registered, just disabled
    }

    // ============ Set Token Limits Tests ============

    function test_setTokenLimits_success() public {
        registry.registerToken(address(usdt), JBC_CHAIN_ID, JUSDT, 1e18, 1_000_000e18, 100_000e18);

        vm.expectEmit(true, false, false, true);
        emit TokenLimitsUpdated(address(usdt), 10e18, 500_000e18, 50_000e18);

        registry.setTokenLimits(address(usdt), 10e18, 500_000e18, 50_000e18);

        ITBridgeTokenRegistry.TokenConfigView memory config = registry.getTokenConfig(address(usdt));
        assertEq(config.minAmount, 10e18);
        assertEq(config.maxAmount, 500_000e18);
        assertEq(config.dailyLimit, 50_000e18);
    }

    // ============ Get Supported Tokens Tests ============

    function test_getSupportedTokens() public {
        // No tokens initially
        address[] memory tokens = registry.getSupportedTokens();
        assertEq(tokens.length, 0);

        // Register first token
        registry.registerToken(address(usdt), JBC_CHAIN_ID, JUSDT, 1e18, 1_000_000e18, 100_000e18);
        tokens = registry.getSupportedTokens();
        assertEq(tokens.length, 1);
        assertEq(tokens[0], address(usdt));

        // Register second token
        registry.registerToken(address(usdc), JBC_CHAIN_ID, address(0x123), 1e6, 1_000_000e6, 100_000e6);
        tokens = registry.getSupportedTokens();
        assertEq(tokens.length, 2);

        // Disable one token
        registry.setTokenEnabled(address(usdt), false);
        tokens = registry.getSupportedTokens();
        assertEq(tokens.length, 1);
        assertEq(tokens[0], address(usdc));
    }

    // ============ Validate Amount Tests ============

    function test_validateAmount() public {
        registry.registerToken(address(usdt), JBC_CHAIN_ID, JUSDT, 1e18, 1_000_000e18, 100_000e18);

        // Valid amount
        assertTrue(registry.validateAmount(address(usdt), 100e18));
        assertTrue(registry.validateAmount(address(usdt), 1e18)); // Min
        assertTrue(registry.validateAmount(address(usdt), 1_000_000e18)); // Max

        // Invalid amounts
        assertFalse(registry.validateAmount(address(usdt), 0.5e18)); // Below min
        assertFalse(registry.validateAmount(address(usdt), 1_000_001e18)); // Above max
        assertFalse(registry.validateAmount(address(usdc), 100e6)); // Unregistered token
    }
}
