import { encodeFunctionData, type Address, type Hex } from 'viem'
import { getSwapAddress } from '@/services/tokens'
import { isNativeToken } from '@/lib/wagmi'
import { UNISWAP_V2_ROUTER_ABI } from '@/lib/abis/uniswap-v2-router'

/**
 * Build swap path array for V2 router
 * V2 uses simple address[] path, no fee tiers
 *
 * @param wnative Optional DEX-specific wrapped native token address
 * Some DEXs (like jibswap) use their own wrapped native token instead of the chain's standard wrapped token
 */
export function buildSwapPath(
    tokenIn: Address,
    tokenOut: Address,
    chainId: number,
    wnative?: Address
): Address[] {
    const defaultSwapIn = getSwapAddress(tokenIn, chainId)
    const defaultSwapOut = getSwapAddress(tokenOut, chainId)

    // If DEX has custom wrapped native, use it for native tokens
    if (wnative) {
        const nativeIn = isNativeToken(tokenIn)
        const nativeOut = isNativeToken(tokenOut)
        return [nativeIn ? wnative : defaultSwapIn, nativeOut ? wnative : defaultSwapOut]
    }

    return [defaultSwapIn, defaultSwapOut]
}

/**
 * Build quote params for getAmountsOut call
 */
export function buildV2QuoteParams(
    tokenIn: Address,
    tokenOut: Address,
    amountIn: bigint,
    chainId: number,
    wnative?: Address
) {
    return {
        amountIn,
        path: buildSwapPath(tokenIn, tokenOut, chainId, wnative),
    }
}

/**
 * V2 Swap parameters interface
 */
export interface V2SwapParams {
    tokenIn: Address
    tokenOut: Address
    amountIn: bigint
    amountOutMinimum: bigint
    recipient: Address
    deadline: number
}

/**
 * Build swap params for Router02 swap functions
 */
export function buildV2SwapParams(params: V2SwapParams, chainId: number, wnative?: Address) {
    const path = buildSwapPath(params.tokenIn, params.tokenOut, chainId, wnative)
    return {
        amountIn: params.amountIn,
        amountOutMin: params.amountOutMinimum,
        path,
        to: params.recipient,
        deadline: BigInt(params.deadline),
    }
}

/**
 * Calculate minimum output with slippage
 * @param amountOut The expected output amount
 * @param slippageBasisPoints Slippage in basis points (100 = 1%)
 */
export function calculateMinOutput(amountOut: bigint, slippageBasisPoints: number): bigint {
    const slippageMultiplier = BigInt(10000 - slippageBasisPoints)
    return (amountOut * slippageMultiplier) / 10000n
}

/**
 * Calculate deadline timestamp
 * @param minutes Minutes from now
 */
export function calculateDeadline(minutes: number): number {
    return Math.floor(Date.now() / 1000) + minutes * 60
}

/**
 * Sort tokens for pair lookup (token0 < token1)
 */
export function sortTokens(tokenA: Address, tokenB: Address): [Address, Address] {
    const lowerA = tokenA.toLowerCase()
    const lowerB = tokenB.toLowerCase()
    return lowerA < lowerB ? [tokenA, tokenB] : [tokenB, tokenA]
}

/**
 * Encode swapExactTokensForTokens call
 */
export function encodeSwapExactTokensForTokens(params: {
    amountIn: bigint
    amountOutMin: bigint
    path: Address[]
    to: Address
    deadline: bigint
}): Hex {
    return encodeFunctionData({
        abi: UNISWAP_V2_ROUTER_ABI,
        functionName: 'swapExactTokensForTokens',
        args: [params.amountIn, params.amountOutMin, params.path, params.to, params.deadline],
    })
}

/**
 * Encode swapExactETHForTokens call (native -> token)
 */
export function encodeSwapExactETHForTokens(params: {
    amountOutMin: bigint
    path: Address[]
    to: Address
    deadline: bigint
}): Hex {
    return encodeFunctionData({
        abi: UNISWAP_V2_ROUTER_ABI,
        functionName: 'swapExactETHForTokens',
        args: [params.amountOutMin, params.path, params.to, params.deadline],
    })
}

/**
 * Encode swapExactTokensForETH call (token -> native)
 */
export function encodeSwapExactTokensForETH(params: {
    amountIn: bigint
    amountOutMin: bigint
    path: Address[]
    to: Address
    deadline: bigint
}): Hex {
    return encodeFunctionData({
        abi: UNISWAP_V2_ROUTER_ABI,
        functionName: 'swapExactTokensForETH',
        args: [params.amountIn, params.amountOutMin, params.path, params.to, params.deadline],
    })
}
