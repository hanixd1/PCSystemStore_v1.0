import {
  normalizeHeader,
  normalizePartNumber,
  normalizeSocket,
  parseImportBoolean,
} from './product-import-normalizers';

describe('product import normalizers', () => {
  it.each([
    ['Sí', true],
    ['yes', true],
    ['0', false],
    ['No', false],
    ['unknown', undefined],
  ])('parses boolean import value %j as %j', (value, expected) => {
    expect(parseImportBoolean(value)).toBe(expected);
  });

  it('normalizes import headers and part numbers deterministically', () => {
    expect(normalizeHeader(' Tamaño Físico M.2 ')).toBe('tamanofisicom2');
    expect(normalizePartNumber(' rtx / 4060! ')).toBe('RTX-4060');
  });

  it.each([
    ['socket str5', 'sTR5'],
    ['lga1700', 'LGA 1700'],
    ['LGA 1851', 'LGA 1851'],
  ])('normalizes socket alias %j as %j', (value, expected) => {
    expect(normalizeSocket(value)).toBe(expected);
  });
});
