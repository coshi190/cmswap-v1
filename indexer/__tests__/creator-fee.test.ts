import { describe, it, expect } from 'vitest'
import { creatorFeeNativeForSwap, pumpFeeFromNetAmountIn, VIRTUAL_AMOUNT } from '../src/creator-fee'

const E18 = 10n ** 18n

describe('pumpFeeFromNetAmountIn', () => {
    it('reconstructs the 1% fee the contract deducted from the gross amount', () => {
        // Contract: gross = 100 KUB → fee = 1 KUB, net (emitted) = 99 KUB
        const gross = 100n * E18
        const contractFee = (gross * 100n) / 10000n
        const net = gross - contractFee
        expect(pumpFeeFromNetAmountIn(net)).toBe(contractFee)
    })

    it('returns 0 for zero or negative input', () => {
        expect(pumpFeeFromNetAmountIn(0n)).toBe(0n)
        expect(pumpFeeFromNetAmountIn(-5n)).toBe(0n)
    })
})

describe('creatorFeeNativeForSwap', () => {
    it('gives the creator half the native fee on buys', () => {
        // net amountIn 99 KUB → pump fee 1 KUB → creator share 0.5 KUB
        const net = 99n * E18
        const fee = creatorFeeNativeForSwap(true, net, 0n, 0n)
        expect(fee).toBe(E18 / 2n)
    })

    it('converts token-denominated sell fees to native at the curve price', () => {
        // Post-trade reserves: 800M tokens, 1600 KUB native.
        // Curve price = (3400 + 1600) / 800M = 6.25e-6 KUB per token.
        const tokenReserve = 800_000_000n * E18
        const nativeReserve = 1600n * E18
        // net token amountIn 9.9M → token fee 100k tokens → 0.625 KUB → creator 0.3125 KUB
        const net = 9_900_000n * E18
        const fee = creatorFeeNativeForSwap(false, net, tokenReserve, nativeReserve)
        const expectedFeeTokens = 100_000n * E18
        const expectedNative = (expectedFeeTokens * (VIRTUAL_AMOUNT + nativeReserve)) / tokenReserve
        expect(fee).toBe(expectedNative / 2n)
        expect(fee).toBe((3125n * E18) / 10000n) // 0.3125 KUB
    })

    it('returns 0 when the sell has an empty token reserve', () => {
        expect(creatorFeeNativeForSwap(false, 100n * E18, 0n, 1600n * E18)).toBe(0n)
    })
})
