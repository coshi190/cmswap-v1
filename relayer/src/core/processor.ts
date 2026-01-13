import type { RelayerQueries } from '../db'
import type { Executor } from './executor'
import { logger } from '../utils/logger'

export async function processRequests(
    queries: RelayerQueries,
    executor: Executor,
    limit: number = 100
): Promise<{ processed: number; failed: number }> {
    const pendingRequests = queries.getPendingRequests(limit)

    if (pendingRequests.length === 0) {
        logger.debug('No pending requests to process')
        return { processed: 0, failed: 0 }
    }

    logger.info(`Processing ${pendingRequests.length} pending requests`)

    let processed = 0
    let failed = 0

    for (const request of pendingRequests) {
        const success = await executor.processRequest(request, queries)
        if (success) {
            processed++
        } else {
            failed++
        }
    }

    logger.info(`Processing complete`, { processed, failed })
    return { processed, failed }
}
