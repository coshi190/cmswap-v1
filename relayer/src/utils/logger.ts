import { appendFileSync, existsSync, mkdirSync } from 'fs'
import { dirname } from 'path'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
}

const LOG_FILE = './logs/relayer.log'

function ensureLogDir(): void {
    const dir = dirname(LOG_FILE)
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
    }
}

function formatTimestamp(): string {
    return new Date().toISOString()
}

function formatMessage(level: LogLevel, message: string, meta?: Record<string, unknown>): string {
    const timestamp = formatTimestamp()
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : ''
    return `${timestamp} [${level.toUpperCase()}] ${message}${metaStr}`
}

class Logger {
    private level: LogLevel

    constructor() {
        this.level = (process.env.LOG_LEVEL as LogLevel) || 'info'
        ensureLogDir()
    }

    private shouldLog(level: LogLevel): boolean {
        return LOG_LEVELS[level] >= LOG_LEVELS[this.level]
    }

    private log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
        if (!this.shouldLog(level)) return

        const formatted = formatMessage(level, message, meta)

        // Console output
        if (level === 'error') {
            console.error(formatted)
        } else {
            console.log(formatted)
        }

        // File output
        try {
            appendFileSync(LOG_FILE, formatted + '\n')
        } catch {
            // Ignore file write errors
        }
    }

    debug(message: string, meta?: Record<string, unknown>): void {
        this.log('debug', message, meta)
    }

    info(message: string, meta?: Record<string, unknown>): void {
        this.log('info', message, meta)
    }

    warn(message: string, meta?: Record<string, unknown>): void {
        this.log('warn', message, meta)
    }

    error(message: string, meta?: Record<string, unknown>): void {
        this.log('error', message, meta)
    }
}

export const logger = new Logger()
