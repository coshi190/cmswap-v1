'use client'

import { useMemo } from 'react'
import { useChainId } from 'wagmi'
import { useNowSeconds } from '@/hooks/useNowSeconds'
import { useTokenPriceMap } from '@/hooks/useTokenPriceMap'
import { useStakerDeposits } from '@/hooks/useStakerDeposits'
import { useFarmStakes } from '@/hooks/useFarmStakes'
import { computeFarmApr, positionValueUsd } from '@/services/mining/farm-metrics'
import type { Incentive } from '@/types/earn'

export interface FarmStats {
    stakedTvlUsd: number | undefined
    aprPercent: number | undefined
}

/**
 * Staked TVL and APR per farm, built on the same deposit and stake reads the position views use, so
 * both surfaces agree and the queries are shared rather than duplicated.
 */
export function useFarmStats(
    incentives: readonly Incentive[],
    rewardValueUsd: Record<string, number | undefined>
): {
    statsByIncentiveId: Record<string, FarmStats>
    isLoading: boolean
} {
    const chainId = useChainId()
    const now = useNowSeconds()

    const { deposits, isLoading: isLoadingDeposits } = useStakerDeposits()
    const { stakes, isLoading: isLoadingStakes } = useFarmStakes(incentives, deposits)
    const { priceMap, isLoading: isLoadingPrices } = useTokenPriceMap(chainId)

    const statsByIncentiveId = useMemo(() => {
        const tvl = new Map<string, number>()
        const unpriced = new Set<string>()

        for (const stake of stakes) {
            const { position } = stake
            const value = positionValueUsd(
                position.amount0,
                position.token0Info.decimals,
                priceMap.get(position.token0Info.address.toLowerCase()),
                position.amount1,
                position.token1Info.decimals,
                priceMap.get(position.token1Info.address.toLowerCase())
            )
            // One unpriced position makes the whole total a guess, so the farm reports no TVL
            // instead of a number that is quietly too low.
            if (value === undefined) {
                unpriced.add(stake.incentive.incentiveId)
                continue
            }
            const key = stake.incentive.incentiveId
            tvl.set(key, (tvl.get(key) ?? 0) + value)
        }

        const result: Record<string, FarmStats> = {}
        for (const incentive of incentives) {
            const stakedTvlUsd = unpriced.has(incentive.incentiveId)
                ? undefined
                : (tvl.get(incentive.incentiveId) ?? 0)
            result[incentive.incentiveId] = {
                stakedTvlUsd,
                aprPercent: computeFarmApr({
                    rewardValueUsd: rewardValueUsd[incentive.incentiveId],
                    stakedTvlUsd,
                    startTime: incentive.startTime,
                    endTime: incentive.endTime,
                    now,
                }),
            }
        }
        return result
    }, [stakes, priceMap, incentives, rewardValueUsd, now])

    return {
        statsByIncentiveId,
        isLoading: isLoadingDeposits || isLoadingStakes || isLoadingPrices,
    }
}
