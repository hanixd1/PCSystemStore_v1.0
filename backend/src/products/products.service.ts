import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { AuditService } from '../audit/audit.service';
import { ProductPricingService } from './services/product-pricing.service';
import { ProductPayloadService } from './services/product-payload.service';
import { ProductSpecsService } from './services/product-specs.service';
import { ProductValidationService } from './services/product-validation.service';
import { parseBooleanLike } from '../common/dto/transformers';
import {
  compactSearchText,
  expandProductSearchQuery,
  rankProductMatch,
  ProductSearchExpansion,
} from './product-search';

type ProductQuery = Record<string, string | string[] | undefined>;
type ProductChangeLog = {
  action: string;
  module: string;
  fieldName: string;
  oldValue?: string | number | null;
  newValue?: string | number | null;
  stockBefore?: number | null;
  stockAfter?: number | null;
  description: string;
};

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly pricing: ProductPricingService,
    private readonly payload: ProductPayloadService = new ProductPayloadService(),
    private readonly validation: ProductValidationService = new ProductValidationService(
      prisma,
      payload,
    ),
    private readonly specs: ProductSpecsService = new ProductSpecsService(payload, validation),
  ) {}

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

  private readonly adminProductGroups: Record<string, string[]> = {
    COMPONENTES: ['CPU', 'MOTHERBOARD', 'RAM', 'GPU', 'PSU', 'CASE', 'COOLER', 'STORAGE'],
    ORDENADORES: ['LAPTOP', 'PC_DESKTOP', 'SOFTWARE', 'LAPTOP_COOLING_BASE', 'BACKPACK'],
    PERIFERICOS: [
      'MONITOR',
      'KEYBOARD',
      'MOUSE',
      'MOUSEPAD',
      'CHAIR',
      'GAMING_DESK',
      'WEBCAM',
      'CAPTURE_CARD',
      'CABLE_HUB',
    ],
    AUDIO: ['HEADSET', 'MICROPHONE', 'SPEAKER'],
  };

  private readonly nameRegex = /^[\p{L}\p{N}\s.,+\-_%/()[\]:;'"#&°@]{5,200}$/u;
  private readonly productNameMessage =
    'El nombre debe tener entre 5 y 200 caracteres y puede incluir caracteres técnicos comunes.';
  private readonly skuRegex = /^[A-Z0-9_-]{3,80}$/;
  private readonly minDescriptionLength = 10;
  private readonly maxDescriptionLength = 200;

  private buildCoolerTypeWhere(value: string) {
    const normalized = this.payload.normalizeCoolerType(value);
    const variants =
      normalized === 'Torre'
        ? ['Torre', 'AIR', 'Air', 'aire', 'Aire (Torre)']
        : ['Líquida', 'Liquida', 'AIO', 'aio', 'Liquida (AIO)', 'Líquida (AIO)'];
    return {
      OR: variants.map((variant) => ({
        type: { equals: variant, mode: 'insensitive' as const },
      })),
    };
  }

  private buildSlug(name: string) {
    const normalized = String(name || '')
      .toLowerCase()
      .trim()
      .normalize('NFD');
    const slugChars: string[] = [];
    let previousWasSeparator = false;

    for (const char of normalized) {
      const code = char.codePointAt(0);
      if (code === undefined) {
        continue;
      }

      if (this.isCombiningMark(code)) {
        continue;
      }

      if (this.isSlugAllowedCharacter(char, code)) {
        slugChars.push(char);
        previousWasSeparator = false;
        continue;
      }

      if (this.shouldAppendSlugSeparator(char, previousWasSeparator, slugChars.length)) {
        slugChars.push('-');
        previousWasSeparator = true;
      }
    }

    const baseSlug = slugChars.join('').split('-').filter(Boolean).join('-');

    return (baseSlug || 'producto').slice(0, 120).replace(/-+$/g, '') || 'producto';
  }

  private async buildUniqueSlug(name: string, currentProductId?: string) {
    const baseSlug = this.buildSlug(name);

    for (let suffix = 0; suffix < 1000; suffix += 1) {
      const suffixText = suffix === 0 ? '' : `-${suffix + 1}`;
      const candidateBase = baseSlug.slice(0, 120 - suffixText.length).replace(/-+$/g, '');
      const candidate = `${candidateBase || 'producto'}${suffixText}`;
      const existingProduct = await this.prisma.product.findUnique({ where: { slug: candidate } });

      if (!existingProduct || existingProduct.id === currentProductId) {
        return candidate;
      }
    }

    throw new BadRequestException('No se pudo generar un slug unico para este producto.');
  }

  private isCombiningMark(code: number): boolean {
    return code >= 0x0300 && code <= 0x036f;
  }

  private isSlugLetter(code: number): boolean {
    return code >= 97 && code <= 122;
  }

  private isDigitCode(code: number): boolean {
    return code >= 48 && code <= 57;
  }

  private isSlugAllowedCharacter(_char: string, code: number): boolean {
    return this.isSlugLetter(code) || this.isDigitCode(code);
  }

  private isSlugSeparator(char: string): boolean {
    return char !== '.';
  }

  private shouldAppendSlugSeparator(
    char: string,
    previousWasSeparator: boolean,
    currentLength: number,
  ): boolean {
    return this.isSlugSeparator(char) && !previousWasSeparator && currentLength > 0;
  }

  private handlePrismaProductWriteError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const target = error.meta?.target;
      const fields = Array.isArray(target) ? target : [String(target ?? '')];

      if (fields.some((field) => field.includes('sku'))) {
        throw new BadRequestException('Ya existe un producto registrado con este SKU.');
      }

      if (fields.some((field) => field.includes('slug'))) {
        throw new BadRequestException('Ya existe un producto registrado con este slug.');
      }
    }

    throw error;
  }

  async create(data: CreateProductDto & { uploadedImages?: string[] }, actorId?: string) {
    const finalImages = this.buildCreateProductImages(data);
    this.validateCreateProductInput(data, finalImages);
    const sku = this.validation.normalizeAndValidateSku(data.sku);
    await this.validation.ensureSkuIsAvailable(sku);
    const slug = await this.buildUniqueSlug(data.name);

    const productData = this.buildCreateProductPayload(data, finalImages, sku, slug);
    const product = await this.persistCreatedProduct(productData);
    await this.logProductCreationIfNeeded(actorId, product);

    return product;
  }

  private buildCreateProductImages(
    data: CreateProductDto & { uploadedImages?: string[] },
  ): string[] {
    if (data.uploadedImages && data.uploadedImages.length > 0) {
      return data.uploadedImages;
    }

    return data.image ? [data.image] : [];
  }

  private validateCreateProductInput(
    data: CreateProductDto & { uploadedImages?: string[] },
    finalImages: string[],
  ) {
    if (!data.name || !data.category) {
      throw new BadRequestException('Nombre y categoria son obligatorios');
    }

    this.validation.validateCommonFields(data, finalImages);
    this.validation.validateCategoryFields(data.category, data);
  }

  private buildCreateProductPayload(
    data: CreateProductDto & { uploadedImages?: string[] },
    finalImages: string[],
    sku: string,
    slug: string,
  ) {
    return {
      ...this.buildCreateProductBasePayload(data, finalImages, sku, slug),
      ...this.specs.buildCreateProductSpecsPayload(data),
    };
  }

  private buildCreateProductBasePayload(
    data: CreateProductDto & { uploadedImages?: string[] },
    finalImages: string[],
    sku: string,
    slug: string,
  ) {
    return {
      name: String(data.name).trim(),
      description: String(data.description || '').trim(),
      price: this.payload.toFloat(data.price),
      isOnSale: false,
      salePrice: null,
      stock: this.payload.toInt(data.stock),
      category: data.category,
      images: finalImages,
      slug,
      sku,
    };
  }

  private async persistCreatedProduct(productData: any) {
    try {
      return await this.prisma.product.create({ data: productData });
    } catch (error) {
      this.handlePrismaProductWriteError(error);
    }
  }

  private async logProductCreationIfNeeded(actorId: string | undefined, product: any) {
    if (!actorId) {
      return;
    }

    await this.audit.log({
      actorId,
      action: 'CREATE_PRODUCT',
      module: 'PRODUCTS',
      entityType: 'PRODUCT',
      entityId: product.id,
      entityName: product.name,
      description: `Se creo el producto ${product.name}.`,
      metadata: {
        category: product.category,
        price: String(product.price),
        stock: product.stock,
      },
    });
  }
  private firstQueryValue(value: string | string[] | undefined): string | undefined {
    return Array.isArray(value) ? value[0] : value;
  }

  private getQueryString(query: ProductQuery, key: string): string | undefined {
    const value = this.firstQueryValue(query[key]);
    const normalized = String(value ?? '').trim();
    return normalized ? normalized : undefined;
  }

  private getQueryNumber(query: ProductQuery, key: string): number | undefined {
    const value = this.getQueryString(query, key);
    if (value === undefined) {
      return undefined;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private getQueryBoolean(query: ProductQuery, key: string): boolean | undefined {
    const value = this.getQueryString(query, key);
    if (value === undefined || value === 'all') {
      return undefined;
    }
    return parseBooleanLike(value);
  }

  private getQueryList(query: ProductQuery, key: string): string[] {
    const value = query[key];
    const rawValues = Array.isArray(value) ? value : [value];
    return rawValues
      .flatMap((item) => String(item ?? '').split(','))
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private addAnd(where: any, condition: any) {
    if (!condition || Object.keys(condition).length === 0) {
      return;
    }
    where.AND = [...(where.AND ?? []), condition];
  }

  private textContains(value: string) {
    return { contains: value, mode: 'insensitive' as const };
  }

  private buildPublicSearchWhere(search: string): Prisma.ProductWhereInput {
    const expansion = expandProductSearchQuery(search);
    const terms = expansion.terms.slice(0, 40);
    const or: Prisma.ProductWhereInput[] = [];

    if (expansion.candidateCategories.length > 0) {
      or.push({ category: { in: expansion.candidateCategories } });
    }

    for (const term of terms) {
      const compactTerm = compactSearchText(term);
      const termVariants = Array.from(new Set([term, compactTerm].filter(Boolean)));

      for (const variant of termVariants) {
        or.push(...this.buildPublicSearchTextWhere(variant));
      }
    }

    return { OR: or };
  }

  private buildPublicSearchTextWhere(term: string): Prisma.ProductWhereInput[] {
    const contains = this.textContains(term);

    return [
      { name: contains },
      { description: contains },
      { sku: contains },
      { slug: contains },
      { category: contains },
      { cpuSpecs: { is: { brand: contains } } },
      { cpuSpecs: { is: { socket: contains } } },
      { cpuSpecs: { is: { frequency: contains } } },
      { motherboardSpecs: { is: { brand: contains } } },
      { motherboardSpecs: { is: { socket: contains } } },
      { motherboardSpecs: { is: { formFactor: contains } } },
      { motherboardSpecs: { is: { memoryType: contains } } },
      { motherboardSpecs: { is: { supportedM2FormFactors: { has: term } } } },
      { ramSpecs: { is: { memoryType: contains } } },
      { gpuSpecs: { is: { brand: contains } } },
      { gpuSpecs: { is: { chipset: contains } } },
      { psuSpecs: { is: { brand: contains } } },
      { psuSpecs: { is: { certification: contains } } },
      { psuSpecs: { is: { modular: contains } } },
      { psuSpecs: { is: { formFactor: contains } } },
      { caseSpecs: { is: { brand: contains } } },
      { caseSpecs: { is: { formFactor: contains } } },
      { coolerSpecs: { is: { brand: contains } } },
      { coolerSpecs: { is: { type: contains } } },
      { coolerSpecs: { is: { socketSupport: contains } } },
      { coolerSpecs: { is: { compatibleSockets: { has: term } } } },
      { storageSpecs: { is: { type: contains } } },
      { storageSpecs: { is: { interface: contains } } },
      { storageSpecs: { is: { m2FormFactor: contains } } },
      { laptopSpecs: { is: { brand: contains } } },
      { laptopSpecs: { is: { processor: contains } } },
      { laptopSpecs: { is: { ram: contains } } },
      { laptopSpecs: { is: { storage: contains } } },
      { laptopSpecs: { is: { screenSize: contains } } },
      { laptopSpecs: { is: { panelType: contains } } },
      { laptopSpecs: { is: { gpuBrand: contains } } },
      { laptopSpecs: { is: { gpuModel: contains } } },
      { desktopSpecs: { is: { processor: contains } } },
      { desktopSpecs: { is: { ram: contains } } },
      { desktopSpecs: { is: { storage: contains } } },
      { desktopSpecs: { is: { gpuBrand: contains } } },
      { desktopSpecs: { is: { gpuModel: contains } } },
      { desktopSpecs: { is: { coolerType: contains } } },
      { desktopSpecs: { is: { caseModel: contains } } },
      { monitorSpecs: { is: { brand: contains } } },
      { monitorSpecs: { is: { screenSize: contains } } },
      { monitorSpecs: { is: { resolution: contains } } },
      { monitorSpecs: { is: { panelType: contains } } },
      { monitorSpecs: { is: { ports: { has: term } } } },
      { keyboardSpecs: { is: { brand: contains } } },
      { keyboardSpecs: { is: { connection: contains } } },
      { keyboardSpecs: { is: { switchType: contains } } },
      { keyboardSpecs: { is: { layout: contains } } },
      { keyboardSpecs: { is: { keyboardType: contains } } },
      { keyboardSpecs: { is: { connections: { has: term } } } },
      { keyboardSpecs: { is: { layoutLanguage: contains } } },
      { keyboardSpecs: { is: { keyboardFormFactor: contains } } },
      { mouseSpecs: { is: { brand: contains } } },
      { mouseSpecs: { is: { connection: contains } } },
      { mouseSpecs: { is: { sensor: contains } } },
      { mouseSpecs: { is: { mouseType: contains } } },
      { mouseSpecs: { is: { connections: { has: term } } } },
      { mouseSpecs: { is: { powerType: contains } } },
      { headsetSpecs: { is: { brand: contains } } },
      { headsetSpecs: { is: { connection: contains } } },
      { headsetSpecs: { is: { micType: contains } } },
      { headsetSpecs: { is: { supportedConnections: { has: term } } } },
      { microphoneSpecs: { is: { brand: contains } } },
      { microphoneSpecs: { is: { connection: contains } } },
      { microphoneSpecs: { is: { micType: contains } } },
      { speakerSpecs: { is: { brand: contains } } },
      { speakerSpecs: { is: { connection: contains } } },
      { webcamSpecs: { is: { brand: contains } } },
      { webcamSpecs: { is: { resolution: contains } } },
      { captureCardSpecs: { is: { brand: contains } } },
      { captureCardSpecs: { is: { resolution: contains } } },
      { cableHubSpecs: { is: { brand: contains } } },
      { cableHubSpecs: { is: { type: contains } } },
      { cableHubSpecs: { is: { cableType: contains } } },
      { cableHubSpecs: { is: { hubInputType: contains } } },
      { laptopCoolingBaseSpecs: { is: { brand: contains } } },
      { laptopCoolingBaseSpecs: { is: { connectivity: contains } } },
      { backpackSpecs: { is: { brand: contains } } },
      { backpackSpecs: { is: { color: contains } } },
      { mousepadSpecs: { is: { brand: contains } } },
      { chairSpecs: { is: { brand: contains } } },
      { chairSpecs: { is: { color: contains } } },
      { chairSpecs: { is: { material: contains } } },
      { gamingDeskSpecs: { is: { brand: contains } } },
      { gamingDeskSpecs: { is: { color: contains } } },
      { gamingDeskSpecs: { is: { surface: contains } } },
    ];
  }

  private numberRange(query: ProductQuery, minKey: string, maxKey: string) {
    const min = this.getQueryNumber(query, minKey);
    const max = this.getQueryNumber(query, maxKey);
    const range: Record<string, number> = {};
    if (min !== undefined) {
      range.gte = min;
    }
    if (max !== undefined) {
      range.lte = max;
    }
    return Object.keys(range).length ? range : undefined;
  }

  private oneOfOrContains(query: ProductQuery, key: string, field: string) {
    const values = this.getQueryList(query, key);
    if (values.length === 0) {
      return undefined;
    }
    return values.length === 1
      ? { [field]: this.textContains(values[0]) }
      : { OR: values.map((value) => ({ [field]: this.textContains(value) })) };
  }

  private inferMotherboardSockets(platform?: string) {
    if (!platform) {
      return undefined;
    }
    if (platform.toUpperCase() === 'AMD') {
      return ['AM4', 'AM5', 'sTR4', 'sTRX4', 'sWRX8', 'sTR5'];
    }
    if (platform.toUpperCase() === 'INTEL') {
      return ['LGA 1200', 'LGA 1700', 'LGA 1851'];
    }
    return undefined;
  }

  private shouldApplySpecFilter(category: string | undefined, specCategory: string) {
    return category === specCategory;
  }

  private buildProductWhere(query: ProductQuery): Prisma.ProductWhereInput {
    const where: any = {};
    this.addCategoryFilter(where, query);
    this.addSearchFilter(where, query);
    this.addProductScalarFilters(where, query);
    this.addBrandFilter(where, query);
    this.addSpecFilters(where, query);
    return where;
  }

  private addCategoryFilter(where: any, query: ProductQuery) {
    const category =
      this.getQueryString(query, 'category') || this.getQueryString(query, 'productType');
    const categories = this.getQueryList(query, 'categories');

    if (category) {
      where.category = category;
      return;
    }

    if (categories.length > 0) {
      where.category = { in: categories };
    }
  }

  private addSearchFilter(where: any, query: ProductQuery) {
    const search = this.getPublicSearchQuery(query);

    if (!search) {
      return;
    }

    this.addAnd(where, this.buildPublicSearchWhere(search));
  }

  private addProductScalarFilters(where: any, query: ProductQuery) {
    const priceRange = this.numberRange(query, 'minPrice', 'maxPrice');
    if (priceRange) {
      where.price = priceRange;
    }

    const inStock = this.getQueryBoolean(query, 'inStock');
    if (inStock !== undefined) {
      where.stock = inStock ? { gt: 0 } : { lte: 0 };
    }

    const isOnSale = this.getQueryBoolean(query, 'isOnSale');
    if (isOnSale !== undefined) {
      where.isOnSale = isOnSale;
    }
  }

  private addBrandFilter(where: any, query: ProductQuery) {
    const category =
      this.getQueryString(query, 'category') || this.getQueryString(query, 'productType');
    const brand = this.getQueryString(query, 'brand');

    if (!brand) {
      return;
    }

    const config = this.getBrandFilterConfig(category);
    if (!config) {
      this.addDefaultBrandFilter(where, brand);
      return;
    }

    this.addAnd(where, {
      [config.relation]: {
        is: this.buildBrandSpecCondition(brand, config),
      },
    });
  }

  private getBrandFilterConfig(category?: string) {
    const configs: Record<
      string,
      {
        relation: string;
        knownBrands: string[];
        exactMatch?: boolean;
        includeNullForOther?: boolean;
        otherLabels?: string[];
        royalKludgeAliases?: boolean;
      }
    > = {
      MOTHERBOARD: {
        relation: 'motherboardSpecs',
        knownBrands: ['ASUS', 'MSI', 'Gigabyte', 'ASRock'],
        exactMatch: true,
        otherLabels: ['Otros'],
      },
      GPU: {
        relation: 'gpuSpecs',
        knownBrands: ['Gigabyte', 'ASUS', 'MSI', 'PNY'],
        exactMatch: true,
        includeNullForOther: true,
        otherLabels: ['Otros'],
      },
      CASE: {
        relation: 'caseSpecs',
        knownBrands: [
          'Halion',
          'Micronics',
          'ASUS',
          'Gigabyte',
          'DeepCool',
          'Antryx',
          'MSI',
          'Lian Li',
        ],
        includeNullForOther: true,
        otherLabels: ['Otros'],
      },
      COOLER: {
        relation: 'coolerSpecs',
        knownBrands: ['MSI', 'DeepCool', 'Corsair', 'Gigabyte', 'ASUS'],
        includeNullForOther: true,
        otherLabels: ['Otros'],
      },
      PSU: {
        relation: 'psuSpecs',
        knownBrands: [
          'MSI',
          'ASUS',
          'Gigabyte',
          'Corsair',
          'DeepCool',
          'Antryx',
          'Cooler Master',
          'Seasonic',
          'Thermaltake',
        ],
        includeNullForOther: true,
        otherLabels: ['Otros'],
      },
      LAPTOP: {
        relation: 'laptopSpecs',
        knownBrands: ['ASUS', 'Lenovo', 'HP', 'Acer', 'Dell', 'MSI'],
        includeNullForOther: true,
        otherLabels: ['Otra', 'Otros'],
      },
      MONITOR: {
        relation: 'monitorSpecs',
        knownBrands: ['MSI', 'Gigabyte', 'Teros', 'LG', 'Samsung'],
        includeNullForOther: true,
        otherLabels: ['Otros'],
      },
      KEYBOARD: {
        relation: 'keyboardSpecs',
        knownBrands: ['Redragon', 'MSI', 'Logitech', 'Razer', 'Aula', 'Royal Kludge'],
        includeNullForOther: true,
        otherLabels: ['Otros'],
        royalKludgeAliases: true,
      },
      MOUSE: {
        relation: 'mouseSpecs',
        knownBrands: ['Redragon', 'Logitech', 'Razer', 'MSI', 'Teros'],
        includeNullForOther: true,
        otherLabels: ['Otros'],
      },
      MOUSEPAD: {
        relation: 'mousepadSpecs',
        knownBrands: ['HyperX', 'Logitech', 'Redragon'],
        includeNullForOther: true,
        otherLabels: ['Otros'],
      },
      WEBCAM: {
        relation: 'webcamSpecs',
        knownBrands: ['Logitech', 'Redragon'],
        includeNullForOther: true,
        otherLabels: ['Otros'],
      },
      CAPTURE_CARD: {
        relation: 'captureCardSpecs',
        knownBrands: ['Corsair', 'Streamplify'],
        includeNullForOther: true,
        otherLabels: ['Otros'],
      },
      CABLE_HUB: {
        relation: 'cableHubSpecs',
        knownBrands: ['Cabletime', 'Ugreen'],
        includeNullForOther: true,
        otherLabels: ['Otros'],
      },
      LAPTOP_COOLING_BASE: {
        relation: 'laptopCoolingBaseSpecs',
        knownBrands: ['Cooler Master', 'Antryx', 'Teros'],
        includeNullForOther: true,
        otherLabels: ['Otros'],
      },
      BACKPACK: {
        relation: 'backpackSpecs',
        knownBrands: ['Redragon', 'ASUS', 'Teros', 'Gigabyte'],
        includeNullForOther: true,
        otherLabels: ['Otros'],
      },
      HEADSET: {
        relation: 'headsetSpecs',
        knownBrands: ['Logitech', 'Redragon', 'HyperX', 'Razer', 'Teros'],
        includeNullForOther: true,
        otherLabels: ['Otros'],
      },
      MICROPHONE: {
        relation: 'microphoneSpecs',
        knownBrands: ['Fifine', 'Streamplify', 'Redragon', 'Razer', 'Logitech', 'Corsair'],
        includeNullForOther: true,
        otherLabels: ['Otros'],
      },
      SPEAKER: {
        relation: 'speakerSpecs',
        knownBrands: ['Logitech', 'Redragon', 'Creative', 'Genius'],
        includeNullForOther: true,
        otherLabels: ['Otros'],
      },
    };

    return category ? configs[category] : undefined;
  }

  private buildBrandSpecCondition(
    brand: string,
    config: {
      knownBrands: string[];
      exactMatch?: boolean;
      includeNullForOther?: boolean;
      otherLabels?: string[];
      royalKludgeAliases?: boolean;
    },
  ) {
    if (this.isOtherBrand(brand, config.otherLabels)) {
      return this.buildOtherBrandCondition(config);
    }

    if (config.royalKludgeAliases && brand === 'Royal Kludge') {
      return {
        OR: [
          { brand: this.textContains('Royal Kludge') },
          { brand: this.textContains('RoyalKludge') },
          { brand: this.textContains('RK') },
        ],
      };
    }

    return config.exactMatch ? { brand } : { brand: this.textContains(brand) };
  }

  private isOtherBrand(brand: string, otherLabels: string[] = ['Otros']) {
    return otherLabels.includes(brand);
  }

  private buildOtherBrandCondition(config: {
    knownBrands: string[];
    exactMatch?: boolean;
    includeNullForOther?: boolean;
    otherLabels?: string[];
  }) {
    const labels = config.otherLabels ?? ['Otros'];
    const baseConditions = labels.map((label) => ({ brand: label }));
    const nullCondition = config.includeNullForOther ? [{ brand: null }] : [];
    const unknownCondition = config.exactMatch
      ? [{ brand: { notIn: config.knownBrands } }]
      : [
          {
            NOT: {
              OR: config.knownBrands.map((knownBrand) => ({
                brand: this.textContains(knownBrand),
              })),
            },
          },
        ];

    return { OR: [...baseConditions, ...nullCondition, ...unknownCondition] };
  }

  private addDefaultBrandFilter(where: any, brand: string) {
    this.addAnd(where, {
      OR: [
        { name: this.textContains(brand) },
        { cpuSpecs: { is: { brand: this.textContains(brand) } } },
        { motherboardSpecs: { is: { brand: this.textContains(brand) } } },
        { gpuSpecs: { is: { brand: this.textContains(brand) } } },
        { caseSpecs: { is: { brand: this.textContains(brand) } } },
        { coolerSpecs: { is: { brand: this.textContains(brand) } } },
        { psuSpecs: { is: { brand: this.textContains(brand) } } },
        { laptopSpecs: { is: { brand: this.textContains(brand) } } },
        { monitorSpecs: { is: { brand: this.textContains(brand) } } },
        { keyboardSpecs: { is: { brand: this.textContains(brand) } } },
        { mouseSpecs: { is: { brand: this.textContains(brand) } } },
        { webcamSpecs: { is: { brand: this.textContains(brand) } } },
        { captureCardSpecs: { is: { brand: this.textContains(brand) } } },
        { cableHubSpecs: { is: { brand: this.textContains(brand) } } },
        { laptopCoolingBaseSpecs: { is: { brand: this.textContains(brand) } } },
        { backpackSpecs: { is: { brand: this.textContains(brand) } } },
        { mousepadSpecs: { is: { brand: this.textContains(brand) } } },
        { chairSpecs: { is: { brand: this.textContains(brand) } } },
        { gamingDeskSpecs: { is: { brand: this.textContains(brand) } } },
        { headsetSpecs: { is: { brand: this.textContains(brand) } } },
        { microphoneSpecs: { is: { brand: this.textContains(brand) } } },
        { speakerSpecs: { is: { brand: this.textContains(brand) } } },
      ],
    });
  }
  private buildProductOrderBy(query: ProductQuery): Prisma.ProductOrderByWithRelationInput {
    const sortBy = this.getQueryString(query, 'sortBy') || 'createdAt';
    const sortOrder = this.getQueryString(query, 'sortOrder') === 'asc' ? 'asc' : 'desc';
    const allowedSorts = new Set(['price', 'name', 'createdAt', 'stock']);
    return { [allowedSorts.has(sortBy) ? sortBy : 'createdAt']: sortOrder };
  }

  private addSpecFilters(where: any, query: ProductQuery) {
    const targetCategory =
      this.getQueryString(query, 'category') || this.getQueryString(query, 'productType');
    const cpu: any = {};
    const cpuBrand = this.getQueryString(query, 'cpuBrand');
    const socket = this.getQueryString(query, 'socket');
    const cpuTdp = this.numberRange(query, 'minTdp', 'maxTdp');
    const integratedGraphics = this.getQueryBoolean(query, 'integratedGraphics');
    const includesCooler = this.getQueryBoolean(query, 'includesCooler');
    if (cpuBrand) {
      cpu.brand = cpuBrand;
    }
    if (socket) {
      cpu.socket = socket;
    }
    if (cpuTdp) {
      cpu.tdp = cpuTdp;
    }
    if (integratedGraphics !== undefined) {
      cpu.integratedGraphics = integratedGraphics;
    }
    if (includesCooler !== undefined) {
      cpu.includesCooler = includesCooler;
    }
    if (Object.keys(cpu).length && this.shouldApplySpecFilter(targetCategory, 'CPU')) {
      this.addAnd(where, { cpuSpecs: { is: cpu } });
    }

    const motherboard: any = {};
    const platformSockets = this.inferMotherboardSockets(this.getQueryString(query, 'platform'));
    const formFactor =
      this.getQueryString(query, 'formFactor') || this.getQueryString(query, 'format');
    const ramType =
      this.getQueryString(query, 'ramType') || this.getQueryString(query, 'memoryType');
    const m2Slots = this.getQueryNumber(query, 'm2Slots');
    if (socket) {
      motherboard.socket = socket;
    }
    if (!socket && platformSockets) {
      motherboard.socket = { in: platformSockets };
    }
    if (formFactor) {
      motherboard.formFactor = formFactor;
    }
    if (ramType) {
      motherboard.memoryType = ramType;
    }
    if (m2Slots !== undefined) {
      motherboard.m2Slots = m2Slots >= 3 ? { gte: 3 } : m2Slots;
    }
    if (
      Object.keys(motherboard).length &&
      this.shouldApplySpecFilter(targetCategory, 'MOTHERBOARD')
    ) {
      this.addAnd(where, { motherboardSpecs: { is: motherboard } });
    }

    const ram: any = {};
    const capacity = this.getQueryNumber(query, 'capacity');
    const speed = this.getQueryNumber(query, 'speed') || this.getQueryNumber(query, 'frequency');
    const hasRGB = this.getQueryBoolean(query, 'hasRGB') ?? this.getQueryBoolean(query, 'rgb');
    if (ramType) {
      ram.memoryType = ramType;
    }
    if (capacity !== undefined) {
      ram.capacity = capacity;
    }
    if (speed !== undefined) {
      ram.speed = speed;
    }
    if (hasRGB !== undefined) {
      ram.hasRGB = hasRGB;
    }
    if (Object.keys(ram).length && this.shouldApplySpecFilter(targetCategory, 'RAM')) {
      this.addAnd(where, { ramSpecs: { is: ram } });
    }

    const gpu: any = {};
    const gpuChipset =
      this.getQueryString(query, 'gpuChipset') || this.getQueryString(query, 'chipset');
    const vram = this.getQueryNumber(query, 'vram');
    const gpuTdp = this.numberRange(query, 'minGpuTdp', 'maxGpuTdp') || cpuTdp;
    if (gpuChipset) {
      gpu.chipset = this.textContains(gpuChipset);
    }
    if (vram !== undefined) {
      gpu.vram = vram;
    }
    if (gpuTdp) {
      gpu.gpuPowerWatts = gpuTdp;
    }
    if (Object.keys(gpu).length && this.shouldApplySpecFilter(targetCategory, 'GPU')) {
      this.addAnd(where, { gpuSpecs: { is: gpu } });
    }

    const psu: any = {};
    const psuWatts =
      this.getQueryNumber(query, 'psuWatts') || this.getQueryNumber(query, 'wattage');
    const certification = this.getQueryString(query, 'certification');
    const modular = this.getQueryString(query, 'modular');
    if (psuWatts !== undefined) {
      psu.wattage = psuWatts >= 1000 ? { gte: 1000 } : psuWatts;
    }
    if (certification) {
      psu.certification = this.textContains(certification);
    }
    if (modular) {
      psu.modular = this.textContains(modular);
    }
    if (Object.keys(psu).length && this.shouldApplySpecFilter(targetCategory, 'PSU')) {
      this.addAnd(where, { psuSpecs: { is: psu } });
    }

    const caseSpecs: any = {};
    const caseIncludesPsu = this.getQueryBoolean(query, 'includesPsu');
    if (formFactor) {
      caseSpecs.formFactor = formFactor;
    }
    if (caseIncludesPsu !== undefined) {
      caseSpecs.includesPsu = caseIncludesPsu;
    }
    if (Object.keys(caseSpecs).length && this.shouldApplySpecFilter(targetCategory, 'CASE')) {
      this.addAnd(where, { caseSpecs: { is: caseSpecs } });
    }

    const cooler: any = {};
    const coolerType =
      this.getQueryString(query, 'coolerType') || this.getQueryString(query, 'type');
    const maxTdpWatts =
      this.numberRange(query, 'minMaxTdp', 'maxMaxTdp') ||
      this.numberRange(query, 'minMaxTdpWatts', 'maxMaxTdpWatts');
    const hasScreen =
      this.getQueryBoolean(query, 'hasScreen') ?? this.getQueryBoolean(query, 'hasLCD');
    const radiatorSize = this.getQueryNumber(query, 'radiatorSize');
    const compatibleSockets = this.getQueryList(query, 'compatibleSockets');
    if (coolerType) {
      Object.assign(cooler, this.buildCoolerTypeWhere(coolerType));
    }
    if (maxTdpWatts) {
      cooler.tdpCapacity = maxTdpWatts;
    }
    if (hasRGB !== undefined) {
      cooler.hasRGB = hasRGB;
    }
    if (hasScreen !== undefined) {
      cooler.hasScreen = hasScreen;
    }
    if (radiatorSize !== undefined) {
      cooler.radiatorSize = radiatorSize;
    }
    if (compatibleSockets.length > 0) {
      cooler.compatibleSockets = { hasSome: compatibleSockets };
    }
    if (Object.keys(cooler).length && this.shouldApplySpecFilter(targetCategory, 'COOLER')) {
      this.addAnd(where, { coolerSpecs: { is: cooler } });
    }

    const storage: any = {};
    const storageType =
      this.getQueryString(query, 'storageType') || this.getQueryString(query, 'type');
    const generation =
      this.getQueryString(query, 'generation') || this.getQueryString(query, 'interface');
    const m2FormFactor = this.getQueryString(query, 'm2FormFactor');
    const readSpeed = this.numberRange(query, 'minReadSpeed', 'maxReadSpeed');
    const writeSpeed = this.numberRange(query, 'minWriteSpeed', 'maxWriteSpeed');
    if (storageType) {
      storage.type = this.textContains(storageType);
    }
    if (generation) {
      storage.interface = this.textContains(generation);
    }
    if (capacity !== undefined) {
      storage.capacity = capacity >= 4000 ? { gte: 4000 } : capacity;
    }
    if (m2FormFactor) {
      storage.m2FormFactor = m2FormFactor;
    }
    if (readSpeed) {
      storage.readSpeed = readSpeed;
    }
    if (writeSpeed) {
      storage.writeSpeed = writeSpeed;
    }
    if (Object.keys(storage).length && this.shouldApplySpecFilter(targetCategory, 'STORAGE')) {
      this.addAnd(where, { storageSpecs: { is: storage } });
    }

    const laptop: any = {};
    const processor = this.getQueryString(query, 'processor');
    const laptopRam = this.getQueryString(query, 'ram');
    const laptopStorage = this.getQueryString(query, 'storage');
    const hasDedicatedGpu = this.getQueryBoolean(query, 'hasDedicatedGpu');
    const includesWindows = this.getQueryBoolean(query, 'includesWindows');
    const screenSize = this.getQueryString(query, 'screenSize');
    const refreshRateHz =
      this.getQueryNumber(query, 'refreshRateHz') || this.getQueryNumber(query, 'refreshRate');
    if (processor) {
      laptop.processor = this.textContains(processor);
    }
    if (laptopRam) {
      laptop.ram = this.textContains(laptopRam);
    }
    if (laptopStorage) {
      laptop.storage = this.textContains(laptopStorage);
    }
    if (hasDedicatedGpu !== undefined) {
      laptop.hasDedicatedGpu = hasDedicatedGpu;
    }
    if (includesWindows !== undefined) {
      laptop.includesWindows = includesWindows;
    }
    if (screenSize) {
      laptop.screenSize = this.textContains(screenSize);
    }
    if (refreshRateHz !== undefined) {
      laptop.refreshRate = refreshRateHz;
    }
    if (Object.keys(laptop).length && this.shouldApplySpecFilter(targetCategory, 'LAPTOP')) {
      this.addAnd(where, { laptopSpecs: { is: laptop } });
    }

    const desktop: any = {};
    const desktopPsu = this.getQueryNumber(query, 'desktopPsuWatts') || psuWatts;
    if (processor) {
      desktop.processor = this.textContains(processor);
    }
    if (laptopRam) {
      desktop.ram = this.textContains(laptopRam);
    }
    if (laptopStorage) {
      desktop.storage = this.textContains(laptopStorage);
    }
    if (hasDedicatedGpu !== undefined) {
      desktop.hasDedicatedGpu = hasDedicatedGpu;
    }
    if (gpuChipset) {
      desktop.gpuBrand = this.textContains(gpuChipset);
    }
    if (coolerType) {
      desktop.coolerType = this.textContains(coolerType);
    }
    if (desktopPsu !== undefined) {
      desktop.psuWatts = desktopPsu >= 850 ? { gte: 850 } : desktopPsu;
    }
    if (Object.keys(desktop).length && this.shouldApplySpecFilter(targetCategory, 'PC_DESKTOP')) {
      this.addAnd(where, { desktopSpecs: { is: desktop } });
    }

    const monitor: any = {};
    const resolution = this.getQueryString(query, 'resolution');
    const panel = this.getQueryString(query, 'panel') || this.getQueryString(query, 'panelType');
    const responseTimeMs = this.getQueryNumber(query, 'responseTimeMs');
    const ports = this.getQueryList(query, 'ports');
    const hasSpeakers = this.getQueryBoolean(query, 'hasSpeakers');
    if (screenSize) {
      monitor.screenSize = this.textContains(screenSize);
    }
    if (resolution) {
      monitor.resolution =
        resolution === 'Otro'
          ? {
              notIn: [
                'FHD (1920x1080)',
                'QHD (2560x1440)',
                'Ultra Wide QHD (3440x1440)',
                '4K UHD (3840x2160)',
              ],
            }
          : this.textContains(resolution);
    }
    if (panel) {
      monitor.panelType = this.textContains(panel);
    }
    if (refreshRateHz !== undefined) {
      monitor.refreshRate = refreshRateHz;
    }
    if (responseTimeMs !== undefined) {
      monitor.responseTimeMs = responseTimeMs;
    }
    if (ports.length > 0) {
      monitor.ports = { hasSome: ports };
    }
    if (hasSpeakers !== undefined) {
      monitor.hasSpeakers = hasSpeakers;
    }
    if (Object.keys(monitor).length && this.shouldApplySpecFilter(targetCategory, 'MONITOR')) {
      this.addAnd(where, { monitorSpecs: { is: monitor } });
    }

    const keyboard: any = {};
    const keyboardType = this.getQueryString(query, 'keyboardType');
    const connections = this.getQueryList(query, 'connections');
    const layoutLanguage =
      this.getQueryString(query, 'layoutLanguage') || this.getQueryString(query, 'language');
    const keyboardFormFactor = this.getQueryString(query, 'keyboardFormFactor');
    const hasLighting = this.getQueryBoolean(query, 'hasLighting') ?? hasRGB;
    if (keyboardType) {
      keyboard.keyboardType = keyboardType;
    }
    if (connections.length > 0) {
      keyboard.connections = { hasSome: connections };
    }
    if (layoutLanguage) {
      keyboard.layoutLanguage = layoutLanguage;
    }
    if (keyboardFormFactor) {
      keyboard.keyboardFormFactor = this.textContains(keyboardFormFactor);
    }
    if (hasLighting !== undefined) {
      keyboard.hasLighting = hasLighting;
    }
    if (Object.keys(keyboard).length && this.shouldApplySpecFilter(targetCategory, 'KEYBOARD')) {
      this.addAnd(where, { keyboardSpecs: { is: keyboard } });
    }

    const mouse: any = {};
    const mouseType = this.getQueryString(query, 'mouseType');
    const dpi = this.numberRange(query, 'minDpi', 'maxDpi');
    const pollingRateHz = this.getQueryNumber(query, 'pollingRateHz');
    if (mouseType) {
      mouse.mouseType = mouseType;
    }
    if (connections.length > 0) {
      mouse.connections = { hasSome: connections };
    }
    if (dpi) {
      mouse.dpi = dpi;
    }
    if (pollingRateHz !== undefined) {
      mouse.pollingRateHz = pollingRateHz;
    }
    if (Object.keys(mouse).length && this.shouldApplySpecFilter(targetCategory, 'MOUSE')) {
      this.addAnd(where, { mouseSpecs: { is: mouse } });
    }

    const headset: any = {};
    const headsetConnection = this.getQueryString(query, 'connection');
    if (headsetConnection) {
      headset.connection = headsetConnection;
    }
    if (Object.keys(headset).length && this.shouldApplySpecFilter(targetCategory, 'HEADSET')) {
      this.addAnd(where, { headsetSpecs: { is: headset } });
    }

    const fps = this.getQueryNumber(query, 'fps');
    const webcam: any = {};
    if (resolution) {
      webcam.resolution = resolution;
    }
    if (fps !== undefined) {
      webcam.fps = fps;
    }
    if (Object.keys(webcam).length && this.shouldApplySpecFilter(targetCategory, 'WEBCAM')) {
      this.addAnd(where, { webcamSpecs: { is: webcam } });
    }

    const captureCard: any = {};
    if (resolution) {
      captureCard.resolution = resolution;
    }
    if (fps !== undefined) {
      captureCard.fps = fps;
    }
    if (
      Object.keys(captureCard).length &&
      this.shouldApplySpecFilter(targetCategory, 'CAPTURE_CARD')
    ) {
      this.addAnd(where, { captureCardSpecs: { is: captureCard } });
    }

    const cableHub: any = {};
    const cableHubType =
      this.getQueryString(query, 'cableHubType') || this.getQueryString(query, 'type');
    if (cableHubType) {
      cableHub.type = cableHubType;
    }
    if (Object.keys(cableHub).length && this.shouldApplySpecFilter(targetCategory, 'CABLE_HUB')) {
      this.addAnd(where, { cableHubSpecs: { is: cableHub } });
    }

    const mousepad: any = {};
    const hasLed = this.getQueryBoolean(query, 'hasLed');
    const mousepadSize = this.getQueryString(query, 'mousepadSize');
    if (hasLed !== undefined) {
      mousepad.hasLed = hasLed;
    }
    if (mousepadSize === 'Pequeno') {
      mousepad.widthCm = { lte: 350 };
    }
    if (mousepadSize === 'Mediano') {
      mousepad.widthCm = { gt: 350, lte: 700 };
    }
    if (mousepadSize === 'Grande') {
      mousepad.widthCm = { gt: 700, lte: 900 };
    }
    if (mousepadSize === 'XL') {
      mousepad.widthCm = { gt: 900, lte: 1200 };
    }
    if (mousepadSize === 'XXL') {
      mousepad.widthCm = { gt: 1200 };
    }
    if (Object.keys(mousepad).length && this.shouldApplySpecFilter(targetCategory, 'MOUSEPAD')) {
      this.addAnd(where, { mousepadSpecs: { is: mousepad } });
    }

    const chair: any = {};
    const color = this.getQueryString(query, 'color');
    const material = this.getQueryString(query, 'material');
    const maxWeight = this.numberRange(query, 'minMaxWeight', 'maxMaxWeight');
    if (color) {
      chair.color = this.textContains(color);
    }
    if (material) {
      chair.material = this.textContains(material);
    }
    if (maxWeight) {
      chair.maxWeightKg = maxWeight;
    }
    if (Object.keys(chair).length && this.shouldApplySpecFilter(targetCategory, 'CHAIR')) {
      this.addAnd(where, { chairSpecs: { is: chair } });
    }

    const desk: any = {};
    const surface = this.getQueryString(query, 'surface');
    const weight = this.numberRange(query, 'minWeight', 'maxWeight');
    if (color) {
      desk.color = this.textContains(color);
    }
    if (surface) {
      desk.surface = this.textContains(surface);
    }
    if (weight) {
      desk.weightKg = weight;
    }
    if (Object.keys(desk).length && this.shouldApplySpecFilter(targetCategory, 'GAMING_DESK')) {
      this.addAnd(where, { gamingDeskSpecs: { is: desk } });
    }
  }

  private buildChatProductWhere(query: ProductQuery): Prisma.ProductWhereInput {
    const where: Prisma.ProductWhereInput = {};
    const category =
      this.getQueryString(query, 'category') || this.getQueryString(query, 'productType');
    const search = this.getQueryString(query, 'search');

    if (category) {
      where.category = category;
    }

    if (this.getQueryBoolean(query, 'inStock') !== false) {
      where.stock = { gt: 0 };
    }

    if (search) {
      where.OR = [
        { name: this.textContains(search) },
        { description: this.textContains(search) },
        { sku: this.textContains(search) },
        { category: this.textContains(search) },
      ];
    }

    return where;
  }

  private normalizeChatSearchText(value: unknown): string {
    return String(value ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9.]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private getChatProductSearchText(product: any): string {
    return this.normalizeChatSearchText(
      [
        product.name,
        product.description,
        product.sku,
        product.slug,
        product.category,
        JSON.stringify(product.cpuSpecs ?? {}),
        JSON.stringify(product.gpuSpecs ?? {}),
        JSON.stringify(product.ramSpecs ?? {}),
        JSON.stringify(product.motherboardSpecs ?? {}),
        JSON.stringify(product.storageSpecs ?? {}),
        JSON.stringify(product.psuSpecs ?? {}),
        JSON.stringify(product.caseSpecs ?? {}),
        JSON.stringify(product.coolerSpecs ?? {}),
      ].join(' '),
    );
  }

  private rankChatProduct(product: any, rawSearch: string): number {
    const query = this.normalizeChatSearchText(rawSearch);
    const terms = query
      .split(' ')
      .flatMap((term) => {
        const unitMatch = term.match(/^(\d+)(w|gb|tb|hz)$/);
        return unitMatch ? [term, unitMatch[1]] : [term];
      })
      .filter((term) => term.length > 1);
    const compactQuery = query.replace(/\s+/g, '');
    const searchText = this.getChatProductSearchText(product);
    const compactText = searchText.replace(/\s+/g, '');
    let score = 0;

    if (query && searchText.includes(query)) {
      score += 80;
    }

    if (compactQuery && compactText.includes(compactQuery)) {
      score += 60;
    }

    for (const term of terms) {
      if (searchText.includes(term)) {
        score += 15;
      }
      if (compactText.includes(term)) {
        score += 10;
      }
    }

    score += Math.min(Number(product.stock ?? 0), 5);
    return score;
  }

  private mapChatProduct(product: any) {
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      stock: product.stock,
      imageUrl: Array.isArray(product.images) ? (product.images[0] ?? null) : null,
      images: product.images,
      category: product.category,
      cpuSpecs: product.cpuSpecs,
      gpuSpecs: product.gpuSpecs,
      ramSpecs: product.ramSpecs,
      motherboardSpecs: product.motherboardSpecs,
      storageSpecs: product.storageSpecs,
      psuSpecs: product.psuSpecs,
      caseSpecs: product.caseSpecs,
      coolerSpecs: product.coolerSpecs,
    };
  }

  async chatSearch(query: ProductQuery = {}) {
    const limit = Math.min(Math.max(this.payload.toInt(this.firstQueryValue(query.limit)) || 5, 1), 20);
    const search = this.getQueryString(query, 'search');
    const where = search
      ? (() => {
          const baseWhere: Prisma.ProductWhereInput = {};
          const category =
            this.getQueryString(query, 'category') || this.getQueryString(query, 'productType');

          if (category) {
            baseWhere.category = category;
          }

          if (this.getQueryBoolean(query, 'inStock') !== false) {
            baseWhere.stock = { gt: 0 };
          }

          return baseWhere;
        })()
      : this.buildChatProductWhere(query);

    try {
      const products = await this.prisma.product.findMany({
        where,
        select: {
          id: true,
          slug: true,
          name: true,
          description: true,
          price: true,
          stock: true,
          images: true,
          category: true,
          updatedAt: true,
          cpuSpecs: { select: { brand: true, socket: true, tdp: true } },
          gpuSpecs: { select: { brand: true, chipset: true, vram: true } },
          ramSpecs: { select: { memoryType: true, capacity: true, modules: true, speed: true } },
          motherboardSpecs: {
            select: { brand: true, socket: true, formFactor: true, memoryType: true },
          },
          storageSpecs: {
            select: { type: true, capacity: true, interface: true, m2FormFactor: true },
          },
          psuSpecs: { select: { brand: true, wattage: true, certification: true } },
          caseSpecs: { select: { brand: true, formFactor: true, includesPsu: true } },
          coolerSpecs: {
            select: {
              brand: true,
              type: true,
              radiatorSize: true,
              compatibleSockets: true,
              tdpCapacity: true,
            },
          },
        },
        orderBy: [{ stock: 'desc' }, { updatedAt: 'desc' }],
        take: search ? 300 : limit,
      });
      const rankedProducts = search
        ? products
            .map((product) => ({
              product,
              score: this.rankChatProduct(product, search),
            }))
            .filter((item) => item.score > 0)
            .sort(
              (left, right) => right.score - left.score || right.product.stock - left.product.stock,
            )
            .slice(0, limit)
            .map((item) => item.product)
        : products;

      return {
        success: true,
        items: rankedProducts.map((product) => this.mapChatProduct(product)),
        message:
          rankedProducts.length === 0
            ? 'Por ahora no encontre productos disponibles con ese filtro. Puedes revisar el catalogo o cambiar el criterio.'
            : undefined,
      };
    } catch (error) {
      const errorInfo =
        error instanceof Error ? `${error.name}: ${error.message}` : 'unknown search error';
      console.warn(`[Products] Chat search unavailable: ${errorInfo}`);
      return {
        success: false,
        searchAvailable: false,
        items: [],
        message: 'Por ahora no pude consultar el catalogo. Intenta nuevamente en unos segundos.',
      };
    }
  }

  async findAll(query: ProductQuery = {}) {
    const hasFilters = Object.keys(query).length > 0;

    if (!hasFilters) {
      return this.prisma.product.findMany({
        include: this.productInclude,
      });
    }

    const page = Math.max(this.payload.toInt(this.firstQueryValue(query.page)) || 1, 1);
    const limit = Math.min(Math.max(this.payload.toInt(this.firstQueryValue(query.limit)) || 24, 1), 60);

    if (this.getPublicSearchQuery(query)) {
      return this.findAllWithPublicSearch(query, page, limit);
    }

    const where = this.buildProductWhere(query);
    const orderBy = this.buildProductOrderBy(query);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        include: this.productInclude,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findAdminInventory(query: ProductQuery = {}) {
    const page = Math.max(this.payload.toInt(this.firstQueryValue(query.page)) || 1, 1);
    const limit = Math.min(Math.max(this.payload.toInt(this.firstQueryValue(query.limit)) || 30, 1), 100);
    const search = (this.getQueryString(query, 'search') || '').trim();
    const category = (this.getQueryString(query, 'category') || '').trim();
    const productType = (this.getQueryString(query, 'productType') || '').trim();
    const categoryFilter = this.resolveAdminInventoryCategories(category, productType);

    const where: Prisma.ProductWhereInput = {};
    if (categoryFilter.length === 1) {
      where.category = categoryFilter[0];
    } else if (categoryFilter.length > 1) {
      where.category = { in: categoryFilter };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    const totalItems = await this.prisma.product.count({ where });
    const totalPages = Math.max(Math.ceil(totalItems / limit), 1);
    const safePage = Math.min(page, totalPages);

    const items = await this.prisma.product.findMany({
      where,
      include: this.productInclude,
      orderBy: [{ createdAt: 'desc' }, { name: 'asc' }],
      skip: (safePage - 1) * limit,
      take: limit,
    });

    return {
      items: items.map((product) => ({
        ...product,
        department: this.getAdminProductDepartment(product.category),
        productType: product.category,
      })),
      pagination: {
        page: safePage,
        limit,
        totalItems,
        totalPages,
      },
    };
  }

  private resolveAdminInventoryCategories(category: string, productType: string) {
    const normalizedType = productType.trim().toUpperCase();
    const normalizedCategory = category.trim().toUpperCase();
    const allTypes = new Set(Object.values(this.adminProductGroups).flat());

    if (normalizedType && normalizedType !== 'ALL' && allTypes.has(normalizedType)) {
      return [normalizedType];
    }

    if (normalizedCategory && normalizedCategory !== 'ALL') {
      if (this.adminProductGroups[normalizedCategory]) {
        return this.adminProductGroups[normalizedCategory];
      }
      if (allTypes.has(normalizedCategory)) {
        return [normalizedCategory];
      }
    }

    return [];
  }

  private getAdminProductDepartment(productType: string) {
    return (
      Object.entries(this.adminProductGroups).find(([, types]) =>
        types.includes(productType),
      )?.[0] ?? productType
    );
  }

  private async findAllWithPublicSearch(query: ProductQuery, page: number, limit: number) {
    const search = this.getPublicSearchQuery(query) || '';
    const expansion = expandProductSearchQuery(search);
    const where = this.buildProductWhere(this.omitSearchQuery(query));
    const orderBy = this.buildProductOrderBy(query);
    const candidates = await this.prisma.product.findMany({
      where,
      include: this.productInclude,
      orderBy,
      take: 1000,
    });

    const rankedItems = this.rankSearchCandidates(candidates, expansion);
    const total = rankedItems.length;
    const start = (page - 1) * limit;
    const items = rankedItems.slice(start, start + limit);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private rankSearchCandidates(products: any[], expansion: ProductSearchExpansion) {
    return products
      .map((product, index) => ({
        product,
        index,
        score: rankProductMatch(product, expansion),
      }))
      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score || left.index - right.index)
      .map((entry) => entry.product);
  }

  private omitSearchQuery(query: ProductQuery): ProductQuery {
    const { search: _search, query: _query, ...rest } = query;
    return rest;
  }

  private getPublicSearchQuery(query: ProductQuery) {
    return this.getQueryString(query, 'search') || this.getQueryString(query, 'query');
  }

  async getFilterOptions(query: ProductQuery = {}) {
    const category =
      this.getQueryString(query, 'category') || this.getQueryString(query, 'productType');
    const categories = this.getQueryList(query, 'categories');
    const products = await this.prisma.product.findMany({
      where: category
        ? { category }
        : categories.length > 0
          ? { category: { in: categories } }
          : {},
      include: this.productInclude,
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    const unique = (values: any[]) =>
      Array.from(
        new Set(
          values
            .flat()
            .map((value) => (value === null || value === undefined ? '' : String(value).trim()))
            .filter(Boolean),
        ),
      ).sort((a, b) => a.localeCompare(b));

    const prices = products
      .map((product) => Number(product.price))
      .filter((value) => Number.isFinite(value));

    return {
      categories: unique(products.map((product) => product.category)),
      brands: unique([
        ...products.map((product: any) => product.cpuSpecs?.brand),
        ...products.map((product: any) => product.motherboardSpecs?.brand),
        ...products.map((product: any) => product.gpuSpecs?.brand),
        ...products.map((product: any) => product.caseSpecs?.brand),
        ...products.map((product: any) => product.coolerSpecs?.brand),
        ...products.map((product: any) => product.psuSpecs?.brand),
        ...products.map((product: any) => product.laptopSpecs?.brand),
        ...products.map((product: any) => product.monitorSpecs?.brand),
        ...products.map((product: any) => product.keyboardSpecs?.brand),
        ...products.map((product: any) => product.mouseSpecs?.brand),
        ...products.map((product: any) => product.webcamSpecs?.brand),
        ...products.map((product: any) => product.captureCardSpecs?.brand),
        ...products.map((product: any) => product.cableHubSpecs?.brand),
        ...products.map((product: any) => product.laptopCoolingBaseSpecs?.brand),
        ...products.map((product: any) => product.backpackSpecs?.brand),
        ...products.map((product: any) => product.headsetSpecs?.brand),
        ...products.map((product: any) => product.mousepadSpecs?.brand),
        ...products.map((product: any) => product.chairSpecs?.brand),
        ...products.map((product: any) => product.gamingDeskSpecs?.brand),
      ]),
      sockets: unique([
        ...products.map((product: any) => product.cpuSpecs?.socket),
        ...products.map((product: any) => product.motherboardSpecs?.socket),
        ...products.flatMap((product: any) => product.coolerSpecs?.compatibleSockets ?? []),
      ]),
      cpuBrands: unique(products.map((product: any) => product.cpuSpecs?.brand)),
      ramTypes: unique([
        ...products.map((product: any) => product.ramSpecs?.memoryType),
        ...products.map((product: any) => product.motherboardSpecs?.memoryType),
      ]),
      capacities: unique([
        ...products.map((product: any) => product.ramSpecs?.capacity),
        ...products.map((product: any) => product.storageSpecs?.capacity),
      ]),
      gpuChipsets: unique(products.map((product: any) => product.gpuSpecs?.chipset)),
      vram: unique(products.map((product: any) => product.gpuSpecs?.vram)),
      psuWatts: unique([
        ...products.map((product: any) => product.psuSpecs?.wattage),
        ...products.map((product: any) => product.desktopSpecs?.psuWatts),
      ]),
      certifications: unique(products.map((product: any) => product.psuSpecs?.certification)),
      coolerTypes: unique([
        ...products.map((product: any) => product.coolerSpecs?.type),
        ...products.map((product: any) => product.desktopSpecs?.coolerType),
      ]),
      storageTypes: unique(products.map((product: any) => product.storageSpecs?.type)),
      m2FormFactors: unique([
        ...products.map((product: any) => product.storageSpecs?.m2FormFactor),
        ...products.flatMap(
          (product: any) => product.motherboardSpecs?.supportedM2FormFactors ?? [],
        ),
      ]),
      resolutions: unique([
        ...products.map((product: any) => product.monitorSpecs?.resolution),
        ...products.map((product: any) => product.webcamSpecs?.resolution),
        ...products.map((product: any) => product.captureCardSpecs?.resolution),
      ]),
      fps: unique([
        ...products.map((product: any) => product.webcamSpecs?.fps),
        ...products.map((product: any) => product.captureCardSpecs?.fps),
      ]),
      cableHubTypes: unique(products.map((product: any) => product.cableHubSpecs?.type)),
      panels: unique(products.map((product: any) => product.monitorSpecs?.panelType)),
      refreshRates: unique([
        ...products.map((product: any) => product.monitorSpecs?.refreshRate),
        ...products.map((product: any) => product.laptopSpecs?.refreshRate),
      ]),
      ports: unique(products.flatMap((product: any) => product.monitorSpecs?.ports ?? [])),
      keyboardTypes: unique(products.map((product: any) => product.keyboardSpecs?.keyboardType)),
      connections: unique([
        ...products.flatMap((product: any) => product.keyboardSpecs?.connections ?? []),
        ...products.flatMap((product: any) => product.mouseSpecs?.connections ?? []),
      ]),
      mouseTypes: unique(products.map((product: any) => product.mouseSpecs?.mouseType)),
      colors: unique([
        ...products.map((product: any) => product.chairSpecs?.color),
        ...products.map((product: any) => product.gamingDeskSpecs?.color),
      ]),
      materials: unique(products.map((product: any) => product.chairSpecs?.material)),
      surfaces: unique(products.map((product: any) => product.gamingDeskSpecs?.surface)),
      priceRange: {
        min: prices.length ? Math.min(...prices) : null,
        max: prices.length ? Math.max(...prices) : null,
      },
      inStockCount: products.filter((product) => product.stock > 0).length,
      onSaleCount: products.filter((product) => product.isOnSale).length,
      total: products.length,
    };
  }

  findOne(id: string) {
    return this.prisma.product.findUnique({
      where: { id },
      include: this.productInclude,
    });
  }

  findBySlug(slug: string) {
    return this.prisma.product.findUnique({
      where: { slug },
      include: this.productInclude,
    });
  }

  findByIdOrSlug(identifier: string) {
    const where = this.isUuid(identifier) ? { id: identifier } : { slug: identifier };

    return this.prisma.product.findUnique({
      where,
      include: this.productInclude,
    });
  }

  private isUuid(value: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }

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
      const maxCoolerHeight = this.relatedNumber(current.caseSpecs?.maxCoolerHeight);
      const radiators = this.relatedCaseRadiators(current);
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
        return (
          !maxCoolerHeight ||
          this.relatedNumber(product.coolerSpecs?.coolerHeight) <= maxCoolerHeight
        );
      });
    }

    if (currentCategory === 'COOLER') {
      const sockets = this.relatedCoolerSockets(current);
      const coolerHeight = this.relatedNumber(current.coolerSpecs?.coolerHeight);
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
        const maxCoolerHeight = this.relatedNumber(product.caseSpecs?.maxCoolerHeight);
        return !coolerHeight || !maxCoolerHeight || coolerHeight <= maxCoolerHeight;
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

  async update(id: string, data: UpdateProductDto, actorId?: string) {
    const currentProduct = await this.findProductForUpdateOrThrow(id);
    const normalizedData = { ...data };
    if (data.sku !== undefined) {
      normalizedData.sku = this.validation.normalizeAndValidateSku(data.sku);
      await this.validation.ensureSkuIsAvailable(normalizedData.sku, id);
    }
    if (data.name !== undefined && String(data.name).trim() !== currentProduct.name) {
      (normalizedData as UpdateProductDto & { slug?: string }).slug = await this.buildUniqueSlug(
        data.name,
        id,
      );
    }

    const updateData = this.buildProductUpdateData(currentProduct, normalizedData);
    const specUpdate = this.specs.buildSpecUpdate(currentProduct, normalizedData);

    if (Object.keys(updateData).length === 0 && Object.keys(specUpdate).length === 0) {
      throw new BadRequestException('Debes enviar al menos un campo valido para actualizar');
    }

    const updatedProduct = await this.persistUpdatedProduct(id, updateData, specUpdate);

    if (actorId) {
      await this.logProductChanges(actorId, currentProduct, updatedProduct, updateData);
    }

    return updatedProduct;
  }

  private async findProductForUpdateOrThrow(id: string) {
    const currentProduct = await this.prisma.product.findUnique({
      where: { id },
      include: {
        cpuSpecs: true,
        motherboardSpecs: true,
        gpuSpecs: true,
        caseSpecs: true,
        coolerSpecs: true,
        storageSpecs: true,
        laptopSpecs: true,
        desktopSpecs: true,
        monitorSpecs: true,
        keyboardSpecs: true,
        mouseSpecs: true,
        mousepadSpecs: true,
        chairSpecs: true,
        gamingDeskSpecs: true,
        webcamSpecs: true,
        captureCardSpecs: true,
        cableHubSpecs: true,
        laptopCoolingBaseSpecs: true,
        backpackSpecs: true,
      },
    });
    if (!currentProduct) {
      throw new BadRequestException('Producto no encontrado');
    }

    return currentProduct;
  }

  private async persistUpdatedProduct(id: string, updateData: any, specUpdate: any) {
    try {
      return await this.prisma.product.update({
        where: { id },
        data: {
          ...updateData,
          ...specUpdate,
        },
        include: {
          cpuSpecs: true,
          motherboardSpecs: true,
          gpuSpecs: true,
          caseSpecs: true,
          coolerSpecs: true,
          storageSpecs: true,
          laptopSpecs: true,
          desktopSpecs: true,
          monitorSpecs: true,
          keyboardSpecs: true,
          mouseSpecs: true,
          mousepadSpecs: true,
          chairSpecs: true,
          gamingDeskSpecs: true,
        },
      });
    } catch (error) {
      this.handlePrismaProductWriteError(error);
    }
  }

  private buildProductUpdateData(currentProduct: any, data: UpdateProductDto) {
    const updateData: any = {};
    this.applyBasicProductUpdate(updateData, data);
    this.applyPricingProductUpdate(updateData, currentProduct, data);
    this.applyStockProductUpdate(updateData, data);
    this.applyImageProductUpdate(updateData, data);

    return updateData;
  }

  private applyBasicProductUpdate(updateData: any, data: UpdateProductDto) {
    if (data.sku !== undefined) {
      updateData.sku = data.sku;
    }

    const dataWithSlug = data as UpdateProductDto & { slug?: string };
    if (dataWithSlug.slug !== undefined) {
      updateData.slug = dataWithSlug.slug;
    }

    if (data.name !== undefined) {
      updateData.name = data.name;
    }

    if (data.description !== undefined) {
      const description = String(data.description).trim();
      this.validation.validateDescription(description);
      updateData.description = description;
    }

    if (data.category !== undefined) {
      updateData.category = data.category;
    }

    if (data.price !== undefined) {
      updateData.price = this.payload.toFloat(data.price);
    }
  }

  private applyPricingProductUpdate(updateData: any, currentProduct: any, data: UpdateProductDto) {
    if (data.isOnSale !== undefined && !this.payload.toBool(data.isOnSale)) {
      updateData.isOnSale = false;
      updateData.salePrice = null;
    } else if (
      data.isOnSale !== undefined ||
      data.salePrice !== undefined ||
      data.price !== undefined
    ) {
      const nextPrice =
        data.price !== undefined ? this.payload.toFloat(data.price) : this.payload.toFloat(currentProduct.price);
      const nextIsOnSale =
        data.isOnSale !== undefined
          ? this.payload.toBool(data.isOnSale)
          : this.payload.toBool(currentProduct.isOnSale);
      const nextSalePrice =
        data.salePrice !== undefined ? data.salePrice : currentProduct.salePrice;
      const sale = this.pricing.validateSale(nextPrice, nextIsOnSale, nextSalePrice);
      updateData.isOnSale = sale.isOnSale;
      updateData.salePrice = sale.salePrice;
    }
  }

  private applyStockProductUpdate(updateData: any, data: UpdateProductDto) {
    if (data.stock !== undefined) {
      updateData.stock = this.payload.toInt(data.stock);
    }
  }

  private applyImageProductUpdate(updateData: any, data: UpdateProductDto) {
    if (data.images !== undefined) {
      if (!Array.isArray(data.images) || data.images.length > 5) {
        throw new BadRequestException('El producto puede tener como maximo 5 imagenes');
      }

      updateData.images = data.images.filter((image) => String(image).trim());
    }
  }

  private validateCpuBrandSocket(brand: string, socket: string) {
    const socketsByBrand: Record<string, string[]> = {
      AMD: ['AM4', 'AM5', 'sTR4', 'sTRX4', 'sWRX8', 'sTR5'],
      Intel: ['LGA 1200', 'LGA 1700', 'LGA 1851'],
    };

    if (!brand || !socketsByBrand[brand]) {
      throw new BadRequestException('La marca del procesador es obligatoria');
    }

    if (!socketsByBrand[brand].includes(socket)) {
      throw new BadRequestException('El socket no corresponde a la marca del procesador');
    }
  }

  async remove(id: string, actorId?: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new BadRequestException('Producto no encontrado');
    }

    const deleted = await this.prisma.product.delete({ where: { id } });

    if (actorId) {
      await this.audit.log({
        actorId,
        action: 'DELETE_PRODUCT',
        module: 'PRODUCTS',
        entityType: 'PRODUCT',
        entityId: product.id,
        entityName: product.name,
        description: `Se elimino el producto ${product.name}.`,
      });
    }

    return deleted;
  }

  private async logProductChanges(actorId: string, before: any, after: any, updateData: any) {
    const logs = this.collectProductChangeLogs(before, after, updateData);

    for (const log of logs) {
      await this.audit.log({
        actorId,
        entityType: 'PRODUCT',
        entityId: after.id,
        entityName: after.name,
        ...log,
      });
    }
  }

  private collectProductChangeLogs(before: any, after: any, updateData: any) {
    return [
      ...this.collectBasicProductChangeLogs(before, after, updateData),
      ...this.collectPricingProductChangeLogs(before, after, updateData),
      ...this.collectStockProductChangeLogs(before, after, updateData),
      ...this.collectImageProductChangeLogs(before, after, updateData),
      ...this.collectSpecProductChangeLogs(before, after),
    ];
  }

  private collectBasicProductChangeLogs(
    before: any,
    after: any,
    updateData: any,
  ): ProductChangeLog[] {
    const logs: ProductChangeLog[] = [];
    this.addChangeIfDifferent(
      logs,
      updateData,
      'sku',
      'UPDATE_PRODUCT_SKU',
      before.sku,
      after.sku,
      `Cambio el SKU de ${after.name} de ${before.sku} a ${after.sku}.`,
    );
    this.addChangeIfDifferent(
      logs,
      updateData,
      'name',
      'UPDATE_PRODUCT',
      before.name,
      after.name,
      `Cambio el nombre de ${before.name} a ${after.name}.`,
    );
    this.addChangeIfDifferent(
      logs,
      updateData,
      'description',
      'UPDATE_PRODUCT_DESCRIPTION',
      before.description,
      after.description,
      `Modifico la descripcion del producto ${after.name}.`,
    );
    this.addChangeIfDifferent(
      logs,
      updateData,
      'category',
      'UPDATE_PRODUCT_CATEGORY',
      before.category,
      after.category,
      `Cambio la categoria de ${after.name} de ${before.category} a ${after.category}.`,
    );
    return logs;
  }

  private collectPricingProductChangeLogs(
    before: any,
    after: any,
    updateData: any,
  ): ProductChangeLog[] {
    const logs: ProductChangeLog[] = [];
    this.addChangeIfDifferent(
      logs,
      updateData,
      'price',
      'UPDATE_PRICE',
      String(before.price),
      String(after.price),
      `Cambio el precio de ${after.name} de S/. ${before.price} a S/. ${after.price}.`,
      'INVENTORY',
    );

    if ('isOnSale' in updateData) {
      const action = after.isOnSale ? 'ENABLE_PRODUCT_SALE' : 'DISABLE_PRODUCT_SALE';
      const description = after.isOnSale
        ? `Se activo oferta para ${after.name}.`
        : `Se desactivo oferta para ${after.name}.`;
      this.pushChangeIfDifferent(
        logs,
        'isOnSale',
        action,
        before.isOnSale,
        after.isOnSale,
        description,
      );
    }

    this.addChangeIfDifferent(
      logs,
      updateData,
      'salePrice',
      'UPDATE_SALE_PRICE',
      before.salePrice === null || before.salePrice === undefined ? null : String(before.salePrice),
      after.salePrice === null || after.salePrice === undefined ? null : String(after.salePrice),
      `Cambio el precio de oferta de ${after.name} de S/. ${before.salePrice ?? 'sin oferta'} a S/. ${after.salePrice ?? 'sin oferta'}.`,
      'INVENTORY',
    );
    return logs;
  }

  private collectStockProductChangeLogs(
    before: any,
    after: any,
    updateData: any,
  ): ProductChangeLog[] {
    if (!('stock' in updateData) || before.stock === after.stock) {
      return [];
    }

    return [
      {
        action: 'UPDATE_STOCK',
        module: 'INVENTORY',
        fieldName: 'stock',
        oldValue: before.stock,
        newValue: after.stock,
        stockBefore: before.stock,
        stockAfter: after.stock,
        description: `Cambio el stock de ${after.name} de ${before.stock} a ${after.stock}.`,
      },
    ];
  }

  private collectImageProductChangeLogs(
    before: any,
    after: any,
    updateData: any,
  ): ProductChangeLog[] {
    if (!('images' in updateData)) {
      return [];
    }

    const beforeImages = Array.isArray(before.images) ? before.images : [];
    const afterImages = Array.isArray(after.images) ? after.images : [];
    const added = afterImages.filter((image) => !beforeImages.includes(image));
    const removed = beforeImages.filter((image) => !afterImages.includes(image));

    return [
      ...added.map((image) => ({
        action: 'ADD_PRODUCT_IMAGE',
        module: 'PRODUCTS',
        fieldName: 'images',
        oldValue: null,
        newValue: image,
        description: `Agrego una imagen al producto ${after.name}.`,
      })),
      ...removed.map((image) => ({
        action: 'REMOVE_PRODUCT_IMAGE',
        module: 'PRODUCTS',
        fieldName: 'images',
        oldValue: image,
        newValue: null,
        description: `Elimino una imagen del producto ${after.name}.`,
      })),
    ];
  }

  private collectSpecProductChangeLogs(before: any, after: any): ProductChangeLog[] {
    const specRelation = this.getSpecRelationByCategory(after.category);
    if (
      !specRelation ||
      JSON.stringify(before[specRelation]) === JSON.stringify(after[specRelation])
    ) {
      return [];
    }

    return [
      {
        action: 'UPDATE_PRODUCT_SPECS',
        module: 'PRODUCTS',
        fieldName: 'technicalSpecs',
        oldValue: JSON.stringify(before[specRelation]),
        newValue: JSON.stringify(after[specRelation]),
        description: `Modifico especificaciones tecnicas del producto ${after.name}.`,
      },
    ];
  }

  private addChangeIfDifferent(
    logs: ProductChangeLog[],
    updateData: any,
    fieldName: string,
    action: string,
    oldValue: any,
    newValue: any,
    description: string,
    module = 'PRODUCTS',
  ) {
    if (!(fieldName in updateData)) {
      return;
    }

    this.pushChangeIfDifferent(logs, fieldName, action, oldValue, newValue, description, module);
  }

  private pushChangeIfDifferent(
    logs: ProductChangeLog[],
    fieldName: string,
    action: string,
    oldValue: any,
    newValue: any,
    description: string,
    module = 'PRODUCTS',
  ) {
    if (JSON.stringify(oldValue) === JSON.stringify(newValue)) {
      return;
    }

    logs.push({ action, module, fieldName, oldValue, newValue, description });
  }

  private getSpecRelationByCategory(category: string): string | undefined {
    const specRelationByCategory: Record<string, string> = {
      CPU: 'cpuSpecs',
      MOTHERBOARD: 'motherboardSpecs',
      COOLER: 'coolerSpecs',
      STORAGE: 'storageSpecs',
      LAPTOP: 'laptopSpecs',
      PC_DESKTOP: 'desktopSpecs',
      MONITOR: 'monitorSpecs',
      KEYBOARD: 'keyboardSpecs',
      MOUSE: 'mouseSpecs',
      HEADSET: 'headsetSpecs',
      MICROPHONE: 'microphoneSpecs',
      SPEAKER: 'speakerSpecs',
      WEBCAM: 'webcamSpecs',
      CAPTURE_CARD: 'captureCardSpecs',
      CABLE_HUB: 'cableHubSpecs',
      LAPTOP_COOLING_BASE: 'laptopCoolingBaseSpecs',
      BACKPACK: 'backpackSpecs',
      MOUSEPAD: 'mousepadSpecs',
      CHAIR: 'chairSpecs',
      GAMING_DESK: 'gamingDeskSpecs',
    };

    return specRelationByCategory[category];
  }
}
