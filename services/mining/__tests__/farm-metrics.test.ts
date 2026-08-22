import { describe, it, expect } from 'vitest'
import { SECONDS_PER_YEAR, computeFarmApr, positionValueUsd } from '@/services/mining/farm-metrics'

const NOW = 1_700_000_000
const DAY = 86_400

describe('positionValueUsd', () => {
    it('sums both sides at their own decimals', () => {
        // 2 KKUB at $1.50 + 3 KUSDT (6 decimals) at $1.00
        expect(positionValueUsd(2n * 10n ** 18n, 18, 1.5, 3_000_000n, 6, 1)).toBeCloseTo(6)
    })

    it('returns null when either side is unpriced, rather than understating', () => {
        expect(positionValueUsd(10n ** 18n, 18, 1, 10n ** 18n, 18, undefined)).toBeNull()
        expect(positionValueUsd(10n ** 18n, 18, undefined, 10n ** 18n, 18, 1)).toBeNull()
    })

    it('handles an empty position', () => {
        expect(positionValueUsd(0n, 18, 2, 0n, 18, 3)).toBe(0)
    })
})

describe('computeFarmApr', () => {
    const base = {
        rewardValueUsd: 100,
        stakedTvlUsd: 1000,
        startTime: NOW - DAY,
        endTime: NOW + 364 * DAY,
        now: NOW,
    }

    it('annualises the remaining reward against staked value', () => {
        // $100 over 364 days on $1000 staked ~= 10% a year
        const apr = computeFarmApr(base)
        expect(apr).toBeDefined()
        expect(apr!).toBeCloseTo(((100 * (SECONDS_PER_YEAR / (364 * DAY))) / 1000) * 100, 6)
    })

    it('scales inversely with staked value', () => {
        const small = computeFarmApr({ ...base, stakedTvlUsd: 500 })!
        const large = computeFarmApr({ ...base, stakedTvlUsd: 2000 })!
        expect(small).toBeCloseTo(large * 4)
    })

    it('measures a scheduled farm over its full run, not from now', () => {
        const scheduled = computeFarmApr({
            ...base,
            startTime: NOW + 30 * DAY,
            endTime: NOW + 30 * DAY + 364 * DAY,
        })
        expect(scheduled).toBeCloseTo(computeFarmApr(base)!)
    })

    it('has no answer without a denominator or a reward', () => {
        expect(computeFarmApr({ ...base, stakedTvlUsd: 0 })).toBeUndefined()
        expect(computeFarmApr({ ...base, stakedTvlUsd: undefined })).toBeUndefined()
        expect(computeFarmApr({ ...base, rewardValueUsd: 0 })).toBeUndefined()
        expect(computeFarmApr({ ...base, rewardValueUsd: undefined })).toBeUndefined()
    })

    it('has no answer once the farm is over', () => {
        expect(computeFarmApr({ ...base, endTime: NOW })).toBeUndefined()
        expect(computeFarmApr({ ...base, endTime: NOW - DAY })).toBeUndefined()
    })
})
