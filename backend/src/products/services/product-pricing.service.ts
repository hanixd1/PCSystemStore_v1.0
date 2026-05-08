import { BadRequestException, Injectable } from '@nestjs/common';

@Injectable()
export class ProductPricingService {
  toFloat(value: unknown): number {
    const parsed = parseFloat(String(value));
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  getEffectivePrice(product: { price: unknown; isOnSale?: boolean; salePrice?: unknown }) {
    const price = this.toFloat(product.price);
    const salePrice = this.toFloat(product.salePrice);
    return product.isOnSale && salePrice > 0 && salePrice < price ? salePrice : price;
  }

  validateSale(price: number, isOnSale: boolean, salePrice?: unknown) {
    const normalizedSalePrice =
      salePrice === undefined || salePrice === null || salePrice === ''
        ? null
        : this.toFloat(salePrice);

    if (!isOnSale) {
      return { isOnSale: false, salePrice: null };
    }

    if (normalizedSalePrice === null || normalizedSalePrice <= 0) {
      throw new BadRequestException('El precio de oferta debe ser mayor a 0');
    }

    if (normalizedSalePrice >= price) {
      throw new BadRequestException('El precio de oferta debe ser menor al precio normal');
    }

    return { isOnSale: true, salePrice: normalizedSalePrice };
  }
}
