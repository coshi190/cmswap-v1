// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "forge-std/Test.sol";
import "../src/JunoswapAggregationRouter.sol";
import "./mocks/MockDexRouters.sol";

contract JunoswapAggregationRouterTest is Test {
    JunoswapAggregationRouter router;
    MockWETH9 weth;
    MintableERC20 tokenA; // input
    MintableERC20 tokenB; // output
    MockV2Router v2; // rate 0.99
    MockV3Router02 v3; // rate 0.98

    address user = address(0xA11CE);
    address recipient = address(0xB0B);
    address referrer = address(0xCAFE);

    address constant NATIVE = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    receive() external payable {}

    function setUp() public {
        weth = new MockWETH9();
        router = new JunoswapAggregationRouter(address(weth));
        tokenA = new MintableERC20("TokenA", "A", 18);
        tokenB = new MintableERC20("TokenB", "B", 18);
        v2 = new MockV2Router(9900);
        v3 = new MockV3Router02(9800);

        router.setRouter(address(v2), router.TAG_V2());
        router.setRouter(address(v3), router.TAG_V3_02());

        // Fund routers with output-side liquidity for every token they may pay.
        tokenA.mint(address(v2), 1_000_000 ether);
        tokenA.mint(address(v3), 1_000_000 ether);
        tokenB.mint(address(v2), 1_000_000 ether);
        tokenB.mint(address(v3), 1_000_000 ether);
        vm.deal(address(this), 1_000 ether);
        weth.deposit{value: 1_000 ether}();
        weth.transfer(address(v2), 500 ether);
        weth.transfer(address(v3), 500 ether);
    }

    // ------------------------------------------------------------------ //
    // Helpers                                                            //
    // ------------------------------------------------------------------ //

    function _v2Hop(address routerAddr, address tin, address tout)
        internal
        pure
        returns (JunoswapAggregationRouter.Hop memory)
    {
        address[] memory path = new address[](2);
        path[0] = tin;
        path[1] = tout;
        return JunoswapAggregationRouter.Hop({
            kind: JunoswapAggregationRouter.SwapKind.V2,
            router: routerAddr,
            swapData: abi.encode(path)
        });
    }

    function _v3SingleHop(address routerAddr, address tout, uint24 fee)
        internal
        pure
        returns (JunoswapAggregationRouter.Hop memory)
    {
        return JunoswapAggregationRouter.Hop({
            kind: JunoswapAggregationRouter.SwapKind.V3_SINGLE,
            router: routerAddr,
            swapData: abi.encode(tout, fee)
        });
    }

    function _v3PathHop(address routerAddr, bytes memory path)
        internal
        pure
        returns (JunoswapAggregationRouter.Hop memory)
    {
        return JunoswapAggregationRouter.Hop({
            kind: JunoswapAggregationRouter.SwapKind.V3_PATH,
            router: routerAddr,
            swapData: abi.encode(path)
        });
    }

    function _oneHopLeg(uint256 amountIn, JunoswapAggregationRouter.Hop memory hop)
        internal
        pure
        returns (JunoswapAggregationRouter.Leg memory leg)
    {
        leg.amountIn = amountIn;
        leg.hops = new JunoswapAggregationRouter.Hop[](1);
        leg.hops[0] = hop;
    }

    function _twoHopLeg(
        uint256 amountIn,
        JunoswapAggregationRouter.Hop memory h1,
        JunoswapAggregationRouter.Hop memory h2
    ) internal pure returns (JunoswapAggregationRouter.Leg memory leg) {
        leg.amountIn = amountIn;
        leg.hops = new JunoswapAggregationRouter.Hop[](2);
        leg.hops[0] = h1;
        leg.hops[1] = h2;
    }

    function _params(
        address tin,
        address tout,
        uint256 amountIn,
        uint256 minOut,
        bool unwrapOut
    ) internal view returns (JunoswapAggregationRouter.AggregateParams memory) {
        return JunoswapAggregationRouter.AggregateParams({
            tokenIn: tin,
            tokenOut: tout,
            amountIn: amountIn,
            minAmountOut: minOut,
            recipient: recipient,
            deadline: block.timestamp + 300,
            unwrapOut: unwrapOut,
            referrer: referrer
        });
    }

    // ------------------------------------------------------------------ //
    // Core split                                                         //
    // ------------------------------------------------------------------ //

    function test_SplitAcrossTwoDexes() public {
        uint256 amountIn = 1000 ether;
        tokenA.mint(user, amountIn);

        JunoswapAggregationRouter.Leg[] memory legs = new JunoswapAggregationRouter.Leg[](2);
        legs[0] = _oneHopLeg(600 ether, _v2Hop(address(v2), address(tokenA), address(tokenB)));
        legs[1] = _oneHopLeg(400 ether, _v3SingleHop(address(v3), address(tokenB), 3000));

        // 600*0.99 + 400*0.98 = 594 + 392 = 986
        uint256 expected = 986 ether;

        vm.startPrank(user);
        tokenA.approve(address(router), amountIn);
        uint256 out = router.aggregate(
            _params(address(tokenA), address(tokenB), amountIn, 985 ether, false),
            legs
        );
        vm.stopPrank();

        assertEq(out, expected, "summed output");
        assertEq(tokenB.balanceOf(recipient), expected, "recipient received");
        assertEq(tokenA.balanceOf(user), 0, "input fully spent");
        // Router custodies nothing after the call.
        assertEq(tokenB.balanceOf(address(router)), 0);
        assertEq(tokenA.balanceOf(address(router)), 0);
    }

    function test_RevertWhenBelowMinOut() public {
        uint256 amountIn = 1000 ether;
        tokenA.mint(user, amountIn);
        JunoswapAggregationRouter.Leg[] memory legs = new JunoswapAggregationRouter.Leg[](1);
        legs[0] = _oneHopLeg(amountIn, _v2Hop(address(v2), address(tokenA), address(tokenB)));

        vm.startPrank(user);
        tokenA.approve(address(router), amountIn);
        vm.expectRevert("insufficient output");
        router.aggregate(
            _params(address(tokenA), address(tokenB), amountIn, 1000 ether, false),
            legs
        );
        vm.stopPrank();
    }

    function test_RevertOnSumMismatch() public {
        uint256 amountIn = 1000 ether;
        tokenA.mint(user, amountIn);
        JunoswapAggregationRouter.Leg[] memory legs = new JunoswapAggregationRouter.Leg[](2);
        legs[0] = _oneHopLeg(600 ether, _v2Hop(address(v2), address(tokenA), address(tokenB)));
        // 600+300 != 1000
        legs[1] = _oneHopLeg(300 ether, _v3SingleHop(address(v3), address(tokenB), 3000));

        vm.startPrank(user);
        tokenA.approve(address(router), amountIn);
        vm.expectRevert("sum mismatch");
        router.aggregate(
            _params(address(tokenA), address(tokenB), amountIn, 0, false),
            legs
        );
        vm.stopPrank();
    }

    function test_RevertWhenRouterNotWhitelisted() public {
        MockV2Router rogue = new MockV2Router(9900);
        tokenB.mint(address(rogue), 1000 ether);
        uint256 amountIn = 100 ether;
        tokenA.mint(user, amountIn);

        JunoswapAggregationRouter.Leg[] memory legs = new JunoswapAggregationRouter.Leg[](1);
        legs[0] = _oneHopLeg(amountIn, _v2Hop(address(rogue), address(tokenA), address(tokenB)));

        vm.startPrank(user);
        tokenA.approve(address(router), amountIn);
        vm.expectRevert("router not allowed");
        router.aggregate(_params(address(tokenA), address(tokenB), amountIn, 0, false), legs);
        vm.stopPrank();
    }

    function test_DustRefunded() public {
        // Mocks spend exactly leg.amountIn; assert the exact-spend happy path
        // leaves zero dust in the router.
        uint256 amountIn = 500 ether;
        tokenA.mint(user, amountIn);
        JunoswapAggregationRouter.Leg[] memory legs = new JunoswapAggregationRouter.Leg[](1);
        legs[0] = _oneHopLeg(amountIn, _v2Hop(address(v2), address(tokenA), address(tokenB)));

        vm.startPrank(user);
        tokenA.approve(address(router), amountIn);
        router.aggregate(_params(address(tokenA), address(tokenB), amountIn, 0, false), legs);
        vm.stopPrank();
        assertEq(tokenA.balanceOf(address(router)), 0);
    }

    function test_V3PathMultiHopLeg() public {
        uint256 amountIn = 200 ether;
        tokenA.mint(user, amountIn);

        bytes memory path = abi.encodePacked(address(tokenA), uint24(3000), address(tokenB));
        JunoswapAggregationRouter.Leg[] memory legs = new JunoswapAggregationRouter.Leg[](1);
        legs[0] = _oneHopLeg(amountIn, _v3PathHop(address(v3), path));

        vm.startPrank(user);
        tokenA.approve(address(router), amountIn);
        uint256 out = router.aggregate(
            _params(address(tokenA), address(tokenB), amountIn, 0, false),
            legs
        );
        vm.stopPrank();
        assertEq(out, (amountIn * 9800) / 10000, "v3 path output");
    }

    function test_RevertOnV3PathBadEndpoints() public {
        uint256 amountIn = 100 ether;
        tokenA.mint(user, amountIn);
        // Path starts at tokenB while the hop's input token is tokenA.
        bytes memory path = abi.encodePacked(address(tokenB), uint24(3000), address(tokenA));
        JunoswapAggregationRouter.Leg[] memory legs = new JunoswapAggregationRouter.Leg[](1);
        legs[0] = _oneHopLeg(amountIn, _v3PathHop(address(v3), path));

        vm.startPrank(user);
        tokenA.approve(address(router), amountIn);
        vm.expectRevert("path endpoints");
        router.aggregate(_params(address(tokenA), address(tokenB), amountIn, 0, false), legs);
        vm.stopPrank();
    }

    // ------------------------------------------------------------------ //
    // Cross-DEX multihop                                                 //
    // ------------------------------------------------------------------ //

    function test_CrossDexTwoHopLeg() public {
        uint256 amountIn = 100 ether;
        tokenA.mint(user, amountIn);

        // A --v2--> WETH --v3--> B in one leg.
        JunoswapAggregationRouter.Leg[] memory legs = new JunoswapAggregationRouter.Leg[](1);
        legs[0] = _twoHopLeg(
            amountIn,
            _v2Hop(address(v2), address(tokenA), address(weth)),
            _v3SingleHop(address(v3), address(tokenB), 3000)
        );

        // 100 * 0.99 * 0.98 = 97.02
        uint256 expected = (amountIn * 9900) / 10000 * 9800 / 10000;

        vm.startPrank(user);
        tokenA.approve(address(router), amountIn);
        uint256 out = router.aggregate(
            _params(address(tokenA), address(tokenB), amountIn, expected, false),
            legs
        );
        vm.stopPrank();

        assertEq(out, expected, "chained output");
        assertEq(tokenB.balanceOf(recipient), expected, "recipient received");
        // No custody of input, intermediate, or output remains.
        assertEq(tokenA.balanceOf(address(router)), 0);
        assertEq(weth.balanceOf(address(router)), 0);
        assertEq(tokenB.balanceOf(address(router)), 0);
    }

    function test_SplitWithMixedHopDepths() public {
        uint256 amountIn = 1000 ether;
        tokenA.mint(user, amountIn);

        JunoswapAggregationRouter.Leg[] memory legs = new JunoswapAggregationRouter.Leg[](2);
        // Leg 1: direct A -> B on v2.
        legs[0] = _oneHopLeg(600 ether, _v2Hop(address(v2), address(tokenA), address(tokenB)));
        // Leg 2: A --v2--> WETH --v3--> B.
        legs[1] = _twoHopLeg(
            400 ether,
            _v2Hop(address(v2), address(tokenA), address(weth)),
            _v3SingleHop(address(v3), address(tokenB), 3000)
        );

        // 600*0.99 + 400*0.99*0.98 = 594 + 388.08 = 982.08
        uint256 expected = 594 ether + 388.08 ether;

        vm.startPrank(user);
        tokenA.approve(address(router), amountIn);
        uint256 out = router.aggregate(
            _params(address(tokenA), address(tokenB), amountIn, expected, false),
            legs
        );
        vm.stopPrank();

        assertEq(out, expected, "summed output across mixed-depth legs");
        assertEq(tokenB.balanceOf(recipient), expected);
        assertEq(weth.balanceOf(address(router)), 0, "intermediate fully consumed");
    }

    function test_NativeInputCrossDexMultihop() public {
        uint256 amountIn = 10 ether;
        vm.deal(user, amountIn);

        // native -> WETH (wrap) --v2--> A --v3--> B.
        JunoswapAggregationRouter.Leg[] memory legs = new JunoswapAggregationRouter.Leg[](1);
        legs[0] = _twoHopLeg(
            amountIn,
            _v2Hop(address(v2), address(weth), address(tokenA)),
            _v3SingleHop(address(v3), address(tokenB), 3000)
        );

        uint256 expected = (amountIn * 9900) / 10000 * 9800 / 10000; // 9.702

        vm.prank(user);
        uint256 out = router.aggregate{value: amountIn}(
            _params(NATIVE, address(tokenB), amountIn, expected, false),
            legs
        );
        assertEq(out, expected);
        assertEq(tokenB.balanceOf(recipient), expected);
    }

    function test_NativeOutputCrossDexMultihopUnwraps() public {
        uint256 amountIn = 100 ether;
        tokenA.mint(user, amountIn);

        // A --v3--> B --v2--> WETH, then unwrap to native.
        JunoswapAggregationRouter.Leg[] memory legs = new JunoswapAggregationRouter.Leg[](1);
        legs[0] = _twoHopLeg(
            amountIn,
            _v3SingleHop(address(v3), address(tokenB), 3000),
            _v2Hop(address(v2), address(tokenB), address(weth))
        );

        uint256 expected = (amountIn * 9800) / 10000 * 9900 / 10000; // 97.02
        uint256 balBefore = recipient.balance;

        vm.startPrank(user);
        tokenA.approve(address(router), amountIn);
        uint256 out = router.aggregate(
            _params(address(tokenA), NATIVE, amountIn, expected, true),
            legs
        );
        vm.stopPrank();

        assertEq(out, expected);
        assertEq(recipient.balance - balBefore, expected, "native delivered");
    }

    function test_RevertOnLegEndpointMismatch() public {
        uint256 amountIn = 100 ether;
        tokenA.mint(user, amountIn);

        // Leg ends at WETH but the declared tokenOut is B.
        JunoswapAggregationRouter.Leg[] memory legs = new JunoswapAggregationRouter.Leg[](1);
        legs[0] = _oneHopLeg(amountIn, _v2Hop(address(v2), address(tokenA), address(weth)));

        vm.startPrank(user);
        tokenA.approve(address(router), amountIn);
        vm.expectRevert("leg endpoint");
        router.aggregate(_params(address(tokenA), address(tokenB), amountIn, 0, false), legs);
        vm.stopPrank();
    }

    function test_RevertOnHopInputMismatch() public {
        uint256 amountIn = 100 ether;
        tokenA.mint(user, amountIn);

        // Hop 1 outputs WETH, but hop 2's path starts at tokenA.
        JunoswapAggregationRouter.Leg[] memory legs = new JunoswapAggregationRouter.Leg[](1);
        legs[0] = _twoHopLeg(
            amountIn,
            _v2Hop(address(v2), address(tokenA), address(weth)),
            _v2Hop(address(v2), address(tokenA), address(tokenB))
        );

        vm.startPrank(user);
        tokenA.approve(address(router), amountIn);
        vm.expectRevert("path endpoints");
        router.aggregate(_params(address(tokenA), address(tokenB), amountIn, 0, false), legs);
        vm.stopPrank();
    }

    function test_RevertOnHopKindTagMismatch() public {
        uint256 amountIn = 100 ether;
        tokenA.mint(user, amountIn);

        // V2-kind hop pointed at the V3 router.
        JunoswapAggregationRouter.Leg[] memory legs = new JunoswapAggregationRouter.Leg[](1);
        legs[0] = _oneHopLeg(amountIn, _v2Hop(address(v3), address(tokenA), address(tokenB)));

        vm.startPrank(user);
        tokenA.approve(address(router), amountIn);
        vm.expectRevert("kind/tag mismatch");
        router.aggregate(_params(address(tokenA), address(tokenB), amountIn, 0, false), legs);
        vm.stopPrank();
    }

    function test_RevertOnEmptyHops() public {
        uint256 amountIn = 100 ether;
        tokenA.mint(user, amountIn);

        JunoswapAggregationRouter.Leg[] memory legs = new JunoswapAggregationRouter.Leg[](1);
        legs[0].amountIn = amountIn;
        legs[0].hops = new JunoswapAggregationRouter.Hop[](0);

        vm.startPrank(user);
        tokenA.approve(address(router), amountIn);
        vm.expectRevert("no hops");
        router.aggregate(_params(address(tokenA), address(tokenB), amountIn, 0, false), legs);
        vm.stopPrank();
    }

    function test_ShortPayingRouterForwardsActualReceipt() public {
        // A router that reports more than it transfers must not let the next hop
        // over-spend: the chain forwards the real balance delta.
        ShortPayV2Router shortPay = new ShortPayV2Router(9900);
        router.setRouter(address(shortPay), router.TAG_V2());
        vm.deal(address(this), 100 ether);
        weth.deposit{value: 100 ether}();
        weth.transfer(address(shortPay), 100 ether);

        uint256 amountIn = 100 ether;
        tokenA.mint(user, amountIn);

        JunoswapAggregationRouter.Leg[] memory legs = new JunoswapAggregationRouter.Leg[](1);
        legs[0] = _twoHopLeg(
            amountIn,
            _v2Hop(address(shortPay), address(tokenA), address(weth)),
            _v3SingleHop(address(v3), address(tokenB), 3000)
        );

        // Hop 1 really pays 99e18 - 1; hop 2 swaps exactly that.
        uint256 hop1Actual = (amountIn * 9900) / 10000 - 1;
        uint256 expected = (hop1Actual * 9800) / 10000;

        vm.startPrank(user);
        tokenA.approve(address(router), amountIn);
        uint256 out = router.aggregate(
            _params(address(tokenA), address(tokenB), amountIn, expected, false),
            legs
        );
        vm.stopPrank();

        assertEq(out, expected, "output reflects actual hop-1 receipt");
        assertEq(weth.balanceOf(address(router)), 0, "no intermediate stranded");
    }

    // ------------------------------------------------------------------ //
    // Native handling                                                    //
    // ------------------------------------------------------------------ //

    function test_NativeInputWraps() public {
        uint256 amountIn = 10 ether;
        vm.deal(user, amountIn);

        JunoswapAggregationRouter.Leg[] memory legs = new JunoswapAggregationRouter.Leg[](1);
        legs[0] = _oneHopLeg(amountIn, _v2Hop(address(v2), address(weth), address(tokenB)));

        vm.prank(user);
        uint256 out = router.aggregate{value: amountIn}(
            _params(NATIVE, address(tokenB), amountIn, 0, false),
            legs
        );
        assertEq(out, (amountIn * 9900) / 10000);
        assertEq(tokenB.balanceOf(recipient), out);
    }

    function test_NativeOutputUnwraps() public {
        uint256 amountIn = 15 ether;
        tokenA.mint(user, amountIn);
        JunoswapAggregationRouter.Leg[] memory legs = new JunoswapAggregationRouter.Leg[](1);
        legs[0] = _oneHopLeg(amountIn, _v2Hop(address(v2), address(tokenA), address(weth)));

        uint256 expected = (amountIn * 9900) / 10000; // 14.85 ether native
        uint256 balBefore = recipient.balance;

        vm.startPrank(user);
        tokenA.approve(address(router), amountIn);
        uint256 out = router.aggregate(
            _params(address(tokenA), NATIVE, amountIn, 0, true),
            legs
        );
        vm.stopPrank();

        assertEq(out, expected);
        assertEq(recipient.balance - balBefore, expected, "native delivered");
    }

    function test_NativeOutputKkubStyleDeliversWrapped() public {
        // unwrapOut=false: deliver the wrapped token (KKUB) instead of native.
        uint256 amountIn = 15 ether;
        tokenA.mint(user, amountIn);
        JunoswapAggregationRouter.Leg[] memory legs = new JunoswapAggregationRouter.Leg[](1);
        legs[0] = _oneHopLeg(amountIn, _v2Hop(address(v2), address(tokenA), address(weth)));

        uint256 expected = (amountIn * 9900) / 10000;
        JunoswapAggregationRouter.AggregateParams memory p =
            _params(address(tokenA), NATIVE, amountIn, 0, false);

        vm.startPrank(user);
        tokenA.approve(address(router), amountIn);
        uint256 out = router.aggregate(p, legs);
        vm.stopPrank();

        assertEq(out, expected);
        assertEq(weth.balanceOf(recipient), expected, "wrapped delivered, not unwrapped");
    }

    // ------------------------------------------------------------------ //
    // Fuzz                                                               //
    // ------------------------------------------------------------------ //

    function testFuzz_SumMustEqualAmountIn(uint256 a, uint256 b, uint256 declared) public {
        a = bound(a, 1 ether, 1000 ether);
        b = bound(b, 1 ether, 1000 ether);
        declared = bound(declared, 1 ether, 3000 ether);
        uint256 total = a + b;
        tokenA.mint(user, total);

        JunoswapAggregationRouter.Leg[] memory legs = new JunoswapAggregationRouter.Leg[](2);
        legs[0] = _oneHopLeg(a, _v2Hop(address(v2), address(tokenA), address(tokenB)));
        legs[1] = _oneHopLeg(b, _v3SingleHop(address(v3), address(tokenB), 3000));

        vm.startPrank(user);
        tokenA.approve(address(router), total);
        if (declared != total) {
            vm.expectRevert();
            router.aggregate(_params(address(tokenA), address(tokenB), declared, 0, false), legs);
        } else {
            router.aggregate(_params(address(tokenA), address(tokenB), declared, 0, false), legs);
            assertEq(tokenA.balanceOf(user), 0);
        }
        vm.stopPrank();
    }
}
