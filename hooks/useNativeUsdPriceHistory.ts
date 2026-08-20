'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchNativeUsdPriceHistory } from '@/lib/price-history'
import { isLeaderboardSupportedChain } from '@/lib/leaderboard-utils'
import { hasSettled } from '@/lib/query-status'
import { makePriceAt, type PricePoint } from '@/services/portfolio/net-worth-history'

export function useNativeUsdPriceHistory(chainId: number, fallbackPrice: number | null) {
    const isSupportedChain = isLeaderboardSupportedChain(chainId)

    const { data, isLoading } = useQuery({
        queryKey: ['native-usd-price-history', chainId],
        queryFn: (): Promise<PricePoint[]> => fetchNativeUsdPriceHistory(chainId),
        enabled: isSupportedChain,
        staleTime: 5 * 60_000,
    })

    const points = useMemo(() => data ?? [], [data])
    const priceAt = useMemo(() => makePriceAt(points, fallbackPrice), [points, fallbackPrice])

    return { points, priceAt, isLoading, isSettled: hasSettled(isSupportedChain, data) }
}
