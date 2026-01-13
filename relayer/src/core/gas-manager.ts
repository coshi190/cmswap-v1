import type { PublicClient } from 'viem'
import { parseGwei } from 'viem'
import type { ChainConfig } from '../config'
import { logger } from '../utils/logger'

export interface GasParams {
    gasPrice: bigint
    gas: bigint
}

// Cache gas prices for 10 seconds
const gasPriceCache = new Map<number, { price: bigint; timestamp: number }>()
const CACHE_TTL_MS = 10000

export async function getGasParams(client: PublicClient, config: ChainConfig): Promise<GasParams> {
    const chainId = config.chainId
    const maxGasPrice = parseGwei(config.maxGasPriceGwei.toString())

    // Check cache
    const cached = gasPriceCache.get(chainId)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return {
            gasPrice: cached.price,
            gas: 200000n,
        }
    }

    // Get gas price from chain
    let gasPrice = await client.getGasPrice()

    // Add 20% buffer
    gasPrice = (gasPrice * 120n) / 100n

    // Cap at maximum
    if (gasPrice > maxGasPrice) {
        logger.warn(`Gas price capped on chain ${chainId}`, {
            original: gasPrice.toString(),
            capped: maxGasPrice.toString(),
        })
        gasPrice = maxGasPrice
    }

    // Update cache
    gasPriceCache.set(chainId, { price: gasPrice, timestamp: Date.now() })

    return {
        gasPrice,
        gas: 200000n,
    }
}
