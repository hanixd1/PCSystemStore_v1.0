import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { ProductPayloadService } from './product-payload.service';
import { ProductValidationService } from './product-validation.service';

@Injectable()
export class ProductSpecsService {
  constructor(
    private readonly payload: ProductPayloadService = new ProductPayloadService(),
    private readonly validation: ProductValidationService = new ProductValidationService(
      undefined as never,
      payload,
    ),
  ) {}

  buildCreateProductSpecsPayload(data: CreateProductDto & { uploadedImages?: string[] }) {
    switch (data.category) {
      case 'CPU':
        return this.buildCreateCpuSpecs(data);
      case 'MOTHERBOARD':
        return this.buildCreateMotherboardSpecs(data);
      case 'RAM':
        return this.buildCreateRamSpecs(data);
      case 'GPU':
        return this.buildCreateGpuSpecs(data);
      case 'PSU':
        return this.buildCreatePsuSpecs(data);
      case 'CASE':
        return this.buildCreateCaseSpecs(data);
      case 'COOLER':
        return this.buildCreateCoolerSpecs(data);
      case 'STORAGE':
        return this.buildCreateStorageSpecs(data);
      case 'LAPTOP':
        return this.buildCreateLaptopSpecs(data);
      case 'PC_DESKTOP':
        return this.buildCreateDesktopSpecs(data);
      case 'SOFTWARE':
        return this.buildCreateSoftwareSpecs(data);
      case 'MONITOR':
        return this.buildCreateMonitorSpecs(data);
      case 'KEYBOARD':
        return this.buildCreateKeyboardSpecs(data);
      case 'MOUSE':
        return this.buildCreateMouseSpecs(data);
      case 'MOUSEPAD':
        return this.buildCreateMousepadSpecs(data);
      case 'CHAIR':
        return this.buildCreateChairSpecs(data);
      case 'GAMING_DESK':
        return this.buildCreateGamingDeskSpecs(data);
      case 'HEADSET':
        return this.buildCreateHeadsetSpecs(data);
      case 'MICROPHONE':
        return this.buildCreateMicrophoneSpecs(data);
      case 'SPEAKER':
        return this.buildCreateSpeakerSpecs(data);
      case 'WEBCAM':
        return this.buildCreateWebcamSpecs(data);
      case 'CAPTURE_CARD':
        return this.buildCreateCaptureCardSpecs(data);
      case 'CABLE_HUB':
        return this.buildCreateCableHubSpecs(data);
      case 'LAPTOP_COOLING_BASE':
        return this.buildCreateLaptopCoolingBaseSpecs(data);
      case 'BACKPACK':
        return this.buildCreateBackpackSpecs(data);
      default:
        throw new BadRequestException(`Categoria no soportada: ${data.category}`);
    }
  }

  private buildCreateCpuSpecs(data: CreateProductDto & { uploadedImages?: string[] }) {
    return {
      cpuSpecs: {
        create: {
          brand: data.cpuBrand || 'AMD',
          socket: data.socket || 'N/A',
          cores: this.payload.toInt(data.cores),
          threads: this.payload.toInt(data.threads),
          frequency: data.frequency || '',
          ...(data.baseTdpWatts !== undefined
            ? { baseTdpWatts: this.payload.toInt(data.baseTdpWatts) }
            : {}),
          tdp: this.payload.toInt(data.tdp),
          integratedGraphics: this.payload.toBool(data.integratedGraphics),
          includesCooler: this.payload.toBool(data.includesCooler),
        },
      },
    };
  }

  private buildCreateMotherboardSpecs(data: CreateProductDto & { uploadedImages?: string[] }) {
    return {
      motherboardSpecs: {
        create: {
          brand: data.brand || 'Otros',
          socket: data.socket || 'N/A',
          formFactor: data.formFactor || 'ATX',
          memoryType: data.memoryType || 'DDR4',
          memorySlots: this.payload.toInt(data.memorySlots),
          m2Slots: this.payload.toInt(data.m2Slots),
          supportedM2FormFactors: this.payload.toStringArray(data.supportedM2FormFactors),
        },
      },
    };
  }

  private buildCreateRamSpecs(data: CreateProductDto & { uploadedImages?: string[] }) {
    return {
      ramSpecs: {
        create: {
          brand: data.brand || 'Otros',
          memoryType: data.memoryType || 'DDR4',
          capacity: this.payload.toInt(data.capacity),
          speed: this.payload.toInt(data.speed),
          modules: this.payload.toInt(data.modules),
          ...(data.latency !== undefined ? { latency: data.latency } : {}),
          hasRGB: this.payload.toBool(data.hasRGB),
        },
      },
    };
  }

  private buildCreateGpuSpecs(data: CreateProductDto & { uploadedImages?: string[] }) {
    const gpuPowerWatts = this.payload.hasValue(data.gpuPowerWatts)
      ? this.payload.toInt(data.gpuPowerWatts)
      : this.payload.toInt(data.tdp);
    return {
      gpuSpecs: {
        create: {
          brand: data.brand || 'Otros',
          chipset: data.chipset || 'N/A',
          vram: this.payload.toInt(data.vram),
          ...(data.typeVram !== undefined ? { typeVram: data.typeVram } : {}),
          length: this.payload.toInt(data.length),
          tdp: gpuPowerWatts,
          gpuPowerWatts,
          ...(this.payload.hasValue(data.recommendedPsuWatts)
            ? { recommendedPsuWatts: this.payload.toInt(data.recommendedPsuWatts) }
            : {}),
          fans: this.payload.hasValue(data.fans) ? this.payload.toInt(data.fans) : 0,
        },
      },
    };
  }

  private buildCreatePsuSpecs(data: CreateProductDto & { uploadedImages?: string[] }) {
    return {
      psuSpecs: {
        create: {
          brand: data.brand || 'Otros',
          wattage: this.payload.toInt(data.wattage),
          certification: data.certification || 'None',
          modular: data.modular || 'No',
          formFactor: data.formFactor || 'ATX',
        },
      },
    };
  }

  private buildCreateCaseSpecs(data: CreateProductDto & { uploadedImages?: string[] }) {
    const supportedFormFactors = this.payload.toStringArray(
      data.supportedFormFactors ?? data.formFactor,
    );
    const radiatorValues = this.payload.normalizeRadiatorValues(
      data.radiatorSupportMmValues ?? data.radiatorSupportMm,
    );
    const maxRadiator = radiatorValues.includes('0')
      ? 0
      : Math.max(0, ...radiatorValues.map((value) => this.payload.toInt(value)));

    return {
      caseSpecs: {
        create: {
          brand: data.brand || 'Otros',
          formFactor: supportedFormFactors[0] || data.formFactor || 'ATX',
          supportedFormFactors,
          maxGpuLength: this.payload.toInt(data.maxGpuLength),
          includesPsu: this.payload.toBool(data.includesPsu),
          supportsTowerCooler:
            data.supportsTowerCooler === undefined
              ? true
              : this.payload.toBool(data.supportsTowerCooler),
          includedFans: this.payload.toInt(data.includedFans),
          radiatorSupportMm: maxRadiator,
          radiatorSupportMmValues: radiatorValues,
        },
      },
    };
  }

  private buildCreateCoolerSpecs(data: CreateProductDto & { uploadedImages?: string[] }) {
    const coolerType = this.payload.normalizeCoolerType(data.type);
    return {
      coolerSpecs: {
        create: {
          brand: data.brand || 'Otros',
          type: coolerType,
          socketSupport: this.payload.toStringArray(data.compatibleSockets).join(', '),
          compatibleSockets: this.payload.toStringArray(data.compatibleSockets),
          fanCount: this.payload.toInt(data.fanCount),
          radiatorSize: coolerType === 'Líquida' ? this.payload.toInt(data.radiatorSize) : null,
          hasScreen: this.payload.toBool(data.hasScreen),
          hasRGB: this.payload.toBool(data.hasRGB),
          tdpCapacity: this.payload.toInt(data.tdpCapacity),
        },
      },
    };
  }

