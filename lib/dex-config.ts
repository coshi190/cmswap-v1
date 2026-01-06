import type { Address } from 'viem'
import type { DEXType } from '@/types/dex'
import { kubTestnet, jbc } from './wagmi'

/**
 * Protocol types supported by the DEX system
 */
export enum ProtocolType {
    V2 = 'v2',
    V3 = 'v3',
    STABLE = 'stable',
    AGGREGATOR = 'aggregator',
}

/**
 * Base configuration interface for all protocol types
 */
export interface BaseProtocolConfig {
    protocolType: ProtocolType
    chainId: number
    enabled: boolean
}

/**
 * Uniswap V2 protocol configuration
 * Used for constant product AMM DEXs
 */
export interface V2Config extends BaseProtocolConfig {
    protocolType: ProtocolType.V2
    factory: Address
    router: Address
    wnative?: Address
}

/**
 * Uniswap V3 protocol configuration
 * Used for concentrated liquidity AMM DEXs
 */
export interface V3Config extends BaseProtocolConfig {
    protocolType: ProtocolType.V3
    factory: Address
    quoter: Address
    swapRouter: Address
    feeTiers?: number[]
    defaultFeeTier?: number
}

/**
 * Stable swap protocol configuration
 * Used for stable coin DEXs like Curve
 */
export interface StableConfig extends BaseProtocolConfig {
    protocolType: ProtocolType.STABLE
    registry: Address
    poolFinder?: Address
    basePool?: Address
}

/**
 * Aggregator protocol configuration
 * Used for DEX aggregators like 1inch
 */
export interface AggregatorConfig extends BaseProtocolConfig {
    protocolType: ProtocolType.AGGREGATOR
    aggregator: Address
    apiEndpoint?: string
}

/**
 * Union type of all protocol configurations
 */
export type ProtocolConfig = V2Config | V3Config | StableConfig | AggregatorConfig

/**
 * DEX configuration containing all protocols supported by a DEX
 */
export interface DEXConfiguration {
    dexId: DEXType
    defaultProtocol: ProtocolType
    priority?: number
    protocols: Record<number, Partial<Record<ProtocolType, ProtocolConfig>>>
}

/**
 * Fee tiers for Uniswap V3 pools
 */
export const FEE_TIERS = {
    STABLE: 100, // 0.01%
    LOW: 500, // 0.05%
    MEDIUM: 3000, // 0.3% (standard)
    HIGH: 10000, // 1%
} as const

export type FeeTier = (typeof FEE_TIERS)[keyof typeof FEE_TIERS]

/**
 * Unified DEX configuration registry
 */
export const DEX_CONFIGS_REGISTRY: Record<DEXType, DEXConfiguration> = {
    cmswap: {
        dexId: 'cmswap',
        defaultProtocol: ProtocolType.V3,
        priority: 1,
        protocols: {
            [kubTestnet.id]: {
                [ProtocolType.V3]: {
                    protocolType: ProtocolType.V3,
                    chainId: kubTestnet.id,
                    enabled: true,
                    factory: '0xCBd41F872FD46964bD4Be4d72a8bEBA9D656565b' as Address,
                    quoter: '0x3F64C4Dfd224a102A4d705193a7c40899Cf21fFe' as Address,
                    swapRouter: '0x3C5514335dc4E2B0D9e1cc98ddE219c50173c5Be' as Address,
                    feeTiers: [FEE_TIERS.STABLE, FEE_TIERS.LOW, FEE_TIERS.MEDIUM, FEE_TIERS.HIGH],
                    defaultFeeTier: FEE_TIERS.MEDIUM,
                },
            },
            [jbc.id]: {
                [ProtocolType.V3]: {
                    protocolType: ProtocolType.V3,
                    chainId: jbc.id,
                    enabled: true,
                    factory: '0x5835f123bDF137864263bf204Cf4450aAD1Ba3a7' as Address,
                    quoter: '0x5ad32c64A2aEd381299061F32465A22B1f7A2EE2' as Address,
                    swapRouter: '0x2174b3346CCEdBB4Faaff5d8088ff60B74909A9d' as Address,
                    feeTiers: [FEE_TIERS.STABLE, FEE_TIERS.LOW, FEE_TIERS.MEDIUM, FEE_TIERS.HIGH],
                    defaultFeeTier: FEE_TIERS.MEDIUM,
                },
            },
        },
    },
    jibswap: {
        dexId: 'jibswap',
        defaultProtocol: ProtocolType.V2,
        priority: 2,
        protocols: {
            [jbc.id]: {
                [ProtocolType.V2]: {
                    protocolType: ProtocolType.V2,
                    chainId: jbc.id,
                    enabled: true,
                    factory: '0x4BBdA880C5A0cDcEc6510f0450c6C8bC5773D499' as Address,
                    router: '0x766F8C9321704DC228D43271AF9b7aAB0E529D38' as Address,
                    wnative: '0x99999999990FC47611b74827486218f3398A4abD' as Address,
                },
            },
        },
    },
}

