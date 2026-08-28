import { describe, it, expect } from 'vitest'
import { defaultFeeTier, formatFeeTier, v3FeeTiers } from '@/lib/liquidity-helpers'

const BSC = 56
const KUB = 96
const NO_V3_CHAIN = 137

describe('lib/liquidity-helpers', () => {
    describe('v3FeeTiers', () => {
        // getDexConfig defaults to junoswap, which has no V3 on BSC/Base/Worldchain. Resolving the
        // chain's own V3 DEX is what keeps the fee dropdown from rendering empty there.
        it('reads the tiers off the chain’s own V3 DEX, not the default one', () => {
            expect(v3FeeTiers(BSC)).toEqual([100, 500, 2500, 10000])
        })

        it('falls back to the standard tiers on a chain with no V3 deployment', () => {
            expect(v3FeeTiers(NO_V3_CHAIN)).toEqual([100, 500, 3000, 10000])
        })
    })

    describe('defaultFeeTier', () => {
        it('snaps to the nearest offered tier when the preferred 3000 is absent', () => {
            expect(defaultFeeTier(BSC)).toBe(2500)
        })

        it('keeps the preferred tier on a chain that offers it', () => {
            expect(defaultFeeTier(KUB)).toBe(3000)
        })
    })

    describe('formatFeeTier', () => {
        it('renders hundredths of a bip as a percentage', () => {
            expect(formatFeeTier(2500)).toBe('0.25%')
        })
    })
})
