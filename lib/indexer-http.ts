export function ponderBaseUrl(): string | null {
    return process.env.NEXT_PUBLIC_PONDER_URL ?? null
}

export async function getJson<T>(url: string): Promise<T> {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) })
    if (!res.ok) throw new Error(`indexer responded ${res.status}`)
    return (await res.json()) as T
}
