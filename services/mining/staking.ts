import { encodeFunctionData, encodeAbiParameters, keccak256, type Address, type Hex } from 'viem'
import type { IncentiveKey, UnstakeParams } from '@/types/earn'
import { UNISWAP_V3_STAKER_ABI } from '@coshi190/junoswap-sdk'

/**
 * The staker keys every incentive by `keccak256(abi.encode(key))`, which is the same encoding
 * `safeTransferFrom` carries as its stake payload — so both paths share one encoder and a freshly
 * created incentive can be identified before the indexer has seen it.
 */
export function computeIncentiveId(key: IncentiveKey): Hex {
    return keccak256(encodeIncentiveKeyData(key))
}

export function encodeIncentiveKeyData(key: IncentiveKey): Hex {
    return encodeAbiParameters(
        [
            {
                type: 'tuple',
                components: [
                    { type: 'address', name: 'rewardToken' },
                    { type: 'address', name: 'pool' },
                    { type: 'uint256', name: 'startTime' },
                    { type: 'uint256', name: 'endTime' },
                    { type: 'address', name: 'refundee' },
                ],
            },
        ],
        [
            {
                rewardToken: key.rewardToken,
                pool: key.pool,
                startTime: BigInt(key.startTime),
                endTime: BigInt(key.endTime),
                refundee: key.refundee,
            },
        ]
    )
}

function encodeUnstakeToken(params: UnstakeParams): Hex {
    return encodeFunctionData({
        abi: UNISWAP_V3_STAKER_ABI,
        functionName: 'unstakeToken',
        args: [
            {
                rewardToken: params.incentiveKey.rewardToken,
                pool: params.incentiveKey.pool,
                startTime: BigInt(params.incentiveKey.startTime),
                endTime: BigInt(params.incentiveKey.endTime),
                refundee: params.incentiveKey.refundee,
            },
            params.tokenId,
        ],
    })
}

function encodeWithdrawToken(tokenId: bigint, to: Address): Hex {
    return encodeFunctionData({
        abi: UNISWAP_V3_STAKER_ABI,
        functionName: 'withdrawToken',
        args: [tokenId, to, '0x'],
    })
}

function encodeClaimReward(rewardToken: Address, to: Address, amountRequested: bigint): Hex {
    return encodeFunctionData({
        abi: UNISWAP_V3_STAKER_ABI,
        functionName: 'claimReward',
        args: [rewardToken, to, amountRequested],
    })
}

export function buildUnstakeAndWithdrawMulticall(
    tokenId: bigint,
    incentiveKey: IncentiveKey,
    recipient: Address
): Hex[] {
    return [
        encodeUnstakeToken({ tokenId, incentiveKey }),
        encodeClaimReward(incentiveKey.rewardToken, recipient, 0n), // 0n = claim all
        encodeWithdrawToken(tokenId, recipient),
    ]
}

export function buildUnstakeAndClaimMulticall(
    tokenId: bigint,
    incentiveKey: IncentiveKey,
    recipient: Address
): Hex[] {
    return [
        encodeUnstakeToken({ tokenId, incentiveKey }),
        encodeClaimReward(incentiveKey.rewardToken, recipient, 0n),
    ]
}
