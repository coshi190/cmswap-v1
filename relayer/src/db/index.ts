import Database from 'better-sqlite3'
import { runMigrations } from './migrations'
import { RelayerQueries } from './queries'

export { RelayerQueries } from './queries'
export type { BridgeRequest, BridgeRequestStatus, NewBridgeRequest } from './queries'

export function initDatabase(dbPath: string): { db: Database.Database; queries: RelayerQueries } {
    const db = new Database(dbPath)
    runMigrations(db)
    const queries = new RelayerQueries(db)
    return { db, queries }
}
