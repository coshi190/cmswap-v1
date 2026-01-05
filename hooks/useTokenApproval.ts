'use client'

import { useEffect } from 'react'
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import type { Address } from 'viem'
import type { Token } from '@/types/tokens'
import { buildInfiniteApprovalParams, needsApproval } from '@/services/tokens'
import { getDexConfig, getProtocolSpender } from '@/lib/dex-config'
import { useSwapStore } from '@/store/swap-store'
import { ERC20_ABI } from '@/lib/abis/erc20'
import { isNativeToken } from '@/lib/wagmi'

export interface UseTokenApprovalParams {
    token: Token
    owner?: Address
    amountToApprove?: bigint
}

export interface UseTokenApprovalResult {
    allowance: bigint
    needsApproval: boolean
    isApproving: boolean
    isConfirming: boolean
    isSuccess: boolean
    isError: boolean
    error: Error | null
    hash: Address | undefined
    approve: () => void
}

export function useTokenApproval({
    token,
    owner,
    amountToApprove,
}: UseTokenApprovalParams): UseTokenApprovalResult {
    const { selectedDex } = useSwapStore()
    const dexConfig = getDexConfig(token.chainId, selectedDex)
    const spender = dexConfig ? getProtocolSpender(dexConfig) : undefined
    const isTokenNative = isNativeToken(token.address)
    const { data: allowance = 0n, refetch: refetchAllowance } = useReadContract({
        address: token.address as Address,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [owner || '0x0', spender || '0x0'],
        chainId: token.chainId,
        query: {
            enabled: !!owner && !!spender && !isTokenNative,
        },
    })
    const {
        data: hash,
        writeContract: approve,
        isPending: isApproving,
        isError,
        error,
    } = useWriteContract()
    const { isSuccess, isPending: isConfirming } = useWaitForTransactionReceipt({
        hash,
    })
    useEffect(() => {
        if (isSuccess) {
            refetchAllowance()
        }
    }, [isSuccess, refetchAllowance])
    const needsToApprove =
        !isTokenNative && amountToApprove ? needsApproval(allowance, amountToApprove) : false
    return {
        allowance,
        needsApproval: needsToApprove,
        isApproving,
        isConfirming,
        isSuccess,
        isError,
        error,
        hash,
        approve: () => {
            if (!spender || !owner || isTokenNative) return
            approve({
                ...buildInfiniteApprovalParams(token.address as Address, spender),
                chainId: token.chainId,
            })
        },
    }
}
