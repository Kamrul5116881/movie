import { env } from './config.js'
import { isAllowedYouTubeKey } from './validation.js'

const base = 'https://api.themoviedb.org/3'
const TIMEOUT_MS = 10000
const MAX_RETRIES = 3

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function request<T>(path: string, params: Record<string, string | number> = {}, attempt = 0): Promise<T> {
  const url = new URL(`${base}${path}`)
  url.searchParams.set('api_key', env.TMDB_API_KEY)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value))

  const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) }).catch(async (error) => {
    if (attempt < MAX_RETRIES) {
      await sleep(500 * 2 ** attempt)
      return request<Response>(path, params, attempt + 1) as unknown as Response
    }
    throw error
  })

  // When retried via recursion above, response may already be parsed JSON; handle both
  const res = response as unknown as Response
  if (res && typeof (res as Response).status === 'number') {
    if (res.status === 429) {
      const retryAfter = Number(res.headers.get('retry-after') || '2')
      if (attempt < MAX_RETRIES) {
        await sleep(Math.min(retryAfter * 1000, 10000) + 500 * attempt)
        return request<T>(path, params, attempt + 1)
      }
      throw new Error(`TMDB rate limit exceeded for ${path}`)
    }
    if (res.status >= 500 && attempt < MAX_RETRIES) {
      await sleep(500 * 2 ** attempt)
      return request<T>(path, params, attempt + 1)
    }
    if (!res.ok) throw new Error(`TMDB request failed: ${res.status} ${path}`)
    return (await res.json()) as T
  }
  return res as unknown as T
}

export type TmdbMovie = {
  id: number
  title: string
  original_title?: string
  original_language?: string
  overview?: string
  release_date?: string
  poster_path?: string | null
  backdrop_path?: string | null
  vote_average?: number
  vote_count?: number
  popularity?: number
  adult?: boolean
  genre_ids?: number[]
}

export type TmdbVideo = {
  key: string
  site: string
  type: string
  official: boolean
  name: string
  published_at?: string
}

export type TmdbDetails = TmdbMovie & {
  runtime?: number
  genres?: { id: number; name: string }[]
  videos?: { results: TmdbVideo[] }
}

export type TmdbCredits = {
  cast: { id: number; name: string; character?: string; order?: number; profile_path?: string | null }[]
  crew: { id: number; name: string; job?: string; department?: string; profile_path?: string | null }[]
}

export type TmdbGenre = { id: number; name: string }
export type TmdbPaginated<T> = { page: number; results: T[]; total_pages: number; total_results: number }
export type TmdbConfig = { images: { secure_base_url: string; poster_sizes: string[]; backdrop_sizes: string[] } }

export const LANGUAGE_FILTERS = {
  hindi: { with_original_language: 'hi' },
  bengali: { with_original_language: 'bn' },
  english: { with_original_language: 'en' },
} as const

export const tmdb = {
  trending: (page = 1) => request<TmdbPaginated<TmdbMovie>>('/trending/movie/week', { page }),
  popular: (page = 1, region = 'IN') => request<TmdbPaginated<TmdbMovie>>('/movie/popular', { page, region }),
  nowPlaying: (page = 1, region = 'IN') => request<TmdbPaginated<TmdbMovie>>('/movie/now_playing', { page, region }),
  upcoming: (page = 1, region = 'IN') => request<TmdbPaginated<TmdbMovie>>('/movie/upcoming', { page, region }),
  topRated: (page = 1, region = 'IN') => request<TmdbPaginated<TmdbMovie>>('/movie/top_rated', { page, region }),
  details: (id: number) => request<TmdbDetails>(`/movie/${id}`, { append_to_response: 'videos' }),
  credits: (id: number) => request<TmdbCredits>(`/movie/${id}/credits`),
  genres: () => request<{ genres: TmdbGenre[] }>('/genre/movie/list'),
  search: (query: string, page = 1) => request<TmdbPaginated<TmdbMovie>>('/search/movie', { query, page, include_adult: 'false' }),
  discover: (filters: Record<string, string | number> = {}, page = 1) =>
    request<TmdbPaginated<TmdbMovie>>('/discover/movie', { sort_by: 'popularity.desc', include_adult: 'false', page, ...filters }),
  videos: (id: number) => request<{ results: TmdbVideo[] }>(`/movie/${id}/videos`),
  recommendations: (id: number, page = 1) => request<TmdbPaginated<TmdbMovie>>(`/movie/${id}/recommendations`, { page }),
  similar: (id: number, page = 1) => request<TmdbPaginated<TmdbMovie>>(`/movie/${id}/similar`, { page }),
  configuration: () => request<TmdbConfig>('/configuration'),
}

export function selectTrailer(videos: TmdbVideo[] = []): TmdbVideo | null {
  const youtube = videos.filter((v) => v.site === 'YouTube' && isAllowedYouTubeKey(v.key))
  if (youtube.length === 0) return null
  return (
    youtube.find((v) => v.type === 'Trailer' && v.official) ||
    youtube.find((v) => v.type === 'Trailer') ||
    youtube.find((v) => v.type === 'Teaser' && v.official) ||
    youtube.find((v) => v.type === 'Teaser') ||
    youtube[0]
  )
}

export function buildImageUrl(path: string | null | undefined, size = 'w500'): string | null {
  if (!path) return null
  const clean = path.startsWith('/') ? path : `/${path}`
  return `https://image.tmdb.org/t/p/${size}${clean}`
}

export { isAllowedYouTubeKey }