/**
 * Get V3 protocol configuration with type narrowing
 */
export function getV3Config(chainId: number, dexId?: DEXType): V3Config | undefined {
    const targetDex = dexId || 'cmswap'
    const dexConfig = DEX_CONFIGS_REGISTRY[targetDex]

    if (!dexConfig) {
        return undefined
    }

    const chainProtocols = dexConfig.protocols[chainId]
    if (!chainProtocols) {
        return undefined
    }

    const config = chainProtocols[ProtocolType.V3]
    return config?.protocolType === ProtocolType.V3 && config.enabled ? config : undefined
}

/**
 * Get V2 protocol configuration with type narrowing
 */
export function getV2Config(chainId: number, dexId?: DEXType): V2Config | undefined {
    const targetDex = dexId || 'cmswap'
    const dexConfig = DEX_CONFIGS_REGISTRY[targetDex]

    if (!dexConfig) {
        return undefined
    }

    const chainProtocols = dexConfig.protocols[chainId]
    if (!chainProtocols) {
        return undefined
    }

    const config = chainProtocols[ProtocolType.V2]
    return config?.protocolType === ProtocolType.V2 && config.enabled ? config : undefined
}

/**
 * Get protocol configuration for a specific DEX, chain, and protocol type
 */
export function getProtocolConfig<T extends ProtocolType>(
    chainId: number,
    dexId?: DEXType,
    protocolType?: T
): Extract<ProtocolConfig, { protocolType: T }> | undefined {
    const targetDex = dexId || 'cmswap'
    const dexConfig = DEX_CONFIGS_REGISTRY[targetDex]

    if (!dexConfig) {
        return undefined
    }

    const targetProtocol = protocolType || dexConfig.defaultProtocol
    const chainProtocols = dexConfig.protocols[chainId]

    if (!chainProtocols) {
        return undefined
    }

    const config = chainProtocols[targetProtocol]
    return (config?.enabled ? config : undefined) as
        | Extract<ProtocolConfig, { protocolType: T }>
        | undefined
}

/**
 * Get default protocol configuration for a DEX on a chain
 */
export function getDexConfig(chainId: number, dexId?: DEXType): ProtocolConfig | undefined {
    const targetDex = dexId || 'cmswap'
    const dexConfig = DEX_CONFIGS_REGISTRY[targetDex]

    if (!dexConfig) {
        return undefined
    }

    const chainProtocols = dexConfig.protocols[chainId]
    if (!chainProtocols) {
        return undefined
    }

    return chainProtocols[dexConfig.defaultProtocol]
}

/**
 * Check if a DEX supports a specific protocol on a chain
 */
export function supportsProtocol(
    chainId: number,
    protocolType: ProtocolType,
    dexId?: DEXType
): boolean {
    const targetDex = dexId || 'cmswap'
    const dexConfig = DEX_CONFIGS_REGISTRY[targetDex]

    if (!dexConfig) {
        return false
    }

    const chainProtocols = dexConfig.protocols[chainId]
    if (!chainProtocols) {
        return false
    }

    const protocol = chainProtocols[protocolType]
    return protocol?.enabled ?? false
}

/**
 * Check if DEX is available on a chain (supports any protocol)
 */
export function isDexSupported(chainId: number, dexId?: DEXType): boolean {
    const targetDex = dexId || 'cmswap'
    const dexConfig = DEX_CONFIGS_REGISTRY[targetDex]

    if (!dexConfig) {
        return false
    }

    const chainProtocols = dexConfig.protocols[chainId]
    if (!chainProtocols) {
        return false
    }

    return Object.values(chainProtocols).some((protocol) => protocol.enabled)
}

