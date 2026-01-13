import { existsSync, writeFileSync, unlinkSync, readFileSync, mkdirSync } from 'fs'
import { dirname } from 'path'

const LOCK_FILE = './data/relayer.lock'
const LOCK_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes stale lock

function ensureDataDir(): void {
    const dir = dirname(LOCK_FILE)
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
    }
}

export function acquireLock(): boolean {
    ensureDataDir()

    if (existsSync(LOCK_FILE)) {
        try {
            const lockTime = parseInt(readFileSync(LOCK_FILE, 'utf-8'), 10)
            if (Date.now() - lockTime < LOCK_TIMEOUT_MS) {
                return false // Another instance is running
            }
            // Stale lock, remove it
        } catch {
            // Invalid lock file, remove it
        }
    }

    writeFileSync(LOCK_FILE, Date.now().toString())
    return true
}

export function releaseLock(): void {
    try {
        if (existsSync(LOCK_FILE)) {
            unlinkSync(LOCK_FILE)
        }
    } catch {
        // Ignore errors during cleanup
    }
}
