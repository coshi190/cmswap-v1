export const WETH9_ABI = [
    {
        type: 'function',
        name: 'deposit',
        stateMutability: 'payable',
        inputs: [],
        outputs: [],
    },
    {
        type: 'function',
        name: 'withdraw',
        stateMutability: 'nonpayable',
        inputs: [{ name: 'wad', type: 'uint256' }],
        outputs: [],
    },
] as const

export type Weth9Abi = typeof WETH9_ABI
