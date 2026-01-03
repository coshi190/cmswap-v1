# cmswap Architecture

## System Overview

cmswap is a modern Web3 application built with a server-side rendered frontend that communicates directly with blockchain networks and DeFi protocols. No backend server is required for core functionality.

```
┌─────────────────────────────────────────────────────────────┐
│                     User Browser                            │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Swap UI    │  │  Bridge UI   │  │ Launchpad UI │      │
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
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Protocol Integration Layer               │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │   │
│  │  │  1inch   │  │LayerZero │  │  Uniswap V4 SDK  │  │   │
│  │  │   API    │  │ Wormhole │  │                  │  │   │
│  │  └──────────┘  └──────────┘  └──────────────────┘  │   │
│  └──────────────────────────────────────────────────────┘   │
│         │                   │                   │            │
└─────────┼───────────────────┼───────────────────┼────────────┘
          │                   │                   │
┌─────────────────────────────────────────────────────────────┐
│              Blockchain Networks (EVM Chains)               │
│  Ethereum, BSC, Polygon, Arbitrum, Optimism, Base           │
└─────────────────────────────────────────────────────────────┘
```

## Frontend Architecture

### Next.js App Router

**Why App Router?**
- React Server Components for better performance
- Built-in data fetching and caching
- Streaming and suspense support
- Better SEO with server-side rendering

**Key Routes:**
```
/              # Landing page (SSG)
/swap          # Swap feature (CSR)
/bridge        # Bridge feature (CSR)
/launchpad     # Launchpad feature (CSR)
```

### Component Architecture

```
components/
├── ui/                    # shadcn/ui base components
│   ├── button.tsx
│   ├── card.tsx
│   └── ...
├── landing/               # Landing page components
│   ├── hero.tsx
│   ├── features.tsx
│   └── ...
├── web3/                  # Wallet & Web3 components
│   ├── wallet-connect.tsx
│   ├── network-switcher.tsx
│   └── ...
├── swap/                  # Swap feature components
│   ├── swap-panel.tsx
│   ├── token-select.tsx
│   └── ...
├── bridge/                # Bridge feature components
│   └── ...
└── launchpad/             # Launchpad feature components
    └── ...
```

## Web3 Integration Layer

### wagmi Configuration

Located in `lib/wagmi.ts`, this file configures:
- Supported chains
- RPC endpoints (Alchemy, public RPCs)
- Cookie storage for SSR
- Chain metadata for UI

```typescript
export const wagmiConfig = createConfig({
  chains: supportedChains,        // ETH, BSC, POLYGON, ARB, OP, BASE
  transports: { ... },            // RPC URLs per chain
  ssr: true,                      // Server-side rendering support
  storage: createStorage({
    storage: cookieStorage,        // Cookie-based storage
  }),
})
```

### viem Usage

viem is used for:
- Type-safe contract interactions
- Transaction encoding/decoding
- Wallet method signatures
- Public RPC calls

### Wallet Connection (wagmi)

Custom wallet UI components using wagmi hooks:
- Wallet connection modal (useConnect, useDisconnect)
- Account display (useAccount)
- Network switching (useSwitchChain)
- Balance fetching (useBalance)

**Approach:** Using wagmi directly gives full control and smaller bundle size.

## Protocol Integrations

### Swap Aggregation (1inch API)

**Why 1inch?**
- 150+ liquidity sources aggregated
- Best price routing algorithm
- Multi-chain support
- No API key required for basic usage

**Implementation:**
```typescript
// services/1inch.ts
// GET /swap/v6.0/{chain_id}/quote
// GET /swap/v6.0/{chain_id}/swap
```

**Data Flow:**
```
User Input → 1inch Quote API → Display Quote → User Approves → 1inch Swap API → Execute Transaction
```

### Cross-Chain Bridge (LayerZero)

**Why LayerZero?**
- Lightweight messaging protocol
- Fast finality
- Broad chain support
- Stargate Finance for stablecoins

**Implementation:**
```typescript
// services/layerzero.ts
// Stargate SDK for token bridging
```

**Data Flow:**
```
Select Source/Dest Chain → Get Bridge Quote → User Approves → Execute Bridge → Track Status
```

