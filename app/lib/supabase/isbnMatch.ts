/**
 * Normalize an ISBN-ish string: strip everything that isn't a digit,
 * preserve a trailing 'X' (ISBN-10 check digit).
 */
export function normalizeIsbn(value: string | null | undefined): string {
  if (!value) return '';
  const cleaned = value.toUpperCase().replace(/[^0-9X]/g, '');
  return cleaned;
}

/** Convert a 10-digit ISBN to 13-digit (978 prefix + recompute check digit). */
export function isbn10To13(input: string): string | null {
  const isbn = normalizeIsbn(input);
  if (isbn.length !== 10) return null;
  const core = '978' + isbn.slice(0, 9);
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += Number(core[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const check = (10 - (sum % 10)) % 10;
  return core + String(check);
}

/** Convert a 13-digit ISBN (978 prefix only) to 10-digit. Returns null for 979. */
export function isbn13To10(input: string): string | null {
  const isbn = normalizeIsbn(input);
  if (isbn.length !== 13 || !isbn.startsWith('978')) return null;
  const core = isbn.slice(3, 12);
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += Number(core[i]) * (10 - i);
  }
  const check = (11 - (sum % 11)) % 11;
  const checkChar = check === 10 ? 'X' : String(check);
  return core + checkChar;
}

/** True if two ISBN-ish strings refer to the same book (handles 10↔13 conversion). */
export function isbnsMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = normalizeIsbn(a);
  const nb = normalizeIsbn(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.length === 10 && nb.length === 13) return isbn10To13(na) === nb;
  if (na.length === 13 && nb.length === 10) return isbn13To10(na) === nb;
  return false;
}
