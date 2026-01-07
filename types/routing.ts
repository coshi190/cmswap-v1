import type { Address } from 'viem'
import type { Token } from './tokens'
import type { DEXType } from './dex'
import type { QuoteResult } from './swap'
import type { ProtocolType } from '@/lib/dex-config'

/**
 * Swap route representing a path through one or more pools
 */
export interface SwapRoute {
    /** Token addresses in order [tokenIn, ...intermediaries, tokenOut] */
    path: Address[]
    /** Fee tiers for V3 (length = path.length - 1) */
    fees?: number[]
    /** Pool addresses used (optional, for display) */
    pools?: Address[]
    /** True if path.length > 2 (has intermediary tokens) */
    isMultiHop: boolean
    /** Intermediary tokens used (for display) */
    intermediaryTokens: Token[]
}

/**
 * Route with quote information
 */
export interface RouteQuote {
    route: SwapRoute
    quote: QuoteResult
    dexId: DEXType
    protocolType: ProtocolType
    priceImpact?: number
}

/**
 * Result of route finding
 */
export interface RoutingResult {
    /** Direct A -> B route (if available) */
    directRoute: RouteQuote | null
    /** Multi-hop routes (A -> X -> B) */
    multiHopRoutes: RouteQuote[]
    /** Best overall route by output amount */
    bestRoute: RouteQuote | null
    /** All valid routes sorted by output */
    allRoutes: RouteQuote[]
}

/**
 * Intermediary token configuration per chain
 */
export interface IntermediaryConfig {
    /** Wrapped native token address */
    wrappedNative: Address
    /** Stablecoin addresses */
    stables: Address[]
    /** Priority order to try intermediaries */
    priority: Address[]
}
