'use client'

import { useMemo } from 'react'
import { useChainId, useReadContracts } from 'wagmi'
import type { Address } from 'viem'
import { getV3StakerAddress, UNISWAP_V3_STAKER_ABI } from '@coshi190/junoswap-sdk'
import type { StakerDeposit } from '@/hooks/useStakerDeposits'
import type { Incentive, PositionWithTokens, StakedPosition } from '@/types/earn'

export interface FarmStake {
    incentive: Incentive
    position: PositionWithTokens
    depositor: Address
    liquidity: bigint
    secondsPerLiquidityInsideInitialX128: bigint
}

/**
 * Which deposits are staked in which farm. A position can only be staked in an incentive on its own
 * pool, so `stakes()` is read for those pairs rather than every deposit against every farm.
 */
export function useFarmStakes(
    incentives: readonly Incentive[],
    deposits: readonly StakerDeposit[]
): {
    stakes: FarmStake[]
    isLoading: boolean
} {
    const chainId = useChainId()
    const stakerAddress = getV3StakerAddress(chainId)

    const pairs = useMemo(() => {
        if (deposits.length === 0 || incentives.length === 0) return []
        const byPool = new Map<string, StakerDeposit[]>()
        for (const deposit of deposits) {
            const key = deposit.position.poolAddress.toLowerCase()
            const bucket = byPool.get(key)
            if (bucket) bucket.push(deposit)
            else byPool.set(key, [deposit])
        }
        const result: { incentive: Incentive; deposit: StakerDeposit }[] = []
        for (const incentive of incentives) {
            for (const deposit of byPool.get(incentive.pool.toLowerCase()) ?? []) {
                result.push({ incentive, deposit })
            }
        }
        return result
    }, [incentives, deposits])

    const contracts = useMemo(() => {
        if (!stakerAddress) return []
        return pairs.map((pair) => ({
            address: stakerAddress,
            abi: UNISWAP_V3_STAKER_ABI,
            functionName: 'stakes' as const,
            args: [pair.deposit.position.tokenId, pair.incentive.incentiveId] as const,
            chainId,
        }))
    }, [pairs, stakerAddress, chainId])

    const { data, isLoading } = useReadContracts({
        contracts,
        query: { enabled: contracts.length > 0, staleTime: 15_000 },
    })

    const stakes = useMemo(() => {
        const result: FarmStake[] = []
        pairs.forEach((pair, index) => {
            const row = data?.[index]?.result as readonly [bigint, bigint] | undefined
            if (!row || row[1] <= 0n) return
            result.push({
                incentive: pair.incentive,
                position: pair.deposit.position,
                depositor: pair.deposit.depositor,
                liquidity: row[1],
                secondsPerLiquidityInsideInitialX128: row[0],
            })
        })
        return result
    }, [pairs, data])

    return { stakes, isLoading: contracts.length > 0 && isLoading }
}

export function toStakedPosition(stake: FarmStake): StakedPosition {
    return {
        tokenId: stake.position.tokenId,
        incentiveId: stake.incentive.incentiveId,
        liquidity: stake.liquidity,
        secondsPerLiquidityInsideInitialX128: stake.secondsPerLiquidityInsideInitialX128,
        position: stake.position,
        incentive: stake.incentive,
        pendingRewards: 0n,
    }
}