/**
 * Get all supported protocols for a DEX on a chain
 */
export function getSupportedProtocols(chainId: number, dexId?: DEXType): ProtocolType[] {
    const targetDex = dexId || 'cmswap'
    const dexConfig = DEX_CONFIGS_REGISTRY[targetDex]

    if (!dexConfig) {
        return []
    }

    const chainProtocols = dexConfig.protocols[chainId]
    if (!chainProtocols) {
        return []
    }

    return Object.values(chainProtocols)
        .filter((protocol) => protocol.enabled)
        .map((protocol) => protocol.protocolType)
}

/**
 * Get all DEXs that support a specific protocol on a chain
 */
export function getDexsByProtocol(chainId: number, protocolType: ProtocolType): DEXType[] {
    return Object.entries(DEX_CONFIGS_REGISTRY)
        .filter(([_, dexConfig]) => {
            const chainProtocols = dexConfig.protocols[chainId]
            if (!chainProtocols) return false

            const protocol = chainProtocols[protocolType]
            return protocol?.enabled ?? false
        })
        .map(([dexId, _]) => dexId as DEXType)
        .sort((a, b) => {
            const priorityA = DEX_CONFIGS_REGISTRY[a]?.priority ?? 999
            const priorityB = DEX_CONFIGS_REGISTRY[b]?.priority ?? 999
            return priorityA - priorityB
        })
}

/**
 * Get all supported DEXs for a chain (any protocol)
 */
export function getSupportedDexs(chainId: number): DEXType[] {
    return Object.entries(DEX_CONFIGS_REGISTRY)
        .filter(([_, dexConfig]) => {
            const chainProtocols = dexConfig.protocols[chainId]
            if (!chainProtocols) return false

            return Object.values(chainProtocols).some((protocol) => protocol.enabled)
        })
        .map(([dexId, _]) => dexId as DEXType)
        .sort((a, b) => {
            const priorityA = DEX_CONFIGS_REGISTRY[a]?.priority ?? 999
            const priorityB = DEX_CONFIGS_REGISTRY[b]?.priority ?? 999
            return priorityA - priorityB
        })
}

/**
 * Type guard to check if config is V2Config
 */
export function isV2Config(config: ProtocolConfig): config is V2Config {
    return config.protocolType === ProtocolType.V2
}

/**
 * Type guard to check if config is V3Config
 */
export function isV3Config(config: ProtocolConfig): config is V3Config {
    return config.protocolType === ProtocolType.V3
}

/**
 * Type guard to check if config is StableConfig
 */
export function isStableConfig(config: ProtocolConfig): config is StableConfig {
    return config.protocolType === ProtocolType.STABLE
}

/**
 * Type guard to check if config is AggregatorConfig
 */
export function isAggregatorConfig(config: ProtocolConfig): config is AggregatorConfig {
    return config.protocolType === ProtocolType.AGGREGATOR
}

/**
 * Get the spender address for token approval based on protocol type
 * Different protocols use different contract addresses for approvals:
 * - V2: router
 * - V3: swapRouter
 * - Aggregator: aggregator
 * - Stable: registry (typically)
 *
 * @param config Protocol configuration
 * @returns Spender address or undefined if config is invalid
 */
export function getProtocolSpender(config: ProtocolConfig): Address | undefined {
    switch (config.protocolType) {
        case ProtocolType.V2:
            return config.router
        case ProtocolType.V3:
            return config.swapRouter
        case ProtocolType.AGGREGATOR:
            return config.aggregator
        case ProtocolType.STABLE:
            return config.registry
        default:
            return undefined
    }
}

/**
 * Default fee tier to use (0.3% is most common)
 */
export const DEFAULT_FEE_TIER = FEE_TIERS.MEDIUM

/**
 * Common fee tiers to try when finding pools
 */
export const COMMON_FEE_TIERS = [
    FEE_TIERS.MEDIUM, // 0.3%
    FEE_TIERS.LOW, // 0.05%
    FEE_TIERS.HIGH, // 1%
    FEE_TIERS.STABLE, // 0.01%
] as const
