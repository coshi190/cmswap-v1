# cmswap Documentation

Welcome to the cmswap documentation. cmswap is a multi-chain Web3 aggregation platform that enables users to swap tokens across DEXs, bridge assets across chains, and launch new memecoins.

## Quick Links

| Document | Description |
|----------|-------------|
| [Architecture](./architecture.md) | System architecture and design decisions |
| [Roadmap](./roadmap.md) | Implementation phases and TODO |

## Quick Start

```bash
# Clone the repository
git clone <repo-url>
cd cmswap

# Install dependencies
bun install

# Run development server
bun run dev

# Build for production
bun run build
```

## Project Overview

cmswap is a Web3 aggregation platform with three core features:

1. **Aggregate Swap** - Direct smart contract integration with multi-DEX protocol support (Uniswap V2/V3, Stable, Aggregators)
2. **Cross-Chain Bridge** - Seamless token bridging via LayerZero (coming)
3. **Memecoin Launchpad** - Token launch platform via Uniswap V4 (coming)

### Supported Chains

- BNB Chain (BSC)
- KUB Chain (Bitkub)
- KUB Testnet
- JB Chain (Jibchain)
- Base
- Worldchain

## Tech Stack Summary

| Category | Technology |
|----------|------------|
| Frontend | Next.js 15, React 19, TypeScript |
| Styling | Tailwind CSS, shadcn/ui |
| Web3 | wagmi v2, viem v2 |
| State | Zustand, TanStack Query |
| Notifications | Sonner |
| Runtime | Bun |
| Hosting | Vercel |

## Project Structure

```
cmswap/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Landing page
│   ├── swap/              # Swap feature (implemented)
│   ├── bridge/            # Bridge feature (coming)
│   └── launchpad/         # Launchpad feature (coming)
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── landing/           # Landing page components
│   ├── web3/              # Web3-specific components
│   └── swap/              # Swap components
├── lib/
│   ├── abis/              # Contract ABIs (ERC20, Uniswap V3)
│   ├── dex-config.ts      # Multi-DEX protocol configuration
│   ├── tokens.ts          # Token lists per chain
│   ├── utils.ts           # Utility functions
│   └── wagmi.ts           # wagmi & chain configuration
├── services/              # DEX services, token utilities
├── hooks/                 # Custom React hooks
├── store/                 # Zustand state management
├── types/                 # TypeScript types
└── docs/                  # This documentation
```

## Development

### Prerequisites

- Bun 1.x+
- Node.js 18+

### Environment Variables

Create a `.env.local` file:

```bash
# Optional: Alchemy API for enhanced RPC
NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_key
```

### Available Scripts

```bash
bun run dev      # Start development server
bun run build    # Build for production
bun run start    # Start production server
bun run lint     # Run ESLint
bun run test     # Run tests (coming)
```

## Current Implementation

### Phase 2: Swap Feature (In Progress)

**Implemented:**
- Multi-DEX protocol abstraction (V2, V3, Stable, Aggregator support)
- Uniswap V3 integration on KUB Testnet
- Wallet connection with multi-chain support
- Token selection and balance display
- Price quotes with pool liquidity detection
- Swap execution with simulation
- Transaction tracking with block explorer links

**Pending:**
- Multi-DEX price comparison
- Testing on KUB testnet
- Additional DEX integrations

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## License

MIT
