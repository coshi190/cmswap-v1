'use client'

import { useMemo } from 'react'
import { useReadContract } from 'wagmi'
import type { Address } from 'viem'
import type { Token } from '@/types/tokens'
import type { QuoteResult } from '@/types/swap'
import { getV3Config, FEE_TIERS, DEFAULT_FEE_TIER } from '@/lib/dex-config'
import { useSwapStore } from '@/store/swap-store'
import { UNISWAP_V3_QUOTER_V2_ABI } from '@/lib/abis/uniswap-v3-quoter'
import { UNISWAP_V3_FACTORY_ABI } from '@/lib/abis/uniswap-v3-factory'
import { UNISWAP_V3_POOL_ABI } from '@/lib/abis/uniswap-v3-pool'
import { buildQuoteParams } from '@/services/dex/uniswap-v3'
import { isSameToken, getSwapAddress } from '@/services/tokens'

export interface UseUniV3QuoteParams {
    tokenIn: Token | null
    tokenOut: Token | null
    amountIn: bigint
    enabled?: boolean
}

export interface UseUniV3QuoteResult {
    quote: QuoteResult | null
    isLoading: boolean
    isError: boolean
    error: Error | null
    fee: number
}

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as Address

export function useUniV3Quote({
    tokenIn,
    tokenOut,
    amountIn,
    enabled = true,
}: UseUniV3QuoteParams): UseUniV3QuoteResult {
    const { selectedDex } = useSwapStore()
    const dexConfig = tokenIn ? getV3Config(tokenIn.chainId, selectedDex) : null
    const chainId = tokenIn?.chainId ?? 1
    const tokenInAddress = tokenIn
        ? getSwapAddress(tokenIn.address as Address, chainId)
        : ZERO_ADDRESS
    const tokenOutAddress = tokenOut
        ? getSwapAddress(tokenOut.address as Address, chainId)
        : ZERO_ADDRESS
    const baseQueryEnabled = !!tokenIn && !!tokenOut && !!dexConfig
    const poolStable = useReadContract({
        address: dexConfig?.factory,
        abi: UNISWAP_V3_FACTORY_ABI,
        functionName: 'getPool',
        args: [tokenInAddress, tokenOutAddress, FEE_TIERS.STABLE],
        chainId,
        query: { enabled: baseQueryEnabled, staleTime: 60_000 },
    })
    const poolLow = useReadContract({
        address: dexConfig?.factory,
        abi: UNISWAP_V3_FACTORY_ABI,
        functionName: 'getPool',
        args: [tokenInAddress, tokenOutAddress, FEE_TIERS.LOW],
        chainId,
        query: { enabled: baseQueryEnabled, staleTime: 60_000 },
    })
    const poolMedium = useReadContract({
        address: dexConfig?.factory,
        abi: UNISWAP_V3_FACTORY_ABI,
        functionName: 'getPool',
        args: [tokenInAddress, tokenOutAddress, FEE_TIERS.MEDIUM],
        chainId,
        query: { enabled: baseQueryEnabled, staleTime: 60_000 },
    })
    const poolHigh = useReadContract({
        address: dexConfig?.factory,
        abi: UNISWAP_V3_FACTORY_ABI,
        functionName: 'getPool',
        args: [tokenInAddress, tokenOutAddress, FEE_TIERS.HIGH],
        chainId,
        query: { enabled: baseQueryEnabled, staleTime: 60_000 },
    })
    const poolStableAddr = poolStable.data as Address | undefined
    const poolLowAddr = poolLow.data as Address | undefined
    const poolMediumAddr = poolMedium.data as Address | undefined
    const poolHighAddr = poolHigh.data as Address | undefined
    const isValidPool = (addr: Address | undefined) => addr && addr !== ZERO_ADDRESS
    const liqStable = useReadContract({
        address: isValidPool(poolStableAddr) ? poolStableAddr : undefined,
        abi: UNISWAP_V3_POOL_ABI,
        functionName: 'liquidity',
        chainId,
        query: { enabled: isValidPool(poolStableAddr), staleTime: 60_000 },
    })
    const liqLow = useReadContract({
        address: isValidPool(poolLowAddr) ? poolLowAddr : undefined,
        abi: UNISWAP_V3_POOL_ABI,
        functionName: 'liquidity',
        chainId,
        query: { enabled: isValidPool(poolLowAddr), staleTime: 60_000 },
    })
    const liqMedium = useReadContract({
        address: isValidPool(poolMediumAddr) ? poolMediumAddr : undefined,
        abi: UNISWAP_V3_POOL_ABI,
        functionName: 'liquidity',
        chainId,
        query: { enabled: isValidPool(poolMediumAddr), staleTime: 60_000 },
    })
    const liqHigh = useReadContract({
        address: isValidPool(poolHighAddr) ? poolHighAddr : undefined,
        abi: UNISWAP_V3_POOL_ABI,
        functionName: 'liquidity',
        chainId,
        query: { enabled: isValidPool(poolHighAddr), staleTime: 60_000 },
    })
    const { bestPool, bestFee, isLoadingPool } = useMemo(() => {
        const pools = [
            {
                fee: FEE_TIERS.STABLE,
                addr: poolStableAddr,
                liq: liqStable.data as bigint | undefined,
                loading: poolStable.isLoading || liqStable.isLoading,
            },
            {
                fee: FEE_TIERS.LOW,
                addr: poolLowAddr,
                liq: liqLow.data as bigint | undefined,
                loading: poolLow.isLoading || liqLow.isLoading,
            },
            {
                fee: FEE_TIERS.MEDIUM,
                addr: poolMediumAddr,
                liq: liqMedium.data as bigint | undefined,
                loading: poolMedium.isLoading || liqMedium.isLoading,
            },
            {
                fee: FEE_TIERS.HIGH,
                addr: poolHighAddr,
                liq: liqHigh.data as bigint | undefined,
                loading: poolHigh.isLoading || liqHigh.isLoading,
            },
        ]
        const isLoading = pools.some((p) => p.loading)
        const validPools = pools.filter((p) => isValidPool(p.addr) && p.liq && p.liq > 0n)
        const best = validPools.sort((a, b) => (b.liq! > a.liq! ? 1 : -1))[0]
        return {
            bestPool: best?.addr ?? null,
            bestFee: best?.fee ?? null,
            isLoadingPool: isLoading,
        }
    }, [
        poolStableAddr,
        poolLowAddr,
        poolMediumAddr,
        poolHighAddr,
        liqStable.data,
        liqLow.data,
        liqMedium.data,
        liqHigh.data,
        poolStable.isLoading,
        poolLow.isLoading,
        poolMedium.isLoading,
        poolHigh.isLoading,
        liqStable.isLoading,
        liqLow.isLoading,
        liqMedium.isLoading,
        liqHigh.isLoading,
    ])
    const isReadyForQuote =
        enabled &&
        !!tokenIn &&
        !!tokenOut &&
        amountIn > 0n &&
        !!dexConfig &&
        tokenIn.chainId === tokenOut.chainId &&
        !isSameToken(tokenIn, tokenOut) &&
        !!bestPool &&
        !!bestFee
    const quoteParams = isReadyForQuote
        ? buildQuoteParams(
              tokenIn.address as Address,
              tokenOut.address as Address,
              amountIn,
              bestFee,
              tokenIn.chainId
          )
        : null
    const {
        data,
        isLoading: isQuoteLoading,
        isError,
        error,
    } = useReadContract({
        address: dexConfig?.quoter,
        abi: UNISWAP_V3_QUOTER_V2_ABI,
        functionName: 'quoteExactInputSingle',
        args: quoteParams ? [quoteParams] : undefined,
        chainId: tokenIn?.chainId,
        query: {
            enabled: isReadyForQuote,
            staleTime: 10_000,
        },
    })
    const quote: QuoteResult | null = useMemo(() => {
        if (!data) return null
        return {
            amountOut: data[0],
            sqrtPriceX96After: data[1],
            initializedTicksCrossed: Number(data[2]),
            gasEstimate: data[3],
        }
    }, [data])
    const displayError = useMemo(() => {
        if (isError && error) return error as Error
        if (!isLoadingPool && !bestPool && tokenIn && tokenOut && baseQueryEnabled) {
            return new Error(
                `No pool found for ${tokenIn.symbol}/${tokenOut.symbol}. Try a different token pair.`
            )
        }
        return null
    }, [isError, error, isLoadingPool, bestPool, tokenIn, tokenOut, baseQueryEnabled])
    return {
        quote,
        isLoading: isQuoteLoading || isLoadingPool,
        isError: !!displayError,
        error: displayError,
        fee: bestFee ?? DEFAULT_FEE_TIER,
    }
}
