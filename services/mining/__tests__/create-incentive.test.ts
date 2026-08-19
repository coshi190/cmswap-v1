import { describe, it, expect } from 'vitest'
import {
    FALLBACK_STAKER_LIMITS,
    START_NOW_BUFFER_SECONDS,
    START_QUANTUM_SECONDS,
    buildIncentiveKey,
    calculateRewardRate,
    createEmptyIncentiveForm,
    describeCreateIncentiveError,
    parseRewardAmount,
    primaryError,
    resolveStartTime,
    validateCreateIncentive,
} from '@/services/mining/create-incentive'
import { SECONDS_PER_DAY } from '@/lib/duration'
import type { CreateIncentiveForm, StakerLimits, V3PoolData } from '@/types/earn'
import type { Token } from '@/types/token'

const NOW = 1_700_000_000
const ACCOUNT = '0x1111111111111111111111111111111111111111' as const
const POOL_ADDRESS = '0x2222222222222222222222222222222222222222' as const

const token = (decimals: number, symbol = 'JUNO'): Token => ({
    address: '0x3333333333333333333333333333333333333333',
    symbol,
    name: symbol,
    decimals,
    chainId: 96,
})

const pool: V3PoolData = {
    address: POOL_ADDRESS,
    token0: token(18, 'KKUB'),
    token1: token(18, 'KUSDT'),
    fee: 3000,
    liquidity: 1n,
    sqrtPriceX96: 1n,
    tick: 0,
    tickSpacing: 60,
}

const form = (overrides: Partial<CreateIncentiveForm> = {}): CreateIncentiveForm => ({
    ...createEmptyIncentiveForm(),
    pool,
    rewardToken: token(18),
    rewardAmount: '1000',
    ...overrides,
})

const ctx = (overrides: Partial<Parameters<typeof validateCreateIncentive>[1]> = {}) => ({
    now: NOW,
    balance: 10n ** 24n,
    limits: FALLBACK_STAKER_LIMITS,
    account: ACCOUNT as `0x${string}` | undefined,
    ...overrides,
})

describe('parseRewardAmount', () => {
    it('scales by the token decimals, not always 18', () => {
        expect(parseRewardAmount('1', 6)).toBe(1_000_000n)
        expect(parseRewardAmount('1', 18)).toBe(10n ** 18n)
        expect(parseRewardAmount('1', 0)).toBe(1n)
    })

    it('truncates extra fraction digits instead of rounding up', () => {
        expect(parseRewardAmount('1.2345678', 6)).toBe(1_234_567n)
    })

    it('pads short fractions', () => {
        expect(parseRewardAmount('1.5', 6)).toBe(1_500_000n)
    })

    it('returns null rather than throwing on unparseable input', () => {
        expect(parseRewardAmount('', 18)).toBeNull()
        expect(parseRewardAmount('.', 18)).toBeNull()
        expect(parseRewardAmount('abc', 18)).toBeNull()
        expect(parseRewardAmount('-1', 18)).toBeNull()
        expect(parseRewardAmount('1.2.3', 18)).toBeNull()
    })

    it('accepts zero', () => {
        expect(parseRewardAmount('0', 18)).toBe(0n)
    })
})

describe('resolveStartTime', () => {
    it('pushes a "now" start past the buffer so the tx can still mine in time', () => {
        const start = resolveStartTime(form({ startMode: 'now' }), NOW)
        expect(start).not.toBeNull()
        expect(start! - NOW).toBeGreaterThanOrEqual(START_NOW_BUFFER_SECONDS)
    })

    it('snaps a "now" start to a whole minute so simulate args stay stable', () => {
        expect(resolveStartTime(form({ startMode: 'now' }), NOW)! % START_QUANTUM_SECONDS).toBe(0)
        expect(resolveStartTime(form({ startMode: 'now' }), NOW + 1)).toBe(
            resolveStartTime(form({ startMode: 'now' }), NOW)
        )
    })

    it('passes a scheduled start through untouched', () => {
        const scheduled = NOW + 3 * SECONDS_PER_DAY
        expect(
            resolveStartTime(form({ startMode: 'scheduled', scheduledStart: scheduled }), NOW)
        ).toBe(scheduled)
    })

    it('returns null when a scheduled start has not been picked', () => {
        expect(
            resolveStartTime(form({ startMode: 'scheduled', scheduledStart: null }), NOW)
        ).toBeNull()
    })
})

