import { searchYouTubeCourses } from '@/app/lib/youtube/service';
import type { UserContext } from '@/app/lib/recommendations/user-context';
import { tokenizeInterests, expandAcronyms } from '@/app/lib/recommendations/recommender';
import type { Loan } from '@/app/lib/supabase/types';
import { READING_ASSISTANT_RETURNS_WINDOW_DAYS } from '@/app/lib/recommendations/policy';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AiIntent = 'find_books' | 'answer' | 'both' | 'greeting' | 'off_topic' | 'loan_status';

export type ChatTurn = { sender: 'user' | 'assistant'; text: string };

export type AiResult = {
  intent: AiIntent;
  reply: string;
  searchTerms: string[];
  followUpQuestion: string;
};

export type YouTubeCourseSuggestion = {
  title: string;
  query: string;
  url?: string | null;
};

// ─── Faculty → Book Category mapping ─────────────────────────────────────────

const FACULTY_CATEGORY_MAP: Record<string, string> = {
  'information technology': 'Computer Science',
  'computer science': 'Computer Science',
  'computing': 'Computer Science',
  'software engineering': 'Computer Science',
  'it': 'Computer Science',
  'business': 'Business',
  'business administration': 'Business',
  'management': 'Business',
  'accounting': 'Business',
  'finance': 'Business',
  'marketing': 'Business',
  'engineering': 'Engineering',
  'electrical engineering': 'Engineering',
  'mechanical engineering': 'Engineering',
  'civil engineering': 'Engineering',
  'art': 'Art & Design',
  'design': 'Art & Design',
  'art & design': 'Art & Design',
  'multimedia': 'Art & Design',
  'creative media': 'Art & Design',
};

export function facultyToCategory(faculty: string | null): string | null {
  if (!faculty) return null;
  return FACULTY_CATEGORY_MAP[faculty.toLowerCase()] ?? null;
}

// ─── Personalized request detection ──────────────────────────────────────────

const PERSONALIZED_PATTERNS = [
  /\bbased\s+on\s+(my|the)\b/i,
  /\bfor\s+me\b/i,
  /\bpersonali[sz]ed?\b/i,
  /\bmy\s+(faculty|interest|interests|profile|history|borrow|borrows|borrowing|reading|loans?|preferences?)\b/i,
  /\b(use|using)\s+my\b/i,
  /\brecommend\s+(me\s+)?(some\s+)?books?\s+(for|to)\s+me\b/i,
];

export const isPersonalizedRequest = (message: string): boolean =>
  PERSONALIZED_PATTERNS.some((p) => p.test(message));

const ASSIGNMENT_PATTERNS = [
  /\b(assignment|coursework|homework|essay|research\s+paper|thesis|dissertation)\b/i,
  /\bfor\s+my\s+(class|course|subject|module|assignment|project)\b/i,
  /\bacademic\s+(assignment|work|project)\b/i,
];

const AVAILABLE_PATTERNS = [
  /\bwhat'?s?\s+(books?\s+)?available\b/i,
  /\bavailable\s+(now|right\s+now|to\s+borrow|today)\b/i,
  /\bcan\s+i\s+borrow\s+(now|today|right\s+now)\b/i,
  /\bin\s+stock\b/i,
  /\bbooks?\s+i\s+can\s+borrow\s+(now|right\s+now|today)\b/i,
];

const INTERESTING_PATTERNS = [
  /\bsomething\s+(interesting|cool|fun|new|good|nice)\b/i,
  /\bsurprise\s+me\b/i,
  /\b(suggest|recommend)\s+something\b/i,
];

export type PresetIntent = 'personalized' | 'assignment' | 'available' | 'interesting';

export const detectPresetIntent = (message: string): PresetIntent | null => {
  if (ASSIGNMENT_PATTERNS.some((p) => p.test(message))) return 'assignment';
  if (AVAILABLE_PATTERNS.some((p) => p.test(message))) return 'available';
  if (INTERESTING_PATTERNS.some((p) => p.test(message))) return 'interesting';
  if (isPersonalizedRequest(message)) return 'personalized';
  return null;
};

export type PersonalizedSuggestion = {
  searchTerms: string[];
  reply: string;
  hasContext: boolean;
  kind: PresetIntent;
};

