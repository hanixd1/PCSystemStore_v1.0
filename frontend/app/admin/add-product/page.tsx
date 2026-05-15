'use client';

import { useState, useEffect } from 'react';
import { 
  FiSave, FiCpu, FiGrid, FiHardDrive, FiMonitor, FiWind, 
  FiBox, FiZap, FiMousePointer, FiHeadphones, FiLayers 
} from 'react-icons/fi';
import { MdComputer, MdLaptop, MdSecurity, MdKeyboard } from 'react-icons/md';
import { api, getApiErrorMessage } from '@/lib/api';
import ImageUploader from '@/components/ImageUploader';
import { buildProductPayload } from '@/lib/products/buildProductPayload';
import { validateProductForm } from '@/lib/products/validateProductForm';

// --- CONSTANTES Y LISTAS ---
const DEPARTMENTS = {
  COMPONENTES: [
    { label: 'Procesador (CPU)', value: 'CPU' },
    { label: 'Placa Madre', value: 'MOTHERBOARD' },
    { label: 'Memoria RAM', value: 'RAM' },
    { label: 'Tarjeta de Video', value: 'GPU' },
    { label: 'Fuente de Poder', value: 'PSU' },
    { label: 'Gabinete / Case', value: 'CASE' },
    { label: 'Refrigeracion', value: 'COOLER' },
    { label: 'Almacenamiento', value: 'STORAGE' },
  ],
  ORDENADORES: [
    { label: 'Laptop / Portatil', value: 'LAPTOP' },
    { label: 'PC de Escritorio', value: 'PC_DESKTOP' },
    { label: 'Software / Licencia', value: 'SOFTWARE' },
    { label: 'Base refrigeradora', value: 'LAPTOP_COOLING_BASE' },
    { label: 'Mochila', value: 'BACKPACK' },
  ],
  PERIFERICOS: [
    { label: 'Monitor', value: 'MONITOR' },
    { label: 'Teclado', value: 'KEYBOARD' },
    { label: 'Mouse', value: 'MOUSE' },
    { label: 'Mousepad', value: 'MOUSEPAD' },
    { label: 'Silla Gaming', value: 'CHAIR' },
    { label: 'Mesa Gamer', value: 'GAMING_DESK' },
    { label: 'Webcam', value: 'WEBCAM' },
    { label: 'Capturadora', value: 'CAPTURE_CARD' },
    { label: 'Cables y Hub', value: 'CABLE_HUB' },
  ],
  AUDIO: [
    { label: 'Audifonos / Headset', value: 'HEADSET' },
    { label: 'Microfono', value: 'MICROPHONE' },
    { label: 'Parlantes', value: 'SPEAKER' },
  ]
};

// Listas de Opciones Tecnicas
const CPU_BRANDS = ['AMD', 'Intel'];
const MOTHERBOARD_BRANDS = ['ASUS', 'MSI', 'Gigabyte', 'ASRock', 'Otros'];
const CPU_SOCKETS_BY_BRAND: Record<string, string[]> = {
  AMD: ['AM4', 'AM5'],
  Intel: ['LGA 1200', 'LGA 1700', 'LGA 1851'],
};
const SOCKETS = ["AM5", "AM4", "LGA 1700", "LGA 1200", "LGA 1851"];
const M2_FORM_FACTORS = ['2230', '2242', '2260', '2280', '22110'];
const COOLER_SOCKET_OPTIONS = ['AM4', 'AM5', 'LGA 1200', 'LGA 1700', 'LGA 1851'];
const COOLER_BRANDS = ['MSI', 'DeepCool', 'Corsair', 'Gigabyte', 'ASUS', 'Otros'];
const COOLER_RADIATOR_OPTIONS = ['120', '240', '280', '360', '460'];
const FORM_FACTORS = ["ATX", "Micro-ATX", "Mini-ITX", "E-ATX"];
const CASE_BRANDS = ['Halion', 'Micronics', 'ASUS', 'Gigabyte', 'DeepCool', 'Antryx', 'MSI', 'Lian Li', 'Otros'];
const CASE_RADIATOR_SUPPORT_OPTIONS = [
  { value: '0', label: 'No soporta' },
  { value: '120', label: '120 mm' },
  { value: '240', label: '240 mm' },
  { value: '280', label: '280 mm' },
  { value: '360', label: '360 mm' },
  { value: '460', label: '460 mm' },
];
const RAM_TYPES = ["DDR4", "DDR5"];
const RAM_CAPACITIES = [8, 16, 24, 32];
const PSU_BRANDS = ['MSI', 'ASUS', 'Gigabyte', 'Corsair', 'DeepCool', 'Antryx', 'Cooler Master', 'Seasonic', 'Thermaltake', 'Otros'];
const PSU_WATT_OPTIONS = ['450', '500', '550', '600', '650', '700', '750', '800', '850', '1000', '1200', '1500'];
const PSU_CERTS = ["Sin Certificacion", "80+ White", "80+ Bronze", "80+ Gold", "80+ Platinum", "80+ Titanium"];
const GPU_BRANDS = ['Gigabyte', 'ASUS', 'MSI', 'PNY', 'Otros'];
const GPU_CHIPSETS = ["NVIDIA GeForce", "AMD Radeon", "Intel Arc"];
const GPU_VRAM_OPTIONS = ['4', '6', '8', '12', '16', '24', '32'];
const STORAGE_TYPES = ["SSD 2.5", "NVMe M.2", "M.2 SATA", "HDD 3.5"];
const NVME_GENS = ["SATA", "PCIe 3.0", "PCIe 4.0", "PCIe 5.0"];
const PANEL_TYPES = ["IPS", "VA", "TN", "OLED"];
const LAPTOP_BRANDS = ["ASUS", "Lenovo", "HP", "Acer", "Dell", "MSI", "Otra"];
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
const LAPTOP_RAM_OPTIONS = ['8GB', '16GB', '24GB', '32GB', '64GB'];
const LAPTOP_STORAGE_OPTIONS = ['256GB SSD', '512GB SSD', '1TB SSD', '2TB SSD', '1TB HDD', '2TB HDD', '512GB SSD + 1TB HDD', '1TB SSD + 1TB HDD'];
const LAPTOP_SCREEN_OPTIONS = ['13', '14', '15.6', '16', '17.3', '18'];
const LAPTOP_REFRESH_OPTIONS = ['60', '75', '120', '144', '165', '240', '300', '360'];
const MONITOR_BRANDS = ['MSI', 'Gigabyte', 'Teros', 'LG', 'Samsung', 'Otros'];
const MONITOR_RESOLUTION_OPTIONS = ['FHD (1920x1080)', 'QHD (2560x1440)', 'Ultra Wide QHD (3440x1440)', '4K UHD (3840x2160)', 'Otro'];
const MONITOR_REFRESH_OPTIONS = ['60', '75', '100', '120', '144', '165', '180', '200', '240', '280', '360'];
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
const DESKTOP_COOLER_TYPES = ['De serie', 'Torre', 'Liquida (AIO)', 'No especificado'];
const MONITOR_PORTS = ['VGA', 'HDMI', 'DisplayPort', 'USB-C'];
const PERIPHERAL_CONNECTIONS = ['Cableado', 'Bluetooth', 'Dongle USB'];
const KEYBOARD_BRANDS = ['Redragon', 'MSI', 'Logitech', 'Razer', 'Aula', 'Royal Kludge', 'Otros'];
const KEYBOARD_TYPES = ['Membrana', 'Semi-mecanico', 'Mecanico', 'Magnetico'];
const KEYBOARD_FORM_FACTORS = ['Completo', '80%', 'TKL', '75%', '65%', '60%'];
const LAYOUT_LANGUAGES = ['Espanol', 'Ingles'];
const MOUSE_TYPES = ['Oficina', 'Gamer'];
const MOUSE_BRANDS = ['Redragon', 'Logitech', 'Razer', 'MSI', 'Teros', 'Otros'];
const MOUSEPAD_BRANDS = ['HyperX', 'Logitech', 'Redragon', 'Otros'];
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
const CHAIR_MATERIALS = ['Cuero sintetico', 'Tela', 'Malla', 'Mixto', 'Otro'];
const MOUSE_POWER_TYPES = ['Pila', 'Bateria', 'Ninguno'];

