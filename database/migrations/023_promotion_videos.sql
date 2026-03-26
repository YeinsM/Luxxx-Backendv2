CREATE TABLE IF NOT EXISTS promotion_videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(160) NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  public_id VARCHAR(255) NOT NULL UNIQUE,
  thumbnail_url TEXT,
  width INTEGER,
  height INTEGER,
  format VARCHAR(20),
  duration DECIMAL(10,2),
  is_public BOOLEAN NOT NULL DEFAULT false,
  view_count INTEGER NOT NULL DEFAULT 0,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS promotion_video_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  promotion_video_id UUID NOT NULL REFERENCES promotion_videos(id) ON DELETE CASCADE,
  viewer_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  is_anonymous BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promotion_videos_user_id
  ON promotion_videos(user_id);

CREATE INDEX IF NOT EXISTS idx_promotion_videos_is_public
  ON promotion_videos(is_public);

CREATE INDEX IF NOT EXISTS idx_promotion_videos_created_at
  ON promotion_videos(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_promotion_videos_published_at
  ON promotion_videos(published_at DESC);

CREATE INDEX IF NOT EXISTS idx_promotion_video_views_video_id
  ON promotion_video_views(promotion_video_id);

CREATE INDEX IF NOT EXISTS idx_promotion_video_views_created_at
  ON promotion_video_views(created_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_promotion_videos_updated_at') THEN
    CREATE TRIGGER update_promotion_videos_updated_at
    BEFORE UPDATE ON promotion_videos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
