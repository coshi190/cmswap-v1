export const TBridgeV2ABI = [
    // Events
    {
        type: 'event',
        name: 'BridgeInitiated',
        inputs: [
            { name: 'nonce', type: 'uint256', indexed: true },
            { name: 'token', type: 'address', indexed: true },
            { name: 'sender', type: 'address', indexed: true },
            { name: 'recipient', type: 'address', indexed: false },
            { name: 'sourceChain', type: 'uint256', indexed: false },
            { name: 'destChain', type: 'uint256', indexed: false },
            { name: 'amount', type: 'uint256', indexed: false },
            { name: 'bridgeFee', type: 'uint256', indexed: false },
            { name: 'protocolFee', type: 'uint256', indexed: false },
            { name: 'timestamp', type: 'uint256', indexed: false },
        ],
    },
    {
        type: 'event',
        name: 'BridgeCompleted',
        inputs: [
            { name: 'nonce', type: 'uint256', indexed: true },
            { name: 'sourceChain', type: 'uint256', indexed: true },
            { name: 'token', type: 'address', indexed: true },
            { name: 'recipient', type: 'address', indexed: false },
            { name: 'amount', type: 'uint256', indexed: false },
            { name: 'timestamp', type: 'uint256', indexed: false },
        ],
    },
    // Functions
    {
        type: 'function',
        name: 'releaseFunds',
        inputs: [
            { name: 'nonce', type: 'uint256' },
            { name: 'sourceChain', type: 'uint256' },
            { name: 'token', type: 'address' },
            { name: 'recipient', type: 'address' },
            { name: 'amount', type: 'uint256' },
        ],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'isNonceProcessed',
        inputs: [
            { name: 'sourceChain', type: 'uint256' },
            { name: 'nonce', type: 'uint256' },
        ],
        outputs: [{ name: '', type: 'bool' }],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'chainId',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
    },
] as const
