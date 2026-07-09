// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IWETH9.sol";
import "./interfaces/IUniswapV2Router.sol";
import "./interfaces/ISwapRouter02.sol";
import "./interfaces/ISwapRouterV1.sol";

contract JunoswapAggregationRouter is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    address public constant NATIVE = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public immutable WNATIVE;

    enum SwapKind {
        V2,
        V3_SINGLE,
        V3_PATH
    }

    /// allowedRouter tag values; 0 = not whitelisted.
    uint8 public constant TAG_V2 = 1; // UniswapV2-style router
    uint8 public constant TAG_V3_02 = 2; // SwapRouter02 (no deadline)
    uint8 public constant TAG_V3_V1 = 3; // original SwapRouter (deadline param)

    mapping(address => uint8) public allowedRouter;

    struct Hop {
        SwapKind kind;
        address router; // must be whitelisted, tag must match kind
        bytes swapData; // kind-tagged: V2 = abi.encode(address[] path); V3_SINGLE = abi.encode(address tokenOut, uint24 fee); V3_PATH = abi.encode(bytes path)
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
    event RouterSet(address indexed router, uint8 tag);

    constructor(address _wrappedNative) {
        require(_wrappedNative != address(0), "bad wnative");
        WNATIVE = _wrappedNative;
    }

    receive() external payable {
        require(msg.sender == WNATIVE, "only wnative");
    }

    function setRouter(address router, uint8 tag) external onlyOwner {
        require(router != address(0), "bad router");
        require(tag <= TAG_V3_V1, "bad tag");
        allowedRouter[router] = tag;
        emit RouterSet(router, tag);
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

        // 4. Execute each leg with recipient forced to this router and minOut 0;
        //    the summed check below is the sole slippage guard.
        for (uint256 i; i < legs.length; ++i) {
            _executeLeg(legs[i], tokenInW, tokenOutW, p.deadline);
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

    function _executeLeg(
        Leg calldata leg,
        address tokenInW,
        address tokenOutW,
        uint256 deadline
    ) private {
        require(leg.hops.length > 0, "no hops");
        address cur = tokenInW;
        uint256 amt = leg.amountIn;
        for (uint256 i; i < leg.hops.length; ++i) {
            (cur, amt) = _executeHop(leg.hops[i], cur, amt, deadline);
        }
        require(cur == tokenOutW, "leg endpoint");
    }

    /// @dev Runs one hop spending `amountIn` of `tokenIn`; returns the hop's
    /// output token and the actual balance-delta receipt, so the next hop can
    /// never spend more than was really received.
    function _executeHop(
        Hop calldata hop,
        address tokenIn,
        uint256 amountIn,
        uint256 deadline
    ) private returns (address tokenOut, uint256 amountOut) {
        uint8 tag = allowedRouter[hop.router];
        require(tag != 0, "router not allowed");
        _ensureApproval(tokenIn, hop.router);

        if (hop.kind == SwapKind.V2) {
            require(tag == TAG_V2, "kind/tag mismatch");
            address[] memory path = abi.decode(hop.swapData, (address[]));
            require(path.length >= 2, "bad path");
            require(path[0] == tokenIn, "path endpoints");
            tokenOut = path[path.length - 1];
            require(tokenOut != tokenIn, "hop same token");
            uint256 balBefore = IERC20(tokenOut).balanceOf(address(this));
            IUniswapV2Router(hop.router).swapExactTokensForTokens(
                amountIn,
                0,
                path,
                address(this),
                deadline
            );
            amountOut = IERC20(tokenOut).balanceOf(address(this)) - balBefore;
        } else if (hop.kind == SwapKind.V3_SINGLE) {
            require(tag == TAG_V3_02 || tag == TAG_V3_V1, "kind/tag mismatch");
            uint24 fee;
            (tokenOut, fee) = abi.decode(hop.swapData, (address, uint24));
            require(tokenOut != tokenIn, "hop same token");
            uint256 balBefore = IERC20(tokenOut).balanceOf(address(this));
            if (tag == TAG_V3_02) {
                ISwapRouter02(hop.router).exactInputSingle(
                    ISwapRouter02.ExactInputSingleParams({
                        tokenIn: tokenIn,
                        tokenOut: tokenOut,
                        fee: fee,
                        recipient: address(this),
                        amountIn: amountIn,
                        amountOutMinimum: 0,
                        sqrtPriceLimitX96: 0
                    })
                );
            } else {
                ISwapRouterV1(hop.router).exactInputSingle(
                    ISwapRouterV1.ExactInputSingleParams({
                        tokenIn: tokenIn,
                        tokenOut: tokenOut,
                        fee: fee,
                        recipient: address(this),
                        deadline: deadline,
                        amountIn: amountIn,
                        amountOutMinimum: 0,
                        sqrtPriceLimitX96: 0
                    })
                );
            }
            amountOut = IERC20(tokenOut).balanceOf(address(this)) - balBefore;
        } else {
            // V3_PATH — multi-hop within one V3 router.
            require(tag == TAG_V3_02 || tag == TAG_V3_V1, "kind/tag mismatch");
            bytes memory path = abi.decode(hop.swapData, (bytes));
            address first;
            (first, tokenOut) = _v3PathTokens(path);
            require(first == tokenIn, "path endpoints");
            require(tokenOut != tokenIn, "hop same token");
            uint256 balBefore = IERC20(tokenOut).balanceOf(address(this));
            if (tag == TAG_V3_02) {
                ISwapRouter02(hop.router).exactInput(
                    ISwapRouter02.ExactInputParams({
                        path: path,
                        recipient: address(this),
                        amountIn: amountIn,
                        amountOutMinimum: 0
                    })
                );
            } else {
                ISwapRouterV1(hop.router).exactInput(
                    ISwapRouterV1.ExactInputParams({
                        path: path,
                        recipient: address(this),
                        deadline: deadline,
                        amountIn: amountIn,
                        amountOutMinimum: 0
                    })
                );
            }
            amountOut = IERC20(tokenOut).balanceOf(address(this)) - balBefore;
        }
    }

    /// @dev Approve a router once (max) via forceApprove, which safely handles
    /// USDT-style tokens (e.g. KUSDT) that revert on nonzero-to-nonzero approve.
    function _ensureApproval(address token, address router) private {
        if (IERC20(token).allowance(address(this), router) == 0) {
            IERC20(token).forceApprove(router, type(uint256).max);
        }
    }

    /// @dev V3 path is token(20) + fee(3) + token(20) + …; extract first/last token.
    function _v3PathTokens(bytes memory path)
        private
        pure
        returns (address first, address last)
    {
        require(path.length >= 43 && (path.length - 20) % 23 == 0, "bad v3 path");
        uint256 lastOffset = path.length - 20;
        assembly {
            // first 20 bytes -> top of the word loaded at path data start
            first := shr(96, mload(add(path, 32)))
            last := shr(96, mload(add(add(path, 32), lastOffset)))
        }
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
