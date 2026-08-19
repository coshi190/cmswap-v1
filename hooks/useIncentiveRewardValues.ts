'use client'

import { useMemo } from 'react'
import { useChainId } from 'wagmi'
import { useTokenPriceMap } from '@/hooks/useTokenPriceMap'
import type { Incentive } from '@/types/earn'

/**
 * USD value of each farm's undistributed reward. Sorting by "Reward Value" needs a single unit —
 * raw balances across different reward tokens are not comparable — and a farm whose reward token
 * has no price stays `undefined` so it can sink rather than pretend to be worth zero.
 */
export function useIncentiveRewardValues(incentives: readonly Incentive[]): {
    valueByIncentiveId: Record<string, number | undefined>
    isLoading: boolean
} {
    const chainId = useChainId()
    const { priceMap, isLoading } = useTokenPriceMap(chainId)

    const valueByIncentiveId = useMemo(() => {
        const result: Record<string, number | undefined> = {}
        for (const incentive of incentives) {
            const price = priceMap.get(incentive.rewardTokenInfo.address.toLowerCase())
            if (price === undefined) continue
            const amount =
                Number(incentive.totalRewardUnclaimed) / 10 ** incentive.rewardTokenInfo.decimals
            if (!Number.isFinite(amount)) continue
            result[incentive.incentiveId] = price * amount
        }
        return result
    }, [incentives, priceMap])

    return { valueByIncentiveId, isLoading }
}