### Memecoin Launchpad (Uniswap V4)

**Why Uniswap V4?**
- Hooks for custom functionality
- Concentrated liquidity
- Gas efficiency
- Largest DEX ecosystem

**Implementation:**
```typescript
// services/uniswap.ts
// Uniswap V4 SDK for pool creation
// Foundry for token deployment
```

**Data Flow:**
```
Token Metadata → Deploy ERC20 → Create Liquidity Pool → Add Liquidity → Token Tradable
```

## State Management

### Client State

**Zustand** for UI state:
- Transaction queue
- User preferences
- Theme selection
- Modal states

```typescript
// store/useTransactionStore.ts
interface TransactionStore {
  transactions: Transaction[]
  addTransaction: (tx: Transaction) => void
  updateTransaction: (id: string, updates: Partial<Transaction>) => void
}
```

### Server State

**TanStack Query** for blockchain data:
- Token balances
- Token prices
- Transaction history
- Pool reserves

```typescript
// hooks/useTokenBalance.ts
const { data: balance } = useQuery({
  queryKey: ['balance', address, token],
  queryFn: () => fetchBalance(address, token),
  staleTime: 30_000, // 30 seconds
})
```

## Security Architecture

### Client-Side Security

1. **No Private Keys** - All signing happens in user's wallet
2. **Transaction Simulation** - Show transaction details before signing
3. **Input Validation** - Zod schemas for all user inputs
4. **Rate Limiting** - API call throttling
5. **CSP Headers** - Content Security Policy configured

### Smart Contract Security (Phase 2)

1. **Slither** - Static analysis
2. **Foundry Fuzzing** - Property-based testing
3. **Invariant Testing** - Critical property verification
4. **Third-party Audit** - Professional security audit

## Data Flow Examples

### Swap Flow

```
1. User connects wallet (custom wallet UI)
   └─> wagmi useAccount() hook gets address

2. User selects tokens and amount
   └─> TanStack Query fetches balances

3. Request swap quote
   └─> 1inch API called via services/1inch.ts
   └─> Quote displayed to user

4. User approves swap
   └─> wagmi useWriteContract() prepares transaction
   └─> Wallet prompts for signature

5. Transaction executed
   └─> Transaction hash captured
   └─> Added to transaction store
   └─> Status tracked until confirmed
```

### Bridge Flow

```
1. User selects source and destination chains
   └─> wagmi useSwitchChain() for chain switching

2. User selects token and amount
   └─> LayerZero/Stargate quote fetched

3. User approves bridge
   └─> Cross-chain transaction initiated

4. Transaction tracking
   └─> Source chain transaction confirmed
   └─> Relayer processes bridge
   └─> Destination chain transaction confirmed
```

## Performance Optimizations

### 1. Server-Side Rendering

- Landing page pre-rendered at build time
- Dynamic data loaded on client-side
- Streaming for faster initial page load

### 2. Static Generation

- Marketing pages generated as static HTML
- Cached on CDN (Vercel Edge Network)
- Instant page loads

### 3. Code Splitting

- Route-based splitting automatic with Next.js
- Component lazy loading for large features
- Dynamic imports for heavy libraries

### 4. Caching Strategy

- TanStack Query with 30s stale time
- Immutable cache for token lists
- Aggressive revalidation for prices

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
    │ Alchemy │    │  1inch   │    │LayerZero │
    │   RPC   │    │   API    │    │   API    │
    └─────────┘    └──────────┘    └──────────┘
```

## Monitoring & Observability

### Client-Side

- **Vercel Analytics** - Page views, Web Vitals
- **Sentry** - Error tracking, performance monitoring
- **Custom Events** - Transaction success/failure rates

### Server-Side

- **Vercel Logs** - Serverless function logs
- **Rate Limiting** - API call monitoring
- **Cost Tracking** - RPC usage monitoring

## Future Architecture Enhancements

### Phase 2

1. **API Routes** - Backend API for complex queries
2. **Database** - User preferences, transaction history
3. **Indexing** - The Graph for historical data

### Phase 3

1. **Microservices** - Separate services for swap/bridge/launchpad
2. **Caching Layer** - Redis for price data
3. **WebSocket** - Real-time price updates
