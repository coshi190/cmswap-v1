'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchV3TokenSnapshots, fetchNativeUsdPrice } from '@junoswap/sdk'
import { INTERMEDIARY_TOKENS } from '@/lib/routing-config'
import { ponderClient, isPonderError } from '@/lib/ponder-client'

/**
 * Fetches a token-address → USD-price map from Ponder for use by TVL and volume hooks.
 * Includes overrides for wrapped native (nativeUsdPrice) and stablecoins ($1.00).
 *
 * The query keys are shared with useNativeUsdPrice/useTokenPrices deliberately: these used to
 * carry `-tvl` suffixes, which fetched byte-identical queries a second time.
 */
export function useTokenPriceMap(chainId: number) {
    const config = INTERMEDIARY_TOKENS[chainId]

    const { data: snapshots, isLoading: isLoadingSnapshots } = useQuery({
        queryKey: ['v3-token-snapshots', chainId],
        queryFn: async () => {
            try {
                return await fetchV3TokenSnapshots(ponderClient, { chainId })
            } catch (e) {
                if (isPonderError(e)) return []
                throw e
            }
        },
        staleTime: 30_000,
    })

    const { data: nativeUsdPrice, isLoading: isLoadingNative } = useQuery({
        queryKey: ['native-usd-price', chainId],
        queryFn: async () => {
            try {
                return await fetchNativeUsdPrice(ponderClient, { chainId })
            } catch (e) {
                if (isPonderError(e)) return null
                throw e
            }
        },
        staleTime: 30_000,
    })

    const priceMap = useMemo(() => {
        const map = new Map<string, number>()

        // 1. Wrapped native → nativeUsdPrice
        const wrappedNative = config?.wrappedNative?.toLowerCase()
        if (wrappedNative && nativeUsdPrice != null && nativeUsdPrice > 0) {
            map.set(wrappedNative, nativeUsdPrice)
        }

        // 2. Tokens → lastPriceUsd from v3TokenSnapshots
        for (const s of snapshots ?? []) {
            const price = parseFloat(s.lastPriceUsd ?? '0')
            if (price > 0) {
                map.set(s.tokenAddr.toLowerCase(), price)
            }
        }

        // 3. Stablecoins → $1.00. Applied last so a known stablecoin is always
        // pinned to $1 and can never be overridden by a bad snapshot price (e.g. a
        // decimals-mismatched snapshot that would otherwise read in the trillions).
        for (const stable of config?.stables ?? []) {
            map.set(stable.toLowerCase(), 1.0)
        }

        return map
    }, [snapshots, nativeUsdPrice, config])

    return {
        priceMap,
        isLoading: isLoadingSnapshots || isLoadingNative,
    }
}
