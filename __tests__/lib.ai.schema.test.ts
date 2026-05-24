/** @jest-environment node */
import { parsePass1Response, FAQ_SECTION_TITLES } from '@/app/lib/ai/schema';

test('parses a well-formed object', () => {
  const out = parsePass1Response({
    intent: 'find_books',
    searchTerms: [' machine learning ', 'AI', ''],
    followUpQuestion: 'Any authors you like?',
    faqSection: FAQ_SECTION_TITLES[0],
  });
  expect(out.intent).toBe('find_books');
  expect(out.searchTerms).toContain('machine learning');
  expect(out.searchTerms).not.toContain('');
  expect(out.followUpQuestion).toBe('Any authors you like?');
  expect(out.faqSection).toBe(FAQ_SECTION_TITLES[0]);
});

test('coerces an unknown intent to find_books', () => {
  expect(parsePass1Response({ intent: 'banana' }).intent).toBe('find_books');
});

test('coerces a non-array searchTerms to []', () => {
  expect(parsePass1Response({ intent: 'answer', searchTerms: 'ml' }).searchTerms).toEqual([]);
});

test('coerces an unknown faqSection to null', () => {
  expect(parsePass1Response({ intent: 'answer', faqSection: 'Made Up Section' }).faqSection).toBeNull();
});

test('coerces a non-string followUpQuestion to ""', () => {
  expect(parsePass1Response({ intent: 'find_books', followUpQuestion: 42 }).followUpQuestion).toBe('');
});

test('handles total garbage', () => {
  expect(parsePass1Response('not even an object')).toEqual({
    intent: 'find_books',
    searchTerms: [],
    followUpQuestion: '',
    faqSection: null,
  });
  expect(parsePass1Response(null)).toEqual({
    intent: 'find_books',
    searchTerms: [],
    followUpQuestion: '',
    faqSection: null,
  });
});

test('caps searchTerms at 8', () => {
  const out = parsePass1Response({
    intent: 'find_books',
    searchTerms: Array.from({ length: 20 }, (_v, i) => `term${i}`),
  });
  expect(out.searchTerms.length).toBe(8);
});
