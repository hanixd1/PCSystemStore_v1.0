import { ProductPayloadService } from './product-payload.service';
import { ProductValidationService } from './product-validation.service';

describe('ProductValidationService', () => {
  const service = new ProductValidationService(
    { product: { findUnique: jest.fn() } } as any,
    new ProductPayloadService(),
  );

  it('accepts technical names at the supported upper boundary', () => {
    const name = `GPU ${'X'.repeat(196)}`;

    expect(() =>
      service.validateCommonFields(
        {
          name,
          description: 'Descripcion tecnica valida para caracterizar la validacion.',
          price: 1,
          stock: 0,
        },
        ['https://example.com/product.png'],
      ),
    ).not.toThrow();
  });

  it('keeps stock zero valid while rejecting a negative stock', () => {
    expect(() => service.ensureNonNegative('stock', 0)).not.toThrow();
    expect(() => service.ensureNonNegative('stock', -1)).toThrow('no puede ser negativo');
  });
});
