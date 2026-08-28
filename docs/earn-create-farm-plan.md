# แผนพัฒนา Feature "Earn" — Create Mining Farm (junoswap2)

> อ้างอิงการศึกษา `interface-openbbq/app/earn` (Program Earn / Mining Farm) แล้วออกแบบแผนสำหรับ `junoswap2`
> ขอบเขต Phase หลัก: **Concentrated Liquidity Staking (Uniswap V3 Staker)** — Token Staking วางเป็น roadmap ถัดไป

## สถานะการ Implement

| Phase | สถานะ |
|---|---|
| 1 · validation service + tests | ✅ `services/mining/create-incentive.ts`, `lib/duration.ts` (45 tests ผ่าน) |
| 2 · `useCreateIncentive` | ✅ + `useStakerLimits`, `useNowSeconds` |
| 3 · UI + ต่อเข้าหน้า earn | ✅ `create-farm-dialog`, `farm-pool-picker`, `farm-schedule-input` + filter tabs |
| 4 · My Farms + endIncentive | ✅ `my-farms.tsx`, `useEndIncentive`, `useMyIncentives`, `getEndIncentiveBlocker` |
| 5 · APR บน farm card | ⬜ ยังไม่ทำ |
| 6 · Token Staking | ⬜ roadmap (ต้อง deploy contract + indexer ก่อน) |

**ค้างตรวจ 2 อย่างก่อน merge** — ดู §4.3: ABI ของ `maxIncentiveDuration`/`maxIncentiveStartLeadTime` บน staker ที่ deploy จริง (ถ้าไม่มีจะ fallback เป็นค่า canonical) และ latency ของ ponder หลัง `IncentiveCreated`

---

## 1. สรุปสิ่งที่ศึกษาจาก interface-openbbq

### 1.1 โครงสร้าง `app/earn`

| ไฟล์ | บรรทัด | หน้าที่ |
|---|---|---|
| `app/earn/page.tsx` | 22 | หน้า Earn หลัก — เป็น **staking ของ CMswap เอง** (`Staking25925`) gate ด้วย `chainId === 25925` ไม่เกี่ยวกับ farm program |
| `app/earn/program/page.tsx` | 482 | หน้า **detail ของ program** — ยังเป็น **mock data ทั้งหมด** (`stakingHistory`, `lockHistory`, `nftHistory` hardcode) |
| `app/earn/create/page.tsx` | **2,722** | หน้า **สร้าง program** — ตัวจริงที่ยิง contract |
| `app/earn/abi/UniswapV2Pair.ts` | — | ABI สำหรับอ่าน reserve ตอนคำนวณ TVL |

### 1.2 Wizard 4 ขั้นใน `create/page.tsx`

```
Step 1  Select Staking Type
        ├── "Token Staking"                  → StakingFactoryV2.createProject()
        └── "Concentrate Liquidity Staking"  → StakingFactoryV3.createIncentive()
        ⚠️ ENABLED_STAKING_TYPES เปิดใช้แค่ CL — Token Staking ถูก comment ปิดไว้

Step 2  Select Pool / Token
        ├── CL: เลือก pair + fee tier (100 / 500 / 3000 / 10000) → ได้ poolAddress
        └── Token: เลือก staking token (อ่าน name/symbol/totalSupply)

Step 3  Add Reward
        ├── reward token + amount
        ├── start date (DateTimePicker) + duration
        ├── lock mode (0 = flexible, 1 = fixed, 2 = multiple + powerMultipliers)
        └── userLockMaximum / poolLockMaximum

Step 4  Review → createPool()
        approve(ERC20) → simulateContract → writeContract → waitForTransactionReceipt
        txStatus: idle → approving → creating → completed | error
```

### 1.3 Contract call ที่เกิดขึ้นจริง

**CL Staking** (`createPool()` บรรทัด ~890-965):

```ts
// 1) approve reward token ให้ StakingFactoryV3
readContract(erc20.allowance) → ถ้าไม่พอ → writeContract(erc20.approve)

// 2) createIncentive
simulateContract({
  ...StakingFactoryV3Contract,
  functionName: 'createIncentive',
  args: [
    { rewardToken, pool, startTime, endTime, refundee },
    parseEther(rewardAmount),
  ],
})
```

→ **นี่คือ interface ของ Uniswap V3 Staker แบบเป๊ะๆ** ซึ่ง junoswap2 มี contract + SDK + indexer พร้อมอยู่แล้ว

