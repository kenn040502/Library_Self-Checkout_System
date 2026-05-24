# Smart Reading Assistant — Design

**Date:** 2026-05-07
**Branch:** `Kelvin-v3.2.2-Debug`
**Status:** Approved (brainstorm), pending implementation plan

## Problem

The reading assistant at `app/api/reading-assistant/route.ts` currently calls `classifyAndExtract(message)` with no conversation history and no user context. As a result:

- **Multi-turn breakdowns**: when the user replies "history!" after a "Japan books" thread, Gemini receives only the word "history" with no prior context, classifies it as a greeting, and returns a generic "Hello there!" reply.
- **No personalization**: the system prompt is already written to use faculty / interests / recently borrowed books, but the route never passes a `UserContext`, so those instructions are dead.
- **No loan-state awareness**: the AI cannot answer "what's due tomorrow?" or factor active loans into recommendations.
- **No post-return follow-ups**: the AI cannot say "since you just returned *Sapiens*, try *Homo Deus*" because nothing distinguishes recently returned loans from older history.

The chat history is being persisted to `GeneralChatHistory` (lines 73-75 of the route) but never read back.

## Goals

A library chat assistant that feels coherent and personal:

1. **Conversation memory** — remembers the last several turns of the current chat.
2. **Profile-aware** — uses faculty, saved interests, and recently borrowed books to ground recommendations.
3. **Loan-state-aware** — can answer "what's due tomorrow?", "any overdue?", and avoids recommending books the student already has out.
4. **Post-return follow-ups** — proactively suggests adjacent reads when the student just finished a book.

## Non-goals

- Tool / function calling. The data volumes are tiny (≤3 active loans per `STUDENT_LOAN_LIMIT`, ≤10 chat turns, small profile object). One enriched prompt is simpler, faster, and cheaper than tool-call roundtrips.
- Cross-session memory beyond the last N turns (no long-term preference summarization).
- Schema changes. No new tables, no new columns.
- Semantic / RAG search over the book catalog. Existing `fetchBooks` keyword search stays.

## Approach

**Single enriched prompt + multi-turn `contents`.** Per request, fetch user profile, active loans, recently returned loans, and the last 10 chat turns from Supabase in parallel. Send to Gemini as one call: enriched `systemInstruction` + `contents` array containing prior turns plus the new user message. No retries, no fallback paths.

Two alternatives were considered and rejected:

- **Tool calling** — overkill for ~5 KB of context per request and triples Gemini roundtrips per turn.
- **Heuristic injection** (only inject loan data when message mentions "due/loan") — brittle. Misses cause hallucinated dates.

## Architecture

```
client → POST /api/reading-assistant { message }
  ├─ parallel Supabase fetch:
  │     fetchUserContext(userId)
  │     fetchActiveLoans(undefined, userId)
  │     fetchRecentlyReturnedLoans(userId, 14)   // NEW helper
  │     last 10 GeneralChatHistory rows for userId
  ├─ classifyAndExtract(message, userContext, history, activeLoans, recentReturns)
  │     → buildUnifiedSystemPrompt(...)
  │     → callGemini(systemInstruction, contents=[...history, newUserMsg])
  │     → { intent, reply, searchTerms, followUpQuestion }
  ├─ if intent in {find_books, both}: fetchBooks(searchTerms[0])
  ├─ persist user msg + assistant reply to GeneralChatHistory
  └─ return { reply, intent, books? }
```

No new endpoints, no new tables.

## Components

### `app/lib/recommendations/ai.ts`

Already partially edited (history pass-through wiring). Remaining work:

1. **`callGemini`** ✅ already updated:
   - Use Gemini's `systemInstruction` field for the system prompt.
   - Build `contents` as multi-turn (`user` / `model` roles) when `options.history` is provided.

2. **`callAI`** ✅ already updated to forward `history`.

3. **`classifyAndExtract`** — current edit accepts `history`. Extend further to accept `activeLoans: Loan[]` and `recentReturns: Loan[]`. Bump `maxTokens` from 512 → 1024 (already done in current edit).

4. **`buildUnifiedSystemPrompt(userContext?, activeLoans?, recentReturns?)`** — extend to render two new prompt sections: "Currently borrowed (with due dates)" and "Recently returned (last 14 days)". Inject today's date.