  private buildCreateStorageSpecs(data: CreateProductDto & { uploadedImages?: string[] }) {
    const storageType = this.payload.normalizeStorageType(data.type);
    return {
      storageSpecs: {
        create: {
          type: storageType,
          capacity: this.payload.toInt(data.capacity),
          interface: data.interface || 'SATA',
          readSpeed: this.payload.toInt(data.readSpeed),
          writeSpeed: this.payload.toInt(data.writeSpeed),
          m2FormFactor: this.payload.isM2StorageType(storageType)
            ? data.m2FormFactor || null
            : null,
        },
      },
    };
  }

  private buildCreateLaptopSpecs(data: CreateProductDto & { uploadedImages?: string[] }) {
    const hasDedicatedGpu = this.payload.toBool(data.hasDedicatedGpu);
    return {
      laptopSpecs: {
        create: {
          brand: data.brand || 'Otra',
          processor: data.processor || 'N/A',
          ram: data.ram || 'N/A',
          storage: data.storage || 'N/A',
          screenSize: data.screenSize || '15.6"',
          refreshRate: this.payload.toInt(data.refreshRate),
          panelType: data.panelType || 'IPS',
          hasDedicatedGpu,
          gpuBrand: hasDedicatedGpu ? data.gpuBrand || '' : data.gpuBrand || 'No aplica',
          gpuModel: hasDedicatedGpu ? data.gpuModel || '' : data.gpuModel || 'No aplica',
          includesWindows: this.payload.toBool(data.includesWindows),
        },
      },
    };
  }

  private buildCreateDesktopSpecs(data: CreateProductDto & { uploadedImages?: string[] }) {
    const hasDedicatedGpu = this.payload.toBool(data.hasDedicatedGpu);
    return {
      desktopSpecs: {
        create: {
          processor: data.processor || 'N/A',
          ram: data.ram || 'N/A',
          storage: data.storage || 'N/A',
          hasDedicatedGpu,
          gpuBrand: hasDedicatedGpu ? data.gpuBrand || '' : data.gpuBrand || 'No aplica',
          gpuModel: hasDedicatedGpu ? data.gpuModel || '' : data.gpuModel || 'No aplica',
          coolerType: data.coolerType || 'No especificado',
          psuWatts: data.psuWatts !== undefined ? this.payload.toInt(data.psuWatts) : null,
          caseModel: data.caseModel || '',
        },
      },
    };
  }

  private buildCreateSoftwareSpecs(data: CreateProductDto & { uploadedImages?: string[] }) {
    return {
      softwareSpecs: {
        create: {
          licenseType: data.licenseType || 'Permanente',
          platform: data.platform || 'Windows',
        },
      },
    };
  }

  private buildCreateMonitorSpecs(data: CreateProductDto & { uploadedImages?: string[] }) {
    return {
      monitorSpecs: {
        create: {
          brand: data.brand || 'Otros',
          screenSize: data.screenSize || '24"',
          resolution: data.resolution || 'FHD (1920x1080)',
          panelType: data.panelType || 'IPS',
          refreshRate: this.payload.toInt(data.refreshRate),
          responseTimeMs:
            data.responseTimeMs !== undefined ? this.payload.toFloat(data.responseTimeMs) : null,
          ports: this.payload.toStringArray(data.ports),
          hasSpeakers: this.payload.toBool(data.hasSpeakers),
        },
      },
    };
  }

  private buildCreateKeyboardSpecs(data: CreateProductDto & { uploadedImages?: string[] }) {
    return {
      keyboardSpecs: {
        create: {
          connection:
            data.connection ||
            this.payload.toStringArray(data.connections).join(', ') ||
            'Cableado',
          switchType: data.switchType || '',
          layout: data.layoutLanguage || data.layout || 'EspaÃ±ol',
          hasRGB: this.payload.toBool(data.hasRGB !== undefined ? data.hasRGB : data.hasLighting),
          brand: data.brand || '',
          keyboardType: data.keyboardType || 'Membrana',
          connections: this.payload.toStringArray(data.connections),
          layoutLanguage: data.layoutLanguage || 'EspaÃ±ol',
          hasLighting: this.payload.toBool(data.hasLighting),
          keyboardFormFactor: data.keyboardFormFactor || 'Completo',
          weightGrams: null,
        },
      },
    };
  }

  private buildCreateMouseSpecs(data: CreateProductDto & { uploadedImages?: string[] }) {
    const mouseType = data.mouseType || 'Oficina';
    const isGamerMouse = mouseType === 'Gamer';
    return {
      mouseSpecs: {
        create: {
          connection:
            data.connection ||
            this.payload.toStringArray(data.connections).join(', ') ||
            'Cableado',
          dpi: isGamerMouse ? this.payload.toInt(data.dpi) : 0,
          sensor: data.sensor || 'Optico',
          hasRGB: this.payload.toBool(data.hasRGB),
          brand: data.brand || '',
          mouseType,
          connections: this.payload.toStringArray(data.connections),
          buttonCount:
            isGamerMouse && data.buttonCount !== undefined
              ? this.payload.toInt(data.buttonCount)
              : null,
          pollingRateHz:
            isGamerMouse && data.pollingRateHz !== undefined
              ? this.payload.toInt(data.pollingRateHz)
              : null,
          weightGrams: data.weightGrams !== undefined ? this.payload.toInt(data.weightGrams) : null,
          powerType: data.powerType || 'Ninguno',
        },
      },
    };
  }

  private buildCreateMousepadSpecs(data: CreateProductDto & { uploadedImages?: string[] }) {
    return {
      mousepadSpecs: {
        create: {
          brand: data.brand || '',
          widthCm: data.widthCm !== undefined ? this.payload.toInt(data.widthCm) : null,
          lengthCm: data.lengthCm !== undefined ? this.payload.toInt(data.lengthCm) : null,
          hasLed: this.payload.toBool(data.hasLed),
        },
      },
    };
  }

  private buildCreateChairSpecs(data: CreateProductDto & { uploadedImages?: string[] }) {
    return {
      chairSpecs: {
        create: {
          brand: data.brand || '',
          color: data.color || '',
          material: data.material || '',
          maxWeightKg: data.maxWeightKg !== undefined ? this.payload.toInt(data.maxWeightKg) : null,
        },
      },
    };
  }

  private buildCreateGamingDeskSpecs(data: CreateProductDto & { uploadedImages?: string[] }) {
    return {
      gamingDeskSpecs: {
        create: {
          brand: data.brand || '',
          color: data.color || '',
          surface: data.surface || '',
          weightKg: data.weightKg !== undefined ? this.payload.toInt(data.weightKg) : null,
        },
      },
    };
  }

  private buildCreateHeadsetSpecs(data: CreateProductDto & { uploadedImages?: string[] }) {
    return {
      headsetSpecs: {
        create: {
          brand: data.brand || 'Otros',
          connection: data.connection || 'Cableado',
          supportedConnections: this.payload.toStringArray(data.supportedConnections),
          driverSize: this.payload.toInt(data.driverSize) || 40,
          impedance: this.payload.toInt(data.impedance) || 32,
          micType: data.micType || 'Estandar',
          noiseCancel: this.payload.toBool(data.noiseCancel),
          hasRGB: this.payload.toBool(data.hasRGB),
          audioType: data.audioType || 'Headset',
          micIntegrated:
            data.micIntegrated !== undefined ? this.payload.toBool(data.micIntegrated) : true,
          micRemovable:
            data.micRemovable !== undefined ? this.payload.toBool(data.micRemovable) : false,
          surroundSound: data.surroundSound || 'No',
          consoleCompatible:
            data.consoleCompatible !== undefined
              ? this.payload.toBool(data.consoleCompatible)
              : false,
          color: data.color || '',
        },
      },
    };
  }