### 1.4 จุดอ่อนที่ **ไม่ควรลอกมา**

| ปัญหา | รายละเอียด |
|---|---|
| **Monolithic** | ไฟล์เดียว 2,722 บรรทัด รวม state 40+ ตัว, fetch pools, คำนวณ block time, UI, contract write ปนกันหมด ผิด convention `junoswap2` (hooks / services / components แยกชั้น) |
| **หน่วยเวลาปนกัน** | `duration` default = `"120960"` (จำนวน block) แต่ `useEffect` คำนวณ `endRewardBlock` ใช้ `Number(effectiveDuration) * 24 * 60 * 60` (ตีความเป็น "วัน") ส่วน `createPool()` ฝั่ง CL ใช้ `effectiveDuration * avgBlockTime` (ตีความเป็น "block") — **สามค่านี้ขัดกันเอง** |
| **ไม่ validate ข้อจำกัดของ staker** | ไม่อ่าน `maxIncentiveDuration()` / `maxIncentiveStartLeadTime()` → ผู้ใช้กรอกเกินแล้วไป revert เอาที่หน้า wallet |
| **Block-time estimation เอง** | `getAverageBlockTime()` sample 100 block แล้วเดา block number ของ start — ฝั่ง V3 Staker ใช้ **timestamp ล้วน** ไม่ต้องแปลงเป็น block เลย |
| **ไม่มีทางออก** | ไม่มี `endIncentive` / refund reward ที่เหลือ — เจ้าของ program สร้างแล้วเงินค้าง |
| **ไม่มี validation ฝั่ง UI** | `parseEther()` ตรงๆ ไม่เช็ค decimals ของ reward token (token 6-decimals จะพัง) |

---

## 2. สถานะปัจจุบันของ junoswap2

### 2.1 สิ่งที่ **มีแล้ว** (ฝั่ง consume)

```
app/earn/page.tsx                    MiningFarms + PoolsList + StakeDialog + AddLiquidityDialog
components/mining/mining-farms.tsx   grid ของ farm + skeleton + empty state
components/mining/farm-card.tsx      pair, fee, reward remaining, progress bar, ปุ่ม Stake
components/mining/stake-dialog.tsx   เลือก NFT position → safeTransferFrom เข้า staker
components/mining/unstake-dialog.tsx unstake + claim + withdraw (multicall)

hooks/useIncentives.ts               fetchIncentives(ponder) + read incentives() on-chain
hooks/useStaking.ts                  useStakePosition / useUnstakePosition
hooks/useStakedPositions.ts          position ที่ stake อยู่ + pending rewards
hooks/useRewards.ts, useDepositedTokenIds.ts

services/mining/incentives.ts        isIncentiveActive/Ended/Pending, progress, time remaining (pure + มี test)
services/mining/staking.ts           encodeIncentiveKeyData, buildUnstakeAndWithdrawMulticall

types/earn.ts                        IncentiveKey, Incentive, StakedPosition, V3PoolData
lib/optimistic-deposits.ts           pattern สำหรับ optimistic UI ระหว่างรอ indexer
@coshi190/juno-moneta-sdk            getDexConfig (.staker), UNISWAP_V3_STAKER_ABI, computeIncentiveId,
                                     fetchIncentives, fetchV3Pools, fetchV3Tokens
```

### 2.2 สิ่งที่ **ขาด** (ฝั่ง create / manage)

- ❌ ไม่มีหน้า/dialog สร้าง incentive
- ❌ ไม่มี `useCreateIncentive` hook
- ❌ ไม่มี validation service สำหรับ incentive parameters
- ❌ ไม่มี `endIncentive` (คืน reward ที่เหลือให้ refundee)
- ❌ ไม่มีมุมมอง "My Farms" สำหรับเจ้าของ program
- ❌ `farm-card.tsx` ไม่มี APR / TVL (มีแต่ reward remaining)

### 2.3 Gap Analysis

| ความสามารถ | openbbq | junoswap2 | ต้องทำ |
|---|:---:|:---:|---|
| ดู farm ทั้งหมด | ⚠️ mock | ✅ | — |
| Stake / Unstake / Claim | ⚠️ mock | ✅ | — |
| **สร้าง incentive (CL)** | ✅ | ❌ | **Phase 1-3** |
| **จบ program + refund** | ❌ | ❌ | **Phase 4** |
| **My Farms (creator view)** | ⚠️ mock | ❌ | **Phase 4** |
| APR / TVL บน farm card | ⚠️ mock | ❌ | Phase 5 |
| Token Staking (lock modes) | ⚠️ ปิดอยู่ | ❌ | Phase 6 (roadmap) |

