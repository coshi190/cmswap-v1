'use client'

import { useMemo, useEffect } from 'react'
import { useAccount, useChainId } from 'wagmi'
import { parseUnits, formatUnits } from 'viem'
import type { Token } from '@/types/tokens'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { useSwapStore } from '@/store/swap-store'
import { useTokenBalance } from '@/hooks/useTokenBalance'
import { useUniV3Quote } from '@/hooks/useUniV3Quote'
import { useDebounce } from '@/hooks/useDebounce'
import { useUniV3SwapExecution } from '@/hooks/useUniV3SwapExecution'
import { useTokenApproval } from '@/hooks/useTokenApproval'
import { calculateMinOutput } from '@/services/dex/uniswap-v3'
import { formatBalance } from '@/services/tokens'
import { KUB_TESTNET_TOKENS } from '@/lib/tokens'
import { TokenSelect } from './token-select'
import { ArrowDownUp } from 'lucide-react'
import { toast } from 'sonner'
import { isSameToken, getWrapOperation } from '@/services/tokens'
import { isValidNumberInput } from '@/lib/utils'
import { getChainMetadata } from '@/lib/wagmi'

export interface SwapCardProps {
    tokens?: Token[]
}

export function SwapCard({ tokens: tokensOverride }: SwapCardProps) {
    const tokens = tokensOverride || KUB_TESTNET_TOKENS
    const { address } = useAccount()
    const chainId = useChainId()
    const {
        tokenIn,
        tokenOut,
        amountIn,
        setTokenIn,
        setTokenOut,
        setAmountIn,
        settings,
        swapTokens,
        setQuote,
        setIsLoading,
    } = useSwapStore()
    const {
        balance: balanceInValue,
        isLoading: isLoadingBalanceIn,
        refetch: refetchBalanceIn,
    } = useTokenBalance({
        token: tokenIn,
        address,
    })
    const {
        balance: balanceOutValue,
        isLoading: isLoadingBalanceOut,
        refetch: refetchBalanceOut,
    } = useTokenBalance({
        token: tokenOut,
        address,
    })
    const tokenBalance0 = useTokenBalance({ token: tokens[0] ?? null, address })
    const tokenBalance1 = useTokenBalance({ token: tokens[1] ?? null, address })
    const tokenBalance2 = useTokenBalance({ token: tokens[2] ?? null, address })
    const tokenBalance3 = useTokenBalance({ token: tokens[3] ?? null, address })
    const allTokenBalances = useMemo(() => {
        const balances: Record<string, string> = {}
        const rawBalances: Record<string, bigint> = {}
        let isLoading = false
        const balanceResults = [tokenBalance0, tokenBalance1, tokenBalance2, tokenBalance3]
        tokens.forEach((token, index) => {
            const balanceResult = balanceResults[index]
            if (balanceResult) {
                balances[token.address] = balanceResult.formattedBalance
                rawBalances[token.address] = balanceResult.balance
                if (balanceResult.isLoading) isLoading = true
            }
        })
        return { balances, rawBalances, isLoading }
    }, [tokens, tokenBalance0, tokenBalance1, tokenBalance2, tokenBalance3])
    const debouncedAmountIn = useDebounce(amountIn, 500)
    const amountInBigInt = useMemo(() => {
        if (!debouncedAmountIn || !tokenIn) return 0n
        try {
            return parseUnits(debouncedAmountIn, tokenIn.decimals)
        } catch {
            return 0n
        }
    }, [debouncedAmountIn, tokenIn])
    const {
        quote,
        isLoading: isQuoteLoading,
        isError,
        error,
        fee,
        isWrapUnwrap,
        wrapOperation,
    } = useUniV3Quote({
        tokenIn,
        tokenOut,
        amountIn: amountInBigInt,
        enabled: true,
    })
    useEffect(() => {
        if (quote && tokenOut) {
            setQuote(quote)
        }
        setIsLoading(isQuoteLoading)
        if (isError && error) {
            const errorMessage = (error as Error)?.message || 'Failed to get quote'
            toast.error(errorMessage)
        }
    }, [quote, isQuoteLoading, isError, error, tokenOut, setQuote, setIsLoading])
    const displayAmountOut = useMemo(() => {
        if (isQuoteLoading) return '...'
        if (isError) return '0'
        if (quote && tokenOut) {
            return formatUnits(quote.amountOut, tokenOut.decimals)
        }
        return '0'
    }, [quote, isQuoteLoading, isError, tokenOut])
    const isSameTokenSwap = isSameToken(tokenIn, tokenOut)
    const wrapOp = useMemo(() => {
        return getWrapOperation(tokenIn, tokenOut)
    }, [tokenIn, tokenOut])
    const amountOutMinimum = useMemo(() => {
        if (!quote || !tokenOut) return 0n
        return calculateMinOutput(quote.amountOut, Math.floor(settings.slippage * 100))
    }, [quote, tokenOut, settings.slippage])
    const {
        needsApproval,
        isApproving,
        isConfirming: isConfirmingApprovalRaw,
        approve,
        hash: approvalHash,
    } = useTokenApproval({
        token: tokenIn ?? tokens[0]!,
        owner: address,
        amountToApprove: amountInBigInt,
    })
    const needsApprovalCheck = useMemo(() => {
        if (wrapOp === 'wrap') return false
        if (wrapOp === 'unwrap') return false
        return needsApproval
    }, [needsApproval, wrapOp])
    const {
        swap,
        isPreparing,
        isExecuting,
        isConfirming: isConfirmingSwapRaw,
        isSuccess,
        isError: swapIsError,
        error: swapError,
        hash: swapHash,
        simulationError,
    } = useUniV3SwapExecution({
        tokenIn: tokenIn ?? tokens[0]!,
        tokenOut: tokenOut ?? tokens[1] ?? tokens[0]!,
        amountIn: amountInBigInt,
        amountOutMinimum,
        recipient: address ?? '0x0',
        slippage: settings.slippage,
        deadlineMinutes: settings.deadlineMinutes,
        fee,
    })
    useEffect(() => {
        if (simulationError) {
            const errorMessage = simulationError.message || 'Unable to simulate swap'
            toast.error(`Simulation failed: ${errorMessage}`)
        }
    }, [simulationError])
    useEffect(() => {
        if (isSuccess && swapHash) {
            const meta = getChainMetadata(chainId)
            const explorerUrl = meta?.explorer
                ? `${meta.explorer}/tx/${swapHash}`
                : `https://etherscan.io/tx/${swapHash}`
            toast.success('Swap successful!', {
                action: {
                    label: 'View Transaction',
                    onClick: () => window.open(explorerUrl, '_blank', 'noopener,noreferrer'),
                },
            })
            refetchBalanceIn?.()
            refetchBalanceOut?.()
        }
    }, [isSuccess, swapHash, chainId, refetchBalanceIn, refetchBalanceOut])
    useEffect(() => {
        if (swapIsError && swapError) {
            toast.error(swapError.message || 'Swap failed. Please try again.')
        }
    }, [swapIsError, swapError])
    useEffect(() => {
        if (!tokenIn && tokens.length > 0 && tokens[0]) {
            setTokenIn(tokens[0])
        }
    }, [tokenIn, tokens, setTokenIn])
    const isConfirmingApproval = approvalHash && isConfirmingApprovalRaw
    const isConfirmingSwap = swapHash && isConfirmingSwapRaw
    const handleSwapTokens = () => {
        swapTokens()
    }
    return (
        <Card>
            <CardContent className="space-y-6 p-6">
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="amount-in">From</Label>
                        <span className="text-xs text-muted-foreground">
                            Balance:{' '}
                            {tokenIn
                                ? isLoadingBalanceIn
                                    ? '...'
                                    : formatBalance(balanceInValue, tokenIn.decimals)
                                : '0'}
                        </span>
                    </div>
                    <div className="flex gap-2">
                        <Input
                            id="amount-in"
                            type="text"
                            placeholder="0.0"
                            className="flex-1"
                            autoFocus
                            autoComplete="off"
                            inputMode="decimal"
                            pattern="^[0-9]*\.?[0-9]*$"
                            value={amountIn}
                            onChange={(e) => {
                                const value = e.target.value
                                if (isValidNumberInput(value)) {
                                    setAmountIn(value)
                                }
                            }}
                        />
                        <TokenSelect
                            token={tokenIn}
                            tokens={tokens}
                            onSelect={setTokenIn}
                            balances={allTokenBalances.balances}
                            rawBalances={allTokenBalances.rawBalances}
                            isLoadingBalances={allTokenBalances.isLoading}
                        />
                    </div>
                </div>
                <div className="flex justify-center">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={handleSwapTokens}
                        disabled={!tokenIn || !tokenOut}
                    >
                        <ArrowDownUp className="h-4 w-4" />
                    </Button>
                </div>
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="amount-out">To</Label>
                        <span className="text-xs text-muted-foreground">
                            Balance:{' '}
                            {tokenOut
                                ? isLoadingBalanceOut
                                    ? '...'
                                    : formatBalance(balanceOutValue, tokenOut.decimals)
                                : '0'}
                        </span>
                    </div>
                    <div className="flex gap-2">
                        <Input
                            id="amount-out"
                            type="text"
                            placeholder="0.0"
                            className="flex-1"
                            readOnly
                            autoComplete="off"
                            value={displayAmountOut}
                        />
                        <TokenSelect
                            token={tokenOut}
                            tokens={tokens}
                            onSelect={setTokenOut}
                            balances={allTokenBalances.balances}
                            rawBalances={allTokenBalances.rawBalances}
                            isLoadingBalances={allTokenBalances.isLoading}
                        />
                    </div>
                </div>
                {quote && tokenIn && tokenOut && !isQuoteLoading && (
                    <Card className="bg-muted/50">
                        <CardContent className="space-y-1 p-3 text-xs">
                            {isWrapUnwrap && (
                                <>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Operation</span>
                                        <span className="font-semibold">
                                            {wrapOperation === 'wrap'
                                                ? 'Wrap KUB → tKKUB'
                                                : 'Unwrap tKKUB → KUB'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Rate</span>
                                        <span className="font-semibold">1:1</span>
                                    </div>
                                </>
                            )}
                            {!isWrapUnwrap && (
                                <>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Rate</span>
                                        <span className="font-medium">
                                            1 {tokenIn.symbol} ={' '}
                                            {amountIn && parseFloat(amountIn) > 0
                                                ? (
                                                      parseFloat(displayAmountOut) /
                                                      parseFloat(amountIn)
                                                  ).toFixed(6)
                                                : '0'}{' '}
                                            {tokenOut.symbol}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Min. Received</span>
                                        <span className="font-medium">
                                            {formatUnits(
                                                calculateMinOutput(
                                                    quote.amountOut,
                                                    Math.floor(settings.slippage * 100)
                                                ),
                                                tokenOut.decimals
                                            )}{' '}
                                            {tokenOut.symbol}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Fee</span>
                                        <span className="font-medium">
                                            {(fee / 10000).toFixed(2)}%
                                        </span>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                )}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Slippage: {settings.slippage}%</span>
                    <span>Deadline: {settings.deadlineMinutes}m</span>
                </div>
                <Button
                    className="w-full"
                    size="lg"
                    disabled={
                        !tokenIn ||
                        !tokenOut ||
                        isQuoteLoading ||
                        isSameTokenSwap ||
                        isPreparing ||
                        isExecuting ||
                        (needsApprovalCheck && (isApproving || isConfirmingApproval))
                    }
                    onClick={() => {
                        if (needsApprovalCheck) {
                            approve()
                        } else if (!isPreparing) {
                            swap()
                        }
                    }}
                >
                    {isSameTokenSwap
                        ? 'Select Different Tokens'
                        : isWrapUnwrap
                          ? isPreparing
                              ? 'Simulating...'
                              : isExecuting
                                ? wrapOperation === 'wrap'
                                    ? 'Wrapping...'
                                    : 'Unwrapping...'
                                : isConfirmingSwap
                                  ? 'Confirming...'
                                  : wrapOperation === 'wrap'
                                    ? 'Wrap KUB'
                                    : 'Unwrap tKKUB'
                          : needsApprovalCheck
                            ? isApproving
                                ? 'Approving...'
                                : isConfirmingApproval
                                  ? 'Confirming...'
                                  : `Approve ${tokenIn?.symbol || 'Token'}`
                            : isPreparing
                              ? 'Simulating...'
                              : isExecuting
                                ? 'Swapping...'
                                : isConfirmingSwap
                                  ? 'Confirming...'
                                  : isQuoteLoading
                                    ? 'Fetching Quote...'
                                    : tokenIn && tokenOut
                                      ? 'Swap'
                                      : 'Select Tokens'}
                </Button>
            </CardContent>
        </Card>
    )
}