describe('validateCreateIncentive', () => {
    it('accepts a fully filled form', () => {
        expect(validateCreateIncentive(form(), ctx())).toEqual([])
    })

    it('flags a missing pool, token and account', () => {
        const errors = validateCreateIncentive(
            form({ pool: null, rewardToken: null }),
            ctx({ account: undefined })
        )
        expect(errors).toContain('NO_POOL')
        expect(errors).toContain('NO_REWARD_TOKEN')
        expect(errors).toContain('NO_ACCOUNT')
    })

    it('separates an empty amount from an unparseable one', () => {
        expect(validateCreateIncentive(form({ rewardAmount: '' }), ctx())).toContain('REWARD_ZERO')
        expect(validateCreateIncentive(form({ rewardAmount: 'x' }), ctx())).toContain(
            'REWARD_INVALID'
        )
    })

    it('treats an explicit zero as no reward', () => {
        expect(validateCreateIncentive(form({ rewardAmount: '0' }), ctx())).toContain('REWARD_ZERO')
    })

    it('compares the reward against the balance in token units', () => {
        const sixDecimals = token(6, 'KUSDT')
        const errors = validateCreateIncentive(
            form({ rewardToken: sixDecimals, rewardAmount: '2' }),
            ctx({ balance: 1_000_000n })
        )
        expect(errors).toContain('REWARD_EXCEEDS_BALANCE')
    })

    it('allows spending the exact balance', () => {
        expect(
            validateCreateIncentive(form({ rewardAmount: '1' }), ctx({ balance: 10n ** 18n }))
        ).toEqual([])
    })

    it('rejects a scheduled start in the past', () => {
        const errors = validateCreateIncentive(
            form({ startMode: 'scheduled', scheduledStart: NOW - 60 }),
            ctx()
        )
        expect(errors).toContain('START_IN_PAST')
    })

    it('rejects a start beyond the staker lead time but allows the boundary', () => {
        const lead = FALLBACK_STAKER_LIMITS.maxIncentiveStartLeadTime
        expect(
            validateCreateIncentive(
                form({ startMode: 'scheduled', scheduledStart: NOW + lead + 1 }),
                ctx()
            )
        ).toContain('START_TOO_FAR')
        expect(
            validateCreateIncentive(
                form({ startMode: 'scheduled', scheduledStart: NOW + lead }),
                ctx()
            )
        ).toEqual([])
    })

    it('rejects a duration beyond the staker cap but allows the boundary', () => {
        const max = FALLBACK_STAKER_LIMITS.maxIncentiveDuration
        expect(validateCreateIncentive(form({ durationSeconds: max + 1 }), ctx())).toContain(
            'DURATION_TOO_LONG'
        )
        expect(validateCreateIncentive(form({ durationSeconds: max }), ctx())).toEqual([])
    })

    it('rejects a zero duration', () => {
        expect(validateCreateIncentive(form({ durationSeconds: 0 }), ctx())).toContain(
            'DURATION_ZERO'
        )
    })

    it('follows a tighter chain-specific cap', () => {
        const tight: StakerLimits = {
            maxIncentiveDuration: SECONDS_PER_DAY,
            maxIncentiveStartLeadTime: 600,
        }
        expect(
            validateCreateIncentive(
                form({ durationSeconds: 2 * SECONDS_PER_DAY }),
                ctx({ limits: tight })
            )
        ).toContain('DURATION_TOO_LONG')
    })
})

describe('buildIncentiveKey', () => {
    it('derives endTime from the resolved start plus the duration', () => {
        const key = buildIncentiveKey(form({ durationSeconds: 30 * SECONDS_PER_DAY }), {
            now: NOW,
            account: ACCOUNT,
        })
        expect(key).not.toBeNull()
        expect(key!.endTime - key!.startTime).toBe(30 * SECONDS_PER_DAY)
        expect(key!.pool).toBe(POOL_ADDRESS)
        expect(key!.refundee).toBe(ACCOUNT)
    })

    it('returns null when anything required is missing', () => {
        expect(buildIncentiveKey(form({ pool: null }), { now: NOW, account: ACCOUNT })).toBeNull()
        expect(buildIncentiveKey(form(), { now: NOW, account: undefined })).toBeNull()
        expect(
            buildIncentiveKey(form({ durationSeconds: 0 }), { now: NOW, account: ACCOUNT })
        ).toBeNull()
        expect(
            buildIncentiveKey(form({ startMode: 'scheduled', scheduledStart: null }), {
                now: NOW,
                account: ACCOUNT,
            })
        ).toBeNull()
    })
})

describe('calculateRewardRate', () => {
    it('spreads the reward across the duration', () => {
        const rate = calculateRewardRate(10n ** 18n * 3000n, 18, 30 * SECONDS_PER_DAY)
        expect(rate.perDay).toBeCloseTo(100)
        expect(rate.perHour).toBeCloseTo(100 / 24)
    })

    it('respects token decimals', () => {
        const rate = calculateRewardRate(7_000_000n, 6, 7 * SECONDS_PER_DAY)
        expect(rate.perDay).toBeCloseTo(1)
    })

    it('returns zero instead of dividing by zero', () => {
        expect(calculateRewardRate(10n ** 18n, 18, 0)).toEqual({ perDay: 0, perHour: 0 })
        expect(calculateRewardRate(0n, 18, 100)).toEqual({ perDay: 0, perHour: 0 })
    })
})

describe('primaryError', () => {
    it('reports the earliest unmet step, not array order', () => {
        expect(primaryError(['DURATION_TOO_LONG', 'NO_POOL'])).toBe('NO_POOL')
    })

    it('returns null for a clean form', () => {
        expect(primaryError([])).toBeNull()
    })
})

describe('describeCreateIncentiveError', () => {
    it('renders caps as durations rather than seconds', () => {
        expect(
            describeCreateIncentiveError('DURATION_TOO_LONG', { limits: FALLBACK_STAKER_LIMITS })
        ).toBe('A farm can run for at most 730 days')
        expect(
            describeCreateIncentiveError('START_TOO_FAR', { limits: FALLBACK_STAKER_LIMITS })
        ).toBe('Start within 30 days from now')
    })

    it('names the token when the balance is short', () => {
        expect(
            describeCreateIncentiveError('REWARD_EXCEEDS_BALANCE', {
                limits: FALLBACK_STAKER_LIMITS,
                rewardSymbol: 'JUNO',
            })
        ).toBe('Not enough JUNO')
    })
})