5. **`AiIntent`** — add `'loan_status'` to the union and to the intent allowlist at the validation site (currently `ai.ts:432`).

### `app/api/reading-assistant/route.ts`

- Parallel-fetch profile, active loans, recent returns, last 10 chat turns.
- Pass all four into `classifyAndExtract`.
- Skip the `fetchBooks` block when `intent === 'loan_status'`.
- Persist + return as today.

### `app/lib/supabase/queries.ts`

Add one helper:

```ts
export async function fetchRecentlyReturnedLoans(
  userId: string,
  withinDays: number,
  limit?: number
): Promise<Loan[]>
```

Filter: `user_id = userId AND status = 'returned' AND returned_at >= now() - withinDays`. Order by `returned_at DESC`, limit 5 by default.

### `GeneralChatHistory` history fetch

Inline in the route (no new helper needed): `select('sender, text').eq('user_id', userId).order('created_at', { ascending: false }).limit(10)` then reverse to oldest-first.

## Prompt structure (additions to existing `buildUnifiedSystemPrompt`)

```
Today's date: 2026-05-07.

Currently borrowed:
- "Sapiens" — due 2026-05-09 (in 2 days)
- "Norwegian Wood" — due 2026-05-15 (in 8 days)
- [OVERDUE] "1Q84" — was due 2026-05-01 (6 days ago)

Recently returned (last 14 days):
- "The Hobbit" — returned 2026-05-04
- "Brief History of Time" — returned 2026-04-28
```

Updated rules:

- New intent `loan_status` for questions about due dates / overdue / current borrows. Do not invent dates; only use the data above.
- For book recommendations: never recommend a book in "Currently borrowed". Prefer adjacent topics to "Recently returned" books — name the connection in the reply ("Since you just finished *X*, here's something on *Y*").
- Use today's date for "due tomorrow", "due soon" reasoning.

## Data flow & contracts

`classifyAndExtract` new signature:

```ts
export async function classifyAndExtract(
  message: string,
  userContext?: UserContext,
  history?: ChatTurn[],          // already added
  activeLoans?: Loan[],          // NEW
  recentReturns?: Loan[],        // NEW
): Promise<AiResult>
```

`AiIntent`:

```ts
export type AiIntent =
  | 'find_books'
  | 'answer'
  | 'both'
  | 'greeting'
  | 'off_topic'
  | 'loan_status';   // NEW
```

History shape passed in by the route:

```ts
type ChatTurn = { sender: 'user' | 'assistant'; text: string };  // already exported
```

History limit: last 10 rows from `GeneralChatHistory`, oldest-first when handed to Gemini. The mapping converts `assistant` → `model` (Gemini's term).

## Error handling

- **Profile / loans / returns / history fetches** are wrapped individually. Any one failure logs a warning and falls back to passing `undefined` for that input. The chat still works, just with less context — better than a 500.
- **Gemini failures** unchanged (`AiUnavailableError` → 500).
- **Empty active loans / returns** are normal — the prompt simply omits the corresponding section.

## Token / cost

- System prompt with full context ≈ 1.5–2 k tokens.
- Last 10 turns ≈ 500–1 000 tokens.
- `maxOutputTokens: 1024`.
- Target model: `gemini-2.5-flash-lite` ($0.10 / 1 M input, $0.40 / 1 M output, no thinking by default). Per-request cost is sub-cent.

## Testing

- **Unit (`__tests__/`)**:
  - `buildUnifiedSystemPrompt` snapshot with active loans + recent returns populated.
  - `classifyAndExtract` mock-`callGemini` test confirming `history` turns appear in the request body with correct alternating roles, and that `systemInstruction` carries the system prompt (not embedded in `contents`).
  - `fetchRecentlyReturnedLoans` time-window query (Supabase mocked).
- **Manual**:
  - "Recommend me a book" → "Japan related" → "history!" — assistant returns Japan-history books, not a generic greeting.
  - "What's due tomorrow?" with seeded loans — assistant lists titles + correct dates.
  - User just returned book X → "recommend something" — assistant references X and suggests adjacent topic.

## Out of scope (deferred / YAGNI)

- Cross-session preference summarization.
- Tool calling.
- Vector / semantic book search.
- New intents beyond `loan_status` (e.g., separate `recommend_followup`).
- Caching profile + loans across requests (premature; add only if Supabase load becomes an issue).
