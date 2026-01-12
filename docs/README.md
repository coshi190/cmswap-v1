# CMswap

![Live on 6 Chains](https://img.shields.io/badge/Chains-6-blue)
![7 DEXs Integrated](https://img.shields.io/badge/DEXs-7-green)
![Open Source](https://img.shields.io/badge/License-MIT-purple)

**The fastest way to trade tokens across multiple chains.**

Get the best prices across all DEXs with one click. No registration. No KYC. Just connect and swap.

[Swap →](/swap) · [Earn →](/earn) · [Documentation →](./architecture.md) · [Discord →](https://discord.gg/k92ReT5EYy)

---

## Why CMswap?

### 🚀 Best Prices Across 7 DEXs

We aggregate quotes from CMswap, Uniswap, PancakeSwap, Jibswap, Udonswap, Ponder Finance, and Diamon Finance so you always get the best deal. Our smart routing automatically finds the optimal path for your trade.

### 🔗 6 Chains, One Interface

Trade seamlessly across KUB Chain, JB Chain, Worldchain, Base, BNB Chain, and more - all from a single interface. No more juggling multiple tabs or DEXs.

### 🛡️ Non-Custodial & Secure

Your funds never leave your wallet. We're open-source, built with battle-tested smart contracts, and designed with security first. You're always in full control.

### ⚡ Lightning Fast

Built on Next.js 15 with modern Web3 libraries. Get instant quotes and execute transactions in seconds. No more waiting or failed transactions.

---

## Live Features

✅ **Multi-DEX Swap** - Compare prices across 7 DEXs and auto-select the best rate

✅ **Liquidity Management** - Create and manage LP positions with concentrated liquidity (V3)

✅ **LP Mining** - Stake LP positions to earn token rewards with real-time reward tracking

✅ **Multi-Hop Routing** - Find the best path even for indirect token pairs

✅ **Slippage Protection** - Customizable slippage (0.1%, 0.5%, 1%, or custom)

✅ **Native Token Wrap** - Seamless KUB↔WKUB, BNB↔WBNB, JBC↔WJBC conversions

✅ **Shareable Links** - Share your swap configuration with a URL

---

## Supported Chains

| Chain | Status | DEXs | Explorer |
|-------|--------|------|----------|
| **KUB Chain** | 🟢 Live | CMswap V3, Udonswap, Ponder, Diamon | [bkcscan.com](https://www.bkcscan.com) |
| **JB Chain** | 🟢 Live | CMswap V3, Jibswap V2 | [exp-l1.jibchain.net](https://exp-l1.jibchain.net) |
| **KUB Testnet** | 🟢 Live | CMswap V3 | [testnet.bkcscan.com](https://testnet.bkcscan.com) |
| **Worldchain** | 🟢 Live | Uniswap V3 | [explorer.alchemy.com](https://worldchain-mainnet.explorer.alchemy.com) |
| **Base** | 🟢 Live | Uniswap V3 | [basescan.org](https://basescan.org) |
| **BNB Chain** | 🟢 Live | PancakeSwap V3 | [bscscan.com](https://bscscan.com) |

---

## Start Trading in 3 Steps

1. **Connect Wallet** - MetaMask, Trust Wallet, WalletConnect, and more

2. **Select Tokens** - Choose from hundreds of tokens across supported chains

3. **Swap or Earn** - Trade tokens or provide liquidity to earn rewards

[Swap →](/swap) · [Earn →](/earn)

---

## Community

- 📖 [Documentation](./README.md)
- 🗺️ [Roadmap](./roadmap.md)
- 🏗️ [Architecture](./architecture.md)
- 🐦 [Twitter](https://x.com/cmswap)
- 💬 [Discord](https://discord.gg/k92ReT5EYy)
- 💻 [GitHub](https://github.com/coshi190/cmswap)

---

## For Developers

CMswap is built with modern Web3 technologies and follows best practices for scalability and security.

### Tech Stack

| Category | Technology |
|----------|------------|
| Frontend | Next.js 15, React 19, TypeScript |
| Styling | Tailwind CSS, shadcn/ui |
| Web3 | wagmi v2, viem v2 |
| State | Zustand, TanStack Query |
| Runtime | Bun |
| Hosting | Vercel |

### Project Structure

```
cmswap/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Landing page
│   ├── swap/              # Swap feature (live)
│   ├── earn/              # Earn feature: LP positions + mining (live)
│   ├── bridge/            # Bridge feature (coming)
│   ├── launchpad/         # Launchpad feature (coming)
│   └── points/            # Points feature (coming)
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── landing/           # Landing page components
│   ├── web3/              # Web3-specific components
│   ├── swap/              # Swap components
│   ├── positions/         # LP position management
│   └── mining/            # LP mining/staking components
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

### Development

**Prerequisites**
- Bun 1.x+
- Node.js 18+

**Environment Variables**
Not required - The app works out of the box with public RPCs.

Optional `.env.local` for enhanced features.

**Available Scripts**

```bash
bun run dev      # Start development server
bun run build    # Build for production
bun run start    # Start production server
bun run lint     # Run ESLint
bun run clean    # Clean build artifacts
bun run test     # Run tests (coming)
```

### Architecture

CMswap uses a layered architecture with clear separation of concerns:

- **Services Layer** - DEX integrations (Uniswap V2/V3)
- **Hooks Layer** - React hooks for Web3 interactions
- **Components Layer** - Reusable UI components
- **State Layer** - Zustand stores for global state

[Read more →](./architecture.md)

---

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

**Areas to Contribute:**
1. UI/UX - Improve the design and user experience
2. Testing - Write tests for existing features
3. Documentation - Improve docs and add examples
4. Smart Contracts - Help audit and improve contracts

---

## License

MIT © 2025 CMswap
