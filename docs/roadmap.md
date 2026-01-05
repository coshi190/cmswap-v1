# cmswap Roadmap

Implementation phases and TODO list for cmswap development.

## Project Status

**Current Phase**: Phase 2 - Swap Feature (In Progress 🚧)

- [x] Phase 1: Foundation ✅
- [ ] Phase 2: Swap Feature 🚧 (50% complete)
  - [x] Multi-DEX config abstraction
  - [x] Uniswap V3 integration
  - [x] Swap UI with token selection
  - [ ] Testing on KUB testnet
  - [ ] Multi-DEX expansion

---

## Phase 1: Foundation ✅ (COMPLETE)

**Duration**: Completed
**Goal**: Set up project infrastructure

### Completed Tasks

- [x] Initialize Next.js 15 with Bun
- [x] Configure TypeScript
- [x] Set up Tailwind CSS
- [x] Install shadcn/ui
- [x] Configure wagmi + viem (using wagmi directly, no AppKit dependency)
- [x] Configure TanStack Query
- [x] Create multi-chain configuration (6 chains)
- [x] Build landing page
  - [x] Hero section
  - [x] Features grid
  - [x] Supported chains display
  - [x] CTA section
  - [x] Footer
- [x] Set up dev tools (ESLint, Prettier, Husky)
- [x] Create project documentation
- [x] Configure Vercel deployment

### Files Created

```
cmswap/
├── app/
│   ├── layout.tsx              ✅ Root layout
│   ├── page.tsx                ✅ Landing page
│   └── providers.tsx           ✅ App providers
├── components/
│   ├── ui/
│   │   └── button.tsx          ✅ shadcn button (with xl variant)
│   └── landing/
│       ├── hero.tsx            ✅
│       ├── features.tsx        ✅
│       chains.tsx              ✅
│       ├── cta.tsx             ✅
│       └── footer.tsx          ✅
├── lib/
│   ├── wagmi.ts                ✅ wagmi config + chains
│   └── utils.ts                ✅ Utilities
├── docs/
│   ├── README.md               ✅
│   ├── architecture.md         ✅
│   ├── tech-stack.md           ✅
│   └── roadmap.md              ✅ This file
├── services/                   ✅ Directory ready
├── hooks/                      ✅ Directory ready
├── store/                      ✅ Directory ready
├── types/                      ✅ Directory ready
└── Configuration files         ✅ All set up
```

---

## Phase 2: Swap Feature (IN PROGRESS 🚧)

**Duration**: 1-2 weeks
**Goal**: Implement multi-DEX swap with direct smart contract integration

**Initial Chain**: KUB Testnet

### Implemented Features ✅

- [x] Wallet connection UI
  - [x] Connect button using wagmi hooks (useConnect, useAccount)
  - [x] Account address display
  - [x] Balance display
  - [x] Network switcher (useSwitchChain)
- [x] Token selection
  - [x] Token search
  - [x] Popular tokens list (KUB testnet tokens)
  - [x] Custom token input (address)
  - [x] Token import warning
- [x] Swap interface
  - [x] From/To token inputs
  - [x] Amount input with validation
  - [x] Swap button
  - [x] Settings (slippage, deadline) - in store
- [x] Multi-DEX price quotes
  - [x] Fetch quotes from Uniswap V3 via smart contracts
  - [x] Pool liquidity detection (tries all fee tiers)
  - [x] Display best quote
  - [x] Display minimum received
- [x] Swap execution
  - [x] Prepare transaction data
  - [x] Request wallet signature
  - [x] Execute swap via Uniswap V3 smart contract
  - [x] Handle errors
- [x] Transaction tracking
  - [x] Pending state
  - [x] Success confirmation
  - [x] Error handling (Sonner toasts)

### Pending Features

- [ ] Multi-DEX price comparison
  - [ ] Fetch quotes from multiple DEXs in parallel
  - [ ] Display best price with source DEX label
  - [ ] Show alternative DEX quotes
  - [ ] Display price impact
  - [ ] Display gas estimate
- [ ] Transaction history

### DEX Integration

**Direct Smart Contract Calls via wagmi/viem**

```typescript
// Key wagmi hooks:
// useReadContract  - Fetch quotes, balances, allowances
// useWriteContract - Execute swaps, approvals
// useSimulateContract - Pre-validate transactions
// useWaitForTransactionReceipt - Track confirmation
```

**KUB Testnet DEX Strategy:**