---

## 3. สถาปัตยกรรมที่เสนอ

ยึด convention ของ `CLAUDE.md`: **logic บริสุทธิ์อยู่ `services/` → chain interaction อยู่ `hooks/` → UI อยู่ `components/`**

```
services/mining/
  create-incentive.ts          ★ ใหม่ — pure: validate + build args + คำนวณเวลา
  create-incentive.test.ts     ★ ใหม่ (services/mining/__tests__/)
  incentives.ts                เดิม (อาจเพิ่ม canEndIncentive())

hooks/
  useCreateIncentive.ts        ★ ใหม่ — approve + simulate + write + receipt
  useEndIncentive.ts           ★ ใหม่ (Phase 4)
  useStakerLimits.ts           ★ ใหม่ — อ่าน maxIncentiveDuration / maxIncentiveStartLeadTime
  useMyIncentives.ts           ★ ใหม่ (Phase 4) — filter useIncentives ด้วย refundee === address

components/mining/
  create-farm-dialog.tsx       ★ ใหม่ — form หลัก (ไม่ทำ wizard 4 ขั้น ดู §3.1)
  pool-picker.tsx              ★ ใหม่ — เลือก V3 pool (reuse fetchV3Pools)
  reward-token-input.tsx       ★ ใหม่ — เลือก token + amount + balance
  schedule-input.tsx           ★ ใหม่ — start / duration + preview
  my-farms.tsx                 ★ ใหม่ (Phase 4)
  index.ts                     แก้ — export ของใหม่

app/earn/
  page.tsx                     แก้ — เพิ่มปุ่ม "Create Farm" + tab "My Farms"
  create/page.tsx              ★ ใหม่ (ทางเลือก — ดู §3.2)

components/layout/header.tsx   ไม่ต้องแก้ (เข้าผ่าน /earn)
```

### 3.1 ทำไม **ไม่** ทำ wizard 4 ขั้น

Uniswap V3 Staker `createIncentive` รับแค่ **5 ฟิลด์**: `rewardToken`, `pool`, `startTime`, `endTime`, `refundee` + `reward`
openbbq ต้องใช้ 4 ขั้นเพราะรวม Token Staking (mode/lock/multiplier/max caps) เข้าไปด้วย

สำหรับ CL อย่างเดียว → **form เดียวจบ** อ่านง่ายกว่า และตรงกับ pattern ที่ repo นี้ใช้อยู่แล้ว (`add-liquidity-dialog.tsx`, `create-token-dialog.tsx`)

```
┌─ Create Mining Farm ─────────────────────┐
│ Pool          [ KKUB / KUSDT  0.30%  ▾ ] │
│ Reward token  [ JUNO              ▾ ]    │
│ Reward amount [ 10,000 ]   Balance: ...  │
│ Starts        [ now ▾ / pick date ]      │
│ Duration      [ 7d ] [ 30d ] [ 90d ] [⌨] │
│ ─────────────────────────────────────────│
│ Ends            15 Sep 2026, 14:00       │
│ Reward rate     ~333 JUNO / day          │
│ Refundee        0xabc…def (you)          │
│ ─────────────────────────────────────────│
│ [ Approve JUNO ] → [ Create Farm ]       │
└──────────────────────────────────────────┘
```

### 3.2 Dialog หรือหน้าแยก?

**แนะนำ: Dialog ก่อน** (`create-farm-dialog.tsx`) — เร็วกว่า, reuse pattern เดิม, ไม่ต้องเพิ่ม route
ถ้าอยากได้ deep link ให้แชร์ (`/earn/create?pool=0x…`) ค่อยเพิ่ม `app/earn/create/page.tsx` บางๆ ที่ห่อ dialog เดิมใน Phase 3.5

---

## 4. Contract surface ที่ต้องรู้ (Uniswap V3 Staker)

### 4.1 `createIncentive`

```solidity
function createIncentive(IncentiveKey memory key, uint256 reward) external;

struct IncentiveKey {
    IERC20Minimal rewardToken;
    IUniswapV3Pool pool;
    uint256 startTime;
    uint256 endTime;
    address refundee;
}
```

