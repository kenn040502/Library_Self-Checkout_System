import { isLikelyImageUrl, validateImageUrl } from '@/app/lib/validators/imageUrl';

describe('isLikelyImageUrl', () => {
  test('accepts common image extensions', () => {
    expect(isLikelyImageUrl('https://example.com/cover.jpg')).toBe(true);
    expect(isLikelyImageUrl('https://example.com/cover.jpeg')).toBe(true);
    expect(isLikelyImageUrl('https://example.com/cover.png')).toBe(true);
    expect(isLikelyImageUrl('https://example.com/cover.webp')).toBe(true);
    expect(isLikelyImageUrl('https://example.com/cover.gif')).toBe(true);
  });

  test('accepts query strings on image URLs', () => {
    expect(isLikelyImageUrl('https://covers.openlibrary.org/b/id/12345-L.jpg?abc=1')).toBe(true);
  });

  test('accepts known image-CDN hosts even without extension', () => {
    expect(isLikelyImageUrl('https://covers.openlibrary.org/b/id/12345-L')).toBe(true);
    expect(isLikelyImageUrl('https://images.unsplash.com/photo-12345')).toBe(true);
  });

  test('rejects wikipedia article URLs', () => {
    expect(isLikelyImageUrl('https://en.wikipedia.org/wiki/Clean_Code')).toBe(false);
  });

  test('rejects HTML pages and blank input', () => {
    expect(isLikelyImageUrl('https://example.com/page.html')).toBe(false);
    expect(isLikelyImageUrl('https://example.com/')).toBe(false);
    expect(isLikelyImageUrl('')).toBe(false);
    expect(isLikelyImageUrl(null)).toBe(false);
  });

  test('rejects non-http(s) schemes', () => {
    expect(isLikelyImageUrl('javascript:alert(1)')).toBe(false);
    expect(isLikelyImageUrl('data:text/html,<script>')).toBe(false);
  });
});

describe('validateImageUrl', () => {
  test('returns ok for blank (allow optional thumbnail)', () => {
    expect(validateImageUrl('').ok).toBe(true);
    expect(validateImageUrl(null).ok).toBe(true);
  });

  test('returns ok for likely image URLs', () => {
    expect(validateImageUrl('https://example.com/cover.jpg').ok).toBe(true);
  });

  test('returns error for wikipedia page', () => {
    const r = validateImageUrl('https://en.wikipedia.org/wiki/Clean_Code');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/image URL/i);
  });
});
