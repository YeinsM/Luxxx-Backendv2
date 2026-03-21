-- 017_conversations_and_review_constraint.sql
-- Adds conversations table for 1-to-1 chat and unique review constraint

-- ─────────────────────────────────────────────────────────────
-- CONVERSATIONS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_a_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  participant_b_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  advertisement_id   UUID REFERENCES advertisements(id) ON DELETE SET NULL,
  last_message_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Enforce one conversation per pair (order-independent enforced in app logic)
  CONSTRAINT conversations_participants_unique UNIQUE (participant_a_id, participant_b_id)
);

CREATE INDEX IF NOT EXISTS idx_conversations_participant_a  ON conversations(participant_a_id);
CREATE INDEX IF NOT EXISTS idx_conversations_participant_b  ON conversations(participant_b_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message   ON conversations(last_message_at DESC);

-- ─────────────────────────────────────────────────────────────
-- LINK MESSAGES → CONVERSATIONS
-- ─────────────────────────────────────────────────────────────
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);

-- ─────────────────────────────────────────────────────────────
-- REVIEW: 1 review per member per advertisement (MVP rule)
-- ─────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'reviews_author_ad_unique'
  ) THEN
    ALTER TABLE reviews
      ADD CONSTRAINT reviews_author_ad_unique UNIQUE (author_id, advertisement_id);
  END IF;
END $$;
