# CMswap Roadmap

Implementation phases and TODO list for CMswap development.

## Project Status

**Current Phase**: Phase 2 - Swap Feature & Multi-Chain Expansion 🚧 (~60% complete)

- [x] Phase 1: Foundation ✅
- [ ] Phase 2: Swap Feature & Multi-Chain Expansion 🚧 (~60% complete)
  - [x] KUB Testnet integration ✅
  - [x] JB Chain integration ✅
  - [x] KUB Mainnet integration ✅
  - [ ] Base chain integration
  - [x] Worldchain integration ✅
  - [ ] BSC Chain integration
- [ ] Phase 3: Earn Feature
- [ ] Phase 4: Bridge Feature
- [ ] Phase 5: Launchpad Feature
- [ ] Phase 6: Points Feature
- [ ] Phase 7: Polish & Optimization
- [ ] Phase 8: Advanced Features (Post-MVP)

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

---

## Phase 2: Swap Feature & Multi-Chain Expansion (IN PROGRESS 🚧)

**Duration**: Ongoing
**Goal**: Implement multi-DEX swap with direct smart contract integration and expand to multiple chains

### TODO

- [x] Research KUB testnet DEX ecosystem ✅
  - [x] Found CMswap (Uniswap V3 fork) ✅
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
  - [x] Build swap-settings (slippage, deadline) - Complete (settings-dialog.tsx with UI)
- [x] Create swap page at `app/swap/page.tsx` ✅
- [x] Add swap route to navigation ✅
- [x] Test on KUB testnet with faucet tokens ✅
- [x] Add error handling and user feedback (Sonner toasts) ✅

### JB Chain Expansion Tasks

- [x] Research and document JB Chain DEX ecosystem ✅
  - [x] Verify CMswap V3 contract addresses on JBC
  - [x] Verify jibswap V2 contract addresses on JBC
  - [x] Document JB Chain token list
- [x] Implement CMswap V3 on JBC ✅
  - [x] Add V3 config for JBC in dex-config.ts
  - [x] Add JB Chain token list with native/wrapped tokens
  - [x] Implement dynamic chain switching in swap UI
  - [x] Add URL parameter sync for shareable swap links
  - [x] Test quote and swap on JBC
- [x] Implement jibswap V2 integration ✅
  - [x] Create V2 service and hooks
  - [x] Add V2 ABIs
  - [x] Test quote and swap on JBC
- [x] Implement multi-DEX aggregation ✅
  - [x] Parallel quote fetching ✅
  - [x] Price comparison UI ✅
  - [x] Calculate price difference % ✅
  - [x] Auto-select best price on refresh ✅

### Multi-Chain Expansion

#### KUB Mainnet (Bitkub Chain) ✅

**Status**: Integrated with cmswap V3 ✅

- [x] Research KUB mainnet DEX ecosystem ✅
  - [x] Identify active DEX protocols (Uniswap forks, PancakeSwap, etc.) ✅
  - [x] Find factory/router/quoter addresses ✅
  - [x] Document mainnet token list (KUB, popular tokens) ✅
- [x] Integrate KUB mainnet DEX protocols ✅
  - [x] Add to dex-config.ts (V2 or V3 configuration) ✅
  - [x] Create token list in lib/tokens.ts ✅
  - [x] Add routing configuration (KUB as native token) ✅
  - [x] Update chain icon if needed ✅
- [x] Test on KUB mainnet ✅
  - [x] Quote fetching from DEX protocols
  - [x] Swap execution with test amounts
  - [x] Multi-hop routing validation

#### Base Chain

**Status**: Already configured in wagmi, needs DEX integration

- [ ] Research Base DEX ecosystem
  - [ ] Identify Uniswap V3 deployment addresses
  - [ ] Find popular Base tokens (ETH, USDC, USDT, etc.)
  - [ ] Document gas optimization strategies
  - [ ] Research other DEXs (1inch, BaseSwap, etc.)
- [ ] Integrate Base DEX protocols
  - [ ] Add Uniswap V3 config to dex-config.ts
  - [ ] Create Base token list with common tokens
  - [ ] Add routing config (WETH, USDC as intermediaries)
  - [ ] Update chain metadata and icons
- [ ] Test on Base
  - [ ] Quote validation against multiple pools
  - [ ] Swap execution with real transactions
  - [ ] Gas cost analysis and optimization
  - [ ] Multi-hop routing through WETH/USDC

#### Worldchain ✅

**Status**: Integrated with Uniswap V3 ✅

- [x] Research Worldchain DEX ecosystem ✅
  - [x] Identify deployed DEX protocols ✅
  - [x] Find factory/router/quoter contract addresses ✅
  - [x] Document Worldchain token ecosystem ✅
  - [x] Research chain-specific features ✅
