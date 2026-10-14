import { parseBooleanLike } from '@/lib/productPayload';
import { normalizeLaptopStorage } from '@/lib/normalizers';
import {
  CPU_SOCKETS_BY_BRAND,
  HEADSET_WIRED_CONNECTIONS,
  HEADSET_WIRELESS_CONNECTIONS,
} from './productFormConfig';

export const INITIAL_PRODUCT_FORM = {
  sku: '',
  name: '',
  description: '',
  price: '',
  isOnSale: 'false',
  salePrice: '',
  stock: '',
  category: '',
  cpuBrand: 'AMD',
  socket: 'AM5',
  cores: '',
  threads: '',
  frequency: '',
  baseTdpWatts: '',
  tdp: '',
  integratedGraphics: 'false',
  includesCooler: 'false',
  memorySlots: '4',
  m2Slots: '2',
  formFactor: 'ATX',
  supportedM2FormFactors: ['2280'],
  memoryType: 'DDR5',
  capacity: '16',
  speed: '5200',
  modules: '1',
  latency: '',
  hasRGB: 'false',
  chipset: 'NVIDIA GeForce',
  vram: '8',
  typeVram: 'GDDR6',
  length: '',
  gpuPowerWatts: '',
  recommendedPsuWatts: '',
  fans: '2',
  wattage: '',
  certification: '80+ Bronze',
  modular: 'No Modular',
  maxGpuLength: '',
  supportedFormFactors: ['ATX'],
  includesPsu: 'false',
  supportsTowerCooler: 'true',
  includedFans: '0',
  radiatorSupportMm: '0',
  radiatorSupportMmValues: ['0'],
  type: 'Torre',
  fanCount: '1',
  supportedLaptopSize: '15.6"',
  radiatorSize: '240',
  hasScreen: 'false',
  compatibleSockets: ['AM4', 'AM5'],
  tdpCapacity: '',
  interface: 'PCIe 4.0',
  readSpeed: '',
  writeSpeed: '',
  m2FormFactor: '2280',
  screenSize: '15.6',
  refreshRate: '60',
  panelType: 'IPS',
  resolution: 'FHD (1920x1080)',
  processor: '',
  ram: '8GB',
  storage: '512GB SSD',
  hasDedicatedGpu: 'false',
  gpuBrand: '',
  gpuModel: '',
  includesWindows: 'true',
  connectivity: 'USB-A',
  coolerType: 'No especificado',
  psuWatts: '',
  caseModel: '',
  responseTimeMs: '',
  ports: [] as string[],
  hasSpeakers: 'false',
  switchType: '',
  connection: 'Cableado',
  dpi: '',
  brand: '',
  keyboardType: 'Membrana',
  connections: ['Cableado'],
  layoutLanguage: 'Espanol',
  hasLighting: 'false',
  keyboardFormFactor: 'Completo',
  mouseType: 'Oficina',
  buttonCount: '',
  pollingRateHz: '1000',
  weightGrams: '',
  powerType: 'Ninguno',
  fps: '30',
  cableHubType: 'Cable',
  cableType: 'HDMI a HDMI',
  cableLengthMeters: '1',
  hubInputType: 'USB-C',
  hasHdmiOutput: 'false',
  hasRj45Output: 'false',
  widthCm: '',
  lengthCm: '',
  hasLed: 'false',
  color: '',
  material: 'Cuero sintetico',
  maxWeightKg: '',
  surface: '',
  weightKg: '',
  licenseType: 'Permanente',
  platform: 'Windows',
  outletType: 'Solo tomas de corriente',
  driverSize: '50',
  impedance: '32',
  micType: 'Unidireccional',
  noiseCancel: 'false',
  supportedConnections: ['USB'],
  audioType: 'Headset',
  micIntegrated: 'true',
  micRemovable: 'false',
  surroundSound: 'No',
  consoleCompatible: 'false',
  microphoneType: 'Condensador',
  connectionTypes: ['USB'],
  frequencyResponse: '',
  includesArm: 'false',
  includesPopFilter: 'false',
  speakerType: 'Escritorio',
  channels: '2.0',
  hasSubwoofer: 'false',
  remoteControl: 'false',
};

