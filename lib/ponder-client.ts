import { createPonderClient } from '@junoswap/sdk'

export type { PonderPageInfo } from '@junoswap/sdk'
export { isPonderError } from '@junoswap/sdk'

// The browser always goes through the Next proxy route (app/api/ponder/graphql), which holds
// the server-only PONDER_URL. Resolved lazily — window doesn't exist during SSR.
const client = createPonderClient(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    return `${origin}/api/ponder/graphql`
})

export const ponderRequest = client.request
export const fetchAllPages = client.fetchAllPages