export const buildPersonalizedSuggestion = (
  userContext: UserContext,
  kind: PresetIntent = 'personalized',
): PersonalizedSuggestion => {
  const searchTerms: string[] = [];
  const reasonParts: string[] = [];

  if (userContext.faculty) {
    const cat = facultyToCategory(userContext.faculty);
    if (cat) searchTerms.push(cat.toLowerCase());
    reasonParts.push(`your faculty in ${userContext.faculty}`);
  }

  if (userContext.savedInterests?.length) {
    const interests = userContext.savedInterests.slice(0, 4);
    searchTerms.push(...interests);
    reasonParts.push(`your saved interests (${interests.slice(0, 3).join(', ')})`);
  }

  if (userContext.historyTags?.length) {
    const histTags = userContext.historyTags.slice(0, 4);
    searchTerms.push(...histTags);
    if (!userContext.savedInterests?.length) {
      reasonParts.push(`topics from your past loans (${histTags.slice(0, 3).join(', ')})`);
    }
  }

  if (userContext.recentBorrowedBooks?.length) {
    const top2 = userContext.recentBorrowedBooks.slice(0, 2);
    const titles = top2.map((b) => `"${b.title}"`).join(' and ');
    reasonParts.push(`your recent ${top2.length > 1 ? 'borrows' : 'borrow'} of ${titles}`);
  }

  const dedupedTerms = [...new Set(searchTerms.map((t) => t.toLowerCase().trim()).filter(Boolean))].slice(0, 6);

  if (reasonParts.length === 0) {
    if (kind === 'available') {
      return {
        kind,
        searchTerms: [],
        reply: 'Here are some books currently available to borrow from our catalog.',
        hasContext: false,
      };
    }
    const noCtxReply =
      kind === 'assignment'
        ? 'I do not see any faculty or coursework info on your profile yet. Could you tell me what subject your assignment is on so I can suggest relevant books?'
        : kind === 'interesting'
          ? 'I do not have any reading history for you yet. Could you tell me what topics or subjects catch your interest?'
          : 'I do not have any borrow history or profile info for you yet. Could you tell me what topics or subjects you are interested in so I can suggest something?';
    return { kind, searchTerms: [], reply: noCtxReply, hasContext: false };
  }

  const reasonText = reasonParts.join(' and ');
  let reply: string;
  switch (kind) {
    case 'assignment':
      reply = `For your academic assignment, based on ${reasonText}, here are books that should support your coursework.`;
      break;
    case 'available':
      reply = `Here are currently available books that match ${reasonText}.`;
      break;
    case 'interesting':
      reply = `Here is something you might enjoy reading, picked based on ${reasonText}.`;
      break;
    case 'personalized':
    default:
      reply = `Based on ${reasonText}, here are some books you might enjoy.`;
      break;
  }

  return { kind, searchTerms: dedupedTerms, reply, hasContext: true };
};

// ─── Env ──────────────────────────────────────────────────────────────────────

let geminiDisabled = false;

const getEnv = () => ({
  geminiBaseUrl:
    process.env.GEMINI_API_BASE_URL?.trim() ||
    'https://generativelanguage.googleapis.com/v1beta',
  geminiApiKey: process.env.GEMINI_API_KEY?.trim(),
  geminiModel: process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash',
});

// ─── JSON helpers ─────────────────────────────────────────────────────────────

