# cmswap Architecture

> **Version**: 0.1.1
> **Status**: Early Development - Wallet Connection & Landing Page Complete

## System Overview

cmswap is a modern Web3 application built with a server-side rendered frontend. Currently implemented features focus on wallet connection infrastructure and landing page. Swap, bridge, and launchpad features are planned for future phases.

```
┌─────────────────────────────────────────────────────────────┐
│                     User Browser                            │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Landing UI  │  │   Header     │  │  Wallet UI   │      │
│  │  (IMPLEMENTED)│  │  (IMPLEMENTED)│  │  (IMPLEMENTED)│      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                   │                   │            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Next.js 15 (App Router)                 │   │
│  │              - React Server Components               │   │
│  │              - Server-Side Rendering                │   │
│  │              - Static Site Generation               │   │
│  └──────────────────────────────────────────────────────┘   │
│         │                   │                   │            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Web3 Integration Layer                   │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │   │
│  │  │ wagmi v2  │  │  viem    │  │ Custom Wallet UI │  │   │
│  │  └──────────┘  └──────────┘  └──────────────────┘  │   │
│  │  ┌──────────────────────────────────────────────┐  │   │
│  │  │     TanStack Query (Data Caching)           │  │   │
│  │  └──────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────┘   │
│         │                   │                   │            │
└─────────┼───────────────────┼───────────────────┼────────────┘
          │                   │                   │
┌─────────────────────────────────────────────────────────────┐
│              Blockchain Networks (EVM Chains)               │
│  BNB Chain, KUB Chain, KUB Testnet, JB Chain, Base, World  │
└─────────────────────────────────────────────────────────────┘

⚠️ Protocol Integration Layer (1inch, LayerZero, Uniswap) - NOT YET IMPLEMENTED
```

---

## Current Implementation (v0.1.1)

### ✅ Implemented Features

- **Landing Page**: Hero, Features, Supported Chains, CTA, Footer sections
- **Web3 Wallet Connection**: Full 4-component wallet connection system
- **Multi-Chain Support**: 6 chains with network switching
- **shadcn/ui Integration**: 8 UI components configured
- **Responsive Header**: Desktop/mobile navigation with wallet integration

### ❌ Not Implemented (Planned)

- **Swap Feature**: Token selection, quotes, execution (Phase 2)
- **Bridge Feature**: Cross-chain transfers (Phase 3)
- **Launchpad**: Token creation and liquidity pools (Phase 4)
- **State Management**: Zustand stores for transaction tracking
- **Protocol Services**: 1inch, LayerZero, Uniswap integrations
- **Custom Hooks**: Data fetching hooks for balances, prices, etc.

---

## Frontend Architecture

### Next.js App Router

**Configuration:**
- React Server Components enabled
- Server-Side Rendering for initial page load
- Static Site Generation for landing page
- Client-Side Rendering for Web3 features

**Current Routes:**
```
/              # Landing page (SSG) ✅
/swap          # Swap feature (Planned) ❌
/bridge        # Bridge feature (Planned) ❌
/launchpad     # Launchpad feature (Planned) ❌
```

### Component Architecture (ACTUAL)

```
components/
├── ui/                    # shadcn/ui base components ✅
│   ├── button.tsx         # Button with variants (default, destructive, outline, secondary, ghost, link)
│   ├── card.tsx           # Card component with subcomponents
│   ├── avatar.tsx         # Avatar with fallback support
│   ├── dialog.tsx         # Modal dialog component
│   ├── dropdown-menu.tsx  # Full dropdown menu system
│   ├── navigation-menu.tsx # Navigation menu for site nav
│   ├── separator.tsx      # Visual separator/divider
│   └── sheet.tsx          # Side sheet (mobile menu)
│
├── landing/               # Landing page components ✅
│   ├── hero.tsx           # Hero section with CTA
│   ├── features.tsx       # Features grid
│   ├── chains.tsx         # Supported chains display
│   ├── cta.tsx            # Call-to-action section
│   └── footer.tsx         # Footer component
│
├── layout/                # Layout components ✅
│   └── header.tsx         # Main navigation header with wallet integration
│
├── web3/                  # Web3/Wallet components ✅
│   ├── connect-button.tsx # Main wallet connection trigger
│   ├── connect-modal.tsx  # Wallet selection dialog
│   ├── account-dropdown.tsx # Account actions (copy, explorer, disconnect)
│   └── network-switcher.tsx # Network/chain switching dropdown
│
├── swap/                  # Swap feature (Planned) ❌
├── bridge/                # Bridge feature (Planned) ❌
└── launchpad/             # Launchpad feature (Planned) ❌
```

---

