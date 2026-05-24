import { z } from 'zod';
import { studentFaqSections } from '@/app/ui/dashboard/studentFaqData';

export const AI_INTENTS = ['find_books', 'answer', 'both', 'greeting', 'off_topic', 'loan_status'] as const;
export type AiIntent = (typeof AI_INTENTS)[number];

/** Section titles the model is allowed to cite. Derived from the FAQ content. */
export const FAQ_SECTION_TITLES: string[] = studentFaqSections.map((s) => s.title);

export type Pass1Response = {
  intent: AiIntent;
  searchTerms: string[];
  followUpQuestion: string;
  faqSection: string | null;
};

const DEFAULTS: Pass1Response = { intent: 'find_books', searchTerms: [], followUpQuestion: '', faqSection: null };

const schema = z.object({
  intent: z.enum(AI_INTENTS).catch('find_books'),
  searchTerms: z
    .array(z.unknown())
    .catch([])
    .transform((arr) =>
      arr
        .map((v) => (typeof v === 'string' ? v.trim() : ''))
        .filter((v) => v.length > 0)
        .slice(0, 8),
    ),
  followUpQuestion: z
    .unknown()
    .catch('')
    .transform((v) => (typeof v === 'string' ? v.trim() : '')),
  faqSection: z
    .unknown()
    .catch(null)
    .transform((v) => (typeof v === 'string' && FAQ_SECTION_TITLES.includes(v.trim()) ? v.trim() : null)),
});

/** Validate the classify-step JSON. Never throws — bad input yields safe defaults. */
export function parsePass1Response(raw: unknown): Pass1Response {
  if (!raw || typeof raw !== 'object') return { ...DEFAULTS };
  const result = schema.safeParse(raw);
  if (!result.success) return { ...DEFAULTS };
  return result.data as Pass1Response;
}
