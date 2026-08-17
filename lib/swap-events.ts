import {
    fetchBondingCurveSwaps as sdkFetchBondingCurveSwaps,
    fetchV3Swaps as sdkFetchV3Swaps,
    fetchV2Swaps as sdkFetchV2Swaps,
    parseV2Swap,
    parseV3Swap,
    type BondingCurveSwap,
    type ParsedSwap,
    type SwapScanFilter,
} from '@coshi190/junoswap-sdk'
import { ponderClient } from '@/lib/ponder-client'
import { INTERMEDIARY_TOKENS } from '@/lib/routing-config'

export type SwapFilter = Omit<SwapScanFilter, 'chainId'>

function wrappedNativeFor(chainId: number): string | null {
    return INTERMEDIARY_TOKENS[chainId]?.wrappedNative.toLowerCase() ?? null
}

function parseBondingCurveSwap(e: BondingCurveSwap): ParsedSwap {
    return {
        tokenAddr: e.tokenAddr.toLowerCase(),
        sender: e.sender,
        isBuy: e.isBuy === 1,
        amountIn: e.amountIn,
        amountOut: e.amountOut,
        timestamp: e.timestamp,
        protocol: 'junoswap',
    }
}

export async function fetchBondingCurveSwaps(
    chainId: number,
    filter: SwapFilter
): Promise<ParsedSwap[]> {
    const rows = await sdkFetchBondingCurveSwaps(ponderClient, { chainId, ...filter })
    return rows.map(parseBondingCurveSwap)
}

export async function fetchV3Swaps(chainId: number, filter: SwapFilter): Promise<ParsedSwap[]> {
    const wrappedNative = wrappedNativeFor(chainId)
    if (!wrappedNative) return []
    const rows = await sdkFetchV3Swaps(ponderClient, { chainId, ...filter })
    return rows.map((e) => parseV3Swap(e, wrappedNative)).filter((s): s is ParsedSwap => s !== null)
}

export async function fetchV2Swaps(chainId: number, filter: SwapFilter): Promise<ParsedSwap[]> {
    const wrappedNative = wrappedNativeFor(chainId)
    if (!wrappedNative) return []
    const rows = await sdkFetchV2Swaps(ponderClient, { chainId, ...filter })
    return rows.map((e) => parseV2Swap(e, wrappedNative)).filter((s): s is ParsedSwap => s !== null)
}
