-- Add metadata JSONB column to store book recommendations alongside assistant messages.
ALTER TABLE "GeneralChatHistory"
  ADD COLUMN IF NOT EXISTS metadata JSONB;
