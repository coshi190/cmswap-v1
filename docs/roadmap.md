# cmswap Roadmap

Implementation phases and TODO list for cmswap development.

## Project Status

**Current Phase**: Phase 1 Complete ✅

- [x] Project initialization
- [x] Landing page
- [x] Web3 configuration (wagmi, viem, Reown)
- [x] shadcn/ui setup
- [x] Multi-chain configuration

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

## Phase 2: Swap Feature (NEXT)

**Duration**: 1-2 weeks
**Goal**: Implement DEX aggregation swap

### Features

- [x] Wallet connection UI
  - [x] Connect button using wagmi hooks (useConnect, useAccount)
  - [x] Account address display
  - [x] Balance display
  - [x] Network switcher (useSwitchChain)
- [ ] Token selection
  - [ ] Token search
  - [ ] Popular tokens list
  - [ ] Custom token input (address)
  - [ ] Token import warning
- [ ] Swap interface
  - [ ] From/To token inputs
  - [ ] Amount input with validation
  - [ ] Swap button
  - [ ] Settings (slippage, deadline)
- [ ] Price quotes
  - [ ] Fetch quotes from 1inch API
  - [ ] Display price impact
  - [ ] Display minimum received
  - [ ] Display gas estimate
- [ ] Swap execution
  - [ ] Prepare transaction
  - [ ] Request wallet signature
  - [ ] Submit to 1inch API
  - [ ] Handle errors
- [ ] Transaction tracking
  - [ ] Pending state
  - [ ] Success confirmation
  - [ ] Error handling
  - [ ] Transaction history

### API Integration

**1inch API v6**

```typescript
// GET /swap/v6.0/{chain_id}/quote
// GET /swap/v6.0/{chain_id}/swap
```

**Chains**: Ethereum, BSC, Polygon (initial)

### Files to Create

```
components/swap/
├── swap-panel.tsx           # Main swap interface
├── token-select.tsx          # Token selection modal
├── swap-button.tsx           # Swap action button
└── swap-settings.tsx         # Slippage settings

services/
├── 1inch.ts                  # 1inch API client
└── tokens.ts                 # Token metadata

hooks/
├── useSwap.ts                # Swap logic
├── useTokenBalance.ts        # Token balance
└── useTokenApproval.ts       # Token approval

store/
└── useSwapStore.ts           # Swap state

types/
└── swap.ts                   # Swap types
```

### TODO

- [ ] Create `services/1inch.ts` API client
- [ ] Create `services/tokens.ts` for token metadata
- [ ] Build swap-panel component
- [ ] Build token-select modal
- [ ] Integrate 1inch quote API
- [ ] Integrate 1inch swap API
- [ ] Add transaction state management
- [ ] Test on testnet (Sepolia)
- [ ] Test on mainnet (small amounts)

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