export type ProductFormData = typeof INITIAL_PRODUCT_FORM;
export type ProductFormField = keyof ProductFormData;
export type ProductArrayField = {
  [K in ProductFormField]: ProductFormData[K] extends string[] ? K : never;
}[ProductFormField];

const BASIC_INFO_FIELDS = ['sku', 'name', 'description', 'price', 'stock'] as const;

/** Category-specific defaults applied on top of the shared initial state. */
const CATEGORY_DEFAULTS: Record<string, Partial<ProductFormData>> = {
  COOLER: { type: 'Torre' },
  STORAGE: { type: 'SSD 2.5', interface: 'SATA', m2FormFactor: '' },
  WEBCAM: { resolution: 'FHD' },
  CAPTURE_CARD: { resolution: 'FHD' },
  MICROPHONE: { connectionTypes: ['USB'], micType: 'Cardioide' },
  MONITOR: { screenSize: '' },
  SPEAKER: { connectionTypes: ['USB'] },
  MOUSE: { mouseType: 'Oficina', dpi: '' },
  KEYBOARD: { switchType: '' },
  PC_DESKTOP: { ram: '16GB', storage: '' },
};

function cloneArrays(form: ProductFormData): ProductFormData {
  const copy = { ...form };
  for (const [key, value] of Object.entries(copy)) {
    if (Array.isArray(value)) (copy as Record<string, unknown>)[key] = [...value];
  }
  return copy;
}

export function createInitialFormData(category = ''): ProductFormData {
  return cloneArrays({ ...INITIAL_PRODUCT_FORM, ...CATEGORY_DEFAULTS[category], category });
}

/** Switching category resets the specs but keeps what the admin already typed in basic info. */
export function changeCategory(prev: ProductFormData, category: string): ProductFormData {
  const next = createInitialFormData(category);
  for (const field of BASIC_INFO_FIELDS) next[field] = prev[field];
  return next;
}

export const NON_NEGATIVE_FIELDS = new Set<string>([
  'price',
  'salePrice',
  'stock',
  'cores',
  'threads',
  'baseTdpWatts',
  'tdp',
  'memorySlots',
  'm2Slots',
  'capacity',
  'speed',
  'modules',
  'vram',
  'length',
  'gpuPowerWatts',
  'recommendedPsuWatts',
  'fans',
  'wattage',
  'maxGpuLength',
  'includedFans',
  'radiatorSupportMm',
  'fanCount',
  'radiatorSize',
  'tdpCapacity',
  'readSpeed',
  'writeSpeed',
  'refreshRate',
  'psuWatts',
  'responseTimeMs',
  'dpi',
  'buttonCount',
  'weightGrams',
  'widthCm',
  'lengthCm',
  'maxWeightKg',
  'weightKg',
  'driverSize',
  'impedance',
]);

export const NO_NEGATIVE_TEXT_FIELDS = new Set<string>(['frequency']);

function isRejectedValue(name: string, value: string) {
  if (NON_NEGATIVE_FIELDS.has(name) && value !== '' && Number(value) < 0) return true;
  return NO_NEGATIVE_TEXT_FIELDS.has(name) && value.includes('-');
}

/**
 * Applies a single field edit, including the dependent-field rules (CPU socket by brand,
 * headset connections, cable/hub specifics...). Returns `prev` unchanged for rejected input.
 */
