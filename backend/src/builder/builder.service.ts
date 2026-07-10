import { Injectable, NotFoundException } from '@nestjs/common';
import { CategoryType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BuildItemDto } from './dto/validate-build.dto';

type BuildValidationIssue = {
  code: string;
  message: string;
  products?: string[];
};

const BUILD_PRODUCT_INCLUDE = {
  cpuSpecs: true,
  motherboardSpecs: true,
  ramSpecs: true,
  gpuSpecs: true,
  psuSpecs: true,
  caseSpecs: true,
  coolerSpecs: true,
  storageSpecs: true,
} as const;

type BuilderProduct = {
  id: string;
  category: string;
  cpuSpecs?: { socket?: string | null; tdp?: number | null } | null;
  motherboardSpecs?: {
    socket?: string | null;
    formFactor?: string | null;
    memoryType?: string | null;
    m2Slots?: number | null;
    supportedM2FormFactors?: string[] | null;
  } | null;
  ramSpecs?: { memoryType?: string | null } | null;
  gpuSpecs?: {
    length?: number | null;
    tdp?: number | null;
    gpuPowerWatts?: number | null;
    recommendedPsuWatts?: number | null;
  } | null;
  psuSpecs?: { wattage?: number | null } | null;
  caseSpecs?: {
    formFactor?: string | null;
    supportedFormFactors?: string[] | null;
    maxGpuLength?: number | null;
    supportsTowerCooler?: boolean | null;
    includedFans?: number | null;
    radiatorSupportMm?: number | null;
    radiatorSupportMmValues?: string[] | null;
  } | null;
  coolerSpecs?: {
    socketSupport?: string | null;
    compatibleSockets?: string[] | null;
    tdpCapacity?: number | null;
    type?: string | null;
    radiatorSize?: number | null;
  } | null;
  storageSpecs?: {
    type?: string | null;
    interface?: string | null;
    m2FormFactor?: string | null;
  } | null;
};

const BASE_SYSTEM_POWER_WATTS = 75;
const PSU_HEADROOM_MULTIPLIER = 1.2;

@Injectable()
export class BuilderService {
  constructor(private prisma: PrismaService) {}

  async getCompatibleMotherboards(cpuId?: string) {
    const whereClause: any = {
      category: CategoryType.MOTHERBOARD,
      stock: { gt: 0 },
    };

    if (cpuId) {
      const selectedCpu = await this.prisma.product.findUnique({
        where: { id: cpuId },
        include: { cpuSpecs: true },
      });

      if (!selectedCpu || !selectedCpu.cpuSpecs) {
        throw new NotFoundException('CPU no encontrado o sin especificaciones');
      }

      whereClause.motherboardSpecs = {
        socket: selectedCpu.cpuSpecs.socket,
      };
    }

    return this.prisma.product.findMany({
      where: whereClause,
      include: {
        motherboardSpecs: true,
      },
    });
  }

  async getCompatibleRam(motherboardId?: string) {
    const whereClause: any = {
      category: CategoryType.RAM,
      stock: { gt: 0 },
    };

    if (motherboardId) {
      const selectedMobo = await this.prisma.product.findUnique({
        where: { id: motherboardId },
        include: { motherboardSpecs: true },
      });

      if (!selectedMobo || !selectedMobo.motherboardSpecs) {
        throw new NotFoundException('Placa madre no encontrada');
      }

      whereClause.ramSpecs = {
        memoryType: selectedMobo.motherboardSpecs.memoryType,
      };
    }

    return this.prisma.product.findMany({
      where: whereClause,
      include: { ramSpecs: true },
    });
  }

  async getCpus() {
    return this.prisma.product.findMany({
      where: {
        category: CategoryType.CPU,
        stock: { gt: 0 },
      },
      include: { cpuSpecs: true },
    });
  }

