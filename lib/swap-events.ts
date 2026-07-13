import {
    fetchBondingCurveSwaps as sdkFetchBondingCurveSwaps,
    fetchV3Swaps as sdkFetchV3Swaps,
    fetchV2Swaps as sdkFetchV2Swaps,
    fetchAllReferralBindings as sdkFetchAllReferralBindings,
    fetchReferralBindings as sdkFetchReferralBindings,
    type SwapScanFilter,
    type V2Swap,
    type V3Swap,
} from '@junoswap/sdk'
import { ponderClient, isPonderError } from '@/lib/ponder-client'
import { INTERMEDIARY_TOKENS } from '@/lib/routing-config'

/**
 * Shared swap-event fetching + parsing for the portfolio, leaderboard and points
 * views. All three feed the same weighted-average-cost PnL/volume math, so they must
 * see the *same* event set and parse each swap identically — one native-leg parser
 * here keeps them in lockstep.
 *
 * The queries and cursor pagination live in the SDK; what stays here is the parsing,
 * which needs INTERMEDIARY_TOKENS (app config the SDK has no business knowing about).
 */

/** Lowercased wrapped-native address for a chain, or null if unknown. */
function wrappedNativeFor(chainId: number): string | null {
    return INTERMEDIARY_TOKENS[chainId]?.wrappedNative.toLowerCase() ?? null
}

/**
 * One normalized swap. Semantics match the indexer/PnL convention:
 * - buy:  amountIn = native paid, amountOut = tokens received
 * - sell: amountIn = tokens sold, amountOut = native received
 * `sender` is the raw trader address (callers lowercase as needed); `protocol` is the
 * liquidity source ('junoswap' for our pools + bonding curve, or an external DEX id).
 */
export interface ParsedSwap {
    tokenAddr: string
    sender: string
    isBuy: boolean
    amountIn: string
    amountOut: string
    timestamp: number
    protocol: string
}

export interface SwapFilter {
    /** Lowercased trader address; omit to fetch across all traders. */
    sender?: string
    /** Lowercased trader addresses; fetch swaps from any of them in one query. */
    senderIn?: string[]
    /** Unix seconds lower bound; omit or 0 for all-time. */
    since?: number
}

function toScanFilter(chainId: number, filter: SwapFilter): SwapScanFilter {
    return {
        chainId,
        sender: filter.sender,
        senders: filter.senderIn,
        since: filter.since && filter.since > 0 ? filter.since : undefined,
    }
}

const abs = (x: bigint) => (x < 0n ? -x : x)

/**
 * Parse a V3 swap row. amount0/amount1 are pool-perspective deltas: positive = token
 * into the pool (user pays), negative = out of the pool (user receives). Resolve the
 * native leg against the chain's wrapped native via token0Addr/token1Addr rather than
 * the stored tokenIsToken0, which defaults to token0 for external token/token pools
 * and would mis-read the amount. Token/token swaps (no native leg) return null.
 */
export function parseV3Swap(e: V3Swap, wrappedNative: string): ParsedSwap | null {
    const token0 = e.token0Addr?.toLowerCase()
    const token1 = e.token1Addr?.toLowerCase()
    let nativeIsToken0: boolean
    if (token1 === wrappedNative) nativeIsToken0 = false
    else if (token0 === wrappedNative) nativeIsToken0 = true
    else return null
    const nativeAmt = BigInt(nativeIsToken0 ? e.amount0 : e.amount1)
    const tokenAmt = BigInt(nativeIsToken0 ? e.amount1 : e.amount0)
    const isBuy = tokenAmt < 0n // token leaves the pool => user receives it
    return {
        tokenAddr: e.tokenAddr.toLowerCase(),
        sender: e.txFrom,
        isBuy,
        amountIn: (isBuy ? abs(nativeAmt) : abs(tokenAmt)).toString(),
        amountOut: (isBuy ? abs(tokenAmt) : abs(nativeAmt)).toString(),
        timestamp: e.timestamp,
        protocol: e.protocol || 'junoswap',
    }
}

/**
 * Parse a V2 swap row. V2 amounts are non-negative in/out per side. Resolve the native
 * leg against the chain's wrapped native; token/token pools (no native leg) return
 * null. Maps to buy/sell semantics: buy = native paid in / tokens out, sell = tokens
 * in / native out.
 */
