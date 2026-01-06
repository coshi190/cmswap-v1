# cmswap Roadmap

Implementation phases and TODO list for cmswap development.

## Project Status

**Current Phase**: Phase 2 - Swap Feature (In Progress 🚧)

- [x] Phase 1: Foundation ✅
- [ ] Phase 2: Swap Feature 🚧 (80% complete)
  - [x] KUB Testnet integration
  - [x] JB Chain cmswap V3 integration ✅
  - [ ] JB Chain multi-DEX expansion (jibswap V2, commudao)
- [ ] Phase 3: Earn Feature 🆕
- [ ] Phase 4: Bridge Feature
- [ ] Phase 5: Launchpad Feature
- [ ] Phase 6: Polish & Optimization
- [ ] Phase 7: Points Feature 🆕
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
- [x] KUB Testnet Testing
  - [x] Swap transactions on cmswap DEX
  - [x] Token approval flow
  - [x] Slippage/deadline settings
  - [x] Error handling validation

### Pending Features

- [ ] Multi-DEX price comparison
  - [ ] Fetch quotes from multiple DEXs in parallel
  - [ ] Display best price with source DEX label
  - [ ] Show alternative DEX quotes
  - [ ] Display price impact
  - [ ] Display gas estimate
- [ ] Transaction history

### DEX Selector UI ✅

**Component**: `components/swap/dex-select-card.tsx`

**Phase 1: Basic Expandable UI** ✅ (Implemented)
- [x] Expandable/collapsible card showing selected DEX
- [x] List of all available DEXs when expanded
- [x] Chain filtering (only shows DEXs available on current chain)
- [x] Visual indicator for selected DEX (checkmark + primary color)
- [x] DEX selection updates store and auto-collapses
- [x] External link to DEX website
- [x] Added jibswap and commudao to `DEX_REGISTRY` in `types/dex.ts`

**Phase 2: Multi-DEX Quote Display** (Planned)
- [ ] Add `dexQuotes` state to `swap-store.ts`
- [ ] Create `hooks/useMultiDexQuotes.ts` for parallel quote fetching
- [ ] Display quotes per DEX in expanded view
- [ ] Show loading/error states for each DEX

**Phase 3: Price Comparison Features** (Planned)
- [ ] Calculate price difference % vs best price
- [ ] Highlight best price with trophy/badge
- [ ] Auto-select best price on mount
- [ ] Persist user's DEX selection preference

### JB Chain Multi-DEX Expansion 🆕

**Target Chain**: JB Chain (JBC)
**Goal**: Integrate 3 DEX protocols for price comparison and aggregation

**JB Chain DEXs:**

| DEX | Protocol | Status | Contract Addresses |
|-----|----------|--------|-------------------|
| cmswap | Uniswap V3 fork | ✅ Integrated
| jibswap | Uniswap V2 fork | Pending | Factory: `0x4BBdA880C5A0cDcEc6510f0450c6C8bC5773D499`<br>Router: `0x766F8C9321704DC228D43271AF9b7aAB0E529D38` |
| commudao | Custom AMM | Pending | Router: `0x______` |

**Integration Sequence (One-by-One):**
1. **cmswap V3** (first - extend existing V3 service to JBC)
2. **jibswap V2** (second - requires V2 service layer)
3. **commudao Custom** (third - requires custom service implementation)

**Implementation Tasks:**

**Step 1: cmswap V3 on JBC** ✅
- [x] Add V3 config for JB chain in `dex-config.ts`
- [x] Add JB Chain token list with JBC, WJBC, and popular tokens
- [x] Add WJBC wrapped native address (auto-assigned from token list)
- [x] Update swap page to support multiple chains (KUB Testnet + JBC)
- [x] Fix token list to update dynamically when switching chains
- [x] Implement URL parameter sync (input, output, amount)
- [x] Test quote and swap on JBC
- [x] Verify all fee tiers have liquidity

**Step 2: jibswap V2 Integration**
- [ ] Create `services/dex/uniswap-v2.ts` service
- [ ] Add V2 ABIs to `lib/abis/`:
  - `uniswap-v2-router.ts` - Router ABI
  - `uniswap-v2-factory.ts` - Factory ABI
  - `uniswap-v2-pair.ts` - Pair ABI (for reserves)
- [ ] Create `hooks/useUniV2Quote.ts`
  - Fetch quote via `getAmountsOut` call
  - Handle path construction
- [ ] Create `hooks/useUniV2SwapExecution.ts`
  - Prepare swap transaction data
  - Execute via Router
- [ ] Add jibswap to `DEX_CONFIGS_REGISTRY` in `dex-config.ts`
- [ ] Add jibswap to `DEX_REGISTRY` in `types/dex.ts`
- [ ] Test quote and swap on JBC

**Step 3: commudao Custom AMM Integration**
- [ ] Research commudao AMM implementation details
- [ ] Create `services/dex/commudao.ts` custom service
- [ ] Add commudao ABIs to `lib/abis/`
- [ ] Create `hooks/useCommudaoQuote.ts`
- [ ] Create `hooks/useCommudaoSwapExecution.ts`
- [ ] Add to `DEX_CONFIGS_REGISTRY` (may need new config type)
- [ ] Add to `DEX_REGISTRY` in `types/dex.ts`
- [ ] Test quote and swap on JBC

