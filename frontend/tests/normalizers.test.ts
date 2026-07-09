import { describe, expect, it } from 'vitest';
import { normalizeLaptopStorage } from '../lib/normalizers';

describe('normalizeLaptopStorage', () => {
  it.each([null, undefined, '', '   \t\n'])(
    'normalizes an empty value (%j) to an empty string',
    (value) => {
      expect(normalizeLaptopStorage(value)).toBe('');
    },
  );

  it('normalizes storage strings, whitespace and unit/type separators', () => {
    expect(normalizeLaptopStorage(' 512 gbssd + 1 tb hdd ')).toBe('512 GB SSD + 1 TB HDD');
  });

  it('preserves numeric storage text instead of discarding it', () => {
    expect(normalizeLaptopStorage(512)).toBe('512');
  });
});