  private buildCreateMicrophoneSpecs(data: CreateProductDto & { uploadedImages?: string[] }) {
    return {
      microphoneSpecs: {
        create: {
          brand: data.brand || 'Otros',
          connection: data.connection || 'USB',
          micType: data.micType || 'Cardioide',
          hasRGB: this.payload.toBool(data.hasRGB),
          microphoneType: data.microphoneType || '',
          connectionTypes: this.payload.toStringArray(data.connectionTypes),
          frequencyResponse: data.frequencyResponse || '',
          includesArm:
            data.includesArm !== undefined ? this.payload.toBool(data.includesArm) : false,
          includesPopFilter:
            data.includesPopFilter !== undefined
              ? this.payload.toBool(data.includesPopFilter)
              : false,
          color: data.color || '',
        },
      },
    };
  }

  private buildCreateSpeakerSpecs(data: CreateProductDto & { uploadedImages?: string[] }) {
    return {
      speakerSpecs: {
        create: {
          brand: data.brand || 'Otros',
          connection: data.connection || 'Jack',
          wattage: this.payload.toInt(data.wattage),
          hasRGB: this.payload.toBool(data.hasRGB),
          speakerType: data.speakerType || '',
          channels: data.channels || '',
          connectionTypes: this.payload.toStringArray(data.connectionTypes),
          hasSubwoofer:
            data.hasSubwoofer !== undefined ? this.payload.toBool(data.hasSubwoofer) : false,
          remoteControl:
            data.remoteControl !== undefined ? this.payload.toBool(data.remoteControl) : false,
          color: data.color || '',
        },
      },
    };
  }

  private buildCreateWebcamSpecs(data: CreateProductDto & { uploadedImages?: string[] }) {
    return {
      webcamSpecs: {
        create: {
          brand: data.brand || 'Otros',
          resolution: data.resolution || 'FHD',
          fps: this.payload.toInt(data.fps) || 30,
        },
      },
    };
  }

  private buildCreateCaptureCardSpecs(data: CreateProductDto & { uploadedImages?: string[] }) {
    return {
      captureCardSpecs: {
        create: {
          brand: data.brand || 'Otros',
          resolution: data.resolution || 'FHD',
          fps: this.payload.toInt(data.fps) || 60,
        },
      },
    };
  }

  private buildCreateCableHubSpecs(data: CreateProductDto & { uploadedImages?: string[] }) {
    const cableHubType = data.cableHubType || data.type || 'Cable';
    return {
      cableHubSpecs: {
        create: {
          brand: data.brand || 'Otros',
          type: cableHubType,
          cableType: cableHubType === 'Cable' ? data.cableType || null : null,
          cableLengthMeters:
            cableHubType === 'Cable' ? this.payload.toInt(data.cableLengthMeters) : null,
          hubInputType: cableHubType === 'Hub' ? data.hubInputType || null : null,
          hasHdmiOutput: cableHubType === 'Hub' ? this.payload.toBool(data.hasHdmiOutput) : null,
          hasRj45Output: cableHubType === 'Hub' ? this.payload.toBool(data.hasRj45Output) : null,
        },
      },
    };
  }

  private buildCreateLaptopCoolingBaseSpecs(
    data: CreateProductDto & { uploadedImages?: string[] },
  ) {
    return {
      laptopCoolingBaseSpecs: {
        create: {
          brand: data.brand || 'Otros',
          fanCount: this.payload.toInt(data.fanCount) || 1,
          connectivity: data.connectivity || 'USB-A',
          supportedLaptopSize: data.supportedLaptopSize || null,
          hasRGB: this.payload.toBool(data.hasRGB),
          color: data.color || null,
        },
      },
    };
  }

  private buildCreateBackpackSpecs(data: CreateProductDto & { uploadedImages?: string[] }) {
    return {
      backpackSpecs: {
        create: {
          brand: data.brand || 'Otros',
          color: data.color || '',
          supportedLaptopSize: data.supportedLaptopSize || null,
        },
      },
    };
  }

  buildSpecUpdate(currentProduct: any, data: UpdateProductDto) {
    return this.buildCategorySpecUpdate(currentProduct, data);
  }

  private buildCategorySpecUpdate(currentProduct: any, data: UpdateProductDto) {
    switch (currentProduct.category) {
      case 'CPU':
        return this.buildCpuSpecUpdate(currentProduct, data);
      case 'MOTHERBOARD':
        return this.buildMotherboardSpecUpdate(currentProduct, data);
      case 'RAM':
        return this.buildRamSpecUpdate(currentProduct, data);
      case 'GPU':
        return this.buildGpuSpecUpdate(currentProduct, data);
      case 'CASE':
        return this.buildCaseSpecUpdate(currentProduct, data);
      case 'COOLER':
        return this.buildCoolerSpecUpdate(currentProduct, data);
      case 'PSU':
        return this.buildPsuSpecUpdate(currentProduct, data);
      case 'STORAGE':
        return this.buildStorageSpecUpdate(currentProduct, data);
      case 'LAPTOP':
        return this.buildLaptopSpecUpdate(currentProduct, data);
      case 'PC_DESKTOP':
        return this.buildPcDesktopSpecUpdate(currentProduct, data);
      case 'MONITOR':
        return this.buildMonitorSpecUpdate(currentProduct, data);
      case 'KEYBOARD':
        return this.buildKeyboardSpecUpdate(currentProduct, data);
      case 'MOUSE':
        return this.buildMouseSpecUpdate(currentProduct, data);
      case 'WEBCAM':
        return this.buildWebcamSpecUpdate(currentProduct, data);
      case 'CAPTURE_CARD':
        return this.buildCaptureCardSpecUpdate(currentProduct, data);
      case 'CABLE_HUB':
        return this.buildCableHubSpecUpdate(currentProduct, data);
      case 'LAPTOP_COOLING_BASE':
        return this.buildLaptopCoolingBaseSpecUpdate(currentProduct, data);
      case 'BACKPACK':
        return this.buildBackpackSpecUpdate(currentProduct, data);
      case 'HEADSET':
        return this.buildHeadsetSpecUpdate(currentProduct, data);
      case 'MICROPHONE':
        return this.buildMicrophoneSpecUpdate(currentProduct, data);
      case 'SPEAKER':
        return this.buildSpeakerSpecUpdate(currentProduct, data);
      case 'MOUSEPAD':
        return this.buildMousepadSpecUpdate(currentProduct, data);
      case 'CHAIR':
        return this.buildChairSpecUpdate(currentProduct, data);
      case 'GAMING_DESK':
        return this.buildGamingDeskSpecUpdate(currentProduct, data);
      default:
        return {};
    }
  }

  private buildCpuSpecUpdate(currentProduct: any, data: UpdateProductDto) {
    if (
      data.cpuBrand === undefined &&
      data.socket === undefined &&
      data.cores === undefined &&
      data.threads === undefined &&
      data.frequency === undefined &&
      data.baseTdpWatts === undefined &&
      data.tdp === undefined &&
      data.integratedGraphics === undefined &&
      data.includesCooler === undefined
    ) {
      return {};
    }

    this.validation.validateCpuBrandSocket(
      String(data.cpuBrand ?? currentProduct.cpuSpecs?.brand ?? '').trim(),
      String(data.socket ?? currentProduct.cpuSpecs?.socket ?? '').trim(),
    );
    return {
      cpuSpecs: {
        update: {
          ...(data.cpuBrand !== undefined ? { brand: data.cpuBrand } : {}),
          ...(data.socket !== undefined ? { socket: data.socket } : {}),
          ...(data.cores !== undefined ? { cores: this.payload.toInt(data.cores) } : {}),
          ...(data.threads !== undefined ? { threads: this.payload.toInt(data.threads) } : {}),
          ...(data.frequency !== undefined ? { frequency: data.frequency } : {}),
          ...(data.baseTdpWatts !== undefined
            ? { baseTdpWatts: this.payload.toInt(data.baseTdpWatts) }
            : {}),
          ...(data.tdp !== undefined ? { tdp: this.payload.toInt(data.tdp) } : {}),
          ...(data.integratedGraphics !== undefined
            ? { integratedGraphics: this.payload.toBool(data.integratedGraphics) }
            : {}),
          ...(data.includesCooler !== undefined
            ? { includesCooler: this.payload.toBool(data.includesCooler) }
            : {}),
        },
      },
    };
  }

