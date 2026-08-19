'use client'

import { useMemo } from 'react'
import { useAccount } from 'wagmi'
import { useIncentives } from '@/hooks/useIncentives'
import { getIncentiveStatus } from '@/services/mining/incentives'
import type { Incentive } from '@/types/earn'

const STATUS_ORDER: Record<ReturnType<typeof getIncentiveStatus>, number> = {
    ended: 0,
    active: 1,
    pending: 2,
}

/**
 * Farms the connected wallet is the refundee of — the only party the staker returns unused rewards
 * to. Ended farms sort first because those are the ones waiting on an action.
 */
export function useMyIncentives(): {
    incentives: Incentive[]
    isLoading: boolean
    refetch: () => void
} {
    const { address } = useAccount()
    const { incentives, isLoading, refetch } = useIncentives()

    const mine = useMemo(() => {
        if (!address) return []
        const owner = address.toLowerCase()
        return incentives
            .filter((i) => i.refundee.toLowerCase() === owner)
            .sort((a, b) => {
                const byStatus =
                    STATUS_ORDER[getIncentiveStatus(a)] - STATUS_ORDER[getIncentiveStatus(b)]
                return byStatus !== 0 ? byStatus : b.endTime - a.endTime
            })
    }, [incentives, address])

    return { incentives: mine, isLoading: !!address && isLoading, refetch }
}
