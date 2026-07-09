// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../../src/interfaces/IUniswapV2Router.sol";
import "../../src/interfaces/ISwapRouter02.sol";
import "../../src/interfaces/ISwapRouterV1.sol";

contract MintableERC20 is ERC20 {
    uint8 private immutable _dec;

    constructor(string memory n, string memory s, uint8 d) ERC20(n, s) {
        _dec = d;
    }

    function decimals() public view override returns (uint8) {
        return _dec;
    }

    function mint(address to, uint256 amt) external {
        _mint(to, amt);
    }
}

contract MockWETH9 is ERC20 {
    constructor() ERC20("Wrapped Native", "WNATIVE") {}

    function deposit() external payable {
        _mint(msg.sender, msg.value);
    }

    function withdraw(uint256 amt) external {
        _burn(msg.sender, amt);
        (bool ok, ) = msg.sender.call{value: amt}("");
        require(ok, "withdraw failed");
    }
}

/// @dev Constant-rate swap. Pulls path[0] via transferFrom, sends path[last]
/// from its own pre-funded balance at `rateBps` (10000 = 1:1, token units aside).
contract MockV2Router is IUniswapV2Router {
    uint256 public rateBps;

    constructor(uint256 _rateBps) {
        rateBps = _rateBps;
    }

    function _out(uint256 amtIn) internal view returns (uint256) {
        return (amtIn * rateBps) / 10000;
    }

    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256
    ) external virtual override returns (uint256[] memory amounts) {
        MintableERC20(path[0]).transferFrom(msg.sender, address(this), amountIn);
        uint256 out = _out(amountIn);
        require(out >= amountOutMin, "V2 slippage");
        MintableERC20(path[path.length - 1]).transfer(to, out);
        amounts = new uint256[](2);
        amounts[0] = amountIn;
        amounts[1] = out;
    }

    function getAmountsOut(uint256 amountIn, address[] calldata path)
        external
        view
        override
        returns (uint256[] memory amounts)
    {
        amounts = new uint256[](path.length);
        amounts[0] = amountIn;
        amounts[path.length - 1] = _out(amountIn);
    }
}

/// @dev V2 mock that reports `out` in its return values but transfers 1 wei less,
/// to prove hop chaining forwards the actual balance delta, not the reported amount.
contract ShortPayV2Router is MockV2Router {
    constructor(uint256 _rateBps) MockV2Router(_rateBps) {}

    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256
    ) external override returns (uint256[] memory amounts) {
        MintableERC20(path[0]).transferFrom(msg.sender, address(this), amountIn);
        uint256 out = _out(amountIn);
        require(out >= amountOutMin, "V2 slippage");
        MintableERC20(path[path.length - 1]).transfer(to, out - 1);
        amounts = new uint256[](2);
        amounts[0] = amountIn;
        amounts[1] = out;
    }
}

/// @dev SwapRouter02-style mock (no deadline). Decodes tokenIn/out from single params.
contract MockV3Router02 is ISwapRouter02 {
    uint256 public rateBps;

    constructor(uint256 _rateBps) {
        rateBps = _rateBps;
    }

    function exactInputSingle(ExactInputSingleParams calldata p)
        external
        payable
        override
        returns (uint256 amountOut)
    {
        MintableERC20(p.tokenIn).transferFrom(msg.sender, address(this), p.amountIn);
        amountOut = (p.amountIn * rateBps) / 10000;
        require(amountOut >= p.amountOutMinimum, "V3 slippage");
        MintableERC20(p.tokenOut).transfer(p.recipient, amountOut);
    }

    function exactInput(ExactInputParams calldata p)
        external
        payable
        override
        returns (uint256 amountOut)
    {
        // Path = tokenIn(20) + fee(3) + tokenOut(20) for the 2-hop test case.
        address tokenIn = _firstToken(p.path);
        address tokenOut = _lastToken(p.path);
        MintableERC20(tokenIn).transferFrom(msg.sender, address(this), p.amountIn);
        amountOut = (p.amountIn * rateBps) / 10000;
        require(amountOut >= p.amountOutMinimum, "V3 slippage");
        MintableERC20(tokenOut).transfer(p.recipient, amountOut);
    }

    function _firstToken(bytes memory path) internal pure returns (address a) {
        assembly {
            a := shr(96, mload(add(path, 32)))
        }
    }

    function _lastToken(bytes memory path) internal pure returns (address a) {
        uint256 off = path.length - 20;
        assembly {
            a := shr(96, mload(add(add(path, 32), off)))
        }
    }
}