  async validateBuild(items: BuildItemDto[]) {
    const productIds = [...new Set(items.map((item) => item.productId.trim()).filter(Boolean))];
    const products = await this.findBuildProducts(productIds);
    const foundIds = new Set(products.map((product) => product.id));
    const errors: BuildValidationIssue[] = [];
    const warnings: BuildValidationIssue[] = [];

    for (const productId of productIds) {
      if (!foundIds.has(productId)) {
        errors.push({
          code: 'PRODUCT_NOT_FOUND',
          message: 'Uno de los productos seleccionados no existe.',
          products: [productId],
        });
      }
    }

    const byCategory = new Map<string, BuilderProduct>();
    for (const product of products) {
      const normalizedCategory = this.normalizeText(product.category);
      if (!byCategory.has(normalizedCategory)) {
        byCategory.set(normalizedCategory, product);
      }
    }

    const cpu = byCategory.get('CPU');
    const motherboard = byCategory.get('MOTHERBOARD');
    const ram = byCategory.get('RAM');
    const gpu = byCategory.get('GPU');
    const psu = byCategory.get('PSU');
    const pcCase = byCategory.get('CASE');
    const cooler = byCategory.get('COOLER');
    const storage = byCategory.get('STORAGE');

    this.validateCpuAndMotherboard(cpu, motherboard, errors);
    this.validateRamAndMotherboard(ram, motherboard, errors, warnings);

    const cpuTdp = this.toNumber(cpu?.cpuSpecs?.tdp);
    const gpuPower = this.toNumber(gpu?.gpuSpecs?.gpuPowerWatts ?? gpu?.gpuSpecs?.tdp);
    const estimatedPower = Math.ceil(
      BASE_SYSTEM_POWER_WATTS +
        cpuTdp +
        gpuPower +
        (motherboard ? 50 : 0) +
        (ram ? 10 : 0) +
        (storage ? 10 : 0) +
        (cooler ? 15 : 0) +
        this.toNumber(pcCase?.caseSpecs?.includedFans) * 3,
    );
    const gpuRecommendedPsu = this.toNumber(gpu?.gpuSpecs?.recommendedPsuWatts);
    const recommendedPsu = this.roundUpRecommendedPsu(
      Math.max(estimatedPower * PSU_HEADROOM_MULTIPLIER, gpuRecommendedPsu),
    );

    this.validatePower(cpu, gpu, psu, cpuTdp, gpuPower, recommendedPsu, errors, warnings);
    this.validateCooler(cpu, cooler, cpuTdp, errors, warnings);
    this.validateCaseAndMotherboard(pcCase, motherboard, errors, warnings);
    this.validateGpuAndCase(gpu, pcCase, errors, warnings);
    this.validateCoolerAndCase(cooler, pcCase, errors, warnings);
    this.validateStorageAndMotherboard(storage, motherboard, errors, warnings);

    return {
      compatible: errors.length === 0,
      errors,
      warnings,
      summary: {
        estimatedPower,
        recommendedPsu,
      },
    };
  }

  private async findBuildProducts(productIds: string[]) {
    return this.prisma.product.findMany({
      where: { id: { in: productIds } },
      include: BUILD_PRODUCT_INCLUDE,
    }) as Promise<BuilderProduct[]>;
  }

  private validateCpuAndMotherboard(
    cpu: BuilderProduct | undefined,
    motherboard: BuilderProduct | undefined,
    errors: BuildValidationIssue[],
  ) {
    if (cpu && !cpu.cpuSpecs?.socket) {
      errors.push({
        code: 'CPU_SOCKET_METADATA_MISSING',
        message: 'El procesador seleccionado no tiene metadata de socket.',
        products: [cpu.id],
      });
    }

    if (motherboard && !motherboard.motherboardSpecs?.socket) {
      errors.push({
        code: 'MOTHERBOARD_SOCKET_METADATA_MISSING',
        message: 'La placa madre seleccionada no tiene metadata de socket.',
        products: [motherboard.id],
      });
    }

    if (
      cpu?.cpuSpecs?.socket &&
      motherboard?.motherboardSpecs?.socket &&
      this.normalizeText(cpu.cpuSpecs.socket) !==
        this.normalizeText(motherboard.motherboardSpecs.socket)
    ) {
      errors.push({
        code: 'CPU_MOTHERBOARD_SOCKET_MISMATCH',
        message: 'El procesador seleccionado no es compatible con el socket de la placa madre.',
        products: [cpu.id, motherboard.id],
      });
    }
  }

