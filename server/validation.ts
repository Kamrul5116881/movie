import { z } from 'zod'

export const movieQuerySchema = z.object({
  page: z.coerce.number().int().positive().max(500).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  search: z.string().trim().max(120).optional(),
  language: z.enum(['hi', 'bn', 'en']).or(z.string().max(12)).optional(),
  genre: z.string().trim().max(120).optional(),
  year: z.coerce.number().int().min(1880).max(2100).optional(),
  minRating: z.coerce.number().min(0).max(10).optional(),
  sort: z.enum(['popularity', 'rating', 'release', 'title']).default('popularity'),
})

export const slugSchema = z.object({ slug: z.string().min(1).max(240) })
export const syncRequestSchema = z.object({
  type: z.enum(['trending', 'popular', 'now_playing', 'upcoming', 'top_rated']).default('trending'),
  pages: z.coerce.number().int().min(1).max(5).default(1),
})
export const loginSchema = z.object({
  email: z.string().email().max(190),
  password: z.string().min(12).max(200),
})
export const adminMovieUpdateSchema = z.object({
  isPublished: z.boolean().optional(),
  overview: z.string().max(2000).optional(),
})
export const settingSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.string().max(5000).nullable(),
})

export const isAllowedYouTubeKey = (key: string) => /^[A-Za-z0-9_-]{11}$/.test(key)

export const tmdbImageUrl = (path: string | null | undefined, size = 'w500') => {
  if (!path) return null
  const clean = path.startsWith('/') ? path : `/${path}`
  return `https://image.tmdb.org/t/p/${size}${clean}`
}

export const ALLOWED_AVAILABILITY_TYPES = ['sub', 'rent', 'buy', 'free'] as const

export function isAllowedProviderUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' && parsed.hostname.length > 3 && !parsed.hostname.includes('localhost')
  } catch {
    return false
  }
}

export function isExpired(expiresAt: Date | null | undefined, now = new Date()): boolean {
  if (!expiresAt) return false
  return expiresAt.getTime() <= now.getTime()
}
