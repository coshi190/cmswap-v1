'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { useEarnStore, useSelectedPosition } from '@/store/earn-store'
import { usePositionValue } from '@/hooks/usePositionValue'

export function PositionDetailsModal() {
    const {
        isPositionDetailsOpen,
        closePositionDetails,
        openCollectFees,
        openRemoveLiquidity,
        openIncreaseLiquidity,
    } = useEarnStore()
    const selectedPosition = useSelectedPosition()
    const {
        amount0Formatted,
        amount1Formatted,
        fees0Formatted,
        fees1Formatted,
        inRange,
        currentPrice,
        priceLower,
        priceUpper,
    } = usePositionValue(selectedPosition)
    if (!selectedPosition) return null
    const hasFees = selectedPosition.tokensOwed0 > 0n || selectedPosition.tokensOwed1 > 0n
    const isClosed = selectedPosition.liquidity === 0n
    return (
        <Dialog open={isPositionDetailsOpen} onOpenChange={closePositionDetails}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <span>
                            {selectedPosition.token0Info.symbol} /{' '}
                            {selectedPosition.token1Info.symbol}
                        </span>
                        <Badge variant="outline">
                            {(selectedPosition.fee / 10000).toFixed(2)}%
                        </Badge>
                        {isClosed ? (
                            <Badge variant="secondary">Closed</Badge>
                        ) : inRange ? (
                            <Badge variant="default" className="bg-green-600">
                                In Range
                            </Badge>
                        ) : (
                            <Badge variant="secondary">Out of Range</Badge>
                        )}
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="text-sm text-muted-foreground">
                        Position ID: #{selectedPosition.tokenId.toString()}
                    </div>
                    <Card>
                        <CardContent className="p-4">
                            <div className="text-sm text-muted-foreground mb-2">Liquidity</div>
                            <div className="space-y-1">
                                <div className="flex justify-between">
                                    <span>{selectedPosition.token0Info.symbol}</span>
                                    <span className="font-medium">{amount0Formatted}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>{selectedPosition.token1Info.symbol}</span>
                                    <span className="font-medium">{amount1Formatted}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex justify-between items-center mb-2">
                                <div className="text-sm text-muted-foreground">
                                    Uncollected Fees
                                </div>
                                {hasFees && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                            closePositionDetails()
                                            openCollectFees(selectedPosition)
                                        }}
                                    >
                                        Collect
                                    </Button>
                                )}
                            </div>
                            <div className="space-y-1">
                                <div className="flex justify-between">
                                    <span>{selectedPosition.token0Info.symbol}</span>
                                    <span
                                        className={
                                            hasFees ? 'font-medium text-green-600' : 'font-medium'
                                        }
                                    >
                                        {fees0Formatted}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>{selectedPosition.token1Info.symbol}</span>
                                    <span
                                        className={
                                            hasFees ? 'font-medium text-green-600' : 'font-medium'
                                        }
                                    >
                                        {fees1Formatted}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="text-sm text-muted-foreground mb-2">Price Range</div>
                            <div className="grid grid-cols-3 gap-4 text-center">
                                <div>
                                    <div className="text-xs text-muted-foreground">Min</div>
                                    <div className="font-medium">{priceLower}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-muted-foreground">Current</div>
                                    <div className="font-medium">{currentPrice}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-muted-foreground">Max</div>
                                    <div className="font-medium">{priceUpper}</div>
                                </div>
                            </div>
                            <div className="text-xs text-muted-foreground text-center mt-2">
                                {selectedPosition.token1Info.symbol} per{' '}
                                {selectedPosition.token0Info.symbol}
                            </div>
                            <div className="mt-4 h-2 bg-muted rounded-full relative">
                                <div
                                    className={`absolute h-full rounded-full ${inRange ? 'bg-green-600' : 'bg-muted-foreground'}`}
                                    style={{ left: '20%', right: '20%' }}
                                />
                                <div
                                    className="absolute w-1 h-4 bg-foreground rounded -top-1"
                                    style={{ left: '50%', transform: 'translateX(-50%)' }}
                                />
                            </div>
                        </CardContent>
                    </Card>
                    {!isClosed && (
                        <div className="flex gap-2">
                            <Button
                                className="flex-1"
                                variant="default"
                                onClick={() => {
                                    closePositionDetails()
                                    openIncreaseLiquidity(selectedPosition)
                                }}
                            >
                                Add Liquidity
                            </Button>
                            <Button
                                className="flex-1"
                                variant="outline"
                                onClick={() => {
                                    closePositionDetails()
                                    openRemoveLiquidity(selectedPosition)
                                }}
                            >
                                Remove Liquidity
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
