import type { Token } from '@/types/tokens'
import type { Address } from 'viem'
import { kubTestnet, isNativeToken } from './wagmi'

/**
 * KUB Testnet tokens
 */
export const KUB_TESTNET_TOKENS: Token[] = [
    {
        address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' as const,
        symbol: 'KUB',
        name: 'KUB',
        decimals: 18,
        chainId: kubTestnet.id,
        logo: 'https://cmswap.mypinata.cloud/ipfs/bafkreifelq2ktrxybwnkyabw7veqzec3p4v47aoco7acnzdwj34sn7q56u',
    },
    {
        address: '0x700D3ba307E1256e509eD3E45D6f9dff441d6907' as const,
        symbol: 'tKKUB',
        name: 'Test KKUB',
        decimals: 18,
        chainId: kubTestnet.id,
        logo: 'https://cmswap.mypinata.cloud/ipfs/bafkreifelq2ktrxybwnkyabw7veqzec3p4v47aoco7acnzdwj34sn7q56u',
    },
    {
        address: '0xE7f64C5fEFC61F85A8b851d8B16C4E21F91e60c0' as const,
        symbol: 'testKUB',
        name: 'Test KUB',
        decimals: 18,
        chainId: kubTestnet.id,
        logo: 'https://cmswap.mypinata.cloud/ipfs/bafkreihqaivu4woi3ibymi4w5lrgv6dnylnuasa4qjkpgqmm655et2lpia',
    },
    {
        address: '0x23352915164527e0AB53Ca5519aec5188aa224A2' as const,
        symbol: 'testToken',
        name: 'Test Token',
        decimals: 18,
        chainId: kubTestnet.id,
        logo: 'https://cmswap.mypinata.cloud/ipfs/bafkreiglz7dfa4xf6octr7aktdrb6oza6vvcf5t6n26onvg6gymnuhdose',
    },
]

/**
 * Token list by chain ID
 */
export const TOKEN_LISTS: Record<number, Token[]> = {
    [kubTestnet.id]: KUB_TESTNET_TOKENS,
}

/**
 * Get tokens for a specific chain
 */
export function getTokensForChain(chainId: number): Token[] {
    return TOKEN_LISTS[chainId] || []
}

/**
 * Find token by address on a specific chain
 */
export function findTokenByAddress(chainId: number, address: string): Token | undefined {
    const tokens = TOKEN_LISTS[chainId] || []
    // Handle native token
    if (isNativeToken(address as Address)) {
        return tokens.find((t) => t.address === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee')
    }
    return tokens.find((t) => t.address.toLowerCase() === address.toLowerCase())
}

/**
 * Search tokens by symbol or name
 */
export function searchTokens(chainId: number, query: string): Token[] {
    const tokens = TOKEN_LISTS[chainId] || []
    const lowerQuery = query.toLowerCase()

    return tokens.filter(
        (token) =>
            token.symbol.toLowerCase().includes(lowerQuery) ||
            token.name.toLowerCase().includes(lowerQuery) ||
            token.address.toLowerCase().includes(lowerQuery)
    )
}
