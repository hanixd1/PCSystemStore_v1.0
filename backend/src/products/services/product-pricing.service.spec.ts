import { BadRequestException } from '@nestjs/common';
import { ProductPricingService } from './product-pricing.service';

describe('ProductPricingService', () => {
  let service: ProductPricingService;

  beforeEach(() => {
    service = new ProductPricingService();
  });

  it('usa el precio normal cuando la oferta esta desactivada', () => {
    expect(
      service.getEffectivePrice({
        price: 1000,
        isOnSale: false,
        salePrice: 700,
      }),
    ).toBe(1000);
  });

  it('usa salePrice cuando la oferta esta activa y es menor al precio normal', () => {
    expect(
      service.getEffectivePrice({
        price: 1000,
        isOnSale: true,
        salePrice: 700,
      }),
    ).toBe(700);
  });

  it('normaliza oferta desactivada como salePrice null', () => {
    expect(service.validateSale(1000, false, 700)).toEqual({
      isOnSale: false,
      salePrice: null,
    });
  });

  it('rechaza oferta activa sin precio mayor a 0', () => {
    expect(() => service.validateSale(1000, true, 0)).toThrow(BadRequestException);
    expect(() => service.validateSale(1000, true, '')).toThrow(
      'El precio de oferta debe ser mayor a 0',
    );
  });

  it('rechaza oferta activa cuando salePrice no es menor al precio normal', () => {
    expect(() => service.validateSale(1000, true, 1000)).toThrow(
      'El precio de oferta debe ser menor al precio normal',
    );
  });
});