**Require ที่จะ revert ถ้าไม่ผ่าน — ต้อง validate ฝั่ง UI ให้หมด:**

| เงื่อนไข | ข้อความ revert |
|---|---|
| `reward > 0` | `reward must be positive` |
| `startTime >= block.timestamp` | `start time must be now or in the future` |
| `endTime > startTime` | `start time must be before end time` |
| `endTime - startTime <= maxIncentiveDuration` | `incentive duration is too long` |
| `startTime - block.timestamp <= maxIncentiveStartLeadTime` | `start time too far into future` |

> ⚠️ `maxIncentiveDuration` และ `maxIncentiveStartLeadTime` เป็น **immutable ที่ตั้งตอน deploy** ต้องอ่านจาก contract จริง ไม่ hardcode — openbbq ไม่ทำข้อนี้

**ต้อง approve ก่อน:** `rewardToken.approve(stakerAddress, reward)` — `createIncentive` ทำ `safeTransferFrom(msg.sender, address(this), reward)`

### 4.2 `endIncentive`

```solidity
function endIncentive(IncentiveKey memory key) external returns (uint256 refund);
```

| เงื่อนไข | หมายเหตุ |
|---|---|
| `block.timestamp >= key.endTime` | จบก่อนเวลาไม่ได้ |
| `incentive.numberOfStakes == 0` | ต้องรอทุกคน unstake ก่อน |
| `refund > 0` | ถ้าแจกหมดแล้วเรียกไม่ได้ |

→ reward ที่เหลือถูกส่งกลับ `key.refundee` (**ไม่ใช่ msg.sender** — ใครก็เรียกได้)

### 4.3 สิ่งที่ต้องเช็คก่อนเริ่ม

- [ ] `UNISWAP_V3_STAKER_ABI` ใน `@coshi190/juno-moneta-sdk` **มี `createIncentive` / `endIncentive` / `maxIncentiveDuration` / `maxIncentiveStartLeadTime` ครบไหม** — ถ้าไม่มีต้อง PR เพิ่มที่ SDK ก่อน (หรือประกาศ ABI fragment ในไฟล์ hook แบบที่ `useStaking.ts` ทำกับ `SAFE_TRANSFER_FROM_ABI`)
- [ ] Ponder indexer handle event `IncentiveCreated` แล้วหรือยัง — `fetchIncentives()` คืน `reward`/`refundee`/`startTime`/`endTime` อยู่แล้ว แปลว่าน่าจะมี แต่ต้องยืนยัน **latency** ว่ากี่วินาที
- [ ] chain ไหนบ้างที่ `getDexConfig(chainId, undefined, ProtocolType.V3)?.staker` คืนค่า — chain ที่ไม่มี staker ต้องซ่อนปุ่ม Create

---

## 5. แผนการพัฒนาเป็น Phase

### Phase 0 — สำรวจ & ปลดล็อก (0.5 วัน)

| # | งาน | ไฟล์ |
|---|---|---|
| 0.1 | ยืนยัน ABI ครบ (§4.3) ถ้าขาด → เพิ่มใน SDK หรือประกาศ local fragment | `@coshi190/juno-moneta-sdk` / `hooks/useCreateIncentive.ts` |
| 0.2 | เขียน `useStakerLimits()` อ่าน `maxIncentiveDuration` + `maxIncentiveStartLeadTime` | `hooks/useStakerLimits.ts` |
| 0.3 | ทดสอบ createIncentive มือเปล่าบน KUB testnet (25925) หา gas + latency ของ indexer | — |

### Phase 1 — Validation service (pure, testable) (0.5 วัน)

`services/mining/create-incentive.ts` — **ไม่มี React, ไม่แตะ chain**

