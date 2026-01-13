import { z } from 'zod'
import type { Address } from 'viem'

const AddressSchema = z.string().startsWith('0x').length(42) as z.ZodType<Address>

const ChainConfigSchema = z.object({
    chainId: z.number(),
    name: z.string(),
    rpcUrl: z.string().url(),
    bridgeAddress: AddressSchema,
    confirmations: z.number().min(1),
    maxBlockRange: z.number().min(100),
    maxGasPriceGwei: z.number().positive(),
})

export type ChainConfig = z.infer<typeof ChainConfigSchema>

const ConfigSchema = z.object({
    chains: z.record(z.string(), ChainConfigSchema),
    relayerPrivateKey: z.string().startsWith('0x'),
    databasePath: z.string(),
    dryRun: z.boolean(),
})

export type Config = z.infer<typeof ConfigSchema>

export function loadConfig(): Config {
    const requiredEnv = (key: string): string => {
        const value = process.env[key]
        if (!value) {
            throw new Error(`Missing required environment variable: ${key}`)
        }
        return value
    }

    const config: Config = {
        chains: {
            kub: {
                chainId: 96,
                name: 'Bitkub Chain',
                rpcUrl: requiredEnv('RPC_URL_KUB'),
                bridgeAddress: requiredEnv('BRIDGE_ADDRESS_KUB') as Address,
                confirmations: 12,
                maxBlockRange: 1000,
                maxGasPriceGwei: Number(process.env.MAX_GAS_PRICE_KUB) || 100,
            },
            jbc: {
                chainId: 8899,
                name: 'JB Chain',
                rpcUrl: requiredEnv('RPC_URL_JBC'),
                bridgeAddress: requiredEnv('BRIDGE_ADDRESS_JBC') as Address,
                confirmations: 12,
                maxBlockRange: 1000,
                maxGasPriceGwei: Number(process.env.MAX_GAS_PRICE_JBC) || 100,
            },
            bsc: {
                chainId: 56,
                name: 'BNB Chain',
                rpcUrl: requiredEnv('RPC_URL_BSC'),
                bridgeAddress: requiredEnv('BRIDGE_ADDRESS_BSC') as Address,
                confirmations: 15,
                maxBlockRange: 5000,
                maxGasPriceGwei: Number(process.env.MAX_GAS_PRICE_BSC) || 10,
            },
        },
        relayerPrivateKey: requiredEnv('RELAYER_PRIVATE_KEY'),
        databasePath: process.env.DATABASE_PATH || './data/relayer.db',
        dryRun: process.env.DRY_RUN === 'true',
    }

    const result = ConfigSchema.safeParse(config)
    if (!result.success) {
        console.error('Configuration validation failed:')
        console.error(result.error.format())
        process.exit(1)
    }

    return result.data
}

export function getChainConfig(config: Config, chainId: number): ChainConfig | undefined {
    return Object.values(config.chains).find((c) => c.chainId === chainId)
}