  private validateRamAndMotherboard(
    ram: BuilderProduct | undefined,
    motherboard: BuilderProduct | undefined,
    errors: BuildValidationIssue[],
    warnings: BuildValidationIssue[],
  ) {
    if (
      ram?.ramSpecs?.memoryType &&
      motherboard?.motherboardSpecs?.memoryType &&
      this.normalizeText(ram.ramSpecs.memoryType) !==
        this.normalizeText(motherboard.motherboardSpecs.memoryType)
    ) {
      errors.push({
        code: 'RAM_MOTHERBOARD_MEMORY_TYPE_MISMATCH',
        message:
          'La memoria RAM seleccionada no coincide con el tipo soportado por la placa madre.',
        products: [ram.id, motherboard.id],
      });
    }

    if (ram && !ram.ramSpecs?.memoryType) {
      warnings.push({
        code: 'RAM_MEMORY_TYPE_METADATA_MISSING',
        message: 'La memoria RAM seleccionada no tiene metadata de tipo de memoria.',
        products: [ram.id],
      });
    }

    if (motherboard && !motherboard.motherboardSpecs?.memoryType) {
      warnings.push({
        code: 'MOTHERBOARD_MEMORY_TYPE_METADATA_MISSING',
        message: 'La placa madre seleccionada no tiene metadata de tipo de memoria.',
        products: [motherboard.id],
      });
    }
  }

  private validatePower(
    cpu: BuilderProduct | undefined,
    gpu: BuilderProduct | undefined,
    psu: BuilderProduct | undefined,
    cpuTdp: number,
    gpuPower: number,
    recommendedPsu: number,
    errors: BuildValidationIssue[],
    warnings: BuildValidationIssue[],
  ) {
    if (cpu && cpuTdp <= 0) {
      warnings.push({
        code: 'CPU_TDP_METADATA_MISSING',
        message: 'El procesador seleccionado no tiene TDP suficiente para estimar consumo.',
        products: [cpu.id],
      });
    }

    if (gpu && gpuPower <= 0) {
      warnings.push({
        code: 'GPU_POWER_METADATA_MISSING',
        message: 'La tarjeta grafica seleccionada no tiene consumo registrado.',
        products: [gpu.id],
      });
    }

    if (psu?.psuSpecs?.wattage && psu.psuSpecs.wattage < recommendedPsu) {
      errors.push({
        code: 'PSU_INSUFFICIENT_WATTAGE',
        message: `La fuente seleccionada no cubre el consumo estimado con margen de seguridad (${recommendedPsu}W).`,
        products: [psu.id],
      });
    }

    if (psu && !psu.psuSpecs?.wattage) {
      errors.push({
        code: 'PSU_WATTAGE_METADATA_MISSING',
        message: 'La fuente seleccionada no tiene metadata de wattage.',
        products: [psu.id],
      });
    }
  }

  private validateCooler(
    cpu: BuilderProduct | undefined,
    cooler: BuilderProduct | undefined,
    cpuTdp: number,
    errors: BuildValidationIssue[],
    warnings: BuildValidationIssue[],
  ) {
    if (!cpu || !cooler) {
      return;
    }

    const coolerSockets = this.splitSocketList(
      cooler.coolerSpecs?.compatibleSockets?.length
        ? cooler.coolerSpecs.compatibleSockets
        : cooler.coolerSpecs?.socketSupport,
    );

    if (coolerSockets.length === 0) {
      warnings.push({
        code: 'COOLER_SOCKET_METADATA_MISSING',
        message: 'El cooler seleccionado no tiene sockets compatibles registrados.',
        products: [cooler.id],
      });
    } else if (
      cpu.cpuSpecs?.socket &&
      !coolerSockets.some(
        (socket) => this.normalizeText(socket) === this.normalizeText(cpu.cpuSpecs?.socket),
      )
    ) {
      errors.push({
        code: 'COOLER_CPU_SOCKET_MISMATCH',
        message: 'El cooler seleccionado no es compatible con el socket del procesador.',
        products: [cooler.id, cpu.id],
      });
    }

    const coolerTdp = this.toNumber(cooler.coolerSpecs?.tdpCapacity);
    if (coolerTdp > 0 && cpuTdp > 0 && coolerTdp < cpuTdp) {
      errors.push({
        code: 'COOLER_TDP_INSUFFICIENT',
        message: 'El cooler seleccionado no soporta el TDP del procesador.',
        products: [cooler.id, cpu.id],
      });
    }
  }

