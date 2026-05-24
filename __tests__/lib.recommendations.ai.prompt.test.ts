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

test('renders Currently borrowed block with due-date countdown', () => {
  const today = new Date('2026-05-07T00:00:00Z');
  const loans: Loan[] = [
    makeLoan({ book: { id: 'b1', title: 'Sapiens', author: 'Yuval Harari', isbn: null, coverImageUrl: null, classification: null }, dueAt: '2026-05-09T00:00:00Z' }),
    makeLoan({ id: 'l2', book: { id: 'b2', title: '1Q84', author: 'Haruki Murakami', isbn: null, coverImageUrl: null, classification: null }, dueAt: '2026-05-01T00:00:00Z' }),
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
      book: { id: 'b3', title: 'The Hobbit', author: null, isbn: null, coverImageUrl: null, classification: null },
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
