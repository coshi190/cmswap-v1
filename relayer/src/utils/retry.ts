import { logger } from './logger'

export interface RetryConfig {
    maxRetries: number
    baseDelayMs: number
    maxDelayMs: number
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

export function isNonceAlreadyProcessedError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error)
    return message.includes('NonceAlreadyProcessed')
}

export function isInsufficientLiquidityError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error)
    return message.includes('InsufficientLiquidity')
}

export function isOnlyRelayerError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error)
    return message.includes('OnlyRelayer')
}

export async function withRetry<T>(
    operation: () => Promise<T>,
    config: RetryConfig = DEFAULT_RETRY_CONFIG,
    context?: string
): Promise<T> {
    let lastError: Error | undefined

    for (let attempt = 0; attempt < config.maxRetries; attempt++) {
        try {
            return await operation()
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error))

            // Don't retry certain errors
            if (isNonceAlreadyProcessedError(error)) {
                throw error
            }
            if (isOnlyRelayerError(error)) {
                throw error
            }

            const delay = Math.min(config.baseDelayMs * Math.pow(2, attempt), config.maxDelayMs)
            const jitter = Math.random() * 0.3 * delay

            logger.warn(`Retry attempt ${attempt + 1}/${config.maxRetries}`, {
                context,
                error: lastError.message,
                delayMs: Math.round(delay + jitter),
            })

            await sleep(delay + jitter)
        }
    }

    throw lastError
}
