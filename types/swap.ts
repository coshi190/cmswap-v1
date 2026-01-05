import type { Address } from 'viem'

/**
 * Swap parameters for executing a swap
 */
export interface SwapParams {
    tokenIn: Address
    tokenOut: Address
    amountIn: bigint
    amountOutMinimum: bigint
    recipient: Address
    slippageTolerance: number // in basis points (100 = 1%, 500 = 5%)
    deadline: number // Unix timestamp in seconds
}

/**
 * Quote result from Quoter contract
 */
export interface QuoteResult {
    amountOut: bigint
    sqrtPriceX96After: bigint
    initializedTicksCrossed: number
    gasEstimate: bigint
}

/**
 * Swap execution result
 */
export interface SwapResult {
    hash: Address
    amountOut: bigint
    status: 'pending' | 'success' | 'error'
    error?: string
}

/**
 * Pool information
 */
export interface PoolInfo {
    address: Address
    token0: Address
    token1: Address
    fee: number
    liquidity: bigint
    sqrtPriceX96: bigint
    tick: number
}

/**
 * Token pair for swap
 */
export interface TokenPair {
    tokenIn: Token
    tokenOut: Token
}

/**
 * Slippage tolerance preset
 */
export type SlippagePreset = '0.1' | '0.5' | '1' | 'custom'

/**
 * Swap settings
 */
export interface SwapSettings {
    slippage: number // in percentage (0.1, 0.5, 1, etc.)
    slippagePreset: SlippagePreset
    deadlineMinutes: number
    expertMode: boolean
}

/**
 * Swap state for UI
 */
export interface SwapState {
    tokenIn: Token | null
    tokenOut: Token | null
    amountIn: string
    amountOut: string
    quote: QuoteResult | null
    isLoading: boolean
    error: string | null
}

// Import Token type from tokens.ts
import type { Token } from './tokens'
