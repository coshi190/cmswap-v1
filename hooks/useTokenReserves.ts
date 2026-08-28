'use client'

import { useReadContracts } from 'wagmi'
import type { Address } from 'viem'
import { BONDING_CURVE_JUNOSWAP_ABI, getBondingCurveDeployment } from '@coshi190/juno-moneta-sdk'
import { DEFAULT_LAUNCHPAD_CHAIN_ID } from '@/hooks/useLaunchpadChainId'
const VIRTUAL_AMOUNT = 3400n * 10n ** 18n

interface UseTokenReservesParams {
    tokenAddr: Address | null
    isGraduated?: boolean
    chainId?: number
}

interface UseTokenReservesResult {
    nativeReserve: bigint
    tokenReserve: bigint
    isGraduated: boolean
    virtualAmount: bigint
    graduationAmount: bigint
    isLoading: boolean
    refetch: () => void
}

export function useTokenReserves({
    tokenAddr,
    isGraduated: isGraduatedProp,
    chainId = DEFAULT_LAUNCHPAD_CHAIN_ID,
}: UseTokenReservesParams): UseTokenReservesResult {
    const bondingCurveAddress = getBondingCurveDeployment(chainId)?.address
    const skip = !tokenAddr || !!isGraduatedProp || !bondingCurveAddress
    const reserveArgs: [`0x${string}`] | undefined =
        tokenAddr && !isGraduatedProp ? [tokenAddr] : undefined

    const { data, isLoading, refetch } = useReadContracts({
        contracts: [
            {
                address: bondingCurveAddress,
                abi: BONDING_CURVE_JUNOSWAP_ABI,
                functionName: 'pumpReserve',
                args: reserveArgs,
                chainId,
            },
            {
                address: bondingCurveAddress,
                abi: BONDING_CURVE_JUNOSWAP_ABI,
                functionName: 'graduationAmount',
                chainId,
            },
        ],
        query: {
            enabled: !skip,
        },
    })

    const reserveData = data?.[0]?.result as [bigint, bigint] | undefined
    const graduationAmountData = data?.[1]?.result as bigint | undefined

    return {
        nativeReserve: reserveData?.[0] ?? 0n,
        tokenReserve: reserveData?.[1] ?? 0n,
        isGraduated: !!isGraduatedProp,
        virtualAmount: VIRTUAL_AMOUNT,
        graduationAmount: graduationAmountData ?? 0n,
        isLoading: !!isLoading && !skip,
        refetch,
    }
}
