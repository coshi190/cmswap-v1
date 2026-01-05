import type { Token } from '@/types/tokens'
import type { SwapUrlParams, ParsedSwapUrlParams } from '@/types/swap'
import type { Address } from 'viem'
import { findTokenByAddress } from './tokens'
import { isNativeToken } from './wagmi'
import { isValidTokenAddress } from '@/services/tokens'

/**
 * Parse URL search params into SwapUrlParams
 */
export function parseSwapSearchParams(searchParams: URLSearchParams): SwapUrlParams {
    return {
        input: searchParams.get('input') || undefined,
        output: searchParams.get('output') || undefined,
        amount: searchParams.get('amount') || undefined,
    }
}

/**
 * Build URLSearchParams from swap parameters
 */
export function buildSwapSearchParams(params: SwapUrlParams): URLSearchParams {
    const searchParams = new URLSearchParams()

    if (params.input) searchParams.set('input', params.input)
    if (params.output) searchParams.set('output', params.output)
    if (params.amount) searchParams.set('amount', params.amount)

    return searchParams
}

/**
 * Validate and resolve token address to Token object
 */
export function resolveTokenFromAddress(
    chainId: number,
    address: string | undefined
): Token | null {
    if (!address) return null

    // Validate address format
    if (!isValidTokenAddress(address)) {
        return null
    }

    // Handle native token
    if (isNativeToken(address as Address)) {
        return findTokenByAddress(chainId, '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') || null
    }

    // Find in token list
    return findTokenByAddress(chainId, address) || null
}

/**
 * Validate amount string
 */
export function validateAmountString(amount: string | undefined): string {
    if (!amount) return ''

    const trimmed = amount.trim()
    if (!trimmed) return ''

    return trimmed
}

/**
 * Parse and validate all URL parameters
 */
export function parseAndValidateSwapParams(
    chainId: number,
    urlParams: SwapUrlParams
): ParsedSwapUrlParams {
    const errors: string[] = []

    // Resolve tokens
    const tokenIn = resolveTokenFromAddress(chainId, urlParams.input)
    const tokenOut = resolveTokenFromAddress(chainId, urlParams.output)

    // Validate amount
    const amountIn = validateAmountString(urlParams.amount)

    // Collect errors for invalid tokens (but still allow partial state)
    if (urlParams.input && !tokenIn) {
        errors.push(`Input token address "${urlParams.input}" not found`)
    }
    if (urlParams.output && !tokenOut) {
        errors.push(`Output token address "${urlParams.output}" not found`)
    }

    // Check for same tokens
    if (tokenIn && tokenOut && tokenIn.address === tokenOut.address) {
        errors.push('Input and output tokens cannot be the same')
    }

    return {
        tokenIn,
        tokenOut,
        amountIn,
        isValid: errors.length === 0,
        errors,
    }
}
