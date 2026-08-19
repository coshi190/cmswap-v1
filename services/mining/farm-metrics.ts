export const SECONDS_PER_YEAR = 31_536_000

/**
 * USD value of one position's underlying tokens. Returns undefined unless both sides are priced —
 * summing only the priced side would understate TVL, which in turn overstates APR.
 */
export function positionValueUsd(
    amount0: bigint,
    decimals0: number,
    price0: number | undefined,
    amount1: bigint,
    decimals1: number,
    price1: number | undefined
): number | undefined {
    if (price0 === undefined || price1 === undefined) return undefined
    const value0 = (Number(amount0) / 10 ** decimals0) * price0
    const value1 = (Number(amount1) / 10 ** decimals1) * price1
    if (!Number.isFinite(value0) || !Number.isFinite(value1)) return undefined
    return value0 + value1
}

export interface FarmAprInput {
    /** USD value of the reward still to be handed out. */
    rewardValueUsd: number | undefined
    stakedTvlUsd: number | undefined
    startTime: number
    endTime: number
    now: number
}

/**
 * Annualised return a staker would see if they joined now: the remaining reward spread over the
 * remaining time, against the value already staked. A farm with nothing staked has no denominator,
 * so it reports undefined rather than infinity.
 */
export function computeFarmApr({
    rewardValueUsd,
    stakedTvlUsd,
    startTime,
    endTime,
    now,
}: FarmAprInput): number | undefined {
    if (rewardValueUsd === undefined || rewardValueUsd <= 0) return undefined
    if (stakedTvlUsd === undefined || stakedTvlUsd <= 0) return undefined

    const from = Math.max(now, startTime)
    const remainingSeconds = endTime - from
    if (remainingSeconds <= 0) return undefined

    const rewardPerYearUsd = (rewardValueUsd * SECONDS_PER_YEAR) / remainingSeconds
    return (rewardPerYearUsd / stakedTvlUsd) * 100
}
