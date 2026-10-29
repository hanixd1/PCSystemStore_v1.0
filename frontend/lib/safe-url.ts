/**
 * Links that come from data (banners, chatbot answers, products) are never trusted as markup:
 * only same-site paths and absolute http(s) URLs are rendered as links.
 */

/** A path on this site: `/x`, never `//evil.com` or `/\evil.com` (browsers treat both as hosts). */
export function isSafeInternalPath(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.startsWith('/') &&
    !value.startsWith('//') &&
    !value.startsWith('/\\') &&
    !/[\u0000-\u001f]/.test(value)
  );
}

/** An absolute http(s) URL; rejects `javascript:`, `data:` and other schemes. */
export function isSafeExternalUrl(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}