  private buildMotherboardSpecUpdate(currentProduct: any, data: UpdateProductDto) {
    if (
      data.brand === undefined &&
      data.socket === undefined &&
      data.formFactor === undefined &&
      data.memoryType === undefined &&
      data.memorySlots === undefined &&
      data.m2Slots === undefined &&
      data.supportedM2FormFactors === undefined
    ) {
      return {};
    }

    const nextMotherboardBrand = String(
      data.brand ?? currentProduct.motherboardSpecs?.brand ?? '',
    ).trim();
    if (!nextMotherboardBrand) {
      throw new BadRequestException('Selecciona la marca de la placa madre.');
    }

    return {
      motherboardSpecs: {
        update: {
          ...(data.brand !== undefined ? { brand: data.brand } : {}),
          ...(data.socket !== undefined ? { socket: data.socket } : {}),
          ...(data.formFactor !== undefined ? { formFactor: data.formFactor } : {}),
          ...(data.memoryType !== undefined ? { memoryType: data.memoryType } : {}),
          ...(data.memorySlots !== undefined
            ? { memorySlots: this.payload.toInt(data.memorySlots) }
            : {}),
          ...(data.m2Slots !== undefined ? { m2Slots: this.payload.toInt(data.m2Slots) } : {}),
          ...(data.supportedM2FormFactors !== undefined
            ? {
                supportedM2FormFactors: this.payload.toStringArray(data.supportedM2FormFactors),
              }
            : {}),
        },
      },
    };
  }

  private buildRamSpecUpdate(currentProduct: any, data: UpdateProductDto) {
    if (
      data.brand === undefined &&
      data.memoryType === undefined &&
      data.capacity === undefined &&
      data.speed === undefined &&
      data.modules === undefined &&
      data.latency === undefined &&
      data.hasRGB === undefined
    ) {
      return {};
    }

    const nextRamBrand = String(data.brand ?? currentProduct.ramSpecs?.brand ?? '').trim();
    if (!nextRamBrand) {
      throw new BadRequestException('Selecciona la marca de la memoria RAM.');
    }

    return {
      ramSpecs: {
        update: {
          ...(data.brand !== undefined ? { brand: data.brand } : {}),
          ...(data.memoryType !== undefined ? { memoryType: data.memoryType } : {}),
          ...(data.capacity !== undefined ? { capacity: this.payload.toInt(data.capacity) } : {}),
          ...(data.speed !== undefined ? { speed: this.payload.toInt(data.speed) } : {}),
          ...(data.modules !== undefined ? { modules: this.payload.toInt(data.modules) } : {}),
          ...(data.latency !== undefined ? { latency: data.latency || null } : {}),
          ...(data.hasRGB !== undefined ? { hasRGB: this.payload.toBool(data.hasRGB) } : {}),
        },
      },
    };
  }

  private buildGpuSpecUpdate(currentProduct: any, data: UpdateProductDto) {
    if (
      data.brand === undefined &&
      data.chipset === undefined &&
      data.vram === undefined &&
      data.typeVram === undefined &&
      data.length === undefined &&
      data.gpuPowerWatts === undefined &&
      data.tdp === undefined &&
      data.recommendedPsuWatts === undefined &&
      data.fans === undefined
    ) {
      return {};
    }

    const nextGpuBrand = String(data.brand ?? currentProduct.gpuSpecs?.brand ?? '').trim();
    const nextGpuPower = this.payload.hasValue(data.gpuPowerWatts)
      ? this.payload.toInt(data.gpuPowerWatts)
      : this.payload.toInt(
          data.tdp ?? currentProduct.gpuSpecs?.gpuPowerWatts ?? currentProduct.gpuSpecs?.tdp,
        );

    if (!nextGpuBrand) {
      throw new BadRequestException('Selecciona la marca ensambladora de la tarjeta grafica.');
    }

    if (nextGpuPower <= 0) {
      throw new BadRequestException('El consumo real de la GPU debe ser mayor a 0');
    }

    if (
      this.payload.hasValue(data.recommendedPsuWatts) &&
      this.payload.toInt(data.recommendedPsuWatts) <= 0
    ) {
      throw new BadRequestException('La PSU recomendada debe ser mayor a 0');
    }

    if (this.payload.hasValue(data.fans) && this.payload.toInt(data.fans) <= 0) {
      throw new BadRequestException('La cantidad de ventiladores debe ser mayor a 0');
    }

    return {
      gpuSpecs: {
        update: {
          ...(data.brand !== undefined ? { brand: data.brand } : {}),
          ...(data.chipset !== undefined ? { chipset: data.chipset } : {}),
          ...(data.vram !== undefined ? { vram: this.payload.toInt(data.vram) } : {}),
          ...(data.typeVram !== undefined ? { typeVram: data.typeVram || null } : {}),
          ...(data.length !== undefined ? { length: this.payload.toInt(data.length) } : {}),
          ...(data.gpuPowerWatts !== undefined || data.tdp !== undefined
            ? { gpuPowerWatts: nextGpuPower, tdp: nextGpuPower }
            : {}),
          ...(data.recommendedPsuWatts !== undefined
            ? {
                recommendedPsuWatts: !this.payload.hasValue(data.recommendedPsuWatts)
                  ? null
                  : this.payload.toInt(data.recommendedPsuWatts),
              }
            : {}),
          ...(data.fans !== undefined
            ? {
                fans: !this.payload.hasValue(data.fans) ? 0 : this.payload.toInt(data.fans),
              }
            : {}),
        },
      },
    };
  }

  private buildCaseSpecUpdate(currentProduct: any, data: UpdateProductDto) {
    if (
      data.brand === undefined &&
      data.formFactor === undefined &&
      data.supportedFormFactors === undefined &&
      data.maxGpuLength === undefined &&
      data.includesPsu === undefined &&
      data.supportsTowerCooler === undefined &&
      data.includedFans === undefined &&
      data.radiatorSupportMm === undefined &&
      data.radiatorSupportMmValues === undefined
    ) {
      return {};
    }

    const nextCaseBrand = String(data.brand ?? currentProduct.caseSpecs?.brand ?? '').trim();
    if (!nextCaseBrand) {
      throw new BadRequestException('Selecciona la marca del gabinete.');
    }

    const nextSupportedFormFactors =
      data.supportedFormFactors !== undefined || data.formFactor !== undefined
        ? this.payload.toStringArray(data.supportedFormFactors ?? data.formFactor)
        : this.payload.toStringArray(
            currentProduct.caseSpecs?.supportedFormFactors?.length
              ? currentProduct.caseSpecs.supportedFormFactors
              : currentProduct.caseSpecs?.formFactor,
          );
    const nextRadiatorValues =
      data.radiatorSupportMmValues !== undefined || data.radiatorSupportMm !== undefined
        ? this.payload.normalizeRadiatorValues(
            data.radiatorSupportMmValues ?? data.radiatorSupportMm,
          )
        : this.payload.normalizeRadiatorValues(
            currentProduct.caseSpecs?.radiatorSupportMmValues?.length
              ? currentProduct.caseSpecs.radiatorSupportMmValues
              : currentProduct.caseSpecs?.radiatorSupportMm,
          );
    const maxRadiator = nextRadiatorValues.includes('0')
      ? 0
      : Math.max(0, ...nextRadiatorValues.map((value) => this.payload.toInt(value)));

    return {
      caseSpecs: {
        update: {
          ...(data.brand !== undefined ? { brand: data.brand } : {}),
          ...(data.supportedFormFactors !== undefined || data.formFactor !== undefined
            ? {
                formFactor: nextSupportedFormFactors[0] || 'ATX',
                supportedFormFactors: nextSupportedFormFactors,
              }
            : {}),
          ...(data.maxGpuLength !== undefined
            ? { maxGpuLength: this.payload.toInt(data.maxGpuLength) }
            : {}),
          ...(data.includesPsu !== undefined
            ? { includesPsu: this.payload.toBool(data.includesPsu) }
            : {}),
          ...(data.supportsTowerCooler !== undefined
            ? { supportsTowerCooler: this.payload.toBool(data.supportsTowerCooler) }
            : {}),
          ...(data.includedFans !== undefined
            ? { includedFans: this.payload.toInt(data.includedFans) }
            : {}),
          ...(data.radiatorSupportMmValues !== undefined || data.radiatorSupportMm !== undefined
            ? { radiatorSupportMm: maxRadiator, radiatorSupportMmValues: nextRadiatorValues }
            : {}),
        },
      },
    };
  }

