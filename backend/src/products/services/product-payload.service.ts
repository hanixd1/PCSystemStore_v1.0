import { BadRequestException, Injectable } from '@nestjs/common';
import { parseBooleanLike } from '../../common/dto/transformers';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { ProductPricingService } from './product-pricing.service';

@Injectable()
export class ProductPayloadService {
  constructor(private readonly pricing: ProductPricingService = new ProductPricingService()) {}

  toInt(val: unknown): number {
    const n = Number.parseInt(String(val ?? ''), 10);
    return Number.isNaN(n) ? 0 : n;
  }

  toFloat(val: unknown): number {
    const n = Number.parseFloat(String(val ?? ''));
    return Number.isNaN(n) ? 0 : n;
  }

  hasValue(val: any): boolean {
    return val !== undefined && val !== null && val !== '';
  }

  toBool(val: any): boolean {
    return parseBooleanLike(val) ?? false;
  }

  toStringArray(val: any): string[] {
    if (!val) {
      return [];
    }
    if (Array.isArray(val)) {
      return val.map((item) => String(item).trim()).filter(Boolean);
    }
    try {
      const parsed = JSON.parse(String(val));
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter(Boolean);
      }
    } catch {
      return String(val)
        .split(/[;,]/)
        .map((item) => item.trim())
        .filter(Boolean);
    }
    return [];
  }

  normalizeCoolerType(val: any): 'Torre' | 'Líquida' {
    const value = String(val || '')
      .trim()
      .toLowerCase();
    if (value === 'aio' || value.includes('liqu') || value.includes('líqu')) {
      return 'Líquida';
    }
    return 'Torre';
  }

  normalizeStorageType(val: any): string {
    const normalized = String(val || '')
      .trim()
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    if (normalized.includes('M.2') || normalized.includes('NVME')) {
      return 'Sólido M.2';
    }
    if (normalized === 'SSD' || normalized.includes('SSD 2.5')) {
      return 'SSD 2.5';
    }
    if (normalized === 'HDD' || normalized.includes('HDD 3.5')) {
      return 'HDD 3.5';
    }
    return String(val || '').trim() || 'SSD 2.5';
  }

  isM2StorageType(val: any): boolean {
    return this.normalizeStorageType(val) === 'Sólido M.2';
  }

  normalizeRadiatorValues(val: any): string[] {
    const values = this.toStringArray(val)
      .map((item) => {
        const match = String(item).match(/\d+/);
        if (!match) {
          return /no/i.test(String(item)) ? '0' : '';
        }
        return match[0];
      })
      .filter(Boolean);

    if (values.includes('0')) {
      return ['0'];
    }
    return [...new Set(values)];
  }

  buildCreateProductBasePayload(
    data: CreateProductDto & { uploadedImages?: string[] },
    finalImages: string[],
    sku: string,
    slug: string,
  ) {
    return {
      name: String(data.name).trim(),
      description: String(data.description || '').trim(),
      price: this.toFloat(data.price),
      isOnSale: false,
      salePrice: null,
      stock: this.toInt(data.stock),
      category: data.category,
      images: finalImages,
      slug,
      sku,
    };
  }

  buildProductUpdatePayload(currentProduct: any, data: UpdateProductDto & { slug?: string }) {
    const updateData: any = {};

    if (data.sku !== undefined) {
      updateData.sku = data.sku;
    }
    if (data.slug !== undefined) {
      updateData.slug = data.slug;
    }
    if (data.name !== undefined) {
      updateData.name = data.name;
    }
    if (data.description !== undefined) {
      updateData.description = String(data.description).trim();
    }
    if (data.category !== undefined) {
      updateData.category = data.category;
    }
    if (data.price !== undefined) {
      updateData.price = this.toFloat(data.price);
    }

    this.applyPricingUpdate(updateData, currentProduct, data);

    if (data.stock !== undefined) {
      updateData.stock = this.toInt(data.stock);
    }

    if (data.images !== undefined) {
      if (!Array.isArray(data.images) || data.images.length > 5) {
        throw new BadRequestException('El producto puede tener como maximo 5 imagenes');
      }
      updateData.images = data.images.filter((image) => String(image).trim());
    }

    return updateData;
  }

  private applyPricingUpdate(
    updateData: Record<string, any>,
    currentProduct: any,
    data: UpdateProductDto,
  ) {
    if (data.isOnSale !== undefined && !this.toBool(data.isOnSale)) {
      updateData.isOnSale = false;
      updateData.salePrice = null;
      return;
    }

    if (data.isOnSale === undefined && data.salePrice === undefined && data.price === undefined) {
      return;
    }

    const nextPrice =
      data.price !== undefined ? this.toFloat(data.price) : this.toFloat(currentProduct.price);
    const nextIsOnSale =
      data.isOnSale !== undefined
        ? this.toBool(data.isOnSale)
        : this.toBool(currentProduct.isOnSale);
    const nextSalePrice = data.salePrice !== undefined ? data.salePrice : currentProduct.salePrice;
    const sale = this.pricing.validateSale(nextPrice, nextIsOnSale, nextSalePrice);

    updateData.isOnSale = sale.isOnSale;
    updateData.salePrice = sale.salePrice;
  }
}
