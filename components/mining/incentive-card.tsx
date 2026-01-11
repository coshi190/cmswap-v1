'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Incentive } from '@/types/earn'
import { formatTokenAmount } from '@/services/tokens'
import {
    formatTimeRemaining,
    getIncentiveProgress,
    getIncentiveStatus,
} from '@/services/mining/incentives'

interface IncentiveCardProps {
    incentive: Incentive
    onStake: (incentive: Incentive) => void
}

export function IncentiveCard({ incentive, onStake }: IncentiveCardProps) {
    const status = getIncentiveStatus(incentive)
    const progress = getIncentiveProgress(incentive.startTime, incentive.endTime)
    const timeRemaining = formatTimeRemaining(incentive.endTime)
    const statusColor = useMemo(() => {
        switch (status) {
            case 'active':
                return 'bg-green-500/10 text-green-500 border-green-500/20'
            case 'pending':
                return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
            case 'ended':
                return 'bg-gray-500/10 text-gray-500 border-gray-500/20'
        }
    }, [status])
    const formattedReward = formatTokenAmount(
        incentive.totalRewardUnclaimed,
        incentive.rewardTokenInfo.decimals
    )
    return (
        <Card>
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-medium">
                        {incentive.poolToken0.symbol} / {incentive.poolToken1.symbol}
                    </CardTitle>
                    <Badge variant="outline" className={statusColor}>
                        {status === 'active'
                            ? 'Active'
                            : status === 'pending'
                              ? 'Upcoming'
                              : 'Ended'}
                    </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                    {(incentive.poolFee / 10000).toFixed(2)}% fee tier
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <div className="text-xs text-muted-foreground">Reward Token</div>
                        <div className="font-medium">{incentive.rewardTokenInfo.symbol}</div>
                    </div>
                    <div>
                        <div className="text-xs text-muted-foreground">Remaining Rewards</div>
                        <div className="font-medium">
                            {formattedReward} {incentive.rewardTokenInfo.symbol}
                        </div>
                    </div>
                    <div>
                        <div className="text-xs text-muted-foreground">Stakers</div>
                        <div className="font-medium">{incentive.numberOfStakes}</div>
                    </div>
                    <div>
                        <div className="text-xs text-muted-foreground">Time</div>
                        <div className="font-medium">{timeRemaining}</div>
                    </div>
                </div>
                {status === 'active' && (
                    <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Progress</span>
                            <span>{progress}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary rounded-full transition-all"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                )}
                <Button
                    onClick={() => onStake(incentive)}
                    disabled={status === 'ended'}
                    className="w-full"
                    variant={status === 'active' ? 'default' : 'secondary'}
                >
                    {status === 'active' ? 'Stake' : status === 'pending' ? 'Coming Soon' : 'Ended'}
                </Button>
            </CardContent>
        </Card>
    )
}
