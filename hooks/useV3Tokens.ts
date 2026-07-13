'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchV3Tokens, type V3TokenRow } from '@coshi190/junoswap-sdk'
import { ponderClient, isPonderError } from '@/lib/ponder-client'

/**
 * Every token the indexer has seen in a V3 pool on this chain.
 *
 * useChainTokens, useTokenDiscovery and useAllPools all used to run their own copy of this query
 * under the *same* React-Query key while returning different shapes — they collided in the cache
 * and only worked because the shapes happened to overlap. They share this one now, and map the
 * rows themselves.
 */
export function useV3Tokens(chainId: number): {
    tokens: V3TokenRow[]
    isLoading: boolean
    isSettled: boolean
} {
    const { data, isLoading } = useQuery({
        queryKey: ['v3-tokens', chainId],
        queryFn: async () => {
            try {
                return await fetchV3Tokens(ponderClient, { chainId })
            } catch (e) {
                if (isPonderError(e)) return []
                throw e
            }
        },
        staleTime: 60_000,
    })

    // `tokens` defaults to [], so callers can't distinguish "not fetched yet" from "none" —
    // isSettled tracks that separately (useTokenDiscovery gates on it).
    return { tokens: data ?? [], isLoading, isSettled: data !== undefined }
}
