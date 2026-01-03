'use client'

import Image from 'next/image'
import { Fragment } from 'react'
import { useChainId, useSwitchChain } from 'wagmi'
import { supportedChains, getChainMetadata } from '@/lib/wagmi'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Loader2, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'

export function NetworkSwitcher({ className = '' }: { className?: string }) {
    const chainId = useChainId()
    const { switchChain, isPending } = useSwitchChain()
    const currentChain = getChainMetadata(chainId)
    const handleSwitchChain = async (targetChainId: number) => {
        if (targetChainId === chainId) return
        try {
            await switchChain({ chainId: targetChainId })
            const meta = getChainMetadata(targetChainId)
            toast.success(`Switched to ${meta?.name || 'unknown network'}`)
        } catch (error) {
            console.error('Switch chain error:', error)
            toast.error('Failed to switch network')
        }
    }
    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                aria-label="Select network"
                className={`flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors ${className}`}
            >
                {currentChain && (
                    <>
                        <div className="relative h-5 w-5">
                            <Image
                                src={currentChain.icon}
                                alt={currentChain.name}
                                fill
                                className="object-cover"
                            />
                        </div>
                        {isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <ChevronDown className="h-4 w-4" />
                        )}
                    </>
                )}
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                className="w-56 bg-card/95 backdrop-blur-md border-border/50"
            >
                {supportedChains.map((chain) => {
                    const meta = getChainMetadata(chain.id)
                    if (!meta) return null
                    const isActive = chain.id === chainId
                    return (
                        <Fragment key={chain.id}>
                            <DropdownMenuItem
                                onClick={() => handleSwitchChain(chain.id)}
                                disabled={isPending || isActive}
                                className="flex items-center gap-3 cursor-pointer"
                            >
                                <div className="relative h-5 w-5 flex-shrink-0">
                                    <Image
                                        src={meta.icon}
                                        alt={meta.name}
                                        fill
                                        className="rounded-full object-cover"
                                    />
                                </div>
                                <div className="flex-1">
                                    <div className="font-medium">{meta.name}</div>
                                    <div className="text-xs text-muted-foreground">{meta.symbol}</div>
                                </div>
                                {isActive && <div className="h-2 w-2 rounded-full bg-primary" />}
                            </DropdownMenuItem>
                        </Fragment>
                    )
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