## Web3 Integration Layer (IMPLEMENTED)

### Chain Configuration

**Location:** `lib/wagmi.ts`

**Supported Chains (6):**

| Chain | Chain ID | RPC URL | Explorer | Symbol |
|-------|----------|---------|----------|--------|
| **BNB Chain (BSC)** | 56 | thirdweb.com | bscscan.com | BNB |
| **KUB Chain (Bitkub)** | 96 | bitkubchain.io | bkcscan.com | KUB |
| **KUB Testnet** | 97 | bitkubchain.io | testnet.bkcscan.com | tKUB |
| **JB Chain** | 88 | jibchain.net | exp-l1.jibchain.net | JBC |
| **Base** | 8453 | base.org | basescan.org | ETH |
| **Worldchain** | (from wagmi/chains) | alchemy.com | alchemy.com | ETH |

**Default Chain:** Base (chain ID 8453)

**Wagmi Configuration:**
```typescript
export const wagmiConfig = createConfig({
  chains: supportedChains,        // 6 chains listed above
  transports: { ... },            // RPC URLs per chain
  ssr: true,                      // Server-side rendering support
  storage: createStorage({
    storage: cookieStorage,        // Cookie-based storage
  }),
})
```

### Wallet Connection Components

**Component Hierarchy:**
```
ConnectButton (components/web3/connect-button.tsx)
├── When Disconnected:
│   └── Shows "Connect Wallet" button
│       └── Opens ConnectModal
└── When Connected:
    └── Shows AccountInfo (formatted address)
        └── Opens AccountDropdown
            ├── Copy Address
            ├── View on Explorer
            └── Disconnect

NetworkSwitcher (components/web3/network-switcher.tsx)
└── Shows current chain with icon
    └── Opens dropdown with all chains
        └── Allows chain switching
```

**Component Details:**

#### ConnectButton (`connect-button.tsx`)
- **Purpose:** Main entry point for wallet connection
- **Hooks:** `useAccount()`, `useConnect()`
- **States:** Connected → Shows address, Disconnected → Shows button
- **Dependencies:** ConnectModal, AccountDropdown, Button component

#### ConnectModal (`connect-modal.tsx`)
- **Purpose:** Wallet selection interface
- **Hooks:** `useConnect()`
- **Features:**
  - Lists available wallet connectors (injected, walletConnect, coinbaseWallet)
  - Custom wallet name mapping for better UX
  - Loading state during connection
  - Error handling with user rejection detection (error code 4001)
  - Toast notifications for feedback
  - Modal stays open on error for retry

#### AccountDropdown (`account-dropdown.tsx`)
- **Purpose:** Account management menu
- **Hooks:** `useAccount()`, `useBalance()`, `useDisconnect()`, `useChainId()`
- **Features:**
  - Displays formatted address (e.g., `0x1234...5678`)
  - Shows token balance with symbol
  - Avatar with address initials (e.g., `12`)
  - Copy address to clipboard (with error handling)
  - View on block explorer (opens in new tab with `rel="noopener noreferrer"`)
  - Disconnect wallet
  - Chain metadata integration for explorer URLs

#### NetworkSwitcher (`network-switcher.tsx`)
- **Purpose:** Network/chain switching interface
- **Hooks:** `useChainId()`, `useSwitchChain()`
- **Features:**
  - Shows current network name and icon
  - Active chain indicator (green dot)
  - Lists all supported chains with icons
  - Loading state during switch
  - Toast notifications for success/failure
  - Uses Next.js Image component for chain logos

### viem Usage

Currently used for:
- Type-safe chain configuration
- Transport layer (HTTP RPC calls)
- Wallet method signatures (via wagmi)

Planned for:
- Contract interactions (Swap, Bridge, Launchpad)
- Transaction encoding/decoding
- Custom contract calls

---

## State Management

### Current State (v0.1.1)

**TanStack Query** - Installed and configured for data caching:
- Used by wagmi for internal caching
- QueryClient configured in `app/providers.tsx`
- No custom queries implemented yet

**React State** - Component-level state:
- Modal open/close states
- Mobile menu state
- Form inputs (not yet implemented)

### Planned State Management

**Zustand** (Dependency installed, not implemented):
```typescript
// PLANNED: store/useTransactionStore.ts
interface TransactionStore {
  transactions: Transaction[]
  addTransaction: (tx: Transaction) => void
  updateTransaction: (id: string, updates: Partial<Transaction>) => void
}
```

