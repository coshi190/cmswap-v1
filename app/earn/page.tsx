'use client'

import { Suspense } from 'react'
import { useAccount, useChainId } from 'wagmi'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PoolsList } from '@/components/positions/pools'
import { PositionsList } from '@/components/positions/positions-list'
import { AddLiquidityDialog } from '@/components/positions/add-liquidity-dialog'
import { RemoveLiquidityDialog } from '@/components/positions/remove-liquidity-dialog'
import { CollectFeesDialog } from '@/components/positions/collect-fees-dialog'
import { PositionDetailsModal } from '@/components/positions/position-details-modal'
import { IncreaseLiquidityDialog } from '@/components/positions/increase-liquidity-dialog'
import { useEarnStore, useActiveTab } from '@/store/earn-store'
import { getV3Config } from '@/lib/dex-config'
import { ConnectButton } from '@/components/web3/connect-button'

function EarnContent() {
    const { isConnected } = useAccount()
    const chainId = useChainId()
    const activeTab = useActiveTab()
    const { setActiveTab, openAddLiquidity } = useEarnStore()
    const dexConfig = getV3Config(chainId)
    if (!dexConfig?.positionManager) {
        return (
            <div className="flex min-h-screen items-start justify-center p-4 pt-24">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle>Chain Not Supported</CardTitle>
                        <CardDescription>
                            Liquidity management is not available on this chain. Please switch to a
                            supported chain like KUB Chain or JBC.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        )
    }
    if (!isConnected) {
        return (
            <div className="flex min-h-screen items-start justify-center p-4 pt-24">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <CardTitle>Connect Wallet</CardTitle>
                        <CardDescription>
                            Connect your wallet to manage liquidity positions.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center">
                        <ConnectButton />
                    </CardContent>
                </Card>
            </div>
        )
    }
    return (
        <div className="flex min-h-screen items-start justify-center p-4 pt-8">
            <div className="w-full max-w-4xl space-y-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">Liquidity</h1>
                    <Button onClick={() => openAddLiquidity()}>+ New Position</Button>
                </div>
                <Tabs
                    value={activeTab}
                    onValueChange={(v) => setActiveTab(v as 'pools' | 'positions')}
                >
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="pools">Pools</TabsTrigger>
                        <TabsTrigger value="positions">My Positions</TabsTrigger>
                    </TabsList>
                    <TabsContent value="positions" className="mt-4">
                        <PositionsList />
                    </TabsContent>
                    <TabsContent value="pools" className="mt-4">
                        <PoolsList />
                    </TabsContent>
                </Tabs>
                <AddLiquidityDialog />
                <RemoveLiquidityDialog />
                <CollectFeesDialog />
                <PositionDetailsModal />
                <IncreaseLiquidityDialog />
            </div>
        </div>
    )
}

export default function EarnPage() {
    return (
        <Suspense
            fallback={
                <div className="flex items-center justify-center min-h-screen">Loading...</div>
            }
        >
            <EarnContent />
        </Suspense>
    )
}
