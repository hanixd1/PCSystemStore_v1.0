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

  it('builds the create base payload with stock zero intact', () => {
    expect(
      service.buildCreateProductBasePayload(
        {
          name: 'CPU QA',
          description: 'Descripcion valida para producto de prueba',
          price: '199.90',
          stock: 0,
          category: 'CPU',
        } as any,
        ['cpu.png'],
        'CPU-QA-001',
        'cpu-qa',
      ),
    ).toMatchObject({ stock: 0, price: 199.9, isOnSale: false, salePrice: null });
  });

  it('builds sparse updates without removing omitted fields or false values', () => {
    const update = service.buildProductUpdatePayload(
      { price: 1000, isOnSale: true, salePrice: 900, images: ['kept.png'] },
      { stock: 0, isOnSale: false },
    );

    expect(update).toEqual({ stock: 0, isOnSale: false, salePrice: null });
    expect(update).not.toHaveProperty('images');
  });

  it('keeps valid update images while removing only blank entries', () => {
    expect(
      service.buildProductUpdatePayload({ price: 1000, isOnSale: false, salePrice: null }, {
        images: [' cover.png ', '', 'detail.png'],
      } as any),
    ).toMatchObject({ images: [' cover.png ', 'detail.png'] });
  });
});