| DEX | Protocol | Status |
|-----|----------|--------|
| cmswap | Uniswap V3 fork | ✅ Integrated |

**Multi-DEX Aggregation:**
- [ ] Query all available DEXs in parallel
- [ ] Compare and sort by best output amount
- [ ] Display best quote prominently
- [x] Allow manual DEX selection

### Files Created

```
lib/
├── abis/                           ✅ Contract ABIs
│   ├── erc20.ts                    ✅ ERC20 ABI
│   ├── uniswap-v3-quoter.ts        ✅ Uniswap V3 QuoterV2 ABI
│   ├── uniswap-v3-router.ts        ✅ Uniswap V3 SwapRouter ABI
│   └── index.ts                    ✅ ABIs export
│
├── dex-config.ts                   ✅ Multi-DEX protocol abstraction
└── tokens.ts                       ✅ KUB testnet token list

components/swap/
├── swap-card.tsx                   ✅ Main swap interface
├── token-select.tsx                ✅ Token selection modal
└── dex-select-card.tsx             ✅ DEX selection UI

services/
├── tokens.ts                       ✅ Token operations
└── dex/
    └── uniswap-v3.ts               ✅ Uniswap V3 protocol service

hooks/
├── useTokenBalance.ts              ✅ Token balance (native/ERC20)
├── useTokenApproval.ts             ✅ Generic token approval (any protocol)
├── useUniV3Quote.ts                ✅ Uniswap V3 quote fetching
├── useUniV3SwapExecution.ts        ✅ Uniswap V3 swap execution
└── useDebounce.ts                  ✅ Debounce utility

store/
└── swap-store.ts                   ✅ Swap state management

types/
├── swap.ts                         ✅ Swap types
├── dex.ts                          ✅ DEX protocol types
└── tokens.ts                       ✅ Token metadata types

app/
└── swap/
    └── page.tsx                    ✅ Swap page
```

### TODO

- [x] Research KUB testnet DEX ecosystem ✅
  - [x] Found cmswap (Uniswap V3 fork) ✅
  - [x] Identified testnet tokens (KUB, tKKUB, testKUB, testToken) ✅
- [x] Create `lib/abis/` with ERC20 and Uniswap V3 ABIs ✅
- [x] Create `lib/dex-config.ts` with multi-DEX protocol support ✅
- [x] Create `lib/tokens.ts` with KUB testnet token list ✅
- [x] Build DEX service layer
  - [x] Create `services/tokens.ts` abstract types ✅
  - [x] Implement `services/dex/uniswap-v3.ts` ✅
- [x] Build custom hooks
  - [x] Create `hooks/useTokenBalance.ts` ✅
  - [x] Create `hooks/useTokenApproval.ts` ✅ (generic for any protocol)
  - [x] Create `hooks/useUniV3Quote.ts` ✅
  - [x] Create `hooks/useUniV3SwapExecution.ts` ✅
  - [x] Create `hooks/useDebounce.ts` ✅
- [x] Build swap UI components
  - [x] Build swap-card component ✅
  - [x] Build token-select component ✅
  - [x] Build dex-select-card component ✅
  - [ ] Build swap-settings (slippage, deadline) - Partial (in store)
- [x] Create swap page at `app/swap/page.tsx` ✅
- [x] Add swap route to navigation ✅
- [ ] Test on KUB testnet with faucet tokens - Pending
- [x] Add error handling and user feedback (Sonner toasts) ✅

---

## Architecture

### Multi-DEX Protocol Support

The swap system uses a protocol-agnostic architecture to support multiple DEX types:

```typescript
// Supported protocol types
enum ProtocolType {
  V2 = 'v2',           // Uniswap V2 forks (constant product AMM)
  V3 = 'v3',           // Uniswap V3 forks (concentrated liquidity)
  STABLE = 'stable',   // Stable swap (Curve-style)
  AGGREGATOR = 'aggregator' // 1inch-style aggregators
}

// Protocol-specific configs
interface V2Config {
  protocolType: ProtocolType.V2
  factory: Address
  router: Address
  wnative?: Address
}

interface V3Config {
  protocolType: ProtocolType.V3
  factory: Address
  quoter: Address
  swapRouter: Address
  feeTiers?: number[]
  defaultFeeTier?: number
}

interface StableConfig {
  protocolType: ProtocolType.STABLE
  registry: Address
  poolFinder?: Address
  basePool?: Address
}

interface AggregatorConfig {
  protocolType: ProtocolType.AGGREGATOR
  aggregator: Address
  apiEndpoint?: string
}
```

