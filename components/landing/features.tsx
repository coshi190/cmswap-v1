'use client'

import { type FC } from 'react'
import { GitBranch, Repeat, Rocket } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { useScrollReveal } from '@/hooks/use-scroll-reveal'

interface Feature {
    name: string
    description: string
    icon: LucideIcon
    href: string
}

const features: Feature[] = [
    {
        name: 'Aggregate Swap',
        description:
            'Find the best rates across multiple DEXs with intelligent routing. Junoswap aggregates liquidity sources to get you the optimal price on every trade.',
        icon: Repeat,
        href: '/swap',
    },
    {
        name: 'Cross-Chain Bridge',
        description:
            'Seamlessly move assets between chains with one click. Fast, secure transfers powered by trusted bridge providers — no wrapping or manual steps required.',
        icon: GitBranch,
        href: '/bridge',
    },
    {
        name: 'Memecoin Launchpad',
        description:
            'Launch and discover the next memecoin on a fair-launch bonding curve. Trade early, earn points, and be part of the community from day one.',
        icon: Rocket,
        href: '/launchpad',
    },
]

/* Orthogonal "circuit rail" from Token A (40,125) to Token B (360,125): branch
   vertically at branchX with rounded 90° bends (r=10), run along laneY, mirror
   back at 400-branchX. Sweep flags flip for lanes above vs below the center line. */
function railPath(branchX: number, laneY: number): string {
    const r = 10
    const s = laneY < 125 ? -1 : 1
    const cw = s > 0 ? 1 : 0
    const ccw = s > 0 ? 0 : 1
    return [
        `M 40 125 H ${branchX - r}`,
        `A ${r} ${r} 0 0 ${cw} ${branchX} ${125 + s * r}`,
        `V ${laneY - s * r}`,
        `A ${r} ${r} 0 0 ${ccw} ${branchX + r} ${laneY}`,
        `H ${400 - branchX - r}`,
        `A ${r} ${r} 0 0 ${ccw} ${400 - branchX} ${laneY - s * r}`,
        `V ${125 + s * r}`,
        `A ${r} ${r} 0 0 ${cw} ${400 - branchX + r} 125`,
        'H 360',
    ].join(' ')
}

const swapRails = [
    { d: railPath(62, 45), delay: '0s' },
    { d: railPath(88, 85), delay: '0.15s' },
    { d: 'M 40 125 H 360', delay: '0.3s' },
    { d: railPath(88, 165), delay: '0.45s' },
    { d: railPath(62, 205), delay: '0.6s' },
]

/* DEX hops: single chip on the outer lanes, double hop on the inner lanes;
   the center lane's hop is the hub card itself */
const dexChips = [
    { x: 200, y: 45 },
    { x: 145, y: 85 },
    { x: 255, y: 85 },
    { x: 145, y: 165 },
    { x: 255, y: 165 },
    { x: 200, y: 205 },
]

function DexChip({ x, y }: { x: number; y: number }) {
    const warm = y > 125
    return (
        <g>
            <rect
                x={x - 5.5}
                y={y - 5.5}
                width="11"
                height="11"
                rx="3"
                className={cn('fill-card', warm ? 'stroke-[#FF914D]/35' : 'stroke-primary/35')}
                strokeWidth="1"
            />
            <circle
                cx={x}
                cy={y}
                r="1.75"
                className={warm ? 'fill-[#FF914D]/70' : 'fill-primary/70'}
            />
        </g>
    )
}

