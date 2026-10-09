import { prisma } from './db.js'
import { selectTrailer, tmdb, type TmdbDetails, type TmdbMovie } from './tmdb.js'

export const slugify = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 180) || 'movie'

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let cursor = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++
      results[index] = await fn(items[index], index)
    }
  })
  await Promise.all(workers)
  return results
}

export async function upsertMovie(item: TmdbMovie | TmdbDetails) {
  const details: TmdbDetails = 'runtime' in item && 'genres' in item ? (item as TmdbDetails) : await tmdb.details(item.id)

  const movie = await prisma.movie.upsert({
    where: { tmdbId: details.id },
    create: {
      tmdbId: details.id,
      slug: `${slugify(details.title)}-${details.id}`,
      title: details.title,
      originalTitle: details.original_title,
      originalLanguage: details.original_language,
      overview: details.overview,
      releaseDate: details.release_date ? new Date(details.release_date) : null,
      runtimeMinutes: details.runtime ?? null,
      posterPath: details.poster_path ?? null,
      backdropPath: details.backdrop_path ?? null,
      tmdbRating: details.vote_average ?? null,
      tmdbVoteCount: details.vote_count ?? null,
      popularity: details.popularity ?? null,
      adultContent: details.adult || false,
      lastSyncedAt: new Date(),
    },
    update: {
      title: details.title,
      originalTitle: details.original_title,
      originalLanguage: details.original_language,
      overview: details.overview,
      releaseDate: details.release_date ? new Date(details.release_date) : null,
      runtimeMinutes: details.runtime ?? null,
      posterPath: details.poster_path ?? null,
      backdropPath: details.backdrop_path ?? null,
      tmdbRating: details.vote_average ?? null,
      tmdbVoteCount: details.vote_count ?? null,
      popularity: details.popularity ?? null,
      lastSyncedAt: new Date(),
    },
  })

  if (details.genres) {
    for (const genre of details.genres) {
      const record = await prisma.genre.upsert({
        where: { tmdbId: genre.id },
        create: { tmdbId: genre.id, name: genre.name, slug: slugify(genre.name) },
        update: { name: genre.name },
      })
      await prisma.movieGenre.upsert({
        where: { movieId_genreId: { movieId: movie.id, genreId: record.id } },
        create: { movieId: movie.id, genreId: record.id },
        update: {},
      })
    }
  }

  const trailer = selectTrailer(details.videos?.results || [])
  if (trailer) {
    await prisma.trailer.upsert({
      where: { movieId_provider_videoKey: { movieId: movie.id, provider: 'YouTube', videoKey: trailer.key } },
      create: {
        movieId: movie.id,
        provider: 'YouTube',
        videoKey: trailer.key,
        name: trailer.name,
        type: trailer.type,
        official: trailer.official,
        publishedAt: trailer.published_at ? new Date(trailer.published_at) : null,
      },
      update: { name: trailer.name, type: trailer.type, official: trailer.official },
    })
  }

  try {
    const credits = await tmdb.credits(details.id)
    const topCast = credits.cast.slice(0, 15)
    for (const [index, member] of topCast.entries()) {
      const person = await prisma.person.upsert({
        where: { tmdbId: member.id },
        create: { tmdbId: member.id, name: member.name, profilePath: member.profile_path ?? null },
        update: { name: member.name, profilePath: member.profile_path ?? null },
      })
      await prisma.movieCast.upsert({
        where: { movieId_personId_character: { movieId: movie.id, personId: person.id, character: member.character || '' } },
        create: { movieId: movie.id, personId: person.id, character: member.character, order: member.order ?? index },
        update: { order: member.order ?? index },
      })
    }
  } catch {
    // Credits are enrichment-only; movie upsert already succeeded.
  }

  return movie
}

export type SyncType = 'trending' | 'popular' | 'now_playing' | 'upcoming' | 'top_rated'

async function fetchPage(type: SyncType, page: number) {
  switch (type) {
    case 'popular':
      return tmdb.popular(page)
    case 'now_playing':
      return tmdb.nowPlaying(page)
    case 'upcoming':
      return tmdb.upcoming(page)
    case 'top_rated':
      return tmdb.topRated(page)
    default:
      return tmdb.trending(page)
  }
}

export async function syncCatalog(type: SyncType = 'trending', pages = 1) {
  const job = await prisma.syncJob.create({ data: { type, status: 'RUNNING', startedAt: new Date() } })
  let processed = 0
  try {
    for (let page = 1; page <= Math.min(Math.max(pages, 1), 5); page++) {
      const data = await fetchPage(type, page)
      await mapWithConcurrency(data.results, 3, async (item) => {
        try {
          await upsertMovie(item)
          processed++
        } catch (error) {
          await prisma.syncError.create({
            data: {
              jobId: job.id,
              message: error instanceof Error ? error.message.slice(0, 1000) : 'Unknown sync error',
              context: `tmdb:${item.id}`,
            },
          })
        }
      })
      if (page >= data.total_pages) break
    }
    return await prisma.syncJob.update({
      where: { id: job.id },
      data: { status: 'SUCCESS', processedCount: processed, finishedAt: new Date() },
    })
  } catch (error) {
    await prisma.syncJob.update({
      where: { id: job.id },
      data: {
        status: 'FAILED',
        processedCount: processed,
        errorMessage: error instanceof Error ? error.message.slice(0, 2000) : 'Unknown error',
        finishedAt: new Date(),
      },
    })
    throw error
  }
}

export async function syncMovieByTmdbId(tmdbId: number) {
  return upsertMovie(await tmdb.details(tmdbId))
}
