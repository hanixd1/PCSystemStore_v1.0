import { ProductSlugService } from './product-slug.service';

describe('ProductSlugService', () => {
  it('preserves the established technical-name slug format', () => {
    const service = new ProductSlugService({ product: { findUnique: jest.fn() } } as any);

    expect(service.buildSlug('AMD Ryzen 7 7800X3D / AM5')).toBe('amd-ryzen-7-7800x3d-am5');
  });

  it('keeps the first available suffix when the base slug is taken', async () => {
    const findUnique = jest
      .fn()
      .mockResolvedValueOnce({ id: 'existing-product' })
      .mockResolvedValueOnce(null);
    const service = new ProductSlugService({ product: { findUnique } } as any);

    await expect(service.buildUniqueSlug('Producto QA')).resolves.toBe('producto-qa-2');
    expect(findUnique).toHaveBeenCalledWith({ where: { slug: 'producto-qa' } });
    expect(findUnique).toHaveBeenCalledWith({ where: { slug: 'producto-qa-2' } });
  });
});
