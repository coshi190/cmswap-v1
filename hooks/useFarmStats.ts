'use client'

import { useMemo } from 'react'
import { useChainId, useReadContracts } from 'wagmi'
import { getV3StakerAddress, UNISWAP_V3_STAKER_ABI } from '@coshi190/junoswap-sdk'
import { useNowSeconds } from '@/hooks/useNowSeconds'
import { useTokenPriceMap } from '@/hooks/useTokenPriceMap'
import { useUserPositions } from '@/hooks/useUserPositions'
import { computeFarmApr, positionValueUsd } from '@/services/mining/farm-metrics'
import type { Incentive, PositionWithTokens } from '@/types/earn'

export interface FarmStats {
    stakedTvlUsd: number | undefined
    aprPercent: number | undefined
}

const EMPTY_STATS: FarmStats = { stakedTvlUsd: undefined, aprPercent: undefined }

/**
 * Staked TVL and APR per farm.
 *
 * Every NFT sitting in the staker is owned by the staker contract, so the whole staked set is one
 * position query away. A position can only be staked in an incentive on its own pool, so `stakes()`
 * is read for those pairs only rather than the full cross product.
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
    const stakerAddress = getV3StakerAddress(chainId)

    const { positions, isLoading: isLoadingPositions } = useUserPositions(stakerAddress, chainId)
    const { priceMap, isLoading: isLoadingPrices } = useTokenPriceMap(chainId)

    const pairs = useMemo(() => {
        if (!stakerAddress || positions.length === 0) return []
        const byPool = new Map<string, PositionWithTokens[]>()
        for (const position of positions) {
            const key = position.poolAddress.toLowerCase()
            const bucket = byPool.get(key)
            if (bucket) bucket.push(position)
            else byPool.set(key, [position])
        }
        const result: { incentiveId: `0x${string}`; position: PositionWithTokens }[] = []
        for (const incentive of incentives) {
            for (const position of byPool.get(incentive.pool.toLowerCase()) ?? []) {
                result.push({ incentiveId: incentive.incentiveId, position })
            }
        }
        return result
    }, [incentives, positions, stakerAddress])

    const contracts = useMemo(() => {
        if (!stakerAddress) return []
        return pairs.map((pair) => ({
            address: stakerAddress,
            abi: UNISWAP_V3_STAKER_ABI,
            functionName: 'stakes' as const,
            args: [pair.position.tokenId, pair.incentiveId] as const,
            chainId,
        }))
    }, [pairs, stakerAddress, chainId])

    const { data: stakeData, isLoading: isLoadingStakes } = useReadContracts({
        contracts,
        query: { enabled: contracts.length > 0, staleTime: 30_000 },
    })

    const statsByIncentiveId = useMemo(() => {
        const tvl = new Map<string, number>()
        const unpriced = new Set<string>()

        pairs.forEach((pair, index) => {
            const stake = stakeData?.[index]?.result as readonly [bigint, bigint] | undefined
            if (!stake || stake[1] <= 0n) return

            const { position } = pair
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
                unpriced.add(pair.incentiveId)
                return
            }
            tvl.set(pair.incentiveId, (tvl.get(pair.incentiveId) ?? 0) + value)
        })

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
    }, [pairs, stakeData, priceMap, incentives, rewardValueUsd, now])

    return {
        statsByIncentiveId,
        isLoading: isLoadingPositions || isLoadingPrices || isLoadingStakes,
    }
}

export { EMPTY_STATS }
