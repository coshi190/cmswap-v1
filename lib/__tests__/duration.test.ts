import { describe, it, expect } from 'vitest'
import {
    durationToSeconds,
    durationFromSeconds,
    formatDuration,
    formatDurationShort,
    formatRelativeTime,
    formatRelativeTimeShort,
    toDateTimeLocalValue,
    fromDateTimeLocalValue,
    SECONDS_PER_DAY,
    SECONDS_PER_HOUR,
} from '@/lib/duration'

describe('durationToSeconds', () => {
    it('converts days and hours', () => {
        expect(durationToSeconds(30, 'days')).toBe(30 * SECONDS_PER_DAY)
        expect(durationToSeconds(12, 'hours')).toBe(12 * SECONDS_PER_HOUR)
    })

    it('supports fractional input', () => {
        expect(durationToSeconds(0.5, 'days')).toBe(SECONDS_PER_HOUR * 12)
    })

    it('clamps non-positive and non-finite input to zero', () => {
        expect(durationToSeconds(0, 'days')).toBe(0)
        expect(durationToSeconds(-5, 'days')).toBe(0)
        expect(durationToSeconds(Number.NaN, 'days')).toBe(0)
    })
})

describe('durationFromSeconds', () => {
    it('round-trips with durationToSeconds', () => {
        expect(durationFromSeconds(durationToSeconds(45, 'days'), 'days')).toBe(45)
        expect(durationFromSeconds(durationToSeconds(6, 'hours'), 'hours')).toBe(6)
    })
})

describe('formatDuration', () => {
    it('shows days alone when there is no hour remainder', () => {
        expect(formatDuration(30 * SECONDS_PER_DAY)).toBe('30 days')
    })

    it('shows at most two units', () => {
        expect(formatDuration(SECONDS_PER_DAY + 6 * SECONDS_PER_HOUR + 90)).toBe('1 day 6 hours')
    })

    it('singularises', () => {
        expect(formatDuration(SECONDS_PER_DAY)).toBe('1 day')
        expect(formatDuration(SECONDS_PER_HOUR)).toBe('1 hour')
        expect(formatDuration(60)).toBe('1 minute')
    })

    it('falls back to hours and minutes below a day', () => {
        expect(formatDuration(6 * SECONDS_PER_HOUR + 30 * 60)).toBe('6 hours 30 minutes')
        expect(formatDuration(45 * 60)).toBe('45 minutes')
    })

    it('shows seconds only below a minute', () => {
        expect(formatDuration(45)).toBe('45 seconds')
    })

    it('treats zero and negatives as no time', () => {
        expect(formatDuration(0)).toBe('0 minutes')
        expect(formatDuration(-100)).toBe('0 minutes')
    })

    it('renders the canonical two-year staker cap readably', () => {
        expect(formatDuration(63_072_000)).toBe('730 days')
    })
})

describe('formatDurationShort', () => {
    it('compacts each band', () => {
        expect(formatDurationShort(30 * SECONDS_PER_DAY)).toBe('30d')
        expect(formatDurationShort(SECONDS_PER_DAY + 6 * SECONDS_PER_HOUR)).toBe('1d 6h')
        expect(formatDurationShort(6 * SECONDS_PER_HOUR + 30 * 60)).toBe('6h 30m')
        expect(formatDurationShort(45 * 60)).toBe('45m')
    })
})

describe('formatRelativeTime', () => {
    const now = 1_700_000_000

    it('collapses sub-minute differences in both directions', () => {
        expect(formatRelativeTime(now + 30, now)).toBe('just now')
        expect(formatRelativeTime(now - 30, now)).toBe('just now')
    })

    it('prefixes future and suffixes past', () => {
        expect(formatRelativeTime(now + 3 * SECONDS_PER_DAY, now)).toBe('in 3 days')
        expect(formatRelativeTime(now - 2 * SECONDS_PER_HOUR, now)).toBe('2 hours ago')
    })

    it('has a short form that fits a button label', () => {
        expect(
            formatRelativeTimeShort(now + 29 * SECONDS_PER_DAY + 23 * SECONDS_PER_HOUR, now)
        ).toBe('in 29d 23h')
        expect(formatRelativeTimeShort(now - 2 * SECONDS_PER_HOUR, now)).toBe('2h ago')
        expect(formatRelativeTimeShort(now + 10, now)).toBe('now')
    })
})

describe('datetime-local conversion', () => {
    it('round-trips through the local-time input format', () => {
        const minuteAligned = Math.floor(1_700_000_000 / 60) * 60
        expect(fromDateTimeLocalValue(toDateTimeLocalValue(minuteAligned))).toBe(minuteAligned)
    })

    it('returns null for empty or unparseable input', () => {
        expect(fromDateTimeLocalValue('')).toBeNull()
        expect(fromDateTimeLocalValue('not-a-date')).toBeNull()
    })
})
