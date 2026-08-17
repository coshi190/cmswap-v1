import type { TokenPnl, PortfolioPnlTotals } from '@coshi190/junoswap-sdk'

export interface UserPnlResponse {
    perToken: Record<string, TokenPnl>
    totals: PortfolioPnlTotals
}

export interface LeaderboardTraderStat {
    address: string
    pnlUsd: number
    pnlPercent: number
    volumeNative: number
    junoVolumeNative: number
    externalVolumeNative: number
    points: number
    referredPoints: number
    tradeCount: number
    buyCount: number
    sellCount: number
}

interface LeaderboardResponse {
    traders: LeaderboardTraderStat[]
}

export const EMPTY_PNL_TOTALS: PortfolioPnlTotals = {
    totalInvestedUsd: 0,
    realizedUsd: 0,
    unrealizedUsd: 0,
    totalPnlUsd: 0,
    totalPnlPercent: 0,
}

function ponderBaseUrl(): string | null {
    return process.env.NEXT_PUBLIC_PONDER_URL ?? null
}

async function getJson<T>(url: string): Promise<T> {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) })
    if (!res.ok) throw new Error(`indexer responded ${res.status}`)
    return (await res.json()) as T
}

export async function fetchPortfolioPnl(chainId: number, user: string): Promise<UserPnlResponse> {
    const baseUrl = ponderBaseUrl()
    if (!baseUrl) return { perToken: {}, totals: EMPTY_PNL_TOTALS }
    try {
        return await getJson<UserPnlResponse>(
            `${baseUrl}/user-pnl?chainId=${chainId}&user=${user.toLowerCase()}`
        )
    } catch {
        return { perToken: {}, totals: EMPTY_PNL_TOTALS }
    }
}

export async function fetchLeaderboardTraders(
    chainId: number,
    period: string
): Promise<LeaderboardTraderStat[]> {
    const baseUrl = ponderBaseUrl()
    if (!baseUrl) return []
    const periodQuery = period && period !== 'all' ? `&period=${period}` : ''
    try {
        const res = await getJson<LeaderboardResponse>(
            `${baseUrl}/leaderboard?chainId=${chainId}${periodQuery}`
        )
        return res.traders
    } catch {
        return []
    }
}