const INITIAL_FORM_DATA = {
  name: '', description: '', price: '', stock: '', category: 'CPU', image: '',
  cpuBrand: 'AMD', socket: 'AM5', cores: '', threads: '', frequency: '', baseTdpWatts: '', tdp: '', integratedGraphics: 'false', includesCooler: 'false',
  memorySlots: '4', m2Slots: '2', formFactor: 'ATX', supportedM2FormFactors: ['2280'],
  memoryType: 'DDR5', capacity: '16', speed: '5200', modules: '1', hasRGB: 'false',
  chipset: 'NVIDIA GeForce', vram: '8', length: '', gpuPowerWatts: '', recommendedPsuWatts: '', fans: '2',
  wattage: '', certification: '80+ Bronze', modular: 'No Modular',
  maxGpuLength: '', includesPsu: 'false', includedFans: '0', radiatorSupportMm: '0',
  type: 'Torre', fanCount: '1', radiatorSize: '240', hasScreen: 'false', compatibleSockets: ['AM4', 'AM5'], tdpCapacity: '', coolerHeight: '',
  interface: 'PCIe 4.0', readSpeed: '', writeSpeed: '', m2FormFactor: '2280',
  screenSize: '15.6', refreshRate: '60', panelType: 'IPS', resolution: 'FHD (1920x1080)',
  processor: 'Intel Core i5', ram: '8GB', storage: '512GB SSD',
  hasDedicatedGpu: 'false', gpuBrand: '', gpuModel: '', includesWindows: 'true',
  connectivity: 'USB-A',
  coolerType: 'No especificado', psuWatts: '', caseModel: '',
  responseTimeMs: '', ports: [] as string[], hasSpeakers: 'false',
  switchType: 'Mecanico', layout: 'Espanol', connection: 'USB',
  dpi: '16000', sensor: 'Optico', wireless: 'false',
  brand: '', keyboardType: 'Membrana', connections: ['Cableado'] as string[], layoutLanguage: 'Espanol',
  hasLighting: 'false', keyboardFormFactor: 'Completo',
  mouseType: 'Oficina', buttonCount: '', pollingRateHz: '1000', weightGrams: '', powerType: 'Ninguno',
  fps: '30', cableHubType: 'Cable', cableType: 'HDMI a HDMI', cableLengthMeters: '1', hubInputType: 'USB-C', hasHdmiOutput: 'false', hasRj45Output: 'false',
  widthCm: '', lengthCm: '', hasLed: 'false',
  color: '', material: 'Cuero sintetico', maxWeightKg: '', surface: '', weightKg: '',
  licenseType: 'Permanente', platform: 'Windows',
  driverSize: '50', impedance: '32', micType: 'Unidireccional', noiseCancel: 'false', supportedConnections: ['Cable USB'] as string[],
};

const createInitialFormData = (category = '') => ({
  ...INITIAL_FORM_DATA,
  category,
  type: category === 'COOLER' ? 'Torre' : category === 'STORAGE' ? 'SSD 2.5' : INITIAL_FORM_DATA.type,
  resolution: category === 'WEBCAM' || category === 'CAPTURE_CARD' ? 'FHD' : INITIAL_FORM_DATA.resolution,
  fps: category === 'WEBCAM' || category === 'CAPTURE_CARD' ? '30' : INITIAL_FORM_DATA.fps,
  fanCount: category === 'LAPTOP_COOLING_BASE' ? '1' : INITIAL_FORM_DATA.fanCount,
  connectivity: category === 'LAPTOP_COOLING_BASE' ? 'USB-A' : INITIAL_FORM_DATA.connectivity,
  connection: category === 'HEADSET' ? 'Cableado' : INITIAL_FORM_DATA.connection,
  supportedConnections: category === 'HEADSET' ? ['Cable USB'] : [...INITIAL_FORM_DATA.supportedConnections],
  cableHubType: category === 'CABLE_HUB' ? 'Cable' : INITIAL_FORM_DATA.cableHubType,
  cableType: category === 'CABLE_HUB' ? 'HDMI a HDMI' : INITIAL_FORM_DATA.cableType,
  cableLengthMeters: category === 'CABLE_HUB' ? '1' : INITIAL_FORM_DATA.cableLengthMeters,
  hubInputType: category === 'CABLE_HUB' ? 'USB-C' : INITIAL_FORM_DATA.hubInputType,
  supportedM2FormFactors: [...INITIAL_FORM_DATA.supportedM2FormFactors],
  compatibleSockets: [...INITIAL_FORM_DATA.compatibleSockets],
  ports: [...INITIAL_FORM_DATA.ports],
  connections: [...INITIAL_FORM_DATA.connections],
});

const NON_NEGATIVE_FIELDS = new Set([
  'price', 'stock', 'cores', 'threads', 'baseTdpWatts', 'tdp', 'memorySlots', 'm2Slots', 'capacity', 'speed',
  'modules', 'vram', 'length', 'gpuPowerWatts', 'recommendedPsuWatts', 'fans', 'wattage', 'maxGpuLength', 'includedFans', 'radiatorSupportMm',
  'fanCount', 'radiatorSize', 'tdpCapacity', 'coolerHeight', 'readSpeed', 'writeSpeed',
  'refreshRate', 'psuWatts', 'responseTimeMs', 'dpi', 'buttonCount', 'weightGrams',
  'widthCm', 'lengthCm', 'maxWeightKg', 'weightKg', 'driverSize', 'impedance',
]);

const NO_NEGATIVE_TEXT_FIELDS = new Set(['frequency']);

const NAME_REGEX = /^[\p{L}0-9().,+\-/%\s]{10,120}$/u;
const DESCRIPTION_REGEX = /^[\p{L}0-9().,;:+\-/%\s]{20,1200}$/u;

