const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.svg'];

const KNOWN_IMAGE_HOSTS = [
  'covers.openlibrary.org',
  'images.unsplash.com',
  'images-na.ssl-images-amazon.com',
  'm.media-amazon.com',
  'i.imgur.com',
];

export function isLikelyImageUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;

  const path = url.pathname.toLowerCase();
  if (IMAGE_EXTENSIONS.some((ext) => path.endsWith(ext))) return true;

  if (KNOWN_IMAGE_HOSTS.includes(url.hostname.toLowerCase())) return true;

  return false;
}

export type ImageUrlValidation = { ok: true } | { ok: false; error: string };

export function validateImageUrl(value: string | null | undefined): ImageUrlValidation {
  if (!value || !value.trim()) return { ok: true }; // optional field
  if (!isLikelyImageUrl(value.trim())) {
    return {
      ok: false,
      error:
        'Thumbnail must be a direct image URL (.jpg, .png, .webp, …) or a known image host. Article pages will not display as covers.',
    };
  }
  return { ok: true };
}
