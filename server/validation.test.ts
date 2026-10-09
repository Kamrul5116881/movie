import { describe, expect, it, vi } from 'vitest'
import {
  isAllowedProviderUrl,
  isAllowedYouTubeKey,
  isExpired,
  movieQuerySchema,
  slugSchema,
  syncRequestSchema,
  tmdbImageUrl,
} from './validation.js'
import { availabilityExpiry } from './watchmode.js'
import { buildImageUrl, selectTrailer } from './tmdb.js'
import { slugify } from './sync.js'

describe('movie query validation', () => {
  it('applies bounded pagination defaults', () => {
    expect(movieQuerySchema.parse({})).toMatchObject({ page: 1, limit: 20, sort: 'popularity' })
  })
  it('rejects unbounded page sizes', () => {
    expect(() => movieQuerySchema.parse({ limit: 1000 })).toThrow()
  })
  it('supports language, year, rating and genre filters', () => {
    expect(movieQuerySchema.parse({ language: 'hi', year: 2024, minRating: 7, genre: 'action' })).toMatchObject({
      language: 'hi',
      year: 2024,
      minRating: 7,
    })
  })
  it('rejects invalid sort and page values', () => {
    expect(() => movieQuerySchema.parse({ sort: 'hacked' })).toThrow()
    expect(() => movieQuerySchema.parse({ page: -1 })).toThrow()
  })
})

describe('trusted media helpers', () => {
  it('accepts only YouTube key-shaped identifiers', () => {
    expect(isAllowedYouTubeKey('dQw4w9WgXcQ')).toBe(true)
    expect(isAllowedYouTubeKey('https://evil.example')).toBe(false)
    expect(isAllowedYouTubeKey('short')).toBe(false)
  })
  it('builds documented TMDB image URLs', () => {
    expect(tmdbImageUrl('/abc.jpg', 'original')).toBe('https://image.tmdb.org/t/p/original/abc.jpg')
    expect(tmdbImageUrl(null)).toBeNull()
    expect(buildImageUrl('abc.jpg')).toBe('https://image.tmdb.org/t/p/w500/abc.jpg')
  })
  it('validates provider URLs as https-only', () => {
    expect(isAllowedProviderUrl('https://www.netflix.com/watch/123')).toBe(true)
    expect(isAllowedProviderUrl('http://example.com')).toBe(false)
    expect(isAllowedProviderUrl('javascript:alert(1)')).toBe(false)
  })
})

describe('trailer selection', () => {
  it('prefers official trailer over teaser', () => {
    const picked = selectTrailer([
      { key: 'dQw4w9WgXcQ', site: 'YouTube', type: 'Teaser', official: true, name: 'Teaser' },
      { key: 'eY52Zsg-KVI', site: 'YouTube', type: 'Trailer', official: true, name: 'Trailer' },
    ])
    expect(picked?.key).toBe('eY52Zsg-KVI')
  })
  it('falls back gracefully and returns null when unavailable', () => {
    expect(selectTrailer([])).toBeNull()
    expect(selectTrailer([{ key: 'bad url!!', site: 'YouTube', type: 'Trailer', official: true, name: 'x' }])).toBeNull()
  })
})

describe('slug and sync validation', () => {
  it('validates slugs and sync requests', () => {
    expect(slugSchema.parse({ slug: 'dune-part-two-123' }).slug).toContain('dune')
    expect(syncRequestSchema.parse({ type: 'upcoming', pages: 2 })).toMatchObject({ type: 'upcoming', pages: 2 })
    expect(() => syncRequestSchema.parse({ type: 'invalid' })).toThrow()
  })
  it('creates URL-safe slugs', () => {
    expect(slugify('Dune: Part Two!!')).toBe('dune-part-two')
  })
})

describe('availability cache rules', () => {
  it('expires Watchmode cache after 30 days by default', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01'))
    const expiry = availabilityExpiry(30)
    expect(expiry.toISOString()).toContain('2026-01-31')
    expect(isExpired(new Date('2025-12-01'), new Date('2026-02-01'))).toBe(true)
    expect(isExpired(null)).toBe(false)
    vi.useRealTimers()
  })
})
