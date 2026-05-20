'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FiArrowLeft, FiSave } from 'react-icons/fi';
import Link from 'next/link';
import ImageUploader from '@/components/ImageUploader';
import {
  api,
  clearStoredAuthSession,
  getApiErrorMessage,
  isAuthenticationError,
} from '@/lib/api';
import ProductOfferSection from '@/components/admin/product/ProductOfferSection';
import { buildProductPayload } from '@/lib/products/buildProductPayload';
import { validateProductForm } from '@/lib/products/validateProductForm';
import { normalizeLaptopStorage } from '@/lib/normalizers';

const CPU_BRANDS = ['AMD', 'Intel'];
const MOTHERBOARD_BRANDS = ['ASUS', 'MSI', 'Gigabyte', 'ASRock', 'Otros'];
const CPU_SOCKETS_BY_BRAND: Record<string, string[]> = {
  AMD: ['AM4', 'AM5'],
  Intel: ['LGA 1200', 'LGA 1700', 'LGA 1851'],
};
const SOCKETS = ['AM4', 'AM5', 'LGA 1200', 'LGA 1700', 'LGA 1851'];
const M2_FORM_FACTORS = ['2230', '2242', '2260', '2280', '22110'];
const COOLER_BRANDS = ['MSI', 'DeepCool', 'Corsair', 'Gigabyte', 'ASUS', 'Otros'];
const COOLER_TYPES = ['Torre', 'Liquida'];
const COOLER_RADIATOR_OPTIONS = ['120', '240', '280', '360', '460'];
const STORAGE_TYPES = ['SSD 2.5', 'NVMe M.2', 'M.2 SATA', 'HDD 3.5'];
const NVME_GENS = ['SATA', 'PCIe 3.0', 'PCIe 4.0', 'PCIe 5.0'];
const FORM_FACTORS = ['ATX', 'Micro-ATX', 'Mini-ITX', 'E-ATX'];
const CASE_BRANDS = ['Halion', 'Micronics', 'ASUS', 'Gigabyte', 'DeepCool', 'Antryx', 'MSI', 'Lian Li', 'Otros'];
const CASE_RADIATOR_SUPPORT_OPTIONS = ['0', '120', '240', '280', '360', '460'];
const CASE_RADIATOR_SUPPORT_LABELS: Record<string, string> = {
  0: 'No soporta',
  120: '120 mm',
  240: '240 mm',
  280: '280 mm',
  360: '360 mm',
  460: '460 mm',
};
const RAM_TYPES = ['DDR4', 'DDR5'];
const RAM_CAPACITIES = ['8', '16', '24', '32'];
const GPU_BRANDS = ['Gigabyte', 'ASUS', 'MSI', 'PNY', 'Otros'];
const GPU_CHIPSETS = ['NVIDIA GeForce', 'AMD Radeon', 'Intel Arc'];
const GPU_VRAM_OPTIONS = ['4', '6', '8', '12', '16', '24', '32'];
const PSU_BRANDS = ['MSI', 'ASUS', 'Gigabyte', 'Corsair', 'DeepCool', 'Antryx', 'Cooler Master', 'Seasonic', 'Thermaltake', 'Otros'];
const PSU_WATT_OPTIONS = ['450', '500', '550', '600', '650', '700', '750', '800', '850', '1000', '1200', '1500'];
const PSU_CERTS = ['Sin Certificacion', '80+ White', '80+ Bronze', '80+ Gold', '80+ Platinum', '80+ Titanium'];
const PSU_MODULAR_OPTIONS = ['No Modular', 'Semi Modular', 'Full Modular'];
const LAPTOP_BRANDS = ['ASUS', 'Lenovo', 'HP', 'Acer', 'Dell', 'MSI', 'Otra'];
const LAPTOP_RAM_OPTIONS = ['8GB', '16GB', '24GB', '32GB', '64GB'];
const LAPTOP_STORAGE_OPTIONS = ['256GB SSD', '512GB SSD', '1TB SSD', '2TB SSD', '1TB HDD', '2TB HDD', '512GB SSD + 1TB HDD', '1TB SSD + 1TB HDD'];
const LAPTOP_SCREEN_OPTIONS = ['13', '14', '15.6', '16', '17.3', '18'];
const LAPTOP_REFRESH_OPTIONS = ['60', '75', '120', '144', '165', '240', '300', '360'];
const LAPTOP_RAM_LABELS: Record<string, string> = {
  '8GB': '8 GB',
  '16GB': '16 GB',
  '24GB': '24 GB',
  '32GB': '32 GB',
  '64GB': '64 GB',
};
const LAPTOP_STORAGE_LABELS: Record<string, string> = {
  '256GB SSD': '256 GB SSD',
  '512GB SSD': '512 GB SSD',
  '1TB SSD': '1 TB SSD',
  '2TB SSD': '2 TB SSD',
  '1TB HDD': '1 TB HDD',
  '2TB HDD': '2 TB HDD',
  '512GB SSD + 1TB HDD': '512 GB SSD + 1 TB HDD',
  '1TB SSD + 1TB HDD': '1 TB SSD + 1 TB HDD',
};
const DESKTOP_COOLER_TYPES = ['De serie', 'Aire (Torre)', 'Liquida (AIO)', 'No especificado'];
const PANEL_TYPES = ['IPS', 'VA', 'TN', 'OLED'];
const MONITOR_BRANDS = ['MSI', 'Gigabyte', 'Teros', 'LG', 'Samsung', 'Otros'];
const MONITOR_RESOLUTION_OPTIONS = ['FHD (1920x1080)', 'QHD (2560x1440)', 'Ultra Wide QHD (3440x1440)', '4K UHD (3840x2160)', 'Otro'];
const MONITOR_REFRESH_OPTIONS = ['60', '75', '100', '120', '144', '165', '180', '200', '240', '280', '360'];
const MONITOR_PORTS = ['VGA', 'HDMI', 'DisplayPort', 'USB-C'];
const PERIPHERAL_CONNECTIONS = ['Cableado', 'Bluetooth', 'Dongle USB'];
const KEYBOARD_BRANDS = ['Redragon', 'MSI', 'Logitech', 'Razer', 'Aula', 'Royal Kludge', 'Otros'];
const KEYBOARD_TYPES = ['Membrana', 'Semi-mecanico', 'Mecanico', 'Magnetico'];
const KEYBOARD_FORM_FACTORS = ['Completo', '80%', 'TKL', '75%', '65%', '60%'];
const LAYOUT_LANGUAGES = ['Espanol', 'Ingles'];
const MOUSE_TYPES = ['Oficina', 'Gamer'];
const MOUSE_BRANDS = ['Redragon', 'Logitech', 'Razer', 'MSI', 'Teros', 'Otros'];
const MOUSEPAD_BRANDS = ['HyperX', 'Logitech', 'Redragon', 'Otros'];
const LAPTOP_COOLING_BASE_BRANDS = ['Cooler Master', 'Antryx', 'Teros', 'Otros'];
const LAPTOP_COOLING_BASE_FAN_COUNTS = ['1', '2', '3', '4', '5', '6'];
const LAPTOP_ACCESSORY_CONNECTIVITY = ['USB-A', 'USB-C'];
const BACKPACK_BRANDS = ['Redragon', 'ASUS', 'Teros', 'Gigabyte', 'Otros'];
const HEADSET_BRANDS = ['Logitech', 'Redragon', 'HyperX', 'Razer', 'Teros', 'Otros'];
const MICROPHONE_BRANDS = ['Fifine', 'Streamplify', 'Redragon', 'Razer', 'Logitech', 'Corsair', 'Otros'];
const SPEAKER_BRANDS = ['Logitech', 'Redragon', 'Creative', 'Genius', 'Otros'];
const HEADSET_CONNECTION_TYPES = ['Cableado', 'Inalambrico'];
const HEADSET_WIRED_CONNECTIONS = ['Cable USB', 'Jack 3.5 mm'];
const HEADSET_WIRELESS_CONNECTIONS = ['Cable USB', 'Jack 3.5 mm', 'USB Dongle 2.4 GHz', 'Bluetooth'];
const WEBCAM_BRANDS = ['Logitech', 'Redragon', 'Otros'];
const CAPTURE_CARD_BRANDS = ['Corsair', 'Streamplify', 'Otros'];
const CABLE_HUB_BRANDS = ['Cabletime', 'Ugreen', 'Otros'];
const VIDEO_RESOLUTION_OPTIONS = ['HD', 'FHD', '4K'];
const WEBCAM_FPS_OPTIONS = ['30', '60'];
const CAPTURE_CARD_FPS_OPTIONS = ['30', '60', '120'];
const CABLE_HUB_TYPES = ['Cable', 'Hub'];
const CABLE_TYPES = ['HDMI a HDMI', 'DisplayPort a DisplayPort', 'Tipo C a HDMI', 'Tipo C a DisplayPort', 'Tipo C a Tipo C'];
const CABLE_LENGTHS = ['1', '2', '3'];
const HUB_INPUT_TYPES = ['USB-C', 'USB-A'];
const POLLING_RATES = ['1000', '2000', '4000', '8000'];
const MOUSE_POWER_TYPES = ['Pila', 'Bateria', 'Ninguno'];
const CHAIR_MATERIALS = ['Cuero sintetico', 'Tela', 'Malla', 'Mixto', 'Otro'];

