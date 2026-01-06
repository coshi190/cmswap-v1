'use client'

import { useMemo } from 'react'
import { useReadContract } from 'wagmi'
import type { Address } from 'viem'
import type { Token } from '@/types/tokens'
import type { QuoteResult } from '@/types/swap'
import { getV2Config } from '@/lib/dex-config'
import { useSwapStore } from '@/store/swap-store'
import { UNISWAP_V2_ROUTER_ABI } from '@/lib/abis/uniswap-v2-router'
import { UNISWAP_V2_FACTORY_ABI } from '@/lib/abis/uniswap-v2-factory'
import { buildV2QuoteParams } from '@/services/dex/uniswap-v2'
import { isSameToken, getSwapAddress, getWrapOperation } from '@/services/tokens'

export interface UseUniV2QuoteParams {
    tokenIn: Token | null
    tokenOut: Token | null
    amountIn: bigint
    enabled?: boolean
}

export interface UseUniV2QuoteResult {
    quote: QuoteResult | null
    isLoading: boolean
    isError: boolean
    error: Error | null
    isWrapUnwrap: boolean
    wrapOperation: 'wrap' | 'unwrap' | null
}

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as Address

export function useUniV2Quote({
    tokenIn,
    tokenOut,
    amountIn,
    enabled = true,
}: UseUniV2QuoteParams): UseUniV2QuoteResult {
    const { selectedDex } = useSwapStore()
    const dexConfig = tokenIn ? getV2Config(tokenIn.chainId, selectedDex) : null
    const chainId = tokenIn?.chainId ?? 1
    const wrapOperation = useMemo(() => {
        return getWrapOperation(tokenIn, tokenOut)
    }, [tokenIn, tokenOut])
    const tokenInAddress = tokenIn
        ? getSwapAddress(tokenIn.address as Address, chainId, dexConfig?.wnative)
        : ZERO_ADDRESS
    const tokenOutAddress = tokenOut
        ? getSwapAddress(tokenOut.address as Address, chainId, dexConfig?.wnative)
        : ZERO_ADDRESS
    const baseQueryEnabled = !!tokenIn && !!tokenOut && !!dexConfig && !wrapOperation
    const {
        data: pairAddress,
        isLoading: isPairLoading,
        isError: isPairError,
    } = useReadContract({
        address: dexConfig?.factory,
        abi: UNISWAP_V2_FACTORY_ABI,
        functionName: 'getPair',
        args: [tokenInAddress, tokenOutAddress],
        chainId,
        query: {
            enabled: baseQueryEnabled,
            staleTime: 60_000,
        },
    })
    const pairExists = pairAddress && pairAddress !== ZERO_ADDRESS
    const quoteParams = useMemo(() => {
        if (!tokenIn || !tokenOut || amountIn <= 0n) return null
        return buildV2QuoteParams(
            tokenIn.address as Address,
            tokenOut.address as Address,
            amountIn,
            chainId,
            dexConfig?.wnative
        )
    }, [tokenIn, tokenOut, amountIn, chainId, dexConfig])
    const isReadyForQuote =
        enabled &&
        !!tokenIn &&
        !!tokenOut &&
        amountIn > 0n &&
        !!dexConfig &&
        tokenIn.chainId === tokenOut.chainId &&
        !isSameToken(tokenIn, tokenOut) &&
        !wrapOperation &&
        pairExists
    const {
        data: amountsOut,
        isLoading: isQuoteLoading,
        isError: isQuoteError,
        error: quoteError,
    } = useReadContract({
        address: dexConfig?.router,
        abi: UNISWAP_V2_ROUTER_ABI,
        functionName: 'getAmountsOut',
        args: quoteParams ? [quoteParams.amountIn, quoteParams.path] : undefined,
        chainId,
        query: {
            enabled: isReadyForQuote,
            staleTime: 10_000,
        },
    })
    const quote: QuoteResult | null = useMemo(() => {
        if (wrapOperation && tokenIn && tokenOut && amountIn > 0n) {
            return {
                amountOut: amountIn,
                sqrtPriceX96After: 0n, // N/A for V2
                initializedTicksCrossed: 0, // N/A for V2
                gasEstimate: wrapOperation === 'wrap' ? 50000n : 40000n,
            }
        }
        if (!amountsOut || amountsOut.length < 2) return null
        const amountOut = amountsOut[amountsOut.length - 1]
        if (amountOut === undefined) return null
        return {
            amountOut,
            sqrtPriceX96After: 0n, // N/A for V2
            initializedTicksCrossed: 0, // N/A for V2
            gasEstimate: 150000n, // Estimate for V2 swap
        }
    }, [amountsOut, wrapOperation, tokenIn, tokenOut, amountIn])
    const displayError = useMemo(() => {
        if (isQuoteError && quoteError) return quoteError as Error
        if (isPairError) return new Error('Failed to check pair')
        if (!wrapOperation && !isPairLoading && !pairExists && tokenIn && tokenOut && dexConfig) {
            return new Error(`No pair found for ${tokenIn.symbol}/${tokenOut.symbol} on jibswap.`)
        }
        return null
    }, [
        isQuoteError,
        quoteError,
        isPairError,
        isPairLoading,
        pairExists,
        tokenIn,
        tokenOut,
        dexConfig,
        wrapOperation,
    ])
    return {
        quote,
        isLoading: wrapOperation ? false : isQuoteLoading || isPairLoading,
        isError: !!displayError,
        error: displayError,
        isWrapUnwrap: !!wrapOperation,
        wrapOperation,
    }
}
