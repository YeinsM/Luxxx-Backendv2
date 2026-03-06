-- Migration 011: Advertisement promotion selections.
-- Stores which plan an advertisement has chosen, for how long, and the calculated price.

CREATE TABLE IF NOT EXISTS advertisement_promotions (
  id               UUID                     PRIMARY KEY DEFAULT gen_random_uuid(),
  advertisement_id UUID                     NOT NULL REFERENCES advertisements(id) ON DELETE CASCADE,
  plan_id          UUID                     NOT NULL REFERENCES promotion_plans(id),
  duration_type    VARCHAR(10)              NOT NULL CHECK (duration_type IN ('DAY','WEEK','MONTH')),
  price            DECIMAL(10,2)            NOT NULL DEFAULT 0,
  start_date       TIMESTAMP WITH TIME ZONE,
  end_date         TIMESTAMP WITH TIME ZONE,
  created_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Only one active promotion per advertisement at a time
  CONSTRAINT uq_ad_promotion UNIQUE (advertisement_id)
);

CREATE INDEX IF NOT EXISTS idx_ad_promotions_ad_id
  ON advertisement_promotions (advertisement_id);