export function applyFieldChange(
  prev: ProductFormData,
  name: string,
  value: string,
): ProductFormData {
  if (isRejectedValue(name, value)) return prev;

  switch (name) {
    case 'category':
      return changeCategory(prev, value);
    case 'sku':
      return { ...prev, sku: value.toUpperCase() };
    case 'cpuBrand': {
      const sockets = CPU_SOCKETS_BY_BRAND[value] ?? [];
      return {
        ...prev,
        cpuBrand: value,
        socket: sockets.includes(prev.socket) ? prev.socket : (sockets[0] ?? ''),
      };
    }
    case 'isOnSale':
      return { ...prev, isOnSale: value, salePrice: value === 'true' ? prev.salePrice : '' };
    case 'mouseType':
      return value === 'Oficina'
        ? { ...prev, mouseType: value, buttonCount: '', dpi: '', pollingRateHz: '1000' }
        : { ...prev, mouseType: value };
    case 'keyboardType':
      return {
        ...prev,
        keyboardType: value,
        hasLighting: value === 'Hibrido' ? prev.hasLighting : 'false',
      };
    case 'connection': {
      if (prev.category !== 'HEADSET') break;
      const allowed =
        value === 'Cableado' ? HEADSET_WIRED_CONNECTIONS : HEADSET_WIRELESS_CONNECTIONS;
      const supported = prev.supportedConnections.filter((item) => allowed.includes(item));
      return {
        ...prev,
        connection: value,
        supportedConnections: supported.length ? supported : [allowed[0]],
      };
    }
    case 'cableHubType':
      return {
        ...prev,
        cableHubType: value,
        cableType: value === 'Cable' ? prev.cableType || 'HDMI a HDMI' : '',
        cableLengthMeters: value === 'Cable' ? prev.cableLengthMeters || '1' : '',
        hubInputType: value === 'Hub' ? prev.hubInputType || 'USB-C' : '',
        hasHdmiOutput: value === 'Hub' ? prev.hasHdmiOutput : 'false',
        hasRj45Output: value === 'Hub' ? prev.hasRj45Output : 'false',
      };
    case 'type': {
      if (prev.category !== 'STORAGE') break;
      const isM2 = value === 'Sólido M.2';
      return {
        ...prev,
        type: value,
        interface: isM2 ? (prev.type === value && prev.interface) || 'PCIe 4.0' : 'SATA',
        m2FormFactor: isM2 ? prev.m2FormFactor || '2280' : '',
      };
    }
  }
  return { ...prev, [name]: value };
}

export function toggleArrayValue(
  prev: ProductFormData,
  field: ProductArrayField,
  value: string,
): ProductFormData {
  const current = prev[field];
  if (field === 'radiatorSupportMmValues') {
    // "0" means "no radiator support" and is mutually exclusive with real sizes.
    const next =
      value === '0'
        ? ['0']
        : current.includes(value)
          ? current.filter((item) => item !== value && item !== '0')
          : [...current.filter((item) => item !== '0'), value];
    return { ...prev, [field]: next.length ? next : ['0'] };
  }
  const next = current.includes(value)
    ? current.filter((item) => item !== value)
    : [...current, value];
  return { ...prev, [field]: next };
}

// ---------------------------------------------------------------------------
// Loading an existing product into the form
// ---------------------------------------------------------------------------

// Product records come from the admin API with optional, category-specific spec relations.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LooseRecord = Record<string, any>;

function boolToString(value: unknown) {
  return parseBooleanLike(value) === true ? 'true' : 'false';
}

function digitsOnly(value: unknown) {
  return String(value ?? '').match(/\d+/)?.[0] ?? '';
}