export default function AddProductPage() {
  const [loading, setLoading] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [formResetKey, setFormResetKey] = useState(0);
  
  // Estado para el manejo del menu de categorias
  const [selectedDept, setSelectedDept] = useState('');

  const [formData, setFormData] = useState(() => createInitialFormData());

  const resetFormForCategory = (category: string) => {
    setFormData(createInitialFormData(category));
    setImageFiles([]);
  };

  const resetProductForm = () => {
    setSelectedDept('');
    setFormData(createInitialFormData());
    setImageFiles([]);
    setLoading(false);
    setFormResetKey((current) => current + 1);
  };

  const validateForm = () => {
    const sharedValidationError = validateProductForm(formData, {
      mode: 'create',
      imageCount: imageFiles.length,
      requireImages: true,
      nonNegativeFields: NON_NEGATIVE_FIELDS,
      noNegativeTextFields: NO_NEGATIVE_TEXT_FIELDS,
      nameRegex: NAME_REGEX,
      descriptionRegex: DESCRIPTION_REGEX,
      buildPayload: buildProductPayload,
      cpuSocketsByBrand: CPU_SOCKETS_BY_BRAND,
    });

    if (sharedValidationError) {
      return sharedValidationError;
    }

    return null;

    const trimmedName = formData.name.trim();
    const trimmedDescription = formData.description.trim();

    if (!NAME_REGEX.test(trimmedName)) {
      return 'El nombre debe tener entre 10 y 120 caracteres y solo usar letras, numeros y signos comunes.';
    }

    if (!DESCRIPTION_REGEX.test(trimmedDescription)) {
      return 'La descripcion debe tener entre 20 y 1200 caracteres y solo usar texto valido.';
    }

    if (Number(formData.price) <= 0) {
      return 'El precio debe ser mayor a 0.';
    }

    if (!Number.isInteger(Number(formData.stock)) || Number(formData.stock) < 0) {
      return 'El stock debe ser un numero entero y no puede ser negativo.';
    }

    const payloadToValidate = buildProductPayload(formData);
    for (const field of NON_NEGATIVE_FIELDS) {
      if (!(field in payloadToValidate)) continue;
      const value = payloadToValidate[field];
      if (value !== '' && Number(value) < 0) {
        return `El campo ${field} no puede ser negativo.`;
      }
    }

    for (const field of NO_NEGATIVE_TEXT_FIELDS) {
      const value = String(formData[field as keyof typeof formData] || '').trim();
      if (value.includes('-')) {
        return `El campo ${field} no puede contener valores negativos.`;
      }
    }

    if (imageFiles.length < 1 || imageFiles.length > 5) {
      return 'Debes subir entre 1 y 5 imagenes.';
    }

    if (formData.category === 'CPU') {
      const allowedSockets = CPU_SOCKETS_BY_BRAND[formData.cpuBrand] || [];
      if (!formData.cpuBrand || !allowedSockets.includes(formData.socket)) {
        return 'Selecciona una marca de procesador y un socket compatible.';
      }
      if (Number(formData.tdp) <= 0) {
        return 'El TDP del procesador debe ser mayor a 0.';
      }
    }

    if (formData.category === 'COOLER') {
      if (!formData.brand) {
        return 'Selecciona la marca del cooler.';
      }
      if (formData.compatibleSockets.length === 0) {
        return 'Selecciona al menos un socket compatible para el cooler.';
      }
      if (Number(formData.tdpCapacity) <= 0) {
        return 'El TDP soportado del cooler debe ser mayor a 0.';
      }
      if (formData.type === 'Torre' && Number(formData.coolerHeight) <= 0) {
        return 'La altura del cooler de torre debe ser mayor a 0.';
      }
      if (formData.type === 'Liquida' && Number(formData.radiatorSize) <= 0) {
        return 'Selecciona el tamano de radiador del cooler liquido.';
      }
    }

    if (formData.category === 'PSU' && !formData.brand) {
      return 'Selecciona la marca de la fuente de poder.';
    }

    if (formData.category === 'LAPTOP' && !formData.brand) {
      return 'Selecciona la marca de la laptop.';
    }

    if (formData.category === 'LAPTOP_COOLING_BASE' && !formData.brand) {
      return 'Selecciona la marca de la base refrigeradora.';
    }

    if (formData.category === 'BACKPACK' && !formData.brand) {
      return 'Selecciona la marca de la mochila.';
    }

    if (formData.category === 'MONITOR' && !formData.brand) {
      return 'Selecciona la marca del monitor.';
    }

    if (formData.category === 'KEYBOARD' && !formData.brand) {
      return 'Selecciona la marca del teclado.';
    }

    if (formData.category === 'MOUSE' && !formData.brand) {
      return 'Selecciona la marca del mouse.';
    }

    if (formData.category === 'MOUSEPAD' && !formData.brand) {
      return 'Selecciona la marca del mousepad.';
    }

    if (['WEBCAM', 'CAPTURE_CARD', 'CABLE_HUB'].includes(formData.category) && !formData.brand) {
      return 'Selecciona la marca del producto.';
    }

    if (formData.category === 'STORAGE') {
      const isM2 = formData.type.includes('M.2') || formData.type.toUpperCase().includes('NVME');
      if (isM2 && !formData.m2FormFactor) {
        return 'Selecciona el tamano fisico M.2 del almacenamiento.';
      }
    }

    if (formData.category === 'PC_DESKTOP' && formData.psuWatts !== '' && Number(formData.psuWatts) < 100) {
      return 'La fuente de poder debe ser un numero positivo. Recomendado minimo 100W.';
    }

    if (formData.category === 'MONITOR' && formData.responseTimeMs !== '' && Number(formData.responseTimeMs) < 0.1) {
      return 'El tiempo de respuesta debe ser un numero positivo mayor o igual a 0.1 ms.';
    }

    if (formData.category === 'KEYBOARD' && formData.connections.length === 0) {
      return 'Selecciona al menos una conexion para el teclado.';
    }

    if (formData.category === 'MOUSE' && formData.connections.length === 0) {
      return 'Selecciona al menos una conexion para el mouse.';
    }

    return null;
  };

  // Cuando cambia el departamento, reseteamos la categoria y la informacion basica
  useEffect(() => {
    if (!selectedDept) return;
    // @ts-ignore
    const firstCategory = DEPARTMENTS[selectedDept][0].value;
    
    setFormData(createInitialFormData(firstCategory));
    
    // Tambien resetear las imagenes
    setImageFiles([]);
  }, [selectedDept]);

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    if (type === 'number' && NON_NEGATIVE_FIELDS.has(name)) {
      if (value === '') {
        setFormData({ ...formData, [name]: '' });
        return;
      }

      if (Number(value) < 0) {
        e.target.value = String(formData[name as keyof typeof formData] ?? '');
        return;
      }
    }

    if (type !== 'number' && NO_NEGATIVE_TEXT_FIELDS.has(name) && value.includes('-')) {
      e.target.value = String(formData[name as keyof typeof formData] ?? '');
      return;
    }

    if (name === 'category') {
      resetFormForCategory(value);
      return;
    }

    if (name === 'cpuBrand') {
      const nextSockets = CPU_SOCKETS_BY_BRAND[value] || [];
      setFormData({
        ...formData,
        cpuBrand: value,
        socket: nextSockets.includes(formData.socket) ? formData.socket : nextSockets[0] || '',
      });
      return;
    }

    if (name === 'mouseType' && value === 'Oficina') {
      setFormData({ ...formData, mouseType: value, buttonCount: '', dpi: '', pollingRateHz: '1000' });
      return;
    }

    if (name === 'keyboardType') {
      setFormData({
        ...formData,
        keyboardType: value,
        hasLighting: value === 'Semi-mecanico' ? formData.hasLighting : 'false',
        switchType: value === 'Mecanico' || value === 'Magnetico' ? formData.switchType : '',
      });
      return;
    }

    if (name === 'connection' && formData.category === 'HEADSET') {
      const allowed = value === 'Cableado' ? HEADSET_WIRED_CONNECTIONS : HEADSET_WIRELESS_CONNECTIONS;
      const nextSupported = formData.supportedConnections.filter((item) => allowed.includes(item));
      setFormData({
        ...formData,
        connection: value,
        supportedConnections: nextSupported.length ? nextSupported : [allowed[0]],
      });
      return;
    }

    if (name === 'cableHubType') {
      setFormData({
        ...formData,
        cableHubType: value,
        cableType: value === 'Cable' ? formData.cableType || 'HDMI a HDMI' : '',
        cableLengthMeters: value === 'Cable' ? formData.cableLengthMeters || '1' : '',
        hubInputType: value === 'Hub' ? formData.hubInputType || 'USB-C' : '',
        hasHdmiOutput: value === 'Hub' ? formData.hasHdmiOutput : 'false',
        hasRj45Output: value === 'Hub' ? formData.hasRj45Output : 'false',
      });
      return;
    }

    setFormData({ ...formData, [name]: type === 'checkbox' ? String(checked) : value });
  };
  const handleMultiSelectChange = (field: 'compatibleSockets' | 'supportedM2FormFactors' | 'ports' | 'connections' | 'supportedConnections', value: string) => {
    setFormData((prev) => {
      const currentValues = prev[field];
      const nextValues = currentValues.includes(value)
        ? currentValues.filter((item) => item !== value)
        : [...currentValues, value];

      return { ...prev, [field]: nextValues };
    });
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      alert(validationError);
      return;
    }
    
    if (imageFiles.length === 0) {
        alert('Debes subir al menos 1 imagen del producto');
      return;
    }
    
    setLoading(true);
    try {
      // Crear FormData para enviar archivos
      const formDataToSend = new FormData();

      // Enviar solo campos aplicables a la categoria/tipo seleccionado.
      Object.entries(buildProductPayload(formData, { mode: 'create' })).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        formDataToSend.append(key, Array.isArray(value) ? JSON.stringify(value) : String(value));
      });
      
      // Agregar las imagenes
      imageFiles.forEach((file, index) => {
        formDataToSend.append('images', file);
      });
      
      await api.post('/products', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      resetProductForm();
      alert('Producto creado correctamente.');
    } catch (error: unknown) {
      console.error(error);
      alert(getApiErrorMessage(error, 'Error al guardar. Revisa la configuracion del backend o Cloudinary.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-20">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-black rounded-xl text-white">
           <FiGrid size={24} />
        </div>
        <div>
          <h1 className="text-3xl font-black text-gray-800">Agregar Productos</h1>
        </div>
      </div>

      <form key={formResetKey} onSubmit={handleSubmit} noValidate className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* === COLUMNA IZQUIERDA: FORMULARIOS (Ocupa 8 columnas) === */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* 1. INFORMACION GENERAL (Siempre visible) */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
            <h2 className="text-xl font-bold mb-6 text-gray-800 border-b pb-2">Informacion Basica</h2>
            <div className="grid grid-cols-2 gap-6">
              <div className="col-span-2">
                <label className="label-admin">Nombre del Producto</label>
                <input name="name" onChange={handleChange} className="input-admin text-lg font-medium" placeholder="Ej: Laptop Gamer ASUS TUF F15" required />
              </div>
              <div>
                <label className="label-admin">Precio (S/.)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold pointer-events-none">S/.</span>
                  <input 
                    name="price" 
                    type="number" 
                    step="0.01"
                    onChange={handleChange} 
                    className="input-admin pl-12 text-center" 
                    placeholder="0.00" 
                    required 
                  />
                </div>
              </div>
              <div>
                <label className="label-admin">Stock Disponible</label>
                <input name="stock" type="number" onChange={handleChange} className="input-admin" placeholder="0" required />
              </div>
              <div className="col-span-2">
                <label className="label-admin">Descripcion del Producto</label>
                <textarea 
                  name="description" 
                  rows={4}
                  onChange={handleChange} 
                  className="input-admin resize-none" 
                  placeholder="Describe las caracteristicas principales del producto..." 
                />
              </div>
              <div className="col-span-2">
                 <label className="label-admin">Imagenes del Producto (Maximo 5)</label>
                 <ImageUploader
                   mode="product"
                   files={imageFiles}
                   onFilesChange={setImageFiles}
                   maxFiles={5}
                   helperText="Sube entre 1 y 5 imagenes. La primera sera la portada. Recomendacion: imagenes cuadradas de 550 x 550 px, fondo limpio, formato JPG, PNG o WEBP."
                 />
              </div>
            </div>
          </div>

          {/* 2. ESPECIFICACIONES TECNICAS (Dinamico) */}
          <div className="bg-gray-50 p-8 rounded-2xl border border-gray-200 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <FiZap size={100} />
            </div>
            
            <h2 className="text-xl font-bold mb-6 text-brand-cyan flex items-center gap-2 relative z-10">
              <FiGrid /> Especificaciones: {formData.category}
            </h2>

            <div className="grid grid-cols-2 gap-6 relative z-10">
              
              {/* ================= COMPONENTES ================= */}
              
              {/* --- CPU --- */}
              {formData.category === 'CPU' && (
                <>
                  <div className="col-span-2 flex items-center gap-2 text-blue-800 font-bold border-b border-blue-200 pb-2"><FiCpu/> Datos de Procesador</div>
                  <div>
                    <label className="label-admin">Marca del procesador</label>
                    <select name="cpuBrand" value={formData.cpuBrand} onChange={handleChange} className="input-admin">
                      {CPU_BRANDS.map(brand => <option key={brand} value={brand}>{brand}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label-admin">Socket</label>
                    <select name="socket" value={formData.socket} onChange={handleChange} className="input-admin">
                      {(CPU_SOCKETS_BY_BRAND[formData.cpuBrand] || []).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label-admin">TDP base (Watts)</label>
                    <input name="baseTdpWatts" type="number" onChange={handleChange} className="input-admin" placeholder="Ej: 65" />
                    <span className="text-xs text-gray-500">Dato informativo del consumo base del procesador.</span>
                  </div>
                  <div>
                    <label className="label-admin">TDP maximo (Watts)</label>
                    <input name="tdp" type="number" onChange={handleChange} className="input-admin" placeholder="Ej: 105" required />
                    <span className="text-xs text-gray-500">Usado para validar fuente de poder y refrigeracion.</span>
                  </div>
                  <div>
                    <label className="label-admin">Nucleos</label>
                    <input name="cores" type="number" onChange={handleChange} className="input-admin" placeholder="Ej: 8" />
                  </div>
                  <div>
                    <label className="label-admin">Threads</label>
                    <input name="threads" type="number" onChange={handleChange} className="input-admin" placeholder="Ej: 16" />
                  </div>
                  <div>
                    <label className="label-admin">Frecuencia (GHz)</label>
                    <input name="frequency" onChange={handleChange} className="input-admin" placeholder="Ej: 4.2" />
                  </div>
                  <div>
                    <label className="label-admin">Graficos Integrados</label>
                    <select name="integratedGraphics" onChange={handleChange} className="input-admin">
                      <option value="false">No</option>
                      <option value="true">Si</option>
                    </select>
                  </div>
                  <div>
                    <label className="label-admin">Incluye Cooler?</label>
                    <select name="includesCooler" onChange={handleChange} className="input-admin">
                      <option value="false">No (Requiere comprar aparte)</option>
                      <option value="true">Si (De stock)</option>
                    </select>
                  </div>
                </>
              )}

              {/* --- MOTHERBOARD --- */}
              {formData.category === 'MOTHERBOARD' && (
                <>
                  <div className="col-span-2 flex items-center gap-2 text-blue-800 font-bold border-b border-blue-200 pb-2"><FiGrid/> Datos de Placa</div>
                  <div>
                    <label className="label-admin">Marca</label>
                    <select name="brand" value={formData.brand} onChange={handleChange} className="input-admin" required>
                      <option value="">Selecciona marca</option>
                      {MOTHERBOARD_BRANDS.map(brand => <option key={brand} value={brand}>{brand}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label-admin">Socket</label>
                    <select name="socket" onChange={handleChange} className="input-admin">
                      {SOCKETS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label-admin">Formato</label>
                    <select name="formFactor" onChange={handleChange} className="input-admin">
                      {FORM_FACTORS.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label-admin">Tipo de RAM</label>
                    <select name="memoryType" onChange={handleChange} className="input-admin">
                      {RAM_TYPES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label-admin">Slots de RAM</label>
                    <select name="memorySlots" onChange={handleChange} className="input-admin">
                      <option value="2">2 Slots</option>
                      <option value="4">4 Slots</option>
                      <option value="8">8 Slots</option>
                    </select>
                  </div>
                  <div>
                    <label className="label-admin">Slots M.2</label>
                    <select name="m2Slots" onChange={handleChange} className="input-admin">
                      <option value="1">1 Slot</option>
                      <option value="2">2 Slots</option>
                      <option value="3">3 Slots</option>
                      <option value="4">4 Slots</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="label-admin">Tamanos M.2 soportados</label>
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
                      {M2_FORM_FACTORS.map(size => (
                        <label key={size} className="flex items-center gap-2 rounded-lg border bg-white p-3 text-sm font-semibold">
                          <input
                            type="checkbox"
                            checked={formData.supportedM2FormFactors.includes(size)}
                            onChange={() => handleMultiSelectChange('supportedM2FormFactors', size)}
                          />
                          {size}
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* --- RAM --- */}
              {formData.category === 'RAM' && (
                <>
                  <div className="col-span-2 flex items-center gap-2 text-blue-800 font-bold border-b border-blue-200 pb-2"><FiZap/> Datos de Memoria</div>
                  <div>
                    <label className="label-admin">Tipo</label>
                    <select name="memoryType" onChange={handleChange} className="input-admin">
                      {RAM_TYPES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label-admin">Cantidad por modulo (GB)</label>
                    <select name="capacity" value={formData.capacity} onChange={handleChange} className="input-admin">
                      {RAM_CAPACITIES.map(c => <option key={c} value={c}>{c} GB</option>)}
                    </select>
                    <span className="text-xs text-gray-500">Capacidad individual de cada modulo RAM.</span>
                  </div>
                  <div>
                    <label className="label-admin">Kit (Modulos)</label>
                    <select name="modules" onChange={handleChange} className="input-admin">
                      <option value="1">1 Modulo (Single)</option>
                      <option value="2">2 Modulos (Dual Kit)</option>
                      <option value="4">4 Modulos (Quad Kit)</option>
                    </select>
                  </div>
                  <div>
                    <label className="label-admin">Velocidad (MHz)</label>
                    <input name="speed" type="number" onChange={handleChange} className="input-admin" placeholder="Ej: 6000" />
                  </div>
                  <div>
                    <label className="label-admin">Iluminacion RGB</label>
                    <select name="hasRGB" onChange={handleChange} className="input-admin">
                      <option value="false">No</option>
                      <option value="true">Si</option>
                    </select>
                  </div>
                </>
              )}

              {/* --- GPU --- */}
              {formData.category === 'GPU' && (
                <>
                  <div className="col-span-2 flex items-center gap-2 text-blue-800 font-bold border-b border-blue-200 pb-2"><FiMonitor/> Datos de Video</div>
                  <div>
                    <label className="label-admin">Marca ensambladora</label>
                    <select name="brand" value={formData.brand} onChange={handleChange} className="input-admin" required>
                      <option value="">Selecciona marca</option>
                      {GPU_BRANDS.map(brand => <option key={brand} value={brand}>{brand}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label-admin">Chipset</label>
                    <select name="chipset" value={formData.chipset} onChange={handleChange} className="input-admin">
                      {GPU_CHIPSETS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label-admin">VRAM (GB)</label>
                    <select name="vram" value={formData.vram} onChange={handleChange} className="input-admin" required>
                      {GPU_VRAM_OPTIONS.map(vram => <option key={vram} value={vram}>{vram} GB</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label-admin">Largo (mm)</label>
                    <input name="length" type="number" onChange={handleChange} className="input-admin" placeholder="Ej: 320" required />
                    <span className="text-xs text-red-500">Vital para validar con Case.</span>
                  </div>
                  <div>
                    <label className="label-admin">TGP / Consumo real (Watts)</label>
                    <input name="gpuPowerWatts" type="number" value={formData.gpuPowerWatts} onChange={handleChange} className="input-admin" placeholder="Ej: 280" required />
                    <span className="text-xs text-red-500">Usado por el armador para estimar el consumo del sistema.</span>
                  </div>
                  <div>
                    <label className="label-admin">PSU recomendada (Watts)</label>
                    <input name="recommendedPsuWatts" type="number" value={formData.recommendedPsuWatts} onChange={handleChange} className="input-admin" placeholder="Ej: 650" />
                    <span className="text-xs text-gray-500">Referencia del fabricante para la fuente minima sugerida.</span>
                  </div>
                  <div>
                    <label className="label-admin">Ventiladores</label>
                    <input name="fans" type="number" value={formData.fans} onChange={handleChange} className="input-admin" placeholder="Ej: 2 o 3" />
                  </div>
                </>
              )}

              {/* --- FUENTE (PSU) --- */}
              {formData.category === 'PSU' && (
                <>
                  <div className="col-span-2 flex items-center gap-2 text-blue-800 font-bold border-b border-blue-200 pb-2"><FiZap/> Datos de Fuente</div>
                  <div>
                    <label className="label-admin">Marca</label>
                    <select name="brand" value={formData.brand} onChange={handleChange} className="input-admin" required>
                      <option value="">Seleccionar marca</option>
                      {PSU_BRANDS.map(brand => <option key={brand} value={brand}>{brand}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label-admin">Potencia (Watts)</label>
                    <select name="wattage" value={formData.wattage} onChange={handleChange} className="input-admin" required>
                      <option value="">Seleccionar potencia</option>
                      {PSU_WATT_OPTIONS.map(watts => <option key={watts} value={watts}>{watts} W</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label-admin">Certificacion</label>
                    <select name="certification" onChange={handleChange} className="input-admin">
                      {PSU_CERTS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label-admin">Modularidad</label>
                    <select name="modular" onChange={handleChange} className="input-admin">
                      <option value="No Modular">No Modular</option>
                      <option value="Semi Modular">Semi Modular</option>
                      <option value="Full Modular">Full Modular</option>
                    </select>
                  </div>
                  <div>
                    <label className="label-admin">Formato</label>
                    <select name="formFactor" onChange={handleChange} className="input-admin">
                      <option value="ATX">ATX (Estandar)</option>
                      <option value="SFX">SFX (Pequena)</option>
                    </select>
                  </div>
                </>
              )}

              {/* --- GABINETE (CASE) --- */}
              {formData.category === 'CASE' && (
                <>
                  <div className="col-span-2 flex items-center gap-2 text-blue-800 font-bold border-b border-blue-200 pb-2"><FiBox/> Datos de Gabinete</div>
                  <div>
                    <label className="label-admin">Marca</label>
                    <select name="brand" value={formData.brand} onChange={handleChange} className="input-admin" required>
                      <option value="">Seleccionar marca</option>
                      {CASE_BRANDS.map(brand => <option key={brand} value={brand}>{brand}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label-admin">Soporte Placa</label>
                    <select name="formFactor" onChange={handleChange} className="input-admin">
                      {FORM_FACTORS.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label-admin">Max Largo GPU (mm)</label>
                    <input name="maxGpuLength" type="number" onChange={handleChange} className="input-admin" placeholder="Ej: 340" required />
                  </div>
                  <div>
                    <label className="label-admin">Incluye Fuente?</label>
                    <select name="includesPsu" onChange={handleChange} className="input-admin">
                      <option value="false">No</option>
                      <option value="true">Si (Generica)</option>
                    </select>
                  </div>
                  <div>
                    <label className="label-admin">Soporte Radiador Liquido</label>
                    <select name="radiatorSupportMm" value={formData.radiatorSupportMm} onChange={handleChange} className="input-admin">
                      {CASE_RADIATOR_SUPPORT_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label-admin">Ventiladores Incluidos</label>
                    <input name="includedFans" type="number" onChange={handleChange} className="input-admin" placeholder="Ej: 3" />
                  </div>
                </>
              )}

              {/* --- COOLER --- */}
              {formData.category === 'COOLER' && (
                <>
                  <div className="col-span-2 flex items-center gap-2 text-blue-800 font-bold border-b border-blue-200 pb-2"><FiWind/> Datos de Refrigeracion</div>
                  <div>
                    <label className="label-admin">Marca</label>
                    <select name="brand" value={formData.brand} onChange={handleChange} className="input-admin" required>
                      <option value="">Seleccionar marca</option>
                      {COOLER_BRANDS.map(brand => <option key={brand} value={brand}>{brand}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="label-admin">Tipo de Refrigeracion</label>
                    <div className="flex gap-4 mt-2">
                      <label className="flex items-center gap-2 border p-3 rounded-lg cursor-pointer hover:bg-blue-50">
                        <input type="radio" name="type" value="Torre" checked={formData.type === 'Torre'} onChange={handleChange} />
                        Torre
                      </label>
                      <label className="flex items-center gap-2 border p-3 rounded-lg cursor-pointer hover:bg-blue-50">
                        <input type="radio" name="type" value="Liquida" checked={formData.type === 'Liquida'} onChange={handleChange} />
                        Liquida
                      </label>
                    </div>
                  </div>

                  <div className="col-span-2">
                    <label className="label-admin">Sockets compatibles</label>
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
                      {COOLER_SOCKET_OPTIONS.map(socket => (
                        <label key={socket} className="flex items-center gap-2 rounded-lg border bg-white p-3 text-sm font-semibold">
                          <input
                            type="checkbox"
                            checked={formData.compatibleSockets.includes(socket)}
                            onChange={() => handleMultiSelectChange('compatibleSockets', socket)}
                          />
                          {socket}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="label-admin">TDP soportado (Watts)</label>
                    <input name="tdpCapacity" type="number" onChange={handleChange} className="input-admin" placeholder="Ej: 180" required />
                    <span className="text-xs text-gray-500">Debe ser igual o mayor al TDP del CPU.</span>
                  </div>

                  {formData.type === 'Torre' && (
                    <div>
                      <label className="label-admin">Altura del cooler (mm)</label>
                      <input name="coolerHeight" type="number" onChange={handleChange} className="input-admin" placeholder="Ej: 155" required />
                    </div>
                  )}

                  {formData.type === 'Liquida' && (
                    <div>
                      <label className="label-admin">Tamano Radiador</label>
                      <select name="radiatorSize" value={formData.radiatorSize} onChange={handleChange} className="input-admin" required>
                        {COOLER_RADIATOR_OPTIONS.map(size => <option key={size} value={size}>{size} mm</option>)}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="label-admin">Tiene Pantalla LCD?</label>
                    <select name="hasScreen" onChange={handleChange} className="input-admin">
                      <option value="false">No</option>
                      <option value="true">Si</option>
                    </select>
                  </div>
                  <div>
                    <label className="label-admin">RGB?</label>
                    <select name="hasRGB" onChange={handleChange} className="input-admin">
                      <option value="false">No</option>
                      <option value="true">Si</option>
                    </select>
                  </div>
                </>
              )}

              {/* --- STORAGE --- */}
              {formData.category === 'STORAGE' && (
                <>
                  <div className="col-span-2 flex items-center gap-2 text-blue-800 font-bold border-b border-blue-200 pb-2"><FiHardDrive/> Datos de Almacenamiento</div>
                  <div>
                    <label className="label-admin">Tipo</label>
                    <select name="type" onChange={handleChange} className="input-admin">
                      {STORAGE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  
                  {(formData.type === 'NVMe M.2' || formData.type === 'M.2 SATA') && (
                    <div>
                      <label className="label-admin">Generacion</label>
                      <select name="interface" onChange={handleChange} className="input-admin">
                        {NVME_GENS.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="label-admin">Capacidad (GB)</label>
                    <input name="capacity" type="number" onChange={handleChange} className="input-admin" placeholder="Ej: 1000" required />
                  </div>
                  <div>
                    <label className="label-admin">Velocidad Lectura (MB/s)</label>
                    <input name="readSpeed" type="number" onChange={handleChange} className="input-admin" placeholder="Ej: 7000" />
                  </div>
                  <div>
                    <label className="label-admin">Velocidad Escritura (MB/s)</label>
                    <input name="writeSpeed" type="number" onChange={handleChange} className="input-admin" placeholder="Ej: 5000" />
                  </div>
                  {(formData.type === 'NVMe M.2' || formData.type === 'M.2 SATA') && (
                    <div>
                      <label className="label-admin">Tamano fisico M.2</label>
                      <select name="m2FormFactor" value={formData.m2FormFactor} onChange={handleChange} className="input-admin">
                        {M2_FORM_FACTORS.map(size => <option key={size} value={size}>{size}</option>)}
                      </select>
                    </div>
                  )}
                </>
              )}
              
              {/* ================= ORDENADORES ================= */}

              {(formData.category === 'LAPTOP' || formData.category === 'PC_DESKTOP') && (
                <>
                  <div className="col-span-2 border-b pb-2 mb-2 font-bold text-gray-500">Hardware Principal</div>
                  {formData.category === 'LAPTOP' && (
                    <div>
                      <label className="label-admin">Marca</label>
                      <select name="brand" value={formData.brand} onChange={handleChange} className="input-admin" required>
                        <option value="">Seleccionar marca</option>
                        {LAPTOP_BRANDS.map(brand => <option key={brand} value={brand}>{brand}</option>)}
                      </select>
                    </div>
                  )}
                  <div><label className="label-admin">Procesador</label><input name="processor" onChange={handleChange} className="input-admin" placeholder="Ej: Intel Core i7-13700H" /></div>
                  {formData.category === 'LAPTOP' ? (
                    <>
                      <div>
                        <label className="label-admin">Memoria RAM</label>
                        <select name="ram" value={formData.ram} onChange={handleChange} className="input-admin">
                          {LAPTOP_RAM_OPTIONS.map(value => <option key={value} value={value}>{LAPTOP_RAM_LABELS[value]}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="label-admin">Almacenamiento</label>
                        <select name="storage" value={formData.storage} onChange={handleChange} className="input-admin">
                          {LAPTOP_STORAGE_OPTIONS.map(value => <option key={value} value={value}>{LAPTOP_STORAGE_LABELS[value]}</option>)}
                        </select>
                      </div>
                    </>
                  ) : (
                    <>
                      <div><label className="label-admin">Memoria RAM</label><input name="ram" onChange={handleChange} className="input-admin" placeholder="Ej: 16GB DDR5" /></div>
                      <div><label className="label-admin">Almacenamiento</label><input name="storage" onChange={handleChange} className="input-admin" placeholder="Ej: 1TB NVMe" /></div>
                    </>
                  )}
                  <div>
                    <label className="label-admin">Tiene grafica dedicada</label>
                    <select name="hasDedicatedGpu" onChange={handleChange} className="input-admin">
                      <option value="false">No (Graficos Integrados)</option>
                      <option value="true">Si</option>
                    </select>
                  </div>

                  {formData.hasDedicatedGpu === 'true' && (
                    <>
                      <div>
                        <label className="label-admin">Marca GPU</label>
                        <select name="gpuBrand" onChange={handleChange} className="input-admin">
                          <option value="">Seleccionar...</option>
                          <option value="NVIDIA">NVIDIA</option>
                          <option value="AMD">AMD</option>
                          <option value="Intel">Intel Arc</option>
                        </select>
                      </div>
                      <div>
                        <label className="label-admin">Modelo GPU</label>
                        <input 
                          name="gpuModel" 
                          onChange={handleChange} 
                          className="input-admin" 
                          placeholder="Ej: RTX 4060, RX 7600M" 
                        />
                      </div>
                    </>
                  )}

                  {formData.category === 'PC_DESKTOP' && (
                    <>
                      <div className="col-span-2 border-b pb-2 mb-2 font-bold text-gray-500 mt-4">Equipo pre-ensamblado</div>
                      <div>
                        <label className="label-admin">Cooler incluido</label>
                        <select name="coolerType" onChange={handleChange} className="input-admin">
                          {DESKTOP_COOLER_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="label-admin">Fuente de poder (Watts)</label>
                        <input name="psuWatts" type="number" min="0" onChange={handleChange} className="input-admin" placeholder="Ej: 650" />
                      </div>
                      <div className="col-span-2">
                        <label className="label-admin">Modelo del case</label>
                        <input name="caseModel" onChange={handleChange} className="input-admin" placeholder="Ej: MSI Gungnir 110M" />
                      </div>
                    </>
                  )}

                  {formData.category === 'LAPTOP' && (
                    <>
                      <div className="col-span-2 border-b pb-2 mb-2 font-bold text-gray-500 mt-4">Pantalla</div>
                      <div>
                        <label className="label-admin">Tamano Pantalla</label>
                        <select name="screenSize" value={formData.screenSize} onChange={handleChange} className="input-admin">
                          {LAPTOP_SCREEN_OPTIONS.map(value => <option key={value} value={value}>{value}&quot;</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="label-admin">Tasa Refresco (Hz)</label>
                        <select name="refreshRate" value={formData.refreshRate} onChange={handleChange} className="input-admin">
                          {LAPTOP_REFRESH_OPTIONS.map(value => <option key={value} value={value}>{value} Hz</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="label-admin">Incluye Windows de serie?</label>
                        <select name="includesWindows" onChange={handleChange} className="input-admin">
                          <option value="true">Si</option>
                          <option value="false">No</option>
                        </select>
                      </div>
                    </>
                  )}
                </>
              )}

              {formData.category === 'SOFTWARE' && (
                 <>
                   <div><label className="label-admin">Tipo de Licencia</label><select name="licenseType" onChange={handleChange} className="input-admin"><option>Permanente</option><option>Suscripcion 1 Ano</option><option>OEM</option></select></div>
                   <div><label className="label-admin">Plataforma</label><select name="platform" onChange={handleChange} className="input-admin"><option>Windows</option><option>Mac</option><option>Android</option></select></div>
                 </>
              )}

              {formData.category === 'LAPTOP_COOLING_BASE' && (
                <>
                  <div className="col-span-2 border-b pb-2 mb-2 font-bold text-gray-500">Accesorio para portatil</div>
                  <div>
                    <label className="label-admin">Marca</label>
                    <select name="brand" value={formData.brand} onChange={handleChange} className="input-admin" required>
                      <option value="">Seleccionar marca</option>
                      {LAPTOP_COOLING_BASE_BRANDS.map(brand => <option key={brand} value={brand}>{brand}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label-admin">Cantidad de ventiladores</label>
                    <select name="fanCount" value={formData.fanCount} onChange={handleChange} className="input-admin">
                      {LAPTOP_COOLING_BASE_FAN_COUNTS.map(count => <option key={count} value={count}>{count}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label-admin">Conectividad</label>
                    <select name="connectivity" value={formData.connectivity} onChange={handleChange} className="input-admin">
                      {LAPTOP_ACCESSORY_CONNECTIVITY.map(option => <option key={option} value={option}>{option}</option>)}
                    </select>
                  </div>
                </>
              )}

              {formData.category === 'BACKPACK' && (
                <>
                  <div className="col-span-2 border-b pb-2 mb-2 font-bold text-gray-500">Accesorio para portatil</div>
                  <div>
                    <label className="label-admin">Marca</label>
                    <select name="brand" value={formData.brand} onChange={handleChange} className="input-admin" required>
                      <option value="">Seleccionar marca</option>
                      {BACKPACK_BRANDS.map(brand => <option key={brand} value={brand}>{brand}</option>)}
                    </select>
                  </div>
                  <div><label className="label-admin">Color</label><input name="color" value={formData.color} onChange={handleChange} className="input-admin" placeholder="Ej: Negro" /></div>
                </>
              )}

              {/* ================= PERIFERICOS ================= */}

              {formData.category === 'MONITOR' && (
                 <>
                   <div>
                     <label className="label-admin">Marca</label>
                     <select name="brand" value={formData.brand} onChange={handleChange} className="input-admin" required>
                       <option value="">Seleccionar marca</option>
                       {MONITOR_BRANDS.map(brand => <option key={brand} value={brand}>{brand}</option>)}
                     </select>
                   </div>
                   <div><label className="label-admin">Tamaño (Pulgadas)</label><input name="screenSize" onChange={handleChange} className="input-admin" /></div>
                   <div>
                     <label className="label-admin">Resolución</label>
                     <select name="resolution" value={formData.resolution} onChange={handleChange} className="input-admin">
                       {MONITOR_RESOLUTION_OPTIONS.map(resolution => <option key={resolution} value={resolution}>{resolution}</option>)}
                     </select>
                   </div>
                   <div><label className="label-admin">Panel</label><select name="panelType" onChange={handleChange} className="input-admin">{PANEL_TYPES.map(p=><option key={p} value={p}>{p}</option>)}</select></div>
                   <div>
                     <label className="label-admin">Hz</label>
                     <select name="refreshRate" value={formData.refreshRate} onChange={handleChange} className="input-admin">
                       {MONITOR_REFRESH_OPTIONS.map(hz => <option key={hz} value={hz}>{hz} Hz</option>)}
                     </select>
                   </div>
                   <div>
                     <label className="label-admin">Latencia / Tiempo de respuesta (ms)</label>
                     <input name="responseTimeMs" type="number" min="0.1" step="0.1" onChange={handleChange} className="input-admin" placeholder="Ej: 1" />
                   </div>
                   <div>
                     <label className="label-admin">¿Tiene parlantes integrados?</label>
                     <select name="hasSpeakers" onChange={handleChange} className="input-admin">
                       <option value="false">No</option>
                       <option value="true">Si</option>
                     </select>
                   </div>
                   <div className="col-span-2">
                     <label className="label-admin">Puertos disponibles</label>
                     <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                       {MONITOR_PORTS.map(port => (
                         <label key={port} className="flex items-center gap-2 rounded-lg border bg-white p-3 text-sm font-semibold">
                           <input
                             type="checkbox"
                             checked={formData.ports.includes(port)}
                             onChange={() => handleMultiSelectChange('ports', port)}
                           />
                           {port}
                         </label>
                       ))}
                     </div>
                   </div>
                 </>
              )}
              {formData.category === 'KEYBOARD' && (
                <>
                  <div>
                    <label className="label-admin">Marca</label>
                    <select name="brand" value={formData.brand} onChange={handleChange} className="input-admin" required>
                      <option value="">Seleccionar marca</option>
                      {KEYBOARD_BRANDS.map(brand => <option key={brand} value={brand}>{brand}</option>)}
                    </select>
                  </div>
                  <div><label className="label-admin">Tipo de teclado</label><select name="keyboardType" value={formData.keyboardType} onChange={handleChange} className="input-admin">{KEYBOARD_TYPES.map(type => <option key={type} value={type}>{type}</option>)}</select></div>
                  <div className="col-span-2">
                    <label className="label-admin">Conectividad</label>
                    <div className="grid grid-cols-3 gap-2">
                      {PERIPHERAL_CONNECTIONS.map(connection => (
                        <label key={connection} className="flex items-center gap-2 rounded-lg border bg-white p-3 text-sm font-semibold">
                          <input type="checkbox" checked={formData.connections.includes(connection)} onChange={() => handleMultiSelectChange('connections', connection)} />
                          {connection}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div><label className="label-admin">Idioma / Layout</label><select name="layoutLanguage" value={formData.layoutLanguage} onChange={handleChange} className="input-admin">{LAYOUT_LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}</select></div>
                  <div><label className="label-admin">Formato de teclado</label><select name="keyboardFormFactor" value={formData.keyboardFormFactor} onChange={handleChange} className="input-admin">{KEYBOARD_FORM_FACTORS.map(format => <option key={format} value={format}>{format}</option>)}</select></div>
                  {formData.keyboardType === 'Semi-mecanico' && <div><label className="label-admin">RGB</label><select name="hasLighting" value={formData.hasLighting} onChange={handleChange} className="input-admin"><option value="false">No</option><option value="true">Si</option></select></div>}
                  {(formData.keyboardType === 'Mecanico' || formData.keyboardType === 'Magnetico') && <div><label className="label-admin">Tipo de switch</label><input name="switchType" value={formData.switchType} onChange={handleChange} className="input-admin" placeholder="Ej: Red, Blue, Magnetic HE" /></div>}
                </>
              )}
              {formData.category === 'MOUSE' && (
                <>
                  <div>
                    <label className="label-admin">Marca</label>
                    <select name="brand" value={formData.brand} onChange={handleChange} className="input-admin" required>
                      <option value="">Seleccionar marca</option>
                      {MOUSE_BRANDS.map(brand => <option key={brand} value={brand}>{brand}</option>)}
                    </select>
                  </div>
                  <div><label className="label-admin">Tipo de mouse</label><select name="mouseType" onChange={handleChange} className="input-admin">{MOUSE_TYPES.map(type => <option key={type} value={type}>{type}</option>)}</select></div>
                  <div className="col-span-2">
                    <label className="label-admin">Tipo de conexion</label>
                    <div className="grid grid-cols-3 gap-2">
                      {PERIPHERAL_CONNECTIONS.map(connection => (
                        <label key={connection} className="flex items-center gap-2 rounded-lg border bg-white p-3 text-sm font-semibold">
                          <input type="checkbox" checked={formData.connections.includes(connection)} onChange={() => handleMultiSelectChange('connections', connection)} />
                          {connection}
                        </label>
                      ))}
                    </div>
                  </div>
                  {formData.mouseType === 'Gamer' && (
                    <>
                      <div><label className="label-admin">Cantidad de botones</label><input name="buttonCount" type="number" onChange={handleChange} className="input-admin" placeholder="Ej: 6" /></div>
                      <div><label className="label-admin">DPI maximo</label><input name="dpi" type="number" onChange={handleChange} className="input-admin" placeholder="Ej: 26000" /></div>
                      <div><label className="label-admin">Polling Rate</label><select name="pollingRateHz" onChange={handleChange} className="input-admin">{POLLING_RATES.map(rate => <option key={rate} value={rate}>{rate} Hz</option>)}</select></div>
                    </>
                  )}
                  <div><label className="label-admin">Usa bateria o pila?</label><select name="powerType" onChange={handleChange} className="input-admin">{MOUSE_POWER_TYPES.map(type => <option key={type} value={type}>{type}</option>)}</select></div>
                  <div><label className="label-admin">Peso (g)</label><input name="weightGrams" type="number" onChange={handleChange} className="input-admin" placeholder="Ej: 63" /></div>
                </>
              )}

              {formData.category === 'MOUSEPAD' && (
                <>
                  <div>
                    <label className="label-admin">Marca</label>
                    <select name="brand" value={formData.brand} onChange={handleChange} className="input-admin" required>
                      <option value="">Seleccionar marca</option>
                      {MOUSEPAD_BRANDS.map(brand => <option key={brand} value={brand}>{brand}</option>)}
                    </select>
                  </div>
                  <div><label className="label-admin">Ancho (mm)</label><input name="widthCm" type="number" onChange={handleChange} className="input-admin" placeholder="Ej: 900" /></div>
                  <div><label className="label-admin">Largo (mm)</label><input name="lengthCm" type="number" onChange={handleChange} className="input-admin" placeholder="Ej: 400" /></div>
                  <div><label className="label-admin">Tiene LEDs</label><select name="hasLed" onChange={handleChange} className="input-admin"><option value="false">No</option><option value="true">Si</option></select></div>
                </>
              )}

              {formData.category === 'WEBCAM' && (
                <>
                  <div>
                    <label className="label-admin">Marca</label>
                    <select name="brand" value={formData.brand} onChange={handleChange} className="input-admin" required>
                      <option value="">Seleccionar marca</option>
                      {WEBCAM_BRANDS.map(brand => <option key={brand} value={brand}>{brand}</option>)}
                    </select>
                  </div>
                  <div><label className="label-admin">Resolucion</label><select name="resolution" value={formData.resolution} onChange={handleChange} className="input-admin">{VIDEO_RESOLUTION_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}</select></div>
                  <div><label className="label-admin">FPS</label><select name="fps" value={formData.fps} onChange={handleChange} className="input-admin">{WEBCAM_FPS_OPTIONS.map(option => <option key={option} value={option}>{option} FPS</option>)}</select></div>
                </>
              )}

              {formData.category === 'CAPTURE_CARD' && (
                <>
                  <div>
                    <label className="label-admin">Marca</label>
                    <select name="brand" value={formData.brand} onChange={handleChange} className="input-admin" required>
                      <option value="">Seleccionar marca</option>
                      {CAPTURE_CARD_BRANDS.map(brand => <option key={brand} value={brand}>{brand}</option>)}
                    </select>
                  </div>
                  <div><label className="label-admin">Resolucion</label><select name="resolution" value={formData.resolution} onChange={handleChange} className="input-admin">{VIDEO_RESOLUTION_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}</select></div>
                  <div><label className="label-admin">FPS</label><select name="fps" value={formData.fps} onChange={handleChange} className="input-admin">{CAPTURE_CARD_FPS_OPTIONS.map(option => <option key={option} value={option}>{option} FPS</option>)}</select></div>
                </>
              )}

              {formData.category === 'CABLE_HUB' && (
                <>
                  <div>
                    <label className="label-admin">Marca</label>
                    <select name="brand" value={formData.brand} onChange={handleChange} className="input-admin" required>
                      <option value="">Seleccionar marca</option>
                      {CABLE_HUB_BRANDS.map(brand => <option key={brand} value={brand}>{brand}</option>)}
                    </select>
                  </div>
                  <div><label className="label-admin">Tipo</label><select name="cableHubType" value={formData.cableHubType} onChange={handleChange} className="input-admin">{CABLE_HUB_TYPES.map(option => <option key={option} value={option}>{option}</option>)}</select></div>
                  {formData.cableHubType === 'Cable' && (
                    <>
                      <div><label className="label-admin">Tipo de cable</label><select name="cableType" value={formData.cableType} onChange={handleChange} className="input-admin">{CABLE_TYPES.map(option => <option key={option} value={option}>{option}</option>)}</select></div>
                      <div><label className="label-admin">Largo en metros</label><select name="cableLengthMeters" value={formData.cableLengthMeters} onChange={handleChange} className="input-admin">{CABLE_LENGTHS.map(option => <option key={option} value={option}>{option} m</option>)}</select></div>
                    </>
                  )}
                  {formData.cableHubType === 'Hub' && (
                    <>
                      <div><label className="label-admin">Tipo de entrada</label><select name="hubInputType" value={formData.hubInputType} onChange={handleChange} className="input-admin">{HUB_INPUT_TYPES.map(option => <option key={option} value={option}>{option}</option>)}</select></div>
                      <div><label className="label-admin">Salida HDMI</label><select name="hasHdmiOutput" value={formData.hasHdmiOutput} onChange={handleChange} className="input-admin"><option value="false">No</option><option value="true">Si</option></select></div>
                      <div><label className="label-admin">Salida RJ45</label><select name="hasRj45Output" value={formData.hasRj45Output} onChange={handleChange} className="input-admin"><option value="false">No</option><option value="true">Si</option></select></div>
                    </>
                  )}
                </>
              )}

              {formData.category === 'CHAIR' && (
                <>
                  <div><label className="label-admin">Marca</label><input name="brand" onChange={handleChange} className="input-admin" /></div>
                  <div><label className="label-admin">Color</label><input name="color" onChange={handleChange} className="input-admin" placeholder="Ej: Negro/Rojo" /></div>
                  <div><label className="label-admin">Material</label><select name="material" onChange={handleChange} className="input-admin">{CHAIR_MATERIALS.map(material => <option key={material} value={material}>{material}</option>)}</select></div>
                  <div><label className="label-admin">Peso maximo soportado (kg)</label><input name="maxWeightKg" type="number" onChange={handleChange} className="input-admin" placeholder="Ej: 120" /></div>
                </>
              )}

              {formData.category === 'GAMING_DESK' && (
                <>
                  <div><label className="label-admin">Marca</label><input name="brand" onChange={handleChange} className="input-admin" /></div>
                  <div><label className="label-admin">Color</label><input name="color" onChange={handleChange} className="input-admin" /></div>
                  <div><label className="label-admin">Superficie</label><input name="surface" onChange={handleChange} className="input-admin" placeholder="Ej: Carbono, madera, melamina" /></div>
                  <div><label className="label-admin">Peso (kg)</label><input name="weightKg" type="number" onChange={handleChange} className="input-admin" placeholder="Ej: 25" /></div>
                </>
              )}

              {/* ================= AUDIO ================= */}

              {formData.category === 'HEADSET' && (
                <>
                  <div className="col-span-2 flex items-center gap-2 text-blue-800 font-bold border-b border-blue-200 pb-2"><FiHeadphones/> Datos de Audifonos</div>
                  <div>
                    <label className="label-admin">Marca</label>
                    <select name="brand" value={formData.brand} onChange={handleChange} className="input-admin" required>
                      <option value="">Seleccionar marca</option>
                      {HEADSET_BRANDS.map(brand => <option key={brand} value={brand}>{brand}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label-admin">Conexion</label>
                    <select name="connection" value={formData.connection} onChange={handleChange} className="input-admin">
                      {HEADSET_CONNECTION_TYPES.map(option => <option key={option} value={option}>{option}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="label-admin">Conectividad soportada</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(formData.connection === 'Cableado' ? HEADSET_WIRED_CONNECTIONS : HEADSET_WIRELESS_CONNECTIONS).map(option => (
                        <label key={option} className="flex items-center gap-2 rounded-lg border bg-white p-3 text-sm font-semibold">
                          <input type="checkbox" checked={formData.supportedConnections.includes(option)} onChange={() => handleMultiSelectChange('supportedConnections', option)} />
                          {option}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="label-admin">Drivers (mm)</label>
                    <input name="driverSize" type="number" onChange={handleChange} className="input-admin" placeholder="Ej: 50" />
                  </div>
                  <div>
                    <label className="label-admin">Impedancia (Ohms)</label>
                    <input name="impedance" type="number" onChange={handleChange} className="input-admin" placeholder="Ej: 32" />
                  </div>
                  <div>
                    <label className="label-admin">Microfono</label>
                    <select name="micType" onChange={handleChange} className="input-admin">
                      <option value="Unidireccional">Unidireccional</option>
                      <option value="Bidireccional">Bidireccional</option>
                      <option value="Omnidireccional">Omnidireccional</option>
                      <option value="Sin microfono">Sin microfono</option>
                    </select>
                  </div>
                  <div>
                    <label className="label-admin">Cancelacion de Ruido</label>
                    <select name="noiseCancel" onChange={handleChange} className="input-admin">
                      <option value="false">No</option>
                      <option value="true">Si (ANC)</option>
                    </select>
                  </div>
                  <div>
                    <label className="label-admin">RGB?</label>
                    <select name="hasRGB" onChange={handleChange} className="input-admin">
                      <option value="false">No</option>
                      <option value="true">Si</option>
                    </select>
                  </div>
                </>
              )}

              {formData.category === 'MICROPHONE' && (
                <>
                  <div className="col-span-2 flex items-center gap-2 text-blue-800 font-bold border-b border-blue-200 pb-2"><FiHeadphones/> Datos de Microfono</div>
                  <div>
                    <label className="label-admin">Marca</label>
                    <select name="brand" value={formData.brand} onChange={handleChange} className="input-admin" required>
                      <option value="">Seleccionar marca</option>
                      {MICROPHONE_BRANDS.map(brand => <option key={brand} value={brand}>{brand}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label-admin">Conexion</label>
                    <select name="connection" onChange={handleChange} className="input-admin">
                      <option value="USB">USB</option>
                      <option value="XLR">XLR (Profesional)</option>
                      <option value="3.5mm Jack">3.5mm Jack</option>
                    </select>
                  </div>
                  <div>
                    <label className="label-admin">Patron Polar</label>
                    <select name="micType" onChange={handleChange} className="input-admin">
                      <option value="Cardioide">Cardioide</option>
                      <option value="Omnidireccional">Omnidireccional</option>
                      <option value="Bidireccional">Bidireccional</option>
                      <option value="Estereo">Estereo</option>
                    </select>
                  </div>
                  <div>
                    <label className="label-admin">RGB?</label>
                    <select name="hasRGB" onChange={handleChange} className="input-admin">
                      <option value="false">No</option>
                      <option value="true">Si</option>
                    </select>
                  </div>
                </>
              )}

              {formData.category === 'SPEAKER' && (
                <>
                  <div className="col-span-2 flex items-center gap-2 text-blue-800 font-bold border-b border-blue-200 pb-2"><FiHeadphones/> Datos de Parlantes</div>
                  <div>
                    <label className="label-admin">Marca</label>
                    <select name="brand" value={formData.brand} onChange={handleChange} className="input-admin" required>
                      <option value="">Seleccionar marca</option>
                      {SPEAKER_BRANDS.map(brand => <option key={brand} value={brand}>{brand}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label-admin">Conexion</label>
                    <select name="connection" onChange={handleChange} className="input-admin">
                      <option value="USB">USB</option>
                      <option value="3.5mm Jack">3.5mm Jack</option>
                      <option value="Bluetooth">Bluetooth</option>
                    </select>
                  </div>
                  <div>
                    <label className="label-admin">Potencia (Watts)</label>
                    <input name="wattage" type="number" onChange={handleChange} className="input-admin" placeholder="Ej: 20" />
                  </div>
                  <div>
                    <label className="label-admin">RGB?</label>
                    <select name="hasRGB" onChange={handleChange} className="input-admin">
                      <option value="false">No</option>
                      <option value="true">Si</option>
                    </select>
                  </div>
                </>
              )}

            </div>
          </div>
        </div>

        {/* === COLUMNA DERECHA: SELECCION DE CATEGORIA (Ocupa 4 columnas) === */}
        <div className="lg:col-span-4 space-y-6">
          
          <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200 sticky top-4">
             <h3 className="text-lg font-black text-gray-800 mb-6">Clasificacion</h3>
             
             {/* 1. SELECCIONAR DEPARTAMENTO */}
             <div className="mb-6">
               <label className="label-admin mb-2">1. Categoria</label>
               <div className="grid grid-cols-2 gap-2">
                 {Object.keys(DEPARTMENTS).map((deptKey) => (
                   <button
                     key={deptKey}
                     type="button"
                     onClick={() => setSelectedDept(deptKey)}
                     className={`p-3 rounded-lg text-xs font-bold transition-all border
                       ${selectedDept === deptKey 
                         ? 'bg-black text-white border-black shadow-lg transform scale-105' 
                         : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}
                     `}
                   >
                     {deptKey}
                   </button>
                 ))}
               </div>
             </div>

             {/* 2. SELECCIONAR TIPO ESPECIFICO */}
             <div className="mb-8">
               <label className="label-admin mb-2">2. Tipo de Producto</label>
               <select
                 name="category"
                 value={formData.category}
                 onChange={handleChange}
                 disabled={!selectedDept}
                 className="w-full p-4 text-lg border-2 border-gray-300 rounded-xl font-bold outline-none cursor-pointer bg-gray-50 focus:bg-white focus:border-black transition text-gray-900 disabled:cursor-not-allowed disabled:text-gray-400"
               >
                 {!selectedDept ? (
                   <option value="">Selecciona una categoria</option>
                 ) : (
                   // @ts-ignore
                   DEPARTMENTS[selectedDept].map((item: any) => (
                     <option key={item.value} value={item.value}>
                       {item.label}
                     </option>
                   ))
                 )}
               </select>
             </div>

             {/* BOTON DE GUARDADO */}
             <button 
               type="submit" 
               disabled={loading}
               className={`w-full bg-brand-cyan text-gray-900 py-4 rounded-xl font-black text-lg hover:bg-cyan-400 transition shadow-xl shadow-brand-cyan/30 flex items-center justify-center gap-2 ${loading ? 'opacity-50 cursor-wait' : ''}`}
             >
               <FiSave size={24} />
               {loading ? 'Subiendo...' : 'Publicar Producto'}
             </button>
          </div>

          {/* Tips / Ayuda */}
          <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200 text-sm text-yellow-800">
             <strong>Tip: Tip:</strong> Asegurate de elegir la categoria correcta para que el producto aparezca en los filtros de busqueda de la tienda.
          </div>

        </div>

      </form>
      
      <style jsx>{`
        .label-admin { display: block; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: #6B7280; margin-bottom: 0.5rem; letter-spacing: 0.05em; }
        .input-admin { width: 100%; border: 1px solid #E5E7EB; padding: 0.75rem; border-radius: 0.75rem; outline: none; transition: all; background: #fff; font-weight: 500; color: #1F2937; }
        .input-admin:focus { border-color: #00D1B2; ring: 2px; ring-color: #00D1B2; }
      `}</style>
    </div>
  );
}
