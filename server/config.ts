import { z } from 'zod'

const isTest = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true'

const schema = z.object({
  DATABASE_URL: z.string().min(1).default(isTest ? 'postgresql://test:test@localhost:5432/test' : ''),
  TMDB_API_KEY: z.string().min(1).default(isTest ? 'test-tmdb-key' : ''),
  WATCHMODE_API_KEY: z.string().optional(),
  SESSION_SECRET: z.string().min(32).default(isTest ? 'test-session-secret-0123456789abcdef' : ''),
  APP_BASE_URL: z.string().url().default('http://localhost:5173'),
  PORT: z.coerce.number().default(3000),
  SYNC_INTERVAL_HOURS: z.coerce.number().positive().default(6),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
})

export const env = schema.parse({
  ...process.env,
  APP_BASE_URL: process.env.APP_BASE_URL || 'http://localhost:5173',
  PORT: process.env.PORT || 3000,
  SYNC_INTERVAL_HOURS: process.env.SYNC_INTERVAL_HOURS || 6,
  NODE_ENV: (process.env.NODE_ENV as 'development' | 'test' | 'production') || (process.env.VITEST ? 'test' : 'development'),
})
