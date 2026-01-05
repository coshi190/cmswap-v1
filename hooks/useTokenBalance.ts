'use client'

import { useBalance, useReadContract } from 'wagmi'
import type { Address } from 'viem'
import type { Token } from '@/types/tokens'
import { formatTokenAmount } from '@/services/tokens'
import { isNativeToken } from '@/lib/wagmi'
import { ERC20_ABI } from '@/lib/abis/erc20'

export interface UseTokenBalanceParams {
    token: Token | null
    address?: Address
}

export interface UseTokenBalanceResult {
    balance: bigint
    formattedBalance: string
    isLoading: boolean
    isError: boolean
    refetch: () => void
}

export function useTokenBalance({ token, address }: UseTokenBalanceParams): UseTokenBalanceResult {
    const isNative = token ? isNativeToken(token.address) : false
    const nativeBalance = useBalance({
        address,
        chainId: token?.chainId,
        query: {
            enabled: !!address && !!token && isNative,
        },
    })
    const erc20Balance = useReadContract({
        address: token?.address as Address,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [address || '0x0'],
        chainId: token?.chainId,
        query: {
            enabled: !!address && !!token && !isNative,
        },
    })
    const balance = isNative
        ? nativeBalance.data?.value || 0n
        : (erc20Balance.data as bigint | undefined) || 0n
    const formattedBalance = token ? formatTokenAmount(balance, token.decimals) : '0'
    return {
        balance,
        formattedBalance,
        isLoading: nativeBalance.isLoading || erc20Balance.isLoading,
        isError: nativeBalance.isError || erc20Balance.isError,
        refetch: isNative ? nativeBalance.refetch : erc20Balance.refetch,
    }
}
