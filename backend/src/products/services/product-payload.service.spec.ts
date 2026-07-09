import { ProductPayloadService } from './product-payload.service';

describe('ProductPayloadService', () => {
  const service = new ProductPayloadService();

  it('preserves false boolean values without Boolean("No") coercion', () => {
    expect(service.toBool('Sí')).toBe(true);
    expect(service.toBool('No')).toBe(false);
    expect(service.toBool(false)).toBe(false);
  });

  it('preserves stock zero and avoids NaN numeric payload values', () => {
    expect(service.toInt(0)).toBe(0);
    expect(service.toFloat('0')).toBe(0);
    expect(service.toInt('not-a-number')).toBe(0);
  });

  it('normalizes optional list payloads without throwing on empty values', () => {
    expect(service.toStringArray(undefined)).toEqual([]);
    expect(service.toStringArray('AM4; AM5')).toEqual(['AM4', 'AM5']);
    expect(service.normalizeRadiatorValues(['240 mm', '360 mm'])).toEqual(['240', '360']);
  });
});
