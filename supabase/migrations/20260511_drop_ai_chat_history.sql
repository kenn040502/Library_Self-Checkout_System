-- AiChatHistory was used by the old recommendations chat (StudentChat) and its
-- API routes, all removed. The live Reading Assistant uses GeneralChatHistory.
-- Drop the orphaned table.
DROP TABLE IF EXISTS "AiChatHistory";
