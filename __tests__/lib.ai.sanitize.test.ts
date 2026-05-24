/** @jest-environment node */
import { sanitizeUserContextForPrompt, type SanitizedUserContext } from '@/app/lib/ai/sanitize';

test('keeps allowlisted fields and drops everything else', () => {
  const raw = {
    faculty: 'Information Technology',
    department: 'Software Engineering',
    intakeYear: 2024,
    savedInterests: ['machine learning', 'databases'],
    historyTags: ['algorithms', 'machine learning'],
    recentBorrowedBooks: [
      { title: 'Sapiens', author: 'Yuval Harari', borrowedAt: '2026-04-01T00:00:00Z' },
    ],
    // fields that MUST NOT survive:
    email: 'student@example.edu',
    fullName: 'Jane Q. Student',
    matricNumber: 'A1234567',
    userId: '11111111-2222-3333-4444-555555555555',
    phone: '+60 12-345 6789',
  } as unknown as Parameters<typeof sanitizeUserContextForPrompt>[0];

  const out: SanitizedUserContext = sanitizeUserContextForPrompt(raw);

  expect(out.faculty).toBe('Information Technology');
  expect(out.department).toBe('Software Engineering');
  expect(out.studyYear).toBeGreaterThanOrEqual(1);
  expect(out.interestTags).toEqual(expect.arrayContaining(['machine learning', 'databases', 'algorithms']));
  expect(out.recentBookTitles).toEqual(['Sapiens']);

  const serialized = JSON.stringify(out);
  for (const secret of ['student@example.edu', 'Jane Q. Student', 'A1234567', '11111111-2222-3333-4444-555555555555', '12-345 6789']) {
    expect(serialized).not.toContain(secret);
  }
});

test('tolerates undefined / empty input', () => {
  expect(sanitizeUserContextForPrompt(undefined)).toEqual({
    faculty: null,
    department: null,
    studyYear: null,
    interestTags: [],
    recentBookTitles: [],
  });
});

test('clamps study year to 1..4 and dedupes/limits tags', () => {
  const out = sanitizeUserContextForPrompt({
    intakeYear: 1990,
    savedInterests: Array.from({ length: 30 }, (_v, i) => `tag${i % 5}`),
    historyTags: ['tag0', 'extra'],
  } as unknown as Parameters<typeof sanitizeUserContextForPrompt>[0]);
  expect(out.studyYear).toBe(4);
  expect(out.interestTags.length).toBeLessThanOrEqual(12);
  expect(new Set(out.interestTags).size).toBe(out.interestTags.length);
});