### Key Features

1. **Generic Token Approval** - `useTokenApproval` works with any DEX protocol via `getProtocolSpender()`
2. **Store Integration** - `selectedDex` from store propagates to all hooks
3. **Native Token Handling** - `0xeeee...` address for native tokens, auto-wrapped for swaps
4. **Smart Balance Formatting** - `formatBalance()` handles large/small numbers elegantly
5. **Pool Liquidity Detection** - Quote hook checks all fee tiers, selects pool with most liquidity

### Contract Addresses (KUB Testnet)

| Contract | Address |
|----------|--------|
| Factory | `0xCBd41F872FD46964bD4Be4d72a8bEBA9D656565b` |
| Quoter V2 | `0x3F64C4Dfd224a102A4d705193a7c40899Cf21fFe` |
| Swap Router | `0x3C5514335dc4E2B0D9e1cc98ddE219c50173c5Be` |
| Wrapped KUB (tKKUB) | `0x700D3ba307E1256e509eD3E45D6f9dff441d6907` |

### Token List (KUB Testnet)

| Symbol | Address | Type |
|--------|---------|------|
| KUB | `0xeeee...` | Native |
| tKKUB | `0x700D...` | ERC20 (Wrapped) |
| testKUB | `0xE7f6...` | ERC20 |
| testToken | `0x2335...` | ERC20 |

---

## Phase 3: Bridge Feature

**Duration**: 1-2 weeks
**Goal**: Implement cross-chain token bridging

### Features

- [ ] Bridge interface
  - [ ] Source chain selector
  - [ ] Destination chain selector
  - [ ] Token input
  - [ ] Amount input
  - [ ] Bridge button
- [ ] Bridge quotes
  - [ ] Fetch quotes from LayerZero/Stargate
  - [ ] Display bridge fee
  - [ ] Display estimated time
  - [ ] Display destination amount
- [ ] Bridge execution
  - [ ] Approve source transaction
  - [ ] Execute bridge transaction
  - [ ] Handle relayer process
- [ ] Transaction tracking
  - [ ] Source chain confirmation
  - [ ] Bridge status
  - [ ] Destination chain confirmation

### API Integration

**LayerZero / Stargate**

```typescript
// Stargate SDK for token bridging
// LayerZero for messaging
```

**Routes**: ETH↔BSC, ETH↔Polygon (initial)

### Files to Create

```
components/bridge/
├── bridge-panel.tsx          # Main bridge interface
├── chain-select.tsx          # Chain selector
└── bridge-status.tsx         # Bridge status tracker

services/
├── layerzero.ts              # LayerZero SDK
├── stargate.ts               # Stargate integration
└── wormhole.ts               # Wormhole fallback

hooks/
├── useBridge.ts              # Bridge logic
└── useBridgeQuote.ts         # Quote fetching

types/
└── bridge.ts                 # Bridge types
```

### TODO

- [ ] Create `services/layerzero.ts` SDK integration
- [ ] Create `services/stargate.ts` for stablecoins
- [ ] Build bridge-panel component
- [ ] Build chain-select modal
- [ ] Integrate Stargate quote API
- [ ] Integrate Stargate swap API
- [ ] Add cross-chain transaction tracking
- [ ] Test on testnet
- [ ] Test on mainnet (small amounts)

---

## Phase 4: Launchpad Feature

**Duration**: 2 weeks
**Goal**: Implement memecoin launch platform

### Features

- [ ] Token creation form
  - [ ] Token name input
  - [ ] Token symbol input
  - [ ] Total supply input
  - [ ] Token description
  - [ ] Token image upload
- [ ] Token deployment
  - [ ] Deploy ERC20 contract (Foundry)
  - [ ] Verify contract
  - [ ] Display deployment status
- [ ] Liquidity pool creation
  - [ ] Configure pool parameters
  - [ ] Create Uniswap V4 pool
  - [ ] Add initial liquidity
- [ ] Launch management
  - [ ] Launch status tracker
  - [ ] Token page generation
  - [ ] Social link integration

### Smart Contracts

**Foundry Contracts**

```solidity
// contracts/src/
├── LaunchpadToken.sol        # ERC20 implementation
├── LaunchpadFactory.sol      # Factory pattern
└── interfaces/
    └── ILaunchpad.sol         # Launchpad interface
```

### Files to Create

