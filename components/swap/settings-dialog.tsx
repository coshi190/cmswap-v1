'use client'

import { useState, useEffect } from 'react'
import { Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { isValidNumberInput } from '@/lib/utils'
import { toastSuccess } from '@/lib/toast'

interface SettingsDialogProps {
    currentSlippage: number
    currentDeadlineMinutes: number
    onSave: (slippage: number, deadlineMinutes: number) => void
}

function stringify(num: number): string {
    return num % 1 === 0 ? String(num) : num.toFixed(2)
}

export function SettingsDialog({
    currentSlippage,
    currentDeadlineMinutes,
    onSave,
}: SettingsDialogProps) {
    const [open, setOpen] = useState(false)
    const [slippageInput, setSlippageInput] = useState(stringify(currentSlippage))
    const [deadlineInput, setDeadlineInput] = useState(stringify(currentDeadlineMinutes))
    const [slippageError, setSlippageError] = useState<string | null>(null)
    const [deadlineError, setDeadlineError] = useState<string | null>(null)
    const validateSlippage = (value: string): string | null => {
        if (value === '') return 'Please enter a value'
        const num = parseFloat(value)
        if (isNaN(num)) return 'Please enter a valid number'
        if (num < 0.01) return 'Slippage must be at least 0.01%'
        if (num > 50) return 'Slippage cannot exceed 50%'
        const decimals = value.split('.')[1]?.length || 0
        if (decimals > 2) return 'Maximum 2 decimal places'
        return null
    }
    const validateDeadline = (value: string): string | null => {
        if (value === '') return 'Please enter a value'
        const num = parseFloat(value)
        if (isNaN(num)) return 'Please enter a valid number'
        if (!/^\d+$/.test(value)) return 'Must be a whole number'
        if (num < 1) return 'Deadline must be at least 1 minute'
        if (num > 60) return 'Deadline cannot exceed 60 minutes'
        return null
    }
    const handleSlippageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        if (value === '' || isValidNumberInput(value)) {
            setSlippageInput(value)
            setSlippageError(validateSlippage(value))
        }
    }
    const handleDeadlineChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        if (value === '' || /^\d*$/.test(value)) {
            setDeadlineInput(value)
            setDeadlineError(validateDeadline(value))
        }
    }
    const handleSave = () => {
        const slippage = parseFloat(slippageInput)
        const deadline = parseFloat(deadlineInput)
        onSave(slippage, deadline)
        toastSuccess('Settings saved')
        setOpen(false)
    }
    const hasChanges =
        parseFloat(slippageInput) !== currentSlippage ||
        parseFloat(deadlineInput) !== currentDeadlineMinutes
    const isDisabled =
        !!slippageError ||
        !!deadlineError ||
        slippageInput === '' ||
        deadlineInput === '' ||
        !hasChanges
    useEffect(() => {
        if (open) {
            setSlippageInput(stringify(currentSlippage))
            setDeadlineInput(stringify(currentDeadlineMinutes))
            setSlippageError(null)
            setDeadlineError(null)
        }
    }, [open, currentSlippage, currentDeadlineMinutes])
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                    <Settings className="h-3 w-3" />
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md bg-card/95 backdrop-blur-md border-border/50">
                <DialogHeader>
                    <DialogTitle>Settings</DialogTitle>
                    <DialogDescription>Configure your swap preferences</DialogDescription>
                </DialogHeader>
                <div className="space-y-2">
                    <Label htmlFor="slippage">Max Slippage</Label>
                    <div className="relative">
                        <Input
                            id="slippage"
                            type="text"
                            inputMode="decimal"
                            placeholder="0.5"
                            value={slippageInput}
                            onChange={handleSlippageChange}
                            className={cn(slippageError && 'border-destructive')}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                            %
                        </span>
                    </div>
                    {slippageError && <p className="text-xs text-destructive">{slippageError}</p>}
                    <p className="text-xs text-muted-foreground">
                        Your transaction will revert if the price changes unfavorably by more than
                        this percentage
                    </p>
                </div>
                <Separator />
                <div className="space-y-2">
                    <Label htmlFor="deadline">Transaction Deadline</Label>
                    <div className="relative">
                        <Input
                            id="deadline"
                            type="text"
                            inputMode="numeric"
                            placeholder="20"
                            value={deadlineInput}
                            onChange={handleDeadlineChange}
                            className={cn(deadlineError && 'border-destructive')}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                            minutes
                        </span>
                    </div>
                    {deadlineError && <p className="text-xs text-destructive">{deadlineError}</p>}
                    <p className="text-xs text-muted-foreground">
                        Your transaction will revert if it is pending for more than this duration
                    </p>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={isDisabled}>
                        Apply
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