- [x] Integrate Worldchain DEX ✅
  - [x] Add DEX configuration to dex-config.ts ✅
  - [x] Create Worldchain token list ✅
  - [x] Add routing configuration ✅
  - [x] Update chain metadata ✅
- [x] Test on Worldchain ✅
  - [x] Connection and wallet testing ✅
  - [x] Quote fetching and validation ✅
  - [x] Swap execution with test transactions ✅
  - [x] Full swap flow testing ✅

#### BSC Chain

**Status**: Not configured, needs full setup

- [ ] BSC chain setup
  - [ ] Define custom chain in lib/wagmi.ts
  - [ ] Configure RPC URLs
  - [ ] Add block explorer URL
  - [ ] Create chain icon (public/chains/BSC.svg)
  - [ ] Update supportedChains array
- [ ] Research BSC DEX ecosystem
  - [ ] Identify available DEX protocols
  - [ ] Document contract addresses (factory, router, etc.)
  - [ ] Research BSC-specific tokens
- [ ] Integrate BSC DEX
  - [ ] Full DEX configuration (V2/V3) in dex-config.ts
  - [ ] Token list creation in lib/tokens.ts
  - [ ] Routing configuration in lib/routing-config.ts
  - [ ] Update chainMetadata in lib/wagmi.ts
- [ ] Test on BSC
  - [ ] Wallet connection testing
  - [ ] Quote fetching from DEXs
  - [ ] Swap execution with test amounts
  - [ ] Multi-hop routing validation

### Chain Expansion Notes

- **Priority Order**: KUB Mainnet → Worldchain ✅ → Base → BSC (based on user base and DEX maturity)
- **Dependencies**: Each chain requires DEX contract addresses before integration can begin
- **Testing**: All chains should be tested with small amounts before mainnet launch
- **Token Lists**: Prioritize native token, wrapped native, and top 10-20 tokens by volume
- **Gas Optimization**: Consider chain-specific gas optimization strategies (especially for Base)

---

## Phase 3: Earn Feature

**Duration**: 2-3 weeks
**Goal**: Implement staking, liquidity mining, and yield farming

### Features

- [ ] Staking interface
  - [ ] Single-token staking (stake native tokens)
  - [ ] LP token staking (stake liquidity positions)
  - [ ] Flexible vs fixed staking periods
  - [ ] Real-time APY calculation
  - [ ] Rewards tracker

- [ ] Pool management
  - [ ] Pool list with APY/TVL display
  - [ ] Pool creation interface
  - [ ] Reward distribution setup
  - [ ] Pool end date configuration

- [ ] Rewards system
  - [ ] Claim rewards button
  - [ ] Compound rewards option
  - [ ] Reward vesting schedule
  - [ ] Emergency withdraw

- [ ] Position tracking
  - [ ] My staking positions
  - [ ] Historical rewards
  - [ ] Unclaimed rewards display
  - [ ] Position value chart

### Smart Contracts

**Foundry Contracts:**

```solidity
// contracts/src/
├── StakingPool.sol           # Base staking pool
├── LiquidityMining.sol       # LP token staking
├── RewardDistributor.sol     # Reward distribution
└── interfaces/
    └── IStaking.sol          # Staking interface
```

### Files to Create

```
components/earn/
├── earn-page.tsx             # Main earn page layout
├── pool-card.tsx             # Individual pool display card
├── pool-list.tsx             # List of all pools
├── stake-dialog.tsx          # Stake/unstake modal
├── claim-rewards.tsx         # Claim rewards component
└── position-tracker.tsx      # User's positions

contracts/
├── src/
│   ├── StakingPool.sol
│   ├── LiquidityMining.sol
│   └── RewardDistributor.sol
├── script/
│   └── DeployStaking.s.sol
└── test/
    └── StakingTest.t.sol

services/
└── staking.ts                # Staking service layer

hooks/
├── useStake.ts               # Staking logic
├── useUnstake.ts             # Unstaking logic
├── useClaimRewards.ts        # Claim rewards
├── usePools.ts               # Pool data fetching
└── useUserPositions.ts       # User position data

types/
└── earn.ts                   # Earn feature types

store/
└── earn-store.ts             # Earn state management

app/
└── earn/
    └── page.tsx              # Earn page
```

### API Integration

**Staking Calculations:**
```typescript
// APY Calculation
apy = (rewardsPerYear / totalStaked) * 100

// Reward Calculation
pendingRewards = userShares * rewardsPerShare - userRewardDebt
```

### TODO

