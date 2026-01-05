import type { Address } from 'viem'

/**
 * Token information
 */
export interface Token {
    address: Address
    symbol: string
    name: string
    decimals: number
    chainId: number
    logo?: string
}

/**
 * Native token (ETH, KUB, etc.)
 */
export interface NativeToken extends Token {
    address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
    isNative: true
}

/**
 * ERC20 token
 */
export interface ERC20Token extends Token {
    address: Exclude<Address, '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'>
    isNative: false
}

/**
 * Token balance
 */
export interface TokenBalance {
    token: Token
    balance: bigint
    formattedBalance: string
}

/**
 * Token approval status
 */
export interface TokenApproval {
    token: Token
    spender: Address
    allowance: bigint
    needsApproval: boolean
}

/**
 * Token list by chain
 */
export interface TokenList {
    name: string
    logoURI?: string
    tokens: Token[]
}

/**
 * Custom token import
 */
export interface CustomToken {
    address: Address
    symbol?: string
    name?: string
    decimals?: number
    logoURI?: string
}

/**
 * Token search result
 */
export interface TokenSearchResult {
    token: Token
    balance?: bigint
    matchScore: number
}
