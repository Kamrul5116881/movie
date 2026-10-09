# Cinevault — Premium Cinematic Movie Discovery

Full-stack movie discovery platform: React + Vite frontend, Fastify + TypeScript API, PostgreSQL + Prisma, TMDB + optional Watchmode.

## What is implemented

- PostgreSQL/Prisma schema: movies (unique TMDB ID), genres, cast/people, trailers, providers, availability, users, sessions, watchlists, sync jobs + errors, app settings, audit logs
- TMDB service: trending, popular, now-playing, upcoming, top-rated, details, credits, genres, search, discover, videos, recommendations, similar, configuration — with timeouts, retries, 429/Retry-After handling
- Trailer selection: official trailer first, then trailer, then official teaser, else “Trailer not available”. YouTube keys validated (`/^[A-Za-z0-9_-]{11}$/`).
- Watchmode adapter (optional): region-aware (default BD), https-only URL validation, 30-day cache expiry, graceful disabled state without key. Never fabricates Netflix/Prime links.
- Sync service: upserts (no duplicates), bounded concurrency (3), paginated catalog sync, per-item error logging, job status/timing/counts, manual + scheduled runs
- Auth: Argon2id, HTTP-only SameSite=lax cookies, secure in production, rate-limited login, server-side admin checks, audit logs, no default password
- APIs: `/health`, `/api/movies` (paginated, search/language/genre/year/rating/sort), `/api/genres`, `/api/movies/:slug`, `/api/movies/:slug/availability`, `/api/auth/*`, `/api/watchlist`, `/api/admin/stats|movies|sync|jobs|settings`
- Frontend routes: `/`, `/movies`, `/trending`, `/popular`, `/upcoming`, `/top-rated`, `/language/hindi|bengali|english`, `/genres/:slug`, `/movie/:slug`, `/search?q=`, `/watchlist`, `/about`, `/privacy`, `/terms`, `/admin`
- Admin dashboard: login, stats, movie publish/hide + resync, sync trigger, job history + errors, settings view
- Tests: 12 Vitest tests with mocked data (pagination bounds, filters, YouTube validation, image URLs, trailer selection, slugs, availability expiry). No live keys required.

## Local setup

```bash
npm install
cp .env.example .env
# fill DATABASE_URL, DIRECT_URL, TMDB_API_KEY, SESSION_SECRET (32+ chars)
npm run db:generate
npm run db:migrate -- --name init
npm run server   # API on :3000
npm run dev      # UI on :5173
```

Admin bootstrap (no default password):

```bash
npm run admin:create -- admin@example.com "choose-a-strong-12-char-password"
```

Open `/admin` and sign in.

## Supabase (project tqwpwjghkidhkplhgxan)

- `DATABASE_URL` = pooler URL (runtime, port 6543, `?pgbouncer=true`)
- `DIRECT_URL` = direct URL (migrations, port 5432)
- Copy from Supabase Dashboard → Project Settings → Database → Connection string
- If direct host is IPv6-unreachable locally: run `npm run db:script:file`, paste `supabase/schema.sql` into SQL Editor → Run. File is PostgreSQL — do NOT use `database/schema.sql` (MySQL-only).
- Publishable key not needed for current custom auth. Never commit DB password or service-role key.

## Env vars

See `.env.example`: `DATABASE_URL`, `DIRECT_URL`, `TMDB_API_KEY`, `WATCHMODE_API_KEY` (optional), `YOUTUBE_API_KEY` (optional), `SESSION_SECRET`, `APP_BASE_URL`, `PORT`, `SYNC_INTERVAL_HOURS`, `NODE_ENV`, `VITE_API_URL`, Supabase URL/ref placeholders.

Startup fails fast with non-sensitive errors if required vars are missing (tests use safe defaults).

## Verification

```bash
npm run db:generate
npm run server:check
npm run test
npm run lint
npm run build
```

Current: Prisma generate ✓, tsc ✓, 12 tests ✓, eslint ✓ (1 warning), vite build ✓.

## Deploy

- Frontend (InfinityFree): `npm run build`, upload `dist/*` to `htdocs/` via FTP. SPA `.htaccess` included. Cannot run Node/Prisma there.
- Backend (Render free web service): connect the repo, then set Build Command to `npm install && npm run db:generate && npm run build:server` and Start Command to `npm start`. Run `npm run db:deploy` once against Supabase (`DIRECT_URL`) to apply migrations, or paste `supabase/schema.sql` / `supabase/incremental-002.sql` in SQL Editor. Set env (`DATABASE_URL` pooler, `DIRECT_URL`, `TMDB_API_KEY`, 32+ char `SESSION_SECRET`, `APP_BASE_URL`, `NODE_ENV=production`), then set frontend `VITE_API_URL` to the Render URL and rebuild. `npm run server` (tsx dev) also works where devDependencies are installed, but `npm start` (compiled `dist-server/`) is the production path.
- Render Blueprint: `render.yaml` defines the free Node web service, `/health` check, production commands, and secret variables. Use **New → Blueprint** in Render and select this repository; fill the `sync: false` values in the dashboard.
- `database/schema.sql` is legacy MySQL for InfinityFree phpMyAdmin. `supabase/schema.sql` is current PostgreSQL.

## Legal

Discovery only. No full-length hosting, no scraping. Only authorized trailers/links. “This product uses the TMDB API but is not endorsed or certified by TMDB.” Verify TMDB/YouTube/Watchmode terms before commercial use. Rotate any exposed secrets.
