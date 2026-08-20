import { describe, it, expect } from 'vitest'
import { makePriceAt } from '../net-worth-history'

describe('makePriceAt', () => {
    it('returns the last price at or before a timestamp', () => {
        const priceAt = makePriceAt(
            [
                { timestamp: 10, price: 1 },
                { timestamp: 20, price: 2 },
                { timestamp: 30, price: 3 },
            ],
            null
        )
        expect(priceAt(5)).toBe(1)
        expect(priceAt(10)).toBe(1)
        expect(priceAt(25)).toBe(2)
        expect(priceAt(30)).toBe(3)
        expect(priceAt(999)).toBe(3)
    })

    it('falls back to the given price for an empty series', () => {
        expect(makePriceAt([], 7)(123)).toBe(7)
        expect(makePriceAt([], null)(123)).toBe(0)
    })
})
