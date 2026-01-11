'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAccount, useChainId } from 'wagmi'
import type { Address } from 'viem'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useEarnStore } from '@/store/earn-store'
import { useIncentives } from '@/hooks/useIncentives'
import { useClaimRewards } from '@/hooks/useRewards'
import { formatTokenAmount } from '@/services/tokens'
import { toastSuccess, toastError } from '@/lib/toast'
import type { IncentiveKey } from '@/types/earn'

const KNOWN_INCENTIVES: Record<number, IncentiveKey[]> = {
    25925: [
        // KUB Testnet
        {
            rewardToken: '0x23352915164527e0AB53Ca5519aec5188aa224A2' as Address,
            pool: '0x81182579f4271B910bF108913Be78F0D9C44AaBa' as Address,
            startTime: 1764152820,
            endTime: 1795688820,
            refundee: '0xCA811301C650C92fD45ed32A81C0B757C61595b6' as Address,
        },
    ],
    8899: [], // JBC
    96: [
        // KUB Mainnet
        {
            rewardToken: '0xbB2d2523cF7737Bc9a1884aC2cC1C690Dd8f6D3e' as Address,
            pool: '0xcf0C912a4Efa1b12Eab70f3Ae701d6219103dF0F' as Address,
            startTime: 1765555920,
            endTime: 1766160720,
            refundee: '0x372719aF636C3a8f3819038b782f032436296993' as Address,
        },
    ],
}

export function ClaimRewardsDialog() {
    const { address } = useAccount()
    const chainId = useChainId()
    const { isClaimDialogOpen, closeClaimDialog } = useEarnStore()
    const incentiveKeys = useMemo(() => KNOWN_INCENTIVES[chainId] ?? [], [chainId])
    const { incentives } = useIncentives(incentiveKeys)
    const rewardTokens = useMemo(() => {
        const tokenMap = new Map<string, { address: Address; symbol: string; decimals: number }>()
        incentives.forEach((i) => {
            tokenMap.set(i.rewardToken.toLowerCase(), {
                address: i.rewardToken,
                symbol: i.rewardTokenInfo.symbol,
                decimals: i.rewardTokenInfo.decimals,
            })
        })
        return Array.from(tokenMap.values())
    }, [incentives])
    const [selectedToken, setSelectedToken] = useState<Address | undefined>(undefined)
    useEffect(() => {
        if (rewardTokens.length > 0 && !selectedToken) {
            setSelectedToken(rewardTokens[0]?.address)
        }
    }, [rewardTokens, selectedToken])
    const selectedTokenInfo = useMemo(
        () => rewardTokens.find((t) => t.address === selectedToken),
        [rewardTokens, selectedToken]
    )
    const {
        claim,
        claimableRewards,
        isPreparing,
        isExecuting,
        isConfirming,
        isSuccess,
        error,
        hash,
        refetchRewards,
    } = useClaimRewards(selectedToken, address)
    useEffect(() => {
        if (isSuccess && hash) {
            toastSuccess('Rewards claimed successfully!')
            refetchRewards()
        }
    }, [isSuccess, hash, refetchRewards])
    useEffect(() => {
        if (error) {
            toastError(error)
        }
    }, [error])
    useEffect(() => {
        if (isClaimDialogOpen) {
            refetchRewards()
        }
    }, [isClaimDialogOpen, refetchRewards])
    const isLoading = isPreparing || isExecuting || isConfirming
    const hasRewards = claimableRewards > 0n
    const getButtonText = () => {
        if (isPreparing) return 'Preparing...'
        if (isExecuting) return 'Confirm in wallet...'
        if (isConfirming) return 'Claiming...'
        if (!hasRewards) return 'No rewards to claim'
        return 'Claim Rewards'
    }
    const formattedRewards = formatTokenAmount(claimableRewards, selectedTokenInfo?.decimals ?? 18)
    return (
        <Dialog open={isClaimDialogOpen} onOpenChange={closeClaimDialog}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Claim Rewards</DialogTitle>
                    <DialogDescription>Claim your accumulated mining rewards.</DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {rewardTokens.length === 0 ? (
                        <div className="text-center text-muted-foreground py-4">
                            No reward tokens found.
                        </div>
                    ) : (
                        <>
                            {rewardTokens.length > 1 && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Reward Token</label>
                                    <div className="flex gap-2 flex-wrap">
                                        {rewardTokens.map((token) => (
                                            <Button
                                                key={token.address}
                                                variant={
                                                    selectedToken === token.address
                                                        ? 'default'
                                                        : 'outline'
                                                }
                                                size="sm"
                                                onClick={() => setSelectedToken(token.address)}
                                            >
                                                {token.symbol}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="bg-primary/10 rounded-lg p-6 text-center">
                                <div className="text-sm text-muted-foreground mb-2">
                                    Claimable Rewards
                                </div>
                                <div className="text-3xl font-bold">
                                    {formattedRewards} {selectedTokenInfo?.symbol ?? ''}
                                </div>
                            </div>
                            <div className="text-sm text-muted-foreground">
                                Rewards are accumulated from all your staked positions. You can
                                claim them at any time without unstaking.
                            </div>
                        </>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={closeClaimDialog}>
                        Close
                    </Button>
                    <Button onClick={claim} disabled={isLoading || !hasRewards}>
                        {getButtonText()}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