type EditableForm = {
  name: string;
  description: string;
  category: string;
  price: string;
  isOnSale: string;
  salePrice: string;
  stock: string;
  cpuBrand: string;
  socket: string;
  cores: string;
  threads: string;
  frequency: string;
  baseTdpWatts: string;
  tdp: string;
  integratedGraphics: string;
  includesCooler: string;
  formFactor: string;
  maxGpuLength: string;
  includesPsu: string;
  includedFans: string;
  radiatorSupportMm: string;
  memoryType: string;
  memorySlots: string;
  m2Slots: string;
  supportedM2FormFactors: string[];
  type: string;
  compatibleSockets: string[];
  tdpCapacity: string;
  coolerHeight: string;
  radiatorSize: string;
  hasRGB: string;
  hasScreen: string;
  fanCount: string;
  chipset: string;
  vram: string;
  length: string;
  gpuPowerWatts: string;
  recommendedPsuWatts: string;
  fans: string;
  wattage: string;
  certification: string;
  modular: string;
  capacity: string;
  speed: string;
  modules: string;
  interface: string;
  readSpeed: string;
  writeSpeed: string;
  m2FormFactor: string;
  processor: string;
  ram: string;
  storage: string;
  screenSize: string;
  refreshRate: string;
  panelType: string;
  resolution: string;
  hasDedicatedGpu: string;
  gpuBrand: string;
  gpuModel: string;
  includesWindows: string;
  coolerType: string;
  psuWatts: string;
  caseModel: string;
  responseTimeMs: string;
  ports: string[];
  hasSpeakers: string;
  brand: string;
  keyboardType: string;
  connections: string[];
  supportedConnections: string[];
  layoutLanguage: string;
  hasLighting: string;
  switchType: string;
  keyboardFormFactor: string;
  weightGrams: string;
  mouseType: string;
  buttonCount: string;
  dpi: string;
  pollingRateHz: string;
  powerType: string;
  connectivity: string;
  connection: string;
  driverSize: string;
  impedance: string;
  micType: string;
  noiseCancel: string;
  fps: string;
  cableHubType: string;
  cableType: string;
  cableLengthMeters: string;
  hubInputType: string;
  hasHdmiOutput: string;
  hasRj45Output: string;
  widthCm: string;
  lengthCm: string;
  hasLed: string;
  color: string;
  material: string;
  maxWeightKg: string;
  surface: string;
  weightKg: string;
};

const INITIAL_FORM: EditableForm = {
  name: '',
  description: '',
  category: '',
  price: '',
  isOnSale: 'false',
  salePrice: '',
  stock: '',
  cpuBrand: 'AMD',
  socket: 'AM5',
  cores: '',
  threads: '',
  frequency: '',
  baseTdpWatts: '',
  tdp: '',
  integratedGraphics: 'false',
  includesCooler: 'false',
  formFactor: 'ATX',
  maxGpuLength: '',
  includesPsu: 'false',
  includedFans: '0',
  radiatorSupportMm: '0',
  memoryType: 'DDR5',
  memorySlots: '4',
  m2Slots: '2',
  supportedM2FormFactors: ['2280'],
  type: 'Torre',
  compatibleSockets: ['AM4', 'AM5'],
  tdpCapacity: '',
  coolerHeight: '',
  radiatorSize: '240',
  hasRGB: 'false',
  hasScreen: 'false',
  fanCount: '1',
  chipset: 'NVIDIA GeForce',
  vram: '8',
  length: '',
  gpuPowerWatts: '',
  recommendedPsuWatts: '',
  fans: '2',
  wattage: '',
  certification: '80+ Bronze',
  modular: 'No Modular',
  capacity: '',
  speed: '',
  modules: '1',
  interface: 'PCIe 4.0',
  readSpeed: '',
  writeSpeed: '',
  m2FormFactor: '2280',
  processor: '',
  ram: '',
  storage: '',
  screenSize: '15.6',
  refreshRate: '60',
  panelType: 'IPS',
  resolution: 'FHD (1920x1080)',
  hasDedicatedGpu: 'false',
  gpuBrand: '',
  gpuModel: '',
  includesWindows: 'true',
  coolerType: 'No especificado',
  psuWatts: '',
  caseModel: '',
  responseTimeMs: '',
  ports: [],
  hasSpeakers: 'false',
  brand: '',
  keyboardType: 'Membrana',
  connections: ['Cableado'],
  supportedConnections: ['Cable USB'],
  layoutLanguage: 'Espanol',
  hasLighting: 'false',
  switchType: '',
  keyboardFormFactor: 'Completo',
  weightGrams: '',
  mouseType: 'Oficina',
  buttonCount: '',
  dpi: '',
  pollingRateHz: '1000',
  powerType: 'Ninguno',
  connectivity: 'USB-A',
  connection: 'Cableado',
  driverSize: '50',
  impedance: '32',
  micType: 'Unidireccional',
  noiseCancel: 'false',
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
};

function boolToString(value: unknown) {
  return value ? 'true' : 'false';
}

function normalizeCoolerType(value: unknown) {
  const text = String(value || '').trim().toLowerCase();
  if (text === 'aio' || text.includes('liqu') || text.includes('liqu')) return 'Liquida';
  return 'Torre';
}

function normalizeLaptopRam(value: unknown) {
  const text = String(value || '').trim().toUpperCase().replace(/\s+/g, '');
  const match = text.match(/(\d+)/);
  return match ? `${match[1]}GB` : '';
}

function normalizeLaptopScreen(value: unknown) {
  return String(value || '').replace(/"/g, '').trim();
}

function normalizeLaptopRefresh(value: unknown) {
  const match = String(value || '').match(/\d+/);
  return match ? match[0] : '';
}

function normalizeMonitorResolution(value: unknown) {
  const text = String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (!text) return '';
  if (text.includes('1920x1080') || text.includes('1080p') || text.includes('full hd') || text === 'fhd') return 'FHD (1920x1080)';
  if (text.includes('2560x1440') || text.includes('1440p') || text === '2k' || text === 'qhd') return 'QHD (2560x1440)';
  if (text.includes('3440x1440') || text.includes('uwqhd') || text.includes('ultrawide qhd') || text.includes('ultra wide qhd')) return 'Ultra Wide QHD (3440x1440)';
  if (text.includes('3840x2160') || text.includes('2160p') || text === '4k' || text === 'uhd') return '4K UHD (3840x2160)';
  return value ? 'Otro' : '';
}

function normalizeKeyboardFormFactor(value: unknown) {
  const text = String(value || '').trim().toLowerCase().replace(/\s+/g, '');
  if (!text) return '';
  if (['full', 'fullsize', '100%', 'completo'].includes(text)) return 'Completo';
  if (text === '80' || text === '80%') return '80%';
  if (text === 'tenkeyless' || text === 'tkl') return 'TKL';
  if (text === '75' || text === '75%') return '75%';
  if (text === '65' || text === '65%') return '65%';
  if (text === '60' || text === '60%') return '60%';
  return String(value || '');
}

function includeCurrentOption(options: string[], value: string) {
  return value && !options.includes(value) ? [...options, value] : options;
}

function arrayFromSpecs(value: unknown, fallback: string[] = []) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map((item) => item.trim()).filter(Boolean);
  return fallback;
}

