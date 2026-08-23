-- Jagiris Kutumbam: private 1-to-1 chat schema
-- Safe to run manually on Supabase SQL editor (idempotent where noted).

-- Link family tree profiles to app login accounts
ALTER TABLE family_members
  ADD COLUMN IF NOT EXISTS linked_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_family_members_linked_user
  ON family_members (linked_user_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_family_members_one_link_per_user
  ON family_members (family_id, linked_user_id)
  WHERE linked_user_id IS NOT NULL;

-- Conversations (1-to-1 within a family workspace)
CREATE TABLE IF NOT EXISTS conversations (
  id SERIAL PRIMARY KEY,
  family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT
);

CREATE INDEX IF NOT EXISTS idx_conversations_family_last
  ON conversations (family_id, last_message_at DESC NULLS LAST);

-- Participants (exactly two users per direct conversation)
CREATE TABLE IF NOT EXISTS conversation_members (
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ,
  PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_conversation_members_user
  ON conversation_members (user_id);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
  ON messages (conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_sender
  ON messages (sender_user_id);

ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE conversation_members ADD COLUMN IF NOT EXISTS cleared_at TIMESTAMPTZ;
