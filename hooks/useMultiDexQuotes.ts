'use client'

import { useMemo } from 'react'
import { useChainId } from 'wagmi'
import type { Token } from '@/types/tokens'
import type { DEXType } from '@/types/dex'
import type { DexQuote } from '@/types/swap'
import {
    getSupportedDexs,
    getDexConfig,
    isV2Config,
    isV3Config,
    ProtocolType,
} from '@/lib/dex-config'
import { useUniV3Quote } from './useUniV3Quote'
import { useUniV2Quote } from './useUniV2Quote'

export interface UseMultiDexQuotesParams {
    tokenIn: Token | null
    tokenOut: Token | null
    amountIn: bigint
    enabled?: boolean
}

export interface UseMultiDexQuotesResult {
    dexQuotes: Record<DEXType, DexQuote>
    bestQuoteDex: DEXType | null
    isAnyLoading: boolean
    hasAnyQuote: boolean
    priceDifferences: Record<DEXType, number | null>
}

export function useMultiDexQuotes({
    tokenIn,
    tokenOut,
    amountIn,
    enabled = true,
}: UseMultiDexQuotesParams): UseMultiDexQuotesResult {
    const chainId = useChainId()
    const supportedDexs = getSupportedDexs(chainId)
    const v3Dexs = supportedDexs.filter((dexId) => {
        const config = getDexConfig(chainId, dexId)
        return config && isV3Config(config)
    })
    const v2Dexs = supportedDexs.filter((dexId) => {
        const config = getDexConfig(chainId, dexId)
        return config && isV2Config(config)
    })
    const v3Result = useUniV3Quote({
        tokenIn,
        tokenOut,
        amountIn,
        enabled,
        dexId: v3Dexs.length > 0 ? v3Dexs : undefined,
    })
    const v2Result = useUniV2Quote({
        tokenIn,
        tokenOut,
        amountIn,
        enabled,
        dexId: v2Dexs.length > 0 ? v2Dexs : undefined,
    })
    const quotes: Record<DEXType, DexQuote> = useMemo(() => {
        const results: Record<DEXType, DexQuote> = {}
        for (const dexId of v3Dexs) {
            results[dexId] = {
                dexId,
                quote: null,
                isLoading: false,
                isError: false,
                error: null,
                protocolType: ProtocolType.V3,
            }
        }
        for (const dexId of v2Dexs) {
            results[dexId] = {
                dexId,
                quote: null,
                isLoading: false,
                isError: false,
                error: null,
                protocolType: ProtocolType.V2,
            }
        }
        if (v3Result.primaryDexId && results[v3Result.primaryDexId]) {
            results[v3Result.primaryDexId] = {
                dexId: v3Result.primaryDexId,
                quote: v3Result.quote,
                isLoading: v3Result.isLoading,
                isError: v3Result.isError,
                error: v3Result.error,
                protocolType: ProtocolType.V3,
                fee: v3Result.fee ?? undefined,
            }
        }
        if (v2Result.primaryDexId && results[v2Result.primaryDexId]) {
            results[v2Result.primaryDexId] = {
                dexId: v2Result.primaryDexId,
                quote: v2Result.quote,
                isLoading: v2Result.isLoading,
                isError: v2Result.isError,
                error: v2Result.error,
                protocolType: ProtocolType.V2,
            }
        }
        return results
    }, [
        v3Dexs,
        v2Dexs,
        v3Result.primaryDexId,
        v3Result.quote,
        v3Result.isLoading,
        v3Result.isError,
        v3Result.error,
        v3Result.fee,
        v2Result.primaryDexId,
        v2Result.quote,
        v2Result.isLoading,
        v2Result.isError,
        v2Result.error,
    ])
    const bestQuoteDex = useMemo(() => {
        const validQuotes = Object.values(quotes).filter(
            (q) => q.quote && !q.isLoading && !q.isError
        )
        if (validQuotes.length === 0) return null

        const best = validQuotes.sort((a, b) => {
            if (!a.quote || !b.quote) return 0
            return Number(b.quote.amountOut - a.quote.amountOut)
        })[0]
        return best?.dexId ?? null
    }, [quotes])
    const priceDifferences = useMemo(() => {
        const differences: Record<DEXType, number | null> = {}
        if (!bestQuoteDex) {
            Object.keys(quotes).forEach((dexId) => {
                differences[dexId] = null
            })
            return differences
        }
        const bestQuote = quotes[bestQuoteDex]?.quote
        if (!bestQuote) {
            Object.keys(quotes).forEach((dexId) => {
                differences[dexId] = null
            })
            return differences
        }
        const bestAmountOut = bestQuote.amountOut
        Object.entries(quotes).forEach(([dexId, dexQuote]) => {
            if (dexQuote.quote && !dexQuote.isLoading && !dexQuote.isError) {
                if (dexId === bestQuoteDex) {
                    differences[dexId] = 0
                } else {
                    const currentAmountOut = dexQuote.quote.amountOut
                    const percentageDiff =
                        (Number(currentAmountOut - bestAmountOut) / Number(bestAmountOut)) * 100
                    differences[dexId] = percentageDiff
                }
            } else {
                differences[dexId] = null
            }
        })
        return differences
    }, [quotes, bestQuoteDex])
    const isAnyLoading = Object.values(quotes).some((q) => q.isLoading)
    const hasAnyQuote = Object.values(quotes).some((q) => q.quote !== null)
    return {
        dexQuotes: quotes,
        bestQuoteDex,
        isAnyLoading,
        hasAnyQuote,
        priceDifferences,
    }
}
