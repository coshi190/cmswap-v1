'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { useSwapStore } from '@/store/swap-store'
import { DEX_REGISTRY } from '@/types/dex'
import { ExternalLink } from 'lucide-react'

export function DexSelectCard() {
    const { selectedDex } = useSwapStore()
    const dexInfo = DEX_REGISTRY[selectedDex]
    if (!dexInfo) {
        return null
    }
    return (
        <Card>
            <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-2">
                    <Label className="text-muted-foreground">Swap via:</Label>
                    <span className="font-medium">{dexInfo.displayName}</span>
                </div>
                {dexInfo.website && (
                    <a
                        href={dexInfo.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground"
                    >
                        <ExternalLink className="h-4 w-4" />
                    </a>
                )}
            </CardContent>
        </Card>
    )
}
