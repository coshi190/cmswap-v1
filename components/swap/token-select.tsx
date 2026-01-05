'use client'

import { useState } from 'react'
import type { Token } from '@/types/tokens'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { ChevronDown, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getPopularTokens } from '@/lib/tokens'
import { kubTestnet } from '@/lib/wagmi'
import { formatBalance } from '@/services/tokens'

interface TokenListProps {
    tokens: Token[]
    selectedToken?: Token | null
    onSelect: (token: Token) => void
    balances?: Record<string, string>
    rawBalances?: Record<string, bigint>
    isLoadingBalances?: boolean
}

function TokenList({
    tokens,
    selectedToken,
    onSelect,
    balances: _balances,
    rawBalances,
    isLoadingBalances,
}: TokenListProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const popularTokens = getPopularTokens(kubTestnet.id)
    const filteredTokens = tokens.filter(
        (token) =>
            token.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
            token.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    const regularTokens = filteredTokens.filter(
        (token) => !popularTokens.find((pt) => pt.address === token.address)
    )
    const getBalance = (tokenAddress: string) => {
        if (isLoadingBalances) return '...'
        const token = tokens.find((t) => t.address === tokenAddress)
        const rawBalance = rawBalances?.[tokenAddress]
        if (token && rawBalance !== undefined) {
            return formatBalance(rawBalance, token.decimals)
        }
        return '0'
    }
    return (
        <div className="flex flex-col">
            <div className="py-2">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search token..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>
            </div>
            <ScrollArea className="h-80">
                {popularTokens.length > 0 && searchQuery === '' && (
                    <div className="py-2">
                        <div className="grid grid-cols-3 gap-2">
                            {popularTokens.map((token) => (
                                <Card
                                    key={token.address}
                                    onClick={() => onSelect(token)}
                                    className={cn(
                                        'cursor-pointer transition-colors hover:bg-accent',
                                        selectedToken?.address === token.address && 'bg-accent'
                                    )}
                                >
                                    <CardContent className="flex flex-col items-center gap-1 p-3">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={token.logo} alt={token.symbol} />
                                            <AvatarFallback className="bg-primary/10 text-primary">
                                                {token.symbol.charAt(0)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className="text-sm font-medium">{token.symbol}</span>
                                        <span className="text-xs text-muted-foreground">
                                            {getBalance(token.address)}
                                        </span>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                        <Separator className="mt-4" />
                    </div>
                )}
                <div className="py-2">
                    {searchQuery === '' && popularTokens.length > 0 && (
                        <p className="mb-3 text-xs font-medium text-muted-foreground">
                            {searchQuery ? 'Search Results' : 'All Tokens'}
                        </p>
                    )}
                    {(searchQuery ? filteredTokens : regularTokens).length === 0 ? (
                        <div className="py-8 text-center text-sm text-muted-foreground">
                            No tokens found
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {(searchQuery ? filteredTokens : regularTokens).map((token) => (
                                <Card
                                    key={token.address}
                                    onClick={() => onSelect(token)}
                                    className={cn(
                                        'cursor-pointer transition-colors hover:bg-accent',
                                        selectedToken?.address === token.address && 'bg-accent'
                                    )}
                                >
                                    <CardContent className="flex w-full items-center gap-3 px-3 py-2">
                                        <Avatar className="h-8 w-8 shrink-0">
                                            <AvatarImage src={token.logo} alt={token.symbol} />
                                            <AvatarFallback className="bg-primary/10 text-primary">
                                                {token.symbol.charAt(0)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-1 flex-col">
                                            <span className="font-medium">{token.symbol}</span>
                                            <span className="text-xs text-muted-foreground">
                                                {token.name}
                                            </span>
                                        </div>
                                        <span className="text-sm text-muted-foreground">
                                            {getBalance(token.address)}
                                        </span>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    )
}

export interface TokenSelectProps {
    token: Token | null
    tokens: Token[]
    onSelect: (token: Token) => void
    balances?: Record<string, string>
    rawBalances?: Record<string, bigint>
    isLoadingBalances?: boolean
}

export function TokenSelect({
    token,
    tokens,
    onSelect,
    balances,
    rawBalances,
    isLoadingBalances,
}: TokenSelectProps) {
    const [open, setOpen] = useState(false)
    const handleSelect = (selectedToken: Token) => {
        onSelect(selectedToken)
        setOpen(false)
    }
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    className={cn('min-w-32 justify-start px-3', !token && 'text-muted-foreground')}
                >
                    {token ? (
                        <div className="flex items-center gap-2">
                            {token.logo && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={token.logo}
                                    alt={token.symbol}
                                    className="h-5 w-5 rounded-full object-cover"
                                />
                            )}
                            <span className="font-medium">{token.symbol}</span>
                        </div>
                    ) : (
                        'Select'
                    )}
                    <ChevronDown className="ml-auto h-4 w-4 opacity-50" />
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Select a token</DialogTitle>
                </DialogHeader>
                <TokenList
                    tokens={tokens}
                    selectedToken={token}
                    onSelect={handleSelect}
                    balances={balances}
                    rawBalances={rawBalances}
                    isLoadingBalances={isLoadingBalances}
                />
            </DialogContent>
        </Dialog>
    )
}
