import type { Address } from 'viem'
import type { Token } from '@/types/tokens'
import { ERC20_ABI } from '@/lib/abis/erc20'
import { isNativeToken } from '@/lib/wagmi'

/**
 * Get native token balance
 * This should be called from a hook using useBalance from wagmi
 */
export function getNativeBalanceQuery(address: Address, chainId: number) {
    return {
        address,
        chainId,
        queryKey: ['balance', chainId, address, 'native'],
    }
}

/**
 * Get ERC20 token balance
 * This should be called from a hook using useReadContract from wagmi
 */
export function getTokenBalanceQuery(
    tokenAddress: Address,
    ownerAddress: Address,
    chainId: number
) {
    return {
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'balanceOf' as const,
        args: [ownerAddress],
        chainId,
        queryKey: ['balance', chainId, ownerAddress, tokenAddress],
    }
}

/**
 * Get token allowance
 * This should be called from a hook using useReadContract from wagmi
 */
export function getTokenAllowanceQuery(
    tokenAddress: Address,
    ownerAddress: Address,
    spenderAddress: Address,
    chainId: number
) {
    return {
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'allowance' as const,
        args: [ownerAddress, spenderAddress],
        chainId,
        queryKey: ['allowance', chainId, ownerAddress, tokenAddress, spenderAddress],
    }
}

/**
 * Build approve transaction parameters
 */
export function buildApproveParams(tokenAddress: Address, spenderAddress: Address, amount: bigint) {
    return {
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'approve' as const,
        args: [spenderAddress, amount] as const,
    }
}

/**
 * Build infinite approval parameters (use max uint256)
 */
export function buildInfiniteApprovalParams(tokenAddress: Address, spenderAddress: Address) {
    return buildApproveParams(tokenAddress, spenderAddress, getMaxUint256())
}

/**
 * Get max uint256 value for infinite approvals
 */
export function getMaxUint256(): bigint {
    return 2n ** 256n - 1n
}

/**
 * Check if token needs approval based on allowance
 */
export function needsApproval(allowance: bigint, requiredAmount: bigint): boolean {
    return allowance < requiredAmount
}

/**
 * Format token amount to human-readable string
 */
export function formatTokenAmount(amount: bigint, decimals: number): string {
    const divisor = BigInt(10 ** decimals)
    const whole = amount / divisor
    const fraction = amount % divisor

    if (fraction === 0n) {
        return whole.toString()
    }

    // Pad fraction to correct decimal places
    const fractionStr = fraction.toString().padStart(decimals, '0')
    // Remove trailing zeros
    const trimmed = fractionStr.replace(/0+$/, '')

    return `${whole}.${trimmed}`
}

/**
 * Format token balance for UI display with smart notation
 * - Very small numbers (< 0.000001): Show up to 8 significant digits
 * - Small numbers (< 1): Max 6 decimals
 * - Medium numbers (< 1000): Max 4 decimals
 * - Large numbers (≥ 1000): Use K/M/B notation with 2 decimals
 */
export function formatBalance(amount: bigint, decimals: number): string {
    const valueStr = formatTokenAmount(amount, decimals)
    const value = parseFloat(valueStr)

    // Handle zero
    if (value === 0) return '0'

    // Very small positive numbers - show significant digits
    if (value > 0 && value < 0.000001) {
        // Keep leading zeros and show up to 8 significant digits
        const match = valueStr.match(/^0\.0*/)
        const leadingZeros = match ? match[0].length - 2 : 0
        const significant = valueStr.replace(/^0\.0*/, '').slice(0, 8)
        return `0.${'0'.repeat(leadingZeros)}${significant}`
    }

    // Small numbers - max 6 decimals
    if (value < 1) {
        return value.toFixed(6).replace(/\.?0+$/, '')
    }

    // Medium numbers - max 4 decimals
    if (value < 1000) {
        return value.toFixed(4).replace(/\.?0+$/, '')
    }

    // Large numbers - use K/M/B notation
    if (value >= 1000000000) {
        return `${(value / 1000000000).toFixed(2)}B`.replace(/\.?0+$/, '')
    }
    if (value >= 1000000) {
        return `${(value / 1000000).toFixed(2)}M`.replace(/\.?0+$/, '')
    }
    if (value >= 1000) {
        return `${(value / 1000).toFixed(2)}K`.replace(/\.?0+$/, '')
    }

    return value.toFixed(2).replace(/\.?0+$/, '')
}

