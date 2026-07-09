import { Injectable } from '@nestjs/common';
import { parseBooleanLike } from '../../common/dto/transformers';

@Injectable()
export class ProductPayloadService {
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

    if (normalized.includes('M.2') || normalized.includes('NVME')) return 'Sólido M.2';
    if (normalized === 'SSD' || normalized.includes('SSD 2.5')) return 'SSD 2.5';
    if (normalized === 'HDD' || normalized.includes('HDD 3.5')) return 'HDD 3.5';
    return String(val || '').trim() || 'SSD 2.5';
  }

  isM2StorageType(val: any): boolean {
    return this.normalizeStorageType(val) === 'Sólido M.2';
  }

  normalizeRadiatorValues(val: any): string[] {
    const values = this.toStringArray(val)
      .map((item) => {
        const match = String(item).match(/\d+/);
        if (!match) return /no/i.test(String(item)) ? '0' : '';
        return match[0];
      })
      .filter(Boolean);

    if (values.includes('0')) return ['0'];
    return [...new Set(values)];
  }

}

