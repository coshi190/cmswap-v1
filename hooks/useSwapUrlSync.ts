'use client'

import { useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useChainId } from 'wagmi'
import { useDebounce } from './useDebounce'
import { useSwapStore } from '@/store/swap-store'
import {
    parseSwapSearchParams,
    buildSwapSearchParams,
    parseAndValidateSwapParams,
} from '@/lib/swap-params'

const URL_UPDATE_DEBOUNCE_MS = 500

export function useSwapUrlSync() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const chainId = useChainId()
    const {
        tokenIn,
        tokenOut,
        amountIn,
        setTokenIn,
        setTokenOut,
        setAmountIn,
        setIsUpdatingFromUrl,
    } = useSwapStore()
    const hasInitializedRef = useRef(false)
    const isUpdatingFromUrlRef = useRef(false)
    useEffect(() => {
        if (isUpdatingFromUrlRef.current) return
        const urlParams = parseSwapSearchParams(searchParams)
        const parsed = parseAndValidateSwapParams(chainId, urlParams)
        if (parsed.errors.length > 0 && process.env.NODE_ENV === 'development') {
            console.warn('[useSwapUrlSync] URL parameter errors:', parsed.errors)
        }
        isUpdatingFromUrlRef.current = true
        setIsUpdatingFromUrl(true)
        if (parsed.tokenIn && (!tokenIn || parsed.tokenIn.address !== tokenIn.address)) {
            setTokenIn(parsed.tokenIn)
        }
        if (parsed.tokenOut && (!tokenOut || parsed.tokenOut.address !== tokenOut.address)) {
            setTokenOut(parsed.tokenOut)
        }
        if (parsed.amountIn && amountIn !== parsed.amountIn) {
            setAmountIn(parsed.amountIn)
        }
        setTimeout(() => {
            isUpdatingFromUrlRef.current = false
            setIsUpdatingFromUrl(false)
        }, 0)
        hasInitializedRef.current = true
    }, [searchParams])
    const debouncedTokenIn = useDebounce(tokenIn, URL_UPDATE_DEBOUNCE_MS)
    const debouncedTokenOut = useDebounce(tokenOut, URL_UPDATE_DEBOUNCE_MS)
    const debouncedAmountIn = useDebounce(amountIn, URL_UPDATE_DEBOUNCE_MS)
    useEffect(() => {
        if (!hasInitializedRef.current) return
        if (isUpdatingFromUrlRef.current) return
        const newParams = buildSwapSearchParams({
            input: debouncedTokenIn?.address,
            output: debouncedTokenOut?.address,
            amount: debouncedAmountIn || undefined,
        })
        const currentParams = new URLSearchParams(searchParams.toString())
        const newParamsStr = newParams.toString()
        const currentParamsStr = currentParams.toString()
        if (newParamsStr !== currentParamsStr) {
            isUpdatingFromUrlRef.current = true
            const newUrl = `${window.location.pathname}${newParamsStr ? `?${newParamsStr}` : ''}`
            router.replace(newUrl, { scroll: false })
            setTimeout(() => {
                isUpdatingFromUrlRef.current = false
            }, 100)
        }
    }, [debouncedTokenIn, debouncedTokenOut, debouncedAmountIn, router, searchParams])
}
