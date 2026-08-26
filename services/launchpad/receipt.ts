import { decodeEventLog } from 'viem'
import type { Abi, Address, Log } from 'viem'

interface FindEventArgsOptions {
    abi: Abi
    eventName: string
    address?: Address
}

export function findEventArgs<T>(logs: Log[], options: FindEventArgsOptions): T | null {
    const expected = options.address?.toLowerCase()
    for (const log of logs) {
        if (expected && log.address.toLowerCase() !== expected) continue
        try {
            const decoded = decodeEventLog({
                abi: options.abi,
                data: log.data,
                topics: log.topics,
            })
            if (decoded.eventName === options.eventName) {
                return decoded.args as T
            }
        } catch {
            continue
        }
    }
    return null
}
