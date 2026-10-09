-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "public"."JobStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "public"."Movie" (
    "id" SERIAL NOT NULL,
    "tmdbId" INTEGER NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "originalTitle" TEXT,
    "originalLanguage" TEXT,
    "overview" TEXT,
    "releaseDate" TIMESTAMP(3),
    "runtimeMinutes" INTEGER,
    "posterPath" TEXT,
    "backdropPath" TEXT,
    "tmdbRating" DOUBLE PRECISION,
    "tmdbVoteCount" INTEGER,
    "popularity" DOUBLE PRECISION,
    "adultContent" BOOLEAN NOT NULL DEFAULT false,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "metadataSource" TEXT NOT NULL DEFAULT 'tmdb',
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Movie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Genre" (
    "id" SERIAL NOT NULL,
    "tmdbId" INTEGER,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "Genre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MovieGenre" (
    "movieId" INTEGER NOT NULL,
    "genreId" INTEGER NOT NULL,

    CONSTRAINT "MovieGenre_pkey" PRIMARY KEY ("movieId","genreId")
);

-- CreateTable
CREATE TABLE "public"."Person" (
    "id" SERIAL NOT NULL,
    "tmdbId" INTEGER,
    "name" TEXT NOT NULL,
    "profilePath" TEXT,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MovieCast" (
    "id" SERIAL NOT NULL,
    "movieId" INTEGER NOT NULL,
    "personId" INTEGER NOT NULL,
    "character" TEXT,
    "job" TEXT,
    "department" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MovieCast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Trailer" (
    "id" SERIAL NOT NULL,
    "movieId" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "videoKey" TEXT NOT NULL,
    "name" TEXT,
    "type" TEXT,
    "official" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "Trailer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Provider" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "logoPath" TEXT,

    CONSTRAINT "Provider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Availability" (
    "id" SERIAL NOT NULL,
    "movieId" INTEGER NOT NULL,
    "providerId" INTEGER NOT NULL,
    "region" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT,
    "accessedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "Availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Session" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Watchlist" (
    "userId" INTEGER NOT NULL,
    "movieId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Watchlist_pkey" PRIMARY KEY ("userId","movieId")
);

-- CreateTable
CREATE TABLE "public"."SyncJob" (
    "id" BIGSERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "status" "public"."JobStatus" NOT NULL DEFAULT 'QUEUED',
    "processedCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SyncError" (
    "id" BIGSERIAL NOT NULL,
    "jobId" BIGINT NOT NULL,
    "message" TEXT NOT NULL,
    "context" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncError_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AppSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" BIGSERIAL NOT NULL,
    "userId" INTEGER,
    "action" TEXT NOT NULL,
    "entity" TEXT,
    "entityId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Movie_tmdbId_key" ON "public"."Movie"("tmdbId");

-- CreateIndex
CREATE UNIQUE INDEX "Movie_slug_key" ON "public"."Movie"("slug");

-- CreateIndex
CREATE INDEX "Movie_originalLanguage_idx" ON "public"."Movie"("originalLanguage");

-- CreateIndex
CREATE INDEX "Movie_releaseDate_idx" ON "public"."Movie"("releaseDate");

-- CreateIndex
CREATE INDEX "Movie_tmdbRating_idx" ON "public"."Movie"("tmdbRating");

-- CreateIndex
CREATE INDEX "Movie_isPublished_idx" ON "public"."Movie"("isPublished");

-- CreateIndex
CREATE INDEX "Movie_popularity_idx" ON "public"."Movie"("popularity");

-- CreateIndex
CREATE UNIQUE INDEX "Genre_tmdbId_key" ON "public"."Genre"("tmdbId");

-- CreateIndex
CREATE UNIQUE INDEX "Genre_name_key" ON "public"."Genre"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Genre_slug_key" ON "public"."Genre"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Person_tmdbId_key" ON "public"."Person"("tmdbId");

-- CreateIndex
CREATE INDEX "MovieCast_movieId_order_idx" ON "public"."MovieCast"("movieId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "MovieCast_movieId_personId_character_key" ON "public"."MovieCast"("movieId", "personId", "character");

-- CreateIndex
CREATE UNIQUE INDEX "Trailer_movieId_provider_videoKey_key" ON "public"."Trailer"("movieId", "provider", "videoKey");

-- CreateIndex
CREATE UNIQUE INDEX "Provider_name_key" ON "public"."Provider"("name");

-- CreateIndex
CREATE INDEX "Availability_movieId_region_idx" ON "public"."Availability"("movieId", "region");

-- CreateIndex
CREATE UNIQUE INDEX "Availability_movieId_providerId_region_type_key" ON "public"."Availability"("movieId", "providerId", "region", "type");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "public"."Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "public"."Session"("expiresAt");

-- CreateIndex
CREATE INDEX "SyncJob_status_type_idx" ON "public"."SyncJob"("status", "type");

-- CreateIndex
CREATE INDEX "SyncError_jobId_idx" ON "public"."SyncError"("jobId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "public"."AuditLog"("action");

-- AddForeignKey
ALTER TABLE "public"."MovieGenre" ADD CONSTRAINT "MovieGenre_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "public"."Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MovieGenre" ADD CONSTRAINT "MovieGenre_genreId_fkey" FOREIGN KEY ("genreId") REFERENCES "public"."Genre"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MovieCast" ADD CONSTRAINT "MovieCast_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "public"."Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MovieCast" ADD CONSTRAINT "MovieCast_personId_fkey" FOREIGN KEY ("personId") REFERENCES "public"."Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Trailer" ADD CONSTRAINT "Trailer_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "public"."Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Availability" ADD CONSTRAINT "Availability_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "public"."Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Availability" ADD CONSTRAINT "Availability_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "public"."Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Watchlist" ADD CONSTRAINT "Watchlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Watchlist" ADD CONSTRAINT "Watchlist_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "public"."Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SyncError" ADD CONSTRAINT "SyncError_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "public"."SyncJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