**Step 4: Multi-DEX Aggregation**
- [ ] Parallel quote fetching from all 3 DEXs
- [ ] Price comparison logic (best output amount)
- [ ] Best price selection with DEX label
- [ ] UI to show alternative DEX quotes
- [ ] Gas cost comparison per DEX
- [ ] Transaction history per DEX

**Additional Setup Tasks:**
- [ ] Add JB Chain token list to `lib/tokens.ts`
  ```typescript
  export const JB_CHAIN_TOKENS: Token[] = [
      {
          address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
          symbol: 'JBC',
          name: 'JB Chain',
          decimals: 18,
          chainId: jbc.id
      },
      // TODO: Add more JBC tokens
  ]

  export const TOKEN_LISTS: Record<number, Token[]> = {
      [kubTestnet.id]: KUB_TESTNET_TOKENS,
      [jbc.id]: JB_CHAIN_TOKENS  // Add this
  }
  ```
- [ ] Verify `/public/chains/jbchain.png` icon exists

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
│   ├── uniswap-v2-router.ts        🆕 Uniswap V2 Router ABI (jibswap)
│   ├── uniswap-v2-factory.ts       🆕 Uniswap V2 Factory ABI
│   ├── uniswap-v2-pair.ts          🆕 Uniswap V2 Pair ABI
│   └── index.ts                    ✅ ABIs export
│
├── dex-config.ts                   ✅ Multi-DEX protocol abstraction
└── tokens.ts                       ✅ KUB testnet token list (+ JB Chain)

components/swap/
├── swap-card.tsx                   ✅ Main swap interface
├── token-select.tsx                ✅ Token selection modal
├── settings-dialog.tsx             ✅ Settings modal (slippage, deadline)
└── dex-select-card.tsx             ✅ DEX selection UI

services/
├── tokens.ts                       ✅ Token operations
└── dex/
    ├── uniswap-v3.ts               ✅ Uniswap V3 protocol service
    ├── uniswap-v2.ts               🆕 Uniswap V2 protocol service (jibswap)
    └── commudao.ts                 🆕 Commudao custom AMM service

hooks/
├── useTokenBalance.ts              ✅ Token balance (native/ERC20)
├── useTokenApproval.ts             ✅ Generic token approval (any protocol)
├── useUniV3Quote.ts                ✅ Uniswap V3 quote fetching
├── useUniV3SwapExecution.ts        ✅ Uniswap V3 swap execution
├── useUniV2Quote.ts                🆕 Uniswap V2 quote fetching (jibswap)
├── useUniV2SwapExecution.ts        🆕 Uniswap V2 swap execution
├── useCommudaoQuote.ts             🆕 Commudao quote fetching
├── useCommudaoSwapExecution.ts     🆕 Commudao swap execution
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
  - [x] Build swap-settings (slippage, deadline) - Complete (settings-dialog.tsx with UI)
- [x] Create swap page at `app/swap/page.tsx` ✅
- [x] Add swap route to navigation ✅
- [x] Test on KUB testnet with faucet tokens ✅
- [x] Add error handling and user feedback (Sonner toasts) ✅

### JB Chain Expansion Tasks 🆕

- [x] Research and document JB Chain DEX ecosystem ✅
  - [x] Verify cmswap V3 contract addresses on JBC
  - [ ] Verify jibswap V2 contract addresses on JBC
  - [ ] Research commudao AMM implementation
  - [x] Document JB Chain token list
- [x] Implement cmswap V3 on JBC ✅
  - [x] Add V3 config for JBC in dex-config.ts
  - [x] Add JB Chain token list with native/wrapped tokens
  - [x] Implement dynamic chain switching in swap UI
  - [x] Add URL parameter sync for shareable swap links
  - [ ] Test quote and swap on JBC
- [ ] Implement jibswap V2 integration
  - [ ] Create V2 service and hooks
  - [ ] Add V2 ABIs
  - [ ] Test quote and swap on JBC
- [ ] Implement commudao custom AMM integration
  - [ ] Create custom service and hooks
  - [ ] Add commudao ABIs
  - [ ] Test quote and swap on JBC
- [ ] Implement multi-DEX aggregation
  - [ ] Parallel quote fetching
  - [ ] Price comparison UI
  - [ ] Gas cost comparison

---

## Phase 3: Earn Feature 🆕

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

## Phase 6: Polish & Optimization

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

## Phase 7: Points Feature 🆕

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

## Phase 8: Advanced Features (Post-MVP)

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

**Phase 5 requires**: Phase 4 complete

**Phase 6 requires**: Phase 5 complete

**Phase 7 requires**: Phase 6 complete

---

## Estimated Timeline

| Phase | Duration | Start Date | Target Date |
|-------|----------|------------|-------------|
| Phase 1 | ✅ Complete | - | ✅ Complete |
| Phase 2 | 1-2 weeks | TBD | TBD |
| Phase 3 | 2-3 weeks | TBD | TBD | 🆕 Earn
| Phase 4 | 1-2 weeks | TBD | TBD |
| Phase 5 | 2 weeks | TBD | TBD |
| Phase 6 | 1-2 weeks | TBD | TBD |
| Phase 7 | 1-2 weeks | TBD | TBD | 🆕 Points
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
5. **Translations** - Add multi-language support
