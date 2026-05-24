-- General chat history (mirrors AiChatHistory minus 'recommendations').
-- Used by ChatAssistant on /dashboard/help (Chat mode) for cross-session
-- conversation persistence. AiChatHistory is kept separate for the
-- recommendations-specific 'recommendations' JSONB column.

CREATE TABLE IF NOT EXISTS "GeneralChatHistory" (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
  message_id  TEXT,
  sender      TEXT        NOT NULL CHECK (sender IN ('user', 'assistant')),
  text        TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_general_chat_history_user_created
  ON "GeneralChatHistory"(user_id, created_at);
