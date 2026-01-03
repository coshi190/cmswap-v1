import type { Chain } from 'viem/chains'

export interface ConnectModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export interface WalletOption {
    id: string
    name: string
    icon: string
    connectorId: string
    isInstalled?: boolean
    downloadUrl?: string
    isRecent?: boolean
}

export interface AccountDisplayProps {
    address?: string
    balance?: string
    chain?: Chain
    className?: string
}

export interface NetworkOption {
    chain: Chain
    icon: string
    name: string
    symbol: string
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

export interface ConnectionState {
    status: ConnectionStatus
    address?: string
    chainId?: number
    error?: Error
}
