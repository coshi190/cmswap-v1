'use client'

import Link from 'next/link'
import { formatEther } from 'viem'
import type { Address } from 'viem'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { TokenIcon } from '@/components/ui/token-icon'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { useNativeUsdPriceContext } from '@/components/launchpad/native-usd-price-provider'
import { useCreatedTokens } from '@/hooks/useCreatedTokens'
import { formatCompact, formatKub, formatTokenAmount } from '@/services/launchpad'
import type { CreatedToken } from '@/types/portfolio'

function FeeAmount({
    nativeWei,
    tokenWei,
    symbol,
    nativeUsdPrice,
    tokenUsdPrice,
}: {
    nativeWei: bigint
    tokenWei: bigint
    symbol: string
    nativeUsdPrice: number | null
    tokenUsdPrice: number
}) {
    const nativeUsd =
        nativeUsdPrice !== null ? parseFloat(formatEther(nativeWei)) * nativeUsdPrice : null
    const tokenUsd = tokenUsdPrice > 0 ? parseFloat(formatEther(tokenWei)) * tokenUsdPrice : null
    const headline = `${formatKub(nativeWei)} KUB`

    return (
        <div className="text-right">
            <p className="font-medium tabular-nums">
                {tokenWei > 0n ? (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className="cursor-default underline decoration-dotted underline-offset-4">
                                {headline}
                            </span>
                        </TooltipTrigger>
                        <TooltipContent>
                            <div>{formatKub(nativeWei)} KUB from buys</div>
                            <div>
                                {formatTokenAmount(tokenWei)} {symbol} from sells
                                {tokenUsd !== null && ` (~$${formatCompact(tokenUsd)})`}
                            </div>
                        </TooltipContent>
                    </Tooltip>
                ) : (
                    headline
                )}
            </p>
            {nativeUsd !== null && (
                <p className="text-xs text-muted-foreground tabular-nums">
                    ${formatCompact(nativeUsd)}
                </p>
            )}
        </div>
    )
}

function CreatedTokenRow({
    row,
    nativeUsdPrice,
}: {
    row: CreatedToken
    nativeUsdPrice: number | null
}) {
    const { token } = row
    const availableNative = row.creatorFeeNative - row.creatorFeeClaimedNative
    const availableNativeClamped = availableNative > 0n ? availableNative : 0n
    const availableToken = row.creatorFeeToken - row.creatorFeeClaimedToken
    const availableTokenClamped = availableToken > 0n ? availableToken : 0n
    const symbol = token.symbol || 'tokens'

    return (
        <TableRow>
            <TableCell>
                <Link
                    href={`/launchpad/token/${token.address}?chain=${token.chainId}`}
                    className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                >
                    <TokenIcon src={token.logo} symbol={token.symbol || '???'} size="md" />
                    <div className="min-w-0">
                        <p className="truncate font-medium">
                            {token.symbol || '???'}
                            {token.isGraduated && (
                                <span className="ml-1.5 text-xs font-medium text-positive">
                                    Graduated
                                </span>
                            )}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{token.name}</p>
                    </div>
                </Link>
            </TableCell>
            <TableCell className="text-right font-medium tabular-nums">
                {nativeUsdPrice !== null
                    ? `$${formatCompact(row.marketCapNative * nativeUsdPrice)}`
                    : `${formatCompact(row.marketCapNative)} KUB`}
            </TableCell>
            <TableCell>
                <FeeAmount
                    nativeWei={row.creatorFeeNative}
                    tokenWei={row.creatorFeeToken}
                    symbol={symbol}
                    nativeUsdPrice={nativeUsdPrice}
                    tokenUsdPrice={row.tokenUsdPrice}
                />
            </TableCell>
            <TableCell>
                <FeeAmount
                    nativeWei={availableNativeClamped}
                    tokenWei={availableTokenClamped}
                    symbol={symbol}
                    nativeUsdPrice={nativeUsdPrice}
                    tokenUsdPrice={row.tokenUsdPrice}
                />
            </TableCell>
        </TableRow>
    )
}

export function CreatedTokensTab({ address }: { address: Address }) {
    const { createdTokens, isLoading } = useCreatedTokens(address)
    const { nativeUsdPrice } = useNativeUsdPriceContext()

    if (isLoading) {
        return (
            <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                    <Card key={i}>
                        <CardContent className="px-4 py-3">
                            <div className="animate-pulse flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-full bg-muted" />
                                    <div className="h-4 w-24 bg-muted rounded" />
                                </div>
                                <div className="h-4 w-32 bg-muted rounded" />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        )
    }

    if (createdTokens.length === 0) {
        return (
            <EmptyState
                title="No Created Tokens"
                description="This wallet hasn't created any launchpad tokens yet."
            />
        )
    }

    return (
        <Card>
            <CardContent className="p-0 sm:p-2">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Token</TableHead>
                            <TableHead className="text-right">Market Cap</TableHead>
                            <TableHead className="text-right">Creator Fee Earned</TableHead>
                            <TableHead className="text-right">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <span className="cursor-default underline decoration-dotted underline-offset-4">
                                            Available to Claim
                                        </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        Estimated — paid out manually (in KUB and/or tokens), not
                                        withdrawable on-chain yet
                                    </TooltipContent>
                                </Tooltip>
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {createdTokens.map((row) => (
                            <CreatedTokenRow
                                key={row.token.address.toLowerCase()}
                                row={row}
                                nativeUsdPrice={nativeUsdPrice}
                            />
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}
