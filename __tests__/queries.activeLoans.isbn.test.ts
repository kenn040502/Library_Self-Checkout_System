import { isbnsMatch, normalizeIsbn, isbn10To13, isbn13To10 } from '@/app/lib/supabase/isbnMatch';

describe('isbnsMatch', () => {
  test('exact 13-digit match', () => {
    expect(isbnsMatch('9780132350884', '9780132350884')).toBe(true);
  });

  test('strips hyphens and spaces', () => {
    expect(isbnsMatch('978-0-13-235088-4', '9780132350884')).toBe(true);
    expect(isbnsMatch(' 978 0 13 235088 4 ', '9780132350884')).toBe(true);
  });

  test('isbn-10 stored matches isbn-13 scan (same book)', () => {
    // 0132350882 ↔ 9780132350884 (Clean Code, Martin)
    expect(isbnsMatch('0132350882', '9780132350884')).toBe(true);
  });

  test('isbn-13 stored matches isbn-10 scan', () => {
    expect(isbnsMatch('9780132350884', '0132350882')).toBe(true);
  });

  test('different ISBNs do not match', () => {
    expect(isbnsMatch('9780132350884', '9780134494166')).toBe(false);
  });

  test('blank or non-ISBN inputs return false', () => {
    expect(isbnsMatch('', '9780132350884')).toBe(false);
    expect(isbnsMatch('hello', '9780132350884')).toBe(false);
    expect(isbnsMatch('9780132350884', null)).toBe(false);
  });
});

describe('normalizeIsbn', () => {
  test('strips non-digit characters except trailing X', () => {
    expect(normalizeIsbn('978-0-13-235088-4')).toBe('9780132350884');
    expect(normalizeIsbn('0-13-235088-X')).toBe('013235088X');
  });
});

describe('isbn10To13 / isbn13To10', () => {
  test('roundtrip', () => {
    expect(isbn10To13('0132350882')).toBe('9780132350884');
    expect(isbn13To10('9780132350884')).toBe('0132350882');
  });

  test('returns null for invalid input', () => {
    expect(isbn10To13('123')).toBeNull();
    expect(isbn13To10('979-12345')).toBeNull(); // 979 prefix has no ISBN-10
  });
});