  private validateCaseAndMotherboard(
    pcCase: BuilderProduct | undefined,
    motherboard: BuilderProduct | undefined,
    errors: BuildValidationIssue[],
    warnings: BuildValidationIssue[],
  ) {
    if (!pcCase || !motherboard) {
      return;
    }

    const caseFormFactors = this.getCaseFormFactors(pcCase);
    const motherboardFormFactor = this.normalizeText(motherboard.motherboardSpecs?.formFactor);

    if (caseFormFactors.length === 0 || !motherboardFormFactor) {
      warnings.push({
        code: 'CASE_MOTHERBOARD_FORM_FACTOR_METADATA_MISSING',
        message: 'Falta metadata de factor de forma para validar gabinete y placa madre.',
        products: [pcCase.id, motherboard.id],
      });
      return;
    }

    if (!caseFormFactors.includes(motherboardFormFactor)) {
      errors.push({
        code: 'CASE_MOTHERBOARD_FORM_FACTOR_MISMATCH',
        message:
          'El gabinete seleccionado no declara soporte para el factor de forma de la placa madre.',
        products: [pcCase.id, motherboard.id],
      });
    }
  }

  private validateCoolerAndCase(
    cooler: BuilderProduct | undefined,
    pcCase: BuilderProduct | undefined,
    errors: BuildValidationIssue[],
    warnings: BuildValidationIssue[],
  ) {
    if (!cooler || !pcCase) {
      return;
    }

    const coolerType = this.normalizeCoolerType(cooler.coolerSpecs?.type);
    if (coolerType === 'TORRE') {
      const supportsTowerCooler = pcCase.caseSpecs?.supportsTowerCooler;
      if (supportsTowerCooler === null || supportsTowerCooler === undefined) {
        warnings.push({
          code: 'COOLER_CASE_TOWER_METADATA_MISSING',
          message: 'El gabinete no declara si soporta refrigeración de torre.',
          products: [cooler.id, pcCase.id],
        });
        return;
      }

      if (!supportsTowerCooler) {
        errors.push({
          code: 'COOLER_CASE_TOWER_UNSUPPORTED',
          message: 'El gabinete seleccionado no soporta refrigeración de torre.',
          products: [cooler.id, pcCase.id],
        });
      }
      return;
    }

    const radiatorSize = this.toNumber(cooler.coolerSpecs?.radiatorSize);
    const supportedRadiators = this.getCaseRadiators(pcCase);
    if (!radiatorSize || supportedRadiators.length === 0) {
      warnings.push({
        code: 'COOLER_CASE_RADIATOR_METADATA_MISSING',
        message: 'Falta metadata para validar radiador de refrigeracion liquida contra gabinete.',
        products: [cooler.id, pcCase.id],
      });
      return;
    }

    if (!supportedRadiators.includes(radiatorSize)) {
      errors.push({
        code: 'COOLER_CASE_RADIATOR_UNSUPPORTED',
        message: 'El gabinete seleccionado no declara soporte para el radiador del cooler.',
        products: [cooler.id, pcCase.id],
      });
    }
  }