export default function EditProductPage() {
  const { id } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [formData, setFormData] = useState<EditableForm>(INITIAL_FORM);

  useEffect(() => {
    if (!id) return;

    api
      .get(`/products/${id}`)
      .then((res) => {
        const product = res.data;
        const cpu = product.cpuSpecs ?? {};
        const motherboard = product.motherboardSpecs ?? {};
        const ramSpecs = product.ramSpecs ?? {};
        const gpu = product.gpuSpecs ?? {};
        const psu = product.psuSpecs ?? {};
        const caseSpecs = product.caseSpecs ?? {};
        const cooler = product.coolerSpecs ?? {};
        const storage = product.storageSpecs ?? {};
        const laptop = product.laptopSpecs ?? {};
        const desktop = product.desktopSpecs ?? {};
        const monitor = product.monitorSpecs ?? {};
        const keyboard = product.keyboardSpecs ?? {};
        const mouse = product.mouseSpecs ?? {};
        const mousepad = product.mousepadSpecs ?? {};
        const chair = product.chairSpecs ?? {};
        const desk = product.gamingDeskSpecs ?? {};
        const webcam = product.webcamSpecs ?? {};
        const captureCard = product.captureCardSpecs ?? {};
        const cableHub = product.cableHubSpecs ?? {};
        const headset = product.headsetSpecs ?? {};
        const microphone = product.microphoneSpecs ?? {};
        const speaker = product.speakerSpecs ?? {};
        const laptopCoolingBase = product.laptopCoolingBaseSpecs ?? {};
        const backpack = product.backpackSpecs ?? {};

        setFormData({
          ...INITIAL_FORM,
          name: product.name ?? '',
          description: product.description ?? '',
          category: product.category ?? '',
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
          formFactor: product.category === 'CASE'
            ? caseSpecs.formFactor ?? 'ATX'
            : product.category === 'PSU'
              ? psu.formFactor ?? 'ATX'
              : motherboard.formFactor ?? 'ATX',
          maxGpuLength: String(caseSpecs.maxGpuLength ?? ''),
          includesPsu: boolToString(caseSpecs.includesPsu),
          includedFans: String(caseSpecs.includedFans ?? '0'),
          radiatorSupportMm: String(caseSpecs.radiatorSupportMm ?? '0'),
          memoryType: product.category === 'RAM' ? ramSpecs.memoryType ?? 'DDR5' : motherboard.memoryType ?? 'DDR5',
          memorySlots: String(motherboard.memorySlots ?? '4'),
          m2Slots: String(motherboard.m2Slots ?? '2'),
          supportedM2FormFactors: arrayFromSpecs(motherboard.supportedM2FormFactors, ['2280']),
          chipset: gpu.chipset ?? 'NVIDIA GeForce',
          vram: String(gpu.vram ?? '8'),
          length: String(gpu.length ?? ''),
          gpuPowerWatts: String(gpu.gpuPowerWatts ?? gpu.tdp ?? ''),
          recommendedPsuWatts: String(gpu.recommendedPsuWatts ?? ''),
          fans: String(gpu.fans ?? '2'),
          wattage: String(product.category === 'SPEAKER' ? speaker.wattage ?? '' : psu.wattage ?? ''),
          certification: psu.certification ?? '80+ Bronze',
          modular: psu.modular ?? 'No Modular',
          type: product.category === 'COOLER' ? normalizeCoolerType(cooler.type) : storage.type ?? 'SSD 2.5',
          compatibleSockets: arrayFromSpecs(cooler.compatibleSockets ?? cooler.socketSupport, ['AM4', 'AM5']),
          tdpCapacity: String(cooler.tdpCapacity ?? ''),
          coolerHeight: String(cooler.coolerHeight ?? ''),
          radiatorSize: String(cooler.radiatorSize ?? '240'),
          hasRGB: boolToString(product.category === 'RAM' ? ramSpecs.hasRGB : product.category === 'HEADSET' ? headset.hasRGB : cooler.hasRGB),
          hasScreen: boolToString(cooler.hasScreen),
          capacity: String(product.category === 'RAM' ? ramSpecs.capacity ?? '16' : storage.capacity ?? ''),
          speed: String(ramSpecs.speed ?? ''),
          modules: String(ramSpecs.modules ?? '1'),
          interface: storage.interface ?? 'PCIe 4.0',
          readSpeed: String(storage.readSpeed ?? ''),
          writeSpeed: String(storage.writeSpeed ?? ''),
          m2FormFactor: storage.m2FormFactor ?? '2280',
          processor: laptop.processor ?? desktop.processor ?? '',
          ram: product.category === 'LAPTOP' ? normalizeLaptopRam(laptop.ram) || '8GB' : desktop.ram ?? '',
          storage: product.category === 'LAPTOP' ? normalizeLaptopStorage(laptop.storage) || '512GB SSD' : desktop.storage ?? '',
          screenSize: product.category === 'LAPTOP' ? normalizeLaptopScreen(laptop.screenSize ?? '15.6') || '15.6' : monitor.screenSize ?? '15.6',
          refreshRate: product.category === 'LAPTOP' ? normalizeLaptopRefresh(laptop.refreshRate ?? '60') || '60' : normalizeLaptopRefresh(monitor.refreshRate ?? '60') || '60',
          panelType: laptop.panelType ?? monitor.panelType ?? 'IPS',
          resolution: product.category === 'MONITOR'
            ? normalizeMonitorResolution(monitor.resolution ?? 'FHD (1920x1080)') || 'FHD (1920x1080)'
            : webcam.resolution ?? captureCard.resolution ?? monitor.resolution ?? 'FHD',
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
          brand: product.category === 'MOTHERBOARD'
            ? motherboard.brand ?? 'Otros'
            : product.category === 'GPU'
              ? gpu.brand ?? 'Otros'
              : product.category === 'CASE'
                ? caseSpecs.brand ?? ''
                : product.category === 'COOLER'
                  ? cooler.brand ?? ''
                  : product.category === 'PSU'
                    ? psu.brand ?? ''
                    : product.category === 'LAPTOP'
                      ? laptop.brand ?? ''
                      : product.category === 'MONITOR'
                        ? monitor.brand ?? ''
                        : keyboard.brand ?? mouse.brand ?? headset.brand ?? microphone.brand ?? speaker.brand ?? webcam.brand ?? captureCard.brand ?? cableHub.brand ?? laptopCoolingBase.brand ?? backpack.brand ?? mousepad.brand ?? chair.brand ?? desk.brand ?? '',
          keyboardType: keyboard.keyboardType ?? 'Membrana',
          connections: arrayFromSpecs(keyboard.connections ?? mouse.connections, ['Cableado']),
          supportedConnections: arrayFromSpecs(headset.supportedConnections, ['Cable USB']),
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
          connection: headset.connection ?? microphone.connection ?? speaker.connection ?? 'Cableado',
          driverSize: String(headset.driverSize ?? '50'),
          impedance: String(headset.impedance ?? '32'),
          micType: headset.micType ?? microphone.micType ?? 'Unidireccional',
          noiseCancel: boolToString(headset.noiseCancel),
          connectivity: laptopCoolingBase.connectivity ?? 'USB-A',
          fps: String(webcam.fps ?? captureCard.fps ?? '30'),
          fanCount: String(laptopCoolingBase.fanCount ?? '1'),
          cableHubType: cableHub.type ?? 'Cable',
          cableType: cableHub.cableType ?? 'HDMI a HDMI',
          cableLengthMeters: String(cableHub.cableLengthMeters ?? '1'),
          hubInputType: cableHub.hubInputType ?? 'USB-C',
          hasHdmiOutput: boolToString(cableHub.hasHdmiOutput),
          hasRj45Output: boolToString(cableHub.hasRj45Output),
          widthCm: String(mousepad.widthCm ?? ''),
          lengthCm: String(mousepad.lengthCm ?? ''),
          hasLed: boolToString(mousepad.hasLed),
          color: backpack.color ?? chair.color ?? desk.color ?? '',
          material: chair.material ?? 'Cuero sintetico',
          maxWeightKg: String(chair.maxWeightKg ?? ''),
          surface: desk.surface ?? '',
          weightKg: String(desk.weightKg ?? ''),
        });
        setExistingImages(Array.isArray(product.images) ? product.images : []);
      })
      .catch((error: unknown) => {
        alert(getApiErrorMessage(error, 'Error cargando producto'));
      })
      .finally(() => setLoading(false));
  }, [id]);

  const updateField = (name: keyof EditableForm, value: string) => {
    if (name === 'cpuBrand') {
      const validSockets = CPU_SOCKETS_BY_BRAND[value] ?? [];
      setFormData((prev) => ({
        ...prev,
        cpuBrand: value,
        socket: validSockets.includes(prev.socket) ? prev.socket : validSockets[0] ?? '',
      }));
      return;
    }

    if (name === 'isOnSale') {
      setFormData((prev) => ({ ...prev, isOnSale: value, salePrice: value === 'true' ? prev.salePrice : '' }));
      return;
    }

    if (name === 'mouseType' && value === 'Oficina') {
      setFormData((prev) => ({ ...prev, mouseType: value, buttonCount: '', dpi: '', pollingRateHz: '1000' }));
      return;
    }

    if (name === 'keyboardType') {
      setFormData((prev) => ({
        ...prev,
        keyboardType: value,
        hasLighting: value === 'Semi-mecanico' ? prev.hasLighting : 'false',
        switchType: value === 'Mecanico' || value === 'Magnetico' ? prev.switchType : '',
      }));
      return;
    }

    if (name === 'connection' && formData.category === 'HEADSET') {
      const allowed = value === 'Cableado' ? HEADSET_WIRED_CONNECTIONS : HEADSET_WIRELESS_CONNECTIONS;
      setFormData((prev) => {
        const nextSupported = prev.supportedConnections.filter((item) => allowed.includes(item));
        return {
          ...prev,
          connection: value,
          supportedConnections: nextSupported.length ? nextSupported : [allowed[0]],
        };
      });
      return;
    }

    if (name === 'cableHubType') {
      setFormData((prev) => ({
        ...prev,
        cableHubType: value,
        cableType: value === 'Cable' ? prev.cableType || 'HDMI a HDMI' : '',
        cableLengthMeters: value === 'Cable' ? prev.cableLengthMeters || '1' : '',
        hubInputType: value === 'Hub' ? prev.hubInputType || 'USB-C' : '',
        hasHdmiOutput: value === 'Hub' ? prev.hasHdmiOutput : 'false',
        hasRj45Output: value === 'Hub' ? prev.hasRj45Output : 'false',
      }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const toggleArrayValue = (field: 'compatibleSockets' | 'supportedM2FormFactors' | 'ports' | 'connections' | 'supportedConnections', value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter((item) => item !== value)
        : [...prev[field], value],
    }));
  };

  const uploadImage = async (file: File) => {
    const formDataToSend = new FormData();
    formDataToSend.append('image', file);
    const res = await api.post('/admin/uploads/image', formDataToSend, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return String(res.data.url);
  };

  const validateSpecs = () => {
    const sharedValidationError = validateProductForm(formData, {
      nonNegativeFields: new Set([
        'price',
        'salePrice',
        'stock',
        'baseTdpWatts',
        'tdp',
        'vram',
        'length',
        'gpuPowerWatts',
        'recommendedPsuWatts',
        'fans',
        'wattage',
        'tdpCapacity',
        'psuWatts',
        'responseTimeMs',
        'buttonCount',
        'dpi',
        'weightGrams',
        'widthCm',
        'lengthCm',
        'maxWeightKg',
        'weightKg',
      ]),
      noNegativeTextFields: new Set(['frequency']),
      buildPayload: buildProductPayload,
      cpuSocketsByBrand: CPU_SOCKETS_BY_BRAND,
    });

    if (sharedValidationError) {
      return sharedValidationError;
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsedStock = Number(formData.stock);
    if (!Number.isInteger(parsedStock) || parsedStock < 0) {
      alert('El stock debe ser un numero entero mayor o igual a 0.');
      return;
    }

    const specError = validateSpecs();
    if (specError) {
      alert(specError);
      return;
    }

    if (existingImages.length + imageFiles.length > 5) {
      alert('El producto puede tener como maximo 5 imagenes.');
      return;
    }

    setSaving(true);

    try {
      const uploadedImages = imageFiles.length
        ? await Promise.all(imageFiles.map((file) => uploadImage(file)))
        : [];

      await api.patch(`/products/${id}`, {
        ...buildProductPayload({ ...formData, stock: String(parsedStock) }, { clearSalePriceWhenOff: true }),
        images: [...existingImages, ...uploadedImages],
      });
      alert('Producto actualizado correctamente');
      router.push('/admin');
    } catch (error: unknown) {
      if (isAuthenticationError(error)) {
        clearStoredAuthSession();
        alert('Tu sesion expiro. Inicia sesion nuevamente para guardar cambios.');
        router.replace('/admin/login');
        return;
      }

      alert(getApiErrorMessage(error, 'Error al actualizar'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Cargando datos del producto...</div>;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <Link href="/admin" className="mb-2 flex items-center gap-2 text-gray-500 hover:text-black">
          <FiArrowLeft /> Volver al inventario
        </Link>
        <h1 className="text-3xl font-black text-gray-800">Editar Producto</h1>
        <p className="text-gray-500">ID: {id}</p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-6 rounded-xl border border-gray-200 bg-white p-8 shadow-lg">
        <div>
          <label className="mb-2 block text-sm font-bold text-gray-700">Nombre del Producto</label>
          <input name="name" value={formData.name} onChange={(e) => updateField('name', e.target.value)} className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:ring-2 focus:ring-brand-cyan" />
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold text-gray-700">Descripcion del Producto</label>
          <textarea name="description" rows={4} value={formData.description} onChange={(e) => updateField('description', e.target.value)} className="w-full resize-none rounded-lg border border-gray-300 p-3 outline-none focus:ring-2 focus:ring-brand-cyan" />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="mb-2 block text-sm font-bold text-gray-700">Precio (S/.)</label>
            <input name="price" type="number" step="0.01" inputMode="decimal" value={formData.price} onChange={(e) => updateField('price', e.target.value)} className="w-full rounded-lg border border-gray-300 p-3 text-lg font-bold outline-none focus:ring-2 focus:ring-brand-cyan" />
          </div>

          <ProductOfferSection
            isOnSale={formData.isOnSale}
            price={formData.price}
            salePrice={formData.salePrice}
            onToggle={(checked) => updateField('isOnSale', String(checked))}
            onSalePriceChange={(value) => updateField('salePrice', value)}
            inputClassName="w-full rounded-lg border border-gray-300 p-3 text-lg font-bold outline-none focus:ring-2 focus:ring-brand-cyan"
            labelClassName="mb-2 block text-sm font-bold text-gray-700"
            layout="stack"
          />

          <div>
            <label className="mb-2 block text-sm font-bold text-gray-700">Stock</label>
            <input name="stock" type="number" min="0" step="1" value={formData.stock} onChange={(e) => updateField('stock', e.target.value)} className="w-full rounded-lg border border-gray-300 p-3 text-lg font-bold outline-none focus:ring-2 focus:ring-brand-cyan" />
          </div>
        </div>

        {formData.category === 'CPU' && (
          <section className="rounded-xl border border-gray-200 bg-gray-50 p-5">
            <h2 className="mb-4 font-black text-gray-800">Especificaciones CPU</h2>
            <div className="grid grid-cols-2 gap-4">
              <SelectField label="Marca" value={formData.cpuBrand} onChange={(value) => updateField('cpuBrand', value)} options={CPU_BRANDS} />
              <SelectField label="Socket" value={formData.socket} onChange={(value) => updateField('socket', value)} options={CPU_SOCKETS_BY_BRAND[formData.cpuBrand] ?? []} />
              <NumberField label="TDP base (Watts)" value={formData.baseTdpWatts} onChange={(value) => updateField('baseTdpWatts', value)} />
              <NumberField label="TDP maximo (Watts)" value={formData.tdp} onChange={(value) => updateField('tdp', value)} />
              <NumberField label="Nucleos" value={formData.cores} onChange={(value) => updateField('cores', value)} />
              <NumberField label="Threads" value={formData.threads} onChange={(value) => updateField('threads', value)} />
              <TextField label="Frecuencia (GHz)" value={formData.frequency} onChange={(value) => updateField('frequency', value)} />
              <SelectField label="Graficos integrados" value={formData.integratedGraphics} onChange={(value) => updateField('integratedGraphics', value)} options={['false', 'true']} labels={{ false: 'No', true: 'Si' }} />
              <SelectField label="Incluye cooler" value={formData.includesCooler} onChange={(value) => updateField('includesCooler', value)} options={['false', 'true']} labels={{ false: 'No', true: 'Si' }} />
            </div>
          </section>
        )}

        {formData.category === 'MOTHERBOARD' && (
          <section className="rounded-xl border border-gray-200 bg-gray-50 p-5">
            <h2 className="mb-4 font-black text-gray-800">Especificaciones Motherboard</h2>
            <div className="grid grid-cols-2 gap-4">
              <SelectField label="Marca" value={formData.brand} onChange={(value) => updateField('brand', value)} options={MOTHERBOARD_BRANDS} />
              <SelectField label="Socket" value={formData.socket} onChange={(value) => updateField('socket', value)} options={SOCKETS} />
              <SelectField label="Formato" value={formData.formFactor} onChange={(value) => updateField('formFactor', value)} options={FORM_FACTORS} />
              <SelectField label="Tipo de RAM" value={formData.memoryType} onChange={(value) => updateField('memoryType', value)} options={RAM_TYPES} />
              <NumberField label="Slots RAM" value={formData.memorySlots} onChange={(value) => updateField('memorySlots', value)} />
              <NumberField label="Slots M.2" value={formData.m2Slots} onChange={(value) => updateField('m2Slots', value)} />
              <MultiCheckField label="Tamaños M.2 soportados" options={M2_FORM_FACTORS} values={formData.supportedM2FormFactors} onToggle={(value) => toggleArrayValue('supportedM2FormFactors', value)} />
            </div>
          </section>
        )}

        {formData.category === 'RAM' && (
          <section className="rounded-xl border border-gray-200 bg-gray-50 p-5">
            <h2 className="mb-4 font-black text-gray-800">Especificaciones RAM</h2>
            <div className="grid grid-cols-2 gap-4">
              <SelectField label="Tipo" value={formData.memoryType} onChange={(value) => updateField('memoryType', value)} options={RAM_TYPES} />
              <SelectField
                label="Cantidad por modulo (GB)"
                value={formData.capacity}
                onChange={(value) => updateField('capacity', value)}
                options={RAM_CAPACITIES}
                labels={Object.fromEntries(RAM_CAPACITIES.map((value) => [value, `${value} GB`]))}
              />
              <SelectField
                label="Kit (Modulos)"
                value={formData.modules}
                onChange={(value) => updateField('modules', value)}
                options={['1', '2', '4']}
                labels={{ 1: '1 Modulo (Single)', 2: '2 Modulos (Dual Kit)', 4: '4 Modulos (Quad Kit)' }}
              />
              <NumberField label="Velocidad (MHz)" value={formData.speed} onChange={(value) => updateField('speed', value)} />
              <SelectField label="Iluminacion RGB" value={formData.hasRGB} onChange={(value) => updateField('hasRGB', value)} options={['false', 'true']} labels={{ false: 'No', true: 'Si' }} />
            </div>
          </section>
        )}

        {formData.category === 'GPU' && (
          <section className="rounded-xl border border-gray-200 bg-gray-50 p-5">
            <h2 className="mb-4 font-black text-gray-800">Datos de Video</h2>
            <div className="grid grid-cols-2 gap-4">
              <SelectField label="Marca ensambladora" value={formData.brand} onChange={(value) => updateField('brand', value)} options={GPU_BRANDS} />
              <SelectField label="Chipset" value={formData.chipset} onChange={(value) => updateField('chipset', value)} options={GPU_CHIPSETS} />
              <SelectField label="VRAM (GB)" value={formData.vram} onChange={(value) => updateField('vram', value)} options={GPU_VRAM_OPTIONS} labels={Object.fromEntries(GPU_VRAM_OPTIONS.map((value) => [value, `${value} GB`]))} />
              <NumberField label="Largo (mm)" value={formData.length} onChange={(value) => updateField('length', value)} />
              <NumberField label="TGP / Consumo real (Watts)" value={formData.gpuPowerWatts} onChange={(value) => updateField('gpuPowerWatts', value)} helper="Usado por el armador para estimar el consumo del sistema." />
              <NumberField label="PSU recomendada (Watts)" value={formData.recommendedPsuWatts} onChange={(value) => updateField('recommendedPsuWatts', value)} helper="Referencia del fabricante para la fuente minima sugerida." />
              <NumberField label="Ventiladores" value={formData.fans} onChange={(value) => updateField('fans', value)} />
            </div>
          </section>
        )}

        {formData.category === 'PSU' && (
          <section className="rounded-xl border border-gray-200 bg-gray-50 p-5">
            <h2 className="mb-4 font-black text-gray-800">Especificaciones Fuente de Poder</h2>
            <div className="grid grid-cols-2 gap-4">
              <SelectField label="Marca" value={formData.brand} onChange={(value) => updateField('brand', value)} options={PSU_BRANDS} />
              <SelectField
                label="Potencia"
                value={formData.wattage}
                onChange={(value) => updateField('wattage', value)}
                options={PSU_WATT_OPTIONS}
                labels={Object.fromEntries(PSU_WATT_OPTIONS.map((watts) => [watts, `${watts} W`]))}
              />
              <SelectField label="Certificacion" value={formData.certification} onChange={(value) => updateField('certification', value)} options={PSU_CERTS} />
              <SelectField label="Modularidad" value={formData.modular} onChange={(value) => updateField('modular', value)} options={PSU_MODULAR_OPTIONS} />
              <SelectField label="Formato" value={formData.formFactor} onChange={(value) => updateField('formFactor', value)} options={['ATX', 'SFX']} />
            </div>
          </section>
        )}

        {formData.category === 'CASE' && (
          <section className="rounded-xl border border-gray-200 bg-gray-50 p-5">
            <h2 className="mb-4 font-black text-gray-800">Especificaciones CASE</h2>
            <div className="grid grid-cols-2 gap-4">
              <SelectField label="Marca" value={formData.brand} onChange={(value) => updateField('brand', value)} options={CASE_BRANDS} />
              <SelectField label="Soporte placa" value={formData.formFactor} onChange={(value) => updateField('formFactor', value)} options={FORM_FACTORS} />
              <NumberField label="Max largo GPU (mm)" value={formData.maxGpuLength} onChange={(value) => updateField('maxGpuLength', value)} />
              <SelectField label="Incluye fuente?" value={formData.includesPsu} onChange={(value) => updateField('includesPsu', value)} options={['false', 'true']} labels={{ false: 'No', true: 'Si' }} />
              <SelectField
                label="Soporte radiador liquido"
                value={formData.radiatorSupportMm}
                onChange={(value) => updateField('radiatorSupportMm', value)}
                options={CASE_RADIATOR_SUPPORT_OPTIONS}
                labels={CASE_RADIATOR_SUPPORT_LABELS}
              />
              <NumberField label="Ventiladores incluidos" value={formData.includedFans} onChange={(value) => updateField('includedFans', value)} />
            </div>
          </section>
        )}

        {formData.category === 'COOLER' && (
          <section className="rounded-xl border border-gray-200 bg-gray-50 p-5">
            <h2 className="mb-4 font-black text-gray-800">Especificaciones Cooler</h2>
            <div className="grid grid-cols-2 gap-4">
              <SelectField label="Marca" value={formData.brand} onChange={(value) => updateField('brand', value)} options={COOLER_BRANDS} />
              <SelectField label="Tipo" value={formData.type} onChange={(value) => updateField('type', value)} options={COOLER_TYPES} />
              <NumberField label="TDP soportado (Watts)" value={formData.tdpCapacity} onChange={(value) => updateField('tdpCapacity', value)} />
              {formData.type === 'Torre' && <NumberField label="Altura cooler (mm)" value={formData.coolerHeight} onChange={(value) => updateField('coolerHeight', value)} />}
              {formData.type === 'Liquida' && <SelectField label="Radiador" value={formData.radiatorSize} onChange={(value) => updateField('radiatorSize', value)} options={COOLER_RADIATOR_OPTIONS} labels={{ 120: '120 mm', 240: '240 mm', 280: '280 mm', 360: '360 mm', 460: '460 mm' }} />}
              <SelectField label="RGB" value={formData.hasRGB} onChange={(value) => updateField('hasRGB', value)} options={['false', 'true']} labels={{ false: 'No', true: 'Si' }} />
              <SelectField label="Pantalla LCD" value={formData.hasScreen} onChange={(value) => updateField('hasScreen', value)} options={['false', 'true']} labels={{ false: 'No', true: 'Si' }} />
              <MultiCheckField label="Sockets compatibles" options={SOCKETS} values={formData.compatibleSockets} onToggle={(value) => toggleArrayValue('compatibleSockets', value)} />
            </div>
          </section>
        )}

        {formData.category === 'STORAGE' && (
          <section className="rounded-xl border border-gray-200 bg-gray-50 p-5">
            <h2 className="mb-4 font-black text-gray-800">Especificaciones Storage</h2>
            <div className="grid grid-cols-2 gap-4">
              <SelectField label="Tipo" value={formData.type} onChange={(value) => updateField('type', value)} options={STORAGE_TYPES} />
              <SelectField label="Interfaz / Generacion" value={formData.interface} onChange={(value) => updateField('interface', value)} options={NVME_GENS} />
              <NumberField label="Capacidad (GB)" value={formData.capacity} onChange={(value) => updateField('capacity', value)} />
              <NumberField label="Lectura (MB/s)" value={formData.readSpeed} onChange={(value) => updateField('readSpeed', value)} />
              <NumberField label="Escritura (MB/s)" value={formData.writeSpeed} onChange={(value) => updateField('writeSpeed', value)} />
              {(formData.type.includes('M.2') || formData.type.toUpperCase().includes('NVME')) && (
                <SelectField label="Tamaño fisico M.2" value={formData.m2FormFactor} onChange={(value) => updateField('m2FormFactor', value)} options={M2_FORM_FACTORS} />
              )}
            </div>
          </section>
        )}

        {(formData.category === 'LAPTOP' || formData.category === 'PC_DESKTOP') && (
          <section className="rounded-xl border border-gray-200 bg-gray-50 p-5">
            <h2 className="mb-4 font-black text-gray-800">Especificaciones del equipo</h2>
            <div className="grid grid-cols-2 gap-4">
              {formData.category === 'LAPTOP' && (
                <SelectField label="Marca" value={formData.brand} onChange={(value) => updateField('brand', value)} options={LAPTOP_BRANDS} />
              )}
              <TextField label="Procesador" value={formData.processor} onChange={(value) => updateField('processor', value)} />
              {formData.category === 'LAPTOP' ? (
                <>
                  <SelectField label="Memoria RAM" value={formData.ram} onChange={(value) => updateField('ram', value)} options={includeCurrentOption(LAPTOP_RAM_OPTIONS, formData.ram)} labels={LAPTOP_RAM_LABELS} />
                  <SelectField label="Almacenamiento" value={formData.storage} onChange={(value) => updateField('storage', value)} options={includeCurrentOption(LAPTOP_STORAGE_OPTIONS, formData.storage)} labels={LAPTOP_STORAGE_LABELS} />
                </>
              ) : (
                <>
                  <TextField label="Memoria RAM" value={formData.ram} onChange={(value) => updateField('ram', value)} />
                  <TextField label="Almacenamiento" value={formData.storage} onChange={(value) => updateField('storage', value)} />
                </>
              )}
              <SelectField label="Grafica dedicada" value={formData.hasDedicatedGpu} onChange={(value) => updateField('hasDedicatedGpu', value)} options={['false', 'true']} labels={{ false: 'No', true: 'Si' }} />
              {formData.hasDedicatedGpu === 'true' && (
                <>
                  <TextField label="Marca GPU" value={formData.gpuBrand} onChange={(value) => updateField('gpuBrand', value)} />
                  <TextField label="Modelo GPU" value={formData.gpuModel} onChange={(value) => updateField('gpuModel', value)} />
                </>
              )}
              {formData.category === 'LAPTOP' && (
                <>
                  <SelectField label="Tamano pantalla" value={formData.screenSize} onChange={(value) => updateField('screenSize', value)} options={includeCurrentOption(LAPTOP_SCREEN_OPTIONS, formData.screenSize)} labels={Object.fromEntries(LAPTOP_SCREEN_OPTIONS.map((value) => [value, `${value}"`]))} />
                  <SelectField label="Tasa de refresco (Hz)" value={formData.refreshRate} onChange={(value) => updateField('refreshRate', value)} options={includeCurrentOption(LAPTOP_REFRESH_OPTIONS, formData.refreshRate)} labels={Object.fromEntries(LAPTOP_REFRESH_OPTIONS.map((value) => [value, `${value} Hz`]))} />
                  <SelectField label="Panel" value={formData.panelType} onChange={(value) => updateField('panelType', value)} options={PANEL_TYPES} />
                  <SelectField label="Windows de serie" value={formData.includesWindows} onChange={(value) => updateField('includesWindows', value)} options={['true', 'false']} labels={{ true: 'Si', false: 'No' }} />
                </>
              )}
              {formData.category === 'PC_DESKTOP' && (
                <>
                  <SelectField label="Cooler incluido" value={formData.coolerType} onChange={(value) => updateField('coolerType', value)} options={DESKTOP_COOLER_TYPES} />
                  <NumberField label="Fuente de poder (Watts)" value={formData.psuWatts} onChange={(value) => updateField('psuWatts', value)} />
                  <TextField label="Modelo del case" value={formData.caseModel} onChange={(value) => updateField('caseModel', value)} />
                </>
              )}
            </div>
          </section>
        )}

        {formData.category === 'MONITOR' && (
          <section className="rounded-xl border border-gray-200 bg-gray-50 p-5">
            <h2 className="mb-4 font-black text-gray-800">Especificaciones Monitor</h2>
            <div className="grid grid-cols-2 gap-4">
              <SelectField label="Marca" value={formData.brand} onChange={(value) => updateField('brand', value)} options={MONITOR_BRANDS} />
              <TextField label="Tamaño" value={formData.screenSize} onChange={(value) => updateField('screenSize', value)} />
              <SelectField label="Resolución" value={formData.resolution} onChange={(value) => updateField('resolution', value)} options={includeCurrentOption(MONITOR_RESOLUTION_OPTIONS, formData.resolution)} />
              <SelectField label="Panel" value={formData.panelType} onChange={(value) => updateField('panelType', value)} options={PANEL_TYPES} />
              <SelectField label="Hz" value={formData.refreshRate} onChange={(value) => updateField('refreshRate', value)} options={includeCurrentOption(MONITOR_REFRESH_OPTIONS, formData.refreshRate)} labels={Object.fromEntries(MONITOR_REFRESH_OPTIONS.map((value) => [value, `${value} Hz`]))} />
              <NumberField label="Tiempo de respuesta (ms)" value={formData.responseTimeMs} onChange={(value) => updateField('responseTimeMs', value)} />
              <SelectField label="Parlantes integrados" value={formData.hasSpeakers} onChange={(value) => updateField('hasSpeakers', value)} options={['false', 'true']} labels={{ false: 'No', true: 'Si' }} />
              <MultiCheckField label="Puertos disponibles" options={MONITOR_PORTS} values={formData.ports} onToggle={(value) => toggleArrayValue('ports', value)} />
            </div>
          </section>
        )}
        {formData.category === 'KEYBOARD' && (
          <section className="rounded-xl border border-gray-200 bg-gray-50 p-5">
            <h2 className="mb-4 font-black text-gray-800">Especificaciones Teclado</h2>
            <div className="grid grid-cols-2 gap-4">
              <SelectField label="Marca" value={formData.brand} onChange={(value) => updateField('brand', value)} options={KEYBOARD_BRANDS} />
              <SelectField label="Tipo de teclado" value={formData.keyboardType} onChange={(value) => updateField('keyboardType', value)} options={KEYBOARD_TYPES} />
              <MultiCheckField label="Conectividad" options={PERIPHERAL_CONNECTIONS} values={formData.connections} onToggle={(value) => toggleArrayValue('connections', value)} />
              <SelectField label="Idioma / Layout" value={formData.layoutLanguage} onChange={(value) => updateField('layoutLanguage', value)} options={LAYOUT_LANGUAGES} />
              <SelectField label="Formato de teclado" value={formData.keyboardFormFactor} onChange={(value) => updateField('keyboardFormFactor', value)} options={includeCurrentOption(KEYBOARD_FORM_FACTORS, formData.keyboardFormFactor)} />
              {formData.keyboardType === 'Semi-mecanico' && <SelectField label="RGB" value={formData.hasLighting} onChange={(value) => updateField('hasLighting', value)} options={['false', 'true']} labels={{ false: 'No', true: 'Si' }} />}
              {(formData.keyboardType === 'Mecanico' || formData.keyboardType === 'Magnetico') && <TextField label="Tipo de switch" value={formData.switchType} onChange={(value) => updateField('switchType', value)} />}
            </div>
          </section>
        )}
        {formData.category === 'MOUSE' && (
          <section className="rounded-xl border border-gray-200 bg-gray-50 p-5">
            <h2 className="mb-4 font-black text-gray-800">Especificaciones Mouse</h2>
            <div className="grid grid-cols-2 gap-4">
              <SelectField label="Marca" value={formData.brand} onChange={(value) => updateField('brand', value)} options={includeCurrentOption(MOUSE_BRANDS, formData.brand)} />
              <SelectField label="Tipo de mouse" value={formData.mouseType} onChange={(value) => updateField('mouseType', value)} options={MOUSE_TYPES} />
              <MultiCheckField label="Tipo de conexion" options={PERIPHERAL_CONNECTIONS} values={formData.connections} onToggle={(value) => toggleArrayValue('connections', value)} />
              {formData.mouseType === 'Gamer' && (
                <>
                  <NumberField label="Cantidad de botones" value={formData.buttonCount} onChange={(value) => updateField('buttonCount', value)} />
                  <NumberField label="DPI maximo" value={formData.dpi} onChange={(value) => updateField('dpi', value)} />
                  <SelectField label="Polling Rate" value={formData.pollingRateHz} onChange={(value) => updateField('pollingRateHz', value)} options={POLLING_RATES} labels={{ 1000: '1000 Hz', 2000: '2000 Hz', 4000: '4000 Hz', 8000: '8000 Hz' }} />
                </>
              )}
              <SelectField label="Usa bateria o pila?" value={formData.powerType} onChange={(value) => updateField('powerType', value)} options={MOUSE_POWER_TYPES} />
              <NumberField label="Peso (g)" value={formData.weightGrams} onChange={(value) => updateField('weightGrams', value)} />
            </div>
          </section>
        )}

        {formData.category === 'MOUSEPAD' && (
          <section className="rounded-xl border border-gray-200 bg-gray-50 p-5">
            <h2 className="mb-4 font-black text-gray-800">Especificaciones Mousepad</h2>
            <div className="grid grid-cols-2 gap-4">
              <SelectField label="Marca" value={formData.brand} onChange={(value) => updateField('brand', value)} options={includeCurrentOption(MOUSEPAD_BRANDS, formData.brand)} />
              <NumberField label="Ancho (mm)" value={formData.widthCm} onChange={(value) => updateField('widthCm', value)} />
              <NumberField label="Largo (mm)" value={formData.lengthCm} onChange={(value) => updateField('lengthCm', value)} />
              <SelectField label="Tiene LEDs" value={formData.hasLed} onChange={(value) => updateField('hasLed', value)} options={['false', 'true']} labels={{ false: 'No', true: 'Si' }} />
            </div>
          </section>
        )}

        {formData.category === 'WEBCAM' && (
          <section className="rounded-xl border border-gray-200 bg-gray-50 p-5">
            <h2 className="mb-4 font-black text-gray-800">Especificaciones Webcam</h2>
            <div className="grid grid-cols-2 gap-4">
              <SelectField label="Marca" value={formData.brand} onChange={(value) => updateField('brand', value)} options={includeCurrentOption(WEBCAM_BRANDS, formData.brand)} />
              <SelectField label="Resolucion" value={formData.resolution} onChange={(value) => updateField('resolution', value)} options={includeCurrentOption(VIDEO_RESOLUTION_OPTIONS, formData.resolution)} />
              <SelectField label="FPS" value={formData.fps} onChange={(value) => updateField('fps', value)} options={includeCurrentOption(WEBCAM_FPS_OPTIONS, formData.fps)} labels={{ 30: '30 FPS', 60: '60 FPS' }} />
            </div>
          </section>
        )}

        {formData.category === 'CAPTURE_CARD' && (
          <section className="rounded-xl border border-gray-200 bg-gray-50 p-5">
            <h2 className="mb-4 font-black text-gray-800">Especificaciones Capturadora</h2>
            <div className="grid grid-cols-2 gap-4">
              <SelectField label="Marca" value={formData.brand} onChange={(value) => updateField('brand', value)} options={includeCurrentOption(CAPTURE_CARD_BRANDS, formData.brand)} />
              <SelectField label="Resolucion" value={formData.resolution} onChange={(value) => updateField('resolution', value)} options={includeCurrentOption(VIDEO_RESOLUTION_OPTIONS, formData.resolution)} />
              <SelectField label="FPS" value={formData.fps} onChange={(value) => updateField('fps', value)} options={includeCurrentOption(CAPTURE_CARD_FPS_OPTIONS, formData.fps)} labels={{ 30: '30 FPS', 60: '60 FPS', 120: '120 FPS' }} />
            </div>
          </section>
        )}

        {formData.category === 'CABLE_HUB' && (
          <section className="rounded-xl border border-gray-200 bg-gray-50 p-5">
            <h2 className="mb-4 font-black text-gray-800">Especificaciones Cables y Hub</h2>
            <div className="grid grid-cols-2 gap-4">
              <SelectField label="Marca" value={formData.brand} onChange={(value) => updateField('brand', value)} options={includeCurrentOption(CABLE_HUB_BRANDS, formData.brand)} />
              <SelectField label="Tipo" value={formData.cableHubType} onChange={(value) => updateField('cableHubType', value)} options={includeCurrentOption(CABLE_HUB_TYPES, formData.cableHubType)} />
              {formData.cableHubType === 'Cable' && (
                <>
                  <SelectField label="Tipo de cable" value={formData.cableType} onChange={(value) => updateField('cableType', value)} options={includeCurrentOption(CABLE_TYPES, formData.cableType)} />
                  <SelectField label="Largo en metros" value={formData.cableLengthMeters} onChange={(value) => updateField('cableLengthMeters', value)} options={includeCurrentOption(CABLE_LENGTHS, formData.cableLengthMeters)} labels={{ 1: '1 m', 2: '2 m', 3: '3 m' }} />
                </>
              )}
              {formData.cableHubType === 'Hub' && (
                <>
                  <SelectField label="Tipo de entrada" value={formData.hubInputType} onChange={(value) => updateField('hubInputType', value)} options={includeCurrentOption(HUB_INPUT_TYPES, formData.hubInputType)} />
                  <SelectField label="Salida HDMI" value={formData.hasHdmiOutput} onChange={(value) => updateField('hasHdmiOutput', value)} options={['false', 'true']} labels={{ false: 'No', true: 'Si' }} />
                  <SelectField label="Salida RJ45" value={formData.hasRj45Output} onChange={(value) => updateField('hasRj45Output', value)} options={['false', 'true']} labels={{ false: 'No', true: 'Si' }} />
                </>
              )}
            </div>
          </section>
        )}

        {formData.category === 'LAPTOP_COOLING_BASE' && (
          <section className="rounded-xl border border-gray-200 bg-gray-50 p-5">
            <h2 className="mb-4 font-black text-gray-800">Especificaciones Base refrigeradora</h2>
            <div className="grid grid-cols-2 gap-4">
              <SelectField label="Marca" value={formData.brand} onChange={(value) => updateField('brand', value)} options={includeCurrentOption(LAPTOP_COOLING_BASE_BRANDS, formData.brand)} />
              <SelectField label="Cantidad de ventiladores" value={formData.fanCount} onChange={(value) => updateField('fanCount', value)} options={includeCurrentOption(LAPTOP_COOLING_BASE_FAN_COUNTS, formData.fanCount)} />
              <SelectField label="Conectividad" value={formData.connectivity} onChange={(value) => updateField('connectivity', value)} options={includeCurrentOption(LAPTOP_ACCESSORY_CONNECTIVITY, formData.connectivity)} />
            </div>
          </section>
        )}

        {formData.category === 'BACKPACK' && (
          <section className="rounded-xl border border-gray-200 bg-gray-50 p-5">
            <h2 className="mb-4 font-black text-gray-800">Especificaciones Mochila</h2>
            <div className="grid grid-cols-2 gap-4">
              <SelectField label="Marca" value={formData.brand} onChange={(value) => updateField('brand', value)} options={includeCurrentOption(BACKPACK_BRANDS, formData.brand)} />
              <TextField label="Color" value={formData.color} onChange={(value) => updateField('color', value)} />
            </div>
          </section>
        )}

        {formData.category === 'HEADSET' && (
          <section className="rounded-xl border border-gray-200 bg-gray-50 p-5">
            <h2 className="mb-4 font-black text-gray-800">Especificaciones Audifonos</h2>
            <div className="grid grid-cols-2 gap-4">
              <SelectField label="Marca" value={formData.brand} onChange={(value) => updateField('brand', value)} options={includeCurrentOption(HEADSET_BRANDS, formData.brand)} />
              <SelectField label="Conexion" value={formData.connection} onChange={(value) => updateField('connection', value)} options={includeCurrentOption(HEADSET_CONNECTION_TYPES, formData.connection)} />
              <div className="col-span-2">
                <label className="mb-2 block text-sm font-bold text-gray-700">Conectividad soportada</label>
                <div className="grid grid-cols-2 gap-2">
                  {(formData.connection === 'Cableado' ? HEADSET_WIRED_CONNECTIONS : HEADSET_WIRELESS_CONNECTIONS).map((option) => (
                    <label key={option} className="flex items-center gap-2 rounded-lg border bg-white p-3 text-sm font-semibold">
                      <input type="checkbox" checked={formData.supportedConnections.includes(option)} onChange={() => toggleArrayValue('supportedConnections', option)} />
                      {option}
                    </label>
                  ))}
                </div>
              </div>
              <NumberField label="Drivers (mm)" value={formData.driverSize} onChange={(value) => updateField('driverSize', value)} />
              <NumberField label="Impedancia (Ohms)" value={formData.impedance} onChange={(value) => updateField('impedance', value)} />
              <TextField label="Microfono" value={formData.micType} onChange={(value) => updateField('micType', value)} />
              <SelectField label="Cancelacion de ruido" value={formData.noiseCancel} onChange={(value) => updateField('noiseCancel', value)} options={['false', 'true']} labels={{ false: 'No', true: 'Si' }} />
              <SelectField label="RGB" value={formData.hasRGB} onChange={(value) => updateField('hasRGB', value)} options={['false', 'true']} labels={{ false: 'No', true: 'Si' }} />
            </div>
          </section>
        )}

        {formData.category === 'MICROPHONE' && (
          <section className="rounded-xl border border-gray-200 bg-gray-50 p-5">
            <h2 className="mb-4 font-black text-gray-800">Especificaciones Microfono</h2>
            <div className="grid grid-cols-2 gap-4">
              <SelectField label="Marca" value={formData.brand} onChange={(value) => updateField('brand', value)} options={includeCurrentOption(MICROPHONE_BRANDS, formData.brand)} />
              <TextField label="Conexion" value={formData.connection} onChange={(value) => updateField('connection', value)} />
              <TextField label="Microfono" value={formData.micType} onChange={(value) => updateField('micType', value)} />
              <SelectField label="RGB" value={formData.hasRGB} onChange={(value) => updateField('hasRGB', value)} options={['false', 'true']} labels={{ false: 'No', true: 'Si' }} />
            </div>
          </section>
        )}

        {formData.category === 'SPEAKER' && (
          <section className="rounded-xl border border-gray-200 bg-gray-50 p-5">
            <h2 className="mb-4 font-black text-gray-800">Especificaciones Parlantes</h2>
            <div className="grid grid-cols-2 gap-4">
              <SelectField label="Marca" value={formData.brand} onChange={(value) => updateField('brand', value)} options={includeCurrentOption(SPEAKER_BRANDS, formData.brand)} />
              <TextField label="Conexion" value={formData.connection} onChange={(value) => updateField('connection', value)} />
              <NumberField label="Potencia (W)" value={formData.wattage} onChange={(value) => updateField('wattage', value)} />
              <SelectField label="RGB" value={formData.hasRGB} onChange={(value) => updateField('hasRGB', value)} options={['false', 'true']} labels={{ false: 'No', true: 'Si' }} />
            </div>
          </section>
        )}

        {formData.category === 'CHAIR' && (
          <section className="rounded-xl border border-gray-200 bg-gray-50 p-5">
            <h2 className="mb-4 font-black text-gray-800">Especificaciones Silla Gaming</h2>
            <div className="grid grid-cols-2 gap-4">
              <TextField label="Marca" value={formData.brand} onChange={(value) => updateField('brand', value)} />
              <TextField label="Color" value={formData.color} onChange={(value) => updateField('color', value)} />
              <SelectField label="Material" value={formData.material} onChange={(value) => updateField('material', value)} options={CHAIR_MATERIALS} />
              <NumberField label="Peso maximo soportado (kg)" value={formData.maxWeightKg} onChange={(value) => updateField('maxWeightKg', value)} />
            </div>
          </section>
        )}

        {formData.category === 'GAMING_DESK' && (
          <section className="rounded-xl border border-gray-200 bg-gray-50 p-5">
            <h2 className="mb-4 font-black text-gray-800">Especificaciones Mesa Gamer</h2>
            <div className="grid grid-cols-2 gap-4">
              <TextField label="Marca" value={formData.brand} onChange={(value) => updateField('brand', value)} />
              <TextField label="Color" value={formData.color} onChange={(value) => updateField('color', value)} />
              <TextField label="Superficie" value={formData.surface} onChange={(value) => updateField('surface', value)} />
              <NumberField label="Peso (kg)" value={formData.weightKg} onChange={(value) => updateField('weightKg', value)} />
            </div>
          </section>
        )}

        <div>
          <label className="mb-2 block text-sm font-bold text-gray-700">Imagenes del producto</label>
          <ImageUploader
            mode="product"
            files={imageFiles}
            onFilesChange={setImageFiles}
            existingImages={existingImages}
            onExistingImagesChange={setExistingImages}
            maxFiles={5}
            helperText="Puedes subir hasta 5 imagenes. La primera imagen sera usada como portada del producto. Recomendacion: imagenes cuadradas de 550 x 550 px."
          />
        </div>

        <button type="submit" disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-cyan py-4 text-lg font-bold text-white shadow-lg transition hover:bg-brand-dark disabled:cursor-wait disabled:opacity-60">
          <FiSave /> {saving ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </form>
    </div>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-gray-700">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:ring-2 focus:ring-brand-cyan" />
    </div>
  );
}

function NumberField({ label, value, onChange, helper }: { label: string; value: string; onChange: (value: string) => void; helper?: string }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-gray-700">{label}</label>
      <input type="number" min="0" value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:ring-2 focus:ring-brand-cyan" />
      {helper && <span className="mt-1 block text-xs text-gray-500">{helper}</span>}
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  labels = {},
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  labels?: Record<string, string>;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-gray-700">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:ring-2 focus:ring-brand-cyan">
        {options.map((option) => (
          <option key={option} value={option}>{labels[option] ?? option}</option>
        ))}
      </select>
    </div>
  );
}

function MultiCheckField({
  label,
  options,
  values,
  onToggle,
}: {
  label: string;
  options: string[];
  values: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="col-span-2">
      <label className="mb-2 block text-sm font-bold text-gray-700">{label}</label>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        {options.map((option) => (
          <label key={option} className="flex items-center gap-2 rounded-lg border bg-white p-3 text-sm font-semibold">
            <input type="checkbox" checked={values.includes(option)} onChange={() => onToggle(option)} />
            {option}
          </label>
        ))}
      </div>
    </div>
  );
}

