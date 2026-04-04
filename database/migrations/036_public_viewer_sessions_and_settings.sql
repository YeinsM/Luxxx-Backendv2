-- Migration 036: public viewer presence tracking + viewer simulation settings.

CREATE TABLE IF NOT EXISTS public_viewer_sessions (
  session_id VARCHAR(120) PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  current_path VARCHAR(255),
  is_authenticated BOOLEAN NOT NULL DEFAULT FALSE,
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_public_viewer_sessions_expires_at
  ON public_viewer_sessions (expires_at);

CREATE INDEX IF NOT EXISTS idx_public_viewer_sessions_user_id
  ON public_viewer_sessions (user_id)
  WHERE user_id IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'update_public_viewer_sessions_updated_at'
  ) THEN
    CREATE TRIGGER update_public_viewer_sessions_updated_at
      BEFORE UPDATE ON public_viewer_sessions
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

INSERT INTO admin_settings (key, value, updated_at)
VALUES
  ('viewer_simulation_range_max', '50', NOW()),
  ('viewer_simulation_started_at', CURRENT_DATE::text, NOW())
ON CONFLICT (key) DO NOTHING;