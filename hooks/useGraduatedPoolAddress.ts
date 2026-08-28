'use client'

import { useMemo } from 'react'
import type { Address } from 'viem'
import { useV3Pools } from '@/hooks/useV3Pools'
import { findGraduatedPool, GRADUATED_POOL_FEE } from '@/services/launchpad/launchpad'

export function useGraduatedPoolAddress(
    tokenAddr: Address | undefined,
    wrappedNative: Address | undefined,
    chainId: number
): { poolAddress: Address | undefined; isLoading: boolean } {
    const { pools, isLoading } = useV3Pools(chainId, !!tokenAddr && !!wrappedNative)

    const poolAddress = useMemo(() => {
        if (!tokenAddr || !wrappedNative) return undefined
        const pool = findGraduatedPool(pools, tokenAddr, wrappedNative, GRADUATED_POOL_FEE)
        return pool?.address as Address | undefined
    }, [pools, tokenAddr, wrappedNative])

    return { poolAddress, isLoading }
}
