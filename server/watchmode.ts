import { env } from './config.js'
import { ALLOWED_AVAILABILITY_TYPES, isAllowedProviderUrl } from './validation.js'

export type WatchmodeSource = {
  name?: string
  type?: string
  web_url?: string
  logo_100px?: string
  region: string
}

export async function getAvailability(tmdbId: number, region = 'BD'): Promise<WatchmodeSource[]> {
  // Watchmode is optional. Without a key the catalog remains fully functional.
  if (!env.WATCHMODE_API_KEY) return []

  const response = await fetch(
    `https://api.watchmode.com/v1/title/${tmdbId}/sources/?apiKey=${encodeURIComponent(env.WATCHMODE_API_KEY)}&regions=${encodeURIComponent(region)}`,
    { signal: AbortSignal.timeout(10000) },
  )
  if (response.status === 429) throw new Error('Watchmode rate limit exceeded')
  if (!response.ok) throw new Error(`Watchmode request failed: ${response.status}`)

  const data = (await response.json()) as {
    sources?: { name?: string; type?: string; web_url?: string; logo_100px?: string }[]
  }

  return (data.sources || [])
    .filter(
      (source) =>
        source.web_url &&
        isAllowedProviderUrl(source.web_url) &&
        (ALLOWED_AVAILABILITY_TYPES as readonly string[]).includes(source.type || ''),
    )
    .map((source) => ({ ...source, region }))
}

export function availabilityExpiry(days = 30): Date {
  // Respect Watchmode free-plan 30-day cache guidance.
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000)
}