  private buildCoolerSpecUpdate(currentProduct: any, data: UpdateProductDto) {
    if (
      data.brand === undefined &&
      data.type === undefined &&
      data.compatibleSockets === undefined &&
      data.tdpCapacity === undefined &&
      data.radiatorSize === undefined &&
      data.hasRGB === undefined &&
      data.hasScreen === undefined
    ) {
      return {};
    }

    const nextCoolerBrand = String(data.brand ?? currentProduct.coolerSpecs?.brand ?? '').trim();
    const nextCoolerType = this.payload.normalizeCoolerType(
      data.type ?? currentProduct.coolerSpecs?.type,
    );
    const nextCompatibleSockets =
      data.compatibleSockets !== undefined
        ? this.payload.toStringArray(data.compatibleSockets)
        : this.payload.toStringArray(
            currentProduct.coolerSpecs?.compatibleSockets ??
              currentProduct.coolerSpecs?.socketSupport,
          );
    const nextTdpCapacity =
      data.tdpCapacity !== undefined
        ? this.payload.toInt(data.tdpCapacity)
        : this.payload.toInt(currentProduct.coolerSpecs?.tdpCapacity);

    if (!nextCoolerBrand) {
      throw new BadRequestException('Selecciona la marca del cooler.');
    }

    if (nextCompatibleSockets.length === 0) {
      throw new BadRequestException('Debes registrar sockets compatibles del cooler');
    }

    if (nextTdpCapacity <= 0) {
      throw new BadRequestException('El TDP soportado del cooler debe ser mayor a 0');
    }

    const nextRadiatorSize =
      data.radiatorSize !== undefined
        ? this.payload.toInt(data.radiatorSize)
        : this.payload.toInt(currentProduct.coolerSpecs?.radiatorSize);

    if (nextCoolerType === 'Líquida' && nextRadiatorSize <= 0) {
      throw new BadRequestException('Selecciona el tamaño de radiador del cooler líquido');
    }

    return {
      coolerSpecs: {
        update: {
          ...(data.brand !== undefined ? { brand: data.brand } : {}),
          ...(data.type !== undefined ? { type: nextCoolerType } : {}),
          ...(data.compatibleSockets !== undefined
            ? {
                compatibleSockets: this.payload.toStringArray(data.compatibleSockets),
                socketSupport: this.payload.toStringArray(data.compatibleSockets).join(', '),
              }
            : {}),
          ...(data.tdpCapacity !== undefined
            ? { tdpCapacity: this.payload.toInt(data.tdpCapacity) }
            : {}),
          ...(data.radiatorSize !== undefined || data.type !== undefined
            ? {
                radiatorSize: nextCoolerType === 'Líquida' ? nextRadiatorSize : null,
              }
            : {}),
          ...(data.hasRGB !== undefined ? { hasRGB: this.payload.toBool(data.hasRGB) } : {}),
          ...(data.hasScreen !== undefined
            ? { hasScreen: this.payload.toBool(data.hasScreen) }
            : {}),
        },
      },
    };
  }

  private buildPsuSpecUpdate(currentProduct: any, data: UpdateProductDto) {
    if (
      data.brand === undefined &&
      data.wattage === undefined &&
      data.certification === undefined &&
      data.modular === undefined &&
      data.formFactor === undefined
    ) {
      return {};
    }

    const nextPsuBrand = String(data.brand ?? currentProduct.psuSpecs?.brand ?? '').trim();
    const nextWattage =
      data.wattage !== undefined
        ? this.payload.toInt(data.wattage)
        : this.payload.toInt(currentProduct.psuSpecs?.wattage);

    if (!nextPsuBrand) {
      throw new BadRequestException('Selecciona la marca de la fuente de poder.');
    }

    if (nextWattage <= 0) {
      throw new BadRequestException('La potencia de la fuente debe ser mayor a 0');
    }

    return {
      psuSpecs: {
        update: {
          ...(data.brand !== undefined ? { brand: data.brand } : {}),
          ...(data.wattage !== undefined ? { wattage: this.payload.toInt(data.wattage) } : {}),
          ...(data.certification !== undefined ? { certification: data.certification } : {}),
          ...(data.modular !== undefined ? { modular: data.modular } : {}),
          ...(data.formFactor !== undefined ? { formFactor: data.formFactor } : {}),
        },
      },
    };
  }

  private buildStorageSpecUpdate(currentProduct: any, data: UpdateProductDto) {
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

    const nextStorageType = this.payload.normalizeStorageType(
      data.type ?? currentProduct.storageSpecs?.type,
    );
    const nextM2FormFactor = data.m2FormFactor ?? currentProduct.storageSpecs?.m2FormFactor;
    const isM2 = this.payload.isM2StorageType(nextStorageType);
    if (isM2 && !nextM2FormFactor) {
      throw new BadRequestException(
        'El tamaÃ±o fisico M.2 es obligatorio para almacenamientos M.2',
      );
    }
    return {
      storageSpecs: {
        update: {
          ...(data.type !== undefined ? { type: nextStorageType } : {}),
          ...(data.capacity !== undefined ? { capacity: this.payload.toInt(data.capacity) } : {}),
          ...(data.interface !== undefined ? { interface: data.interface } : {}),
          ...(data.readSpeed !== undefined
            ? { readSpeed: this.payload.toInt(data.readSpeed) }
            : {}),
          ...(data.writeSpeed !== undefined
            ? { writeSpeed: this.payload.toInt(data.writeSpeed) }
            : {}),
          ...(data.m2FormFactor !== undefined || data.type !== undefined
            ? { m2FormFactor: isM2 ? data.m2FormFactor || nextM2FormFactor || null : null }
            : {}),
        },
      },
    };
  }

