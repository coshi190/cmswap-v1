'use client'

import { useQuery } from '@tanstack/react-query'
import { usePublicClient } from 'wagmi'
import type { Address } from 'viem'
import { useLaunchpadChainId } from '@/hooks/useLaunchpadChainId'
import {
    ERC20_ABI,
    fetchTokenHolders,
    fetchTokenSnapshots,
    INITIAL_TOKEN_SUPPLY,
    TOKEN_HOLDER_ADDRESS_FIELDS,
    TOKEN_SNAPSHOT_HOLDER_COUNT_FIELDS,
} from '@coshi190/junoswap-sdk'
import { ponderClient } from '@/lib/ponder-client'
import type { HolderData } from '@/types/launchpad'

export type { HolderData }

const HOLDER_BALANCE_SCAN_LIMIT = 200

async function fetchRealBalances(
    publicClient: NonNullable<ReturnType<typeof usePublicClient>>,
    tokenAddr: Address,
    addresses: Address[]
): Promise<HolderData[]> {
    if (addresses.length === 0) return []

    const results = await Promise.allSettled(
        addresses.map((addr) =>
            publicClient.readContract({
                address: tokenAddr,
                abi: ERC20_ABI,
                functionName: 'balanceOf',
                args: [addr],
            })
        )
    )

    const holders: HolderData[] = results
        .map((result, i) => {
            if (result.status !== 'fulfilled') return null
            const balance = result.value as bigint
            if (balance === 0n) return null
            return {
                address: addresses[i],
                balance,
                percentage:
                    INITIAL_TOKEN_SUPPLY > 0n
                        ? Number((balance * 10000n) / INITIAL_TOKEN_SUPPLY) / 100
                        : 0,
            }
        })
        .filter((h): h is HolderData => h !== null)
        .sort((a, b) => (b.balance > a.balance ? 1 : b.balance < a.balance ? -1 : 0))
        .slice(0, 20)

    return holders
}

export function useTokenHolders(
    tokenAddr: Address | undefined,
    poolAddress?: Address,
    isGraduated?: boolean
) {
    const chainId = useLaunchpadChainId()
    const publicClient = usePublicClient({ chainId })

    const { data, isLoading } = useQuery({
        queryKey: [
            'token-holders',
            tokenAddr?.toLowerCase(),
            poolAddress?.toLowerCase(),
            isGraduated,
        ],
        queryFn: async () => {
            if (!tokenAddr || !publicClient) return { holders: [], holderCount: 0 }

            const [rows, snapshots] = await Promise.all([
                fetchTokenHolders(ponderClient, { tokenAddr }, TOKEN_HOLDER_ADDRESS_FIELDS),
                fetchTokenSnapshots(
                    ponderClient,
                    { tokenAddrs: [tokenAddr] },
                    TOKEN_SNAPSHOT_HOLDER_COUNT_FIELDS
                ),
            ])
            const addresses = [...new Set(rows.map((h) => h.address))] as Address[]
            const holderCount = snapshots[0]?.holderCount ?? addresses.length

            const holders = await fetchRealBalances(
                publicClient,
                tokenAddr,
                addresses.slice(0, HOLDER_BALANCE_SCAN_LIMIT)
            )

            const realHolderCount = holders.filter((h) => h.balance > 0n).length

            return { holders, holderCount: Math.max(holderCount, realHolderCount) }
        },
        enabled: !!tokenAddr && !!publicClient,
        staleTime: 30_000,
        refetchInterval: 30_000,
    })

    return {
        holders: data?.holders ?? [],
        holderCount: data?.holderCount ?? 0,
        isLoading,
    }
}
