'use client'

import { useState } from 'react'
import { useChainId } from 'wagmi'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { useSwapStore } from '@/store/swap-store'
import { DEX_REGISTRY } from '@/types/dex'
import { getSupportedDexs } from '@/lib/dex-config'
import { ExternalLink, ChevronDown, ChevronUp, Check } from 'lucide-react'

export function DexSelectCard() {
    const [expanded, setExpanded] = useState(false)
    const { selectedDex, setSelectedDex } = useSwapStore()
    const chainId = useChainId()
    const supportedDexs = getSupportedDexs(chainId)
    const availableDexs = Object.values(DEX_REGISTRY).filter((dex) =>
        supportedDexs.includes(dex.id)
    )
    const selectedDexInfo = DEX_REGISTRY[selectedDex]
    if (!selectedDexInfo) {
        return null
    }
    const toggleExpanded = () => setExpanded(!expanded)
    return (
        <div className="space-y-2">
            <Card>
                <CardContent className="p-4">
                    <button
                        onClick={toggleExpanded}
                        className="flex items-center justify-between w-full text-left"
                    >
                        <div className="flex items-center gap-2">
                            <Label className="text-muted-foreground">Swap via:</Label>
                            <span className="font-medium">{selectedDexInfo.displayName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            {expanded ? (
                                <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                        </div>
                    </button>
                </CardContent>
            </Card>
            {expanded && (
                <Card>
                    <CardContent className="p-2">
                        {availableDexs.map((dex) => {
                            const isSelected = dex.id === selectedDex
                            return (
                                <button
                                    key={dex.id}
                                    onClick={() => {
                                        setSelectedDex(dex.id)
                                        setExpanded(false)
                                    }}
                                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                                        isSelected
                                            ? 'bg-primary/10 hover:bg-primary/15'
                                            : 'hover:bg-muted/50'
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                {isSelected && (
                                                    <Check className="h-4 w-4 text-primary shrink-0" />
                                                )}
                                                <span
                                                    className={`font-medium ${
                                                        isSelected ? 'text-primary' : ''
                                                    }`}
                                                >
                                                    {dex.displayName}
                                                </span>
                                            </div>
                                            {dex.description && (
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {dex.description}
                                                </p>
                                            )}
                                        </div>
                                        {dex.website && (
                                            <a
                                                href={dex.website}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-muted-foreground hover:text-foreground shrink-0"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <ExternalLink className="h-4 w-4" />
                                            </a>
                                        )}
                                    </div>
                                </button>
                            )
                        })}
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
