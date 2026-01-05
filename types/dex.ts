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
        description: 'Best prices on KUB Chain',
        website: 'https://cmswap.xyz',
    },
}