```ts
export interface CreateIncentiveInput {
    rewardToken: Token
    pool: V3PoolData
    rewardAmount: string      // human-readable
    startTime: number         // unix seconds
    durationSeconds: number
    refundee: Address
}

export interface StakerLimits {
    maxIncentiveDuration: number
    maxIncentiveStartLeadTime: number
}

export type CreateIncentiveError =
    | 'REWARD_ZERO' | 'REWARD_EXCEEDS_BALANCE'
    | 'START_IN_PAST' | 'START_TOO_FAR'
    | 'DURATION_ZERO' | 'DURATION_TOO_LONG'
    | 'NO_POOL' | 'NO_REWARD_TOKEN'

export function validateCreateIncentive(
    input: CreateIncentiveInput,
    limits: StakerLimits,
    balance: bigint,
    now: number,
): CreateIncentiveError[]

export function buildIncentiveKey(input: CreateIncentiveInput): IncentiveKey

export function parseRewardAmount(amount: string, decimals: number): bigint
//   ↑ ใช้ parseUnits ตาม decimals จริง ไม่ใช่ parseEther (แก้บั๊กของ openbbq)

export function calculateRewardRate(reward: bigint, decimals: number, durationSeconds: number): {
    perDay: number
    perHour: number
}

export const DURATION_PRESETS = [
    { label: '7 days',  seconds: 604_800 },
    { label: '30 days', seconds: 2_592_000 },
    { label: '90 days', seconds: 7_776_000 },
] as const
```

**Test** (`services/mining/__tests__/create-incentive.test.ts`) — ตาม CLAUDE.md ให้ test business logic ไม่ test passthrough:

- validate ครบทุก error code + กรณี boundary (`startTime === now`, `duration === max`)
- `parseRewardAmount` กับ token 6 decimals และ 18 decimals
- `calculateRewardRate` ปัดเศษถูก
- `buildIncentiveKey` sort ฟิลด์ถูกลำดับ (สำคัญกับ `computeIncentiveId`)

### Phase 2 — Hook (0.5 วัน)

`hooks/useCreateIncentive.ts` — เดินตาม pattern `useStakePosition` เป๊ะๆ

```ts
export function useCreateIncentive(input: CreateIncentiveInput | null): {
    needsApproval: boolean
    approve: () => void
    create: () => void
    isPreparing: boolean      // useSimulateContract
    isExecuting: boolean      // useWriteContract
    isConfirming: boolean     // useWaitForTransactionReceipt
    isSuccess: boolean
    incentiveId: `0x${string}` | null   // computeIncentiveId(key)
    error: Error | null
    hash: `0x${string}` | undefined
}
```

จุดสำคัญ:

- reuse `useTokenApproval({ token, owner, spender: stakerAddress, amountToApprove })` ที่มีอยู่แล้ว — มี allowance polling ให้ด้วย
- `useSimulateContract` เปิดเมื่อ `!needsApproval && validationErrors.length === 0` เท่านั้น (simulate ที่ล้มเหลวจะทำให้ปุ่มค้าง)
- คืน `incentiveId` จาก `computeIncentiveId()` ทันทีหลัง success → เอาไป optimistic-render ก่อน indexer ตามทัน
- error ผ่าน `toastError()` จาก `lib/toast.ts`

### Phase 3 — UI (1.5 วัน)

| # | งาน | ไฟล์ |
|---|---|---|
| 3.1 | `PoolPicker` — dropdown/command จาก `fetchV3Pools` + search + แสดง TVL | `components/mining/pool-picker.tsx` |
| 3.2 | `RewardTokenInput` — reuse `TokenSelect` จาก swap + แสดง balance + ปุ่ม MAX | `components/mining/reward-token-input.tsx` |
| 3.3 | `ScheduleInput` — Start (Now / date picker) + Duration preset + custom | `components/mining/schedule-input.tsx` |
| 3.4 | `CreateFarmDialog` — ประกอบทั้งหมด + summary + ปุ่ม Approve → Create | `components/mining/create-farm-dialog.tsx` |
| 3.5 | ต่อเข้า earn page: ปุ่ม "Create Farm" ข้างหัวข้อ Mining Farms (ซ่อนถ้า `!stakerAddress`) | `app/earn/page.tsx`, `components/mining/mining-farms.tsx` |
| 3.6 | หลัง success → `queryClient.invalidateQueries()` + toast + optimistic card ("Indexing…") | `app/earn/page.tsx` |

**Error state ที่ต้องมี** (openbbq ขาด):

- ยังไม่ connect wallet → ปุ่ม Connect
- chain ไม่มี staker → disable + อธิบาย
- reward amount > balance → inline error ใต้ input
- duration เกิน `maxIncentiveDuration` → แสดง cap จริง เช่น "สูงสุด 63 วันบน chain นี้"
- start เกิน lead time → แสดง cap จริง

### Phase 4 — Manage & Refund (1 วัน)

