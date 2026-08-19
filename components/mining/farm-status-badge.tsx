'use client'

import { Badge } from '@/components/ui/badge'
import { TokenIcon, TokenIconPair } from '@/components/ui/token-icon'
import { formatFeeTier } from '@/lib/liquidity-helpers'
import { getDisplayToken } from '@/lib/tokens'
import { cn } from '@/lib/utils'
import type { FarmStatus } from '@/services/mining/farm-list'
import type { Incentive } from '@/types/earn'

const STATUS_LABEL: Record<FarmStatus, { label: string; className: string }> = {
    active: { label: 'Running', className: 'bg-positive/10 text-positive border-positive/20' },
    pending: { label: 'Scheduled', className: 'text-muted-foreground' },
    ended: { label: 'Ended', className: 'text-muted-foreground' },
}

export function FarmStatusBadge({ status, className }: { status: FarmStatus; className?: string }) {
    const { label, className: statusClassName } = STATUS_LABEL[status]
    return (
        <Badge variant="outline" className={cn('shrink-0', statusClassName, className)}>
            {label}
        </Badge>
    )
}

/**
 * Pair icons, symbols, fee tier and the reward token — the identity block shared by card and row.
 * It shrinks rather than pushing whatever sits beside it out of the card.
 */
export function FarmIdentity({
    incentive,
    size = 'md',
}: {
    incentive: Incentive
    size?: 'sm' | 'md'
}) {
    const token0 = getDisplayToken(incentive.poolToken0)
    const token1 = getDisplayToken(incentive.poolToken1)
    const rewardToken = getDisplayToken(incentive.rewardTokenInfo)

    return (
        <div className="flex min-w-0 flex-1 items-center gap-3">
            <TokenIconPair
                src0={token0.logo}
                symbol0={token0.symbol}
                src1={token1.logo}
                symbol1={token1.symbol}
                size={size}
                className="shrink-0"
            />
            <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate font-semibold">
                        {token0.symbol} / {token1.symbol}
                    </span>
                    <Badge variant="outline" className="shrink-0 text-xs">
                        {formatFeeTier(incentive.poolFee)}
                    </Badge>
                </div>
                <div className="mt-0.5 flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                    <span className="shrink-0">Earn</span>
                    <TokenIcon
                        src={rewardToken.logo}
                        symbol={rewardToken.symbol}
                        size="xs"
                        className="shrink-0"
                    />
                    <span className="truncate">{rewardToken.symbol}</span>
                </div>
            </div>
        </div>
    )
}