const stripMarkdown = (text: string): string =>
  text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/#{1,6}\s+/g, '')
    .replace(/`{1,3}[^`]*`{1,3}/g, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const extractJson = (raw: string): string => {
  const stripped = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const match = stripped.match(/\{[\s\S]*\}/);
  return match ? match[0] : stripped;
};

// ─── Build student context string for prompts ─────────────────────────────────

const buildStudentContext = (userContext?: UserContext): string => {
  if (!userContext) return '';

  const parts: string[] = [];

  if (userContext.faculty) parts.push(`Faculty: ${userContext.faculty}`);
  if (userContext.department) parts.push(`Department: ${userContext.department}`);

  if (userContext.intakeYear) {
    const studyYear = new Date().getFullYear() - userContext.intakeYear + 1;
    const clampedYear = Math.min(Math.max(studyYear, 1), 4);
    parts.push(`Study year: Year ${clampedYear}`);
  }

  const allInterests = [
    ...new Set([...userContext.historyTags, ...userContext.savedInterests]),
  ].slice(0, 12);
  if (allInterests.length) parts.push(`Known interests: ${allInterests.join(', ')}`);

  const recent = userContext.recentBorrowedBooks ?? [];
  if (recent.length) {
    const lines = recent.slice(0, 8).map((b) => {
      const author = b.author ? ` — ${b.author}` : '';
      return `- "${b.title}"${author}`;
    });
    parts.push(`Recently borrowed books (most recent first):\n${lines.join('\n')}`);
  }

  return parts.length ? `\n\nStudent profile:\n${parts.join('\n')}` : '';
};

// ─── System prompts ───────────────────────────────────────────────────────────

const formatDateYMD = (d: Date): string =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;

const renderActiveLoans = (loans: Loan[], today: Date): string => {
  if (!loans.length) return '';
  const todayMs = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const lines = loans.map((l) => {
    const due = new Date(l.dueAt);
    const dueMs = Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate());
    const days = Math.round((dueMs - todayMs) / 86_400_000);
    const title = l.book?.title ?? '(unknown title)';
    const dateStr = formatDateYMD(due);
    if (days < 0) return `- [OVERDUE] "${title}" — was due ${dateStr} (${Math.abs(days)} days ago)`;
    if (days === 0) return `- "${title}" — due today (${dateStr})`;
    if (days === 1) return `- "${title}" — due tomorrow (${dateStr})`;
    return `- "${title}" — due ${dateStr} (in ${days} days)`;
  });
  return `\n\nCurrently borrowed:\n${lines.join('\n')}`;
};

const renderRecentReturns = (returns: Loan[], windowDays: number): string => {
  if (!returns.length) return '';
  const lines = returns.map((l) => {
    const title = l.book?.title ?? '(unknown title)';
    const date = l.returnedAt ? formatDateYMD(new Date(l.returnedAt)) : '(unknown date)';
    return `- "${title}" — returned ${date}`;
  });
  return `\n\nRecently returned (last ${windowDays} days):\n${lines.join('\n')}`;
};

export function buildUnifiedSystemPrompt(
  userContext?: UserContext,
  activeLoans: Loan[] = [],
  recentReturns: Loan[] = [],
  today: Date = new Date(),
): string {
  const studentCtx = buildStudentContext(userContext);
  const todayStr = formatDateYMD(today);
  const loansBlock = renderActiveLoans(activeLoans, today);
  const returnsBlock = renderRecentReturns(recentReturns, READING_ASSISTANT_RETURNS_WINDOW_DAYS);

  return `You are a helpful university library assistant. Your job is to help students find books and answer academic questions.

You must respond ONLY with a valid JSON object — no markdown, no extra text, no code fences.

Classify the student's message into one of these intents:
- "find_books": student wants book recommendations
- "answer": student has an academic question
- "both": student asks a question AND wants books
- "greeting": hi, hello, how are you, or other small talk
- "off_topic": requests unrelated to studying or books
- "loan_status": questions about the student's current loans, due dates, overdue items ("what's due tomorrow?", "any overdue?", "what books do I have?")

Response format:
{
  "intent": "find_books" | "answer" | "both" | "greeting" | "off_topic" | "loan_status",
  "reply": "Your natural, friendly response. Plain text only — no asterisks, no bullet points, no markdown.",
  "searchTerms": ["term1", "term2"],
  "followUpQuestion": "One short follow-up question (only for find_books or both, else empty string)"
}

Rules:
- reply must always be plain text. Never use **bold**, *italic*, bullet points, or markdown.
- For "find_books" or "both": searchTerms must be the SUBJECT/TOPIC the student wants — proper noun phrases as they would appear in a book title or table of contents. NEVER include filler verbs (give, show, find, recommend, suggest, want), quantifiers (some, any, a few), or pronouns (me, my). Expand acronyms (AI → "artificial intelligence", ML → "machine learning", DB → "database", OOP → "object-oriented programming"). Use 2-6 multi-word phrases when possible. Examples:
  - "give me some AI books" → searchTerms: ["artificial intelligence", "machine learning", "neural networks"]
  - "I need books for my marketing assignment" → searchTerms: ["marketing strategy", "consumer behavior", "brand management"]
- For "answer" or "both": give a concise academic explanation (2-4 sentences max).
- For "greeting": reply warmly and invite the student to ask for books or academic help. searchTerms must be empty.
- For "off_topic": politely decline and redirect to books or academic topics. searchTerms must be empty.
- For "loan_status": answer using ONLY the "Currently borrowed" data below. Never invent dates or titles. Use today's date for "due tomorrow", "due soon", "overdue" reasoning. searchTerms must be empty.
- Never recommend a book that appears in "Currently borrowed".
- When the student asks for a recommendation and recent-return data exists below, prefer adjacent or follow-up topics to those books and name the connection in reply (e.g. "Since you just finished X, here's something on Y").
- When the student asks for recommendations without specifying a topic, infer topics from recent returns, recently borrowed history, and known interests.
- You can answer questions from ALL academic fields.
- Never reveal what AI model you are. You are the library assistant.
- Today's date: ${todayStr}.${studentCtx}${loansBlock}${returnsBlock}`;
}