export function parseV2Swap(e: V2Swap, wrappedNative: string): ParsedSwap | null {
    const token0 = e.token0Addr.toLowerCase()
    const token1 = e.token1Addr.toLowerCase()
    let nativeIn: bigint, nativeOut: bigint, tokenIn: bigint, tokenOut: bigint
    let tokenAddr: string
    if (token0 === wrappedNative) {
        nativeIn = BigInt(e.amount0In)
        nativeOut = BigInt(e.amount0Out)
        tokenIn = BigInt(e.amount1In)
        tokenOut = BigInt(e.amount1Out)
        tokenAddr = token1
    } else if (token1 === wrappedNative) {
        nativeIn = BigInt(e.amount1In)
        nativeOut = BigInt(e.amount1Out)
        tokenIn = BigInt(e.amount0In)
        tokenOut = BigInt(e.amount0Out)
        tokenAddr = token0
    } else {
        return null
    }
    const isBuy = nativeIn > 0n // native flows into the pool => user buys token
    return {
        tokenAddr,
        sender: e.txFrom,
        isBuy,
        amountIn: (isBuy ? nativeIn : tokenIn).toString(),
        amountOut: (isBuy ? tokenOut : nativeOut).toString(),
        timestamp: e.timestamp,
        protocol: e.protocol || 'unknown',
    }
}

/** Bonding-curve swaps (launchpad chain only). Already buy/sell-normalized by the indexer. */
export async function fetchBondingCurveSwaps(
    chainId: number,
    filter: SwapFilter
): Promise<ParsedSwap[]> {
    try {
        const rows = await sdkFetchBondingCurveSwaps(ponderClient, toScanFilter(chainId, filter))
        return rows.map((e) => ({
            tokenAddr: e.tokenAddr.toLowerCase(),
            sender: e.sender,
            isBuy: e.isBuy === 1,
            amountIn: e.amountIn,
            amountOut: e.amountOut,
            timestamp: e.timestamp,
            protocol: 'junoswap',
        }))
    } catch (e) {
        if (isPonderError(e)) return []
        throw e
    }
}

/** V3 swaps (junoswap + external kublerx), native leg resolved against wrapped native. */
export async function fetchV3Swaps(chainId: number, filter: SwapFilter): Promise<ParsedSwap[]> {
    const wn = wrappedNativeFor(chainId)
    if (!wn) return []
    try {
        const rows = await sdkFetchV3Swaps(ponderClient, toScanFilter(chainId, filter))
        const out: ParsedSwap[] = []
        for (const r of rows) {
            const p = parseV3Swap(r, wn)
            if (p) out.push(p)
        }
        return out
    } catch (e) {
        if (isPonderError(e)) return []
        throw e
    }
}

/** External V2 swaps, native leg resolved against wrapped native. */
export async function fetchV2Swaps(chainId: number, filter: SwapFilter): Promise<ParsedSwap[]> {
    const wn = wrappedNativeFor(chainId)
    if (!wn) return []
    try {
        const rows = await sdkFetchV2Swaps(ponderClient, toScanFilter(chainId, filter))
        const out: ParsedSwap[] = []
        for (const r of rows) {
            const p = parseV2Swap(r, wn)
            if (p) out.push(p)
        }
        return out
    } catch (e) {
        if (isPonderError(e)) return []
        throw e
    }
}

/** Every referral binding (sticky first-touch), grouped by referrer. Cross-chain
 *  (bindings are global). Returns lowercased referrer → lowercased referee addresses. */
export async function fetchAllReferralBindings(): Promise<Map<string, string[]>> {
    try {
        const rows = await sdkFetchAllReferralBindings(ponderClient)
        const map = new Map<string, string[]>()
        for (const r of rows) {
            const referrer = r.referrer.toLowerCase()
            const list = map.get(referrer) ?? []
            list.push(r.referee.toLowerCase())
            map.set(referrer, list)
        }
        return map
    } catch (e) {
        if (isPonderError(e)) return new Map()
        throw e
    }
}

/** Wallets bound (sticky first-touch) to the given referrer. Cross-chain (binding is
 *  keyed by referee globally). Returns lowercased referee addresses. */
export async function fetchReferralBindings(referrer: string): Promise<string[]> {
    try {
        const rows = await sdkFetchReferralBindings(ponderClient, {
            referrer: referrer.toLowerCase(),
        })
        return rows.map((r) => r.referee.toLowerCase())
    } catch (e) {
        if (isPonderError(e)) return []
        throw e
    }
}
