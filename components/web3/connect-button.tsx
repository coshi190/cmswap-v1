'use client'

import { useState, useRef, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { Button } from '@/components/ui/button'
import { Wallet } from 'lucide-react'
import { ConnectModal } from './connect-modal'
import { AccountDropdown } from './account-dropdown'
import { formatAddress } from '@/lib/utils'
import { toastSuccess } from '@/lib/toast'

function AccountInfo({ className = '' }: { className?: string }) {
    const { address } = useAccount()
    return (
        <AccountDropdown>
            <Button variant="outline" size="default" className={`font-mono text-sm ${className}`}>
                {address ? formatAddress(address) : 'Connecting...'}
            </Button>
        </AccountDropdown>
    )
}

export function ConnectButton({ className = '' }: { className?: string }) {
    const { isConnected } = useAccount()
    const [isModalOpen, setIsModalOpen] = useState(false)
    const previousIsConnected = useRef(false)
    useEffect(() => {
        if (isConnected && !previousIsConnected.current) {
            toastSuccess('Wallet connected')
        }
        previousIsConnected.current = isConnected
    }, [isConnected])
    if (isConnected) {
        return <AccountInfo className={className} />
    }
    return (
        <>
            <Button
                size="default"
                className={className}
                onClick={() => setIsModalOpen(true)}
                aria-label="Connect wallet"
            >
                <Wallet className="mr-2 h-4 w-4" aria-hidden="true" />
                Connect Wallet
            </Button>
            <ConnectModal open={isModalOpen} onOpenChange={setIsModalOpen} />
        </>
    )
}
