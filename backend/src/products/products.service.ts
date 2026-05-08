import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { AuditService } from '../audit/audit.service';
import { ProductPricingService } from './services/product-pricing.service';

type ProductQuery = Record<string, string | string[] | undefined>;

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly pricing: ProductPricingService,
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
  } satisfies Prisma.ProductInclude;

  private readonly nameRegex = /^[A-Za-zÁÉÍÓÚáéíóúÑñ0-9().,+\-/%\s]{10,120}$/;
  private readonly descriptionRegex =
    /^[A-Za-zÁÉÍÓÚáéíóúÑñ0-9().,;:+\-/%\s]{20,1200}$/;

  private toInt(val: any): number {
    const n = parseInt(val);
    return isNaN(n) ? 0 : n;
  }

  private toFloat(val: any): number {
    const n = parseFloat(val);
    return isNaN(n) ? 0 : n;
  }

  private toBool(val: any): boolean {
    return String(val) === 'true';
  }

  private toStringArray(val: any): string[] {
    if (!val) return [];
    if (Array.isArray(val)) return val.map((item) => String(item).trim()).filter(Boolean);
    try {
      const parsed = JSON.parse(String(val));
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter(Boolean);
      }
    } catch {
      return String(val).split(',').map((item) => item.trim()).filter(Boolean);
    }
    return [];
  }

  private buildSlug(name: string) {
    const baseSlug = name
      .toLowerCase()
      .trim()
      .replace(/ /g, '-')
      .replace(/[^\w-]+/g, '');

    return `${baseSlug || 'producto'}-${Date.now()}`;
  }

  private ensureNonNegative(field: string, value: any, allowZero = true) {
    if (value === '' || value === undefined || value === null) {
      return;
    }

    const numericValue = Number(value);
    if (Number.isNaN(numericValue)) {
      throw new BadRequestException(`El campo ${field} debe ser numerico`);
    }

    if (allowZero ? numericValue < 0 : numericValue <= 0) {
      throw new BadRequestException(
        `El campo ${field} ${allowZero ? 'no puede ser negativo' : 'debe ser mayor a 0'}`,
      );
    }
  }

  private ensureNoNegativeText(field: string, value: any) {
    if (value === '' || value === undefined || value === null) {
      return;
    }

    if (String(value).includes('-')) {
      throw new BadRequestException(
        `El campo ${field} no puede contener valores negativos`,
      );
    }
  }

  private validateCommonFields(data: any, finalImages: string[]) {
    const trimmedName = String(data.name ?? '').trim();
    const trimmedDescription = String(data.description ?? '').trim();

    if (!this.nameRegex.test(trimmedName)) {
      throw new BadRequestException(
        'El nombre debe tener entre 5 y 120 caracteres y solo usar letras, numeros y signos comunes',
      );
    }

    if (!this.descriptionRegex.test(trimmedDescription)) {
      throw new BadRequestException(
        'La descripcion debe tener entre 20 y 1200 caracteres y solo usar texto valido',
      );
    }

    if (finalImages.length < 1 || finalImages.length > 5) {
      throw new BadRequestException('Debes subir entre 1 y 5 imagenes');
    }

    this.ensureNonNegative('price', data.price, false);
    this.ensureNonNegative('stock', data.stock);

    if (!Number.isInteger(Number(data.stock))) {
      throw new BadRequestException('El campo stock debe ser un numero entero');
    }
  }

  private validateCategoryFields(category: string, data: any) {
    const fieldsByCategory: Record<string, string[]> = {
      CPU: ['cores', 'tdp'],
      MOTHERBOARD: ['memorySlots', 'm2Slots'],
      RAM: ['capacity', 'speed', 'modules'],
      GPU: ['vram', 'length', 'tdp', 'fans'],
      PSU: ['wattage'],
      CASE: ['maxGpuLength', 'includedFans'],
      COOLER: ['fanCount', 'radiatorSize'],
      STORAGE: ['capacity', 'readSpeed', 'writeSpeed'],
      LAPTOP: ['refreshRate'],
      PC_DESKTOP: ['psuWatts'],
      SOFTWARE: [],
      MONITOR: ['refreshRate', 'responseTimeMs'],
      KEYBOARD: [],
      MOUSE: ['weightGrams'],
      MOUSEPAD: ['widthCm', 'lengthCm'],
      CHAIR: ['maxWeightKg'],
      GAMING_DESK: ['weightKg'],
      HEADSET: ['driverSize', 'impedance'],
      MICROPHONE: [],
      SPEAKER: ['wattage'],
    };

    for (const field of fieldsByCategory[category] || []) {
      this.ensureNonNegative(field, data[field]);
    }

    if (category === 'MOUSE' && data.mouseType === 'Gamer') {
      for (const field of ['dpi', 'buttonCount']) {
        this.ensureNonNegative(field, data[field]);
      }
    }

    const textFieldsByCategory: Record<string, string[]> = {
      CPU: ['frequency'],
      MOTHERBOARD: [],
      RAM: [],
      GPU: [],
      PSU: [],
      CASE: [],
      COOLER: [],
      STORAGE: [],
      LAPTOP: [],
      PC_DESKTOP: [],
      SOFTWARE: [],
      MONITOR: [],
      KEYBOARD: [],
      MOUSE: [],
      MOUSEPAD: [],
      CHAIR: [],
      GAMING_DESK: [],
      HEADSET: [],
      MICROPHONE: [],
      SPEAKER: [],
    };

    for (const field of textFieldsByCategory[category] || []) {
      this.ensureNoNegativeText(field, data[field]);
    }

    if (category === 'CPU') {
      const brand = String(data.cpuBrand || '').trim();
      const socket = String(data.socket || '').trim();
      const socketsByBrand: Record<string, string[]> = {
        AMD: ['AM4', 'AM5'],
        Intel: ['LGA 1200', 'LGA 1700', 'LGA 1851'],
      };

      if (!brand || !socketsByBrand[brand]) {
        throw new BadRequestException('La marca del procesador es obligatoria');
      }

      if (!socketsByBrand[brand].includes(socket)) {
        throw new BadRequestException('El socket no corresponde a la marca del procesador');
      }
    }

    if (category === 'COOLER') {
      const compatibleSockets = this.toStringArray(data.compatibleSockets);
      if (compatibleSockets.length === 0) {
        throw new BadRequestException('Debes registrar sockets compatibles del cooler');
      }

      if (this.toInt(data.tdpCapacity) <= 0) {
        throw new BadRequestException('El TDP soportado del cooler debe ser mayor a 0');
      }
    }

    if (category === 'STORAGE') {
      const storageType = String(data.type || '').toUpperCase();
      const isM2 = storageType.includes('M.2') || storageType.includes('NVME');
      if (isM2 && !data.m2FormFactor) {
        throw new BadRequestException('El tamaño fisico M.2 es obligatorio para almacenamientos M.2');
      }
    }

    if (category === 'MONITOR') {
      const ports = this.toStringArray(data.ports);
      const allowedPorts = ['VGA', 'HDMI', 'DisplayPort', 'USB-C'];
      const invalidPort = ports.find((port) => !allowedPorts.includes(port));
      if (invalidPort) {
        throw new BadRequestException('Puerto de monitor no valido');
      }
    }

    if (category === 'PC_DESKTOP' && data.psuWatts !== undefined && data.psuWatts !== '') {
      this.ensureNonNegative('psuWatts', data.psuWatts, false);
    }

    const validConnections = ['Cableado', 'Bluetooth', 'Dongle USB'];
    if ((category === 'KEYBOARD' || category === 'MOUSE') && data.connections !== undefined) {
      const invalidConnection = this.toStringArray(data.connections).find((connection) => !validConnections.includes(connection));
      if (invalidConnection) {
        throw new BadRequestException('Tipo de conexion no valido');
      }
    }

    if (category === 'KEYBOARD') {
      const keyboardType = String(data.keyboardType || '').trim();
      if (keyboardType && !['Membrana', 'Semi-mecanico', 'Mecanico', 'Magnetico'].includes(keyboardType)) {
        throw new BadRequestException('Tipo de teclado no valido');
      }
    }

    if (category === 'MOUSE') {
      const mouseType = String(data.mouseType || '').trim();
      if (mouseType && !['Oficina', 'Gamer'].includes(mouseType)) {
        throw new BadRequestException('Tipo de mouse no valido');
      }
      if (mouseType === 'Gamer' && data.pollingRateHz !== undefined && ![1000, 2000, 4000, 8000].includes(this.toInt(data.pollingRateHz))) {
        throw new BadRequestException('Frecuencia de mouse no valida');
      }
      if (data.powerType !== undefined && !['Pila', 'Bateria', 'Ninguno'].includes(String(data.powerType))) {
        throw new BadRequestException('Tipo de energia de mouse no valido');
      }
    }
  }

  async create(data: CreateProductDto & { uploadedImages?: string[] }, actorId?: string) {
    if (!data.name || !data.category) {
      throw new BadRequestException('Nombre y categoria son obligatorios');
    }

    const finalImages: string[] =
      data.uploadedImages && data.uploadedImages.length > 0
        ? data.uploadedImages
        : data.image
          ? [data.image]
          : [];

    this.validateCommonFields(data, finalImages);
    this.validateCategoryFields(data.category, data);

    const productData: any = {
      name: String(data.name).trim(),
      description: String(data.description || '').trim(),
      price: this.toFloat(data.price),
      isOnSale: false,
      salePrice: null,
      stock: this.toInt(data.stock),
      category: data.category,
      images: finalImages,
      slug: this.buildSlug(data.name),
      sku: `${data.category}-${Date.now()}`,
    };

    switch (data.category) {
      case 'CPU':
        productData.cpuSpecs = {
          create: {
            brand: data.cpuBrand || 'AMD',
            socket: data.socket || 'N/A',
            cores: this.toInt(data.cores),
            threads: this.toInt(data.threads),
            frequency: data.frequency || '',
            tdp: this.toInt(data.tdp),
            integratedGraphics: this.toBool(data.integratedGraphics),
            includesCooler: this.toBool(data.includesCooler),
          },
        };
        break;

      case 'MOTHERBOARD':
        productData.motherboardSpecs = {
          create: {
            socket: data.socket || 'N/A',
            formFactor: data.formFactor || 'ATX',
            memoryType: data.memoryType || 'DDR4',
            memorySlots: this.toInt(data.memorySlots),
            m2Slots: this.toInt(data.m2Slots),
            supportedM2FormFactors: this.toStringArray(data.supportedM2FormFactors),
          },
        };
        break;

      case 'RAM':
        productData.ramSpecs = {
          create: {
            memoryType: data.memoryType || 'DDR4',
            capacity: this.toInt(data.capacity),
            speed: this.toInt(data.speed),
            modules: this.toInt(data.modules),
            hasRGB: this.toBool(data.hasRGB),
          },
        };
        break;

      case 'GPU':
        productData.gpuSpecs = {
          create: {
            chipset: data.chipset || 'N/A',
            vram: this.toInt(data.vram),
            length: this.toInt(data.length),
            tdp: this.toInt(data.tdp),
            fans: this.toInt(data.fans),
          },
        };
        break;

      case 'PSU':
        productData.psuSpecs = {
          create: {
            wattage: this.toInt(data.wattage),
            certification: data.certification || 'None',
            modular: data.modular || 'No',
            formFactor: data.formFactor || 'ATX',
          },
        };
        break;

      case 'CASE':
        productData.caseSpecs = {
          create: {
            formFactor: data.formFactor || 'ATX',
            maxGpuLength: this.toInt(data.maxGpuLength),
            includesPsu: this.toBool(data.includesPsu),
            includedFans: this.toInt(data.includedFans),
          },
        };
        break;

      case 'COOLER':
        productData.coolerSpecs = {
          create: {
            type: data.type || 'AIR',
            socketSupport: this.toStringArray(data.compatibleSockets).join(', '),
            compatibleSockets: this.toStringArray(data.compatibleSockets),
            fanCount: this.toInt(data.fanCount),
            radiatorSize: this.toInt(data.radiatorSize),
            hasScreen: this.toBool(data.hasScreen),
            hasRGB: this.toBool(data.hasRGB),
            tdpCapacity: this.toInt(data.tdpCapacity),
            coolerHeight: this.toInt(data.coolerHeight),
          },
        };
        break;

      case 'STORAGE':
        productData.storageSpecs = {
          create: {
            type: data.type || 'SSD',
            capacity: this.toInt(data.capacity),
            interface: data.interface || 'SATA',
            readSpeed: this.toInt(data.readSpeed),
            writeSpeed: this.toInt(data.writeSpeed),
            m2FormFactor: data.m2FormFactor || null,
          },
        };
        break;

      case 'LAPTOP':
        productData.laptopSpecs = {
          create: {
            processor: data.processor || 'N/A',
            ram: data.ram || 'N/A',
            storage: data.storage || 'N/A',
            screenSize: data.screenSize || '15.6"',
            refreshRate: this.toInt(data.refreshRate),
            panelType: data.panelType || 'IPS',
            hasDedicatedGpu: this.toBool(data.hasDedicatedGpu),
            gpuBrand: data.gpuBrand || '',
            gpuModel: data.gpuModel || '',
            includesWindows: this.toBool(data.includesWindows),
          },
        };
        break;

      case 'PC_DESKTOP':
        productData.desktopSpecs = {
          create: {
            processor: data.processor || 'N/A',
            ram: data.ram || 'N/A',
            storage: data.storage || 'N/A',
            hasDedicatedGpu: this.toBool(data.hasDedicatedGpu),
            gpuBrand: data.gpuBrand || '',
            gpuModel: data.gpuModel || '',
            coolerType: data.coolerType || 'No especificado',
            psuWatts: data.psuWatts !== undefined ? this.toInt(data.psuWatts) : null,
            caseModel: data.caseModel || '',
          },
        };
        break;

      case 'SOFTWARE':
        productData.softwareSpecs = {
          create: {
            licenseType: data.licenseType || 'Permanente',
            platform: data.platform || 'Windows',
          },
        };
        break;

      case 'MONITOR':
        productData.monitorSpecs = {
          create: {
            screenSize: data.screenSize || '24"',
            resolution: data.resolution || '1080p',
            panelType: data.panelType || 'IPS',
            refreshRate: this.toInt(data.refreshRate),
            responseTimeMs: data.responseTimeMs !== undefined ? this.toFloat(data.responseTimeMs) : null,
            ports: this.toStringArray(data.ports),
            hasSpeakers: this.toBool(data.hasSpeakers),
          },
        };
        break;

      case 'KEYBOARD':
        productData.keyboardSpecs = {
          create: {
            connection: data.connection || this.toStringArray(data.connections).join(', ') || 'Cableado',
            switchType: data.switchType || '',
            layout: data.layoutLanguage || data.layout || 'Español',
            hasRGB: this.toBool(data.hasRGB || data.hasLighting),
            brand: data.brand || '',
            keyboardType: data.keyboardType || 'Membrana',
            connections: this.toStringArray(data.connections),
            layoutLanguage: data.layoutLanguage || 'Español',
            hasLighting: this.toBool(data.hasLighting),
            keyboardFormFactor: data.keyboardFormFactor || 'Completo',
            weightGrams: null,
          },
        };
        break;

      case 'MOUSE':
        const mouseType = data.mouseType || 'Oficina';
        const isGamerMouse = mouseType === 'Gamer';
        productData.mouseSpecs = {
          create: {
            connection: data.connection || this.toStringArray(data.connections).join(', ') || 'Cableado',
            dpi: isGamerMouse ? this.toInt(data.dpi) : 0,
            sensor: data.sensor || 'Optico',
            hasRGB: this.toBool(data.hasRGB),
            brand: data.brand || '',
            mouseType,
            connections: this.toStringArray(data.connections),
            buttonCount: isGamerMouse && data.buttonCount !== undefined ? this.toInt(data.buttonCount) : null,
            pollingRateHz: isGamerMouse && data.pollingRateHz !== undefined ? this.toInt(data.pollingRateHz) : null,
            weightGrams: data.weightGrams !== undefined ? this.toInt(data.weightGrams) : null,
            powerType: data.powerType || 'Ninguno',
          },
        };
        break;

      case 'MOUSEPAD':
        productData.mousepadSpecs = {
          create: {
            brand: data.brand || '',
            widthCm: data.widthCm !== undefined ? this.toInt(data.widthCm) : null,
            lengthCm: data.lengthCm !== undefined ? this.toInt(data.lengthCm) : null,
            hasLed: this.toBool(data.hasLed),
          },
        };
        break;

      case 'CHAIR':
        productData.chairSpecs = {
          create: {
            brand: data.brand || '',
            color: data.color || '',
            material: data.material || '',
            maxWeightKg: data.maxWeightKg !== undefined ? this.toInt(data.maxWeightKg) : null,
          },
        };
        break;

      case 'GAMING_DESK':
        productData.gamingDeskSpecs = {
          create: {
            brand: data.brand || '',
            color: data.color || '',
            surface: data.surface || '',
            weightKg: data.weightKg !== undefined ? this.toInt(data.weightKg) : null,
          },
        };
        break;

      case 'HEADSET':
        productData.headsetSpecs = {
          create: {
            connection: data.connection || '3.5mm',
            driverSize: this.toInt(data.driverSize) || 40,
            impedance: this.toInt(data.impedance) || 32,
            micType: data.micType || 'Estandar',
            noiseCancel: this.toBool(data.noiseCancel),
            hasRGB: this.toBool(data.hasRGB),
          },
        };
        break;

      case 'MICROPHONE':
        productData.microphoneSpecs = {
          create: {
            connection: data.connection || 'USB',
            micType: data.micType || 'Cardioide',
            hasRGB: this.toBool(data.hasRGB),
          },
        };
        break;

      case 'SPEAKER':
        productData.speakerSpecs = {
          create: {
            connection: data.connection || 'Jack',
            wattage: this.toInt(data.wattage),
            hasRGB: this.toBool(data.hasRGB),
          },
        };
        break;

      default:
        throw new BadRequestException(
          `Categoria no soportada: ${data.category}`,
        );
    }

    const product = await this.prisma.product.create({ data: productData });

    if (actorId) {
      await this.audit.log({
        actorId,
        action: 'CREATE_PRODUCT',
        module: 'PRODUCTS',
        entityType: 'PRODUCT',
        entityId: product.id,
        entityName: product.name,
        description: `Se creo el producto ${product.name}.`,
        metadata: { category: product.category, price: String(product.price), stock: product.stock },
      });
    }

    return product;
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
    if (value === undefined) return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private getQueryBoolean(query: ProductQuery, key: string): boolean | undefined {
    const value = this.getQueryString(query, key);
    if (value === undefined || value === 'all') return undefined;
    if (['true', '1', 'yes', 'si', 'sí'].includes(value.toLowerCase())) return true;
    if (['false', '0', 'no'].includes(value.toLowerCase())) return false;
    return undefined;
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
    if (!condition || Object.keys(condition).length === 0) return;
    where.AND = [...(where.AND ?? []), condition];
  }

  private textContains(value: string) {
    return { contains: value, mode: 'insensitive' as const };
  }

  private numberRange(query: ProductQuery, minKey: string, maxKey: string) {
    const min = this.getQueryNumber(query, minKey);
    const max = this.getQueryNumber(query, maxKey);
    const range: Record<string, number> = {};
    if (min !== undefined) range.gte = min;
    if (max !== undefined) range.lte = max;
    return Object.keys(range).length ? range : undefined;
  }

  private oneOfOrContains(query: ProductQuery, key: string, field: string) {
    const values = this.getQueryList(query, key);
    if (values.length === 0) return undefined;
    return values.length === 1
      ? { [field]: this.textContains(values[0]) }
      : { OR: values.map((value) => ({ [field]: this.textContains(value) })) };
  }

  private inferMotherboardSockets(platform?: string) {
    if (!platform) return undefined;
    if (platform.toUpperCase() === 'AMD') return ['AM4', 'AM5'];
    if (platform.toUpperCase() === 'INTEL') return ['LGA 1200', 'LGA 1700', 'LGA 1851'];
    return undefined;
  }

  private shouldApplySpecFilter(category: string | undefined, specCategory: string) {
    return category === specCategory;
  }

  private buildProductWhere(query: ProductQuery): Prisma.ProductWhereInput {
    const where: any = {};
    const search = this.getQueryString(query, 'search');
    const category = this.getQueryString(query, 'category') || this.getQueryString(query, 'productType');
    const categories = this.getQueryList(query, 'categories');

    if (category) {
      where.category = category;
    } else if (categories.length > 0) {
      where.category = { in: categories };
    }

    if (search) {
      this.addAnd(where, {
        OR: [
          { name: this.textContains(search) },
          { description: this.textContains(search) },
          { sku: this.textContains(search) },
          { cpuSpecs: { is: { brand: this.textContains(search) } } },
          { keyboardSpecs: { is: { brand: this.textContains(search) } } },
          { mouseSpecs: { is: { brand: this.textContains(search) } } },
          { mousepadSpecs: { is: { brand: this.textContains(search) } } },
          { chairSpecs: { is: { brand: this.textContains(search) } } },
          { gamingDeskSpecs: { is: { brand: this.textContains(search) } } },
        ],
      });
    }

    const priceRange = this.numberRange(query, 'minPrice', 'maxPrice');
    if (priceRange) where.price = priceRange;

    const inStock = this.getQueryBoolean(query, 'inStock');
    if (inStock !== undefined) where.stock = inStock ? { gt: 0 } : { lte: 0 };

    const isOnSale = this.getQueryBoolean(query, 'isOnSale');
    if (isOnSale !== undefined) where.isOnSale = isOnSale;

    const brand = this.getQueryString(query, 'brand');
    if (brand) {
      this.addAnd(where, {
        OR: [
          { name: this.textContains(brand) },
          { cpuSpecs: { is: { brand: this.textContains(brand) } } },
          { keyboardSpecs: { is: { brand: this.textContains(brand) } } },
          { mouseSpecs: { is: { brand: this.textContains(brand) } } },
          { mousepadSpecs: { is: { brand: this.textContains(brand) } } },
          { chairSpecs: { is: { brand: this.textContains(brand) } } },
          { gamingDeskSpecs: { is: { brand: this.textContains(brand) } } },
        ],
      });
    }

    this.addSpecFilters(where, query);
    return where;
  }

  private buildProductOrderBy(query: ProductQuery): Prisma.ProductOrderByWithRelationInput {
    const sortBy = this.getQueryString(query, 'sortBy') || 'createdAt';
    const sortOrder = this.getQueryString(query, 'sortOrder') === 'asc' ? 'asc' : 'desc';
    const allowedSorts = new Set(['price', 'name', 'createdAt', 'stock']);
    return { [allowedSorts.has(sortBy) ? sortBy : 'createdAt']: sortOrder };
  }

  private addSpecFilters(where: any, query: ProductQuery) {
    const targetCategory = this.getQueryString(query, 'category') || this.getQueryString(query, 'productType');
    const cpu: any = {};
    const cpuBrand = this.getQueryString(query, 'cpuBrand');
    const socket = this.getQueryString(query, 'socket');
    const cpuTdp = this.numberRange(query, 'minTdp', 'maxTdp');
    const integratedGraphics = this.getQueryBoolean(query, 'integratedGraphics');
    const includesCooler = this.getQueryBoolean(query, 'includesCooler');
    if (cpuBrand) cpu.brand = cpuBrand;
    if (socket) cpu.socket = socket;
    if (cpuTdp) cpu.tdp = cpuTdp;
    if (integratedGraphics !== undefined) cpu.integratedGraphics = integratedGraphics;
    if (includesCooler !== undefined) cpu.includesCooler = includesCooler;
    if (Object.keys(cpu).length && this.shouldApplySpecFilter(targetCategory, 'CPU')) this.addAnd(where, { cpuSpecs: { is: cpu } });

    const motherboard: any = {};
    const platformSockets = this.inferMotherboardSockets(this.getQueryString(query, 'platform'));
    const formFactor = this.getQueryString(query, 'formFactor') || this.getQueryString(query, 'format');
    const ramType = this.getQueryString(query, 'ramType') || this.getQueryString(query, 'memoryType');
    const m2Slots = this.getQueryNumber(query, 'm2Slots');
    if (socket) motherboard.socket = socket;
    if (!socket && platformSockets) motherboard.socket = { in: platformSockets };
    if (formFactor) motherboard.formFactor = formFactor;
    if (ramType) motherboard.memoryType = ramType;
    if (m2Slots !== undefined) motherboard.m2Slots = m2Slots >= 3 ? { gte: 3 } : m2Slots;
    if (Object.keys(motherboard).length && this.shouldApplySpecFilter(targetCategory, 'MOTHERBOARD')) this.addAnd(where, { motherboardSpecs: { is: motherboard } });

    const ram: any = {};
    const capacity = this.getQueryNumber(query, 'capacity');
    const speed = this.getQueryNumber(query, 'speed') || this.getQueryNumber(query, 'frequency');
    const hasRGB = this.getQueryBoolean(query, 'hasRGB') ?? this.getQueryBoolean(query, 'rgb');
    if (ramType) ram.memoryType = ramType;
    if (capacity !== undefined) ram.capacity = capacity;
    if (speed !== undefined) ram.speed = speed;
    if (hasRGB !== undefined) ram.hasRGB = hasRGB;
    if (Object.keys(ram).length && this.shouldApplySpecFilter(targetCategory, 'RAM')) this.addAnd(where, { ramSpecs: { is: ram } });

    const gpu: any = {};
    const gpuChipset = this.getQueryString(query, 'gpuChipset') || this.getQueryString(query, 'chipset');
    const vram = this.getQueryNumber(query, 'vram');
    const gpuTdp = this.numberRange(query, 'minGpuTdp', 'maxGpuTdp') || cpuTdp;
    if (gpuChipset) gpu.chipset = this.textContains(gpuChipset);
    if (vram !== undefined) gpu.vram = vram;
    if (gpuTdp) gpu.tdp = gpuTdp;
    if (Object.keys(gpu).length && this.shouldApplySpecFilter(targetCategory, 'GPU')) this.addAnd(where, { gpuSpecs: { is: gpu } });

    const psu: any = {};
    const psuWatts = this.getQueryNumber(query, 'psuWatts') || this.getQueryNumber(query, 'wattage');
    const certification = this.getQueryString(query, 'certification');
    const modular = this.getQueryString(query, 'modular');
    if (psuWatts !== undefined) psu.wattage = psuWatts >= 1000 ? { gte: 1000 } : psuWatts;
    if (certification) psu.certification = this.textContains(certification);
    if (modular) psu.modular = this.textContains(modular);
    if (Object.keys(psu).length && this.shouldApplySpecFilter(targetCategory, 'PSU')) this.addAnd(where, { psuSpecs: { is: psu } });

    const cooler: any = {};
    const coolerType = this.getQueryString(query, 'coolerType') || this.getQueryString(query, 'type');
    const maxTdpWatts = this.numberRange(query, 'minMaxTdp', 'maxMaxTdp') || this.numberRange(query, 'minMaxTdpWatts', 'maxMaxTdpWatts');
    const hasScreen = this.getQueryBoolean(query, 'hasScreen') ?? this.getQueryBoolean(query, 'hasLCD');
    const radiatorSize = this.getQueryNumber(query, 'radiatorSize');
    const compatibleSockets = this.getQueryList(query, 'compatibleSockets');
    if (coolerType) cooler.type = this.textContains(coolerType);
    if (maxTdpWatts) cooler.tdpCapacity = maxTdpWatts;
    if (hasRGB !== undefined) cooler.hasRGB = hasRGB;
    if (hasScreen !== undefined) cooler.hasScreen = hasScreen;
    if (radiatorSize !== undefined) cooler.radiatorSize = radiatorSize;
    if (compatibleSockets.length > 0) cooler.compatibleSockets = { hasSome: compatibleSockets };
    if (Object.keys(cooler).length && this.shouldApplySpecFilter(targetCategory, 'COOLER')) this.addAnd(where, { coolerSpecs: { is: cooler } });

    const storage: any = {};
    const storageType = this.getQueryString(query, 'storageType') || this.getQueryString(query, 'type');
    const generation = this.getQueryString(query, 'generation') || this.getQueryString(query, 'interface');
    const m2FormFactor = this.getQueryString(query, 'm2FormFactor');
    const readSpeed = this.numberRange(query, 'minReadSpeed', 'maxReadSpeed');
    const writeSpeed = this.numberRange(query, 'minWriteSpeed', 'maxWriteSpeed');
    if (storageType) storage.type = this.textContains(storageType);
    if (generation) storage.interface = this.textContains(generation);
    if (capacity !== undefined) storage.capacity = capacity >= 4000 ? { gte: 4000 } : capacity;
    if (m2FormFactor) storage.m2FormFactor = m2FormFactor;
    if (readSpeed) storage.readSpeed = readSpeed;
    if (writeSpeed) storage.writeSpeed = writeSpeed;
    if (Object.keys(storage).length && this.shouldApplySpecFilter(targetCategory, 'STORAGE')) this.addAnd(where, { storageSpecs: { is: storage } });

    const laptop: any = {};
    const processor = this.getQueryString(query, 'processor');
    const laptopRam = this.getQueryString(query, 'ram');
    const laptopStorage = this.getQueryString(query, 'storage');
    const hasDedicatedGpu = this.getQueryBoolean(query, 'hasDedicatedGpu');
    const includesWindows = this.getQueryBoolean(query, 'includesWindows');
    const screenSize = this.getQueryString(query, 'screenSize');
    const refreshRateHz = this.getQueryNumber(query, 'refreshRateHz') || this.getQueryNumber(query, 'refreshRate');
    if (processor) laptop.processor = this.textContains(processor);
    if (laptopRam) laptop.ram = this.textContains(laptopRam);
    if (laptopStorage) laptop.storage = this.textContains(laptopStorage);
    if (hasDedicatedGpu !== undefined) laptop.hasDedicatedGpu = hasDedicatedGpu;
    if (includesWindows !== undefined) laptop.includesWindows = includesWindows;
    if (screenSize) laptop.screenSize = this.textContains(screenSize);
    if (refreshRateHz !== undefined) laptop.refreshRate = refreshRateHz;
    if (Object.keys(laptop).length && this.shouldApplySpecFilter(targetCategory, 'LAPTOP')) this.addAnd(where, { laptopSpecs: { is: laptop } });

    const desktop: any = {};
    const desktopPsu = this.getQueryNumber(query, 'desktopPsuWatts') || psuWatts;
    if (processor) desktop.processor = this.textContains(processor);
    if (laptopRam) desktop.ram = this.textContains(laptopRam);
    if (laptopStorage) desktop.storage = this.textContains(laptopStorage);
    if (hasDedicatedGpu !== undefined) desktop.hasDedicatedGpu = hasDedicatedGpu;
    if (gpuChipset) desktop.gpuBrand = this.textContains(gpuChipset);
    if (coolerType) desktop.coolerType = this.textContains(coolerType);
    if (desktopPsu !== undefined) desktop.psuWatts = desktopPsu >= 850 ? { gte: 850 } : desktopPsu;
    if (Object.keys(desktop).length && this.shouldApplySpecFilter(targetCategory, 'PC_DESKTOP')) this.addAnd(where, { desktopSpecs: { is: desktop } });

    const monitor: any = {};
    const resolution = this.getQueryString(query, 'resolution');
    const panel = this.getQueryString(query, 'panel') || this.getQueryString(query, 'panelType');
    const responseTimeMs = this.getQueryNumber(query, 'responseTimeMs');
    const ports = this.getQueryList(query, 'ports');
    const hasSpeakers = this.getQueryBoolean(query, 'hasSpeakers');
    if (screenSize) monitor.screenSize = this.textContains(screenSize);
    if (resolution) monitor.resolution = this.textContains(resolution);
    if (panel) monitor.panelType = this.textContains(panel);
    if (refreshRateHz !== undefined) monitor.refreshRate = refreshRateHz;
    if (responseTimeMs !== undefined) monitor.responseTimeMs = responseTimeMs;
    if (ports.length > 0) monitor.ports = { hasSome: ports };
    if (hasSpeakers !== undefined) monitor.hasSpeakers = hasSpeakers;
    if (Object.keys(monitor).length && this.shouldApplySpecFilter(targetCategory, 'MONITOR')) this.addAnd(where, { monitorSpecs: { is: monitor } });

    const keyboard: any = {};
    const keyboardType = this.getQueryString(query, 'keyboardType');
    const connections = this.getQueryList(query, 'connections');
    const layoutLanguage = this.getQueryString(query, 'layoutLanguage') || this.getQueryString(query, 'language');
    const keyboardFormFactor = this.getQueryString(query, 'keyboardFormFactor');
    const hasLighting = this.getQueryBoolean(query, 'hasLighting') ?? hasRGB;
    if (keyboardType) keyboard.keyboardType = keyboardType;
    if (connections.length > 0) keyboard.connections = { hasSome: connections };
    if (layoutLanguage) keyboard.layoutLanguage = layoutLanguage;
    if (keyboardFormFactor) keyboard.keyboardFormFactor = this.textContains(keyboardFormFactor);
    if (hasLighting !== undefined) keyboard.hasLighting = hasLighting;
    if (Object.keys(keyboard).length && this.shouldApplySpecFilter(targetCategory, 'KEYBOARD')) this.addAnd(where, { keyboardSpecs: { is: keyboard } });

    const mouse: any = {};
    const mouseType = this.getQueryString(query, 'mouseType');
    const dpi = this.numberRange(query, 'minDpi', 'maxDpi');
    const pollingRateHz = this.getQueryNumber(query, 'pollingRateHz');
    if (mouseType) mouse.mouseType = mouseType;
    if (connections.length > 0) mouse.connections = { hasSome: connections };
    if (dpi) mouse.dpi = dpi;
    if (pollingRateHz !== undefined) mouse.pollingRateHz = pollingRateHz;
    if (Object.keys(mouse).length && this.shouldApplySpecFilter(targetCategory, 'MOUSE')) this.addAnd(where, { mouseSpecs: { is: mouse } });

    const mousepad: any = {};
    const hasLed = this.getQueryBoolean(query, 'hasLed');
    const mousepadSize = this.getQueryString(query, 'mousepadSize');
    if (hasLed !== undefined) mousepad.hasLed = hasLed;
    if (mousepadSize === 'Pequeno') mousepad.widthCm = { lte: 350 };
    if (mousepadSize === 'Mediano') mousepad.widthCm = { gt: 350, lte: 700 };
    if (mousepadSize === 'Grande') mousepad.widthCm = { gt: 700, lte: 900 };
    if (mousepadSize === 'XL') mousepad.widthCm = { gt: 900, lte: 1200 };
    if (mousepadSize === 'XXL') mousepad.widthCm = { gt: 1200 };
    if (Object.keys(mousepad).length && this.shouldApplySpecFilter(targetCategory, 'MOUSEPAD')) this.addAnd(where, { mousepadSpecs: { is: mousepad } });

    const chair: any = {};
    const color = this.getQueryString(query, 'color');
    const material = this.getQueryString(query, 'material');
    const maxWeight = this.numberRange(query, 'minMaxWeight', 'maxMaxWeight');
    if (color) chair.color = this.textContains(color);
    if (material) chair.material = this.textContains(material);
    if (maxWeight) chair.maxWeightKg = maxWeight;
    if (Object.keys(chair).length && this.shouldApplySpecFilter(targetCategory, 'CHAIR')) this.addAnd(where, { chairSpecs: { is: chair } });

    const desk: any = {};
    const surface = this.getQueryString(query, 'surface');
    const weight = this.numberRange(query, 'minWeight', 'maxWeight');
    if (color) desk.color = this.textContains(color);
    if (surface) desk.surface = this.textContains(surface);
    if (weight) desk.weightKg = weight;
    if (Object.keys(desk).length && this.shouldApplySpecFilter(targetCategory, 'GAMING_DESK')) this.addAnd(where, { gamingDeskSpecs: { is: desk } });
  }

  async findAll(query: ProductQuery = {}) {
    const hasFilters = Object.keys(query).length > 0;

    if (!hasFilters) {
      return this.prisma.product.findMany({
        include: this.productInclude,
      });
    }

    const page = Math.max(this.toInt(this.firstQueryValue(query.page)) || 1, 1);
    const limit = Math.min(Math.max(this.toInt(this.firstQueryValue(query.limit)) || 24, 1), 60);
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

  async getFilterOptions(query: ProductQuery = {}) {
    const category = this.getQueryString(query, 'category') || this.getQueryString(query, 'productType');
    const categories = this.getQueryList(query, 'categories');
    const products = await this.prisma.product.findMany({
      where: category ? { category } : categories.length > 0 ? { category: { in: categories } } : {},
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

    const prices = products.map((product) => Number(product.price)).filter((value) => Number.isFinite(value));

    return {
      categories: unique(products.map((product) => product.category)),
      brands: unique([
        ...products.map((product: any) => product.cpuSpecs?.brand),
        ...products.map((product: any) => product.keyboardSpecs?.brand),
        ...products.map((product: any) => product.mouseSpecs?.brand),
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
        ...products.flatMap((product: any) => product.motherboardSpecs?.supportedM2FormFactors ?? []),
      ]),
      resolutions: unique(products.map((product: any) => product.monitorSpecs?.resolution)),
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
      include: {
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
      },
    });
  }

  async findRelated(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: { id: true, category: true },
    });

    if (!product) {
      return [];
    }

    return this.prisma.product.findMany({
      where: {
        id: { not: product.id },
        category: product.category,
      },
      orderBy: { createdAt: 'desc' },
      take: 4,
    });
  }

  async update(id: string, data: UpdateProductDto, actorId?: string) {
    const currentProduct = await this.prisma.product.findUnique({
      where: { id },
      include: {
        cpuSpecs: true,
        motherboardSpecs: true,
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
    if (!currentProduct) {
      throw new BadRequestException('Producto no encontrado');
    }

    const updateData: any = {};

    if (data.name !== undefined) {
      updateData.name = data.name;
    }

    if (data.description !== undefined) {
      updateData.description = data.description;
    }

    if (data.category !== undefined) {
      updateData.category = data.category;
    }

    if (data.price !== undefined) {
      updateData.price = this.toFloat(data.price);
    }

    if (data.isOnSale !== undefined && !this.toBool(data.isOnSale)) {
      updateData.isOnSale = false;
      updateData.salePrice = null;
    } else if (data.isOnSale !== undefined || data.salePrice !== undefined || data.price !== undefined) {
      const nextPrice = data.price !== undefined ? this.toFloat(data.price) : this.toFloat(currentProduct.price);
      const nextIsOnSale = data.isOnSale !== undefined ? this.toBool(data.isOnSale) : Boolean(currentProduct.isOnSale);
      const nextSalePrice = data.salePrice !== undefined ? data.salePrice : currentProduct.salePrice;
      const sale = this.pricing.validateSale(nextPrice, nextIsOnSale, nextSalePrice);
      updateData.isOnSale = sale.isOnSale;
      updateData.salePrice = sale.salePrice;
    }

    if (data.stock !== undefined) {
      updateData.stock = this.toInt(data.stock);
    }

    if (data.description !== undefined) {
      updateData.description = String(data.description).trim();
    }

    if (data.images !== undefined) {
      if (!Array.isArray(data.images) || data.images.length > 5) {
        throw new BadRequestException('El producto puede tener como maximo 5 imagenes');
      }

      updateData.images = data.images.filter((image) => String(image).trim());
    }

    const specUpdate = this.buildSpecUpdate(currentProduct, data);

    if (Object.keys(updateData).length === 0 && Object.keys(specUpdate).length === 0) {
      throw new BadRequestException(
        'Debes enviar al menos un campo valido para actualizar',
      );
    }

    const updatedProduct = await this.prisma.product.update({
      where: { id },
      data: {
        ...updateData,
        ...specUpdate,
      },
      include: {
        cpuSpecs: true,
        motherboardSpecs: true,
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

    if (actorId) {
      await this.logProductChanges(actorId, currentProduct, updatedProduct, updateData);
    }

    return updatedProduct;
  }

  private validateCpuBrandSocket(brand: string, socket: string) {
    const socketsByBrand: Record<string, string[]> = {
      AMD: ['AM4', 'AM5'],
      Intel: ['LGA 1200', 'LGA 1700', 'LGA 1851'],
    };

    if (!brand || !socketsByBrand[brand]) {
      throw new BadRequestException('La marca del procesador es obligatoria');
    }

    if (!socketsByBrand[brand].includes(socket)) {
      throw new BadRequestException('El socket no corresponde a la marca del procesador');
    }
  }

  private buildSpecUpdate(currentProduct: any, data: UpdateProductDto) {
    const category = currentProduct.category;
    switch (category) {
      case 'CPU':
        if (
          data.cpuBrand === undefined &&
          data.socket === undefined &&
          data.cores === undefined &&
          data.threads === undefined &&
          data.frequency === undefined &&
          data.tdp === undefined &&
          data.integratedGraphics === undefined &&
          data.includesCooler === undefined
        ) {
          return {};
        }

        this.validateCpuBrandSocket(
          String(data.cpuBrand ?? currentProduct.cpuSpecs?.brand ?? '').trim(),
          String(data.socket ?? currentProduct.cpuSpecs?.socket ?? '').trim(),
        );
        return {
          cpuSpecs: {
            update: {
              ...(data.cpuBrand !== undefined ? { brand: data.cpuBrand } : {}),
              ...(data.socket !== undefined ? { socket: data.socket } : {}),
              ...(data.cores !== undefined ? { cores: this.toInt(data.cores) } : {}),
              ...(data.threads !== undefined ? { threads: this.toInt(data.threads) } : {}),
              ...(data.frequency !== undefined ? { frequency: data.frequency } : {}),
              ...(data.tdp !== undefined ? { tdp: this.toInt(data.tdp) } : {}),
              ...(data.integratedGraphics !== undefined ? { integratedGraphics: this.toBool(data.integratedGraphics) } : {}),
              ...(data.includesCooler !== undefined ? { includesCooler: this.toBool(data.includesCooler) } : {}),
            },
          },
        };

      case 'MOTHERBOARD':
        if (
          data.socket === undefined &&
          data.formFactor === undefined &&
          data.memoryType === undefined &&
          data.memorySlots === undefined &&
          data.m2Slots === undefined &&
          data.supportedM2FormFactors === undefined
        ) {
          return {};
        }

        return {
          motherboardSpecs: {
            update: {
              ...(data.socket !== undefined ? { socket: data.socket } : {}),
              ...(data.formFactor !== undefined ? { formFactor: data.formFactor } : {}),
              ...(data.memoryType !== undefined ? { memoryType: data.memoryType } : {}),
              ...(data.memorySlots !== undefined ? { memorySlots: this.toInt(data.memorySlots) } : {}),
              ...(data.m2Slots !== undefined ? { m2Slots: this.toInt(data.m2Slots) } : {}),
              ...(data.supportedM2FormFactors !== undefined ? { supportedM2FormFactors: this.toStringArray(data.supportedM2FormFactors) } : {}),
            },
          },
        };

      case 'COOLER':
        if (
          data.type === undefined &&
          data.compatibleSockets === undefined &&
          data.tdpCapacity === undefined &&
          data.coolerHeight === undefined &&
          data.radiatorSize === undefined &&
          data.hasRGB === undefined &&
          data.hasScreen === undefined
        ) {
          return {};
        }

        const nextCompatibleSockets =
          data.compatibleSockets !== undefined
            ? this.toStringArray(data.compatibleSockets)
            : this.toStringArray(currentProduct.coolerSpecs?.compatibleSockets ?? currentProduct.coolerSpecs?.socketSupport);
        const nextTdpCapacity = data.tdpCapacity !== undefined
          ? this.toInt(data.tdpCapacity)
          : this.toInt(currentProduct.coolerSpecs?.tdpCapacity);

        if (nextCompatibleSockets.length === 0) {
          throw new BadRequestException('Debes registrar sockets compatibles del cooler');
        }

        if (nextTdpCapacity <= 0) {
          throw new BadRequestException('El TDP soportado del cooler debe ser mayor a 0');
        }

        return {
          coolerSpecs: {
            update: {
              ...(data.type !== undefined ? { type: data.type } : {}),
              ...(data.compatibleSockets !== undefined
                ? {
                    compatibleSockets: this.toStringArray(data.compatibleSockets),
                    socketSupport: this.toStringArray(data.compatibleSockets).join(', '),
                  }
                : {}),
              ...(data.tdpCapacity !== undefined ? { tdpCapacity: this.toInt(data.tdpCapacity) } : {}),
              ...(data.coolerHeight !== undefined ? { coolerHeight: this.toInt(data.coolerHeight) } : {}),
              ...(data.radiatorSize !== undefined ? { radiatorSize: this.toInt(data.radiatorSize) } : {}),
              ...(data.hasRGB !== undefined ? { hasRGB: this.toBool(data.hasRGB) } : {}),
              ...(data.hasScreen !== undefined ? { hasScreen: this.toBool(data.hasScreen) } : {}),
            },
          },
        };

      case 'STORAGE':
        if (
          data.type === undefined &&
          data.capacity === undefined &&
          data.interface === undefined &&
          data.readSpeed === undefined &&
          data.writeSpeed === undefined &&
          data.m2FormFactor === undefined
        ) {
          return {};
        }

        const nextStorageType = String(data.type ?? currentProduct.storageSpecs?.type ?? '').toUpperCase();
        const nextM2FormFactor = data.m2FormFactor ?? currentProduct.storageSpecs?.m2FormFactor;
        const isM2 = nextStorageType.includes('M.2') || nextStorageType.includes('NVME');
        if (isM2 && !nextM2FormFactor) {
          throw new BadRequestException('El tamaño fisico M.2 es obligatorio para almacenamientos M.2');
        }
        return {
          storageSpecs: {
            update: {
              ...(data.type !== undefined ? { type: data.type } : {}),
              ...(data.capacity !== undefined ? { capacity: this.toInt(data.capacity) } : {}),
              ...(data.interface !== undefined ? { interface: data.interface } : {}),
              ...(data.readSpeed !== undefined ? { readSpeed: this.toInt(data.readSpeed) } : {}),
              ...(data.writeSpeed !== undefined ? { writeSpeed: this.toInt(data.writeSpeed) } : {}),
              ...(data.m2FormFactor !== undefined ? { m2FormFactor: data.m2FormFactor || null } : {}),
            },
          },
        };

      case 'LAPTOP':
        if (
          data.processor === undefined &&
          data.ram === undefined &&
          data.storage === undefined &&
          data.screenSize === undefined &&
          data.refreshRate === undefined &&
          data.panelType === undefined &&
          data.hasDedicatedGpu === undefined &&
          data.gpuBrand === undefined &&
          data.gpuModel === undefined &&
          data.includesWindows === undefined
        ) {
          return {};
        }

        this.ensureNonNegative('refreshRate', data.refreshRate);
        return {
          laptopSpecs: {
            update: {
              ...(data.processor !== undefined ? { processor: data.processor } : {}),
              ...(data.ram !== undefined ? { ram: data.ram } : {}),
              ...(data.storage !== undefined ? { storage: data.storage } : {}),
              ...(data.screenSize !== undefined ? { screenSize: data.screenSize } : {}),
              ...(data.refreshRate !== undefined ? { refreshRate: this.toInt(data.refreshRate) } : {}),
              ...(data.panelType !== undefined ? { panelType: data.panelType } : {}),
              ...(data.hasDedicatedGpu !== undefined ? { hasDedicatedGpu: this.toBool(data.hasDedicatedGpu) } : {}),
              ...(data.gpuBrand !== undefined ? { gpuBrand: data.gpuBrand } : {}),
              ...(data.gpuModel !== undefined ? { gpuModel: data.gpuModel } : {}),
              ...(data.includesWindows !== undefined ? { includesWindows: this.toBool(data.includesWindows) } : {}),
            },
          },
        };

      case 'PC_DESKTOP':
        if (
          data.processor === undefined &&
          data.ram === undefined &&
          data.storage === undefined &&
          data.hasDedicatedGpu === undefined &&
          data.gpuBrand === undefined &&
          data.gpuModel === undefined &&
          data.coolerType === undefined &&
          data.psuWatts === undefined &&
          data.caseModel === undefined
        ) {
          return {};
        }

        this.ensureNonNegative('psuWatts', data.psuWatts, false);
        return {
          desktopSpecs: {
            update: {
              ...(data.processor !== undefined ? { processor: data.processor } : {}),
              ...(data.ram !== undefined ? { ram: data.ram } : {}),
              ...(data.storage !== undefined ? { storage: data.storage } : {}),
              ...(data.hasDedicatedGpu !== undefined ? { hasDedicatedGpu: this.toBool(data.hasDedicatedGpu) } : {}),
              ...(data.gpuBrand !== undefined ? { gpuBrand: data.gpuBrand } : {}),
              ...(data.gpuModel !== undefined ? { gpuModel: data.gpuModel } : {}),
              ...(data.coolerType !== undefined ? { coolerType: data.coolerType } : {}),
              ...(data.psuWatts !== undefined ? { psuWatts: this.toInt(data.psuWatts) } : {}),
              ...(data.caseModel !== undefined ? { caseModel: data.caseModel } : {}),
            },
          },
        };

      case 'MONITOR':
        if (
          data.screenSize === undefined &&
          data.resolution === undefined &&
          data.panelType === undefined &&
          data.refreshRate === undefined &&
          data.responseTimeMs === undefined &&
          data.ports === undefined &&
          data.hasSpeakers === undefined
        ) {
          return {};
        }

        this.ensureNonNegative('refreshRate', data.refreshRate);
        this.ensureNonNegative('responseTimeMs', data.responseTimeMs, false);
        return {
          monitorSpecs: {
            update: {
              ...(data.screenSize !== undefined ? { screenSize: data.screenSize } : {}),
              ...(data.resolution !== undefined ? { resolution: data.resolution } : {}),
              ...(data.panelType !== undefined ? { panelType: data.panelType } : {}),
              ...(data.refreshRate !== undefined ? { refreshRate: this.toInt(data.refreshRate) } : {}),
              ...(data.responseTimeMs !== undefined ? { responseTimeMs: this.toFloat(data.responseTimeMs) } : {}),
              ...(data.ports !== undefined ? { ports: this.toStringArray(data.ports) } : {}),
              ...(data.hasSpeakers !== undefined ? { hasSpeakers: this.toBool(data.hasSpeakers) } : {}),
            },
          },
        };

      case 'KEYBOARD':
        if (
          data.brand === undefined &&
          data.keyboardType === undefined &&
          data.connections === undefined &&
          data.layoutLanguage === undefined &&
          data.hasLighting === undefined &&
          data.switchType === undefined &&
          data.keyboardFormFactor === undefined
        ) {
          return {};
        }

        return {
          keyboardSpecs: {
            update: {
              ...(data.brand !== undefined ? { brand: data.brand } : {}),
              ...(data.keyboardType !== undefined ? { keyboardType: data.keyboardType } : {}),
              ...(data.connections !== undefined
                ? {
                    connections: this.toStringArray(data.connections),
                    connection: this.toStringArray(data.connections).join(', '),
                  }
                : {}),
              ...(data.layoutLanguage !== undefined ? { layoutLanguage: data.layoutLanguage, layout: data.layoutLanguage } : {}),
              ...(data.hasLighting !== undefined ? { hasLighting: this.toBool(data.hasLighting), hasRGB: this.toBool(data.hasLighting) } : {}),
              ...(data.switchType !== undefined ? { switchType: data.switchType } : {}),
              ...(data.keyboardFormFactor !== undefined ? { keyboardFormFactor: data.keyboardFormFactor } : {}),
            },
          },
        };

      case 'MOUSE':
        if (
          data.brand === undefined &&
          data.mouseType === undefined &&
          data.connections === undefined &&
          data.buttonCount === undefined &&
          data.dpi === undefined &&
          data.pollingRateHz === undefined &&
          data.weightGrams === undefined &&
          data.powerType === undefined
        ) {
          return {};
        }

        const isUpdatingGamerMouse = data.mouseType === 'Gamer';
        if (isUpdatingGamerMouse) {
          this.ensureNonNegative('buttonCount', data.buttonCount, false);
          this.ensureNonNegative('dpi', data.dpi, false);
        }
        this.ensureNonNegative('weightGrams', data.weightGrams, false);
        return {
          mouseSpecs: {
            update: {
              ...(data.brand !== undefined ? { brand: data.brand } : {}),
              ...(data.mouseType !== undefined ? { mouseType: data.mouseType } : {}),
              ...(data.connections !== undefined
                ? {
                    connections: this.toStringArray(data.connections),
                    connection: this.toStringArray(data.connections).join(', '),
                  }
                : {}),
              ...(data.mouseType === 'Oficina' ? { buttonCount: null, dpi: 0, pollingRateHz: null } : {}),
              ...(isUpdatingGamerMouse && data.buttonCount !== undefined ? { buttonCount: this.toInt(data.buttonCount) } : {}),
              ...(isUpdatingGamerMouse && data.dpi !== undefined ? { dpi: this.toInt(data.dpi) } : {}),
              ...(isUpdatingGamerMouse && data.pollingRateHz !== undefined ? { pollingRateHz: this.toInt(data.pollingRateHz) } : {}),
              ...(data.weightGrams !== undefined ? { weightGrams: this.toInt(data.weightGrams) } : {}),
              ...(data.powerType !== undefined ? { powerType: data.powerType } : {}),
            },
          },
        };

      case 'MOUSEPAD':
        if (
          data.brand === undefined &&
          data.widthCm === undefined &&
          data.lengthCm === undefined &&
          data.hasLed === undefined
        ) {
          return {};
        }

        this.ensureNonNegative('widthCm', data.widthCm, false);
        this.ensureNonNegative('lengthCm', data.lengthCm, false);
        return {
          mousepadSpecs: {
            update: {
              ...(data.brand !== undefined ? { brand: data.brand } : {}),
              ...(data.widthCm !== undefined ? { widthCm: this.toInt(data.widthCm) } : {}),
              ...(data.lengthCm !== undefined ? { lengthCm: this.toInt(data.lengthCm) } : {}),
              ...(data.hasLed !== undefined ? { hasLed: this.toBool(data.hasLed) } : {}),
            },
          },
        };

      case 'CHAIR':
        if (
          data.brand === undefined &&
          data.color === undefined &&
          data.material === undefined &&
          data.maxWeightKg === undefined
        ) {
          return {};
        }

        this.ensureNonNegative('maxWeightKg', data.maxWeightKg, false);
        return {
          chairSpecs: {
            update: {
              ...(data.brand !== undefined ? { brand: data.brand } : {}),
              ...(data.color !== undefined ? { color: data.color } : {}),
              ...(data.material !== undefined ? { material: data.material } : {}),
              ...(data.maxWeightKg !== undefined ? { maxWeightKg: this.toInt(data.maxWeightKg) } : {}),
            },
          },
        };

      case 'GAMING_DESK':
        if (
          data.brand === undefined &&
          data.color === undefined &&
          data.surface === undefined &&
          data.weightKg === undefined
        ) {
          return {};
        }

        this.ensureNonNegative('weightKg', data.weightKg, false);
        return {
          gamingDeskSpecs: {
            update: {
              ...(data.brand !== undefined ? { brand: data.brand } : {}),
              ...(data.color !== undefined ? { color: data.color } : {}),
              ...(data.surface !== undefined ? { surface: data.surface } : {}),
              ...(data.weightKg !== undefined ? { weightKg: this.toInt(data.weightKg) } : {}),
            },
          },
        };

      default:
        return {};
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
    const logs: Array<{
      action: string;
      module: string;
      fieldName: string;
      oldValue?: string | number | null;
      newValue?: string | number | null;
      stockBefore?: number | null;
      stockAfter?: number | null;
      description: string;
    }> = [];

    const addIfChanged = (
      fieldName: string,
      action: string,
      oldValue: any,
      newValue: any,
      description: string,
      module = 'PRODUCTS',
    ) => {
      if (JSON.stringify(oldValue) === JSON.stringify(newValue)) return;
      logs.push({ action, module, fieldName, oldValue, newValue, description });
    };

    if ('name' in updateData) {
      addIfChanged('name', 'UPDATE_PRODUCT', before.name, after.name, `Cambio el nombre de ${before.name} a ${after.name}.`);
    }

    if ('description' in updateData) {
      addIfChanged('description', 'UPDATE_PRODUCT_DESCRIPTION', before.description, after.description, `Modifico la descripcion del producto ${after.name}.`);
    }

    if ('category' in updateData) {
      addIfChanged('category', 'UPDATE_PRODUCT_CATEGORY', before.category, after.category, `Cambio la categoria de ${after.name} de ${before.category} a ${after.category}.`);
    }

    if ('price' in updateData) {
      addIfChanged('price', 'UPDATE_PRICE', String(before.price), String(after.price), `Cambio el precio de ${after.name} de S/. ${before.price} a S/. ${after.price}.`, 'INVENTORY');
    }

    if ('isOnSale' in updateData) {
      const action = after.isOnSale ? 'ENABLE_PRODUCT_SALE' : 'DISABLE_PRODUCT_SALE';
      const description = after.isOnSale
        ? `Se activo oferta para ${after.name}.`
        : `Se desactivo oferta para ${after.name}.`;
      addIfChanged('isOnSale', action, before.isOnSale, after.isOnSale, description, 'PRODUCTS');
    }

    if ('salePrice' in updateData) {
      addIfChanged(
        'salePrice',
        'UPDATE_SALE_PRICE',
        before.salePrice === null || before.salePrice === undefined ? null : String(before.salePrice),
        after.salePrice === null || after.salePrice === undefined ? null : String(after.salePrice),
        `Cambio el precio de oferta de ${after.name} de S/. ${before.salePrice ?? 'sin oferta'} a S/. ${after.salePrice ?? 'sin oferta'}.`,
        'INVENTORY',
      );
    }

    if ('stock' in updateData && before.stock !== after.stock) {
      logs.push({
        action: 'UPDATE_STOCK',
        module: 'INVENTORY',
        fieldName: 'stock',
        oldValue: before.stock,
        newValue: after.stock,
        stockBefore: before.stock,
        stockAfter: after.stock,
        description: `Cambio el stock de ${after.name} de ${before.stock} a ${after.stock}.`,
      });
    }

    if ('images' in updateData) {
      const beforeImages = Array.isArray(before.images) ? before.images : [];
      const afterImages = Array.isArray(after.images) ? after.images : [];
      const added = afterImages.filter((image) => !beforeImages.includes(image));
      const removed = beforeImages.filter((image) => !afterImages.includes(image));

      for (const image of added) {
        logs.push({
          action: 'ADD_PRODUCT_IMAGE',
          module: 'PRODUCTS',
          fieldName: 'images',
          oldValue: null,
          newValue: image,
          description: `Agrego una imagen al producto ${after.name}.`,
        });
      }

      for (const image of removed) {
        logs.push({
          action: 'REMOVE_PRODUCT_IMAGE',
          module: 'PRODUCTS',
          fieldName: 'images',
          oldValue: image,
          newValue: null,
          description: `Elimino una imagen del producto ${after.name}.`,
        });
      }
    }

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
      MOUSEPAD: 'mousepadSpecs',
      CHAIR: 'chairSpecs',
      GAMING_DESK: 'gamingDeskSpecs',
    };
    const specRelation = specRelationByCategory[after.category];
    if (specRelation && JSON.stringify(before[specRelation]) !== JSON.stringify(after[specRelation])) {
      logs.push({
        action: 'UPDATE_PRODUCT_SPECS',
        module: 'PRODUCTS',
        fieldName: 'technicalSpecs',
        oldValue: JSON.stringify(before[specRelation]),
        newValue: JSON.stringify(after[specRelation]),
        description: `Modifico especificaciones tecnicas del producto ${after.name}.`,
      });
    }

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
}
