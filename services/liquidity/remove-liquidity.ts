import { encodeFunctionData, type Address, type Hex } from 'viem'
import type {
    RemoveLiquidityParams,
    CollectFeesParams,
    DecreaseLiquidityCallParams,
    CollectCallParams,
    PositionWithTokens,
} from '@/types/earn'
import { MAX_UINT128 } from '@/types/earn'
import { NONFUNGIBLE_POSITION_MANAGER_ABI } from '@/lib/abis/nonfungible-position-manager'
import {
    calculateDeadline,
    calculateMinAmounts,
    getAmountsForLiquidity,
} from '@/lib/liquidity-helpers'
import { getWrappedNativeAddress } from '@/services/tokens'
import { shouldSkipUnwrap } from '@/lib/wagmi'

/**
 * Build decrease liquidity parameters
 */
export function buildDecreaseLiquidityParams(
    params: RemoveLiquidityParams
): DecreaseLiquidityCallParams {
    return {
        tokenId: params.tokenId,
        liquidity: params.liquidity,
        amount0Min: params.amount0Min,
        amount1Min: params.amount1Min,
        deadline: calculateDeadline(params.deadline),
    }
}

/**
 * Build collect parameters
 */
export function buildCollectParams(params: CollectFeesParams): CollectCallParams {
    return {
        tokenId: params.tokenId,
        recipient: params.recipient,
        amount0Max: params.amount0Max,
        amount1Max: params.amount1Max,
    }
}

/**
 * Encode decreaseLiquidity function call
 */
export function encodeDecreaseLiquidity(params: DecreaseLiquidityCallParams): Hex {
    return encodeFunctionData({
        abi: NONFUNGIBLE_POSITION_MANAGER_ABI,
        functionName: 'decreaseLiquidity',
        args: [params],
    })
}

/**
 * Encode collect function call
 */
export function encodeCollect(params: CollectCallParams): Hex {
    return encodeFunctionData({
        abi: NONFUNGIBLE_POSITION_MANAGER_ABI,
        functionName: 'collect',
        args: [params],
    })
}

/**
 * Encode unwrapWETH9 function call
 */
export function encodeUnwrapWETH9(amountMinimum: bigint, recipient: Address): Hex {
    return encodeFunctionData({
        abi: NONFUNGIBLE_POSITION_MANAGER_ABI,
        functionName: 'unwrapWETH9',
        args: [amountMinimum, recipient],
    })
}

/**
 * Encode sweepToken function call (for leftover tokens)
 */
export function encodeSweepToken(token: Address, amountMinimum: bigint, recipient: Address): Hex {
    return encodeFunctionData({
        abi: NONFUNGIBLE_POSITION_MANAGER_ABI,
        functionName: 'sweepToken',
        args: [token, amountMinimum, recipient],
    })
}

/**
 * Encode burn function call
 */
export function encodeBurn(tokenId: bigint): Hex {
    return encodeFunctionData({
        abi: NONFUNGIBLE_POSITION_MANAGER_ABI,
        functionName: 'burn',
        args: [tokenId],
    })
}

/**
 * Build multicall for removing liquidity and collecting tokens
 * Sequence:
 * 1. decreaseLiquidity - removes liquidity, tokens stay in position manager
 * 2. collect - collect tokens to recipient (or address(this) if unwrapping)
 * 3. unwrapWETH9 - if one token is native, unwrap to native
 * 4. sweepToken - sweep remaining non-native token
 */
export function buildRemoveWithCollectMulticall(
    decreaseParams: RemoveLiquidityParams,
    recipient: Address,
    token0Address: Address,
    token1Address: Address,
    chainId: number
): Hex[] {
    const data: Hex[] = []

    // 1. Decrease liquidity
    const decreaseCallParams = buildDecreaseLiquidityParams(decreaseParams)
    data.push(encodeDecreaseLiquidity(decreaseCallParams))

    // Check if either token is native (wrapped)
    const wrappedNative = getWrappedNativeAddress(chainId)
    const token0IsWrappedNative = token0Address.toLowerCase() === wrappedNative.toLowerCase()
    const token1IsWrappedNative = token1Address.toLowerCase() === wrappedNative.toLowerCase()
    const hasWrappedNative = token0IsWrappedNative || token1IsWrappedNative

    // Check if we should skip unwrapping for this chain (KUB Mainnet has KYC on unwrap)
    const skipUnwrap = shouldSkipUnwrap(chainId)

    if (hasWrappedNative && !skipUnwrap) {
        // Standard behavior: unwrap to native token for most chains
        // Use address(0) as recipient for collect, then unwrap and sweep
        const collectParams: CollectCallParams = {
            tokenId: decreaseParams.tokenId,
            recipient: '0x0000000000000000000000000000000000000000' as Address, // collect to position manager
            amount0Max: MAX_UINT128,
            amount1Max: MAX_UINT128,
        }
        data.push(encodeCollect(collectParams))

        // Unwrap the wrapped native token
        const unwrapAmount = token0IsWrappedNative
            ? decreaseParams.amount0Min
            : decreaseParams.amount1Min
        data.push(encodeUnwrapWETH9(unwrapAmount, recipient))

        // Sweep the other token
        const sweepToken = token0IsWrappedNative ? token1Address : token0Address
        const sweepAmount = token0IsWrappedNative
            ? decreaseParams.amount1Min
            : decreaseParams.amount0Min
        data.push(encodeSweepToken(sweepToken, sweepAmount, recipient))
    } else {
        // For KUB Mainnet (skipUnwrap=true) or non-native tokens:
        // Collect wrapped tokens directly to recipient (no unwrapping)
        const collectParams: CollectCallParams = {
            tokenId: decreaseParams.tokenId,
            recipient,
            amount0Max: MAX_UINT128,
            amount1Max: MAX_UINT128,
        }
        data.push(encodeCollect(collectParams))
    }

    return data
}

