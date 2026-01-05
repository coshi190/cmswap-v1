import { toast } from 'sonner'

export function truncateErrorMessage(message: string, maxLength: number = 100): string {
    if (message.length <= maxLength) return message
    return message.slice(0, maxLength) + '...'
}

export function formatError(error: Error | unknown, _context?: string): string {
    if (error instanceof Error) {
        const errorWithCode = error as Error & { code?: number }
        if (errorWithCode.code === 4001) {
            return 'Transaction rejected by user'
        }
        if (error.message.includes('network')) {
            return 'Network error. Please check your connection.'
        }
        return error.message
    }
    return _context || 'An error occurred'
}

export function showErrorToast(error: Error | unknown, _context?: string) {
    const fullMessage = error instanceof Error ? error.message : String(error)
    const truncated = truncateErrorMessage(fullMessage, 100)
    const isTruncated = fullMessage.length > 100
    const baseAction = {
        label: 'Copy',
        onClick: () => {
            navigator.clipboard.writeText(fullMessage)
            toast.success('Error copied to clipboard')
        },
    }
    if (isTruncated) {
        toast.error(truncated, {
            action: {
                label: 'View Details',
                onClick: () => {
                    toast(fullMessage, {
                        action: baseAction,
                    })
                },
            },
        })
    } else {
        toast.error(truncated, {
            action: baseAction,
        })
    }
}
