import {
    computePoolPrice,
    computeTickPrice,
    getDexConfig,
    getSupportedDexs,
    ProtocolType,
} from '@coshi190/juno-moneta-sdk'

/** Fee tiers are hundredths of a bip, so 3000 renders as '0.30%'. */
export function formatFeeTier(fee: number): string {
    return `${(fee / 10000).toFixed(2)}%`
}

/** The tier the UI would rather trade, when nothing upstream has picked one. */
const PREFERRED_FEE_TIER = 3000

/** Stand-in for a chain whose V3 deployment we can't resolve; mirrors the tiers the SDK used to
 * hand back before fee tiers became a per-DEX config field. */
const FALLBACK_FEE_TIERS = [100, 500, 3000, 10000]

/**
 * `getDexConfig` falls back to the default DEX (junoswap) when no id is given, and junoswap has no
 * V3 on every chain — BSC is Pancake, Base and Worldchain are Uniswap. Ask for the chain's own V3
 * DEX before settling for that default, or these chains resolve to nothing.
 */
function v3ConfigForChain(chainId: number) {
    const [chainDexId] = getSupportedDexs(chainId, ProtocolType.V3)
    return getDexConfig(chainId, chainDexId, ProtocolType.V3)
}

/** The V3 fee tiers a chain actually offers. */
export function v3FeeTiers(chainId: number): number[] {
    const tiers = v3ConfigForChain(chainId)?.feeTiers
    return tiers?.length ? tiers : FALLBACK_FEE_TIERS
}

/**
 * The SDK no longer guesses a fee tier, and the tier list is per chain and per DEX — Pancake V3
 * runs 2500 and no 3000 — so the choice lands here: the tier nearest the preferred one that the
 * chain actually offers.
 */
export function defaultFeeTier(chainId: number): number {
    return v3FeeTiers(chainId).reduce((best, tier) =>
        Math.abs(tier - PREFERRED_FEE_TIER) < Math.abs(best - PREFERRED_FEE_TIER) ? tier : best
    )
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
