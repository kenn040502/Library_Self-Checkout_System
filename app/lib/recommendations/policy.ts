export const READING_ASSISTANT_HISTORY_LIMIT = 10;
export const READING_ASSISTANT_RETURNS_WINDOW_DAYS = 14;

/** Hard cap on a single user message sent to the Reading Assistant (characters, after trim). */
export const READING_ASSISTANT_MAX_MESSAGE_CHARS = 2000;

/** Combined character budget for conversation history sent to the model. Oldest turns are dropped first when exceeded. */
export const READING_ASSISTANT_HISTORY_CHAR_BUDGET = 8000;
