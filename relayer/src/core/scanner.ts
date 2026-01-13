import { createPublicClient, http, type PublicClient, type Address, type Hash } from 'viem'
import type { ChainConfig } from '../config'
import type { RelayerQueries, NewBridgeRequest } from '../db'
import { logger } from '../utils/logger'

export interface BridgeInitiatedEvent {
    nonce: bigint
    token: Address
    sender: Address
    recipient: Address
    sourceChain: bigint
    destChain: bigint
    amount: bigint
    bridgeFee: bigint
    protocolFee: bigint
    timestamp: bigint
    blockNumber: bigint
    transactionHash: Hash
}

export function createClient(config: ChainConfig): PublicClient {
    return createPublicClient({
        transport: http(config.rpcUrl),
    })
}

async function getStartBlock(
    chainId: number,
    queries: RelayerQueries,
    client: PublicClient
): Promise<bigint> {
    // 1. Check database for last processed block
    const checkpoint = queries.getCheckpoint(chainId)
    if (checkpoint !== null) {
        return checkpoint
    }

    // 2. Check environment variable
    const envStart = process.env[`START_BLOCK_${chainId}`]
    if (envStart) {
        return BigInt(envStart)
    }

    // 3. Default: start from current block minus safety margin
    const currentBlock = await client.getBlockNumber()
    return currentBlock - 100n
}

export async function scanChain(
    config: ChainConfig,
    client: PublicClient,
    queries: RelayerQueries
): Promise<BridgeInitiatedEvent[]> {
    const startBlock = await getStartBlock(config.chainId, queries, client)
    const currentBlock = await client.getBlockNumber()
    const safeBlock = currentBlock - BigInt(config.confirmations)

    if (safeBlock <= startBlock) {
        logger.debug(`No new blocks to scan on ${config.name}`, {
            startBlock: startBlock.toString(),
            safeBlock: safeBlock.toString(),
        })
        return []
    }

    // Limit block range to avoid RPC timeouts
    const fromBlock = startBlock + 1n
    const toBlock =
        safeBlock - fromBlock > BigInt(config.maxBlockRange)
            ? fromBlock + BigInt(config.maxBlockRange)
            : safeBlock

    logger.info(`Scanning ${config.name}`, {
        fromBlock: fromBlock.toString(),
        toBlock: toBlock.toString(),
        blocks: (toBlock - fromBlock + 1n).toString(),
    })

    const logs = await client.getLogs({
        address: config.bridgeAddress,
        event: {
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
        fromBlock,
        toBlock,
    })

    const events: BridgeInitiatedEvent[] = []

    for (const log of logs) {
        const event: BridgeInitiatedEvent = {
            nonce: log.args.nonce!,
            token: log.args.token!,
            sender: log.args.sender!,
            recipient: log.args.recipient!,
            sourceChain: log.args.sourceChain!,
            destChain: log.args.destChain!,
            amount: log.args.amount!,
            bridgeFee: log.args.bridgeFee!,
            protocolFee: log.args.protocolFee!,
            timestamp: log.args.timestamp!,
            blockNumber: log.blockNumber,
            transactionHash: log.transactionHash,
        }

        events.push(event)

        // Insert into database
        const request: NewBridgeRequest = {
            nonce: event.nonce.toString(),
            sourceChain: Number(event.sourceChain),
            destChain: Number(event.destChain),
            token: event.token,
            sender: event.sender,
            recipient: event.recipient,
            amount: event.amount.toString(),
            sourceBlockNumber: event.blockNumber.toString(),
            sourceTxHash: event.transactionHash,
        }

        const id = queries.insertRequest(request)
        if (id !== null) {
            logger.info(`New bridge request detected`, {
                nonce: event.nonce.toString(),
                sourceChain: event.sourceChain.toString(),
                destChain: event.destChain.toString(),
                amount: event.amount.toString(),
                txHash: event.transactionHash,
            })
        }
    }

    // Update checkpoint
    queries.saveCheckpoint(config.chainId, toBlock)

    if (events.length > 0) {
        logger.info(`Found ${events.length} bridge events on ${config.name}`)
    }

    return events
}
