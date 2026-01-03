import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function formatAddress(address: string, startChars = 6, endChars = 4): string {
    if (!address || address.length < 10) return address
    return `${address.slice(0, startChars)}...${address.slice(-endChars)}`
}
