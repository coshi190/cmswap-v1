'use client'

import { useMemo } from 'react'
import { useWriteContract, useWaitForTransactionReceipt, useSimulateContract } from 'wagmi'
import type { Address, Hex } from 'viem'
import type { Token } from '@/types/tokens'
import type { SwapParams, SwapResult } from '@/types/swap'
import { getV3Config } from '@/lib/dex-config'
import { useSwapStore } from '@/store/swap-store'
import { UNISWAP_V3_SWAP_ROUTER_ABI } from '@/lib/abis/uniswap-v3-swap-router'
import { buildSwapParams, buildMulticallSwapToNative } from '@/services/dex/uniswap-v3'
import { isNativeToken } from '@/lib/wagmi'

export interface UseUniV3SwapExecutionParams {
    tokenIn: Token
    tokenOut: Token
    amountIn: bigint
    amountOutMinimum: bigint
    recipient: Address
    slippage: number // in percentage (0.5, 1, etc.)
    deadlineMinutes: number
    fee: number
}

export interface UseUniV3SwapExecutionResult {
    swap: () => void
    result: SwapResult | null
    isPreparing: boolean
    isExecuting: boolean
    isConfirming: boolean
    isSuccess: boolean
    isError: boolean
    error: Error | null
    hash: Address | undefined
    simulationError: Error | null
}

export function useUniV3SwapExecution({
    tokenIn,
    tokenOut,
    amountIn,
    amountOutMinimum,
    recipient,
    slippage,
    deadlineMinutes,
    fee,
}: UseUniV3SwapExecutionParams): UseUniV3SwapExecutionResult {
    const { selectedDex } = useSwapStore()
    const dexConfig = getV3Config(tokenIn.chainId, selectedDex)
    const isNativeInput = isNativeToken(tokenIn.address as Address)
    const isNativeOutput = isNativeToken(tokenOut.address as Address)
    const swapParams: SwapParams = {
        tokenIn: tokenIn.address as Address,
        tokenOut: tokenOut.address as Address,
        amountIn,
        amountOutMinimum,
        recipient,
        slippageTolerance: Math.floor(slippage * 100), // Convert to basis points
        deadline: Math.floor(Date.now() / 1000) + deadlineMinutes * 60,
    }
    const contractCall = useMemo(() => {
        const txValue = isNativeInput ? amountIn : undefined
        if (isNativeOutput) {
            const multicallData = buildMulticallSwapToNative(swapParams, fee, tokenIn.chainId)
            return {
                functionName: 'multicall' as const,
                args: [multicallData] as [Hex[]],
                value: txValue,
            }
        } else {
            const params = buildSwapParams(swapParams, fee, tokenIn.chainId)
            return {
                functionName: 'exactInputSingle' as const,
                args: [params] as const,
                value: txValue,
            }
        }
    }, [isNativeInput, isNativeOutput, swapParams, fee, tokenIn.chainId])
    const {
        data: simulationData,
        isLoading: isPreparing,
        error: simulationError,
    } = useSimulateContract({
        address: dexConfig?.swapRouter,
        abi: UNISWAP_V3_SWAP_ROUTER_ABI,
        functionName: contractCall.functionName,
        args: contractCall.args,
        value: contractCall.value,
        chainId: tokenIn.chainId,
        query: {
            enabled: amountIn > 0n,
        },
    })
    const {
        data: hash,
        writeContract: swap,
        isPending: isExecuting,
        isError,
        error,
    } = useWriteContract()
    const { isSuccess, isPending: isConfirming } = useWaitForTransactionReceipt({
        hash,
    })
    const executeSwap = () => {
        if (!dexConfig) {
            console.error('Swap execution failed: DEX config not found for chain', tokenIn.chainId)
            return
        }
        if (!simulationData?.request) {
            console.error(
                'Swap execution failed: Simulation data not available. Make sure simulation completed successfully.'
            )
            return
        }
        swap({
            ...simulationData.request,
        })
    }
    return {
        swap: executeSwap,
        result: null,
        isPreparing,
        isExecuting,
        isConfirming,
        isSuccess,
        isError,
        error: error as Error | null,
        hash,
        simulationError: simulationError as Error | null,
    }
}
