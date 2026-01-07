import Link from 'next/link'
import { ArrowRight, Bitcoin } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function CTA() {
    return (
        <section className="py-20 sm:py-32">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary to-emerald-500 px-6 py-20 sm:px-12 sm:py-24 lg:px-16">
                    <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_120%,rgba(0,0,0,0.3),transparent)]"></div>
                    <Bitcoin className="absolute top-10 right-10 h-20 w-20 text-white/10" />
                    <Bitcoin className="absolute bottom-10 left-10 h-16 w-16 text-white/10" />
                    <div className="mx-auto max-w-2xl text-center">
                        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                            Ready to start trading?
                        </h2>
                        <p className="mt-6 text-lg text-white/90">
                            Join thousands of users getting the best rates on CMswap. No
                            registration required - just connect your wallet.
                        </p>
                        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
                            <Link href="/swap">
                                <Button
                                    size="xl"
                                    variant="secondary"
                                    className="group w-full sm:w-auto"
                                >
                                    Launch App
                                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                                </Button>
                            </Link>
                            <Button size="xl" variant="outline" className="w-full sm:w-auto">
                                Read Docs
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
