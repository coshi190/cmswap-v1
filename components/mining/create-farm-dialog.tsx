'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAccount, useChainId } from 'wagmi'
import { useQueryClient } from '@tanstack/react-query'
import type { Address } from 'viem'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { TokenIcon } from '@/components/ui/token-icon'
import { TokenSelect } from '@/components/swap/token-select'
import { ConnectModal } from '@/components/web3/connect-modal'
import { FarmPoolPicker } from './farm-pool-picker'
import { FarmScheduleInput } from './farm-schedule-input'
import { useCreateIncentive } from '@/hooks/useCreateIncentive'
import { useStakerLimits } from '@/hooks/useStakerLimits'
import { useNowSeconds } from '@/hooks/useNowSeconds'
import { useV3Tokens } from '@/hooks/useV3Tokens'
import {
    calculateRewardRate,
    createEmptyIncentiveForm,
    describeCreateIncentiveError,
    primaryError,
    resolveStartTime,
} from '@/services/mining/create-incentive'
import { formatDateTime, formatDuration, formatRelativeTime, SECONDS_PER_DAY } from '@/lib/duration'
import { formatBalance, formatTokenAmount, getTokensForChain } from '@/lib/tokens'
import { getChainMetadata, isNativeToken } from '@/lib/wagmi'
import { toastError, toastSuccess } from '@/lib/toast'
import type { CreateIncentiveForm, V3PoolData } from '@/types/earn'
import type { Token } from '@/types/token'

const INDEXER_SETTLE_MS = 5000

interface CreateFarmDialogProps {
    open: boolean
    initialPool?: V3PoolData | null
    onClose: () => void
    onSuccess?: () => void
}

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="flex items-baseline justify-between gap-4 text-sm">
            <span className="text-muted-foreground">{label}</span>
            <span className="text-right font-medium tabular-nums">{value}</span>
        </div>
    )
}

function formatRate(amount: number, symbol: string): string {
    const digits = amount >= 100 ? 0 : amount >= 1 ? 2 : 6
    return `${amount.toLocaleString('en-US', { maximumFractionDigits: digits })} ${symbol}`
}

