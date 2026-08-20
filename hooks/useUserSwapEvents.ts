'use client'

import { useQuery } from '@tanstack/react-query'
import type { Address } from 'viem'
import { fetchUserSwapEvents } from '@coshi190/junoswap-sdk'
import { ponderClient } from '@/lib/ponder-client'
import { isLeaderboardSupportedChain } from '@/lib/leaderboard-utils'

export interface UserSwapEvent {
    tokenAddr: string
    isBuy: boolean
    amountIn: string
    amountOut: string
    timestamp: number
}

export function useUserSwapEvents(address: Address | undefined, chainId: number) {
    const isSupportedChain = isLeaderboardSupportedChain(chainId)

    return useQuery({
        queryKey: ['user-swap-events', address, chainId],
        queryFn: async (): Promise<UserSwapEvent[]> => {
            if (!address || !isSupportedChain) return []
            return fetchUserSwapEvents(ponderClient, { chainId, address })
        },
        enabled: !!address && isSupportedChain,
        staleTime: 60_000,
    })
}
