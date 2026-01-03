import { http, createConfig } from 'wagmi'
import { cookieStorage, createStorage } from 'wagmi'
import { bsc, bitkub, bitkubTestnet, jbc, base, worldchain } from 'wagmi/chains'

// Get projectId from Reown (formerly WalletConnect)
// Get your project ID at https://cloud.reown.com
export const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID || 'demo-project-id'

// Supported chains for cmswap
export const supportedChains = [bsc, bitkub, bitkubTestnet, jbc, base, worldchain] as const

// Default chain for the app
export const defaultChain = base

// Alchemy RPC configuration (add your API key to .env.local)
const _alchemyApiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || ''

// Configure RPC URLs
const rpcUrls = {
    [bsc.id]: 'https://56.rpc.thirdweb.com',
    [bitkub.id]: 'https://rpc.bitkubchain.io',
    [bitkubTestnet.id]: 'https://rpc-testnet.bitkubchain.io',
    [jbc.id]: 'https://rpc-l1.jibchain.net',
    [base.id]: 'https://mainnet.base.org',
    [worldchain.id]: 'https://worldchain-mainnet.g.alchemy.com/public',
}

// Wagmi configuration for cmswap
export const wagmiConfig = createConfig({
    chains: supportedChains,
    transports: {
        [bsc.id]: http(rpcUrls[bsc.id]),
        [bitkub.id]: http(rpcUrls[bitkub.id]),
        [bitkubTestnet.id]: http(rpcUrls[bitkubTestnet.id]),
        [jbc.id]: http(rpcUrls[jbc.id]),
        [base.id]: http(rpcUrls[base.id]),
        [worldchain.id]: http(rpcUrls[worldchain.id]),
    },
    ssr: true,
    storage: createStorage({
        storage: cookieStorage,
    }),
})

// Chain IDs for easy reference
export const chainIds = {
    bsc: bsc.id,
    bitkub: bitkub.id,
    bitkubTestnet: bitkubTestnet.id,
    jbc: jbc.id,
    base: base.id,
    worldchain: worldchain.id,
} as const

// Chain metadata for UI display
export const chainMetadata = {
    [bsc.id]: {
        name: 'BNB Chain',
        symbol: 'BNB',
        icon: '/chains/bnbchain.svg',
        explorer: 'https://bscscan.com',
    },
    [bitkub.id]: {
        name: 'KUB Chain',
        symbol: 'KUB',
        icon: '/chains/kubchain.png',
        explorer: 'https://www.bkcscan.com',
    },
    [bitkubTestnet.id]: {
        name: 'KUB Testnet',
        symbol: 'tKUB',
        icon: '/chains/kubchain.png',
        explorer: 'https://testnet.bkcscan.com',
    },
    [jbc.id]: {
        name: 'JB Chain',
        symbol: 'JBC',
        icon: '/chains/jbchain.png',
        explorer: 'https://exp-l1.jibchain.net',
    },
    [base.id]: {
        name: 'Base',
        symbol: 'ETH',
        icon: '/chains/base.svg',
        explorer: 'https://basescan.org',
    },
    [worldchain.id]: {
        name: 'Worldchain',
        symbol: 'ETH',
        icon: '/chains/worldchain.svg',
        explorer: 'https://worldchain-mainnet.explorer.alchemy.com',
    },
} as const

// Get chain metadata by ID
export function getChainMetadata(chainId: number) {
    return chainMetadata[chainId as keyof typeof chainMetadata]
}
