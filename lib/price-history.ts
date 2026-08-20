import { getJson, ponderBaseUrl } from '@/lib/indexer-http'

export interface PricePoint {
    timestamp: number
    price: number
}

export type PriceSource = 'bc' | 'v3'

interface PricePointsResponse {
    points: PricePoint[]
}

export async function fetchNativeUsdPriceHistory(chainId: number): Promise<PricePoint[]> {
    const baseUrl = ponderBaseUrl()
    if (!baseUrl) return []
    try {
        const res = await getJson<PricePointsResponse>(
            `${baseUrl}/native-usd-price-history?chainId=${chainId}`
        )
        return res.points
    } catch {
        return []
    }
}

export async function fetchTokenPriceHistory(
    chainId: number,
    tokenAddr: string,
    since: number,
    source: PriceSource
): Promise<PricePoint[]> {
    const baseUrl = ponderBaseUrl()
    if (!baseUrl) return []
    const query = `chainId=${chainId}&tokenAddr=${tokenAddr.toLowerCase()}&since=${since}&source=${source}`
    try {
        const res = await getJson<PricePointsResponse>(`${baseUrl}/token-price-history?${query}`)
        return res.points
    } catch {
        return []
    }
}
