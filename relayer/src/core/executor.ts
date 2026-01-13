import {
    createPublicClient,
    createWalletClient,
    http,
    defineChain,
    type PublicClient,
    type WalletClient,
    type Address,
    type Account,
    type Chain,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { TBridgeV2ABI } from '../abi/tbridge-v2'
import type { Config, ChainConfig } from '../config'
import type { BridgeRequest, RelayerQueries } from '../db'
import { getGasParams } from './gas-manager'
import { logger } from '../utils/logger'
import {
    withRetry,
    isNonceAlreadyProcessedError,
    isInsufficientLiquidityError,
} from '../utils/retry'

// Define chains for viem
const kubChain = defineChain({
    id: 96,
    name: 'Bitkub Chain',
    nativeCurrency: { name: 'KUB', symbol: 'KUB', decimals: 18 },
    rpcUrls: { default: { http: ['https://rpc.bitkubchain.io'] } },
})

const jbcChain = defineChain({
    id: 8899,
    name: 'JB Chain',
    nativeCurrency: { name: 'JBC', symbol: 'JBC', decimals: 18 },
    rpcUrls: { default: { http: ['https://rpc-l1.jibchain.net'] } },
})

const bscChain = defineChain({
    id: 56,
    name: 'BNB Chain',
    nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
    rpcUrls: { default: { http: ['https://bsc-dataseed1.binance.org'] } },
})

const chainMap: Record<number, Chain> = {
    96: kubChain,
    8899: jbcChain,
    56: bscChain,
}

interface ChainClients {
    public: PublicClient
    wallet: WalletClient
    config: ChainConfig
    chain: Chain
}

export class Executor {
    private clients: Map<number, ChainClients> = new Map()
    private account: Account
    private dryRun: boolean

    constructor(config: Config) {
        this.account = privateKeyToAccount(config.relayerPrivateKey as `0x${string}`)
        this.dryRun = config.dryRun

        for (const [, chainConfig] of Object.entries(config.chains)) {
            const transport = http(chainConfig.rpcUrl)
            const chain = chainMap[chainConfig.chainId]

            if (!chain) {
                throw new Error(`No chain definition for chainId ${chainConfig.chainId}`)
            }

            this.clients.set(chainConfig.chainId, {
                public: createPublicClient({ chain, transport }),
                wallet: createWalletClient({ chain, transport, account: this.account }),
                config: chainConfig,
                chain,
            })
        }

        logger.info(`Executor initialized`, {
            address: this.account.address,
            dryRun: this.dryRun,
            chains: Array.from(this.clients.keys()),
        })
    }

    getRelayerAddress(): Address {
        return this.account.address
    }

    async processRequest(request: BridgeRequest, queries: RelayerQueries): Promise<boolean> {
        const destClients = this.clients.get(request.destChain)
        if (!destClients) {
            logger.error(`No client for destination chain`, { destChain: request.destChain })
            return false
        }

        const {
            public: publicClient,
            wallet: walletClient,
            config: destConfig,
            chain,
        } = destClients

        try {
            // Check if already processed on-chain
            const isProcessed = await publicClient.readContract({
                address: destConfig.bridgeAddress,
                abi: TBridgeV2ABI,
                functionName: 'isNonceProcessed',
                args: [BigInt(request.sourceChain), BigInt(request.nonce)],
            })

            if (isProcessed) {
                logger.info(`Nonce already processed, skipping`, {
                    sourceChain: request.sourceChain,
                    nonce: request.nonce,
                })
                queries.updateStatus(request.sourceChain, request.nonce, 'skipped')
                return true
            }

            // Dry run mode - just log what would happen
            if (this.dryRun) {
                logger.info(`[DRY RUN] Would call releaseFunds`, {
                    destChain: request.destChain,
                    nonce: request.nonce,
                    sourceChain: request.sourceChain,
                    token: request.token,
                    recipient: request.recipient,
                    amount: request.amount,
                })
                return true
            }

            // Execute releaseFunds with retry
            const txHash = await withRetry(
                async () => {
                    const gasParams = await getGasParams(publicClient, destConfig)

                    logger.info(`Executing releaseFunds`, {
                        destChain: request.destChain,
                        nonce: request.nonce,
                        recipient: request.recipient,
                        amount: request.amount,
                    })

                    const hash = await walletClient.writeContract({
                        chain,
                        account: this.account,
                        address: destConfig.bridgeAddress,
                        abi: TBridgeV2ABI,
                        functionName: 'releaseFunds',
                        args: [
                            BigInt(request.nonce),
                            BigInt(request.sourceChain),
                            request.token,
                            request.recipient,
                            BigInt(request.amount),
                        ],
                        ...gasParams,
                    })

                    // Wait for confirmation
                    const receipt = await publicClient.waitForTransactionReceipt({
                        hash,
                        confirmations: 1,
                    })

                    if (receipt.status === 'reverted') {
                        throw new Error(`Transaction reverted: ${hash}`)
                    }

                    return hash
                },
                { maxRetries: 3, baseDelayMs: 2000, maxDelayMs: 15000 },
                `releaseFunds-${request.sourceChain}-${request.nonce}`
            )

            logger.info(`releaseFunds successful`, {
                sourceChain: request.sourceChain,
                nonce: request.nonce,
                destTxHash: txHash,
            })

            queries.updateStatus(request.sourceChain, request.nonce, 'completed', txHash)
            return true
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)

            if (isNonceAlreadyProcessedError(error)) {
                logger.info(`Nonce already processed (from error)`, {
                    sourceChain: request.sourceChain,
                    nonce: request.nonce,
                })
                queries.updateStatus(request.sourceChain, request.nonce, 'skipped')
                return true
            }

            if (isInsufficientLiquidityError(error)) {
                logger.warn(`Insufficient liquidity, will retry later`, {
                    sourceChain: request.sourceChain,
                    nonce: request.nonce,
                    destChain: request.destChain,
                })
                // Keep as pending, don't increment retry count
                return false
            }

            logger.error(`Failed to process request`, {
                sourceChain: request.sourceChain,
                nonce: request.nonce,
                error: errorMessage,
            })

            queries.updateStatus(
                request.sourceChain,
                request.nonce,
                'failed',
                undefined,
                errorMessage
            )
            return false
        }
    }
}