export function CreateFarmDialog({ open, initialPool, onClose, onSuccess }: CreateFarmDialogProps) {
    const { isConnected } = useAccount()
    const chainId = useChainId()
    const queryClient = useQueryClient()
    const now = useNowSeconds()
    const { limits } = useStakerLimits()

    const [form, setForm] = useState<CreateIncentiveForm>(createEmptyIncentiveForm)
    const [isConnectModalOpen, setIsConnectModalOpen] = useState(false)
    const [processedTxHash, setProcessedTxHash] = useState<`0x${string}` | null>(null)

    useEffect(() => {
        if (!open) return
        setForm({ ...createEmptyIncentiveForm(), pool: initialPool ?? null })
        setProcessedTxHash(null)
    }, [open, initialPool])

    const { tokens: v3Tokens } = useV3Tokens(chainId)
    const rewardTokenOptions = useMemo<Token[]>(() => {
        const byAddress = new Map<string, Token>()
        for (const token of getTokensForChain(chainId)) {
            if (isNativeToken(token.address as Address)) continue
            byAddress.set(token.address.toLowerCase(), token)
        }
        for (const t of v3Tokens) {
            const key = t.address.toLowerCase()
            if (byAddress.has(key)) continue
            byAddress.set(key, {
                address: t.address as Address,
                symbol: t.symbol || '???',
                name: t.name || t.symbol || '',
                decimals: t.decimals ?? 18,
                chainId,
            })
        }
        return Array.from(byAddress.values())
    }, [chainId, v3Tokens])

    const {
        errors,
        rewardAmount,
        balance,
        needsApproval,
        approve,
        create,
        isApproving,
        isPreparing,
        isExecuting,
        isConfirming,
        isSuccess,
        error,
        hash,
    } = useCreateIncentive(form, limits)

    useEffect(() => {
        if (!isSuccess || !hash || hash === processedTxHash) return
        setProcessedTxHash(hash)
        const explorer = getChainMetadata(chainId).explorer
        toastSuccess('Mining farm created!', {
            action: {
                label: 'View Transaction',
                onClick: () => window.open(`${explorer}/tx/${hash}`, '_blank'),
            },
        })
        onSuccess?.()
        // The farm only appears once the indexer has seen IncentiveCreated, so refresh once more
        // after it has had a chance to catch up.
        setTimeout(
            () => queryClient.invalidateQueries({ queryKey: ['incentives'] }),
            INDEXER_SETTLE_MS
        )
        onClose()
    }, [isSuccess, hash, processedTxHash, chainId, queryClient, onSuccess, onClose])

    useEffect(() => {
        if (error) toastError(error)
    }, [error])

    const patch = (next: Partial<CreateIncentiveForm>) => setForm((prev) => ({ ...prev, ...next }))
    const rewardToken = form.rewardToken

    const startTime = resolveStartTime(form, now)
    const endTime =
        startTime !== null && form.durationSeconds > 0 ? startTime + form.durationSeconds : null
    const rate = calculateRewardRate(
        rewardAmount,
        rewardToken?.decimals ?? 18,
        form.durationSeconds
    )
    const showHourlyRate = form.durationSeconds > 0 && form.durationSeconds < 2 * SECONDS_PER_DAY
    const blocking = primaryError(errors)
    const isBusy = isApproving || isPreparing || isExecuting || isConfirming

    const buttonLabel = () => {
        if (!isConnected) return 'Connect Wallet'
        if (isApproving) return 'Approving...'
        if (isExecuting) return 'Confirm in wallet...'
        if (isConfirming) return 'Creating farm...'
        if (blocking && blocking !== 'NO_ACCOUNT') {
            return describeCreateIncentiveError(blocking, {
                limits,
                rewardSymbol: rewardToken?.symbol,
            })
        }
        if (needsApproval) return `Approve ${rewardToken?.symbol ?? 'token'}`
        if (isPreparing) return 'Checking...'
        return 'Create Farm'
    }

    const handleSubmit = () => {
        if (!isConnected) {
            setIsConnectModalOpen(true)
            return
        }
        if (needsApproval) {
            approve()
            return
        }
        create()
    }

    const isSubmitDisabled = isConnected && (isBusy || errors.length > 0)

    return (
        <>
            <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
                <DialogContent className="sm:max-w-lg max-h-[90vh] bg-card/95 backdrop-blur-md border-border/50">
                    <DialogHeader>
                        <DialogTitle className="text-lg">Create Mining Farm</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 overflow-y-auto max-h-[calc(90vh-9rem)] pr-1">
                        <div className="space-y-2">
                            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                                Pool to reward
                            </Label>
                            <FarmPoolPicker
                                value={form.pool}
                                onChange={(pool) => patch({ pool })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                                Total reward
                            </Label>
                            <div className="rounded-2xl bg-muted/20 border border-border/30 p-3 space-y-2">
                                <div className="flex items-center gap-3">
                                    <input
                                        type="number"
                                        step="any"
                                        min="0"
                                        inputMode="decimal"
                                        placeholder="0.0"
                                        value={form.rewardAmount}
                                        onChange={(e) => patch({ rewardAmount: e.target.value })}
                                        className="min-w-0 flex-1 bg-transparent text-xl font-semibold placeholder:text-muted-foreground/40 focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                    />
                                    <TokenSelect
                                        token={rewardToken}
                                        tokens={rewardTokenOptions}
                                        onSelect={(next) => patch({ rewardToken: next })}
                                        className="h-10 shrink-0 rounded-xl bg-muted/40 border-border/40 hover:bg-muted/60"
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <p className="text-[10px] text-muted-foreground">
                                        Balance:{' '}
                                        {rewardToken
                                            ? formatBalance(balance, rewardToken.decimals)
                                            : '0'}
                                    </p>
                                    {rewardToken && balance > 0n && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                patch({
                                                    rewardAmount: formatTokenAmount(
                                                        balance,
                                                        rewardToken.decimals
                                                    ),
                                                })
                                            }
                                            className="rounded bg-foreground/10 px-1.5 py-0.5 text-[10px] font-semibold transition-colors hover:bg-foreground/15"
                                        >
                                            MAX
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <FarmScheduleInput
                            startMode={form.startMode}
                            scheduledStart={form.scheduledStart}
                            durationSeconds={form.durationSeconds}
                            limits={limits}
                            now={now}
                            onChange={patch}
                        />

                        <Separator />

                        <div className="space-y-2">
                            <SummaryRow
                                label="Starts"
                                value={
                                    startTime === null ? (
                                        '—'
                                    ) : (
                                        <>
                                            {formatDateTime(startTime)}
                                            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                                                {formatRelativeTime(startTime, now)}
                                            </span>
                                        </>
                                    )
                                }
                            />
                            <SummaryRow
                                label="Ends"
                                value={endTime === null ? '—' : formatDateTime(endTime)}
                            />
                            <SummaryRow
                                label="Runs for"
                                value={
                                    form.durationSeconds > 0
                                        ? formatDuration(form.durationSeconds)
                                        : '—'
                                }
                            />
                            <SummaryRow
                                label="Reward rate"
                                value={
                                    rate.perDay > 0 && rewardToken ? (
                                        <span className="inline-flex items-center gap-1.5">
                                            <TokenIcon
                                                src={rewardToken.logo}
                                                symbol={rewardToken.symbol}
                                                size="xs"
                                            />
                                            {showHourlyRate
                                                ? `${formatRate(rate.perHour, rewardToken.symbol)} / hour`
                                                : `${formatRate(rate.perDay, rewardToken.symbol)} / day`}
                                        </span>
                                    ) : (
                                        '—'
                                    )
                                }
                            />
                        </div>

                        <p className="rounded-xl bg-muted/30 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
                            Rewards stream to in-range liquidity for the whole period. Anything left
                            over when the farm ends comes back to your wallet — you can claim it
                            from My Farms once every position has unstaked.
                        </p>

                        <Button
                            className="w-full"
                            size="lg"
                            onClick={handleSubmit}
                            disabled={isSubmitDisabled}
                            isLoading={isBusy}
                            loadingText={buttonLabel()}
                        >
                            {buttonLabel()}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
            <ConnectModal open={isConnectModalOpen} onOpenChange={setIsConnectModalOpen} />
        </>
    )
}
