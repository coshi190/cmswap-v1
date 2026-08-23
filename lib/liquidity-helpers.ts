import { computePoolPrice, computeTickPrice } from '@coshi190/juno-moneta-sdk'

/** Fee tiers are hundredths of a bip, so 3000 renders as '0.30%'. */
export function formatFeeTier(fee: number): string {
    return `${(fee / 10000).toFixed(2)}%`
}

/**
 * Display formatting only — the conversion itself routes through the SDK so this stays in step with
 * the TVL and chart paths. The sentinels and precision bands are what the position/pool UIs expect.
 */
export function formatPoolPrice(price: number): string {
    if (price < 1e-30) {
        return '0'
    }
    if (price > 1e35) {
        return '∞'
    }

    if (price < 0.0001) {
        return price.toExponential(4)
    } else if (price < 1) {
        return price.toPrecision(6)
    } else if (price < 10000) {
        return price.toFixed(4)
    } else {
        return price.toFixed(2)
    }
}

export function sqrtPriceX96ToPrice(
    sqrtPriceX96: bigint,
    decimals0: number,
    decimals1: number
): string {
    return formatPoolPrice(computePoolPrice({ sqrtPriceX96, decimals0, decimals1 }))
}

/** Display price at a tick, in the same formatting bands as {@link sqrtPriceX96ToPrice}. */
export function tickToPrice(tick: number, decimals0: number, decimals1: number): string {
    return formatPoolPrice(computeTickPrice({ tick, decimals0, decimals1 }))
}
