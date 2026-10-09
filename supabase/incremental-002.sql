-- Cinevault incremental migration 002
-- Use this when `supabase/schema.sql` fails with: type "Role" already exists
-- It only adds tables/indexes missing from the first push. Safe to run once.
-- Run in Supabase Dashboard -> SQL Editor.

-- Enums (skip if they already exist)
DO $$ BEGIN
  CREATE TYPE "public"."Role" AS ENUM ('USER', 'ADMIN');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."JobStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCESS', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- New tables
CREATE TABLE IF NOT EXISTS "public"."Person" (
  "id" SERIAL NOT NULL,
  "tmdbId" INTEGER,
  "name" TEXT NOT NULL,
  "profilePath" TEXT,
  CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."MovieCast" (
  "id" SERIAL NOT NULL,
  "movieId" INTEGER NOT NULL,
  "personId" INTEGER NOT NULL,
  "character" TEXT,
  "job" TEXT,
  "department" TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "MovieCast_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."SyncError" (
  "id" BIGSERIAL NOT NULL,
  "jobId" BIGINT NOT NULL,
  "message" TEXT NOT NULL,
  "context" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SyncError_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."AppSetting" (
  "key" TEXT NOT NULL,
  "value" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
);

-- New indexes (IF NOT EXISTS)
CREATE UNIQUE INDEX IF NOT EXISTS "Person_tmdbId_key" ON "public"."Person"("tmdbId");
CREATE INDEX IF NOT EXISTS "MovieCast_movieId_order_idx" ON "public"."MovieCast"("movieId", "order");
CREATE UNIQUE INDEX IF NOT EXISTS "MovieCast_movieId_personId_character_key" ON "public"."MovieCast"("movieId", "personId", "character");
CREATE INDEX IF NOT EXISTS "SyncError_jobId_idx" ON "public"."SyncError"("jobId");
CREATE INDEX IF NOT EXISTS "Movie_popularity_idx" ON "public"."Movie"("popularity");
CREATE INDEX IF NOT EXISTS "AuditLog_action_idx" ON "public"."AuditLog"("action");

-- Foreign keys (drop first if re-running, then re-add)
ALTER TABLE "public"."MovieCast" DROP CONSTRAINT IF EXISTS "MovieCast_movieId_fkey";
ALTER TABLE "public"."MovieCast" ADD CONSTRAINT "MovieCast_movieId_fkey"
  FOREIGN KEY ("movieId") REFERENCES "public"."Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."MovieCast" DROP CONSTRAINT IF EXISTS "MovieCast_personId_fkey";
ALTER TABLE "public"."MovieCast" ADD CONSTRAINT "MovieCast_personId_fkey"
  FOREIGN KEY ("personId") REFERENCES "public"."Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."SyncError" DROP CONSTRAINT IF EXISTS "SyncError_jobId_fkey";
ALTER TABLE "public"."SyncError" ADD CONSTRAINT "SyncError_jobId_fkey"
  FOREIGN KEY ("jobId") REFERENCES "public"."SyncJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
