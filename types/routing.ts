import type { Address } from 'viem'
import { type Token, type DEXType, type ProtocolType } from '@coshi190/junoswap-sdk'
import type { QuoteResult } from './swap'
export interface SwapRoute {
    path: Address[]
    fees?: number[]
    pools?: Address[]
    isMultiHop: boolean
    intermediaryTokens: Token[]
}

export interface RouteQuote {
    route: SwapRoute
    quote: QuoteResult
    dexId: DEXType
    protocolType: ProtocolType
    priceImpact?: number
}

export interface RoutingResult {
    directRoute: RouteQuote | null
    multiHopRoutes: RouteQuote[]
    bestRoute: RouteQuote | null
    allRoutes: RouteQuote[]
}

export interface IntermediaryConfig {
    wrappedNative: Address
    stables: Address[]
    priority: Address[]
}
