import { createPonderClient, fetchLaunchTokenOg } from '@junoswap/sdk'
import { resolveLaunchpadLogo } from '@/lib/logo'
import { applyLaunchpadTokenOverride } from '@/lib/launchpad-token-config'

interface LaunchTokenMeta {
    address: string
    name: string
    symbol: string
    logo: string
    description: string
    isGraduated: boolean
    marketCapNative: number | null
    priceChange1dPct: number | null
    nativeUsdPrice: number | null
}

/**
 * Server-side only: talks to PONDER_URL directly rather than through the browser proxy route.
 *
 * This used to hand-roll a raw fetch and query launchTokens/tokenSnapshots/nativeUsdPrices with
 * *no filters at all*, then `.find()` the one address it wanted out of every token on every
 * chain. The SDK filters by address in the query.
 */
export async function fetchLaunchTokenMeta(address: string): Promise<LaunchTokenMeta | null> {
    const ponderUrl = process.env.PONDER_URL
    if (!ponderUrl) return null

    try {
        const client = createPonderClient(`${ponderUrl}/graphql`)
        const {
            token,
            snapshot,
            nativeUsdPrice: rawUsd,
        } = await fetchLaunchTokenOg(client, {
            tokenAddr: address.toLowerCase(),
        })
        if (!token) return null

        const meta = applyLaunchpadTokenOverride(token, token.chainId)

        const marketCap = parseFloat(snapshot?.marketCapNative ?? '')
        const nativeUsdPrice = parseFloat(rawUsd?.price ?? '')

        return {
            address,
            name: meta.name ?? '',
            symbol: meta.symbol ?? '',
            logo: resolveLaunchpadLogo(meta.logo),
            description: meta.description ?? '',
            isGraduated: meta.isGraduated === 1,
            marketCapNative: Number.isFinite(marketCap) && marketCap > 0 ? marketCap : null,
            priceChange1dPct: snapshot?.priceChange1dPct
                ? parseFloat(snapshot.priceChange1dPct)
                : null,
            nativeUsdPrice:
                Number.isFinite(nativeUsdPrice) && nativeUsdPrice > 0 ? nativeUsdPrice : null,
        }
    } catch {
        return null
    }
}