**Custom Hooks** (Planned):
```typescript
// PLANNED: hooks/useTokenBalance.ts
const { data: balance } = useQuery({
  queryKey: ['balance', address, token],
  queryFn: () => fetchBalance(address, token),
  staleTime: 30_000,
})

// PLANNED: hooks/useSwap.ts
// PLANNED: hooks/useTokenApproval.ts
// PLANNED: hooks/useBridge.ts
```

---

## Planned Features (Roadmap)

### Phase 2: Swap Feature

**Components to Create:**
```
components/swap/
├── swap-panel.tsx       # Main swap interface
├── token-select.tsx     # Token selection modal
├── swap-button.tsx      # Swap action button
└── swap-settings.tsx    # Slippage settings
```

**Protocol Integration:**
```typescript
// PLANNED: services/1inch.ts
// GET /swap/v6.0/{chain_id}/quote
// GET /swap/v6.0/{chain_id}/swap
```

**Data Flow (Planned):**
```
1. User connects wallet (✅ Implemented)
2. User selects tokens and amount (❌ Not implemented)
3. Request swap quote (❌ Not implemented)
   └─> 1inch API called via services/1inch.ts
   └─> Quote displayed to user
4. User approves swap (❌ Not implemented)
   └─> wagmi useWriteContract() prepares transaction
   └─> Wallet prompts for signature
5. Transaction executed (❌ Not implemented)
   └─> Transaction hash captured
   └─> Added to transaction store
   └─> Status tracked until confirmed
```

### Phase 3: Bridge Feature

**Components to Create:**
```
components/bridge/
├── bridge-panel.tsx       # Main bridge interface
├── chain-select.tsx       # Chain selector
└── bridge-status.tsx      # Bridge status tracker
```

**Protocol Integration:**
```typescript
// PLANNED: services/layerzero.ts
// Stargate SDK for token bridging
```

### Phase 4: Launchpad

**Smart Contracts:**
```solidity
// PLANNED: contracts/src/
├── LaunchpadToken.sol        # ERC20 implementation
├── LaunchpadFactory.sol      # Factory pattern
└── interfaces/
    └── ILaunchpad.sol         # Launchpad interface
```

**Components to Create:**
```
components/launchpad/
├── launch-form.tsx           # Token creation form
├── deploy-status.tsx         # Deployment progress
├── pool-config.tsx           # Liquidity pool setup
└── token-page.tsx            # Deployed token page
```

---

## Security Architecture

### Implemented Security Measures (v0.1.1)

1. **No Private Keys** - All signing happens in user's wallet
2. **External Links** - `rel="noopener noreferrer"` on explorer links
3. **Clipboard Security** - Try/catch wrapper with user feedback
4. **User Rejection Detection** - Error code 4001 handled gracefully
5. **Input Validation** - TypeScript strict mode enabled

### Planned Security Measures

1. **Transaction Simulation** - Show transaction details before signing
2. **Zod Validation** - Schemas for all user inputs
3. **Rate Limiting** - API call throttling
4. **CSP Headers** - Content Security Policy
5. **Smart Contract Audit** - Third-party security audit before mainnet

---

## Performance Optimizations

### Implemented (v0.1.1)

1. **Static Generation** - Landing page pre-rendered at build time
2. **Code Splitting** - Route-based splitting automatic with Next.js
3. **Cookie Storage** - Efficient SSR-compatible state storage
4. **Image Optimization** - Next.js Image component for chain logos

### Planned Optimizations

1. **Streaming** - Suspense support for faster initial load
2. **Component Lazy Loading** - For large feature components
3. **Aggressive Caching** - TanStack Query with 30s stale time
4. **CDN Caching** - Vercel Edge Network for static assets

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Vercel Edge                       │
│  ┌───────────────────────────────────────────────┐  │
│  │  Next.js Application (Serverless Functions)  │  │
│  └───────────────────────────────────────────────┘  │
│         │                   │                      │
│  ┌──────▼──────────┐  ┌───▼────────┐  ┌─────────▼───┐
│  │ Static Assets   │  │  API Routes │  │  Edge Functions │
│  │ (CDN Cached)    │  │  (Optional) │  │  (Dynamic)   │
│  └─────────────────┘  └────────────┘  └──────────────┘
└─────────────────────────────────────────────────────┘
                          │
         ┌────────────────┼────────────────┐
         ▼                ▼                ▼
    ┌─────────┐    ┌──────────┐    ┌──────────┐
    │  RPCs   │    │ Planned  │    │ Planned  │
    │ (Thirdweb/   │ 1inch   │    │LayerZero │
    │  Alchemy)│   │   API   │    │   API    │
    └─────────┘    └──────────┘    └──────────┘