/**
 * Parse human-readable token amount to bigint
 */
export function parseTokenAmount(amount: string, decimals: number): bigint {
    const [whole = '0', fraction = '0'] = amount.split('.')
    const wholePart = BigInt(whole)
    const fractionPart = BigInt(fraction.padEnd(decimals, '0').slice(0, decimals))

    return wholePart * BigInt(10 ** decimals) + fractionPart
}

/**
 * Get token info (symbol, name, decimals)
 * This should be called from hooks using useReadContract
 */
export function getTokenSymbolQuery(tokenAddress: Address, chainId: number) {
    return {
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'symbol' as const,
        chainId,
        queryKey: ['token', 'symbol', chainId, tokenAddress],
    }
}

export function getTokenNameQuery(tokenAddress: Address, chainId: number) {
    return {
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'name' as const,
        chainId,
        queryKey: ['token', 'name', chainId, tokenAddress],
    }
}

export function getTokenDecimalsQuery(tokenAddress: Address, chainId: number) {
    return {
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'decimals' as const,
        chainId,
        queryKey: ['token', 'decimals', chainId, tokenAddress],
    }
}

/**
 * Check if address is a valid token address
 */
export function isValidTokenAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address)
}

/**
 * Get wrapped native token address for a chain
 */
export function getWrappedNativeAddress(chainId: number): Address {
    // Common wrapped native addresses
    const wrappedAddresses: Partial<Record<number, Address>> = {
        // KUB Testnet - tkKUB (wrapped KUB)
        25925: '0x700D3ba307E1256e509eD3E45D6f9dff441d6907' as Address,
    }

    const address = wrappedAddresses[chainId]
    if (!address) {
        throw new Error(`No wrapped native token address configured for chain ${chainId}`)
    }
    return address
}

/**
 * Get the address to use for DEX operations
 * Returns wrapped address for native tokens, original address otherwise
 */
export function getSwapAddress(tokenAddress: Address, chainId: number): Address {
    if (isNativeToken(tokenAddress)) {
        return getWrappedNativeAddress(chainId)
    }
    return tokenAddress
}

/**
 * Check if two tokens are the same (accounts for native → wrapped conversion)
 */
export function isSameToken(tokenA: Token | null, tokenB: Token | null): boolean {
    if (!tokenA || !tokenB) return false
    if (tokenA.chainId !== tokenB.chainId) return false

    // Native-wrapped pairs should be considered different for wrap/unwrap operations
    if (isNativeWrappedPair(tokenA, tokenB)) return false

    // Compare using swap addresses (handles native → wrapped conversion)
    const addressA = getSwapAddress(tokenA.address as Address, tokenA.chainId)
    const addressB = getSwapAddress(tokenB.address as Address, tokenB.chainId)

    return addressA.toLowerCase() === addressB.toLowerCase()
}

/**
 * Check if two tokens form a native-wrapped pair
 */
export function isNativeWrappedPair(tokenA: Token | null, tokenB: Token | null): boolean {
    if (!tokenA || !tokenB) return false
    if (tokenA.chainId !== tokenB.chainId) return false

    const isANative = isNativeToken(tokenA.address as Address)
    const isBNative = isNativeToken(tokenB.address as Address)

    // Both native or both wrapped - not a native-wrapped pair
    if (isANative && isBNative) return false
    if (!isANative && !isBNative) return false

    // One is native, check if the other is the wrapped version
    const wrappedAddress = getWrappedNativeAddress(tokenA.chainId)
    const nonNativeAddress = isANative ? tokenB.address : tokenA.address

    return nonNativeAddress.toLowerCase() === wrappedAddress.toLowerCase()
}

/**
 * Determine wrap/unwrap operation type
 */
export function getWrapOperation(
    tokenIn: Token | null,
    tokenOut: Token | null
): 'wrap' | 'unwrap' | null {
    if (!isNativeWrappedPair(tokenIn, tokenOut)) return null

    const isInputNative = isNativeToken(tokenIn?.address as Address)
    return isInputNative ? 'wrap' : 'unwrap'
}