function SwapVisual() {
    return (
        <div className="absolute inset-0 overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_50%,hsl(0_100%_60%_/_0.12),transparent)]" />

            <div className="absolute -top-8 -left-8 h-40 w-40 rounded-full bg-primary/5 blur-2xl" />
            <div className="absolute -bottom-12 -right-8 h-48 w-48 rounded-full bg-primary/8 blur-3xl" />
            <div className="absolute top-1/4 right-1/4 h-24 w-24 rounded-full bg-[#FF914D]/5 blur-xl" />

            <svg
                className="absolute inset-0 h-full w-full"
                viewBox="0 0 400 250"
                preserveAspectRatio="xMidYMid slice"
                fill="none"
                aria-hidden="true"
            >
                <defs>
                    <linearGradient id="route-grad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="hsl(0 100% 60%)" />
                        <stop offset="100%" stopColor="#FF914D" />
                    </linearGradient>
                    <pattern id="swap-dots" width="20" height="20" patternUnits="userSpaceOnUse">
                        <circle cx="1.5" cy="1.5" r="1" className="fill-primary/15" />
                    </pattern>
                    <radialGradient id="swap-grid-fade" cx="0.5" cy="0.5" r="0.65">
                        <stop offset="0%" stopColor="white" stopOpacity="0.8" />
                        <stop offset="65%" stopColor="white" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="white" stopOpacity="0" />
                    </radialGradient>
                    <mask id="swap-grid-mask">
                        <rect width="400" height="250" fill="url(#swap-grid-fade)" />
                    </mask>
                    <clipPath id="swap-token-a">
                        <circle cx="40" cy="125" r="8.5" />
                    </clipPath>
                    <clipPath id="swap-token-b">
                        <circle cx="360" cy="125" r="8.5" />
                    </clipPath>
                </defs>

                <rect width="400" height="250" fill="url(#swap-dots)" mask="url(#swap-grid-mask)" />

                {swapRails.map((rail, i) => (
                    <g key={rail.d} className={i !== 0 ? 'animate-route-dim' : undefined}>
                        <path d={rail.d} className="stroke-primary/15" strokeWidth="1" />
                        <path
                            d={rail.d}
                            pathLength={1}
                            stroke="url(#route-grad)"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeDasharray="0.15 1.15"
                            className="animate-route-pulse"
                            style={{ animationDelay: rail.delay }}
                        />
                    </g>
                ))}

                {dexChips.map((chip) => (
                    <DexChip key={`${chip.x}-${chip.y}`} x={chip.x} y={chip.y} />
                ))}

                {/* Winning rail — whole path + its chip light up after the probe phase */}
                <g className="animate-route-best">
                    <path
                        d={swapRails[0]!.d}
                        stroke="url(#route-grad)"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                    />
                    <rect
                        x="194.5"
                        y="39.5"
                        width="11"
                        height="11"
                        rx="3"
                        className="fill-card"
                        stroke="url(#route-grad)"
                        strokeWidth="1.5"
                    />
                    <circle cx="200" cy="45" r="2" fill="hsl(0 100% 60%)" />
                </g>

                {/* Token endpoints — KUB in, USDC out */}
                <circle cx="40" cy="125" r="16" className="fill-primary/10" />
                <circle
                    cx="40"
                    cy="125"
                    r="11"
                    className="fill-card stroke-primary/40"
                    strokeWidth="1.5"
                />
                <image
                    href="/tokens/kub.png"
                    x="31.5"
                    y="116.5"
                    width="17"
                    height="17"
                    clipPath="url(#swap-token-a)"
                />
                <circle cx="360" cy="125" r="16" className="fill-[#FF914D]/10" />
                <circle
                    cx="360"
                    cy="125"
                    r="11"
                    className="fill-card stroke-[#FF914D]/50"
                    strokeWidth="1.5"
                />
                <image
                    href="/tokens/usdc.png"
                    x="351.5"
                    y="116.5"
                    width="17"
                    height="17"
                    clipPath="url(#swap-token-b)"
                />
            </svg>

            {/* flex-centered wrapper — the badge keyframe owns `transform`, so no translate utilities here */}
            <div className="absolute inset-x-0 top-[4%] flex justify-center">
                <div className="animate-best-badge rounded-full border border-primary/30 bg-card px-2.5 py-0.5 text-[10px] font-medium text-primary">
                    Best price
                </div>
            </div>

            <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-[#FF914D] p-0.5">
                    <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-card">
                        <Repeat
                            className="h-10 w-10 animate-spin text-primary"
                            style={{ animationDuration: '8s' }}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}

function BridgeVisual() {
    return (
        <div className="absolute inset-0 overflow-hidden">
            <div className="absolute inset-y-[35%] left-0 right-0 h-[30%] bg-gradient-to-r from-primary/5 via-primary/10 to-[#FF914D]/5" />

            <div className="absolute left-[10%] top-[25%] flex h-[50%] w-[18%] flex-col items-center justify-center gap-2 rounded-xl border border-border/30 bg-muted/30">
                <div className="h-8 w-8 rounded-full border border-border/30 bg-muted-foreground/10" />
                <div className="h-1.5 w-10 rounded bg-muted-foreground/10" />
                <div className="h-1 w-8 rounded bg-muted-foreground/5" />
            </div>
            <div className="absolute right-[10%] top-[25%] flex h-[50%] w-[18%] flex-col items-center justify-center gap-2 rounded-xl border border-border/30 bg-muted/30">
                <div className="h-8 w-8 rounded-full border border-border/30 bg-muted-foreground/10" />
                <div className="h-1.5 w-10 rounded bg-muted-foreground/10" />
                <div className="h-1 w-8 rounded bg-muted-foreground/5" />
            </div>

            <div className="absolute top-[50%] left-[28%] h-0 w-[44%] -translate-y-1/2 border-t border-dashed border-primary/20" />

            <div className="absolute top-[50%] h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-gradient-to-r from-primary to-[#FF914D] animate-transfer-dot" />

            <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-[#FF914D] p-0.5">
                    <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-card">
                        <GitBranch className="h-10 w-10 text-primary" />
                    </div>
                </div>
            </div>
        </div>
    )
}

function LaunchpadVisual() {
    return (
        <div className="absolute inset-0 overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_70%_at_50%_80%,hsl(0_100%_60%_/_0.15),transparent)]" />

            <div className="absolute top-[20%] left-[30%] h-3 w-3 rotate-45 bg-[#FFD700]/30" />
            <div className="absolute top-[15%] right-[25%] h-2 w-2 rotate-45 bg-[#FFD700]/20 animate-pulse" />
            <div className="absolute bottom-[35%] left-[20%] h-2.5 w-2.5 rotate-45 bg-[#FFD700]/25" />
            <div className="absolute top-[40%] right-[15%] h-2 w-2 rotate-45 bg-[#FFD700]/20 animate-pulse" />
            <div className="absolute bottom-[25%] right-[35%] h-1.5 w-1.5 rotate-45 bg-[#FFD700]/30" />

            <div className="absolute bottom-[30%] left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5">
                <div className="h-1 w-10 rounded-full bg-primary/25" />
                <div className="h-1 w-7 rounded-full bg-primary/15" />
                <div className="h-1 w-4 rounded-full bg-primary/5" />
            </div>

            <div className="absolute inset-0 flex items-center justify-center -translate-y-3">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-[#FF914D] p-0.5">
                    <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-card">
                        <Rocket className="h-10 w-10 text-primary" />
                    </div>
                </div>
            </div>
        </div>
    )
}

const visualComponents: FC[] = [SwapVisual, BridgeVisual, LaunchpadVisual]

function FeatureRow({ feature, index }: { feature: Feature; index: number }) {
    const isReversed = index % 2 !== 0
    const Visual = visualComponents[index]!
    const reveal = useScrollReveal({ threshold: 0.15 })

    return (
        <div
            ref={reveal.ref as React.RefObject<HTMLDivElement>}
            data-reveal
            className={cn(
                'group grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-16',
                'animate-reveal-up',
                reveal.isVisible && 'is-visible'
            )}
        >
            <div
                className={cn(
                    'relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-border/30 bg-card transition-colors duration-500 shadow-[0_0_60px_-15px_hsl(0_100%_60%_/_0.15)]',
                    isReversed && 'lg:order-last',
                    'animate-reveal-scale'
                )}
            >
                <Visual />
            </div>

            <div className={cn('flex flex-col gap-4', isReversed && 'lg:order-first')}>
                <h3 className="text-2xl font-bold tracking-tight sm:text-3xl">{feature.name}</h3>
                <p className="text-md leading-relaxed text-muted-foreground">
                    {feature.description}
                </p>
            </div>
        </div>
    )
}

export function Features() {
    const headingReveal = useScrollReveal({ threshold: 0.2 })

    return (
        <section className="py-20 sm:py-32">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="mx-auto max-w-2xl text-center">
                    <h2
                        ref={headingReveal.ref as React.RefObject<HTMLHeadingElement>}
                        data-reveal
                        className={cn(
                            'mt-2 text-3xl font-bold tracking-tight sm:text-4xl',
                            'animate-reveal-up',
                            headingReveal.isVisible && 'is-visible'
                        )}
                    >
                        One platform for swapping, bridging, and launching across every chain.
                    </h2>
                </div>

                {/* Feature rows — each observed independently */}
                <div className="mt-16 space-y-20 sm:mt-20 lg:space-y-32">
                    {features.map((feature, index) => (
                        <FeatureRow key={feature.name} feature={feature} index={index} />
                    ))}
                </div>
            </div>
        </section>
    )
}