```

**Current RPC Providers:**
- BSC: thirdweb.com
- KUB Chain: bitkubchain.io
- JB Chain: jibchain.net
- Base: base.org
- Worldchain: alchemy.com (public)

---

## Monitoring & Observability

### Implemented (v0.1.1)

- **Vercel Analytics** - Page views, Web Vitals (configured)
- **Sentry** - Error tracking (configured, not actively used)

### Planned Monitoring

- **Custom Events** - Transaction success/failure rates
- **Vercel Logs** - Serverless function logs
- **Rate Limiting** - API call monitoring
- **Cost Tracking** - RPC usage monitoring

---

## Type Definitions

**Location:** `types/web3.ts`

**Defined Types:**
```typescript
// Wallet connection types
interface ConnectModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface WalletOption {
  id: string
  name: string
  type: string
}

// Account display types
interface AccountDisplayProps {
  className?: string
}

// Network selection types
interface NetworkOption {
  chainId: number
  name: string
  icon: string
}

// Connection state types
type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

interface ConnectionState {
  status: ConnectionStatus
  address?: string
  chainId?: number
  error?: Error
}
```

---

## Utility Functions

**Location:** `lib/utils.ts`

**Implemented:**
```typescript
// Class name merger for Tailwind CSS
export function cn(...inputs: ClassValue[]): string

// Address formatter (e.g., "0x1234567890abcdef" → "0x1234...cdef")
export function formatAddress(address: string, startChars = 6, endChars = 4): string
```

---

## Dependencies (v0.1.1)

**Core:**
- Next.js: 15.2.0
- React: 19.0.0
- TypeScript: 5.8.0

**Web3:**
- wagmi: 2.15.0
- viem: 2.25.0
- @tanstack/react-query: 5.62.0

**UI:**
- Radix UI (avatar, dialog, dropdown-menu, navigation-menu, separator, slot)
- Tailwind CSS: 3.4.0
- lucide-react: 0.562.0 (icons)
- framer-motion: 11.15.0 (animations)
- react-hot-toast: 2.5.0 (notifications)

**Development:**
- ESLint: 9.0.0
- Prettier: 3.4.0
- Husky: 9.1.0 (git hooks)
- Vitest: 2.1.0 (testing)
- Playwright: 1.49.0 (E2E testing)

**Installed but Not Used:**
- Zustand: 5.0.0 (planned for state management)
- React Hook Form: 7.55.0 (planned for launchpad forms)
- Zod: 3.24.0 (planned for input validation)

---

## Component Data Flow Examples

### Wallet Connection Flow (IMPLEMENTED ✅)

```
1. User clicks "Connect Wallet"
   └─> ConnectButton opens ConnectModal

2. User selects wallet (e.g., MetaMask)
   └─> wagmi useConnect() hook initiates connection
   └─> Loading state shown

3. Connection successful
   └─> Modal closes
   └─> Toast success notification
   └─> ConnectButton shows formatted address
   └─> AccountDropdown becomes available

4. User clicks address
   └─> AccountDropdown opens
   └─> Shows balance and chain info

5. User copies address
   └─> Clipboard API called
   └─> Toast success notification

6. User clicks "View on Explorer"
   └─> Opens chain explorer in new tab
   └─> Uses rel="noopener noreferrer"

7. User clicks "Disconnect"
   └─> wagmi useDisconnect() hook
   └─> Toast success notification
   └─> ConnectButton resets to "Connect Wallet"
```

### Network Switch Flow (IMPLEMENTED ✅)

```
1. User sees current chain (e.g., "BNB Chain")
   └─> NetworkSwitcher shows chain name and icon

2. User clicks network dropdown
   └─> Lists all 6 supported chains
   └─> Shows active indicator on current chain

3. User selects different chain (e.g., "Base")
   └─> wagmi useSwitchChain() initiates switch
   └─> Loading state shown

4. Switch successful
   └─> Toast success notification
   └─> NetworkSwitcher updates to "Base"
   └─> Account balance updates for new chain
```

---

## Future Architecture Enhancements

### Phase 2 (Swap)

1. **API Routes** - Backend API for complex queries
2. **Data Indexing** - The Graph for historical data
3. **Transaction Queue** - Zustand store for tx tracking

### Phase 3 (Bridge)

1. **Cross-chain State** - Track transactions across chains
2. **Relayer Monitoring** - Track LayerZero message delivery
3. **Bridge Status UI** - Real-time bridge progress

### Phase 4 (Launchpad)

1. **Contract Deployment** - Foundry integration
2. **Pool Management** - Uniswap V4 SDK
3. **Token Metadata** - IPFS for token images/info

### Phase 5 (Polish)

1. **Microservices** - Separate services for each feature
2. **Redis Cache** - Price data caching
3. **WebSocket** - Real-time price updates
