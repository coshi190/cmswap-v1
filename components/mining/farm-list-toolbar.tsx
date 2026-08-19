'use client'

import { ArrowUpDown, ChevronDown, LayoutGrid, List } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { FARM_SORT_OPTIONS } from '@/services/mining/farm-list'
import type { FarmSortKey, FarmView } from '@/types/earn'

interface MenuOption<T extends string> {
    key: T
    label: string
}

export function FarmSelectMenu<T extends string>({
    value,
    options,
    onChange,
    icon,
    ariaLabel,
}: {
    value: T
    options: readonly MenuOption<T>[]
    onChange: (value: T) => void
    icon?: React.ReactNode
    ariaLabel: string
}) {
    const current = options.find((option) => option.key === value)
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-1.5" aria-label={ariaLabel}>
                    {icon}
                    <span>{current?.label ?? ariaLabel}</span>
                    <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuRadioGroup value={value} onValueChange={(next) => onChange(next as T)}>
                    {options.map((option) => (
                        <DropdownMenuRadioItem key={option.key} value={option.key}>
                            {option.label}
                        </DropdownMenuRadioItem>
                    ))}
                </DropdownMenuRadioGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

function ViewToggle({ value, onChange }: { value: FarmView; onChange: (view: FarmView) => void }) {
    const options: { key: FarmView; label: string; icon: React.ReactNode }[] = [
        { key: 'card', label: 'Card view', icon: <LayoutGrid className="h-4 w-4" /> },
        { key: 'table', label: 'Table view', icon: <List className="h-4 w-4" /> },
    ]
    return (
        <div className="inline-flex items-center gap-1 rounded-xl bg-muted/50 p-1">
            {options.map((option) => (
                <button
                    key={option.key}
                    type="button"
                    aria-label={option.label}
                    aria-pressed={value === option.key}
                    onClick={() => onChange(option.key)}
                    className={cn(
                        'rounded-lg p-1.5 transition-all',
                        value === option.key
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                    )}
                >
                    {option.icon}
                </button>
            ))}
        </div>
    )
}

interface FarmListToolbarProps {
    sort: FarmSortKey
    onSortChange: (sort: FarmSortKey) => void
    view: FarmView
    onViewChange: (view: FarmView) => void
    /** Section-specific filter menus, rendered ahead of the sort control. */
    filters?: React.ReactNode
    children?: React.ReactNode
}

export function FarmListToolbar({
    sort,
    onSortChange,
    view,
    onViewChange,
    filters,
    children,
}: FarmListToolbarProps) {
    return (
        <div className="flex flex-wrap items-center gap-2">
            {filters}
            <FarmSelectMenu
                value={sort}
                options={FARM_SORT_OPTIONS}
                onChange={onSortChange}
                icon={<ArrowUpDown className="h-3.5 w-3.5 opacity-70" />}
                ariaLabel="Sort by"
            />
            <ViewToggle value={view} onChange={onViewChange} />
            {children}
        </div>
    )
}
