import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import { env } from './config.js'
import { prisma } from './db.js'
import { cookieOptions, currentUser, login, requireAdmin } from './auth.js'
import { syncCatalog, syncMovieByTmdbId } from './sync.js'
import { availabilityExpiry, getAvailability } from './watchmode.js'
import {
  adminMovieUpdateSchema,
  loginSchema,
  movieQuerySchema,
  settingSchema,
  slugSchema,
  syncRequestSchema,
} from './validation.js'

const app = Fastify({ logger: true })

await app.register(cookie)
await app.register(cors, {
  origin: (origin, callback) => {
    const allowed = new Set([env.APP_BASE_URL, 'https://hdmovies.site.je'])
    if (!origin || allowed.has(origin)) return callback(null, true)
    return callback(new Error('Origin not allowed'), false)
  },
  credentials: true,
})
await app.register(rateLimit, { max: 120, timeWindow: '1 minute' })

app.addHook('onSend', async (_request, reply) => {
  reply.header('X-Content-Type-Options', 'nosniff')
  reply.header('X-Frame-Options', 'DENY')
  reply.header('Referrer-Policy', 'strict-origin-when-cross-origin')
  reply.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
})

app.setErrorHandler((error: any, _request, reply) => {
  if (error?.validation) return reply.code(400).send({ error: 'Invalid request', details: error.message })
  if (error?.statusCode && error.statusCode < 500) return reply.code(error.statusCode).send({ error: error.message })
  app.log.error(error)
  return reply.code(500).send({ error: 'Internal server error' })
});

app.get('/', async () => ({
  name: 'Cinevault API',
  status: 'ok',
  health: '/health',
  docs: 'Use /api/movies for the catalog.',
}))

app.get('/health', async () => {
  await prisma.$queryRaw`SELECT 1`
  return { ok: true, time: new Date().toISOString() }
});

