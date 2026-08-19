'use client'

import { useEffect, useState } from 'react'

/**
 * Coarse wall clock for countdowns and schedule previews. The default tick is deliberately slow —
 * anything faster just re-simulates transactions without telling the user anything new.
 */
export function useNowSeconds(intervalMs = 30_000): number {
    const [now, setNow] = useState(() => Math.floor(Date.now() / 1000))

    useEffect(() => {
        const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), intervalMs)
        return () => clearInterval(id)
    }, [intervalMs])

    return now
}
