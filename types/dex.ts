export type DEXType = 'cmswap' | 'uniswap' | 'sushiswap' | string

export interface DEXMetadata {
    id: DEXType
    name: string
    displayName: string
    icon?: string
    description?: string
    website?: string
}

export const DEX_REGISTRY: Record<string, DEXMetadata> = {
    cmswap: {
        id: 'cmswap',
        name: 'cmswap',
        displayName: 'CMswap',
        icon: 'favicon.ico',
        description: 'Uniswap V3 DEX',
        website: 'https://cmswap.xyz',
    },
    jibswap: {
        id: 'jibswap',
        name: 'jibswap',
        displayName: 'Jibswap',
        description: 'Uniswap V2 DEX',
        website: 'https://jibswap.com',
    },
    commudao: {
        id: 'commudao',
        name: 'commudao',
        displayName: 'Commudao',
        description: 'Custom AMM',
    },
}