const YOUTUBE_SYSTEM_PROMPT = `You are a university library assistant. Given a student's reading interests, suggest exactly 3 YouTube educational video titles that complement those topics.
Return ONLY valid JSON — no markdown, no code fences, no extra text.
Format: { "courses": [{ "title": "...", "query": "..." }, ...] }
Keep titles concise and realistic. The query should be a good YouTube search term. Use English only.`;

// ─── Gemini ───────────────────────────────────────────────────────────────────

type GeminiTurn = { role: 'user' | 'model'; text: string };

const callGemini = async (
  systemPrompt: string,
  userMessage: string,
  options?: {
    temperature?: number;
    maxOutputTokens?: number;
    history?: GeminiTurn[];
    json?: boolean;
  },
): Promise<string | null> => {
  const { geminiBaseUrl, geminiApiKey, geminiModel } = getEnv();
  if (!geminiApiKey) {
    console.error('[Gemini] GEMINI_API_KEY is empty — env var not loaded. Check .env.local and restart pnpm dev.');
    return null;
  }
  if (!geminiModel) {
    console.error('[Gemini] geminiModel is empty.');
    return null;
  }
  if (geminiDisabled) {
    console.error('[Gemini] geminiDisabled flag is set (a previous request got 403). Restart pnpm dev to reset.');
    return null;
  }

  const url = `${geminiBaseUrl.replace(/\/+$/, '')}/models/${encodeURIComponent(
    geminiModel,
  )}:generateContent?key=${encodeURIComponent(geminiApiKey)}`;

  const history = options?.history ?? [];
  const body = {
    systemInstruction: {
      role: 'system',
      parts: [{ text: systemPrompt }],
    },
    contents: [
      ...history.map((h) => ({ role: h.role, parts: [{ text: h.text }] })),
      { role: 'user', parts: [{ text: userMessage }] },
    ],
    generationConfig: {
      temperature: options?.temperature ?? 0.3,
      ...(options?.maxOutputTokens ? { maxOutputTokens: options.maxOutputTokens } : {}),
      ...(options?.json ? { responseMimeType: 'application/json' } : {}),
    },
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      if (response.status === 403) {
        geminiDisabled = true;
        console.error('Gemini API disabled:', errorText);
      } else {
        console.error('[Gemini] non-ok status', response.status, errorText.slice(0, 400));
      }
      return null;
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('').trim() ?? null;
    if (!text) {
      console.error('[Gemini] returned 200 but empty content. Full response:', JSON.stringify(data).slice(0, 400));
      return null;
    }
    return text;
  } catch (err) {
    console.error('[Gemini] fetch error', err);
    return null;
  }
};

// ─── Provider call ────────────────────────────────────────────────────────────

const callAI = async (
  systemPrompt: string,
  userMessage: string,
  options?: {
    temperature?: number;
    maxTokens?: number;
    history?: GeminiTurn[];
    json?: boolean;
  },
): Promise<string | null> => {
  return callGemini(systemPrompt, userMessage, {
    temperature: options?.temperature,
    maxOutputTokens: options?.maxTokens,
    history: options?.history,
    json: options?.json,
  });
};

// ─── AI unavailable error ────────────────────────────────────────────────────

export class AiUnavailableError extends Error {
  constructor(message = 'AI service unavailable') {
    super(message);
    this.name = 'AiUnavailableError';
  }
}

// ─── AI health check ─────────────────────────────────────────────────────────
// Used to guard every recommendation request. Result is cached briefly so we
// don't make an extra ping on every single request.

type HealthCacheEntry = { healthy: boolean; checkedAt: number };
const aiHealthCache = new Map<string, HealthCacheEntry>();
const AI_HEALTH_CACHE_MS = 15_000;

