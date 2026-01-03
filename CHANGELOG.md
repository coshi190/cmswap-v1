# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2026-01-03

### Added
- **Web3 Wallet Connection System**
  - ConnectButton with wallet selection modal
  - AccountDropdown with balance display and actions (copy address, view on explorer, disconnect)
  - NetworkSwitcher supporting 6 chains:
    - BNB Chain (BSC)
    - KUB Chain (Bitkub)
    - KUB Testnet
    - JB Chain (Jibchain)
    - Base
    - Worldchain
  - Multi-chain support with automatic network switching
  - Toast notifications for user feedback
  - Loading states for connection/switching operations
  - User rejection detection (error code 4001)

### Technical
- Added wagmi v2 and viem v2 for Web3 integration
- Added react-hot-toast for notifications
- Added Radix UI components (Dialog, DropdownMenu, Avatar, NavigationMenu, Sheet, Separator)
- Added shared `formatAddress()` utility function
- Comprehensive error handling with proper TypeScript type guards
- Full accessibility support (ARIA labels, keyboard navigation)
- Security: `noopener,noreferrer` on external links, clipboard error handling

### Files
- `components/web3/connect-modal.tsx` - Wallet selection interface
- `components/web3/connect-button.tsx` - Main wallet connection button
- `components/web3/account-dropdown.tsx` - Account management dropdown
- `components/web3/network-switcher.tsx` - Network switching interface
- `components/layout/header.tsx` - Updated with wallet components
- `types/web3.ts` - TypeScript interfaces
- `lib/utils.ts` - Added formatAddress utility

## [0.1.0] - 2026-01-02

### Added
- Initial project setup with Next.js 15, TypeScript, and Tailwind CSS
- Landing page with Hero, Features, Chains, CTA, and Footer sections
- Multi-chain configuration (6 chains)
- shadcn/ui setup with Button component
- ESLint, Prettier, and Husky configuration
- Project documentation (README, architecture, tech-stack, roadmap)
- Vercel deployment configuration
