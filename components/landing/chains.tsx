import Image from 'next/image'

const liveChains = [
    { name: 'KUB Testnet', icon: '/chains/kubchain.png' },
    { name: 'JB Chain', icon: '/chains/jbchain.png' },
]

const comingSoonChains = [
    { name: 'Base', icon: '/chains/base.svg' },
    { name: 'Worldchain', icon: '/chains/worldchain.svg' },
    { name: 'BNB Chain', icon: '/chains/bnbchain.svg' },
    { name: 'KUB Chain', icon: '/chains/kubchain.png' },
]

export function Chains() {
    return (
        <section className="bg-gray-900/30 py-16">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="mx-auto max-w-2xl text-center">
                    <h2 className="text-2xl font-bold sm:text-3xl">Multi-Chain Support</h2>
                    <p className="mt-4 text-gray-400">Live on 2 chains, with 4 more coming soon</p>
                </div>

                {/* Live Now Section */}
                <div className="mx-auto mt-10">
                    <div className="mb-4 text-center">
                        <span className="inline-flex items-center rounded-full bg-primary/20 px-3 py-1 text-sm font-medium text-primary">
                            <span className="mr-2 h-2 w-2 animate-pulse rounded-full bg-primary" />
                            Live Now
                        </span>
                    </div>
                    <div className="mx-auto grid max-w-xl grid-cols-2 gap-5">
                        {liveChains.map((chain) => (
                            <div key={chain.name} className="flex flex-col items-center gap-2">
                                <div className="h-12 w-12 flex items-center justify-center shadow-lg">
                                    <Image
                                        src={chain.icon}
                                        alt={chain.name}
                                        width={32}
                                        height={32}
                                        className="h-8 w-8"
                                    />
                                </div>
                                <span className="text-xs text-gray-300">{chain.name}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Coming Soon Section */}
                <div className="mx-auto mt-10">
                    <div className="mb-4 text-center">
                        <span className="inline-flex items-center rounded-full bg-yellow-500/20 px-3 py-1 text-sm font-medium text-yellow-500">
                            Coming Soon
                        </span>
                    </div>
                    <div className="mx-auto grid max-w-xl grid-cols-2 gap-5 sm:grid-cols-4">
                        {comingSoonChains.map((chain) => (
                            <div key={chain.name} className="flex flex-col items-center gap-2">
                                <div className="h-12 w-12 flex items-center justify-center shadow-lg opacity-60">
                                    <Image
                                        src={chain.icon}
                                        alt={chain.name}
                                        width={32}
                                        height={32}
                                        className="h-8 w-8"
                                    />
                                </div>
                                <span className="text-xs text-gray-500">{chain.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    )
}