| # | งาน | ไฟล์ |
|---|---|---|
| 4.1 | `useMyIncentives()` — filter `useIncentives()` ด้วย `refundee.toLowerCase() === address` | `hooks/useMyIncentives.ts` |
| 4.2 | `canEndIncentive(incentive, now)` — pure: `isEnded && numberOfStakes === 0 && totalRewardUnclaimed > 0` | `services/mining/incentives.ts` |
| 4.3 | `useEndIncentive()` — simulate + write `endIncentive(key)` | `hooks/useEndIncentive.ts` |
| 4.4 | `MyFarms` section บน `/earn` — การ์ดพร้อมสถานะ + ปุ่ม "End & Refund" (disable พร้อมเหตุผลว่ายังมี N stakes) | `components/mining/my-farms.tsx` |

> **หมายเหตุออกแบบ:** openbbq มีปุ่ม "Extend Program" / "Cancel Program" ในหน้า `program/page.tsx` — Uniswap V3 Staker **ไม่รองรับ extend หรือ cancel** วิธีที่ถูกคือ "สร้าง incentive ใหม่ต่อจากอันเดิม" ควรทำ UI เป็นปุ่ม **"Create follow-up farm"** ที่ prefill ค่าเดิม แทนที่จะทำปุ่ม Extend ที่ทำงานไม่ได้จริง

### Phase 5 — APR & Polish (1 วัน)

| # | งาน |
|---|---|
| 5.1 | คำนวณ APR: `(rewardPerYear × rewardPriceUsd) / stakedTvlUsd` — ต้องได้ staked TVL จาก position ที่ stake อยู่ในแต่ละ incentive (`usePoolTvl` + deposits จาก ponder) |
| 5.2 | เพิ่ม APR / Total Staked ลง `farm-card.tsx` |
| 5.3 | Sort / filter farms: Active / Upcoming / Ended / My Farms |
| 5.4 | Empty state ใหม่: "ยังไม่มี farm — สร้างอันแรกเลย" พร้อมปุ่ม |

### Phase 6 — Token Staking (roadmap ถัดไป, ยังไม่ลงมือ)

ต้องมี **ทั้ง contract และ indexer** ก่อน — ปัจจุบัน junoswap2 ไม่มี `StakingFactoryV2`

| ขั้น | งาน | ประเมิน |
|---|---|---|
| 6.1 | ตัดสินใจ: fork `StakingFactoryV2` ของ CMswap หรือใช้ MasterChef-style ที่ audit แล้ว | 1 สัปดาห์ (รวม review) |
| 6.2 | Deploy + verify บน KUB testnet → mainnet | 2-3 วัน |
| 6.3 | เพิ่ม handler `ProjectCreated` / `Deposit` / `Withdraw` ใน ponder indexer + query `fetchStakingProjects` ใน SDK | 3-4 วัน |
| 6.4 | `services/mining/create-project.ts` — validate lock modes (0/1/2), powerMultipliers, max caps | 2 วัน |
| 6.5 | UI: กลับมาใช้ wizard จริงเพราะฟิลด์เยอะ (staking token → reward → lock config → review) | 3-4 วัน |
| 6.6 | หน้า program detail: position, harvest, withdraw, lock history | 3 วัน |

**รวมประมาณ 4-5 สัปดาห์** — แนะนำให้ ship Phase 1-5 (CL) ให้ครบและมีผู้ใช้จริงก่อน แล้วค่อยตัดสินใจจาก demand

---

## 6. Timeline สรุป

| Phase | ขอบเขต | ประเมิน | ปลดล็อกอะไร |
|---|---|---|---|
| 0 | สำรวจ ABI + staker limits | 0.5 วัน | ความมั่นใจว่าไม่มี blocker |
| 1 | validation service + tests | 0.5 วัน | logic ที่ test ได้ |
| 2 | `useCreateIncentive` | 0.5 วัน | สร้าง farm ได้จาก console |
| 3 | UI + ต่อเข้าหน้า earn | 1.5 วัน | **ship ได้ — ผู้ใช้สร้าง farm เองได้** |
| 4 | My Farms + endIncentive | 1 วัน | เจ้าของ program เอาเงินคืนได้ |
| 5 | APR + polish | 1 วัน | หน้าตาแข่งกับ DEX อื่นได้ |
| | **รวม CL ครบ** | **~5 วัน** | |
| 6 | Token Staking | 4-5 สัปดาห์ | roadmap |

