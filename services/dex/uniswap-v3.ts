import { encodeFunctionData, concat, pad, toHex, type Address, type Hex } from 'viem'
import type { SwapParams } from '@/types/swap'
import { getV3Config, COMMON_FEE_TIERS, DEFAULT_FEE_TIER } from '@/lib/dex-config'
import { getSwapAddress } from '@/services/tokens'
import { UNISWAP_V3_SWAP_ROUTER_ABI } from '@/lib/abis/uniswap-v3-swap-router'

/**
 * Uniswap V3 Router uses address(2) as ADDRESS_THIS placeholder for multicall
 * When used as recipient, tells the router to keep tokens in itself for subsequent operations
 */
export const ADDRESS_THIS = '0x0000000000000000000000000000000000000002' as Address

/**
 * Get pool address from factory
 * Returns the pool address for a token pair with a specific fee tier
 */
export async function getPoolAddress(
    chainId: number,
    factoryAddress: Address,
    tokenA: Address,
    tokenB: Address,
    _fee: number = DEFAULT_FEE_TIER
): Promise<Address> {
    const config = getV3Config(chainId)
    if (!config) {
        throw new Error(`No DEX config found for chain ${chainId}`)
    }

    // This would typically use useReadContract or a direct RPC call
    // For now, returning a placeholder - the actual implementation would call the factory contract
    throw new Error('getPoolAddress: Use useReadContract with Factory ABI in a hook')
}

/**
 * Find the best pool for a token pair by trying common fee tiers
 * Returns the pool address and fee tier of the pool with liquidity
 */
export async function findBestPool(
    chainId: number,
    tokenA: Address,
    tokenB: Address
): Promise<{ address: Address; fee: number } | null> {
    const config = getV3Config(chainId)
    if (!config) {
        throw new Error(`No DEX config found for chain ${chainId}`)
    }

    // Try each fee tier to find a pool with liquidity
    for (const fee of COMMON_FEE_TIERS) {
        try {
            // This would use useReadContract to check if pool exists and has liquidity
            // For now, returning a placeholder
            const poolAddress = await getPoolAddress(chainId, config.factory, tokenA, tokenB, fee)
            // Check if pool has liquidity > 0
            // Return the first pool found
            return { address: poolAddress, fee }
        } catch {
            continue
        }
    }

    return null
}

/**
 * Get a quote from QuoterV2 contract
 * This should be called from a hook using useReadContract
 */
export function buildQuoteParams(
    tokenIn: Address,
    tokenOut: Address,
    amountIn: bigint,
    fee: number = DEFAULT_FEE_TIER,
    chainId?: number
) {
    return {
        tokenIn: chainId ? getSwapAddress(tokenIn, chainId) : tokenIn,
        tokenOut: chainId ? getSwapAddress(tokenOut, chainId) : tokenOut,
        amountIn,
        fee,
        sqrtPriceLimitX96: 0n, // 0 = no limit
    }
}

/**
 * Build swap parameters for exactInputSingle
 */
export function buildSwapParams(
    params: SwapParams,
    fee: number = DEFAULT_FEE_TIER,
    chainId?: number
) {
    return {
        tokenIn: chainId ? getSwapAddress(params.tokenIn, chainId) : params.tokenIn,
        tokenOut: chainId ? getSwapAddress(params.tokenOut, chainId) : params.tokenOut,
        fee,
        recipient: params.recipient,
        amountIn: params.amountIn,
        amountOutMinimum: params.amountOutMinimum,
        sqrtPriceLimitX96: 0n, // 0 = no limit
    }
}

/**
 * Calculate minimum output amount based on slippage tolerance
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
 * Convert percentage to basis points
 * @param percentage Percentage value (e.g., 0.5 for 0.5%)
 */
export function percentageToBasisPoints(percentage: number): number {
    return Math.floor(percentage * 100)
}

/**
 * Convert basis points to percentage
 * @param basisPoints Basis points (e.g., 50 for 0.5%)
 */
export function basisPointsToPercentage(basisPoints: number): number {
    return basisPoints / 100
}

/**
 * Sort tokens for pool lookup (token0 < token1)
 */
export function sortTokens(tokenA: Address, tokenB: Address): [Address, Address] {
    const lowerA = tokenA.toLowerCase()
    const lowerB = tokenB.toLowerCase()
    return lowerA < lowerB ? [tokenA, tokenB] : [tokenB, tokenA]
}

/**
 * Calculate price impact from quote results
 * This is a simplified calculation - a more accurate one would require pool state
 */
export function calculatePriceImpact(
    _amountIn: bigint,
    _amountOut: bigint,
    _poolPrice?: bigint
): number | undefined {
    // Price impact calculation would require more data from the pool
    // For now, returning undefined
    return undefined
}

/**
 * Encode exactInputSingle call for multicall
 */
