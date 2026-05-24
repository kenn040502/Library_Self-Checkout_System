/** @jest-environment node */

import { buildUnifiedSystemPrompt } from '@/app/lib/recommendations/ai';
import type { Loan } from '@/app/lib/supabase/types';

const makeLoan = (overrides: Partial<Loan>): Loan =>
  ({
    id: 'l1',
    copyId: 'c1',
    bookId: 'b1',
    borrowerId: 'u1',
    borrowerName: null,
    borrowerEmail: null,
    borrowerIdentifier: null,
    borrowerRole: null,
    handledBy: null,
    status: 'borrowed',
    borrowedAt: '2026-04-01T00:00:00Z',
    dueAt: '2026-05-09T00:00:00Z',
    returnedAt: null,
    renewedCount: 0,
    createdAt: null,
    updatedAt: null,
    book: { id: 'b1', title: 'Sapiens', author: 'Yuval Harari', isbn: null, coverImageUrl: null, classification: null },
    ...overrides,
  } as Loan);

test('renders today date and loan_status rule when called with empty extras', () => {
  const prompt = buildUnifiedSystemPrompt(undefined, [], [], new Date('2026-05-07T00:00:00Z'));
  expect(prompt).toMatch(/Today's date: 2026-05-07/);
  expect(prompt).toMatch(/loan_status/);
});

test('uses the classify-only JSON contract — no reply field, includes faqSection', () => {
  const prompt = buildUnifiedSystemPrompt(undefined, [], [], new Date('2026-05-07T00:00:00Z'));
  expect(prompt).toMatch(/Do NOT include a "reply" field/);
  expect(prompt).toContain('"faqSection"');
  expect(prompt).not.toContain('"reply":');
});

test('carries the anti-injection clause and embedded FAQ content', () => {
  const prompt = buildUnifiedSystemPrompt(undefined, [], [], new Date('2026-05-07T00:00:00Z'));
  expect(prompt).toMatch(/untrusted input/i);
  expect(prompt).toMatch(/# FAQ/);
  // a real FAQ section title from studentFaqData
  expect(prompt).toContain('How to Borrow a Book');
});

test('renders sanitized student profile fields (faculty, study year, interests, recent titles)', () => {
  const prompt = buildUnifiedSystemPrompt(
    { faculty: 'Information Technology', department: null, studyYear: 2, interestTags: ['databases'], recentBookTitles: ['Clean Code'] },
    [],
    [],
    new Date('2026-05-07T00:00:00Z'),
  );
  expect(prompt).toContain('Faculty: Information Technology');
  expect(prompt).toContain('Study year: Year 2');
  expect(prompt).toContain('databases');
  expect(prompt).toContain('"Clean Code"');
});

test('renders Currently borrowed block with due-date countdown', () => {
  const today = new Date('2026-05-07T00:00:00Z');
  const loans: Loan[] = [
    makeLoan({ book: { id: 'b1', title: 'Sapiens', author: 'Yuval Harari', isbn: null }, dueAt: '2026-05-09T00:00:00Z' }),
    makeLoan({ id: 'l2', book: { id: 'b2', title: '1Q84', author: 'Haruki Murakami', isbn: null }, dueAt: '2026-05-01T00:00:00Z' }),
  ];

  const prompt = buildUnifiedSystemPrompt(undefined, loans, [], today);
  expect(prompt).toMatch(/Currently borrowed/);
  expect(prompt).toContain('"Sapiens"');
  expect(prompt).toMatch(/in 2 days/);
  expect(prompt).toContain('"1Q84"');
  expect(prompt).toMatch(/OVERDUE/);
});

test('renders Recently returned block', () => {
  const today = new Date('2026-05-07T00:00:00Z');
  const returns: Loan[] = [
    makeLoan({
      id: 'r1',
      status: 'returned',
      returnedAt: '2026-05-04T00:00:00Z',
      book: { id: 'b3', title: 'The Hobbit', author: null, isbn: null },
    }),
  ];

  const prompt = buildUnifiedSystemPrompt(undefined, [], returns, today);
  expect(prompt).toMatch(/Recently returned/);
  expect(prompt).toContain('"The Hobbit"');
  expect(prompt).toMatch(/2026-05-04/);
});

test('omits sections when both arrays are empty', () => {
  const prompt = buildUnifiedSystemPrompt(undefined, [], [], new Date('2026-05-07T00:00:00Z'));
  expect(prompt).not.toMatch(/Currently borrowed:/);
  expect(prompt).not.toMatch(/Recently returned/);
});
