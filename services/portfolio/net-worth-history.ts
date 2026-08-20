import type { PricePoint } from '@/lib/price-history'

export type { PricePoint }

export interface NetWorthPoint {
    timestamp: number
    value: number
}

export const DAY_SECONDS = 86_400
export const MAX_POINTS = 96

export function makePriceAt(
    points: readonly PricePoint[],
    fallbackPrice: number | null
): (timestamp: number) => number {
    const fallback = fallbackPrice ?? 0
    if (points.length === 0) return () => fallback

    return (timestamp: number) => {
        if (timestamp < points[0]!.timestamp) return points[0]!.price
        let lo = 0
        let hi = points.length - 1
        let ans = 0
        while (lo <= hi) {
            const mid = (lo + hi) >> 1
            if (points[mid]!.timestamp <= timestamp) {
                ans = mid
                lo = mid + 1
            } else {
                hi = mid - 1
            }
        }
        return points[ans]!.price
    }
}

export function downsample(
    series: NetWorthPoint[],
    startSec: number,
    nowSec: number
): NetWorthPoint[] {
    if (series.length <= MAX_POINTS) return series

    const bucketSize = (nowSec - startSec) / MAX_POINTS
    const byBucket = new Map<number, NetWorthPoint>()
    for (const point of series) {
        const bucket = Math.floor((point.timestamp - startSec) / bucketSize)
        byBucket.set(bucket, point)
    }
    return [...byBucket.values()]
}
