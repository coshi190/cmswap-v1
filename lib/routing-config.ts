import type { Address } from 'viem'
import type { IntermediaryConfig } from '@/types/routing'
import { kubTestnet, jbc } from './wagmi'

/**
 * Intermediary token addresses for multi-hop routing per chain
 */
export const INTERMEDIARY_TOKENS: Record<number, IntermediaryConfig> = {
    [kubTestnet.id]: {
        wrappedNative: '0x700D3ba307E1256e509eD3E45D6f9dff441d6907' as Address, // tKKUB
        stables: [],
        priority: ['0x700D3ba307E1256e509eD3E45D6f9dff441d6907' as Address], // tKKUB
    },
    [jbc.id]: {
        wrappedNative: '0xC4B7C87510675167643e3DE6EEeD4D2c06A9e747' as Address, // WJBC
        stables: [
            '0x24599b658b57f91E7643f4F154B16bcd2884f9ac' as Address, // JUSDT
            '0xFD8Ef75c1cB00A594D02df48ADdc27414Bd07F8a' as Address, // USDT
        ],
        priority: [
            '0x99999999990FC47611b74827486218f3398A4abD' as Address, // jibswap's wrapped native
            '0xC4B7C87510675167643e3DE6EEeD4D2c06A9e747' as Address, // WJBC
            '0x24599b658b57f91E7643f4F154B16bcd2884f9ac' as Address, // JUSDT
            '0xFD8Ef75c1cB00A594D02df48ADdc27414Bd07F8a' as Address, // USDT
        ],
    },
}

/**
 * Get intermediary tokens for a chain in priority order
 */
export function getIntermediaryTokens(chainId: number): Address[] {
    return INTERMEDIARY_TOKENS[chainId]?.priority ?? []
}

/**
 * Get wrapped native token for a chain
 */
export function getWrappedNativeForRouting(chainId: number): Address | null {
    return INTERMEDIARY_TOKENS[chainId]?.wrappedNative ?? null
}

/**
 * Check if a token is a valid intermediary for the given chain
 */
export function isValidIntermediary(chainId: number, tokenAddress: Address): boolean {
    const config = INTERMEDIARY_TOKENS[chainId]
    if (!config) return false
    return config.priority.some((addr) => addr.toLowerCase() === tokenAddress.toLowerCase())
}

/**
 * Maximum number of hops allowed (2 hops = 3 tokens in path)
 */
export const MAX_HOPS = 2

/**
 * Minimum improvement (in basis points) required to prefer multi-hop over direct
 * E.g., 50 = 0.5% better output required
 */
export const MIN_MULTIHOP_IMPROVEMENT_BPS = 50
