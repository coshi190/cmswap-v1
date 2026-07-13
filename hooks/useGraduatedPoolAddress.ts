'use client'

import { useQuery } from '@tanstack/react-query'
import type { Address } from 'viem'
import { fetchGraduatedPool } from '@junoswap/sdk'
import { ponderClient } from '@/lib/ponder-client'

/**
 * The V3 pool a graduated launch token trades in. Undefined if it has no pool (i.e. it hasn't
 * graduated). The SDK tries both token orderings — pool token order follows address sort order.
 */
export function useGraduatedPoolAddress(
    tokenAddr: Address | undefined,
    wrappedNative: Address | undefined
) {
    return useQuery({
        queryKey: [
            'graduated-pool-address',
            tokenAddr?.toLowerCase(),
            wrappedNative?.toLowerCase(),
        ],
        queryFn: async () => {
            if (!tokenAddr || !wrappedNative) return undefined
            const address = await fetchGraduatedPool(ponderClient, {
                tokenAddr: tokenAddr.toLowerCase(),
                wrappedNative: wrappedNative.toLowerCase(),
            })
            return (address as Address | null) ?? undefined
        },
        enabled: !!tokenAddr && !!wrappedNative,
        staleTime: 60_000,
    })
}
