/**
 * Uniswap V2 Pair ABI
 * Used for reserve queries and liquidity checks
 */
export const UNISWAP_V2_PAIR_ABI = [
    {
        type: 'function',
        name: 'getReserves',
        stateMutability: 'view',
        inputs: [],
        outputs: [
            { name: 'reserve0', type: 'uint112' },
            { name: 'reserve1', type: 'uint112' },
            { name: 'blockTimestampLast', type: 'uint32' },
        ],
    },
    {
        type: 'function',
        name: 'token0',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'address' }],
    },
    {
        type: 'function',
        name: 'token1',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'address' }],
    },
] as const

export type UniswapV2PairAbi = typeof UNISWAP_V2_PAIR_ABI