function arrayFromSpecs(value: unknown, fallback: string[] = []) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === 'string') {
    return value
      .split(/[;,]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return fallback;
}

function normalizeCoolerType(value: unknown) {
  const text = String(value || '')
    .trim()
    .toLowerCase();
  return text === 'aio' || text.includes('liqu') || text.includes('líqu') ? 'Líquida' : 'Torre';
}

function normalizeStorageType(value: unknown) {
  const raw = String(value ?? '')
    .trim()
    .toLowerCase();
  if (raw.includes('nvme') || raw.includes('m.2')) return 'Sólido M.2';
  if (raw === 'ssd') return 'SSD 2.5';
  if (raw === 'hdd') return 'HDD 3.5';
  return String(value ?? '') || 'SSD 2.5';
}

function normalizeLaptopRam(value: unknown) {
  const digits = digitsOnly(String(value || '').replace(/\s+/g, ''));
  return digits ? `${digits}GB` : '';
}

export function normalizeMonitorResolution(value: unknown) {
  const text = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
  if (!text) return '';
  if (/1920x1080|1080p|full hd/.test(text) || text === 'fhd') return 'FHD (1920x1080)';
  if (/3440x1440|uwqhd|ultra ?wide qhd/.test(text)) return 'Ultra Wide QHD (3440x1440)';
  if (/2560x1440|1440p/.test(text) || text === '2k' || text === 'qhd') return 'QHD (2560x1440)';
  if (/3840x2160|2160p/.test(text) || text === '4k' || text === 'uhd') return '4K UHD (3840x2160)';
  return 'Otro';
}

export function normalizeKeyboardFormFactor(value: unknown) {
  const text = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
  if (!text) return '';
  if (['full', 'fullsize', '100%', 'completo'].includes(text)) return 'Completo';
  if (text === 'tenkeyless' || text === 'tkl') return 'TKL';
  if (['80', '75', '65', '60'].includes(text.replace('%', ''))) return `${text.replace('%', '')}%`;
  return String(value || '');
}

const LEGACY_HEADSET_CONNECTIONS: Record<string, string> = {
  'Cable USB': 'USB',
  'Jack 3.5 mm': 'Jack 3.5mm',
};

/** Brand lives in the spec relation that matches the category. */
const BRAND_SPEC_BY_CATEGORY: Record<string, string> = {
  MOTHERBOARD: 'motherboardSpecs',
  RAM: 'ramSpecs',
  GPU: 'gpuSpecs',
  CASE: 'caseSpecs',
  COOLER: 'coolerSpecs',
  PSU: 'psuSpecs',
  LAPTOP: 'laptopSpecs',
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
  UPS: 'powerProtectionSpecs',
  STABILIZER: 'powerProtectionSpecs',
};

export function mapProductToFormData(product: LooseRecord): ProductFormData {
  const spec = (key: string): LooseRecord => product[key] ?? {};
  const category: string = product.category ?? '';
  const is = (value: string) => category === value;

  const cpu = spec('cpuSpecs');
  const motherboard = spec('motherboardSpecs');
  const ram = spec('ramSpecs');
  const gpu = spec('gpuSpecs');
  const psu = spec('psuSpecs');
  const caseSpecs = spec('caseSpecs');
  const cooler = spec('coolerSpecs');
  const storage = spec('storageSpecs');
  const laptop = spec('laptopSpecs');
  const desktop = spec('desktopSpecs');
  const monitor = spec('monitorSpecs');
  const keyboard = spec('keyboardSpecs');
  const mouse = spec('mouseSpecs');
  const mousepad = spec('mousepadSpecs');
  const chair = spec('chairSpecs');
  const desk = spec('gamingDeskSpecs');
  const webcam = spec('webcamSpecs');
  const captureCard = spec('captureCardSpecs');
  const cableHub = spec('cableHubSpecs');
  const headset = spec('headsetSpecs');
  const microphone = spec('microphoneSpecs');
  const speaker = spec('speakerSpecs');
  const coolingBase = spec('laptopCoolingBaseSpecs');
  const backpack = spec('backpackSpecs');
  const software = spec('softwareSpecs');
  const protection = spec('powerProtectionSpecs');
  const brandSpec = BRAND_SPEC_BY_CATEGORY[category];
  const rgbSource =
    {
      RAM: ram,
      HEADSET: headset,
      MICROPHONE: microphone,
      SPEAKER: speaker,
      LAPTOP_COOLING_BASE: coolingBase,
    }[category] ?? cooler;

  return {
    ...createInitialFormData(category),
    sku: product.sku ?? '',
    name: product.name ?? '',
    description: product.description ?? '',
    price: String(product.price ?? ''),
    isOnSale: boolToString(product.isOnSale),
    salePrice: String(product.salePrice ?? ''),
    stock: String(product.stock ?? ''),
    cpuBrand: cpu.brand ?? (String(cpu.socket ?? '').startsWith('LGA') ? 'Intel' : 'AMD'),
    socket: cpu.socket ?? motherboard.socket ?? 'AM5',
    cores: String(cpu.cores ?? ''),
    threads: String(cpu.threads ?? ''),
    frequency: cpu.frequency ?? '',
    baseTdpWatts: String(cpu.baseTdpWatts ?? ''),
    tdp: String(cpu.tdp ?? ''),
    integratedGraphics: boolToString(cpu.integratedGraphics),
    includesCooler: boolToString(cpu.includesCooler),
    formFactor: (is('CASE') ? caseSpecs : is('PSU') ? psu : motherboard).formFactor ?? 'ATX',
    supportedFormFactors: arrayFromSpecs(
      caseSpecs.supportedFormFactors,
      caseSpecs.formFactor ? [String(caseSpecs.formFactor)] : ['ATX'],
    ),
    maxGpuLength: String(caseSpecs.maxGpuLength ?? ''),
    includesPsu: boolToString(caseSpecs.includesPsu),
    supportsTowerCooler:
      caseSpecs.supportsTowerCooler === null || caseSpecs.supportsTowerCooler === undefined
        ? 'true'
        : boolToString(caseSpecs.supportsTowerCooler),
    includedFans: String(caseSpecs.includedFans ?? '0'),
    radiatorSupportMm: String(caseSpecs.radiatorSupportMm ?? '0'),
    radiatorSupportMmValues: arrayFromSpecs(
      caseSpecs.radiatorSupportMmValues,
      caseSpecs.radiatorSupportMm ? [String(caseSpecs.radiatorSupportMm)] : ['0'],
    ),
    memoryType: (is('RAM') ? ram : motherboard).memoryType ?? 'DDR5',
    memorySlots: String(motherboard.memorySlots ?? '4'),
    m2Slots: String(motherboard.m2Slots ?? '2'),
    supportedM2FormFactors: arrayFromSpecs(motherboard.supportedM2FormFactors, ['2280']),
    chipset: gpu.chipset ?? 'NVIDIA GeForce',
    vram: String(gpu.vram ?? '8'),
    typeVram: gpu.typeVram ?? 'GDDR6',
    length: String(gpu.length ?? ''),
    gpuPowerWatts: String(gpu.gpuPowerWatts ?? gpu.tdp ?? ''),
    recommendedPsuWatts: String(gpu.recommendedPsuWatts ?? ''),
    fans: String(gpu.fans ?? '2'),
    wattage: String(
      (is('SPEAKER') ? speaker : is('UPS') || is('STABILIZER') ? protection : psu).wattage ?? '',
    ),
    certification: psu.certification ?? '80+ Bronze',
    modular: psu.modular ?? 'No Modular',
    type: is('COOLER') ? normalizeCoolerType(cooler.type) : normalizeStorageType(storage.type),
    compatibleSockets: arrayFromSpecs(cooler.compatibleSockets ?? cooler.socketSupport, [
      'AM4',
      'AM5',
      'sTR5',
    ]),
    tdpCapacity: String(cooler.tdpCapacity ?? ''),
    radiatorSize: String(cooler.radiatorSize ?? '240'),
    hasRGB: boolToString(rgbSource.hasRGB),
    hasScreen: boolToString(cooler.hasScreen),
    capacity: String(is('RAM') ? (ram.capacity ?? '16') : (storage.capacity ?? '')),
    speed: String(ram.speed ?? ''),
    modules: String(ram.modules ?? '1'),
    latency: String(ram.latency ?? ''),
    interface: storage.interface ?? 'PCIe 4.0',
    readSpeed: String(storage.readSpeed ?? ''),
    writeSpeed: String(storage.writeSpeed ?? ''),
    m2FormFactor: storage.m2FormFactor ?? '2280',
    processor: laptop.processor ?? desktop.processor ?? '',
    ram: is('LAPTOP')
      ? normalizeLaptopRam(laptop.ram) || '8GB'
      : is('PC_DESKTOP')
        ? normalizeLaptopRam(desktop.ram) || '16GB'
        : (desktop.ram ?? ''),
    storage: is('LAPTOP')
      ? normalizeLaptopStorage(laptop.storage) || '512GB SSD'
      : (desktop.storage ?? ''),
    screenSize: is('LAPTOP')
      ? String(laptop.screenSize ?? '15.6')
          .replaceAll('"', '')
          .trim() || '15.6'
      : (monitor.screenSize ?? '15.6'),
    refreshRate: digitsOnly((is('LAPTOP') ? laptop : monitor).refreshRate ?? '60') || '60',
    panelType: laptop.panelType ?? monitor.panelType ?? 'IPS',
    resolution: is('MONITOR')
      ? normalizeMonitorResolution(monitor.resolution ?? 'FHD (1920x1080)') || 'FHD (1920x1080)'
      : (webcam.resolution ?? captureCard.resolution ?? monitor.resolution ?? 'FHD'),
    hasDedicatedGpu: boolToString(laptop.hasDedicatedGpu ?? desktop.hasDedicatedGpu),
    gpuBrand: laptop.gpuBrand ?? desktop.gpuBrand ?? '',
    gpuModel: laptop.gpuModel ?? desktop.gpuModel ?? '',
    includesWindows: boolToString(laptop.includesWindows ?? true),
    coolerType: desktop.coolerType ?? 'No especificado',
    psuWatts: String(desktop.psuWatts ?? ''),
    caseModel: desktop.caseModel ?? '',
    responseTimeMs: String(monitor.responseTimeMs ?? ''),
    ports: arrayFromSpecs(monitor.ports, []),
    hasSpeakers: boolToString(monitor.hasSpeakers),
    brand: (brandSpec ? product[brandSpec]?.brand : undefined) ?? '',
    keyboardType: keyboard.keyboardType ?? 'Membrana',
    connections: arrayFromSpecs(keyboard.connections ?? mouse.connections, ['Cableado']),
    supportedConnections: arrayFromSpecs(headset.supportedConnections, ['USB']).map(
      (option) => LEGACY_HEADSET_CONNECTIONS[option] ?? option,
    ),
    layoutLanguage: keyboard.layoutLanguage ?? keyboard.layout ?? 'Espanol',
    hasLighting: boolToString(keyboard.hasLighting ?? keyboard.hasRGB),
    switchType: keyboard.switchType ?? '',
    keyboardFormFactor: normalizeKeyboardFormFactor(keyboard.keyboardFormFactor) || 'Completo',
    weightGrams: String(mouse.weightGrams ?? ''),
    mouseType: mouse.mouseType ?? 'Oficina',
    buttonCount: String(mouse.buttonCount ?? ''),
    dpi: String(mouse.dpi ?? ''),
    pollingRateHz: String(mouse.pollingRateHz ?? '1000'),
    powerType: mouse.powerType ?? 'Ninguno',
    supportedLaptopSize: coolingBase.supportedLaptopSize ?? backpack.supportedLaptopSize ?? '15.6"',
    connection: headset.connection ?? microphone.connection ?? speaker.connection ?? 'Cableado',
    driverSize: String(headset.driverSize ?? '50'),
    impedance: String(headset.impedance ?? '32'),
    micType: headset.micType ?? microphone.micType ?? 'Unidireccional',
    noiseCancel: boolToString(headset.noiseCancel),
    audioType: headset.audioType ?? 'Headset',
    micIntegrated: boolToString(headset.micIntegrated ?? true),
    micRemovable: boolToString(headset.micRemovable),
    surroundSound: headset.surroundSound ?? 'No',
    consoleCompatible: boolToString(headset.consoleCompatible),
    microphoneType: microphone.microphoneType ?? 'Condensador',
    connectionTypes: arrayFromSpecs(microphone.connectionTypes ?? speaker.connectionTypes, ['USB']),
    frequencyResponse: microphone.frequencyResponse ?? '',
    includesArm: boolToString(microphone.includesArm),
    includesPopFilter: boolToString(microphone.includesPopFilter),
    speakerType: speaker.speakerType ?? 'Escritorio',
    channels: speaker.channels ?? '2.0',
    hasSubwoofer: boolToString(speaker.hasSubwoofer),
    remoteControl: boolToString(speaker.remoteControl),
    connectivity: coolingBase.connectivity ?? 'USB-A',
    fps: String(webcam.fps ?? captureCard.fps ?? '30'),
    fanCount: String(coolingBase.fanCount ?? '1'),
    cableHubType: cableHub.type ?? 'Cable',
    cableType: cableHub.cableType ?? 'HDMI a HDMI',
    cableLengthMeters: String(cableHub.cableLengthMeters ?? '1'),
    hubInputType: cableHub.hubInputType ?? 'USB-C',
    hasHdmiOutput: boolToString(cableHub.hasHdmiOutput),
    hasRj45Output: boolToString(cableHub.hasRj45Output),
    widthCm: String(mousepad.widthCm ?? ''),
    lengthCm: String(mousepad.lengthCm ?? ''),
    hasLed: boolToString(mousepad.hasLed),
    color:
      headset.color ??
      microphone.color ??
      speaker.color ??
      coolingBase.color ??
      backpack.color ??
      chair.color ??
      desk.color ??
      '',
    material: chair.material ?? 'Cuero sintetico',
    maxWeightKg: String(chair.maxWeightKg ?? ''),
    surface: desk.surface ?? '',
    weightKg: String(desk.weightKg ?? ''),
    licenseType: software.licenseType ?? 'Permanente',
    platform: software.platform ?? 'Windows',
    outletType: protection.outletType ?? 'Solo tomas de corriente',
  };
}