export async function checkAiAvailable(): Promise<boolean> {
  const key = 'gemini';
  const now = Date.now();
  const cached = aiHealthCache.get(key);
  if (cached && now - cached.checkedAt < AI_HEALTH_CACHE_MS) {
    return cached.healthy;
  }

  const raw = await callAI(
    'Respond with only the single word: ok',
    'ping',
    { temperature: 0, maxTokens: 64 },
  );
  const healthy = Boolean(raw && raw.trim().length);
  aiHealthCache.set(key, { healthy, checkedAt: now });
  return healthy;
}

// ─── Main unified AI call ─────────────────────────────────────────────────────

export async function classifyAndExtract(
  message: string,
  userContext?: UserContext,
  history?: ChatTurn[],
  activeLoans?: Loan[],
  recentReturns?: Loan[],
  today: Date = new Date(),
): Promise<AiResult> {
  const systemPrompt = buildUnifiedSystemPrompt(userContext, activeLoans ?? [], recentReturns ?? [], today);
  const geminiHistory: GeminiTurn[] = (history ?? []).map((h) => ({
    role: h.sender === 'user' ? 'user' : 'model',
    text: h.text,
  }));
  const raw = await callAI(systemPrompt, message, { temperature: 0.3, maxTokens: 1024, history: geminiHistory, json: true });

  if (!raw) throw new AiUnavailableError();

  const jsonStr = extractJson(raw);
  let parsed: Partial<AiResult> | null = null;

  try {
    parsed = JSON.parse(jsonStr) as Partial<AiResult>;
  } catch {
    console.error('[AI] JSON parse failed:', jsonStr);
    throw new AiUnavailableError('AI returned invalid response');
  }

  const intent: AiIntent =
    ['find_books', 'answer', 'both', 'greeting', 'off_topic', 'loan_status'].includes(parsed.intent as string)
      ? (parsed.intent as AiIntent)
      : 'find_books';

  const reply = stripMarkdown(
    typeof parsed.reply === 'string' && parsed.reply.trim()
      ? parsed.reply.trim()
      : 'Here are some books that might help you.',
  );

  const searchTerms = Array.isArray(parsed.searchTerms)
    ? expandAcronyms(parsed.searchTerms.map((t) => String(t).trim()).filter(Boolean)).slice(0, 8)
    : [];

  const followUpQuestion =
    typeof parsed.followUpQuestion === 'string' ? parsed.followUpQuestion.trim() : '';

  return { intent, reply, searchTerms, followUpQuestion };
}

// ─── YouTube course suggestions ──────────────────────────────────────────────

export async function suggestYouTubeCourses(
  interests: string[],
): Promise<YouTubeCourseSuggestion[]> {
  if (!interests.length) return [];

  try {
    const raw = await callAI(
      YOUTUBE_SYSTEM_PROMPT,
      `Student interests: ${interests.join(', ')}`,
      { temperature: 0.4, maxTokens: 256, json: true },
    );
    if (!raw) return [];

    const jsonStr = extractJson(raw);
    let parsed: { courses?: Array<{ title?: string; query?: string }> } | null = null;

    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      return [];
    }

    if (!parsed || !Array.isArray(parsed.courses)) return [];

    const baseSuggestions = parsed.courses
      .filter((c) => c.title && c.query)
      .map((c) => ({ title: c.title!.trim(), query: c.query!.trim() }))
      .slice(0, 3);

    if (!baseSuggestions.length) return [];

    const enriched = await Promise.all(
      baseSuggestions.map(async (suggestion) => {
        try {
          const result = await searchYouTubeCourses({
            query: suggestion.query,
            limit: 1,
          });
          const asset = result.items[0];
          if (asset) {
            return {
              title: asset.title || suggestion.title,
              query: suggestion.query,
              url: asset.url ?? null,
            };
          }
        } catch {
          // Fall back to the AI suggestion.
        }

        return suggestion;
      }),
    );

    return enriched;
  } catch {
    return [];
  }
}

// ─── Legacy exports (kept for compatibility) ──────────────────────────────────

export type AiPreferenceResult = {
  summary: string;
  interests: string[];
  followUpQuestion: string;
};

export async function extractPreferences(
  message: string,
  userContext?: UserContext,
): Promise<AiPreferenceResult> {
  const result = await classifyAndExtract(message, userContext);
  return {
    summary: result.reply,
    interests: result.searchTerms.length ? result.searchTerms : tokenizeInterests(message).slice(0, 6),
    followUpQuestion: result.followUpQuestion || 'Any authors or series you already like?',
  };
}

export async function answerQuestion(
  message: string,
): Promise<string | null> {
  const result = await classifyAndExtract(message, undefined);
  return result.reply || null;
}
