'use client'

import { useCallback, useMemo, useState } from 'react'
import { useChainId } from 'wagmi'
import { ChevronDown, Search } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { TokenIconPair, TokenIconSkeleton } from '@/components/ui/token-icon'
import { useAllPools } from '@/hooks/useAllPools'
import { getDisplayToken } from '@/lib/tokens'
import { formatFeeTier } from '@/lib/liquidity-helpers'
import { formatTvl } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { V3PoolData } from '@/types/earn'

interface FarmPoolPickerProps {
    value: V3PoolData | null
    onChange: (pool: V3PoolData) => void
}

function poolLabel(pool: V3PoolData): { symbol0: string; symbol1: string } {
    return {
        symbol0: getDisplayToken(pool.token0).symbol,
        symbol1: getDisplayToken(pool.token1).symbol,
    }
}

export function FarmPoolPicker({ value, onChange }: FarmPoolPickerProps) {
    const chainId = useChainId()
    const [open, setOpen] = useState(false)
    const [search, setSearch] = useState('')
    const { pools, metricsByAddress, isLoading } = useAllPools(chainId)
    const tvlOf = useCallback(
        (addr: string) => metricsByAddress.get(addr.toLowerCase())?.tvlUsd ?? null,
        [metricsByAddress]
    )

    const sorted = useMemo(() => {
        const query = search.trim().toLowerCase()
        const matched = query
            ? pools.filter((p) => {
                  const { symbol0, symbol1 } = poolLabel(p)
                  return [symbol0, symbol1, p.token0.name, p.token1.name, p.address].some((s) =>
                      s?.toLowerCase().includes(query)
                  )
              })
            : pools
        return [...matched].sort((a, b) => (tvlOf(b.address) ?? 0) - (tvlOf(a.address) ?? 0))
    }, [pools, search, tvlOf])

    const selectedLabel = value ? poolLabel(value) : null

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                setOpen(next)
                if (!next) setSearch('')
            }}
        >
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    className={cn(
                        'w-full h-12 justify-between px-3 rounded-xl bg-muted/40 border-border/40 hover:bg-muted/60',
                        !value && 'text-muted-foreground'
                    )}
                >
                    {value && selectedLabel ? (
                        <span className="flex items-center gap-2.5 min-w-0">
                            <TokenIconPair
                                src0={getDisplayToken(value.token0).logo}
                                symbol0={selectedLabel.symbol0}
                                src1={getDisplayToken(value.token1).logo}
                                symbol1={selectedLabel.symbol1}
                                size="xs"
                            />
                            <span className="font-medium truncate">
                                {selectedLabel.symbol0} / {selectedLabel.symbol1}
                            </span>
                            <Badge variant="outline" className="shrink-0">
                                {formatFeeTier(value.fee)}
                            </Badge>
                        </span>
                    ) : (
                        'Select a pool'
                    )}
                    <ChevronDown className="ml-auto h-5 w-5 opacity-50" />
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Select a pool</DialogTitle>
                </DialogHeader>
                <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        autoFocus
                        placeholder="Search by token or address"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 rounded-xl border border-input"
                    />
                </div>
                <ScrollArea className="h-80 -mr-2 pr-2">
                    {isLoading ? (
                        <div className="space-y-2">
                            {[0, 1, 2, 3].map((i) => (
                                <div key={i} className="flex items-center gap-3 p-3">
                                    <div className="flex -space-x-2">
                                        <TokenIconSkeleton size="sm" />
                                        <TokenIconSkeleton size="sm" />
                                    </div>
                                    <div className="h-4 w-28 bg-muted rounded animate-pulse" />
                                </div>
                            ))}
                        </div>
                    ) : sorted.length === 0 ? (
                        <p className="py-10 text-center text-sm text-muted-foreground">
                            {pools.length === 0
                                ? 'No pools with liquidity on this chain yet.'
                                : `No pools match "${search}"`}
                        </p>
                    ) : (
                        <div className="space-y-1">
                            {sorted.map((pool) => {
                                const { symbol0, symbol1 } = poolLabel(pool)
                                const tvl = tvlOf(pool.address)
                                const isSelected =
                                    value?.address.toLowerCase() === pool.address.toLowerCase()
                                return (
                                    <button
                                        key={`${pool.address}-${pool.fee}`}
                                        type="button"
                                        onClick={() => {
                                            onChange(pool)
                                            setOpen(false)
                                            setSearch('')
                                        }}
                                        className={cn(
                                            'flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors',
                                            isSelected
                                                ? 'border-primary bg-primary/5'
                                                : 'border-transparent hover:bg-muted/50'
                                        )}
                                    >
                                        <TokenIconPair
                                            src0={getDisplayToken(pool.token0).logo}
                                            symbol0={symbol0}
                                            src1={getDisplayToken(pool.token1).logo}
                                            symbol1={symbol1}
                                            size="sm"
                                        />
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium truncate">
                                                    {symbol0} / {symbol1}
                                                </span>
                                                <Badge variant="outline" className="shrink-0">
                                                    {formatFeeTier(pool.fee)}
                                                </Badge>
                                            </div>
                                        </div>
                                        <span className="shrink-0 text-sm text-muted-foreground tabular-nums">
                                            {tvl != null ? formatTvl(tvl) : '—'}
                                        </span>
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    )
}
