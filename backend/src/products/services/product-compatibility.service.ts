import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProductCompatibilityService {
  constructor(private readonly prisma: PrismaService = undefined as never) {}

  private readonly productInclude = {
    cpuSpecs: true,
    motherboardSpecs: true,
    ramSpecs: true,
    gpuSpecs: true,
    psuSpecs: true,
    caseSpecs: true,
    coolerSpecs: true,
    storageSpecs: true,
    laptopSpecs: true,
    desktopSpecs: true,
    softwareSpecs: true,
    monitorSpecs: true,
    keyboardSpecs: true,
    mouseSpecs: true,
    mousepadSpecs: true,
    chairSpecs: true,
    gamingDeskSpecs: true,
    headsetSpecs: true,
    microphoneSpecs: true,
    speakerSpecs: true,
    webcamSpecs: true,
    captureCardSpecs: true,
    cableHubSpecs: true,
    laptopCoolingBaseSpecs: true,
    backpackSpecs: true,
  } satisfies Prisma.ProductInclude;

  private normalizeRelatedText(value: unknown) {
    return String(value || '')
      .trim()
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Z0-9]+/g, '');
  }

  private normalizeRelatedSocket(value: unknown) {
    const normalized = this.normalizeRelatedText(value);
    if (normalized.includes('STR5')) return 'STR5';
    if (normalized.includes('AM5')) return 'AM5';
    if (normalized.includes('AM4')) return 'AM4';
    if (normalized.includes('LGA1851')) return 'LGA1851';
    if (normalized.includes('LGA1700')) return 'LGA1700';
    if (normalized.includes('LGA1200')) return 'LGA1200';
    return normalized;
  }

  private normalizeRelatedRamType(value: unknown) {
    const normalized = this.normalizeRelatedText(value);
    if (normalized.includes('DDR5')) return 'DDR5';
    if (normalized.includes('DDR4')) return 'DDR4';
    if (normalized.includes('DDR3')) return 'DDR3';
    return normalized;
  }

  private normalizeRelatedBrand(value: unknown) {
    const normalized = this.normalizeRelatedText(value);
    if (normalized.includes('AMD') || normalized.includes('RADEON')) return 'AMD';
    if (normalized.includes('INTEL') || normalized.includes('ARC')) return 'INTEL';
    if (
      normalized.includes('NVIDIA') ||
      normalized.includes('GEFORCE') ||
      normalized.includes('RTX')
    ) {
      return 'NVIDIA';
    }
    return normalized;
  }

  private normalizeRelatedCategory(value: unknown) {
    const normalized = this.normalizeRelatedText(value);

    if (
      normalized === 'CPU' ||
      normalized.includes('PROCESADOR') ||
      normalized.includes('PROCESSOR')
    ) {
      return 'CPU';
    }
    if (
      normalized === 'MOTHERBOARD' ||
      normalized.includes('PLACAMADRE') ||
      normalized.includes('PLACABASE') ||
      normalized.includes('MOBO')
    ) {
      return 'MOTHERBOARD';
    }
    if (normalized === 'RAM' || normalized.includes('MEMORIARAM')) return 'RAM';
    if (
      normalized === 'GPU' ||
      normalized.includes('TARJETADEVIDEO') ||
      normalized.includes('TARJETAGRAFICA') ||
      normalized.includes('GRAFICA')
    ) {
      return 'GPU';
    }
    if (normalized === 'PSU' || normalized.includes('FUENTEDEPODER')) return 'PSU';
    if (normalized === 'CASE' || normalized.includes('GABINETE')) return 'CASE';
    if (normalized === 'COOLER' || normalized.includes('REFRIGERACION')) return 'COOLER';
    if (normalized === 'STORAGE' || normalized.includes('ALMACENAMIENTO')) return 'STORAGE';

    return normalized;
  }

  private relatedSpec(product: any, keys: string[]) {
    const sources = [
      product,
      product?.specs,
      product?.specifications,
      product?.cpuSpecs,
      product?.motherboardSpecs,
      product?.ramSpecs,
      product?.gpuSpecs,
      product?.psuSpecs,
      product?.caseSpecs,
      product?.coolerSpecs,
      product?.storageSpecs,
    ];

    for (const source of sources) {
      if (!source) continue;
      for (const key of keys) {
        const value = source[key];
        if (value !== undefined && value !== null && value !== '') {
          return value;
        }
      }
    }

    return undefined;
  }

  private relatedCategory(product: any) {
    const category = this.normalizeRelatedCategory(
      product?.category ??
        product?.productType ??
        product?.type ??
        this.relatedSpec(product, ['category', 'productType', 'tipoProducto']),
    );

    if (
      ['CPU', 'MOTHERBOARD', 'RAM', 'GPU', 'PSU', 'CASE', 'COOLER', 'STORAGE'].includes(category)
    ) {
      return category;
    }

    if (product?.cpuSpecs) return 'CPU';
    if (product?.motherboardSpecs) return 'MOTHERBOARD';
    if (product?.ramSpecs) return 'RAM';
    if (product?.gpuSpecs) return 'GPU';
    if (product?.psuSpecs) return 'PSU';
    if (product?.caseSpecs) return 'CASE';
    if (product?.coolerSpecs) return 'COOLER';
    if (product?.storageSpecs) return 'STORAGE';

    return category;
  }

  private relatedCpuSocket(product: any) {
    return this.normalizeRelatedSocket(
      this.relatedSpec(product, ['socket', 'cpuSocket']) ?? product?.name,
    );
  }

  private relatedCpuBrand(product: any) {
    const brand = this.normalizeRelatedBrand(
      this.relatedSpec(product, [
        'brand',
        'marcaProcesador',
        'processorBrand',
        'cpuBrand',
        'marca',
      ]) ?? product?.name,
    );

    return brand === 'AMD' || brand === 'INTEL' ? brand : '';
  }

  private relatedMotherboardSocket(product: any) {
    return this.normalizeRelatedSocket(
      this.relatedSpec(product, ['socket', 'motherboardSocket']) ?? product?.name,
    );
  }

  private relatedMotherboardRamType(product: any) {
    return this.normalizeRelatedRamType(
      this.relatedSpec(product, ['memoryType', 'tipoRam', 'ramType']) ?? product?.name,
    );
  }

  private relatedRamType(product: any) {
    return this.normalizeRelatedRamType(
      this.relatedSpec(product, ['memoryType', 'tipoRam', 'ramType']) ?? product?.name,
    );
  }

  private relatedList(value: unknown) {
    if (Array.isArray(value)) return value.map(String).filter(Boolean);
    return String(value || '')
      .split(/[;,]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private relatedNumber(value: unknown) {
    const match = String(value ?? '').match(/\d+(\.\d+)?/);
    return match ? Number(match[0]) : 0;
  }

  private relatedStorageIsM2(product: any) {
    const type = this.normalizeRelatedText(
      this.relatedSpec(product, ['type', 'tipoAlmacenamiento']),
    );
    return type.includes('M2') || type.includes('NVME');
  }

  private relatedCaseFormFactors(product: any) {
    const values = product.caseSpecs?.supportedFormFactors?.length
      ? product.caseSpecs.supportedFormFactors
      : product.caseSpecs?.formFactor;
    return this.relatedList(values).map((item) => this.normalizeRelatedText(item));
  }

  private relatedCaseRadiators(product: any) {
    const values = product.caseSpecs?.radiatorSupportMmValues?.length
      ? product.caseSpecs.radiatorSupportMmValues
      : product.caseSpecs?.radiatorSupportMm;
    return this.relatedList(values)
      .map((item) => this.relatedNumber(item))
      .filter((item) => item > 0);
  }

  private relatedCaseSupportsTowerCooler(product: any): boolean | undefined {
    const value = product?.caseSpecs?.supportsTowerCooler;
    return typeof value === 'boolean' ? value : undefined;
  }

  private relatedCoolerSockets(product: any) {
    const values = product.coolerSpecs?.compatibleSockets?.length
      ? product.coolerSpecs.compatibleSockets
      : product.coolerSpecs?.socketSupport;
    return this.relatedList(values).map((item) => this.normalizeRelatedSocket(item));
  }

  private relatedCoolerIsLiquid(product: any) {
    const type = this.normalizeRelatedText(product.coolerSpecs?.type);
    return type.includes('LIQ') || type.includes('AIO');
  }

  private relatedCandidateCategories(category: string) {
    const normalizedCategory = this.normalizeRelatedCategory(category);
    const map: Record<string, string[]> = {
      CPU: ['MOTHERBOARD', 'CPU', 'RAM'],
      MOTHERBOARD: ['CPU', 'RAM', 'MOTHERBOARD'],
      RAM: ['MOTHERBOARD', 'RAM'],
      GPU: ['PSU', 'CASE', 'GPU'],
      CASE: ['MOTHERBOARD', 'GPU', 'COOLER', 'CASE'],
      COOLER: ['CPU', 'CASE', 'COOLER'],
      STORAGE: ['MOTHERBOARD', 'STORAGE', 'CASE'],
    };
    return map[normalizedCategory] ?? [category];
  }

  private isAllowedTechnicalRelated(current: any, product: any, priority = 0) {
    if (priority >= 80) {
      return true;
    }

    const currentCategory = this.relatedCategory(current);
    const productCategory = this.relatedCategory(product);

    if (currentCategory === 'CPU') {
      const currentSocket = this.relatedCpuSocket(current);
      const currentBrand = this.relatedCpuBrand(current);

      if (productCategory === 'MOTHERBOARD') {
        return Boolean(currentSocket && this.relatedMotherboardSocket(product) === currentSocket);
      }

      if (productCategory === 'CPU') {
        const productSocket = this.relatedCpuSocket(product);
        const productBrand = this.relatedCpuBrand(product);
        const socketMatches = currentSocket && productSocket === currentSocket;
        const brandMatches = currentBrand && productBrand === currentBrand;

        return Boolean(socketMatches && brandMatches);
      }

      if (productCategory === 'RAM') {
        return true;
      }

      return false;
    }

    if (currentCategory === 'MOTHERBOARD') {
      const currentSocket = this.relatedMotherboardSocket(current);
      const currentRamType = this.relatedMotherboardRamType(current);

      if (productCategory === 'CPU') {
        return Boolean(currentSocket && this.relatedCpuSocket(product) === currentSocket);
      }

      if (productCategory === 'RAM') {
        return Boolean(currentRamType && this.relatedRamType(product) === currentRamType);
      }

      if (productCategory === 'MOTHERBOARD') {
        const socketMatches =
          currentSocket && this.relatedMotherboardSocket(product) === currentSocket;
        const ramTypeMatches =
          currentRamType && this.relatedMotherboardRamType(product) === currentRamType;

        return Boolean(socketMatches && ramTypeMatches);
      }

      return false;
    }

    return true;
  }

  private buildTechnicalRelated(current: any, candidates: any[]) {
    const ranked: Array<{ product: any; priority: number }> = [];
    const addMatches = (priority: number, predicate: (product: any) => boolean) => {
      for (const product of candidates) {
        if (predicate(product)) ranked.push({ product, priority });
      }
    };
    const currentCategory = this.relatedCategory(current);

    if (currentCategory === 'CPU') {
      const socket = this.relatedCpuSocket(current);
      const brand = this.relatedCpuBrand(current);
      const compatibleMotherboards = socket
        ? candidates.filter(
            (product) =>
              this.relatedCategory(product) === 'MOTHERBOARD' &&
              this.relatedMotherboardSocket(product) === socket,
          )
        : [];
      const ramTypes = new Set(
        compatibleMotherboards
          .map((product) => this.relatedMotherboardRamType(product))
          .filter(Boolean),
      );

      if (socket) {
        addMatches(
          10,
          (product) =>
            this.relatedCategory(product) === 'MOTHERBOARD' &&
            this.relatedMotherboardSocket(product) === socket,
        );
      }
      if (socket && brand) {
        addMatches(
          20,
          (product) =>
            this.relatedCategory(product) === 'CPU' &&
            this.relatedCpuSocket(product) === socket &&
            this.relatedCpuBrand(product) === brand,
        );
      }
      if (ramTypes.size > 0) {
        addMatches(
          30,
          (product) =>
            this.relatedCategory(product) === 'RAM' && ramTypes.has(this.relatedRamType(product)),
        );
      }
      if (ranked.length === 0 && brand) {
        addMatches(
          80,
          (product) =>
            this.relatedCategory(product) === 'CPU' && this.relatedCpuBrand(product) === brand,
        );
      }
      if (ranked.length === 0 && socket) {
        addMatches(
          85,
          (product) =>
            this.relatedCategory(product) === 'CPU' && this.relatedCpuSocket(product) === socket,
        );
      }
      if (ranked.length === 0) {
        addMatches(95, (product) => this.relatedCategory(product) === 'CPU');
      }
      return ranked;
    }

    if (currentCategory === 'MOTHERBOARD') {
      const socket = this.relatedMotherboardSocket(current);
      const ramType = this.relatedMotherboardRamType(current);
      if (socket) {
        addMatches(
          10,
          (product) =>
            this.relatedCategory(product) === 'CPU' && this.relatedCpuSocket(product) === socket,
        );
      }
      if (ramType) {
        addMatches(
          20,
          (product) =>
            this.relatedCategory(product) === 'RAM' && this.relatedRamType(product) === ramType,
        );
      }
      if (socket && ramType) {
        addMatches(
          30,
          (product) =>
            this.relatedCategory(product) === 'MOTHERBOARD' &&
            this.relatedMotherboardSocket(product) === socket &&
            this.relatedMotherboardRamType(product) === ramType,
        );
      }
      if (ranked.length === 0 && socket) {
        addMatches(
          80,
          (product) =>
            this.relatedCategory(product) === 'MOTHERBOARD' &&
            this.relatedMotherboardSocket(product) === socket,
        );
      }
      if (ranked.length === 0 && ramType) {
        addMatches(
          85,
          (product) =>
            this.relatedCategory(product) === 'MOTHERBOARD' &&
            this.relatedMotherboardRamType(product) === ramType,
        );
      }
      if (ranked.length === 0) {
        addMatches(95, (product) => this.relatedCategory(product) === 'MOTHERBOARD');
      }
      return ranked;
    }

    if (currentCategory === 'RAM') {
      const ramType = this.relatedRamType(current);
      if (ramType) {
        addMatches(
          10,
          (product) =>
            this.relatedCategory(product) === 'MOTHERBOARD' &&
            this.relatedMotherboardRamType(product) === ramType,
        );
        addMatches(
          20,
          (product) =>
            this.relatedCategory(product) === 'RAM' && this.relatedRamType(product) === ramType,
        );
      }
    }

    if (currentCategory === 'GPU') {
      const requiredWatts =
        this.relatedNumber(current.gpuSpecs?.recommendedPsuWatts) ||
        this.relatedNumber(current.gpuSpecs?.gpuPowerWatts) ||
        this.relatedNumber(current.gpuSpecs?.tdp) + 150;
      const gpuLength = this.relatedNumber(current.gpuSpecs?.length);
      const chipset = this.normalizeRelatedBrand(current.gpuSpecs?.chipset);
      addMatches(
        10,
        (product) =>
          product.category === 'PSU' &&
          this.relatedNumber(product.psuSpecs?.wattage) >= requiredWatts,
      );
      addMatches(
        20,
        (product) =>
          product.category === 'CASE' &&
          (!gpuLength || this.relatedNumber(product.caseSpecs?.maxGpuLength) >= gpuLength),
      );
      addMatches(
        30,
        (product) =>
          product.category === 'GPU' &&
          this.normalizeRelatedBrand(product.gpuSpecs?.chipset) === chipset,
      );
    }

    if (currentCategory === 'CASE') {
      const formFactors = this.relatedCaseFormFactors(current);
      const maxGpuLength = this.relatedNumber(current.caseSpecs?.maxGpuLength);
      const radiators = this.relatedCaseRadiators(current);
      const supportsTowerCooler = this.relatedCaseSupportsTowerCooler(current);
      addMatches(
        10,
        (product) =>
          product.category === 'MOTHERBOARD' &&
          formFactors.includes(this.normalizeRelatedText(product.motherboardSpecs?.formFactor)),
      );
      addMatches(
        20,
        (product) =>
          product.category === 'GPU' &&
          (!maxGpuLength || this.relatedNumber(product.gpuSpecs?.length) <= maxGpuLength),
      );
      addMatches(30, (product) => {
        if (product.category !== 'COOLER') return false;
        if (this.relatedCoolerIsLiquid(product)) {
          return radiators.includes(this.relatedNumber(product.coolerSpecs?.radiatorSize));
        }
        return supportsTowerCooler !== false;
      });
    }

    if (currentCategory === 'COOLER') {
      const sockets = this.relatedCoolerSockets(current);
      const radiatorSize = this.relatedNumber(current.coolerSpecs?.radiatorSize);
      const isLiquid = this.relatedCoolerIsLiquid(current);
      addMatches(
        10,
        (product) =>
          product.category === 'CPU' &&
          sockets.includes(this.normalizeRelatedSocket(product.cpuSpecs?.socket)),
      );
      addMatches(20, (product) => {
        if (product.category !== 'CASE') return false;
        if (isLiquid) return this.relatedCaseRadiators(product).includes(radiatorSize);
        return this.relatedCaseSupportsTowerCooler(product) !== false;
      });
    }

    if (currentCategory === 'STORAGE') {
      const storageType = this.normalizeRelatedText(current.storageSpecs?.type);
      const generation = this.normalizeRelatedText(current.storageSpecs?.interface);
      const m2Size = String(current.storageSpecs?.m2FormFactor || '').trim();
      if (this.relatedStorageIsM2(current) && m2Size) {
        addMatches(
          10,
          (product) =>
            product.category === 'MOTHERBOARD' &&
            this.relatedList(product.motherboardSpecs?.supportedM2FormFactors).includes(m2Size),
        );
      }
      addMatches(
        20,
        (product) =>
          product.category === 'STORAGE' &&
          this.normalizeRelatedText(product.storageSpecs?.type) === storageType &&
          (!generation ||
            this.normalizeRelatedText(product.storageSpecs?.interface) === generation),
      );
    }

    if (ranked.length === 0) {
      addMatches(90, (product) => this.relatedCategory(product) === currentCategory);
    }
    return ranked;
  }

  async findRelated(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: this.productInclude,
    });

    if (!product) {
      return [];
    }

    const currentCategory = this.relatedCategory(product);
    const candidates = await this.fetchRelatedCandidates(product, currentCategory);

    const ranked = this.buildTechnicalRelated(product, candidates);
    const seen = new Set<string>();
    const filtered = ranked
      .sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        if (a.product.stock !== b.product.stock) return b.product.stock - a.product.stock;
        return new Date(b.product.updatedAt).getTime() - new Date(a.product.updatedAt).getTime();
      })
      .filter(({ product: relatedProduct, priority }) => {
        if (seen.has(relatedProduct.id)) return false;
        const allowed = this.isAllowedTechnicalRelated(product, relatedProduct, priority);
        if (!allowed) return false;
        seen.add(relatedProduct.id);
        return true;
      });

    return this.balanceRelatedByCategory(filtered, 10).map(({ product }) => product);
  }

  private balanceRelatedByCategory(
    items: Array<{ product: any; priority: number }>,
    limit: number,
  ) {
    const byCategory = new Map<string, Array<{ product: any; priority: number }>>();
    for (const item of items) {
      const cat = this.relatedCategory(item.product);
      if (!byCategory.has(cat)) byCategory.set(cat, []);
      byCategory.get(cat)!.push(item);
    }

    const categoryCount = byCategory.size;
    if (categoryCount <= 1) return items.slice(0, limit);

    const minPerCategory = Math.max(2, Math.floor(limit / categoryCount));
    const result: Array<{ product: any; priority: number }> = [];
    const usedIds = new Set<string>();

    for (const [, catItems] of byCategory) {
      for (const item of catItems) {
        if (result.length >= limit) break;
        if (usedIds.has(item.product.id)) continue;
        if (
          result.filter(
            (r) => this.relatedCategory(r.product) === this.relatedCategory(item.product),
          ).length >= minPerCategory
        )
          break;
        usedIds.add(item.product.id);
        result.push(item);
      }
    }

    if (result.length < limit) {
      for (const item of items) {
        if (result.length >= limit) break;
        if (usedIds.has(item.product.id)) continue;
        usedIds.add(item.product.id);
        result.push(item);
      }
    }

    return result.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      if (a.product.stock !== b.product.stock) return b.product.stock - a.product.stock;
      return new Date(b.product.updatedAt).getTime() - new Date(a.product.updatedAt).getTime();
    });
  }

  private async fetchRelatedCandidates(product: any, currentCategory: string) {
    const targetCategories = this.relatedCandidateCategories(currentCategory);
    const baseWhere = { id: { not: product.id } };
    const orderBy: any = [{ stock: 'desc' }, { updatedAt: 'desc' }];
    const perCategoryLimit = 30;

    if (currentCategory === 'CPU') {
      return this.fetchCpuRelatedCandidates(
        product,
        targetCategories,
        baseWhere,
        orderBy,
        perCategoryLimit,
      );
    }

    if (currentCategory === 'MOTHERBOARD') {
      return this.fetchMotherboardRelatedCandidates(
        product,
        targetCategories,
        baseWhere,
        orderBy,
        perCategoryLimit,
      );
    }

    return this.prisma.product.findMany({
      where: { ...baseWhere, category: { in: targetCategories } },
      include: this.productInclude,
      orderBy,
      take: 80,
    });
  }

  private async fetchCpuRelatedCandidates(
    product: any,
    targetCategories: string[],
    baseWhere: any,
    orderBy: any,
    perCategoryLimit: number,
  ) {
    const queries: Promise<any[]>[] = [];

    if (targetCategories.includes('MOTHERBOARD')) {
      queries.push(
        this.prisma.product.findMany({
          where: { ...baseWhere, category: 'MOTHERBOARD' },
          include: this.productInclude,
          orderBy,
          take: perCategoryLimit,
        }),
      );
    }

    if (targetCategories.includes('CPU')) {
      queries.push(
        this.prisma.product.findMany({
          where: { ...baseWhere, category: 'CPU' },
          include: this.productInclude,
          orderBy,
          take: perCategoryLimit,
        }),
      );
    }

    if (targetCategories.includes('RAM')) {
      queries.push(
        this.prisma.product.findMany({
          where: { ...baseWhere, category: 'RAM' },
          include: this.productInclude,
          orderBy,
          take: perCategoryLimit,
        }),
      );
    }

    const results = await Promise.all(queries);
    const seen = new Set<string>();
    const merged: any[] = [];
    for (const group of results) {
      for (const item of group) {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          merged.push(item);
        }
      }
    }
    return merged;
  }

  private async fetchMotherboardRelatedCandidates(
    product: any,
    targetCategories: string[],
    baseWhere: any,
    orderBy: any,
    perCategoryLimit: number,
  ) {
    const queries: Promise<any[]>[] = [];

    if (targetCategories.includes('CPU')) {
      queries.push(
        this.prisma.product.findMany({
          where: { ...baseWhere, category: 'CPU' },
          include: this.productInclude,
          orderBy,
          take: perCategoryLimit,
        }),
      );
    }

    if (targetCategories.includes('RAM')) {
      queries.push(
        this.prisma.product.findMany({
          where: { ...baseWhere, category: 'RAM' },
          include: this.productInclude,
          orderBy,
          take: perCategoryLimit,
        }),
      );
    }

    if (targetCategories.includes('MOTHERBOARD')) {
      queries.push(
        this.prisma.product.findMany({
          where: { ...baseWhere, category: 'MOTHERBOARD' },
          include: this.productInclude,
          orderBy,
          take: perCategoryLimit,
        }),
      );
    }

    const results = await Promise.all(queries);
    const seen = new Set<string>();
    const merged: any[] = [];
    for (const group of results) {
      for (const item of group) {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          merged.push(item);
        }
      }
    }
    return merged;
  }
}
