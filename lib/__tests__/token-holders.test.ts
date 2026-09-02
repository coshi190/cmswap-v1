import { describe, expect, it } from 'vitest'
import { toHolders } from '@/hooks/useTokenHolders'

describe('toHolders', () => {
    it('drops zero balances, dedupes by address and sorts descending', () => {
        const holders = toHolders([
            { address: '0xaaa', balance: '100' },
            { address: '0xbbb', balance: '0' },
            { address: '0xCCC', balance: '300' },
            { address: '0xccc', balance: '200' },
        ])

        expect(holders.map((h) => h.address)).toEqual(['0xccc', '0xaaa'])
        expect(holders.map((h) => h.balance)).toEqual([200n, 100n])
    })
})