export function encodeExactInputSingle(params: {
    tokenIn: Address
    tokenOut: Address
    fee: number
    recipient: Address
    amountIn: bigint
    amountOutMinimum: bigint
    sqrtPriceLimitX96: bigint
}): Hex {
    return encodeFunctionData({
        abi: UNISWAP_V3_SWAP_ROUTER_ABI,
        functionName: 'exactInputSingle',
        args: [params],
    })
}

/**
 * Encode unwrapWETH9 call for multicall
 */
export function encodeUnwrapWETH9(amountMinimum: bigint, recipient: Address): Hex {
    return encodeFunctionData({
        abi: UNISWAP_V3_SWAP_ROUTER_ABI,
        functionName: 'unwrapWETH9',
        args: [amountMinimum, recipient],
    })
}

/**
 * Build multicall data for swapping to native token
 * Returns array of encoded calls: [exactInputSingle, unwrapWETH9]
 */
export function buildMulticallSwapToNative(
    params: SwapParams,
    fee: number,
    chainId: number
): Hex[] {
    const tokenIn = getSwapAddress(params.tokenIn, chainId)
    const tokenOut = getSwapAddress(params.tokenOut, chainId)

    // Step 1: exactInputSingle with recipient = ADDRESS_THIS (router holds wrapped token)
    const swapCall = encodeExactInputSingle({
        tokenIn,
        tokenOut,
        fee,
        recipient: ADDRESS_THIS,
        amountIn: params.amountIn,
        amountOutMinimum: params.amountOutMinimum,
        sqrtPriceLimitX96: 0n,
    })

    // Step 2: unwrapWETH9 to send native token to actual recipient
    const unwrapCall = encodeUnwrapWETH9(params.amountOutMinimum, params.recipient)

    return [swapCall, unwrapCall]
}

// ============================================================================
// Multi-Hop Routing Functions
// ============================================================================

/**
 * Encode a multi-hop path for V3 exactInput/exactOutput
 * Path format: tokenA (20 bytes) + fee1 (3 bytes) + tokenB (20 bytes) + fee2 (3 bytes) + tokenC (20 bytes)
 *
 * @param tokens Array of token addresses in swap order
 * @param fees Array of fee tiers (length = tokens.length - 1)
 */
export function encodeV3Path(tokens: Address[], fees: number[]): Hex {
    if (tokens.length < 2) throw new Error('Path must have at least 2 tokens')
    if (fees.length !== tokens.length - 1) throw new Error('Fees length must be tokens.length - 1')

    const parts: Hex[] = []

    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i]
        if (!token) throw new Error(`Token at index ${i} is undefined`)

        // Add token address (20 bytes)
        parts.push(token.toLowerCase() as Hex)

        // Add fee tier if not the last token (3 bytes = 24 bits)
        if (i < fees.length) {
            const fee = fees[i]
            if (fee === undefined) throw new Error(`Fee at index ${i} is undefined`)
            const feeHex = pad(toHex(fee), { size: 3 })
            parts.push(feeHex)
        }
    }

    return concat(parts)
}

/**
 * Build quote parameters for multi-hop exactInput
 */
export function buildMultiHopQuoteParams(
    tokens: Address[],
    fees: number[],
    amountIn: bigint,
    chainId: number
) {
    const swapTokens = tokens.map((t) => getSwapAddress(t, chainId))
    return {
        path: encodeV3Path(swapTokens, fees),
        amountIn,
    }
}

/**
 * Build swap parameters for multi-hop exactInput
 */
export function buildMultiHopSwapParams(
    tokens: Address[],
    fees: number[],
    amountIn: bigint,
    amountOutMinimum: bigint,
    recipient: Address,
    chainId: number
) {
    const swapTokens = tokens.map((t) => getSwapAddress(t, chainId))
    return {
        path: encodeV3Path(swapTokens, fees),
        recipient,
        amountIn,
        amountOutMinimum,
    }
}

/**
 * Encode exactInput call for multicall (multi-hop)
 */
export function encodeExactInput(params: {
    path: Hex
    recipient: Address
    amountIn: bigint
    amountOutMinimum: bigint
}): Hex {
    return encodeFunctionData({
        abi: UNISWAP_V3_SWAP_ROUTER_ABI,
        functionName: 'exactInput',
        args: [params],
    })
}

/**
 * Build multicall data for multi-hop swap to native token
 * Returns array of encoded calls: [exactInput, unwrapWETH9]
 */
export function buildMulticallMultiHopSwapToNative(
    tokens: Address[],
    fees: number[],
    amountIn: bigint,
    amountOutMinimum: bigint,
    recipient: Address,
    chainId: number
): Hex[] {
    const swapTokens = tokens.map((t) => getSwapAddress(t, chainId))

    // Step 1: exactInput with recipient = ADDRESS_THIS
    const swapCall = encodeExactInput({
        path: encodeV3Path(swapTokens, fees),
        recipient: ADDRESS_THIS,
        amountIn,
        amountOutMinimum,
    })

    // Step 2: unwrapWETH9 to send native token to actual recipient
    const unwrapCall = encodeUnwrapWETH9(amountOutMinimum, recipient)

    return [swapCall, unwrapCall]
}
