'use client'

import { useCallback, useMemo } from 'react'
import {
    useAccount,
    useChainId,
    useSimulateContract,
    useWaitForTransactionReceipt,
    useWriteContract,
} from 'wagmi'
import type { Address, Hex } from 'viem'
import { ProtocolType, getDexConfig } from '@coshi190/juno-moneta-sdk'
import { useNowSeconds } from '@/hooks/useNowSeconds'
import { useTokenApproval } from '@/hooks/useTokenApproval'
import { useTokenBalance } from '@/hooks/useTokenBalance'
import {
    buildIncentiveKey,
    parseRewardAmount,
    validateCreateIncentive,
} from '@/services/mining/create-incentive'
import { computeIncentiveId } from '@/services/mining/staking'
import type {
    CreateIncentiveError,
    CreateIncentiveForm,
    IncentiveKey,
    StakerLimits,
} from '@/types/earn'

const CREATE_INCENTIVE_ABI = [
    {
        type: 'function',
        name: 'createIncentive',
        stateMutability: 'nonpayable',
        inputs: [
            {
                name: 'key',
                type: 'tuple',
                components: [
                    { name: 'rewardToken', type: 'address' },
                    { name: 'pool', type: 'address' },
                    { name: 'startTime', type: 'uint256' },
                    { name: 'endTime', type: 'uint256' },
                    { name: 'refundee', type: 'address' },
                ],
            },
            { name: 'reward', type: 'uint256' },
        ],
        outputs: [],
    },
] as const

interface UseCreateIncentiveResult {
    errors: CreateIncentiveError[]
    incentiveKey: IncentiveKey | null
    incentiveId: Hex | null
    rewardAmount: bigint
    balance: bigint
    stakerAddress: Address | undefined
    needsApproval: boolean
    approve: () => void
    create: () => void
    isApproving: boolean
    isPreparing: boolean
    isExecuting: boolean
    isConfirming: boolean
    isSuccess: boolean
    error: Error | null
    hash: Hex | undefined
}

/**
 * Approve-then-create against the UniswapV3Staker. The simulate stays disabled until the form is
 * valid and the allowance is in place, so the confirm button never hands the wallet a call that is
 * already known to revert.
 */
export function useCreateIncentive(
    form: CreateIncentiveForm,
    limits: StakerLimits
): UseCreateIncentiveResult {
    const { address } = useAccount()
    const chainId = useChainId()
    const now = useNowSeconds()
    const stakerAddress = getDexConfig(chainId, undefined, ProtocolType.V3)?.staker

    const { balance } = useTokenBalance({ token: form.rewardToken, address })

    const rewardAmount = useMemo(() => {
        if (!form.rewardToken) return 0n
        return parseRewardAmount(form.rewardAmount, form.rewardToken.decimals) ?? 0n
    }, [form.rewardAmount, form.rewardToken])

    const errors = useMemo(
        () => validateCreateIncentive(form, { now, balance, limits, account: address }),
        [form, now, balance, limits, address]
    )

    const incentiveKey = useMemo(
        () => buildIncentiveKey(form, { now, account: address }),
        [form, now, address]
    )

    const incentiveId = useMemo(
        () => (incentiveKey ? computeIncentiveId(incentiveKey) : null),
        [incentiveKey]
    )

    const {
        needsApproval,
        approve: approveReward,
        isApproving,
        isConfirming: isConfirmingApproval,
    } = useTokenApproval({
        token: form.rewardToken,
        owner: address,
        spender: stakerAddress,
        amountToApprove: rewardAmount > 0n ? rewardAmount : undefined,
    })

    const args = useMemo(() => {
        if (!incentiveKey || rewardAmount <= 0n) return undefined
        return [
            {
                rewardToken: incentiveKey.rewardToken,
                pool: incentiveKey.pool,
                startTime: BigInt(incentiveKey.startTime),
                endTime: BigInt(incentiveKey.endTime),
                refundee: incentiveKey.refundee,
            },
            rewardAmount,
        ] as const
    }, [incentiveKey, rewardAmount])

    const canSimulate = !!stakerAddress && !!args && errors.length === 0 && !needsApproval

    const {
        data: simulation,
        isLoading: isPreparing,
        error: simulationError,
    } = useSimulateContract({
        address: stakerAddress,
        abi: CREATE_INCENTIVE_ABI,
        functionName: 'createIncentive',
        args,
        query: { enabled: canSimulate },
    })

    const {
        writeContract,
        data: hash,
        isPending: isExecuting,
        error: writeError,
    } = useWriteContract()

    const {
        isLoading: isConfirmingCreate,
        isSuccess,
        error: receiptError,
    } = useWaitForTransactionReceipt({ hash })

    const create = useCallback(() => {
        if (!simulation?.request) return
        writeContract(simulation.request)
    }, [simulation, writeContract])

    return {
        errors,
        incentiveKey,
        incentiveId,
        rewardAmount,
        balance,
        stakerAddress,
        needsApproval,
        approve: approveReward,
        create,
        isApproving: isApproving || isConfirmingApproval,
        isPreparing: canSimulate && isPreparing,
        isExecuting,
        isConfirming: isConfirmingCreate,
        isSuccess,
        error:
            writeError || receiptError || (canSimulate ? (simulationError as Error | null) : null),
        hash,
    }
}
