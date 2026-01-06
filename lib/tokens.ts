import type { Token } from '@/types/tokens'
import type { Address } from 'viem'
import { kubTestnet, jbc, isNativeToken } from './wagmi'

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
        name: 'Wrapped KUB',
        decimals: 18,
        chainId: kubTestnet.id,
        logo: 'https://cmswap.mypinata.cloud/ipfs/bafkreifelq2ktrxybwnkyabw7veqzec3p4v47aoco7acnzdwj34sn7q56u',
    },
    {
        address: '0xE7f64C5fEFC61F85A8b851d8B16C4E21F91e60c0' as const,
        symbol: 'testKUB',
        name: 'testKUB',
        decimals: 18,
        chainId: kubTestnet.id,
        logo: 'https://cmswap.mypinata.cloud/ipfs/bafkreihqaivu4woi3ibymi4w5lrgv6dnylnuasa4qjkpgqmm655et2lpia',
    },
    {
        address: '0x23352915164527e0AB53Ca5519aec5188aa224A2' as const,
        symbol: 'testToken',
        name: 'testToken',
        decimals: 18,
        chainId: kubTestnet.id,
        logo: 'https://cmswap.mypinata.cloud/ipfs/bafkreiglz7dfa4xf6octr7aktdrb6oza6vvcf5t6n26onvg6gymnuhdose',
    },
]

export const JB_CHAIN_TOKENS: Token[] = [
    {
        address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' as const,
        symbol: 'JBC',
        name: 'JBC',
        decimals: 18,
        chainId: jbc.id,
        logo: 'https://cmswap.mypinata.cloud/ipfs/bafkreihej2whwsw4p57ayfqxhwijnpmgxtnwhngh5f5pxpvxw73s636hzy',
    },
    {
        address: '0xC4B7C87510675167643e3DE6EEeD4D2c06A9e747' as const,
        symbol: 'WJBC',
        name: 'WJBC',
        decimals: 18,
        chainId: jbc.id,
        logo: 'https://cmswap.mypinata.cloud/ipfs/bafkreihej2whwsw4p57ayfqxhwijnpmgxtnwhngh5f5pxpvxw73s636hzy',
    },
    {
        address: '0x24599b658b57f91E7643f4F154B16bcd2884f9ac' as const,
        symbol: 'JUSDT',
        name: 'JUSDT',
        decimals: 18,
        chainId: jbc.id,
        logo: 'https://gateway.pinata.cloud/ipfs/bafkreif3vllg6mwswlqypqgtsh7i7wwap7zgrkvtlhdjoc63zjm7uv6vvi',
    },
    {
        address: '0xFD8Ef75c1cB00A594D02df48ADdc27414Bd07F8a' as const,
        symbol: 'USDT',
        name: 'USDT',
        decimals: 18,
        chainId: jbc.id,
        logo: 'https://jibswap.com/images/tokens/USDT.png',
    },
    {
        address: '0xE67E280f5a354B4AcA15fA7f0ccbF667CF74F97b' as const,
        symbol: 'CMJ',
        name: 'CMJ',
        decimals: 18,
        chainId: jbc.id,
        logo: 'https://gateway.pinata.cloud/ipfs/bafkreiabbtn5pc6di4nwfgpqkk3ss6njgzkt2evilc5i2r754pgiru5x4u',
    },
    {
        address: '0x7414e2D8Fb8466AfA4F85A240c57CB8615901FFB' as const,
        symbol: 'DoiJIB',
        name: 'DoiJIB',
        decimals: 18,
        chainId: jbc.id,
        logo: 'https://gateway.pinata.cloud/ipfs/bafybeicfkse4uvkhhkrhfwtap4h3v5msef6lg3t3xvb2hspw3xd5wegzfi',
    },
    {
        address: '0x8fcC6e3a23a0255057bfD9A97799b3a995Bf3D24' as const,
        symbol: 'BB',
        name: 'BB',
        decimals: 18,
        chainId: jbc.id,
        logo: 'https://daobuddy.xyz/img/commuDao/token/BB.png',
    },
]

/**
 * Token list by chain ID
 */
export const TOKEN_LISTS: Record<number, Token[]> = {
    [kubTestnet.id]: KUB_TESTNET_TOKENS,
    [jbc.id]: JB_CHAIN_TOKENS,
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
