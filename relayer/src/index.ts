import { loadConfig } from './config'
import { initDatabase } from './db'
import { scanChain, createClient } from './core/scanner'
import { processRequests } from './core/processor'
import { Executor } from './core/executor'
import { acquireLock, releaseLock } from './utils/lock'
import { logger } from './utils/logger'

async function main(): Promise<void> {
    const startTime = Date.now()
    logger.info('TBridge Relayer starting...')

    // 1. Acquire lock (exit if another instance is running)
    if (!acquireLock()) {
        logger.info('Another instance is running, exiting')
        process.exit(0)
    }

    try {
        // 2. Load configuration
        const config = loadConfig()
        logger.info('Configuration loaded', {
            chains: Object.keys(config.chains),
            dryRun: config.dryRun,
        })

        // 3. Initialize database
        const { db, queries } = initDatabase(config.databasePath)
        logger.info('Database initialized')

        // 4. Scan all chains for new events
        let totalEvents = 0
        for (const [name, chainConfig] of Object.entries(config.chains)) {
            try {
                const client = createClient(chainConfig)
                const events = await scanChain(chainConfig, client, queries)
                totalEvents += events.length
            } catch (error) {
                logger.error(`Failed to scan chain ${name}`, {
                    chainId: chainConfig.chainId,
                    error: error instanceof Error ? error.message : String(error),
                })
            }
        }

        logger.info(`Scan complete`, { totalEvents })

        // 5. Process pending requests
        const executor = new Executor(config)
        const { processed, failed } = await processRequests(queries, executor)

        // 6. Log stats
        const stats = queries.getStats()
        const duration = Date.now() - startTime

        logger.info('Relayer run complete', {
            duration: `${duration}ms`,
            newEvents: totalEvents,
            processed,
            failed,
            totalPending: stats.pending,
            totalCompleted: stats.completed,
            totalFailed: stats.failed,
        })

        // 7. Close database
        db.close()
    } catch (error) {
        logger.error('Fatal error', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
        })
        process.exit(1)
    } finally {
        // 8. Release lock
        releaseLock()
    }
}

// Run
main().catch((error) => {
    logger.error('Unhandled error', {
        error: error instanceof Error ? error.message : String(error),
    })
    releaseLock()
    process.exit(1)
})
