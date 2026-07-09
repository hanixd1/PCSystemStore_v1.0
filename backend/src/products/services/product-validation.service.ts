import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProductPayloadService } from './product-payload.service';

@Injectable()
export class ProductValidationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payload: ProductPayloadService = new ProductPayloadService(),
  ) {}

  private readonly nameRegex = /^[\p{L}\p{N}\s.,+\-_%/()[\]:;'"#&°@]{5,200}$/u;
  private readonly productNameMessage =
    'El nombre debe tener entre 5 y 200 caracteres y puede incluir caracteres técnicos comunes.';
  private readonly skuRegex = /^[A-Z0-9_-]{3,80}$/;
  private readonly minDescriptionLength = 10;
  private readonly maxDescriptionLength = 200;


  ensureNonNegative(field: string, value: any, allowZero = true) {
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

  ensureNoNegativeText(field: string, value: any) {
    if (value === '' || value === undefined || value === null) {
      return;
    }

    if (String(value).includes('-')) {
      throw new BadRequestException(`El campo ${field} no puede contener valores negativos`);
    }
  }

  validateDescription(description: string) {
    if (
      description.length < this.minDescriptionLength ||
      description.length > this.maxDescriptionLength
    ) {
      throw new BadRequestException('La descripción debe tener entre 10 y 200 caracteres');
    }

    if (!this.isSafeDescriptionText(description)) {
      throw new BadRequestException(
        'La descripción debe tener entre 10 y 200 caracteres y solo usar texto válido',
      );
    }
  }

  private isSafeDescriptionText(value: string): boolean {
    return Array.from(value).every((char) => {
      const code = char.codePointAt(0);
      return code !== undefined && (code === 9 || code === 10 || code === 13 || code >= 32);
    });
  }

  validateCommonFields(data: any, finalImages: string[]) {
    const trimmedName = String(data.name ?? '').trim();
    const trimmedDescription = String(data.description ?? '').trim();

    if (!this.nameRegex.test(trimmedName)) {
      throw new BadRequestException(this.productNameMessage);
    }

    this.validateDescription(trimmedDescription);

    if (finalImages.length < 1 || finalImages.length > 5) {
      throw new BadRequestException('Debes subir entre 1 y 5 imagenes');
    }

    this.ensureNonNegative('price', data.price, false);
    this.ensureNonNegative('stock', data.stock);

    if (!Number.isInteger(Number(data.stock))) {
      throw new BadRequestException('El campo stock debe ser un numero entero');
    }
  }

  validateCategoryFields(category: string, data: any) {
    this.validateCategoryNumericFields(category, data);
    this.validateCategoryTextFields(category, data);
    this.validateCoreCategoryFields(category, data);
    this.validatePeripheralCategoryFields(category, data);
  }

  private validateCategoryNumericFields(category: string, data: any) {
    const fieldsByCategory: Record<string, string[]> = {
      CPU: ['cores', 'tdp'],
      MOTHERBOARD: ['memorySlots', 'm2Slots'],
      RAM: ['capacity', 'speed', 'modules'],
      GPU: ['vram', 'length', 'gpuPowerWatts'],
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
      WEBCAM: ['fps'],
      CAPTURE_CARD: ['fps'],
      CABLE_HUB: [],
      LAPTOP_COOLING_BASE: ['fanCount'],
      BACKPACK: [],
    };

    for (const field of fieldsByCategory[category] || []) {
      this.ensureNonNegative(field, data[field]);
    }

    if (category === 'MOUSE' && data.mouseType === 'Gamer') {
      for (const field of ['dpi', 'buttonCount']) {
        this.ensureNonNegative(field, data[field]);
      }
    }
  }

  private validateCategoryTextFields(category: string, data: any) {
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
      WEBCAM: [],
      CAPTURE_CARD: [],
      CABLE_HUB: [],
      LAPTOP_COOLING_BASE: [],
      BACKPACK: ['color'],
    };

    for (const field of textFieldsByCategory[category] || []) {
      this.ensureNoNegativeText(field, data[field]);
    }
  }

  private validateCoreCategoryFields(category: string, data: any) {
    const validator = this.getCoreCategoryValidator(category);
    validator?.(data);
  }

  private getCoreCategoryValidator(category: string): ((data: any) => void) | undefined {
    const validators: Record<string, (data: any) => void> = {
      CPU: (data) => this.validateCpuCategory(data),
      MOTHERBOARD: (data) =>
        this.validateBrandRequired(data, 'Selecciona la marca de la placa madre.'),
      GPU: (data) => this.validateGpuCategory(data),
      COOLER: (data) => this.validateCoolerCategory(data),
      PSU: (data) => this.validateBrandRequired(data, 'Selecciona la marca de la fuente de poder.'),
      LAPTOP: (data) => this.validateBrandRequired(data, 'Selecciona la marca de la laptop.'),
      STORAGE: (data) => this.validateStorageCategory(data),
      MONITOR: (data) => this.validateMonitorCategory(data),
      PC_DESKTOP: (data) => this.validateDesktopCategory(data),
      CASE: (data) => this.validateCaseCategory(data),
    };

    return validators[category];
  }

  private validateCpuCategory(data: any) {
    const brand = String(data.cpuBrand || '').trim();
    const socket = String(data.socket || '').trim();
    this.validateCpuBrandSocket(brand, socket);
  }

  private validateGpuCategory(data: any) {
    const brand = String(data.brand || '').trim();
    const powerWatts = this.payload.hasValue(data.gpuPowerWatts)
      ? this.payload.toInt(data.gpuPowerWatts)
      : this.payload.toInt(data.tdp);

    if (!brand) {
      throw new BadRequestException('Selecciona la marca ensambladora de la tarjeta grafica.');
    }

    if (this.payload.toInt(data.vram) <= 0) {
      throw new BadRequestException('Selecciona la VRAM de la tarjeta grafica.');
    }

    if (this.payload.toInt(data.length) <= 0) {
      throw new BadRequestException('El largo de la GPU debe ser mayor a 0');
    }

    if (powerWatts <= 0) {
      throw new BadRequestException('El consumo real de la GPU debe ser mayor a 0');
    }

    if (this.payload.hasValue(data.recommendedPsuWatts) && this.payload.toInt(data.recommendedPsuWatts) <= 0) {
      throw new BadRequestException('La PSU recomendada debe ser mayor a 0');
    }

    if (this.payload.hasValue(data.fans) && this.payload.toInt(data.fans) <= 0) {
      throw new BadRequestException('La cantidad de ventiladores debe ser mayor a 0');
    }
  }

  private validateCoolerCategory(data: any) {
    const coolerType = this.payload.normalizeCoolerType(data.type);
    const compatibleSockets = this.payload.toStringArray(data.compatibleSockets);
    this.validateBrandRequired(data, 'Selecciona la marca del cooler.');

    if (compatibleSockets.length === 0) {
      throw new BadRequestException('Debes registrar sockets compatibles del cooler');
    }

    if (this.payload.toInt(data.tdpCapacity) <= 0) {
      throw new BadRequestException('El TDP soportado del cooler debe ser mayor a 0');
    }

    if (coolerType === 'Torre' && this.payload.toInt(data.coolerHeight) <= 0) {
      throw new BadRequestException('La altura del cooler de torre debe ser mayor a 0');
    }

    if (coolerType === 'Líquida' && this.payload.toInt(data.radiatorSize) <= 0) {
      throw new BadRequestException('Selecciona el tamaño de radiador del cooler líquido');
    }
  }

  private validateStorageCategory(data: any) {
    if (this.payload.isM2StorageType(data.type) && !data.m2FormFactor) {
      throw new BadRequestException(
        'El tamaÃ±o fisico M.2 es obligatorio para almacenamientos M.2',
      );
    }
  }

  private validateMonitorCategory(data: any) {
    this.validateBrandRequired(data, 'Selecciona la marca del monitor.');
    const ports = this.payload.toStringArray(data.ports);
    const allowedPorts = ['VGA', 'HDMI', 'DisplayPort', 'USB-C'];
    const invalidPort = ports.find((port) => !allowedPorts.includes(port));
    if (invalidPort) {
      throw new BadRequestException('Puerto de monitor no valido');
    }
  }

  private validateDesktopCategory(data: any) {
    if (data.psuWatts !== undefined && data.psuWatts !== '') {
      this.ensureNonNegative('psuWatts', data.psuWatts, false);
    }
  }

  private validateCaseCategory(data: any) {
    this.validateBrandRequired(data, 'Selecciona la marca del gabinete.');
    const supportedFormFactors = this.payload.toStringArray(data.supportedFormFactors ?? data.formFactor);

    if (supportedFormFactors.length === 0) {
      throw new BadRequestException('Selecciona al menos un soporte de placa para el gabinete.');
    }

    if (this.payload.toInt(data.maxGpuLength) <= 0) {
      throw new BadRequestException('El max largo GPU del gabinete debe ser mayor a 0.');
    }

    if (data.radiatorSupportMm !== undefined && data.radiatorSupportMm !== '') {
      this.ensureNonNegative('radiatorSupportMm', data.radiatorSupportMm, false);
    }

    if (data.maxCoolerHeight !== undefined && data.maxCoolerHeight !== '') {
      this.ensureNonNegative('maxCoolerHeight', data.maxCoolerHeight, false);
    }
  }
  private validatePeripheralCategoryFields(category: string, data: any) {
    this.validateKeyboardMouseConnections(category, data);
    this.validateKeyboardCategory(category, data);
    this.validateMouseCategory(category, data);
    this.validateWebcamCaptureCategory(category, data);
    this.validateCableHubCategory(category, data);
    this.validateLaptopCoolingBaseCategory(category, data);
    this.validateBackpackCategory(category, data);
    this.validateHeadsetCategory(category, data);
    this.validateBrandOnlyCategories(category, data);
  }

  private validateKeyboardMouseConnections(category: string, data: any) {
    const validConnections = ['Cableado', 'Bluetooth', 'Dongle USB', 'Inalambrico', '2.4 GHz'];
    if ((category === 'KEYBOARD' || category === 'MOUSE') && data.connections !== undefined) {
      const invalidConnection = this.payload.toStringArray(data.connections).find(
        (connection) => !validConnections.includes(connection),
      );
      if (invalidConnection) {
        throw new BadRequestException('Tipo de conexion no valido');
      }
    }
  }

  private validateKeyboardCategory(category: string, data: any) {
    if (category === 'KEYBOARD') {
      if (!String(data.brand || '').trim()) {
        throw new BadRequestException('Selecciona la marca del teclado.');
      }
      const keyboardType = String(data.keyboardType || '').trim();
      if (
        keyboardType &&
        !['Membrana', 'Semi-mecanico', 'Mecanico', 'Magnetico', 'Optico', 'Hibrido'].includes(
          keyboardType,
        )
      ) {
        throw new BadRequestException('Tipo de teclado no valido');
      }
    }
  }

  private validateMouseCategory(category: string, data: any) {
    if (category === 'MOUSE') {
      if (!String(data.brand || '').trim()) {
        throw new BadRequestException('Selecciona la marca del mouse.');
      }
      const mouseType = String(data.mouseType || '').trim();
      if (mouseType && !['Oficina', 'Gamer'].includes(mouseType)) {
        throw new BadRequestException('Tipo de mouse no valido');
      }
      if (
        mouseType === 'Gamer' &&
        data.pollingRateHz !== undefined &&
        ![1000, 2000, 4000, 8000].includes(this.payload.toInt(data.pollingRateHz))
      ) {
        throw new BadRequestException('Frecuencia de mouse no valida');
      }
      if (
        data.powerType !== undefined &&
        !['Pila', 'Bateria', 'Ninguno'].includes(String(data.powerType))
      ) {
        throw new BadRequestException('Tipo de energia de mouse no valido');
      }
    }
  }

  private validateWebcamCaptureCategory(category: string, data: any) {
    if (category === 'WEBCAM' || category === 'CAPTURE_CARD') {
      if (!String(data.brand || '').trim()) {
        throw new BadRequestException(
          category === 'WEBCAM'
            ? 'Selecciona la marca de la webcam.'
            : 'Selecciona la marca de la capturadora.',
        );
      }
      if (!['HD', 'FHD', '4K'].includes(String(data.resolution || '').trim())) {
        throw new BadRequestException('Selecciona una resolucion valida.');
      }
      const allowedFps = category === 'WEBCAM' ? [30, 60] : [30, 60, 120];
      if (!allowedFps.includes(this.payload.toInt(data.fps))) {
        throw new BadRequestException('Selecciona FPS validos.');
      }
    }
  }

  private validateCableHubCategory(category: string, data: any) {
    if (category !== 'CABLE_HUB') {
      return;
    }

    this.validateBrandRequired(data, 'Selecciona la marca de Cables y Hub.');
    const cableHubType = this.getCableHubType(data);
    this.validateCableHubType(cableHubType);
    this.validateCableFields(cableHubType, data);
    this.validateHubFields(cableHubType, data);
  }

  private getCableHubType(data: any): string {
    return String(data.cableHubType || data.type || '').trim();
  }

  private validateCableHubType(cableHubType: string) {
    if (!['Cable', 'Hub'].includes(cableHubType)) {
      throw new BadRequestException('Selecciona el tipo Cable o Hub.');
    }
  }

  private validateCableFields(cableHubType: string, data: any) {
    if (cableHubType !== 'Cable') {
      return;
    }

    const validCableTypes = [
      'HDMI a HDMI',
      'DisplayPort a DisplayPort',
      'Tipo C a HDMI',
      'Tipo C a DisplayPort',
      'Tipo C a Tipo C',
    ];

    if (!validCableTypes.includes(String(data.cableType || '').trim())) {
      throw new BadRequestException('Selecciona el tipo de cable.');
    }

    if (![1, 2, 3].includes(this.payload.toInt(data.cableLengthMeters))) {
      throw new BadRequestException('Selecciona el largo del cable.');
    }
  }

  private validateHubFields(cableHubType: string, data: any) {
    if (cableHubType !== 'Hub') {
      return;
    }

    if (!['USB-C', 'USB-A'].includes(String(data.hubInputType || '').trim())) {
      throw new BadRequestException('Selecciona el tipo de entrada del hub.');
    }

    if (data.hasHdmiOutput === undefined || data.hasRj45Output === undefined) {
      throw new BadRequestException('Selecciona las salidas HDMI y RJ45 del hub.');
    }
  }
  private validateLaptopCoolingBaseCategory(category: string, data: any) {
    if (category === 'LAPTOP_COOLING_BASE') {
      if (!String(data.brand || '').trim()) {
        throw new BadRequestException('Selecciona la marca de la base refrigeradora.');
      }
      if (![1, 2, 3, 4, 5, 6].includes(this.payload.toInt(data.fanCount))) {
        throw new BadRequestException('Selecciona la cantidad de ventiladores.');
      }
      if (!['USB-A', 'USB-C'].includes(String(data.connectivity || '').trim())) {
        throw new BadRequestException('Selecciona la conectividad de la base refrigeradora.');
      }
      if (!String(data.supportedLaptopSize || '').trim()) {
        throw new BadRequestException('Selecciona el tamaño de laptop soportado.');
      }
    }
  }

  private validateBackpackCategory(category: string, data: any) {
    if (category === 'BACKPACK') {
      if (!String(data.brand || '').trim()) {
        throw new BadRequestException('Selecciona la marca de la mochila.');
      }
      if (!String(data.color || '').trim()) {
        throw new BadRequestException('Selecciona el color de la mochila.');
      }
    }
  }

  private validateHeadsetCategory(category: string, data: any) {
    if (category === 'HEADSET') {
      if (!String(data.brand || '').trim()) {
        throw new BadRequestException('Selecciona la marca del audifono.');
      }
      const connection = String(data.connection || '').trim();
      if (!['Cableado', 'Inalambrico', 'Bluetooth', '2.4 GHz'].includes(connection)) {
        throw new BadRequestException('Selecciona la conexion del audifono.');
      }
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
  }

  private validateBrandOnlyCategories(category: string, data: any) {
    if (category === 'MICROPHONE') {
      if (!String(data.brand || '').trim()) {
        throw new BadRequestException('Selecciona la marca del microfono.');
      }
    }

    if (category === 'SPEAKER') {
      if (!String(data.brand || '').trim()) {
        throw new BadRequestException('Selecciona la marca del parlante.');
      }
    }
  }

  private validateBrandRequired(data: any, message: string) {
    if (!String(data.brand || '').trim()) {
      throw new BadRequestException(message);
    }
  }

  normalizeAndValidateSku(value: unknown) {
    const sku = String(value ?? '')
      .trim()
      .toUpperCase();

    if (!this.skuRegex.test(sku)) {
      throw new BadRequestException(
        'El SKU solo puede contener letras, números, guiones y guion bajo.',
      );
    }

    return sku;
  }

  async ensureSkuIsAvailable(sku: string, currentProductId?: string) {
    const existingProduct = await this.prisma.product.findUnique({ where: { sku } });
    if (existingProduct && existingProduct.id !== currentProductId) {
      throw new BadRequestException('Ya existe un producto registrado con este SKU.');
    }
  }


  validateCpuBrandSocket(brand: string, socket: string) {
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

}