  private validateGpuAndCase(
    gpu: BuilderProduct | undefined,
    pcCase: BuilderProduct | undefined,
    errors: BuildValidationIssue[],
    warnings: BuildValidationIssue[],
  ) {
    if (!gpu || !pcCase) {
      return;
    }

    const caseMaxGpuLength = this.toNumber(pcCase.caseSpecs?.maxGpuLength);
    const gpuLength = this.toNumber(gpu.gpuSpecs?.length);

    if (!caseMaxGpuLength || !gpuLength) {
      warnings.push({
        code: 'GPU_CASE_LENGTH_METADATA_MISSING',
        message: 'Falta metadata para validar longitud de GPU contra gabinete.',
        products: [gpu.id, pcCase.id],
      });
      return;
    }

    if (gpuLength > caseMaxGpuLength) {
      errors.push({
        code: 'GPU_CASE_LENGTH_EXCEEDED',
        message:
          'La tarjeta grafica seleccionada excede el largo maximo soportado por el gabinete.',
        products: [gpu.id, pcCase.id],
      });
    }
  }

  private validateStorageAndMotherboard(
    storage: BuilderProduct | undefined,
    motherboard: BuilderProduct | undefined,
    errors: BuildValidationIssue[],
    warnings: BuildValidationIssue[],
  ) {
    if (!motherboard || !storage || !this.isM2Storage(storage)) {
      return;
    }

    const m2Slots = this.toNumber(motherboard.motherboardSpecs?.m2Slots);
    const supportedM2 = motherboard.motherboardSpecs?.supportedM2FormFactors ?? [];
    const storageFormFactor = storage.storageSpecs?.m2FormFactor;

    if (m2Slots <= 0) {
      errors.push({
        code: 'STORAGE_M2_NOT_SUPPORTED',
        message: 'La placa madre no tiene slots M.2 para el almacenamiento seleccionado.',
        products: [storage.id, motherboard.id],
      });
      return;
    }

    if (
      storageFormFactor &&
      supportedM2.length > 0 &&
      !supportedM2.some(
        (formFactor) => this.normalizeText(formFactor) === this.normalizeText(storageFormFactor),
      )
    ) {
      errors.push({
        code: 'STORAGE_M2_FORM_FACTOR_MISMATCH',
        message: 'La placa madre no soporta el tamano M.2 del almacenamiento seleccionado.',
        products: [storage.id, motherboard.id],
      });
      return;
    }

    if (!storageFormFactor || supportedM2.length === 0) {
      warnings.push({
        code: 'STORAGE_M2_METADATA_INCOMPLETE',
        message: 'Falta metadata completa para validar tamano M.2 de almacenamiento.',
        products: [storage.id, motherboard.id],
      });
    }
  }

  private normalizeText(value: unknown) {
    return String(value ?? '')
      .trim()
      .toUpperCase();
  }

  private normalizeCoolerType(value: unknown) {
    const normalized = this.normalizeText(value);
    return normalized.includes('LIQU') ? 'LIQUIDA' : 'TORRE';
  }

  private getCaseFormFactors(product?: BuilderProduct) {
    const values = product?.caseSpecs?.supportedFormFactors?.length
      ? product.caseSpecs.supportedFormFactors
      : product?.caseSpecs?.formFactor;
    const list = Array.isArray(values) ? values : String(values ?? '').split(/[;,]/);
    return list.map((value) => this.normalizeText(value)).filter(Boolean);
  }

  private getCaseRadiators(product?: BuilderProduct) {
    const values = product?.caseSpecs?.radiatorSupportMmValues?.length
      ? product.caseSpecs.radiatorSupportMmValues
      : product?.caseSpecs?.radiatorSupportMm;
    const list = Array.isArray(values) ? values : [values];
    return list.map((value) => this.toNumber(value)).filter((value) => value > 0);
  }

  private toNumber(value: unknown) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private splitSocketList(value: unknown) {
    if (Array.isArray(value)) {
      return value.map((item) => String(item).trim()).filter(Boolean);
    }

    return String(value ?? '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private isM2Storage(product?: BuilderProduct) {
    const type = this.normalizeText(product?.storageSpecs?.type);
    const formFactor = this.normalizeText(product?.storageSpecs?.m2FormFactor);
    const storageInterface = this.normalizeText(product?.storageSpecs?.interface);

    return (
      type.includes('M.2') ||
      type.includes('NVME') ||
      formFactor.startsWith('M.2') ||
      storageInterface.includes('NVME')
    );
  }

  private roundUpRecommendedPsu(watts: number) {
    return Math.ceil(watts / 50) * 50;
  }
}
