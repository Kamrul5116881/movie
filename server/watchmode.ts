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

  const key = encodeURIComponent(env.WATCHMODE_API_KEY)
  const searchResponse = await fetch(
    `https://api.watchmode.com/v1/search/?apiKey=${key}&search_field=tmdb_movie_id&search_value=${encodeURIComponent(tmdbId)}`,
    { signal: AbortSignal.timeout(10000) },
  )
  if (searchResponse.status === 429) throw new Error('Watchmode rate limit exceeded')
  if (!searchResponse.ok) throw new Error(`Watchmode title lookup failed: ${searchResponse.status}`)
  const searchData = (await searchResponse.json()) as {
    title_results?: { id?: number; tmdb_id?: number; tmdb_movie_id?: number }[]
    results?: { id?: number; tmdb_id?: number; tmdb_movie_id?: number }[]
  }
  const match = [...(searchData.title_results || []), ...(searchData.results || [])].find((title) => title.tmdb_movie_id === tmdbId || title.tmdb_id === tmdbId)
  if (!match?.id) return []

  const response = await fetch(
    `https://api.watchmode.com/v1/title/${match.id}/sources/?apiKey=${key}&regions=${encodeURIComponent(region)}`,
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
