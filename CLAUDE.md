# CLAUDE.md

## Project

Junoswap — multi-chain DeFi aggregator (swap, bridge, LP, launchpad). Live at junoswap.trade.

## Directory map

app/            Next.js App Router pages + server actions
components/     React components by feature
hooks/          Custom hooks — all blockchain interactions live here
services/       Pure business logic (no React)
store/          Zustand stores
lib/            Config & utilities
types/          TypeScript type definitions by domain

## Related repos

This repo is the frontend only. The contracts, the indexer, and the shared chain layer live in
[junoswap-core](https://github.com/coshi190/junoswap-core).

- **`@coshi190/junoswap-sdk`** (npm) — contract ABIs, deployed addresses, DEX/chain config, Ponder client.
  Import chain primitives from here, never redefine them. ABIs there are **generated from the
  Solidity**; a new deploy means: update the SDK's `addresses/deployments.ts` → publish → bump
  the dep here.
- **Indexer** — reached over HTTP only, via `PONDER_URL` and the `app/api/ponder/graphql` proxy.
  `lib/ponder-client.ts` is a thin wrapper over the SDK's client.

## Key conventions

- Runtime: **bun only** — never use npm, yarn, or pnpm. Lockfile is `bun.lock`.
- Tests: test business logic, not framework behavior — skip tautologies, passthroughs, exact duplicates, and trivial defaults.
- Don't test React hooks/components directly. When a hook holds logic worth testing, extract it into a pure function (in `lib/`/`services/`, or exported from the hook file) and test that under `lib/__tests__/` or `services/**/__tests__/` — no `hooks/__tests__/`.
- Comments: comment only genuinely complex or non-obvious code

## Notes

- **kub mainnet/testnet RPC** (`rpc.bitkubchain.io`) is NOT a full archive node. Historical `eth_call` reads fail with "missing trie node".
