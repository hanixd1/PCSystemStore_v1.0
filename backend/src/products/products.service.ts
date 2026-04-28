import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

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
      STORAGE: ['capacity', 'readSpeed'],
      LAPTOP: ['refreshRate'],
      PC_DESKTOP: [],
      SOFTWARE: [],
      MONITOR: ['refreshRate'],
      KEYBOARD: [],
      MOUSE: ['dpi'],
      HEADSET: ['driverSize', 'impedance'],
      MICROPHONE: [],
      SPEAKER: ['wattage'],
    };

    for (const field of fieldsByCategory[category] || []) {
      this.ensureNonNegative(field, data[field]);
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
      HEADSET: [],
      MICROPHONE: [],
      SPEAKER: [],
    };

    for (const field of textFieldsByCategory[category] || []) {
      this.ensureNoNegativeText(field, data[field]);
    }
  }

  async create(data: any) {
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
            socket: data.socket || 'N/A',
            cores: this.toInt(data.cores),
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
            fanCount: this.toInt(data.fanCount),
            radiatorSize: this.toInt(data.radiatorSize),
            hasScreen: this.toBool(data.hasScreen),
            hasRGB: this.toBool(data.hasRGB),
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
          },
        };
        break;

      case 'KEYBOARD':
        productData.keyboardSpecs = {
          create: {
            connection: data.connection || 'USB',
            switchType: data.switchType || 'Membrana',
            layout: data.layout || 'ES',
            hasRGB: this.toBool(data.hasRGB),
          },
        };
        break;

      case 'MOUSE':
        productData.mouseSpecs = {
          create: {
            connection: data.connection || 'USB',
            dpi: this.toInt(data.dpi),
            sensor: data.sensor || 'Optico',
            hasRGB: this.toBool(data.hasRGB),
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

    return this.prisma.product.create({ data: productData });
  }

  findAll() {
    return this.prisma.product.findMany({
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
        headsetSpecs: true,
        microphoneSpecs: true,
        speakerSpecs: true,
      },
    });
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
        headsetSpecs: true,
        microphoneSpecs: true,
        speakerSpecs: true,
      },
    });
  }

  update(id: string, data: any) {
    return this.prisma.product.update({
      where: { id },
      data: {
        name: data.name,
        price: this.toFloat(data.price),
        stock: this.toInt(data.stock),
      },
    });
  }

  remove(id: string) {
    return this.prisma.product.delete({ where: { id } });
  }
}
