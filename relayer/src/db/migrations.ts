import type Database from 'better-sqlite3'

export function runMigrations(db: Database.Database): void {
    // Enable WAL mode for better concurrent access
    db.pragma('journal_mode = WAL')
    db.pragma('busy_timeout = 5000')

    // Bridge requests table - tracks all observed BridgeInitiated events
    db.exec(`
    CREATE TABLE IF NOT EXISTS bridge_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nonce TEXT NOT NULL,
      source_chain INTEGER NOT NULL,
      dest_chain INTEGER NOT NULL,
      token TEXT NOT NULL,
      sender TEXT NOT NULL,
      recipient TEXT NOT NULL,
      amount TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      source_block_number TEXT NOT NULL,
      source_tx_hash TEXT NOT NULL,
      dest_tx_hash TEXT,
      retry_count INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      UNIQUE(source_chain, nonce)
    )
  `)

    // Indexes for efficient queries
    db.exec(`
    CREATE INDEX IF NOT EXISTS idx_bridge_requests_status
      ON bridge_requests(status)
  `)
    db.exec(`
    CREATE INDEX IF NOT EXISTS idx_bridge_requests_chains
      ON bridge_requests(source_chain, dest_chain)
  `)
    db.exec(`
    CREATE INDEX IF NOT EXISTS idx_bridge_requests_created
      ON bridge_requests(created_at)
  `)

    // Chain checkpoints table - tracks last processed block per chain
    db.exec(`
    CREATE TABLE IF NOT EXISTS chain_checkpoints (
      chain_id INTEGER PRIMARY KEY,
      last_block TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)
}