  private buildLaptopSpecUpdate(currentProduct: any, data: UpdateProductDto) {
    if (
      data.brand === undefined &&
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

    const nextLaptopBrand = String(data.brand ?? currentProduct.laptopSpecs?.brand ?? '').trim();
    if (!nextLaptopBrand) {
      throw new BadRequestException('Selecciona la marca de la laptop.');
    }

    this.validation.ensureNonNegative('refreshRate', data.refreshRate);
    return {
      laptopSpecs: {
        update: {
          ...(data.brand !== undefined ? { brand: data.brand } : {}),
          ...(data.processor !== undefined ? { processor: data.processor } : {}),
          ...(data.ram !== undefined ? { ram: data.ram } : {}),
          ...(data.storage !== undefined ? { storage: data.storage } : {}),
          ...(data.screenSize !== undefined ? { screenSize: data.screenSize } : {}),
          ...(data.refreshRate !== undefined
            ? { refreshRate: this.payload.toInt(data.refreshRate) }
            : {}),
          ...(data.panelType !== undefined ? { panelType: data.panelType } : {}),
          ...(data.hasDedicatedGpu !== undefined
            ? { hasDedicatedGpu: this.payload.toBool(data.hasDedicatedGpu) }
            : {}),
          ...(data.gpuBrand !== undefined ? { gpuBrand: data.gpuBrand } : {}),
          ...(data.gpuModel !== undefined ? { gpuModel: data.gpuModel } : {}),
          ...(data.includesWindows !== undefined
            ? { includesWindows: this.payload.toBool(data.includesWindows) }
            : {}),
        },
      },
    };
  }

  private buildPcDesktopSpecUpdate(currentProduct: any, data: UpdateProductDto) {
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

    this.validation.ensureNonNegative('psuWatts', data.psuWatts, false);
    return {
      desktopSpecs: {
        update: {
          ...(data.processor !== undefined ? { processor: data.processor } : {}),
          ...(data.ram !== undefined ? { ram: data.ram } : {}),
          ...(data.storage !== undefined ? { storage: data.storage } : {}),
          ...(data.hasDedicatedGpu !== undefined
            ? { hasDedicatedGpu: this.payload.toBool(data.hasDedicatedGpu) }
            : {}),
          ...(data.gpuBrand !== undefined ? { gpuBrand: data.gpuBrand } : {}),
          ...(data.gpuModel !== undefined ? { gpuModel: data.gpuModel } : {}),
          ...(data.coolerType !== undefined ? { coolerType: data.coolerType } : {}),
          ...(data.psuWatts !== undefined ? { psuWatts: this.payload.toInt(data.psuWatts) } : {}),
          ...(data.caseModel !== undefined ? { caseModel: data.caseModel } : {}),
        },
      },
    };
  }

  private buildMonitorSpecUpdate(currentProduct: any, data: UpdateProductDto) {
    if (
      data.brand === undefined &&
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

    const nextMonitorBrand = String(data.brand ?? currentProduct.monitorSpecs?.brand ?? '').trim();
    if (!nextMonitorBrand) {
      throw new BadRequestException('Selecciona la marca del monitor.');
    }

    this.validation.ensureNonNegative('refreshRate', data.refreshRate);
    this.validation.ensureNonNegative('responseTimeMs', data.responseTimeMs, false);
    return {
      monitorSpecs: {
        update: {
          ...(data.brand !== undefined ? { brand: data.brand } : {}),
          ...(data.screenSize !== undefined ? { screenSize: data.screenSize } : {}),
          ...(data.resolution !== undefined ? { resolution: data.resolution } : {}),
          ...(data.panelType !== undefined ? { panelType: data.panelType } : {}),
          ...(data.refreshRate !== undefined
            ? { refreshRate: this.payload.toInt(data.refreshRate) }
            : {}),
          ...(data.responseTimeMs !== undefined
            ? { responseTimeMs: this.payload.toFloat(data.responseTimeMs) }
            : {}),
          ...(data.ports !== undefined ? { ports: this.payload.toStringArray(data.ports) } : {}),
          ...(data.hasSpeakers !== undefined
            ? { hasSpeakers: this.payload.toBool(data.hasSpeakers) }
            : {}),
        },
      },
    };
  }

  private buildKeyboardSpecUpdate(currentProduct: any, data: UpdateProductDto) {
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

    const nextKeyboardBrand = String(
      data.brand ?? currentProduct.keyboardSpecs?.brand ?? '',
    ).trim();
    if (!nextKeyboardBrand) {
      throw new BadRequestException('Selecciona la marca del teclado.');
    }

    return {
      keyboardSpecs: {
        update: {
          ...(data.brand !== undefined ? { brand: data.brand } : {}),
          ...(data.keyboardType !== undefined ? { keyboardType: data.keyboardType } : {}),
          ...(data.connections !== undefined
            ? {
                connections: this.payload.toStringArray(data.connections),
                connection: this.payload.toStringArray(data.connections).join(', '),
              }
            : {}),
          ...(data.layoutLanguage !== undefined
            ? {
                layoutLanguage: data.layoutLanguage,
                layout: data.layoutLanguage,
              }
            : {}),
          ...(data.hasLighting !== undefined
            ? {
                hasLighting: this.payload.toBool(data.hasLighting),
                hasRGB: this.payload.toBool(data.hasLighting),
              }
            : {}),
          ...(data.switchType !== undefined ? { switchType: data.switchType } : {}),
          ...(data.keyboardFormFactor !== undefined
            ? { keyboardFormFactor: data.keyboardFormFactor }
            : {}),
        },
      },
    };
  }

  private buildMouseSpecUpdate(currentProduct: any, data: UpdateProductDto) {
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
    if (data.brand !== undefined && !String(data.brand || '').trim()) {
      throw new BadRequestException('Selecciona la marca del mouse.');
    }
    if (isUpdatingGamerMouse) {
      this.validation.ensureNonNegative('buttonCount', data.buttonCount, false);
      this.validation.ensureNonNegative('dpi', data.dpi, false);
    }
    this.validation.ensureNonNegative('weightGrams', data.weightGrams, false);
    return {
      mouseSpecs: {
        update: {
          ...(data.brand !== undefined ? { brand: data.brand } : {}),
          ...(data.mouseType !== undefined ? { mouseType: data.mouseType } : {}),
          ...(data.connections !== undefined
            ? {
                connections: this.payload.toStringArray(data.connections),
                connection: this.payload.toStringArray(data.connections).join(', '),
              }
            : {}),
          ...(data.mouseType === 'Oficina'
            ? { buttonCount: null, dpi: 0, pollingRateHz: null }
            : {}),
          ...(isUpdatingGamerMouse && data.buttonCount !== undefined
            ? { buttonCount: this.payload.toInt(data.buttonCount) }
            : {}),
          ...(isUpdatingGamerMouse && data.dpi !== undefined
            ? { dpi: this.payload.toInt(data.dpi) }
            : {}),
          ...(isUpdatingGamerMouse && data.pollingRateHz !== undefined
            ? { pollingRateHz: this.payload.toInt(data.pollingRateHz) }
            : {}),
          ...(data.weightGrams !== undefined
            ? { weightGrams: this.payload.toInt(data.weightGrams) }
            : {}),
          ...(data.powerType !== undefined ? { powerType: data.powerType } : {}),
        },
      },
    };
  }

  private buildWebcamSpecUpdate(currentProduct: any, data: UpdateProductDto) {
    if (data.brand === undefined && data.resolution === undefined && data.fps === undefined) {
      return {};
    }
    if (data.brand !== undefined && !String(data.brand || '').trim()) {
      throw new BadRequestException('Selecciona la marca de la webcam.');
    }
    if (data.fps !== undefined && ![30, 60].includes(this.payload.toInt(data.fps))) {
      throw new BadRequestException('Selecciona FPS validos.');
    }
    return {
      webcamSpecs: {
        update: {
          ...(data.brand !== undefined ? { brand: data.brand } : {}),
          ...(data.resolution !== undefined ? { resolution: data.resolution } : {}),
          ...(data.fps !== undefined ? { fps: this.payload.toInt(data.fps) } : {}),
        },
      },
    };
  }

  private buildCaptureCardSpecUpdate(currentProduct: any, data: UpdateProductDto) {
    if (data.brand === undefined && data.resolution === undefined && data.fps === undefined) {
      return {};
    }
    if (data.brand !== undefined && !String(data.brand || '').trim()) {
      throw new BadRequestException('Selecciona la marca de la capturadora.');
    }
    if (data.fps !== undefined && ![30, 60, 120].includes(this.payload.toInt(data.fps))) {
      throw new BadRequestException('Selecciona FPS validos.');
    }
    return {
      captureCardSpecs: {
        update: {
          ...(data.brand !== undefined ? { brand: data.brand } : {}),
          ...(data.resolution !== undefined ? { resolution: data.resolution } : {}),
          ...(data.fps !== undefined ? { fps: this.payload.toInt(data.fps) } : {}),
        },
      },
    };
  }

  private buildCableHubSpecUpdate(currentProduct: any, data: UpdateProductDto) {
    if (
      data.brand === undefined &&
      data.cableHubType === undefined &&
      data.type === undefined &&
      data.cableType === undefined &&
      data.cableLengthMeters === undefined &&
      data.hubInputType === undefined &&
      data.hasHdmiOutput === undefined &&
      data.hasRj45Output === undefined
    ) {
      return {};
    }
    if (data.brand !== undefined && !String(data.brand || '').trim()) {
      throw new BadRequestException('Selecciona la marca de Cables y Hub.');
    }
    const nextCableHubType = data.cableHubType || data.type;
    if (nextCableHubType === 'Cable') {
      if (
        ![
          'HDMI a HDMI',
          'DisplayPort a DisplayPort',
          'Tipo C a HDMI',
          'Tipo C a DisplayPort',
          'Tipo C a Tipo C',
        ].includes(String(data.cableType || '').trim())
      ) {
        throw new BadRequestException('Selecciona el tipo de cable.');
      }
      if (![1, 2, 3].includes(this.payload.toInt(data.cableLengthMeters))) {
        throw new BadRequestException('Selecciona el largo del cable.');
      }
    }
    if (nextCableHubType === 'Hub') {
      if (!['USB-C', 'USB-A'].includes(String(data.hubInputType || '').trim())) {
        throw new BadRequestException('Selecciona el tipo de entrada del hub.');
      }
      if (data.hasHdmiOutput === undefined || data.hasRj45Output === undefined) {
        throw new BadRequestException('Selecciona las salidas HDMI y RJ45 del hub.');
      }
    }
    return {
      cableHubSpecs: {
        update: {
          ...(data.brand !== undefined ? { brand: data.brand } : {}),
          ...(nextCableHubType !== undefined
            ? {
                type: nextCableHubType,
                cableType: nextCableHubType === 'Cable' ? data.cableType || null : null,
                cableLengthMeters:
                  nextCableHubType === 'Cable' ? this.payload.toInt(data.cableLengthMeters) : null,
                hubInputType: nextCableHubType === 'Hub' ? data.hubInputType || null : null,
                hasHdmiOutput:
                  nextCableHubType === 'Hub' ? this.payload.toBool(data.hasHdmiOutput) : null,
                hasRj45Output:
                  nextCableHubType === 'Hub' ? this.payload.toBool(data.hasRj45Output) : null,
              }
            : {}),
          ...(nextCableHubType === undefined && data.cableType !== undefined
            ? { cableType: data.cableType }
            : {}),
          ...(nextCableHubType === undefined && data.cableLengthMeters !== undefined
            ? { cableLengthMeters: this.payload.toInt(data.cableLengthMeters) }
            : {}),
          ...(nextCableHubType === undefined && data.hubInputType !== undefined
            ? { hubInputType: data.hubInputType }
            : {}),
          ...(nextCableHubType === undefined && data.hasHdmiOutput !== undefined
            ? { hasHdmiOutput: this.payload.toBool(data.hasHdmiOutput) }
            : {}),
          ...(nextCableHubType === undefined && data.hasRj45Output !== undefined
            ? { hasRj45Output: this.payload.toBool(data.hasRj45Output) }
            : {}),
        },
      },
    };
  }

  private buildLaptopCoolingBaseSpecUpdate(currentProduct: any, data: UpdateProductDto) {
    if (
      data.brand === undefined &&
      data.fanCount === undefined &&
      data.connectivity === undefined &&
      data.supportedLaptopSize === undefined &&
      data.hasRGB === undefined &&
      data.color === undefined
    ) {
      return {};
    }
    if (data.brand !== undefined && !String(data.brand || '').trim()) {
      throw new BadRequestException('Selecciona la marca de la base refrigeradora.');
    }
    if (
      data.fanCount !== undefined &&
      ![1, 2, 3, 4, 5, 6].includes(this.payload.toInt(data.fanCount))
    ) {
      throw new BadRequestException('Selecciona la cantidad de ventiladores.');
    }
    if (
      data.connectivity !== undefined &&
      !['USB-A', 'USB-C'].includes(String(data.connectivity))
    ) {
      throw new BadRequestException('Selecciona la conectividad de la base refrigeradora.');
    }
    if (data.supportedLaptopSize !== undefined && !String(data.supportedLaptopSize || '').trim()) {
      throw new BadRequestException('Selecciona el tamaño de laptop soportado.');
    }
    return {
      laptopCoolingBaseSpecs: {
        update: {
          ...(data.brand !== undefined ? { brand: data.brand } : {}),
          ...(data.fanCount !== undefined ? { fanCount: this.payload.toInt(data.fanCount) } : {}),
          ...(data.connectivity !== undefined ? { connectivity: data.connectivity } : {}),
          ...(data.supportedLaptopSize !== undefined
            ? { supportedLaptopSize: data.supportedLaptopSize }
            : {}),
          ...(data.hasRGB !== undefined ? { hasRGB: this.payload.toBool(data.hasRGB) } : {}),
          ...(data.color !== undefined ? { color: data.color } : {}),
        },
      },
    };
  }

  private buildBackpackSpecUpdate(currentProduct: any, data: UpdateProductDto) {
    if (
      data.brand === undefined &&
      data.color === undefined &&
      data.supportedLaptopSize === undefined
    ) {
      return {};
    }
    if (data.brand !== undefined && !String(data.brand || '').trim()) {
      throw new BadRequestException('Selecciona la marca de la mochila.');
    }
    if (data.color !== undefined && !String(data.color || '').trim()) {
      throw new BadRequestException('Selecciona el color de la mochila.');
    }
    return {
      backpackSpecs: {
        update: {
          ...(data.brand !== undefined ? { brand: data.brand } : {}),
          ...(data.color !== undefined ? { color: data.color } : {}),
          ...(data.supportedLaptopSize !== undefined
            ? { supportedLaptopSize: data.supportedLaptopSize }
            : {}),
        },
      },
    };
  }

  private buildHeadsetSpecUpdate(currentProduct: any, data: UpdateProductDto) {
    if (
      data.brand === undefined &&
      data.connection === undefined &&
      data.supportedConnections === undefined &&
      data.driverSize === undefined &&
      data.impedance === undefined &&
      data.micType === undefined &&
      data.noiseCancel === undefined &&
      data.hasRGB === undefined &&
      data.audioType === undefined &&
      data.micIntegrated === undefined &&
      data.micRemovable === undefined &&
      data.surroundSound === undefined &&
      data.consoleCompatible === undefined &&
      data.color === undefined
    ) {
      return {};
    }
    if (data.brand !== undefined && !String(data.brand || '').trim()) {
      throw new BadRequestException('Selecciona la marca del audifono.');
    }
    const nextHeadsetConnection = data.connection;
    if (
      nextHeadsetConnection !== undefined &&
      !['Cableado', 'Inalambrico', 'Bluetooth', '2.4 GHz'].includes(String(nextHeadsetConnection))
    ) {
      throw new BadRequestException('Selecciona la conexion del audifono.');
    }
    if (data.supportedConnections !== undefined) {
      const supportedConnections = this.payload.toStringArray(data.supportedConnections);
      if (!supportedConnections.length) {
        throw new BadRequestException('Selecciona al menos una conectividad soportada.');
      }
      const allowedOptions = [
        'Cable USB',
        'USB',
        'USB-C',
        'Jack 3.5 mm',
        'Jack 3.5mm',
        'USB Dongle 2.4 GHz',
        'Bluetooth',
        '2.4 GHz',
      ];
      const invalidOption = supportedConnections.find((option) => !allowedOptions.includes(option));
      if (invalidOption) {
        throw new BadRequestException('La conectividad soportada no es valida.');
      }
    }
    return {
      headsetSpecs: {
        update: {
          ...(data.brand !== undefined ? { brand: data.brand } : {}),
          ...(data.connection !== undefined ? { connection: data.connection } : {}),
          ...(data.supportedConnections !== undefined
            ? {
                supportedConnections: this.payload.toStringArray(data.supportedConnections),
              }
            : {}),
          ...(data.driverSize !== undefined
            ? { driverSize: this.payload.toInt(data.driverSize) }
            : {}),
          ...(data.impedance !== undefined
            ? { impedance: this.payload.toInt(data.impedance) }
            : {}),
          ...(data.micType !== undefined ? { micType: data.micType } : {}),
          ...(data.noiseCancel !== undefined
            ? { noiseCancel: this.payload.toBool(data.noiseCancel) }
            : {}),
          ...(data.hasRGB !== undefined ? { hasRGB: this.payload.toBool(data.hasRGB) } : {}),
          ...(data.audioType !== undefined ? { audioType: data.audioType } : {}),
          ...(data.micIntegrated !== undefined
            ? { micIntegrated: this.payload.toBool(data.micIntegrated) }
            : {}),
          ...(data.micRemovable !== undefined
            ? { micRemovable: this.payload.toBool(data.micRemovable) }
            : {}),
          ...(data.surroundSound !== undefined ? { surroundSound: data.surroundSound } : {}),
          ...(data.consoleCompatible !== undefined
            ? { consoleCompatible: this.payload.toBool(data.consoleCompatible) }
            : {}),
          ...(data.color !== undefined ? { color: data.color } : {}),
        },
      },
    };
  }

  private buildMicrophoneSpecUpdate(currentProduct: any, data: UpdateProductDto) {
    if (
      data.brand === undefined &&
      data.connection === undefined &&
      data.micType === undefined &&
      data.hasRGB === undefined &&
      data.microphoneType === undefined &&
      data.connectionTypes === undefined &&
      data.frequencyResponse === undefined &&
      data.includesArm === undefined &&
      data.includesPopFilter === undefined &&
      data.color === undefined
    ) {
      return {};
    }
    if (data.brand !== undefined && !String(data.brand || '').trim()) {
      throw new BadRequestException('Selecciona la marca del microfono.');
    }
    return {
      microphoneSpecs: {
        update: {
          ...(data.brand !== undefined ? { brand: data.brand } : {}),
          ...(data.connection !== undefined ? { connection: data.connection } : {}),
          ...(data.micType !== undefined ? { micType: data.micType } : {}),
          ...(data.hasRGB !== undefined ? { hasRGB: this.payload.toBool(data.hasRGB) } : {}),
          ...(data.microphoneType !== undefined ? { microphoneType: data.microphoneType } : {}),
          ...(data.connectionTypes !== undefined
            ? { connectionTypes: this.payload.toStringArray(data.connectionTypes) }
            : {}),
          ...(data.frequencyResponse !== undefined
            ? { frequencyResponse: data.frequencyResponse }
            : {}),
          ...(data.includesArm !== undefined
            ? { includesArm: this.payload.toBool(data.includesArm) }
            : {}),
          ...(data.includesPopFilter !== undefined
            ? { includesPopFilter: this.payload.toBool(data.includesPopFilter) }
            : {}),
          ...(data.color !== undefined ? { color: data.color } : {}),
        },
      },
    };
  }

  private buildSpeakerSpecUpdate(currentProduct: any, data: UpdateProductDto) {
    if (
      data.brand === undefined &&
      data.connection === undefined &&
      data.wattage === undefined &&
      data.hasRGB === undefined &&
      data.speakerType === undefined &&
      data.channels === undefined &&
      data.connectionTypes === undefined &&
      data.hasSubwoofer === undefined &&
      data.remoteControl === undefined &&
      data.color === undefined
    ) {
      return {};
    }
    if (data.brand !== undefined && !String(data.brand || '').trim()) {
      throw new BadRequestException('Selecciona la marca del parlante.');
    }
    return {
      speakerSpecs: {
        update: {
          ...(data.brand !== undefined ? { brand: data.brand } : {}),
          ...(data.connection !== undefined ? { connection: data.connection } : {}),
          ...(data.wattage !== undefined ? { wattage: this.payload.toInt(data.wattage) } : {}),
          ...(data.hasRGB !== undefined ? { hasRGB: this.payload.toBool(data.hasRGB) } : {}),
          ...(data.speakerType !== undefined ? { speakerType: data.speakerType } : {}),
          ...(data.channels !== undefined ? { channels: data.channels } : {}),
          ...(data.connectionTypes !== undefined
            ? { connectionTypes: this.payload.toStringArray(data.connectionTypes) }
            : {}),
          ...(data.hasSubwoofer !== undefined
            ? { hasSubwoofer: this.payload.toBool(data.hasSubwoofer) }
            : {}),
          ...(data.remoteControl !== undefined
            ? { remoteControl: this.payload.toBool(data.remoteControl) }
            : {}),
          ...(data.color !== undefined ? { color: data.color } : {}),
        },
      },
    };
  }

  private buildMousepadSpecUpdate(currentProduct: any, data: UpdateProductDto) {
    if (
      data.brand === undefined &&
      data.widthCm === undefined &&
      data.lengthCm === undefined &&
      data.hasLed === undefined
    ) {
      return {};
    }

    this.validation.ensureNonNegative('widthCm', data.widthCm, false);
    this.validation.ensureNonNegative('lengthCm', data.lengthCm, false);
    return {
      mousepadSpecs: {
        update: {
          ...(data.brand !== undefined ? { brand: data.brand } : {}),
          ...(data.widthCm !== undefined ? { widthCm: this.payload.toInt(data.widthCm) } : {}),
          ...(data.lengthCm !== undefined ? { lengthCm: this.payload.toInt(data.lengthCm) } : {}),
          ...(data.hasLed !== undefined ? { hasLed: this.payload.toBool(data.hasLed) } : {}),
        },
      },
    };
  }

  private buildChairSpecUpdate(currentProduct: any, data: UpdateProductDto) {
    if (
      data.brand === undefined &&
      data.color === undefined &&
      data.material === undefined &&
      data.maxWeightKg === undefined
    ) {
      return {};
    }

    this.validation.ensureNonNegative('maxWeightKg', data.maxWeightKg, false);
    return {
      chairSpecs: {
        update: {
          ...(data.brand !== undefined ? { brand: data.brand } : {}),
          ...(data.color !== undefined ? { color: data.color } : {}),
          ...(data.material !== undefined ? { material: data.material } : {}),
          ...(data.maxWeightKg !== undefined
            ? { maxWeightKg: this.payload.toInt(data.maxWeightKg) }
            : {}),
        },
      },
    };
  }

  private buildGamingDeskSpecUpdate(currentProduct: any, data: UpdateProductDto) {
    if (
      data.brand === undefined &&
      data.color === undefined &&
      data.surface === undefined &&
      data.weightKg === undefined
    ) {
      return {};
    }

    this.validation.ensureNonNegative('weightKg', data.weightKg, false);
    return {
      gamingDeskSpecs: {
        update: {
          ...(data.brand !== undefined ? { brand: data.brand } : {}),
          ...(data.color !== undefined ? { color: data.color } : {}),
          ...(data.surface !== undefined ? { surface: data.surface } : {}),
          ...(data.weightKg !== undefined ? { weightKg: this.payload.toInt(data.weightKg) } : {}),
        },
      },
    };
  }
}
