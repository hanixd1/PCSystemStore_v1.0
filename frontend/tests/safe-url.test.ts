import { describe, expect, it } from 'vitest';
import { isSafeExternalUrl, isSafeInternalPath } from '../lib/safe-url';

describe('links from data', () => {
  it.each(['/ofertas', '/producto/rtx-5060?ref=chat'])('internal %s is a link', (value) => {
    expect(isSafeInternalPath(value)).toBe(true);
  });

  it.each(['//evil.com', '/\\evil.com', 'javascript:alert(1)', 'https://x.com', '', null, 3])(
    'internal rejects %s',
    (value) => {
      expect(isSafeInternalPath(value)).toBe(false);
    },
  );

  it.each([
    ['https://www.pcsystemstore.com/ofertas', true],
    ['http://example.com', true],
    ['javascript:alert(1)', false],
    ['data:text/html,<b>x</b>', false],
    ['//evil.com', false],
  ])('external %s -> %s', (value, expected) => {
    expect(isSafeExternalUrl(value)).toBe(expected);
  });
});
