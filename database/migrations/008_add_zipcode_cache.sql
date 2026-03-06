-- Migration 008: Add zipcode_cache table
-- Stores postal-code → cities lookups to avoid redundant external API calls.
-- Before querying zipcodebase, the backend checks here first.

CREATE TABLE IF NOT EXISTS zipcode_cache (
  id           UUID                     PRIMARY KEY DEFAULT gen_random_uuid(),
  zip_code     VARCHAR(20)              NOT NULL,
  country_code VARCHAR(5)               NOT NULL,
  cities       TEXT[]                   NOT NULL,
  created_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_zipcode_cache UNIQUE (zip_code, country_code)
);

-- Fast lookup by the composite key used at query time
CREATE INDEX IF NOT EXISTS idx_zipcode_cache_lookup
  ON zipcode_cache (zip_code, country_code);
