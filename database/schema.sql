-- Cinevault MySQL schema for InfinityFree/phpMyAdmin.
-- Import this file into if0_43131965_movie.
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS movies (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tmdb_id INT UNSIGNED NULL UNIQUE,
  slug VARCHAR(220) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  original_title VARCHAR(255) NULL,
  original_language VARCHAR(12) NULL,
  overview TEXT NULL,
  release_date DATE NULL,
  runtime_minutes SMALLINT UNSIGNED NULL,
  poster_path VARCHAR(255) NULL,
  backdrop_path VARCHAR(255) NULL,
  tmdb_rating DECIMAL(3,1) NULL,
  tmdb_vote_count INT UNSIGNED NULL,
  popularity DECIMAL(12,3) NULL,
  adult_content TINYINT(1) NOT NULL DEFAULT 0,
  is_published TINYINT(1) NOT NULL DEFAULT 1,
  metadata_source VARCHAR(32) NOT NULL DEFAULT 'tmdb',
  last_synced_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_movies_language (original_language),
  INDEX idx_movies_release_date (release_date),
  INDEX idx_movies_rating (tmdb_rating),
  INDEX idx_movies_published (is_published)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS genres (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tmdb_id INT UNSIGNED NULL UNIQUE,
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(120) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS movie_genres (
  movie_id INT UNSIGNED NOT NULL,
  genre_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (movie_id, genre_id),
  FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE,
  FOREIGN KEY (genre_id) REFERENCES genres(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS trailers (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  movie_id INT UNSIGNED NOT NULL,
  provider VARCHAR(32) NOT NULL,
  video_key VARCHAR(128) NOT NULL,
  name VARCHAR(255) NULL,
  trailer_type VARCHAR(32) NULL,
  official TINYINT(1) NOT NULL DEFAULT 0,
  published_at DATETIME NULL,
  UNIQUE KEY uq_movie_video (movie_id, provider, video_key),
  FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('user','admin') NOT NULL DEFAULT 'user',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS watchlists (
  user_id INT UNSIGNED NOT NULL,
  movie_id INT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, movie_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sync_jobs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  job_type VARCHAR(64) NOT NULL,
  status ENUM('queued','running','success','failed') NOT NULL DEFAULT 'queued',
  processed_count INT UNSIGNED NOT NULL DEFAULT 0,
  error_message TEXT NULL,
  started_at DATETIME NULL,
  finished_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sync_jobs_status (status),
  INDEX idx_sync_jobs_type (job_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS application_settings (
  setting_key VARCHAR(100) PRIMARY KEY,
  setting_value TEXT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