**MVP ที่ ship ได้เร็วสุด = Phase 0-3 (~3 วัน)** แต่ **ห้าม ship โดยไม่มี Phase 4** เพราะเจ้าของ program จะเอา reward ที่เหลือคืนไม่ได้เลย

---

## 7. Checklist ไฟล์

### สร้างใหม่

- [ ] `services/mining/create-incentive.ts`
- [ ] `services/mining/__tests__/create-incentive.test.ts`
- [ ] `hooks/useStakerLimits.ts`
- [ ] `hooks/useCreateIncentive.ts`
- [ ] `hooks/useEndIncentive.ts`
- [ ] `hooks/useMyIncentives.ts`
- [ ] `components/mining/create-farm-dialog.tsx`
- [ ] `components/mining/pool-picker.tsx`
- [ ] `components/mining/reward-token-input.tsx`
- [ ] `components/mining/schedule-input.tsx`
- [ ] `components/mining/my-farms.tsx`

### แก้ไข

- [ ] `components/mining/index.ts` — export ของใหม่
- [ ] `components/mining/mining-farms.tsx` — รับ `onCreate` prop + ปุ่ม Create
- [ ] `components/mining/farm-card.tsx` — เพิ่ม APR / Total Staked (Phase 5)
- [ ] `app/earn/page.tsx` — state ของ create dialog + My Farms section
- [ ] `services/mining/incentives.ts` — `canEndIncentive()`
- [ ] `types/earn.ts` — `CreateIncentiveInput`, `StakerLimits`, `CreateIncentiveError`

### ต้องตรวจนอก repo

- [ ] `@coshi190/juno-moneta-sdk` — ABI ครบไหม (§4.3)
- [ ] Ponder indexer — `IncentiveCreated` + latency

---

## 8. ความเสี่ยง

| ความเสี่ยง | ผลกระทบ | ทางแก้ |
|---|---|---|
| SDK ABI ไม่มี `createIncentive` | บล็อก Phase 2 | ประกาศ ABI fragment ในไฟล์ hook ก่อน (pattern เดียวกับ `SAFE_TRANSFER_FROM_ABI` ใน `useStaking.ts`) แล้วค่อย PR เข้า SDK |
| Indexer latency สูง | ผู้ใช้สร้างแล้วไม่เห็น farm | optimistic card ด้วย `computeIncentiveId()` ตาม pattern `lib/optimistic-deposits.ts` + polling 5s สัก 60s |
| RPC ของ KUB ไม่ใช่ archive node | historical read พัง (ระบุใน CLAUDE.md แล้ว) | ใช้แต่ latest state + ponder เท่านั้น อย่าอ่าน historical `eth_call` |
| ผู้ใช้ตั้ง farm ผิด (เช่น pool ที่ไม่มี liquidity) | reward ล็อกจนหมด duration | เตือนใน summary ถ้า pool liquidity = 0 + แสดง TVL ใน pool picker |
| Reward token เป็น fee-on-transfer | จำนวนที่โอนเข้าไม่เท่าที่ตั้ง | เตือนถ้าตรวจพบ หรืออย่างน้อยแสดงยอดจริงหลัง tx |
| `endIncentive` เรียกไม่ได้เพราะยังมีคน stake | เจ้าของเงินค้าง | ใน My Farms แสดงชัดว่า "รออีก N positions unstake" + จำนวนที่จะได้คืน |

---

## 9. หลักการที่ยึด

1. **ใช้ timestamp ไม่ใช่ block number** — V3 Staker ทำงานด้วย timestamp ล้วน ไม่ต้องแปลง (ตัดปัญหา block-time estimation ของ openbbq ทิ้งทั้งก้อน)
2. **`parseUnits` ตาม decimals จริง** ไม่ใช่ `parseEther` เสมอ
3. **Validate ให้หมดฝั่ง UI ก่อน simulate** — ทุก require ของ contract ต้องมี error message ที่คนอ่านรู้เรื่องคู่กัน
4. **Logic บริสุทธิ์ไปอยู่ `services/` และมี test** — ตาม CLAUDE.md, ไม่ test hook/component ตรงๆ
5. **ทุก write ต้องมีทางกลับ** — ไม่ ship create โดยไม่มี end/refund
6. **bun เท่านั้น** — ไม่ใช้ npm/yarn/pnpm