/**
 * Calculate removal amounts based on percentage
 * @param position The position to calculate amounts for
 * @param percentage Percentage to remove (0-100)
 * @param sqrtPriceX96 Current pool price
 * @param slippageBps Slippage tolerance in basis points
 */
export function calculateRemovalAmounts(
    position: PositionWithTokens,
    percentage: number,
    sqrtPriceX96: bigint,
    slippageBps: number
): {
    liquidity: bigint
    amount0Expected: bigint
    amount1Expected: bigint
    amount0Min: bigint
    amount1Min: bigint
} {
    // Calculate liquidity to remove
    const liquidityToRemove = (position.liquidity * BigInt(percentage)) / 100n

    // Calculate expected amounts
    const sqrtPriceAX96 = tickToSqrtPriceX96(position.tickLower)
    const sqrtPriceBX96 = tickToSqrtPriceX96(position.tickUpper)
    const { amount0, amount1 } = getAmountsForLiquidity(
        sqrtPriceX96,
        sqrtPriceAX96,
        sqrtPriceBX96,
        liquidityToRemove
    )

    // Apply slippage
    const { amount0Min, amount1Min } = calculateMinAmounts(amount0, amount1, slippageBps)

    return {
        liquidity: liquidityToRemove,
        amount0Expected: amount0,
        amount1Expected: amount1,
        amount0Min,
        amount1Min,
    }
}

// Import needed for calculateRemovalAmounts
import { tickToSqrtPriceX96 } from '@/lib/liquidity-helpers'

/**
 * Check if position can be burned (liquidity and fees are zero)
 */
export function canBurnPosition(position: PositionWithTokens): boolean {
    return position.liquidity === 0n && position.tokensOwed0 === 0n && position.tokensOwed1 === 0n
}

/**
 * Build remove all liquidity and burn position multicall
 * Used when removing 100% liquidity and wanting to close the position
 */
export function buildRemoveAllAndBurnMulticall(
    tokenId: bigint,
    liquidity: bigint,
    amount0Min: bigint,
    amount1Min: bigint,
    recipient: Address,
    token0Address: Address,
    token1Address: Address,
    deadlineMinutes: number,
    chainId: number
): Hex[] {
    const data: Hex[] = []

    // 1. Decrease all liquidity
    const decreaseParams: DecreaseLiquidityCallParams = {
        tokenId,
        liquidity,
        amount0Min,
        amount1Min,
        deadline: calculateDeadline(deadlineMinutes),
    }
    data.push(encodeDecreaseLiquidity(decreaseParams))

    // 2-4. Collect with proper unwrapping (same as remove)
    const wrappedNative = getWrappedNativeAddress(chainId)
    const token0IsWrappedNative = token0Address.toLowerCase() === wrappedNative.toLowerCase()
    const token1IsWrappedNative = token1Address.toLowerCase() === wrappedNative.toLowerCase()
    const hasWrappedNative = token0IsWrappedNative || token1IsWrappedNative

    // Check if we should skip unwrapping for this chain (KUB Mainnet has KYC on unwrap)
    const skipUnwrap = shouldSkipUnwrap(chainId)

    if (hasWrappedNative && !skipUnwrap) {
        const collectParams: CollectCallParams = {
            tokenId,
            recipient: '0x0000000000000000000000000000000000000000' as Address,
            amount0Max: MAX_UINT128,
            amount1Max: MAX_UINT128,
        }
        data.push(encodeCollect(collectParams))

        const unwrapAmount = token0IsWrappedNative ? amount0Min : amount1Min
        data.push(encodeUnwrapWETH9(unwrapAmount, recipient))

        const sweepToken = token0IsWrappedNative ? token1Address : token0Address
        const sweepAmount = token0IsWrappedNative ? amount1Min : amount0Min
        data.push(encodeSweepToken(sweepToken, sweepAmount, recipient))
    } else {
        // For KUB Mainnet (skipUnwrap=true) or non-native tokens:
        // Collect wrapped tokens directly to recipient (no unwrapping)
        const collectParams: CollectCallParams = {
            tokenId,
            recipient,
            amount0Max: MAX_UINT128,
            amount1Max: MAX_UINT128,
        }
        data.push(encodeCollect(collectParams))
    }

    // 5. Burn the position NFT (optional, can fail if not empty)
    // Note: Only add burn if we're sure liquidity and fees will be zero
    // data.push(encodeBurn(tokenId))

    return data
}
