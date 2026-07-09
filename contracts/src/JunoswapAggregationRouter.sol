// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IWETH9.sol";
import "./interfaces/IUniswapV2Pair.sol";
import "./interfaces/IUniswapV2Factory.sol";
import "./interfaces/IUniswapV3SwapCallback.sol";
import "./interfaces/v3-core/IUniswapV3Pool.sol";
import "./interfaces/v3-core/IUniswapV3Factory.sol";

/// @title JunoswapAggregationRouter
/// @notice Splits one swap across many DEX pools in a single transaction, enforcing
/// slippage once on the summed output.
///
/// @dev Swaps call pools directly rather than DEX routers, so this contract holds no
/// token approvals at any time. Pools are resolved through owner-whitelisted factories
/// (`getPair`/`getPool`) instead of a CREATE2 init-code hash, which keeps a single
/// trust boundary across forks whose hashes differ or are unknown.
///
/// Fee-on-transfer tokens: rejected as the aggregate input (leg sizing needs exact
/// receipt). As an intermediate they are handled asymmetrically and safely — a V2 hop
/// measures what the pair actually received and degrades the route, while a V3 hop
/// reverts inside the pool's own balance check. Either way the summed `minAmountOut`
/// bounds the user's loss. As the final output they are handled by the balance snapshot.
contract JunoswapAggregationRouter is
    ReentrancyGuard,
    Ownable,
    IUniswapV3SwapCallback,
    IPancakeV3SwapCallback
{
    using SafeERC20 for IERC20;

    address public constant NATIVE = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public immutable WNATIVE;

    enum SwapKind {
        V2,
        V3
    }

    /// factoryKind values; 0 = not whitelisted. Deliberately offset from SwapKind so a
    /// zeroed mapping entry can never be mistaken for a valid kind.
    uint8 public constant KIND_V2 = 1;
    uint8 public constant KIND_V3 = 2;

    /// Sqrt price bounds from Uniswap V3's TickMath; used as no-op swap limits.
    uint160 internal constant MIN_SQRT_RATIO = 4295128739;
    uint160 internal constant MAX_SQRT_RATIO =
        1461446703485210103287273052203988822378723970342;

    mapping(address => uint8) public factoryKind;
    /// V2 swap fee in basis points (e.g. 30 = 0.30%). Zero for V3, whose fee is per-pool.
    mapping(address => uint16) public factoryFeeBps;

    struct Hop {
        SwapKind kind;
        address factory; // must be whitelisted, kind must match
        bytes swapData; // V2 = abi.encode(address tokenOut); V3 = abi.encode(address tokenOut, uint24 fee)
    }

    /// legs run in parallel over slices of the input.
    struct Leg {
        uint256 amountIn; // this leg's slice; sum across legs must equal amountIn
        Hop[] hops; // hop i's output token feeds hop i+1; last must output tokenOut
    }

    struct AggregateParams {
        address tokenIn; // NATIVE sentinel for native input
        address tokenOut; // NATIVE sentinel for native output
        uint256 amountIn; // total input; must equal sum of leg amounts
        uint256 minAmountOut; // single bound on the SUMMED output
        address recipient;
        uint256 deadline;
        bool unwrapOut; // false on Bitkub (deliver KKUB, not KUB)
        address referrer; // attribution only, emitted in Aggregated
    }

    event Aggregated(
        address indexed sender,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 legs,
        address referrer
    );
    event FactorySet(address indexed factory, uint8 kind, uint16 feeBps);

    constructor(address _wrappedNative) {
        require(_wrappedNative != address(0), "bad wnative");
        WNATIVE = _wrappedNative;
    }

    receive() external payable {
        require(msg.sender == WNATIVE, "only wnative");
    }

    function setFactory(address factory, uint8 kind, uint16 feeBps) external onlyOwner {
        require(factory != address(0), "bad factory");
        require(kind == KIND_V2 || kind == KIND_V3, "bad kind");
        require(
            kind == KIND_V2 ? (feeBps > 0 && feeBps < 10000) : feeBps == 0,
            "bad fee"
        );
        factoryKind[factory] = kind;
        factoryFeeBps[factory] = feeBps;
        emit FactorySet(factory, kind, feeBps);
    }

    function aggregate(AggregateParams calldata p, Leg[] calldata legs)
        external
        payable
        nonReentrant
        returns (uint256 amountOut)
    {
        require(block.timestamp <= p.deadline, "expired");
        require(legs.length > 0, "no legs");
        require(p.recipient != address(0), "bad recipient");

        address tokenInW = _wrapped(p.tokenIn);
        address tokenOutW = _wrapped(p.tokenOut);
        require(tokenInW != tokenOutW, "same token");

        // 1. Pull the full input exactly once.
        if (p.tokenIn == NATIVE) {
            require(msg.value == p.amountIn, "bad msg.value");
            IWETH9(WNATIVE).deposit{value: p.amountIn}();
        } else {
            require(msg.value == 0, "unexpected native");
            uint256 balBefore = IERC20(tokenInW).balanceOf(address(this));
            IERC20(tokenInW).safeTransferFrom(msg.sender, address(this), p.amountIn);
            // Reject fee-on-transfer tokens: leg sizing assumes exact receipt.
            require(
                IERC20(tokenInW).balanceOf(address(this)) - balBefore == p.amountIn,
                "fee-on-transfer"
            );
        }

        // 2. Legs must spend exactly the pulled amount — no over-sell, no dust locked.
        uint256 sumIn;
        for (uint256 i; i < legs.length; ++i) {
            sumIn += legs[i].amountIn;
        }
        require(sumIn == p.amountIn, "sum mismatch");

        // 3. Snapshot output balance so donations/residue can't inflate amountOut.
        uint256 outBefore = IERC20(tokenOutW).balanceOf(address(this));

        // 4. Execute each leg; the summed check below is the sole slippage guard.
        for (uint256 i; i < legs.length; ++i) {
            _executeLeg(legs[i], tokenInW, tokenOutW);
        }

        // 5. Enforce slippage once, on the summed output.
        amountOut = IERC20(tokenOutW).balanceOf(address(this)) - outBefore;
        require(amountOut >= p.minAmountOut, "insufficient output");

        // 6. Deliver output.
        if (p.tokenOut == NATIVE && p.unwrapOut) {
            IWETH9(WNATIVE).withdraw(amountOut);
            (bool ok, ) = p.recipient.call{value: amountOut}("");
            require(ok, "native send failed");
        } else {
            IERC20(tokenOutW).safeTransfer(p.recipient, amountOut);
        }

        // 7. Refund any unspent input dust back to the caller.
        _refundDust(tokenInW, p.tokenIn == NATIVE);

        emit Aggregated(
            msg.sender,
            p.tokenIn,
            p.tokenOut,
            p.amountIn,
            amountOut,
            legs.length,
            p.referrer
        );
    }

    /// @dev Walks the leg with one hop of lookahead. A V2 pair must be pre-funded before
    /// its swap, while a V3 pool pulls payment from this contract in the callback and so
    /// cannot accept a pre-sent balance — tokens sent early would be credited as the
    /// pool's own reserve and paid for twice. Hence a hop pays the next pool directly
    /// only when that pool is a V2 pair; otherwise it routes back here. The final hop
    /// always lands here so step 5's summed snapshot stays authoritative.
    function _executeLeg(Leg calldata leg, address tokenInW, address tokenOutW) private {
        uint256 n = leg.hops.length;
        require(n > 0, "no hops");

        address cur = tokenInW;
        uint256 amt = leg.amountIn;
        (address pool, address tokenOut) = _resolve(leg.hops[0], cur);

        for (uint256 i; i < n; ++i) {
            address recipient = address(this);
            address nextPool;
            address nextTokenOut;
            if (i + 1 < n) {
                (nextPool, nextTokenOut) = _resolve(leg.hops[i + 1], tokenOut);
                if (leg.hops[i + 1].kind == SwapKind.V2) recipient = nextPool;
            }

            if (leg.hops[i].kind == SwapKind.V2) {
                // Later V2 hops were pre-funded by the previous hop's recipient.
                if (i == 0) IERC20(cur).safeTransfer(pool, amt);
                amt = _swapV2(leg.hops[i].factory, pool, cur, recipient);
            } else {
                amt = _swapV3(leg.hops[i], pool, cur, tokenOut, amt, recipient);
            }

            cur = tokenOut;
            pool = nextPool;
            tokenOut = nextTokenOut;
        }

        require(cur == tokenOutW, "leg endpoint");
    }

    /// @dev Resolves a hop's pool through its whitelisted factory. Reverting here on an
    /// unknown pool is what makes an attacker-supplied `factory` or `swapData` inert.
    function _resolve(Hop calldata hop, address tokenIn)
        private
        view
        returns (address pool, address tokenOut)
    {
        uint8 kind = factoryKind[hop.factory];
        if (hop.kind == SwapKind.V2) {
            require(kind == KIND_V2, "kind/factory mismatch");
            tokenOut = abi.decode(hop.swapData, (address));
            pool = IUniswapV2Factory(hop.factory).getPair(tokenIn, tokenOut);
        } else {
            require(kind == KIND_V3, "kind/factory mismatch");
            (address out, uint24 fee) = abi.decode(hop.swapData, (address, uint24));
            tokenOut = out;
            pool = IUniswapV3Factory(hop.factory).getPool(tokenIn, tokenOut, fee);
        }
        require(tokenOut != tokenIn, "hop same token");
        require(pool != address(0), "pool not found");
    }

    /// @dev The pair must already hold this hop's input. Takes no `amountIn`: the amount
    /// swapped is whatever the pair actually received, which is what its K check will price.
    function _swapV2(address factory, address pool, address tokenIn, address recipient)
        private
        returns (uint256 amountOut)
    {
        bool inIsToken0 = tokenIn == IUniswapV2Pair(pool).token0();
        amountOut = _v2AmountOut(factoryFeeBps[factory], pool, tokenIn, inIsToken0);
        require(amountOut > 0, "zero output");

        IUniswapV2Pair(pool).swap(
            inIsToken0 ? 0 : amountOut,
            inIsToken0 ? amountOut : 0,
            recipient,
            ""
        );
    }

    /// @dev Prices the pair's *measured* receipt rather than a threaded amount, so the
    /// requested output can never exceed what the pair's own K check would allow.
    function _v2AmountOut(uint256 feeBps, address pool, address tokenIn, bool inIsToken0)
        private
        view
        returns (uint256)
    {
        (uint112 r0, uint112 r1, ) = IUniswapV2Pair(pool).getReserves();
        (uint256 reserveIn, uint256 reserveOut) = inIsToken0
            ? (uint256(r0), uint256(r1))
            : (uint256(r1), uint256(r0));
        uint256 actualIn = IERC20(tokenIn).balanceOf(pool) - reserveIn;
        return _getAmountOut(actualIn, reserveIn, reserveOut, feeBps);
    }

    function _swapV3(
        Hop calldata hop,
        address pool,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        address recipient
    ) private returns (uint256 amountOut) {
        require(amountIn <= uint256(type(int256).max), "amount overflow");
        bool zeroForOne = tokenIn < tokenOut;

        bytes memory data;
        {
            (, uint24 fee) = abi.decode(hop.swapData, (address, uint24));
            data = abi.encode(hop.factory, tokenIn, tokenOut, fee, amountIn);
        }

        (int256 a0, int256 a1) = IUniswapV3Pool(pool).swap(
            recipient,
            zeroForOne,
            int256(amountIn),
            zeroForOne ? MIN_SQRT_RATIO + 1 : MAX_SQRT_RATIO - 1,
            data
        );

        // With the limit pinned to the extreme, an exact-input swap consumes the whole
        // amount unless liquidity ran out; surface that instead of underspending.
        require(uint256(zeroForOne ? a0 : a1) == amountIn, "v3 partial fill");
        amountOut = uint256(-(zeroForOne ? a1 : a0));
    }

    function uniswapV3SwapCallback(
        int256 amount0Delta,
        int256 amount1Delta,
        bytes calldata data
    ) external override {
        _swapCallback(amount0Delta, amount1Delta, data);
    }

    function pancakeV3SwapCallback(
        int256 amount0Delta,
        int256 amount1Delta,
        bytes calldata data
    ) external override {
        _swapCallback(amount0Delta, amount1Delta, data);
    }

    /// @dev Authenticates the caller as the canonical pool of a whitelisted factory —
    /// this replaces Uniswap's CallbackValidation/PoolAddress and needs no init-code hash.
    /// `maxPay` caps the transfer at the hop's own input so that even a factory that
    /// turned malicious cannot drain balances belonging to other legs.
    function _swapCallback(
        int256 amount0Delta,
        int256 amount1Delta,
        bytes calldata data
    ) private {
        require(_reentrancyGuardEntered(), "no active swap");
        require(amount0Delta > 0 || amount1Delta > 0, "no payment owed");

        (address factory, address tokenIn, address tokenOut, uint24 fee, uint256 maxPay) =
            abi.decode(data, (address, address, address, uint24, uint256));

        require(factoryKind[factory] == KIND_V3, "kind/factory mismatch");
        require(
            msg.sender == IUniswapV3Factory(factory).getPool(tokenIn, tokenOut, fee),
            "callback not pool"
        );

        uint256 amountOwed = uint256(amount0Delta > 0 ? amount0Delta : amount1Delta);
        require(amountOwed <= maxPay, "overpay");
        IERC20(tokenIn).safeTransfer(msg.sender, amountOwed);
    }

    /// @dev UniswapV2's constant-product formula generalised over the fork's fee, since
    /// the Bitkub/JBC forks are not all 0.30% (udonswap charges 0.25%).
    function _getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut,
        uint256 feeBps
    ) private pure returns (uint256) {
        require(amountIn > 0, "zero input");
        require(reserveIn > 0 && reserveOut > 0, "no liquidity");
        uint256 amountInWithFee = amountIn * (10000 - feeBps);
        return (amountInWithFee * reserveOut) / (reserveIn * 10000 + amountInWithFee);
    }

    function _refundDust(address tokenInW, bool nativeIn) private {
        uint256 dust = IERC20(tokenInW).balanceOf(address(this));
        if (dust == 0) return;
        if (nativeIn) {
            IWETH9(WNATIVE).withdraw(dust);
            (bool ok, ) = msg.sender.call{value: dust}("");
            require(ok, "dust refund failed");
        } else {
            IERC20(tokenInW).safeTransfer(msg.sender, dust);
        }
    }

    function _wrapped(address token) private view returns (address) {
        return token == NATIVE ? WNATIVE : token;
    }
}
