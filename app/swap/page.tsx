'use client'

import { useAccount, useChainId, useSwitchChain } from 'wagmi'
import { kubTestnet } from '@/lib/wagmi'
import { Button } from '@/components/ui/button'
import { SwapCard } from '@/components/swap/swap-card'
import { DexSelectCard } from '@/components/swap/dex-select-card'
import { Suspense } from 'react'

export default function SwapPage() {
    return (
        <Suspense
            fallback={
                <div className="flex min-h-screen items-center justify-center">Loading...</div>
            }
        >
            <SwapContent />
        </Suspense>
    )
}

function SwapContent() {
    const { isConnected } = useAccount()
    const chainId = useChainId()
    const { switchChain } = useSwitchChain()
    const isCorrectChain = chainId === kubTestnet.id
    const handleSwitchChain = () => {
        switchChain({ chainId: kubTestnet.id })
    }
    if (!isConnected) {
        return (
            <div className="flex min-h-screen items-start justify-center">
                <div className="text-center">
                    <h1 className="mb-4 text-muted-foreground">
                        Connect your wallet to swap tokens
                    </h1>
                    <Button>Connect Wallet</Button>
                </div>
            </div>
        )
    }
    if (!isCorrectChain) {
        return (
            <div className="flex min-h-screen items-start justify-center">
                <div className="text-center">
                    <h1 className="mb-4 text-2xl font-bold">Wrong Network</h1>
                    <p className="mb-4 text-muted-foreground">
                        Please switch to KUB Testnet to use cmswap
                    </p>
                    <Button onClick={handleSwitchChain}>Switch Network</Button>
                </div>
            </div>
        )
    }
    return (
        <div className="flex min-h-screen items-start justify-center p-4">
            <div className="w-full max-w-md space-y-4">
                <SwapCard />
                <DexSelectCard />
            </div>
        </div>
    )
}
