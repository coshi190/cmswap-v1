'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchNativeUsdPriceHistory, type PricePoint } from '@/lib/price-history'
import { isLeaderboardSupportedChain } from '@/lib/leaderboard-utils'
import { hasSettled } from '@/lib/query-status'

export function useNativeUsdPriceHistory(chainId: number) {
    const isSupportedChain = isLeaderboardSupportedChain(chainId)

    const { data, isLoading } = useQuery({
        queryKey: ['native-usd-price-history', chainId],
        queryFn: (): Promise<PricePoint[]> => fetchNativeUsdPriceHistory(chainId),
        enabled: isSupportedChain,
        staleTime: 5 * 60_000,
    })

    const points = useMemo(() => data ?? [], [data])

    return { points, isLoading, isSettled: hasSettled(isSupportedChain, data) }
}