```
components/launchpad/
├── launch-form.tsx           # Token creation form
├── deploy-status.tsx         # Deployment progress
├── pool-config.tsx           # Liquidity pool setup
└── token-page.tsx            # Deployed token page

contracts/
├── src/
│   ├── LaunchpadToken.sol
│   └── LaunchpadFactory.sol
├── script/
│   └── DeployToken.s.sol
└── test/
    └── LaunchpadTest.t.sol

services/
└── uniswap.ts                # Uniswap V4 SDK

hooks/
├── useDeployToken.ts         # Token deployment
└── useCreatePool.ts          # Pool creation

types/
└── launchpad.ts              # Launchpad types
```

### TODO

- [ ] Create Foundry ERC20 token template
- [ ] Create deployment scripts
- [ ] Build launch-form component
- [ ] Integrate Foundry deployment
- [ ] Integrate Uniswap V4 SDK
- [ ] Add transaction tracking
- [ ] Test on testnet
- [ ] Security audit (before mainnet)

---

## Phase 5: Polish & Optimization

**Duration**: 1-2 weeks
**Goal**: Production-ready features

### Performance

- [ ] Code splitting optimization
- [ ] Lazy loading for components
- [ ] Image optimization
- [ ] Bundle size reduction
- [ ] Load time optimization

### Testing

- [ ] Unit tests (Vitest)
- [ ] Integration tests
- [ ] E2E tests (Playwright)
- [ ] Contract tests (Foundry)
- [ ] Fuzzing tests

### Security

- [ ] Dependency audit
- [ ] Smart contract audit
- [ ] Penetration testing
- [ ] Bug bounty setup

### Analytics

- [ ] Event tracking
- [ ] Funnel analysis
- [ ] Error monitoring
- [ ] Performance monitoring

---

## Phase 6: Advanced Features (Post-MVP)

### Additional Chains

- [ ] Arbitrum integration
- [ ] Optimism integration
- [ ] Base integration
- [ ] Avalanche integration
- [ ] Solana integration (future)

### Advanced Swap Features

- [ ] Limit orders (1inch Limit Order API)
- [ ] DCA (Dollar Cost Averaging)
- [ ] Multi-hop swaps
- [ ] Portfolio view
- [ ] Transaction history

### Advanced Bridge Features

- [ ] More bridge providers (Wormhole, Across)
- [ ] Cross-chain limit orders
- [ ] Bridge comparison
- [ ] Route optimization

### Advanced Launchpad Features

- [ ] Vesting schedules
- [ ] Tokenomics configuration
- [ ] Fair launch mechanism
- [ ] Liquidity locking
- [ ] Anti-bot measures

### Analytics Dashboard

- [ ] Portfolio tracker
- [ ] Price charts
- [ ] Volume statistics
- [ ] User analytics
- [ ] Admin dashboard

---

## Future Enhancements

### Mobile App

- [ ] React Native + Expo
- [ ] iOS and Android apps
- [ ] WalletConnect deep linking
- [ ] Push notifications

### Governance

- [ ] CMSWAP token
- [ ] Governance contracts
- [ ] Voting mechanism
- [ ] Proposal system

### Staking & Yield

- [ ] Staking pool
- [ ] Yield farming
- [ ] Liquidity mining
- [ ] Rewards distribution

### Social Features

- [ ] User profiles
- [ ] Token comments
- [ ] Community voting
- [ ] Social sharing

---

## Dependencies

**Phase 2 requires**: Phase 1 complete ✅

**Phase 3 requires**: Phase 2 complete

**Phase 4 requires**: Phase 3 complete

---

## Estimated Timeline

| Phase | Duration | Start Date | Target Date |
|-------|----------|------------|-------------|
| Phase 1 | ✅ Complete | - | ✅ Complete |
| Phase 2 | 1-2 weeks | TBD | TBD |
| Phase 3 | 1-2 weeks | TBD | TBD |
| Phase 4 | 2 weeks | TBD | TBD |
| Phase 5 | 1-2 weeks | TBD | TBD |
| **MVP Total** | **5-8 weeks** | **TBD** | **TBD** |

---

## Contributing

Want to help build cmswap? Check out our [contributing guidelines](../CONTRIBUTING.md) (coming soon).

### Areas to Contribute

1. **UI/UX** - Improve the design and user experience
2. **Testing** - Write tests for existing features
3. **Documentation** - Improve docs and add examples
4. **Smart Contracts** - Help audit and improve contracts
5. **Translations** - Add multi-language support