- [ ] Create Foundry staking contracts
- [ ] Build pool-card component
- [ ] Build stake-dialog component
- [ ] Implement APY calculation
- [ ] Integrate TanStack Query for pool data
- [ ] Add transaction tracking
- [ ] Test on KUB testnet
- [ ] Security audit (before mainnet)

---

## Phase 4: Bridge Feature

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

## Phase 5: Launchpad Feature

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

## Phase 6: Points Feature

**Duration**: 1-2 weeks
**Goal**: Implement user rewards, referral system, and gamification

### Features

- [ ] Points tracking
  - [ ] Points balance display
  - [ ] Points history (earn/spend)
  - [ ] Points earning activities
  - [ ] Real-time points update

- [ ] Referral system
  - [ ] Generate referral code
  - [ ] Referral link sharing
  - [ ] Track referred users
  - [ ] Referral rewards calculation

- [ ] Leaderboard
  - [ ] Global ranking display
  - [ ] Weekly/monthly leaderboard
  - [ ] User ranking highlight
  - [ ] Top users showcase

- [ ] Rewards redemption
  - [ ] Points to token swap
  - [ ] Exclusive features unlock
  - [ ] Badge/NFT rewards
  - [ ] Tier-based benefits

- [ ] Quest system
  - [ ] Daily/weekly quests
  - [ ] Quest completion tracking
  - [ ] Quest rewards
  - [ ] Achievement badges

### Files to Create

```
components/points/
├── points-page.tsx            # Main points page
├── points-balance.tsx         # Points display card
├── referral-card.tsx          # Referral link & stats
├── leaderboard.tsx            # Ranking table
├── quest-list.tsx             # Available quests
├── achievement-badge.tsx      # Badge display
└── history-list.tsx           # Points history

services/
└── points.ts                  # Points service (API/backend)

hooks/
├── usePoints.ts               # Points balance & history
├── useReferral.ts             # Referral system
├── useLeaderboard.ts          # Leaderboard data
└── useQuests.ts               # Quest management

types/
└── points.ts                  # Points feature types

store/
└── points-store.ts            # Points state management

app/
└── points/
    └── page.tsx               # Points page
```

### Backend Requirements

**API Endpoints:**
```typescript
GET  /api/points/balance       # Get user points
GET  /api/points/history       # Get points history
POST /api/points/earn          # Earn points from activity
POST /api/points/spend         # Spend/redeem points
GET  /api/referral/code        # Get referral code
POST /api/referral/claim       # Claim referral bonus
GET  /api/leaderboard          # Get leaderboard
GET  /api/quests               # Get available quests
POST /api/quests/complete      # Complete quest
```

**Points Earning Activities:**
| Activity | Points | Frequency |
|----------|--------|-----------|
| Swap transaction | +10 | per swap |
| Provide liquidity | +50 | per pool |
| Stake tokens | +25 | per stake |
| Daily login | +5 | daily |
| Refer a user | +100 | per referral |
| Complete quest | +20-100 | per quest |

### TODO

- [ ] Set up backend API for points
- [ ] Create database schema for points/referrals
- [ ] Build points-balance component
- [ ] Build referral-card component
- [ ] Implement leaderboard with real-time updates
- [ ] Create quest system
- [ ] Add achievement badges
- [ ] Integrate with existing features (swap, stake, etc.)
- [ ] Test points earning/redemption
- [ ] Deploy to production

---

## Phase 7: Polish & Optimization

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

## Phase 8: Advanced Features (Post-MVP)

### Additional Chains

- [ ] Hyperliquid integration (future)
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

### Social Features

- [ ] User profiles
- [ ] Token comments
- [ ] Community voting
- [ ] Social sharing

---

## Estimated Timeline

| Phase | Duration | Start Date | Target Date |
|-------|----------|------------|-------------|
| Phase 1 | ✅ Complete | - | ✅ Complete |
| Phase 2 | 1-2 weeks | TBD | TBD |
| Phase 3 | 2-3 weeks | TBD | TBD | 🆕 Earn
| Phase 4 | 1-2 weeks | TBD | TBD |
| Phase 5 | 2 weeks | TBD | TBD |
| Phase 6 | 1-2 weeks | TBD | TBD | 🆕 Points
| Phase 7 | 1-2 weeks | TBD | TBD | Polish & Optimization
| **MVP Total** | **8-11 weeks** | **TBD** | **TBD** |
| Phase 8 | Post-MVP | TBD | TBD |

---

## Contributing

Want to help build cmswap? Check out our [contributing guidelines](../CONTRIBUTING.md) (coming soon).

### Areas to Contribute

1. **UI/UX** - Improve the design and user experience
2. **Testing** - Write tests for existing features
3. **Documentation** - Improve docs and add examples
4. **Smart Contracts** - Help audit and improve contracts
