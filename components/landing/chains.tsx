import Image from 'next/image'

const chains = [
    { name: 'Base', icon: '/chains/base.svg' },
    { name: 'Worldchain', icon: '/chains/worldchain.svg' },
    { name: 'BNB Chain', icon: '/chains/bnbchain.svg' },
    { name: 'Kub Chain', icon: '/chains/kubchain.png' },
    { name: 'JB Chain', icon: '/chains/jbchain.png' },
]

export function Chains() {
    return (
        <section className="bg-gray-900/30 py-16">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="mx-auto max-w-2xl text-center">
                    <h2 className="text-2xl font-bold sm:text-3xl">
                        Supported across all major emerging chains
                    </h2>
                    <p className="mt-4 text-gray-400">
                        Trade seamlessly across 5+ blockchain networks with more coming soon
                    </p>
                </div>
                <div className="mx-auto mt-10 grid max-w-xl grid-cols-3 gap-5 sm:grid-cols-5">
                    {chains.map((chain) => (
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
                            <span className="text-xs text-gray-400">{chain.name}</span>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
