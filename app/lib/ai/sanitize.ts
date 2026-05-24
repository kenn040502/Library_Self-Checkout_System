// Central data-minimization for anything that goes into an LLM prompt.
// ALLOWLIST: only the fields below ever reach the model. Add new fields here
// deliberately — never spread a raw object into a prompt.

export type SanitizedUserContext = {
  faculty: string | null;
  department: string | null;
  studyYear: number | null;        // 1..4, derived from intake year
  interestTags: string[];          // <= 12, deduped, lowercased
  recentBookTitles: string[];      // <= 8, book titles only (no author/dates here)
};

// Shapes we accept loosely — callers pass app/lib/recommendations/user-context's UserContext,
// but we never trust it, so the type is permissive.
type RawContext = {
  faculty?: string | null;
  department?: string | null;
  intakeYear?: number | null;
  savedInterests?: unknown;
  historyTags?: unknown;
  recentBorrowedBooks?: Array<{ title?: unknown }> | null;
};

const cleanStr = (v: unknown): string | null => {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t.length ? t : null;
};

const cleanTagList = (v: unknown): string[] => {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of v) {
    const t = typeof item === 'string' ? item.trim().toLowerCase() : '';
    if (t && t.length <= 60 && !seen.has(t)) {
      seen.add(t);
      out.push(t);
    }
  }
  return out;
};

export function sanitizeUserContextForPrompt(raw: RawContext | undefined | null): SanitizedUserContext {
  if (!raw) {
    return { faculty: null, department: null, studyYear: null, interestTags: [], recentBookTitles: [] };
  }

  let studyYear: number | null = null;
  if (typeof raw.intakeYear === 'number' && Number.isFinite(raw.intakeYear)) {
    const y = new Date().getFullYear() - raw.intakeYear + 1;
    studyYear = Math.min(Math.max(y, 1), 4);
  }

  const interestTags = [...new Set([...cleanTagList(raw.historyTags), ...cleanTagList(raw.savedInterests)])].slice(0, 12);

  const recentBookTitles: string[] = [];
  const titleSeen = new Set<string>();
  for (const b of raw.recentBorrowedBooks ?? []) {
    const title = cleanStr(b?.title);
    if (title && !titleSeen.has(title.toLowerCase())) {
      titleSeen.add(title.toLowerCase());
      recentBookTitles.push(title);
      if (recentBookTitles.length >= 8) break;
    }
  }

  return {
    faculty: cleanStr(raw.faculty),
    department: cleanStr(raw.department),
    studyYear,
    interestTags,
    recentBookTitles,
  };
}
