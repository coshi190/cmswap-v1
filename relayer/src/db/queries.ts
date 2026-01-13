import type Database from 'better-sqlite3'
import type { Address, Hash } from 'viem'

export type BridgeRequestStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'skipped'

export interface BridgeRequest {
    id: number
    nonce: string
    sourceChain: number
    destChain: number
    token: Address
    sender: Address
    recipient: Address
    amount: string
    status: BridgeRequestStatus
    sourceBlockNumber: string
    sourceTxHash: Hash
    destTxHash: Hash | null
    retryCount: number
    lastError: string | null
    createdAt: number
    updatedAt: number
}

interface BridgeRequestRow {
    id: number
    nonce: string
    source_chain: number
    dest_chain: number
    token: string
    sender: string
    recipient: string
    amount: string
    status: string
    source_block_number: string
    source_tx_hash: string
    dest_tx_hash: string | null
    retry_count: number
    last_error: string | null
    created_at: number
    updated_at: number
}

function rowToRequest(row: BridgeRequestRow): BridgeRequest {
    return {
        id: row.id,
        nonce: row.nonce,
        sourceChain: row.source_chain,
        destChain: row.dest_chain,
        token: row.token as Address,
        sender: row.sender as Address,
        recipient: row.recipient as Address,
        amount: row.amount,
        status: row.status as BridgeRequestStatus,
        sourceBlockNumber: row.source_block_number,
        sourceTxHash: row.source_tx_hash as Hash,
        destTxHash: row.dest_tx_hash as Hash | null,
        retryCount: row.retry_count,
        lastError: row.last_error,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    }
}

export interface NewBridgeRequest {
    nonce: string
    sourceChain: number
    destChain: number
    token: Address
    sender: Address
    recipient: Address
    amount: string
    sourceBlockNumber: string
    sourceTxHash: Hash
}

export class RelayerQueries {
    private db: Database.Database

    constructor(db: Database.Database) {
        this.db = db
    }

    // Bridge Requests

    insertRequest(request: NewBridgeRequest): number | null {
        const now = Date.now()
        const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO bridge_requests
      (nonce, source_chain, dest_chain, token, sender, recipient, amount,
       status, source_block_number, source_tx_hash, retry_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, 0, ?, ?)
    `)

        const result = stmt.run(
            request.nonce,
            request.sourceChain,
            request.destChain,
            request.token,
            request.sender,
            request.recipient,
            request.amount,
            request.sourceBlockNumber,
            request.sourceTxHash,
            now,
            now
        )

        return result.changes > 0 ? (result.lastInsertRowid as number) : null
    }

    updateStatus(
        sourceChain: number,
        nonce: string,
        status: BridgeRequestStatus,
        destTxHash?: Hash,
        error?: string
    ): void {
        const stmt = this.db.prepare(`
      UPDATE bridge_requests
      SET status = ?,
          dest_tx_hash = COALESCE(?, dest_tx_hash),
          last_error = ?,
          retry_count = CASE WHEN ? = 'failed' THEN retry_count + 1 ELSE retry_count END,
          updated_at = ?
      WHERE source_chain = ? AND nonce = ?
    `)

        stmt.run(status, destTxHash ?? null, error ?? null, status, Date.now(), sourceChain, nonce)
    }

    getPendingRequests(limit: number = 100): BridgeRequest[] {
        const stmt = this.db.prepare(`
      SELECT * FROM bridge_requests
      WHERE status IN ('pending', 'processing')
      AND retry_count < 5
      ORDER BY created_at ASC
      LIMIT ?
    `)

        const rows = stmt.all(limit) as BridgeRequestRow[]
        return rows.map(rowToRequest)
    }

    getRequestByNonce(sourceChain: number, nonce: string): BridgeRequest | null {
        const stmt = this.db.prepare(`
      SELECT * FROM bridge_requests
      WHERE source_chain = ? AND nonce = ?
    `)

        const row = stmt.get(sourceChain, nonce) as BridgeRequestRow | undefined
        return row ? rowToRequest(row) : null
    }

    // Checkpoints

    getCheckpoint(chainId: number): bigint | null {
        const stmt = this.db.prepare('SELECT last_block FROM chain_checkpoints WHERE chain_id = ?')
        const row = stmt.get(chainId) as { last_block: string } | undefined
        return row ? BigInt(row.last_block) : null
    }

    saveCheckpoint(chainId: number, lastBlock: bigint): void {
        const stmt = this.db.prepare(`
      INSERT INTO chain_checkpoints (chain_id, last_block, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(chain_id) DO UPDATE SET
        last_block = excluded.last_block,
        updated_at = excluded.updated_at
    `)

        stmt.run(chainId, lastBlock.toString(), Date.now())
    }

    // Stats

    getStats(): { pending: number; completed: number; failed: number } {
        const stmt = this.db.prepare(`
      SELECT
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
      FROM bridge_requests
    `)

        const row = stmt.get() as { pending: number; completed: number; failed: number }
        return {
            pending: row.pending || 0,
            completed: row.completed || 0,
            failed: row.failed || 0,
        }
    }
}