app.get('/api/movies', async (request) => {
  const query = movieQuerySchema.parse(request.query)
  const where = {
    isPublished: true,
    ...(query.language ? { originalLanguage: query.language } : {}),
    ...(query.year ? { releaseDate: { gte: new Date(`${query.year}-01-01`), lt: new Date(`${query.year + 1}-01-01`) } } : {}),
    ...(query.minRating ? { tmdbRating: { gte: query.minRating } } : {}),
    ...(query.search
      ? {
          OR: [
            { title: { contains: query.search, mode: 'insensitive' as const } },
            { originalTitle: { contains: query.search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
    ...(query.genre ? { genres: { some: { genre: { slug: query.genre } } } } : {}),
  }
  const orderBy =
    query.sort === 'rating'
      ? { tmdbRating: 'desc' as const }
      : query.sort === 'release'
        ? { releaseDate: 'desc' as const }
        : query.sort === 'title'
          ? { title: 'asc' as const }
          : { popularity: 'desc' as const }

  const [items, total] = await prisma.$transaction([
    prisma.movie.findMany({
      where,
      orderBy,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      include: { genres: { include: { genre: true } }, trailers: { take: 3 } },
    }),
    prisma.movie.count({ where }),
  ])
  return { items, page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) }
});

app.get('/api/genres', async () => {
  return prisma.genre.findMany({ orderBy: { name: 'asc' } })
});

app.get('/api/movies/:slug', async (request, reply) => {
  const { slug } = slugSchema.parse(request.params)
  const movie = await prisma.movie.findUnique({
    where: { slug },
    include: {
      genres: { include: { genre: true } },
      cast: { include: { person: true }, orderBy: { order: 'asc' }, take: 15 },
      trailers: true,
      availability: { include: { provider: true }, where: { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] } },
    },
  })
  if (!movie || !movie.isPublished) return reply.code(404).send({ error: 'Movie not found' })
  return movie
});

app.get('/api/movies/:slug/availability', async (request, reply) => {
  const { slug } = slugSchema.parse(request.params)
  const movie = await prisma.movie.findUnique({ where: { slug } })
  if (!movie || !movie.isPublished) return reply.code(404).send({ error: 'Movie not found' })
  if (!env.WATCHMODE_API_KEY) {
    return { region: 'BD', confirmed: false, message: 'Regional availability cannot be confirmed without a provider key.', items: [] }
  }
  try {
    const live = await getAvailability(movie.tmdbId, 'BD')
    for (const source of live) {
      if (!source.name || !source.web_url || !source.type) continue
      const provider = await prisma.provider.upsert({
        where: { name: source.name },
        create: { name: source.name, logoPath: source.logo_100px ?? null },
        update: { logoPath: source.logo_100px ?? null },
      })
      await prisma.availability.upsert({
        where: { movieId_providerId_region_type: { movieId: movie.id, providerId: provider.id, region: 'BD', type: source.type } },
        create: {
          movieId: movie.id,
          providerId: provider.id,
          region: 'BD',
          type: source.type,
          url: source.web_url,
          accessedAt: new Date(),
          expiresAt: availabilityExpiry(30),
        },
        update: { url: source.web_url, accessedAt: new Date(), expiresAt: availabilityExpiry(30) },
      })
    }
    return { region: 'BD', confirmed: true, accessedAt: new Date().toISOString(), items: live }
  } catch (error) {
    request.log.error(error)
    return reply.code(502).send({ error: 'Availability provider unavailable', region: 'BD', confirmed: false, items: [] })
  }
});

app.post('/api/auth/login', { config: { rateLimit: { max: 8, timeWindow: '15 minutes' } } }, async (request, reply) => {
  const body = loginSchema.parse(request.body)
  const result = await login(body.email, body.password)
  if (!result) {
    await prisma.auditLog.create({ data: { action: 'login.failed', entity: 'user', entityId: body.email } })
    return reply.code(401).send({ error: 'Invalid credentials' })
  }
  await prisma.auditLog.create({ data: { userId: result.user.id, action: 'login.success', entity: 'user', entityId: String(result.user.id) } })
  return reply.setCookie('session', result.token, cookieOptions).send({ user: result.user })
});

app.post('/api/auth/logout', async (request, reply) => {
  const user = await currentUser(request)
  if (user) await prisma.session.deleteMany({ where: { userId: user.id } })
  return reply.clearCookie('session', { path: '/' }).send({ ok: true })
});

app.get('/api/auth/me', async (request, reply) => {
  const user = await currentUser(request)
  if (!user) return reply.code(401).send({ error: 'Unauthenticated' })
  return { id: user.id, email: user.email, role: user.role }
});

app.get('/api/watchlist', async (request, reply) => {
  const user = await currentUser(request)
  if (!user) return reply.code(401).send({ error: 'Authentication required' })
  return prisma.watchlist.findMany({ where: { userId: user.id }, include: { movie: true }, orderBy: { createdAt: 'desc' } })
});

app.post('/api/watchlist/:id', async (request, reply) => {
  const user = await currentUser(request)
  if (!user) return reply.code(401).send({ error: 'Authentication required' })
  const movieId = Number((request.params as { id: string }).id)
  if (!Number.isInteger(movieId)) return reply.code(400).send({ error: 'Invalid movie id' })
  await prisma.watchlist.upsert({ where: { userId_movieId: { userId: user.id, movieId } }, create: { userId: user.id, movieId }, update: {} })
  return { ok: true }
});

app.delete('/api/watchlist/:id', async (request, reply) => {
  const user = await currentUser(request)
  if (!user) return reply.code(401).send({ error: 'Authentication required' })
  const movieId = Number((request.params as { id: string }).id)
  await prisma.watchlist.deleteMany({ where: { userId: user.id, movieId } })
  return { ok: true }
});

app.get('/api/admin/stats', async (request, reply) => {
  const admin = await requireAdmin(request, reply)
  if (!admin) return
  const [movies, failedJobs, upcoming, lastSuccess, recent] = await prisma.$transaction([
    prisma.movie.count(),
    prisma.syncJob.count({ where: { status: 'FAILED' } }),
    prisma.movie.count({ where: { releaseDate: { gt: new Date() } } }),
    prisma.syncJob.findFirst({ where: { status: 'SUCCESS' }, orderBy: { finishedAt: 'desc' } }),
    prisma.movie.findMany({ orderBy: { lastSyncedAt: 'desc' }, take: 5, select: { id: true, title: true, slug: true, lastSyncedAt: true } }),
  ])
  return {
    movies,
    failedJobs,
    upcoming,
    lastSuccessAt: lastSuccess?.finishedAt ?? null,
    recent,
    tmdbConfigured: Boolean(env.TMDB_API_KEY),
    watchmodeConfigured: Boolean(env.WATCHMODE_API_KEY),
  }
});

app.get('/api/admin/movies', async (request, reply) => {
  if (!(await requireAdmin(request, reply))) return
  const query = movieQuerySchema.parse(request.query)
  const where = query.search
    ? { OR: [{ title: { contains: query.search, mode: 'insensitive' as const } }, { slug: { contains: query.search } }] }
    : {}
  const [items, total] = await prisma.$transaction([
    prisma.movie.findMany({ where, skip: (query.page - 1) * query.limit, take: query.limit, orderBy: { updatedAt: 'desc' } }),
    prisma.movie.count({ where }),
  ])
  return { items, page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) }
});

app.patch('/api/admin/movies/:id', async (request, reply) => {
  const admin = await requireAdmin(request, reply)
  if (!admin) return
  const id = Number((request.params as { id: string }).id)
  const body = adminMovieUpdateSchema.parse(request.body)
  const movie = await prisma.movie.update({ where: { id }, data: body })
  await prisma.auditLog.create({ data: { userId: admin.id, action: 'movie.update', entity: 'movie', entityId: String(id), metadata: body as object } })
  return movie
});

app.post('/api/admin/movies/:id/resync', async (request, reply) => {
  const admin = await requireAdmin(request, reply)
  if (!admin) return
  const id = Number((request.params as { id: string }).id)
  const movie = await prisma.movie.findUnique({ where: { id } })
  if (!movie) return reply.code(404).send({ error: 'Movie not found' })
  const updated = await syncMovieByTmdbId(movie.tmdbId)
  await prisma.auditLog.create({ data: { userId: admin.id, action: 'movie.resync', entity: 'movie', entityId: String(id) } })
  return updated
});

app.post('/api/admin/sync', async (request, reply) => {
  const admin = await requireAdmin(request, reply)
  if (!admin) return
  const body = syncRequestSchema.parse((request.body as object) || {})
  syncCatalog(body.type, body.pages)
    .then(() => prisma.auditLog.create({ data: { userId: admin.id, action: 'sync.success', entity: 'sync', entityId: body.type } }))
    .catch((error) => request.log.error(error))
  await prisma.auditLog.create({ data: { userId: admin.id, action: 'sync.start', entity: 'sync', entityId: body.type } })
  return reply.code(202).send({ accepted: true, type: body.type, pages: body.pages })
});

app.get('/api/admin/jobs', async (request, reply) => {
  if (!(await requireAdmin(request, reply))) return
  return prisma.syncJob.findMany({ orderBy: { createdAt: 'desc' }, take: 50, include: { errors: { take: 10, orderBy: { createdAt: 'desc' } } } })
});

app.get('/api/admin/settings', async (request, reply) => {
  if (!(await requireAdmin(request, reply))) return
  return prisma.appSetting.findMany({ orderBy: { key: 'asc' } })
});

app.put('/api/admin/settings', async (request, reply) => {
  const admin = await requireAdmin(request, reply)
  if (!admin) return
  const body = settingSchema.parse(request.body)
  const setting = await prisma.appSetting.upsert({ where: { key: body.key }, create: { key: body.key, value: body.value }, update: { value: body.value } })
  await prisma.auditLog.create({ data: { userId: admin.id, action: 'setting.update', entity: 'setting', entityId: body.key } })
  return setting
});

const interval = setInterval(() => {
  syncCatalog('trending', 1).catch((error) => app.log.error(error))
}, env.SYNC_INTERVAL_HOURS * 60 * 60 * 1000)
interval.unref()

app.addHook('onClose', async () => {
  clearInterval(interval)
  await prisma.$disconnect()
})

app.listen({ port: env.PORT, host: '0.0.0.0' }).catch((error) => {
  app.log.error(error)
  process.exit(1)
})

// Populate an empty production catalog after the API is ready; later updates use the scheduler.
if (env.NODE_ENV === 'production') {
  setTimeout(() => syncCatalog('trending', 1).catch((error) => app.log.error(error)), 5000).unref()
}
