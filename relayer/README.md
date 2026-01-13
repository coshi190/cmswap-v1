# TBridge V2 Relayer

A cron-compatible TypeScript script that monitors `BridgeInitiated` events across multiple chains and executes `releaseFunds` transactions on destination chains.

## Setup

1. Install dependencies:
```bash
bun install
```

2. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your values
```

3. Required environment variables:
- `RPC_URL_KUB` - RPC URL for Bitkub Chain
- `RPC_URL_JBC` - RPC URL for JB Chain
- `RPC_URL_BSC` - RPC URL for BNB Chain
- `BRIDGE_ADDRESS_KUB` - Bridge proxy address on KUB
- `BRIDGE_ADDRESS_JBC` - Bridge proxy address on JBC
- `BRIDGE_ADDRESS_BSC` - Bridge proxy address on BSC
- `RELAYER_PRIVATE_KEY` - Private key for relayer wallet (must be set as relayer in bridge contracts)

## Usage

### Manual run
```bash
bun run relayer
```

### Dry run (no transactions)
```bash
bun run relayer:dry
```

### Cron setup (every 30 seconds)
```bash
# Add to crontab
* * * * * cd /path/to/relayer && bun run relayer >> logs/cron.log 2>&1
* * * * * sleep 30 && cd /path/to/relayer && bun run relayer >> logs/cron.log 2>&1
```

## How it works

1. **Acquire lock** - Prevents multiple instances from running simultaneously
2. **Scan chains** - Fetches `BridgeInitiated` events from each chain since last checkpoint
3. **Process requests** - For each pending bridge request:
   - Check if nonce is already processed on destination
   - Execute `releaseFunds` on destination chain
   - Update status in SQLite database
4. **Release lock** - Allow next cron run to proceed

## Database

SQLite database is stored at `./data/relayer.db` with:
- `bridge_requests` - All observed bridge events and their status
- `chain_checkpoints` - Last processed block per chain

## Supported chains

| Chain | ID | Confirmations |
|-------|-----|---------------|
| KUB (Bitkub) | 96 | 12 blocks |
| JBC | 8899 | 12 blocks |
| BSC | 56 | 15 blocks |

## Logs

Logs are written to:
- Console (stdout)
- `./logs/relayer.log`
