'use client';

import { useState, useEffect } from 'react';
import type { ChangeEvent } from 'react';
import {
  FiSave,
  FiCpu,
  FiGrid,
  FiHardDrive,
  FiMonitor,
  FiWind,
  FiBox,
  FiZap,
  FiMousePointer,
  FiHeadphones,
  FiLayers,
} from 'react-icons/fi';
import { MdComputer, MdLaptop, MdSecurity, MdKeyboard } from 'react-icons/md';
import { api, getApiErrorMessage } from '@/lib/api';
import ImageUploader from '@/components/ImageUploader';
import { buildProductPayload } from '@/lib/products/buildProductPayload';
import { validateProductForm } from '@/lib/products/validateProductForm';
import { notify } from '@/lib/notify';
import { CREATE_PRODUCT_FORM_CONFIG } from '@/features/products/form/productFormConfig';

// --- CONSTANTES Y LISTAS ---
const { DEPARTMENTS, CPU_BRANDS, MOTHERBOARD_BRANDS, CPU_SOCKETS_BY_BRAND, SOCKETS, M2_FORM_FACTORS, COOLER_SOCKET_OPTIONS, COOLER_BRANDS, COOLER_RADIATOR_OPTIONS, FORM_FACTORS, CASE_BRANDS, CASE_RADIATOR_SUPPORT_OPTIONS, RAM_TYPES, RAM_BRANDS, RAM_CAPACITIES, PSU_BRANDS, PSU_WATT_OPTIONS, PSU_CERTS, GPU_BRANDS, GPU_CHIPSETS, GPU_VRAM_OPTIONS, GPU_VRAM_TYPES, GPU_FAN_OPTIONS, STORAGE_TYPES, NVME_GENS, PANEL_TYPES, LAPTOP_BRANDS, LAPTOP_COOLING_BASE_BRANDS, LAPTOP_COOLING_BASE_FAN_COUNTS, LAPTOP_ACCESSORY_CONNECTIVITY, BACKPACK_BRANDS, HEADSET_BRANDS, MICROPHONE_BRANDS, SPEAKER_BRANDS, HEADSET_CONNECTION_TYPES, HEADSET_WIRED_CONNECTIONS, HEADSET_WIRELESS_CONNECTIONS, AUDIO_CONNECTIVITY_OPTIONS, AUDIO_CONNECTION_TYPE_OPTIONS, HEADSET_AUDIO_TYPES, HEADSET_SURROUND_OPTIONS, MICROPHONE_TYPES, POLAR_PATTERN_OPTIONS, SPEAKER_TYPES, SPEAKER_CHANNELS, LAPTOP_RAM_OPTIONS, LAPTOP_STORAGE_OPTIONS, LAPTOP_SCREEN_OPTIONS, LAPTOP_REFRESH_OPTIONS, LAPTOP_SUPPORTED_SIZE_OPTIONS, ACCESSORY_COLOR_OPTIONS, MONITOR_BRANDS, MONITOR_RESOLUTION_OPTIONS, MONITOR_REFRESH_OPTIONS, LAPTOP_RAM_LABELS, LAPTOP_STORAGE_LABELS, DESKTOP_COOLER_TYPES, MONITOR_PORTS, PERIPHERAL_CONNECTIONS, MOUSE_CONNECTIONS, KEYBOARD_BRANDS, KEYBOARD_TYPES, KEYBOARD_FORM_FACTORS, LAYOUT_LANGUAGES, MOUSE_TYPES, MOUSE_BRANDS, MOUSEPAD_BRANDS, WEBCAM_BRANDS, CAPTURE_CARD_BRANDS, CABLE_HUB_BRANDS, VIDEO_RESOLUTION_OPTIONS, WEBCAM_FPS_OPTIONS, CAPTURE_CARD_FPS_OPTIONS, CABLE_HUB_TYPES, CABLE_TYPES, CABLE_LENGTHS, HUB_INPUT_TYPES, POLLING_RATES, CHAIR_MATERIALS, MOUSE_POWER_TYPES } = CREATE_PRODUCT_FORM_CONFIG;

function getKeyboardSwitchPlaceholder(keyboardType: string) {
  switch (keyboardType) {
    case 'Mecanico':
      return 'Ej: Red, Blue, Brown, Silver';
    case 'Magnetico':
      return 'Ej: Magnetic HE, Hall Effect, Magnetic Jade';
    case 'Membrana':
      return 'Ej: Membrana, Rubber Dome, No aplica';
    case 'Optico':
      return 'Ej: Optical Red, Optical Blue';
    default:
      return 'Ej: Red, Blue, Magnetic HE';
  }
}

const INITIAL_FORM_DATA = {
  sku: '',
  name: '',
  description: '',
  price: '',
  stock: '',
  category: 'CPU',
  image: '',
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
  maxCoolerHeight: '',
  supportedFormFactors: ['ATX'],
  includesPsu: 'false',
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
  coolerHeight: '',
  interface: 'PCIe 4.0',
  readSpeed: '',
  writeSpeed: '',
  m2FormFactor: '2280',
  screenSize: '15.6',
  refreshRate: '60',
  panelType: 'IPS',
  resolution: 'FHD (1920x1080)',
  processor: 'Intel Core i5',
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
  switchType: 'Mecanico',
  layout: 'Espanol',
  connection: 'USB',
  dpi: '16000',
  sensor: 'Optico',
  wireless: 'false',
  brand: '',
  keyboardType: 'Membrana',
  connections: ['Cableado'] as string[],
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
  driverSize: '50',
  impedance: '32',
  micType: 'Unidireccional',
  noiseCancel: 'false',
  supportedConnections: ['Cable USB'] as string[],
  audioType: 'Headset',
  micIntegrated: 'true',
  micRemovable: 'false',
  surroundSound: 'No',
  consoleCompatible: 'false',
  microphoneType: 'Condensador',
  connectionTypes: ['USB'] as string[],
  frequencyResponse: '',
  includesArm: 'false',
  includesPopFilter: 'false',
  speakerType: 'Escritorio',
  channels: '2.0',
  hasSubwoofer: 'false',
  remoteControl: 'false',
};

const createInitialFormData = (category = '') => ({
  ...INITIAL_FORM_DATA,
  category,
  type:
    category === 'COOLER' ? 'Torre' : category === 'STORAGE' ? 'SSD 2.5' : INITIAL_FORM_DATA.type,
  interface: category === 'STORAGE' ? 'SATA' : INITIAL_FORM_DATA.interface,
  resolution:
    category === 'WEBCAM' || category === 'CAPTURE_CARD' ? 'FHD' : INITIAL_FORM_DATA.resolution,
  fps: category === 'WEBCAM' || category === 'CAPTURE_CARD' ? '30' : INITIAL_FORM_DATA.fps,
  fanCount: category === 'LAPTOP_COOLING_BASE' ? '1' : INITIAL_FORM_DATA.fanCount,
  supportedLaptopSize:
    category === 'LAPTOP_COOLING_BASE' || category === 'BACKPACK'
      ? '15.6"'
      : INITIAL_FORM_DATA.supportedLaptopSize,
  connectivity: category === 'LAPTOP_COOLING_BASE' ? 'USB-A' : INITIAL_FORM_DATA.connectivity,
  connection: category === 'HEADSET' ? 'Cableado' : INITIAL_FORM_DATA.connection,
  supportedConnections:
    category === 'HEADSET' ? ['USB'] : [...INITIAL_FORM_DATA.supportedConnections],
  connectionTypes:
    category === 'MICROPHONE' || category === 'SPEAKER'
      ? ['USB']
      : [...INITIAL_FORM_DATA.connectionTypes],
  cableHubType: category === 'CABLE_HUB' ? 'Cable' : INITIAL_FORM_DATA.cableHubType,
  cableType: category === 'CABLE_HUB' ? 'HDMI a HDMI' : INITIAL_FORM_DATA.cableType,
  cableLengthMeters: category === 'CABLE_HUB' ? '1' : INITIAL_FORM_DATA.cableLengthMeters,
  hubInputType: category === 'CABLE_HUB' ? 'USB-C' : INITIAL_FORM_DATA.hubInputType,
  supportedFormFactors: [...INITIAL_FORM_DATA.supportedFormFactors],
  radiatorSupportMmValues: [...INITIAL_FORM_DATA.radiatorSupportMmValues],
  supportedM2FormFactors: [...INITIAL_FORM_DATA.supportedM2FormFactors],
  compatibleSockets: [...INITIAL_FORM_DATA.compatibleSockets],
  ports: [...INITIAL_FORM_DATA.ports],
  connections: [...INITIAL_FORM_DATA.connections],
});

const NON_NEGATIVE_FIELDS = new Set([
  'price',
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
  'maxCoolerHeight',
  'includedFans',
  'radiatorSupportMm',
  'fanCount',
  'radiatorSize',
  'tdpCapacity',
  'coolerHeight',
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

const NO_NEGATIVE_TEXT_FIELDS = new Set(['frequency']);

const NAME_REGEX = /^[\p{L}\p{N}\s.,+\-_%/()[\]:;'"#&°@]{5,200}$/u;

const fieldId = (name: string) => `add-product-${name}`;

const fieldOptionId = (name: string, value: string) => {
  const normalizedValue = Array.from(value.toLowerCase())
    .map((char) => {
      const code = char.codePointAt(0);
      const isLowerLetter = code !== undefined && code >= 97 && code <= 122;
      const isDigit = code !== undefined && code >= 48 && code <= 57;
      return isLowerLetter || isDigit ? char : '-';
    })
    .join('')
    .split('-')
    .filter(Boolean)
    .join('-');

  return `${fieldId(name)}-${normalizedValue}`;
};

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
      buildPayload: buildProductPayload,
      cpuSocketsByBrand: CPU_SOCKETS_BY_BRAND,
    });

    if (sharedValidationError) {
      return sharedValidationError;
    }

    return null;
  };

  // Cuando cambia el departamento, reseteamos la categoria y la informacion basica
  useEffect(() => {
    if (!selectedDept) return;
    // @ts-expect-error DEPARTMENTS is indexed by the selected department key.
    const firstCategory = DEPARTMENTS[selectedDept][0].value;

    setFormData(createInitialFormData(firstCategory));

    // Tambien resetear las imagenes
    setImageFiles([]);
  }, [selectedDept]);

  const restorePreviousFieldValue = (
    target: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
  ) => {
    target.value = String(formData[target.name as keyof typeof formData] ?? '');
  };

  const shouldRejectFieldValue = (
    target: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
  ) => {
    const { name, value, type } = target;
    if (type === 'number' && NON_NEGATIVE_FIELDS.has(name)) {
      if (value === '') {
        setFormData({ ...formData, [name]: '' });
        return true;
      }

      if (Number(value) < 0) {
        restorePreviousFieldValue(target);
        return true;
      }
    }

    if (type !== 'number' && NO_NEGATIVE_TEXT_FIELDS.has(name) && value.includes('-')) {
      restorePreviousFieldValue(target);
      return true;
    }

    return false;
  };

  const handleCpuBrandChange = (value: string) => {
    const nextSockets = CPU_SOCKETS_BY_BRAND[value] || [];
    setFormData({
      ...formData,
      cpuBrand: value,
      socket: nextSockets.includes(formData.socket) ? formData.socket : nextSockets[0] || '',
    });
  };

  const handleOfficeMouseChange = (value: string) => {
    setFormData({
      ...formData,
      mouseType: value,
      buttonCount: '',
      dpi: '',
      pollingRateHz: '1000',
    });
  };

  const handleKeyboardTypeChange = (value: string) => {
    setFormData({
      ...formData,
      keyboardType: value,
      hasLighting: value === 'Hibrido' ? formData.hasLighting : 'false',
      switchType: formData.switchType,
    });
  };

  const handleHeadsetConnectionChange = (value: string) => {
    const allowed = value === 'Cableado' ? HEADSET_WIRED_CONNECTIONS : HEADSET_WIRELESS_CONNECTIONS;
    const nextSupported = formData.supportedConnections.filter((item) => allowed.includes(item));
    setFormData({
      ...formData,
      connection: value,
      supportedConnections: nextSupported.length ? nextSupported : [allowed[0]],
    });
  };

  const handleCableHubTypeChange = (value: string) => {
    setFormData({
      ...formData,
      cableHubType: value,
      cableType: value === 'Cable' ? formData.cableType || 'HDMI a HDMI' : '',
      cableLengthMeters: value === 'Cable' ? formData.cableLengthMeters || '1' : '',
      hubInputType: value === 'Hub' ? formData.hubInputType || 'USB-C' : '',
      hasHdmiOutput: value === 'Hub' ? formData.hasHdmiOutput : 'false',
      hasRj45Output: value === 'Hub' ? formData.hasRj45Output : 'false',
    });
  };

  const updateFormField = (target: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement) => {
    const { name, value, type } = target;
    const checked = target instanceof HTMLInputElement ? target.checked : false;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? String(checked) : name === 'sku' ? value.toUpperCase() : value,
    });
  };

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;

    if (shouldRejectFieldValue(event.target)) {
      return;
    }

    if (name === 'category') {
      resetFormForCategory(value);
      return;
    }

    if (name === 'cpuBrand') {
      handleCpuBrandChange(value);
      return;
    }

    if (name === 'mouseType' && value === 'Oficina') {
      handleOfficeMouseChange(value);
      return;
    }

    if (name === 'keyboardType') {
      handleKeyboardTypeChange(value);
      return;
    }

    if (name === 'connection' && formData.category === 'HEADSET') {
      handleHeadsetConnectionChange(value);
      return;
    }

    if (name === 'cableHubType') {
      handleCableHubTypeChange(value);
      return;
    }

    if (name === 'type' && formData.category === 'STORAGE') {
      setFormData((prev) => ({
        ...prev,
        type: value,
        interface: value === 'Sólido M.2' ? prev.interface || 'PCIe 4.0' : 'SATA',
        m2FormFactor: value === 'Sólido M.2' ? prev.m2FormFactor || '2280' : '',
      }));
      return;
    }

    updateFormField(event.target);
  };
  const handleMultiSelectChange = (
    field:
      | 'compatibleSockets'
      | 'supportedM2FormFactors'
      | 'supportedFormFactors'
      | 'radiatorSupportMmValues'
      | 'ports'
      | 'connections'
      | 'supportedConnections'
      | 'connectionTypes',
    value: string,
  ) => {
    setFormData((prev) => {
      const currentValues = prev[field];
      if (field === 'radiatorSupportMmValues') {
        const nextValues =
          value === '0'
            ? ['0']
            : currentValues.includes(value)
              ? currentValues.filter((item) => item !== value && item !== '0')
              : [...currentValues.filter((item) => item !== '0'), value];

        return { ...prev, [field]: nextValues.length ? nextValues : ['0'] };
      }

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
      notify.error(validationError);
      return;
    }

    if (imageFiles.length === 0) {
      notify.error('Debes subir al menos 1 imagen del producto');
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
          'Content-Type': 'multipart/form-data',
        },
      });

      resetProductForm();
      notify.success('Producto creado correctamente.');
    } catch (error: unknown) {
      console.error(error);
      notify.error(
        getApiErrorMessage(
          error,
          'Error al guardar. Revisa la configuracion del backend o Cloudinary.',
        ),
      );
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

      <form
        key={formResetKey}
        onSubmit={handleSubmit}
        noValidate
        className="grid grid-cols-1 lg:grid-cols-12 gap-8"
      >
        {/* === COLUMNA IZQUIERDA: FORMULARIOS (Ocupa 8 columnas) === */}
        <div className="lg:col-span-8 space-y-6">
          {/* 1. INFORMACION GENERAL (Siempre visible) */}
          <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-8">
            <h2 className="text-xl font-bold mb-6 text-gray-800 border-b pb-2">
              Informacion Basica
            </h2>
            <div className="grid grid-cols-2 gap-6">
              <div className="col-span-2">
                <label htmlFor={fieldId('name')} className="label-admin">
                  Nombre del Producto
                </label>
                <input
                  id={fieldId('name')}
                  name="name"
                  onChange={handleChange}
                  className="input-admin text-lg font-medium"
                  placeholder="Ej: Laptop Gamer ASUS TUF F15"
                  required
                />
              </div>
              <div className="col-span-2">
                <label htmlFor={fieldId('sku')} className="label-admin">
                  SKU del producto
                </label>
                <input
                  id={fieldId('sku')}
                  name="sku"
                  value={formData.sku}
                  onChange={handleChange}
                  className="input-admin font-mono text-sm font-bold uppercase tracking-wide"
                  placeholder="Ej: PCS-CPU-AMD-R5-9600X"
                  maxLength={80}
                  required
                />
                <p className="mt-2 text-xs font-medium text-gray-500">
                  Usa un código único para identificar el producto en inventario y futuras
                  integraciones con Odoo.
                </p>
              </div>
              <div>
                <label htmlFor={fieldId('price')} className="label-admin">
                  Precio (S/.)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold pointer-events-none">
                    S/.
                  </span>
                  <input
                    id={fieldId('price')}
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
                <label htmlFor={fieldId('stock')} className="label-admin">
                  Stock Disponible
                </label>
                <input
                  id={fieldId('stock')}
                  name="stock"
                  type="number"
                  onChange={handleChange}
                  className="input-admin"
                  placeholder="0"
                  required
                />
              </div>
              <div className="col-span-2">
                <label htmlFor={fieldId('description')} className="label-admin">
                  Descripcion del Producto
                </label>
                <textarea
                  id={fieldId('description')}
                  name="description"
                  rows={4}
                  value={formData.description}
                  onChange={handleChange}
                  className="input-admin resize-none"
                  placeholder="Describe las caracteristicas principales del producto..."
                />
                <p className="mt-1 text-xs text-gray-500">
                  {formData.description.length}/200 caracteres. Entre 10 y 200 caracteres.
                </p>
              </div>
              <div className="col-span-2">
                <span className="label-admin">Imagenes del Producto (Maximo 5)</span>
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
          <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gray-50/70 p-8">
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
                  <div className="col-span-2 flex items-center gap-2 text-blue-800 font-bold border-b border-blue-200 pb-2">
                    <FiCpu /> Datos de Procesador
                  </div>
                  <div>
                    <label htmlFor={fieldId('cpuBrand')} className="label-admin">
                      Marca del procesador
                    </label>
                    <select
                      id={fieldId('cpuBrand')}
                      name="cpuBrand"
                      value={formData.cpuBrand}
                      onChange={handleChange}
                      className="input-admin"
                    >
                      {CPU_BRANDS.map((brand) => (
                        <option key={brand} value={brand}>
                          {brand}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={fieldId('socket')} className="label-admin">
                      Socket
                    </label>
                    <select
                      id={fieldId('socket')}
                      name="socket"
                      value={formData.socket}
                      onChange={handleChange}
                      className="input-admin"
                    >
                      {(CPU_SOCKETS_BY_BRAND[formData.cpuBrand] || []).map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={fieldId('baseTdpWatts')} className="label-admin">
                      TDP base (Watts)
                    </label>
                    <input
                      id={fieldId('baseTdpWatts')}
                      name="baseTdpWatts"
                      type="number"
                      onChange={handleChange}
                      className="input-admin"
                      placeholder="Ej: 65"
                    />
                    <span className="text-xs text-gray-500">
                      Dato informativo del consumo base del procesador.
                    </span>
                  </div>
                  <div>
                    <label htmlFor={fieldId('tdp')} className="label-admin">
                      TDP maximo (Watts)
                    </label>
                    <input
                      id={fieldId('tdp')}
                      name="tdp"
                      type="number"
                      onChange={handleChange}
                      className="input-admin"
                      placeholder="Ej: 105"
                      required
                    />
                    <span className="text-xs text-gray-500">
                      Usado para validar fuente de poder y refrigeracion.
                    </span>
                  </div>
                  <div>
                    <label htmlFor={fieldId('cores')} className="label-admin">
                      Nucleos
                    </label>
                    <input
                      id={fieldId('cores')}
                      name="cores"
                      type="number"
                      onChange={handleChange}
                      className="input-admin"
                      placeholder="Ej: 8"
                    />
                  </div>
                  <div>
                    <label htmlFor={fieldId('threads')} className="label-admin">
                      Threads
                    </label>
                    <input
                      id={fieldId('threads')}
                      name="threads"
                      type="number"
                      onChange={handleChange}
                      className="input-admin"
                      placeholder="Ej: 16"
                    />
                  </div>
                  <div>
                    <label htmlFor={fieldId('frequency')} className="label-admin">
                      Frecuencia (GHz)
                    </label>
                    <input
                      id={fieldId('frequency')}
                      name="frequency"
                      onChange={handleChange}
                      className="input-admin"
                      placeholder="Ej: 4.2"
                    />
                  </div>
                  <div>
                    <label htmlFor={fieldId('integratedGraphics')} className="label-admin">
                      Graficos Integrados
                    </label>
                    <select
                      id={fieldId('integratedGraphics')}
                      name="integratedGraphics"
                      onChange={handleChange}
                      className="input-admin"
                    >
                      <option value="false">No</option>
                      <option value="true">Si</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor={fieldId('includesCooler')} className="label-admin">
                      Incluye Cooler?
                    </label>
                    <select
                      id={fieldId('includesCooler')}
                      name="includesCooler"
                      onChange={handleChange}
                      className="input-admin"
                    >
                      <option value="false">No (Requiere comprar aparte)</option>
                      <option value="true">Si (De stock)</option>
                    </select>
                  </div>
                </>
              )}

              {/* --- MOTHERBOARD --- */}
              {formData.category === 'MOTHERBOARD' && (
                <>
                  <div className="col-span-2 flex items-center gap-2 text-blue-800 font-bold border-b border-blue-200 pb-2">
                    <FiGrid /> Datos de Placa
                  </div>
                  <div>
                    <label htmlFor={fieldId('brand')} className="label-admin">
                      Marca
                    </label>
                    <select
                      id={fieldId('brand')}
                      name="brand"
                      value={formData.brand}
                      onChange={handleChange}
                      className="input-admin"
                      required
                    >
                      <option value="">Selecciona marca</option>
                      {MOTHERBOARD_BRANDS.map((brand) => (
                        <option key={brand} value={brand}>
                          {brand}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={fieldId('socket')} className="label-admin">
                      Socket
                    </label>
                    <select
                      id={fieldId('socket')}
                      name="socket"
                      onChange={handleChange}
                      className="input-admin"
                    >
                      {SOCKETS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={fieldId('formFactor')} className="label-admin">
                      Formato
                    </label>
                    <select
                      id={fieldId('formFactor')}
                      name="formFactor"
                      onChange={handleChange}
                      className="input-admin"
                    >
                      {FORM_FACTORS.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={fieldId('memoryType')} className="label-admin">
                      Tipo de RAM
                    </label>
                    <select
                      id={fieldId('memoryType')}
                      name="memoryType"
                      onChange={handleChange}
                      className="input-admin"
                    >
                      {RAM_TYPES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={fieldId('memorySlots')} className="label-admin">
                      Slots de RAM
                    </label>
                    <select
                      id={fieldId('memorySlots')}
                      name="memorySlots"
                      onChange={handleChange}
                      className="input-admin"
                    >
                      <option value="2">2 Slots</option>
                      <option value="4">4 Slots</option>
                      <option value="8">8 Slots</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor={fieldId('m2Slots')} className="label-admin">
                      Slots M.2
                    </label>
                    <select
                      id={fieldId('m2Slots')}
                      name="m2Slots"
                      onChange={handleChange}
                      className="input-admin"
                    >
                      <option value="1">1 Slot</option>
                      <option value="2">2 Slots</option>
                      <option value="3">3 Slots</option>
                      <option value="4">4 Slots</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <span className="label-admin">Tamanos M.2 soportados</span>
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
                      {M2_FORM_FACTORS.map((size) => (
                        <label
                          htmlFor={fieldOptionId('supportedM2FormFactors', size)}
                          key={size}
                          className="flex items-center gap-2 rounded-lg border bg-white p-3 text-sm font-semibold"
                        >
                          <input
                            id={fieldOptionId('supportedM2FormFactors', size)}
                            type="checkbox"
                            checked={formData.supportedM2FormFactors.includes(size)}
                            onChange={() => handleMultiSelectChange('supportedM2FormFactors', size)}
                          />
                          <span>{size}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* --- RAM --- */}
              {formData.category === 'RAM' && (
                <>
                  <div className="col-span-2 flex items-center gap-2 text-blue-800 font-bold border-b border-blue-200 pb-2">
                    <FiZap /> Datos de Memoria
                  </div>
                  <div>
                    <label htmlFor={fieldId('brand')} className="label-admin">
                      Marca
                    </label>
                    <select
                      id={fieldId('brand')}
                      name="brand"
                      value={formData.brand}
                      onChange={handleChange}
                      className="input-admin"
                      required
                    >
                      <option value="">Selecciona marca</option>
                      {RAM_BRANDS.map((brand) => (
                        <option key={brand} value={brand}>
                          {brand}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={fieldId('memoryType')} className="label-admin">
                      Tipo de RAM
                    </label>
                    <select
                      id={fieldId('memoryType')}
                      name="memoryType"
                      onChange={handleChange}
                      className="input-admin"
                    >
                      {RAM_TYPES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={fieldId('capacity')} className="label-admin">
                      Capacidad por modulo (GB)
                    </label>
                    <select
                      id={fieldId('capacity')}
                      name="capacity"
                      value={formData.capacity}
                      onChange={handleChange}
                      className="input-admin"
                    >
                      {RAM_CAPACITIES.map((c) => (
                        <option key={c} value={c}>
                          {c} GB
                        </option>
                      ))}
                    </select>
                    <span className="text-xs text-gray-500">
                      Capacidad individual de cada modulo RAM.
                    </span>
                  </div>
                  <div>
                    <label htmlFor={fieldId('modules')} className="label-admin">
                      Modulos
                    </label>
                    <select
                      id={fieldId('modules')}
                      name="modules"
                      onChange={handleChange}
                      className="input-admin"
                    >
                      <option value="1">1 Modulo (Single)</option>
                      <option value="2">2 Modulos (Dual Kit)</option>
                      <option value="4">4 Modulos (Quad Kit)</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor={fieldId('speed')} className="label-admin">
                      Frecuencia (MHz)
                    </label>
                    <input
                      id={fieldId('speed')}
                      name="speed"
                      type="number"
                      onChange={handleChange}
                      className="input-admin"
                      placeholder="Ej: 6000"
                    />
                  </div>
                  <div>
                    <label htmlFor={fieldId('latency')} className="label-admin">
                      Latencia
                    </label>
                    <input
                      id={fieldId('latency')}
                      name="latency"
                      value={formData.latency}
                      onChange={handleChange}
                      className="input-admin"
                      placeholder="Ej: CL36"
                    />
                  </div>
                  <div>
                    <label htmlFor={fieldId('hasRGB')} className="label-admin">
                      Iluminacion RGB
                    </label>
                    <select
                      id={fieldId('hasRGB')}
                      name="hasRGB"
                      onChange={handleChange}
                      className="input-admin"
                    >
                      <option value="false">No</option>
                      <option value="true">Si</option>
                    </select>
                  </div>
                </>
              )}

              {/* --- GPU --- */}
              {formData.category === 'GPU' && (
                <>
                  <div className="col-span-2 flex items-center gap-2 text-blue-800 font-bold border-b border-blue-200 pb-2">
                    <FiMonitor /> Datos de Video
                  </div>
                  <div>
                    <label htmlFor={fieldId('brand')} className="label-admin">
                      Marca ensambladora
                    </label>
                    <select
                      id={fieldId('brand')}
                      name="brand"
                      value={formData.brand}
                      onChange={handleChange}
                      className="input-admin"
                      required
                    >
                      <option value="">Selecciona marca</option>
                      {GPU_BRANDS.map((brand) => (
                        <option key={brand} value={brand}>
                          {brand}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={fieldId('chipset')} className="label-admin">
                      Chipset
                    </label>
                    <select
                      id={fieldId('chipset')}
                      name="chipset"
                      value={formData.chipset}
                      onChange={handleChange}
                      className="input-admin"
                    >
                      {GPU_CHIPSETS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={fieldId('vram')} className="label-admin">
                      VRAM (GB)
                    </label>
                    <select
                      id={fieldId('vram')}
                      name="vram"
                      value={formData.vram}
                      onChange={handleChange}
                      className="input-admin"
                      required
                    >
                      {GPU_VRAM_OPTIONS.map((vram) => (
                        <option key={vram} value={vram}>
                          {vram} GB
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={fieldId('typeVram')} className="label-admin">
                      Tipo de VRAM
                    </label>
                    <select
                      id={fieldId('typeVram')}
                      name="typeVram"
                      value={formData.typeVram}
                      onChange={handleChange}
                      className="input-admin"
                      required
                    >
                      {GPU_VRAM_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={fieldId('length')} className="label-admin">
                      Largo (mm)
                    </label>
                    <input
                      id={fieldId('length')}
                      name="length"
                      type="number"
                      onChange={handleChange}
                      className="input-admin"
                      placeholder="Ej: 320"
                      required
                    />
                    <span className="text-xs text-red-500">Vital para validar con Case.</span>
                  </div>
                  <div>
                    <label htmlFor={fieldId('gpuPowerWatts')} className="label-admin">
                      TGP / Consumo real (Watts)
                    </label>
                    <input
                      id={fieldId('gpuPowerWatts')}
                      name="gpuPowerWatts"
                      type="number"
                      value={formData.gpuPowerWatts}
                      onChange={handleChange}
                      className="input-admin"
                      placeholder="Ej: 280"
                      required
                    />
                    <span className="text-xs text-red-500">
                      Usado por el armador para estimar el consumo del sistema.
                    </span>
                  </div>
                  <div>
                    <label htmlFor={fieldId('recommendedPsuWatts')} className="label-admin">
                      PSU recomendada (Watts)
                    </label>
                    <input
                      id={fieldId('recommendedPsuWatts')}
                      name="recommendedPsuWatts"
                      type="number"
                      value={formData.recommendedPsuWatts}
                      onChange={handleChange}
                      className="input-admin"
                      placeholder="Ej: 650"
                    />
                    <span className="text-xs text-gray-500">
                      Referencia del fabricante para la fuente minima sugerida.
                    </span>
                  </div>
                  <div>
                    <label htmlFor={fieldId('fans')} className="label-admin">
                      Ventiladores
                    </label>
                    <select
                      id={fieldId('fans')}
                      name="fans"
                      value={formData.fans}
                      onChange={handleChange}
                      className="input-admin"
                    >
                      {GPU_FAN_OPTIONS.map((fans) => (
                        <option key={fans} value={fans}>
                          {fans}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* --- FUENTE (PSU) --- */}
              {formData.category === 'PSU' && (
                <>
                  <div className="col-span-2 flex items-center gap-2 text-blue-800 font-bold border-b border-blue-200 pb-2">
                    <FiZap /> Datos de Fuente
                  </div>
                  <div>
                    <label htmlFor={fieldId('brand')} className="label-admin">
                      Marca
                    </label>
                    <select
                      id={fieldId('brand')}
                      name="brand"
                      value={formData.brand}
                      onChange={handleChange}
                      className="input-admin"
                      required
                    >
                      <option value="">Seleccionar marca</option>
                      {PSU_BRANDS.map((brand) => (
                        <option key={brand} value={brand}>
                          {brand}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={fieldId('wattage')} className="label-admin">
                      Potencia (Watts)
                    </label>
                    <select
                      id={fieldId('wattage')}
                      name="wattage"
                      value={formData.wattage}
                      onChange={handleChange}
                      className="input-admin"
                      required
                    >
                      <option value="">Seleccionar potencia</option>
                      {PSU_WATT_OPTIONS.map((watts) => (
                        <option key={watts} value={watts}>
                          {watts} W
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={fieldId('certification')} className="label-admin">
                      Certificacion
                    </label>
                    <select
                      id={fieldId('certification')}
                      name="certification"
                      onChange={handleChange}
                      className="input-admin"
                    >
                      {PSU_CERTS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={fieldId('modular')} className="label-admin">
                      Modularidad
                    </label>
                    <select
                      id={fieldId('modular')}
                      name="modular"
                      onChange={handleChange}
                      className="input-admin"
                    >
                      <option value="No Modular">No Modular</option>
                      <option value="Semi Modular">Semi Modular</option>
                      <option value="Full Modular">Full Modular</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor={fieldId('formFactor')} className="label-admin">
                      Formato
                    </label>
                    <select
                      id={fieldId('formFactor')}
                      name="formFactor"
                      onChange={handleChange}
                      className="input-admin"
                    >
                      <option value="ATX">ATX (Estandar)</option>
                      <option value="SFX">SFX (Pequena)</option>
                    </select>
                  </div>
                </>
              )}

              {/* --- GABINETE (CASE) --- */}
              {formData.category === 'CASE' && (
                <>
                  <div className="col-span-2 flex items-center gap-2 text-blue-800 font-bold border-b border-blue-200 pb-2">
                    <FiBox /> Datos de Gabinete
                  </div>
                  <div>
                    <label htmlFor={fieldId('brand')} className="label-admin">
                      Marca
                    </label>
                    <select
                      id={fieldId('brand')}
                      name="brand"
                      value={formData.brand}
                      onChange={handleChange}
                      className="input-admin"
                      required
                    >
                      <option value="">Seleccionar marca</option>
                      {CASE_BRANDS.map((brand) => (
                        <option key={brand} value={brand}>
                          {brand}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <span className="label-admin">Soporte de placa</span>
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                      {FORM_FACTORS.map((formFactor) => (
                        <label
                          htmlFor={fieldOptionId('supportedFormFactors', formFactor)}
                          key={formFactor}
                          className="flex items-center gap-2 rounded-lg border bg-white p-3 text-sm font-semibold"
                        >
                          <input
                            id={fieldOptionId('supportedFormFactors', formFactor)}
                            type="checkbox"
                            checked={formData.supportedFormFactors.includes(formFactor)}
                            onChange={() =>
                              handleMultiSelectChange('supportedFormFactors', formFactor)
                            }
                          />
                          <span>{formFactor}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label htmlFor={fieldId('maxGpuLength')} className="label-admin">
                      Max Largo GPU (mm)
                    </label>
                    <input
                      id={fieldId('maxGpuLength')}
                      name="maxGpuLength"
                      type="number"
                      onChange={handleChange}
                      className="input-admin"
                      placeholder="Ej: 340"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor={fieldId('maxCoolerHeight')} className="label-admin">
                      Altura maxima de cooler (mm)
                    </label>
                    <input
                      id={fieldId('maxCoolerHeight')}
                      name="maxCoolerHeight"
                      type="number"
                      value={formData.maxCoolerHeight}
                      onChange={handleChange}
                      className="input-admin"
                      placeholder="Ej: 160"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor={fieldId('includesPsu')} className="label-admin">
                      Incluye Fuente?
                    </label>
                    <select
                      id={fieldId('includesPsu')}
                      name="includesPsu"
                      onChange={handleChange}
                      className="input-admin"
                    >
                      <option value="false">No</option>
                      <option value="true">Si (Generica)</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <span className="label-admin">Soporte radiador liquido</span>
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                      {CASE_RADIATOR_SUPPORT_OPTIONS.map((option) => (
                        <label
                          htmlFor={fieldOptionId('radiatorSupportMmValues', option.value)}
                          key={option.value}
                          className="flex items-center gap-2 rounded-lg border bg-white p-3 text-sm font-semibold"
                        >
                          <input
                            id={fieldOptionId('radiatorSupportMmValues', option.value)}
                            type="checkbox"
                            checked={formData.radiatorSupportMmValues.includes(option.value)}
                            onChange={() =>
                              handleMultiSelectChange('radiatorSupportMmValues', option.value)
                            }
                          />
                          <span>{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label htmlFor={fieldId('includedFans')} className="label-admin">
                      Ventiladores Incluidos
                    </label>
                    <input
                      id={fieldId('includedFans')}
                      name="includedFans"
                      type="number"
                      onChange={handleChange}
                      className="input-admin"
                      placeholder="Ej: 3"
                    />
                  </div>
                </>
              )}

              {/* --- COOLER --- */}
              {formData.category === 'COOLER' && (
                <>
                  <div className="col-span-2 flex items-center gap-2 text-blue-800 font-bold border-b border-blue-200 pb-2">
                    <FiWind /> Datos de Refrigeracion
                  </div>
                  <div>
                    <label htmlFor={fieldId('brand')} className="label-admin">
                      Marca
                    </label>
                    <select
                      id={fieldId('brand')}
                      name="brand"
                      value={formData.brand}
                      onChange={handleChange}
                      className="input-admin"
                      required
                    >
                      <option value="">Seleccionar marca</option>
                      {COOLER_BRANDS.map((brand) => (
                        <option key={brand} value={brand}>
                          {brand}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <span className="label-admin">Tipo de Refrigeracion</span>
                    <div className="flex gap-4 mt-2">
                      <label
                        htmlFor={fieldOptionId('type', 'Torre')}
                        className="inline-flex items-center gap-2 border p-3 rounded-lg cursor-pointer hover:bg-blue-50"
                      >
                        <input
                          id={fieldOptionId('type', 'Torre')}
                          type="radio"
                          name="type"
                          value="Torre"
                          checked={formData.type === 'Torre'}
                          onChange={handleChange}
                        />
                        <span>Torre</span>
                      </label>
                      <label
                        htmlFor={fieldOptionId('type', 'Líquida')}
                        className="inline-flex items-center gap-2 border p-3 rounded-lg cursor-pointer hover:bg-blue-50"
                      >
                        <input
                          id={fieldOptionId('type', 'Líquida')}
                          type="radio"
                          name="type"
                          value="Líquida"
                          checked={formData.type === 'Líquida'}
                          onChange={handleChange}
                        />
                        <span>Líquida</span>
                      </label>
                    </div>
                  </div>

                  <div className="col-span-2">
                    <span className="label-admin">Sockets compatibles</span>
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
                      {COOLER_SOCKET_OPTIONS.map((socket) => (
                        <label
                          htmlFor={fieldOptionId('compatibleSockets', socket)}
                          key={socket}
                          className="flex items-center gap-2 rounded-lg border bg-white p-3 text-sm font-semibold"
                        >
                          <input
                            id={fieldOptionId('compatibleSockets', socket)}
                            type="checkbox"
                            checked={formData.compatibleSockets.includes(socket)}
                            onChange={() => handleMultiSelectChange('compatibleSockets', socket)}
                          />
                          <span>{socket}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label htmlFor={fieldId('tdpCapacity')} className="label-admin">
                      TDP soportado (Watts)
                    </label>
                    <input
                      id={fieldId('tdpCapacity')}
                      name="tdpCapacity"
                      type="number"
                      onChange={handleChange}
                      className="input-admin"
                      placeholder="Ej: 180"
                      required
                    />
                    <span className="text-xs text-gray-500">
                      Debe ser igual o mayor al TDP del CPU.
                    </span>
                  </div>

                  {formData.type === 'Torre' && (
                    <div>
                      <label htmlFor={fieldId('coolerHeight')} className="label-admin">
                        Altura del cooler (mm)
                      </label>
                      <input
                        id={fieldId('coolerHeight')}
                        name="coolerHeight"
                        type="number"
                        onChange={handleChange}
                        className="input-admin"
                        placeholder="Ej: 155"
                        required
                      />
                    </div>
                  )}

                  {formData.type === 'Líquida' && (
                    <div>
                      <label htmlFor={fieldId('radiatorSize')} className="label-admin">
                        Tamano Radiador
                      </label>
                      <select
                        id={fieldId('radiatorSize')}
                        name="radiatorSize"
                        value={formData.radiatorSize}
                        onChange={handleChange}
                        className="input-admin"
                        required
                      >
                        {COOLER_RADIATOR_OPTIONS.map((size) => (
                          <option key={size} value={size}>
                            {size} mm
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label htmlFor={fieldId('hasScreen')} className="label-admin">
                      Tiene Pantalla LCD?
                    </label>
                    <select
                      id={fieldId('hasScreen')}
                      name="hasScreen"
                      onChange={handleChange}
                      className="input-admin"
                    >
                      <option value="false">No</option>
                      <option value="true">Si</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor={fieldId('hasRGB')} className="label-admin">
                      RGB?
                    </label>
                    <select
                      id={fieldId('hasRGB')}
                      name="hasRGB"
                      onChange={handleChange}
                      className="input-admin"
                    >
                      <option value="false">No</option>
                      <option value="true">Si</option>
                    </select>
                  </div>
                </>
              )}

              {/* --- STORAGE --- */}
              {formData.category === 'STORAGE' && (
                <>
                  <div className="col-span-2 flex items-center gap-2 text-blue-800 font-bold border-b border-blue-200 pb-2">
                    <FiHardDrive /> Datos de Almacenamiento
                  </div>
                  <div>
                    <label htmlFor={fieldId('type')} className="label-admin">
                      Tipo
                    </label>
                    <select
                      id={fieldId('type')}
                      name="type"
                      onChange={handleChange}
                      className="input-admin"
                    >
                      {STORAGE_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  {formData.type === 'Sólido M.2' && (
                    <div>
                      <label htmlFor={fieldId('interface')} className="label-admin">
                        Generacion
                      </label>
                      <select
                        id={fieldId('interface')}
                        name="interface"
                        value={formData.interface}
                        onChange={handleChange}
                        className="input-admin"
                      >
                        {NVME_GENS.map((g) => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label htmlFor={fieldId('capacity')} className="label-admin">
                      Capacidad (GB)
                    </label>
                    <input
                      id={fieldId('capacity')}
                      name="capacity"
                      type="number"
                      onChange={handleChange}
                      className="input-admin"
                      placeholder="Ej: 1000"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor={fieldId('readSpeed')} className="label-admin">
                      Velocidad Lectura (MB/s)
                    </label>
                    <input
                      id={fieldId('readSpeed')}
                      name="readSpeed"
                      type="number"
                      onChange={handleChange}
                      className="input-admin"
                      placeholder="Ej: 7000"
                    />
                  </div>
                  <div>
                    <label htmlFor={fieldId('writeSpeed')} className="label-admin">
                      Velocidad Escritura (MB/s)
                    </label>
                    <input
                      id={fieldId('writeSpeed')}
                      name="writeSpeed"
                      type="number"
                      onChange={handleChange}
                      className="input-admin"
                      placeholder="Ej: 5000"
                    />
                  </div>
                  {formData.type === 'Sólido M.2' && (
                    <div>
                      <label htmlFor={fieldId('m2FormFactor')} className="label-admin">
                        Tamano fisico M.2
                      </label>
                      <select
                        id={fieldId('m2FormFactor')}
                        name="m2FormFactor"
                        value={formData.m2FormFactor}
                        onChange={handleChange}
                        className="input-admin"
                      >
                        {M2_FORM_FACTORS.map((size) => (
                          <option key={size} value={size}>
                            {size}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              )}

              {/* ================= ORDENADORES ================= */}

              {(formData.category === 'LAPTOP' || formData.category === 'PC_DESKTOP') && (
                <>
                  <div className="col-span-2 border-b pb-2 mb-2 font-bold text-gray-500">
                    Hardware Principal
                  </div>
                  {formData.category === 'LAPTOP' && (
                    <div>
                      <label htmlFor={fieldId('brand')} className="label-admin">
                        Marca
                      </label>
                      <select
                        id={fieldId('brand')}
                        name="brand"
                        value={formData.brand}
                        onChange={handleChange}
                        className="input-admin"
                        required
                      >
                        <option value="">Seleccionar marca</option>
                        {LAPTOP_BRANDS.map((brand) => (
                          <option key={brand} value={brand}>
                            {brand}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div>
                    <label htmlFor={fieldId('processor')} className="label-admin">
                      Procesador
                    </label>
                    <input
                      id={fieldId('processor')}
                      name="processor"
                      onChange={handleChange}
                      className="input-admin"
                      placeholder="Ej: Intel Core i7-13700H"
                    />
                  </div>
                  {formData.category === 'LAPTOP' ? (
                    <>
                      <div>
                        <label htmlFor={fieldId('ram')} className="label-admin">
                          Memoria RAM
                        </label>
                        <select
                          id={fieldId('ram')}
                          name="ram"
                          value={formData.ram}
                          onChange={handleChange}
                          className="input-admin"
                        >
                          {LAPTOP_RAM_OPTIONS.map((value) => (
                            <option key={value} value={value}>
                              {LAPTOP_RAM_LABELS[value]}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor={fieldId('storage')} className="label-admin">
                          Almacenamiento
                        </label>
                        <select
                          id={fieldId('storage')}
                          name="storage"
                          value={formData.storage}
                          onChange={handleChange}
                          className="input-admin"
                        >
                          {LAPTOP_STORAGE_OPTIONS.map((value) => (
                            <option key={value} value={value}>
                              {LAPTOP_STORAGE_LABELS[value]}
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label htmlFor={fieldId('ram')} className="label-admin">
                          Memoria RAM
                        </label>
                        <select
                          id={fieldId('ram')}
                          name="ram"
                          value={formData.ram}
                          onChange={handleChange}
                          className="input-admin"
                        >
                          {LAPTOP_RAM_OPTIONS.map((value) => (
                            <option key={value} value={value}>
                              {LAPTOP_RAM_LABELS[value]}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor={fieldId('storage')} className="label-admin">
                          Almacenamiento
                        </label>
                        <input
                          id={fieldId('storage')}
                          name="storage"
                          onChange={handleChange}
                          className="input-admin"
                          placeholder="Ej: 1TB NVMe"
                        />
                      </div>
                    </>
                  )}
                  <div>
                    <label htmlFor={fieldId('hasDedicatedGpu')} className="label-admin">
                      Tiene grafica dedicada
                    </label>
                    <select
                      id={fieldId('hasDedicatedGpu')}
                      name="hasDedicatedGpu"
                      onChange={handleChange}
                      className="input-admin"
                    >
                      <option value="false">No (Graficos Integrados)</option>
                      <option value="true">Si</option>
                    </select>
                  </div>

                  {formData.hasDedicatedGpu === 'true' && (
                    <>
                      <div>
                        <label htmlFor={fieldId('gpuBrand')} className="label-admin">
                          Marca GPU
                        </label>
                        <select
                          id={fieldId('gpuBrand')}
                          name="gpuBrand"
                          onChange={handleChange}
                          className="input-admin"
                        >
                          <option value="">Seleccionar...</option>
                          <option value="NVIDIA">NVIDIA</option>
                          <option value="AMD">AMD</option>
                          <option value="Intel">Intel</option>
                          <option value="No aplica">No aplica</option>
                          <option value="Otros">Otros</option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor={fieldId('gpuModel')} className="label-admin">
                          Modelo GPU
                        </label>
                        <input
                          id={fieldId('gpuModel')}
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
                      <div className="col-span-2 border-b pb-2 mb-2 font-bold text-gray-500 mt-4">
                        Equipo pre-ensamblado
                      </div>
                      <div>
                        <label htmlFor={fieldId('coolerType')} className="label-admin">
                          Cooler incluido
                        </label>
                        <select
                          id={fieldId('coolerType')}
                          name="coolerType"
                          onChange={handleChange}
                          className="input-admin"
                        >
                          {DESKTOP_COOLER_TYPES.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor={fieldId('psuWatts')} className="label-admin">
                          Fuente de poder (Watts)
                        </label>
                        <input
                          id={fieldId('psuWatts')}
                          name="psuWatts"
                          type="number"
                          min="0"
                          onChange={handleChange}
                          className="input-admin"
                          placeholder="Ej: 650"
                        />
                      </div>
                      <div className="col-span-2">
                        <label htmlFor={fieldId('caseModel')} className="label-admin">
                          Modelo del case
                        </label>
                        <input
                          id={fieldId('caseModel')}
                          name="caseModel"
                          onChange={handleChange}
                          className="input-admin"
                          placeholder="Ej: MSI Gungnir 110M"
                        />
                      </div>
                    </>
                  )}

                  {formData.category === 'LAPTOP' && (
                    <>
                      <div className="col-span-2 border-b pb-2 mb-2 font-bold text-gray-500 mt-4">
                        Pantalla
                      </div>
                      <div>
                        <label htmlFor={fieldId('screenSize')} className="label-admin">
                          Tamano Pantalla
                        </label>
                        <select
                          id={fieldId('screenSize')}
                          name="screenSize"
                          value={formData.screenSize}
                          onChange={handleChange}
                          className="input-admin"
                        >
                          {LAPTOP_SCREEN_OPTIONS.map((value) => (
                            <option key={value} value={value}>
                              {value}&quot;
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor={fieldId('refreshRate')} className="label-admin">
                          Tasa Refresco (Hz)
                        </label>
                        <select
                          id={fieldId('refreshRate')}
                          name="refreshRate"
                          value={formData.refreshRate}
                          onChange={handleChange}
                          className="input-admin"
                        >
                          {LAPTOP_REFRESH_OPTIONS.map((value) => (
                            <option key={value} value={value}>
                              {value} Hz
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor={fieldId('includesWindows')} className="label-admin">
                          Incluye Windows de serie?
                        </label>
                        <select
                          id={fieldId('includesWindows')}
                          name="includesWindows"
                          onChange={handleChange}
                          className="input-admin"
                        >
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
                  <div>
                    <label htmlFor={fieldId('licenseType')} className="label-admin">
                      Tipo de Licencia
                    </label>
                    <select
                      id={fieldId('licenseType')}
                      name="licenseType"
                      onChange={handleChange}
                      className="input-admin"
                    >
                      <option>Permanente</option>
                      <option>Suscripcion 1 Ano</option>
                      <option>OEM</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor={fieldId('platform')} className="label-admin">
                      Plataforma
                    </label>
                    <select
                      id={fieldId('platform')}
                      name="platform"
                      onChange={handleChange}
                      className="input-admin"
                    >
                      <option>Windows</option>
                      <option>Mac</option>
                      <option>Android</option>
                    </select>
                  </div>
                </>
              )}

              {formData.category === 'LAPTOP_COOLING_BASE' && (
                <>
                  <div className="col-span-2 border-b pb-2 mb-2 font-bold text-gray-500">
                    Accesorio para portatil
                  </div>
                  <div>
                    <label htmlFor={fieldId('brand')} className="label-admin">
                      Marca
                    </label>
                    <select
                      id={fieldId('brand')}
                      name="brand"
                      value={formData.brand}
                      onChange={handleChange}
                      className="input-admin"
                      required
                    >
                      <option value="">Seleccionar marca</option>
                      {LAPTOP_COOLING_BASE_BRANDS.map((brand) => (
                        <option key={brand} value={brand}>
                          {brand}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={fieldId('supportedLaptopSize')} className="label-admin">
                      Tamaño laptop soportado
                    </label>
                    <select
                      id={fieldId('supportedLaptopSize')}
                      name="supportedLaptopSize"
                      value={formData.supportedLaptopSize}
                      onChange={handleChange}
                      className="input-admin"
                    >
                      {LAPTOP_SUPPORTED_SIZE_OPTIONS.map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={fieldId('fanCount')} className="label-admin">
                      Cantidad de ventiladores
                    </label>
                    <select
                      id={fieldId('fanCount')}
                      name="fanCount"
                      value={formData.fanCount}
                      onChange={handleChange}
                      className="input-admin"
                    >
                      {LAPTOP_COOLING_BASE_FAN_COUNTS.map((count) => (
                        <option key={count} value={count}>
                          {count}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={fieldId('hasRGB')} className="label-admin">
                      RGB
                    </label>
                    <select
                      id={fieldId('hasRGB')}
                      name="hasRGB"
                      value={formData.hasRGB}
                      onChange={handleChange}
                      className="input-admin"
                    >
                      <option value="false">No</option>
                      <option value="true">Si</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor={fieldId('color')} className="label-admin">
                      Color
                    </label>
                    <select
                      id={fieldId('color')}
                      name="color"
                      value={formData.color}
                      onChange={handleChange}
                      className="input-admin"
                    >
                      <option value="">Seleccionar color</option>
                      {ACCESSORY_COLOR_OPTIONS.map((color) => (
                        <option key={color} value={color}>
                          {color}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={fieldId('connectivity')} className="label-admin">
                      Conectividad
                    </label>
                    <select
                      id={fieldId('connectivity')}
                      name="connectivity"
                      value={formData.connectivity}
                      onChange={handleChange}
                      className="input-admin"
                    >
                      {LAPTOP_ACCESSORY_CONNECTIVITY.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {formData.category === 'BACKPACK' && (
                <>
                  <div className="col-span-2 border-b pb-2 mb-2 font-bold text-gray-500">
                    Accesorio para portatil
                  </div>
                  <div>
                    <label htmlFor={fieldId('brand')} className="label-admin">
                      Marca
                    </label>
                    <select
                      id={fieldId('brand')}
                      name="brand"
                      value={formData.brand}
                      onChange={handleChange}
                      className="input-admin"
                      required
                    >
                      <option value="">Seleccionar marca</option>
                      {BACKPACK_BRANDS.map((brand) => (
                        <option key={brand} value={brand}>
                          {brand}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={fieldId('color')} className="label-admin">
                      Color
                    </label>
                    <select
                      id={fieldId('color')}
                      name="color"
                      value={formData.color}
                      onChange={handleChange}
                      className="input-admin"
                    >
                      <option value="">Seleccionar color</option>
                      {ACCESSORY_COLOR_OPTIONS.map((color) => (
                        <option key={color} value={color}>
                          {color}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={fieldId('supportedLaptopSize')} className="label-admin">
                      Tamaño laptop soportado
                    </label>
                    <select
                      id={fieldId('supportedLaptopSize')}
                      name="supportedLaptopSize"
                      value={formData.supportedLaptopSize}
                      onChange={handleChange}
                      className="input-admin"
                    >
                      {LAPTOP_SUPPORTED_SIZE_OPTIONS.map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* ================= PERIFERICOS ================= */}

              {formData.category === 'MONITOR' && (
                <>
                  <div>
                    <label htmlFor={fieldId('brand')} className="label-admin">
                      Marca
                    </label>
                    <select
                      id={fieldId('brand')}
                      name="brand"
                      value={formData.brand}
                      onChange={handleChange}
                      className="input-admin"
                      required
                    >
                      <option value="">Seleccionar marca</option>
                      {MONITOR_BRANDS.map((brand) => (
                        <option key={brand} value={brand}>
                          {brand}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={fieldId('screenSize')} className="label-admin">
                      Tamaño (Pulgadas)
                    </label>
                    <input
                      id={fieldId('screenSize')}
                      name="screenSize"
                      onChange={handleChange}
                      className="input-admin"
                    />
                  </div>
                  <div>
                    <label htmlFor={fieldId('resolution')} className="label-admin">
                      Resolución
                    </label>
                    <select
                      id={fieldId('resolution')}
                      name="resolution"
                      value={formData.resolution}
                      onChange={handleChange}
                      className="input-admin"
                    >
                      {MONITOR_RESOLUTION_OPTIONS.map((resolution) => (
                        <option key={resolution} value={resolution}>
                          {resolution}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={fieldId('panelType')} className="label-admin">
                      Panel
                    </label>
                    <select
                      id={fieldId('panelType')}
                      name="panelType"
                      onChange={handleChange}
                      className="input-admin"
                    >
                      {PANEL_TYPES.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={fieldId('refreshRate')} className="label-admin">
                      Hz
                    </label>
                    <select
                      id={fieldId('refreshRate')}
                      name="refreshRate"
                      value={formData.refreshRate}
                      onChange={handleChange}
                      className="input-admin"
                    >
                      {MONITOR_REFRESH_OPTIONS.map((hz) => (
                        <option key={hz} value={hz}>
                          {hz} Hz
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={fieldId('responseTimeMs')} className="label-admin">
                      Latencia / Tiempo de respuesta (ms)
                    </label>
                    <input
                      id={fieldId('responseTimeMs')}
                      name="responseTimeMs"
                      type="number"
                      min="0.1"
                      step="0.1"
                      onChange={handleChange}
                      className="input-admin"
                      placeholder="Ej: 1"
                    />
                  </div>
                  <div>
                    <label htmlFor={fieldId('hasSpeakers')} className="label-admin">
                      ¿Tiene parlantes integrados?
                    </label>
                    <select
                      id={fieldId('hasSpeakers')}
                      name="hasSpeakers"
                      onChange={handleChange}
                      className="input-admin"
                    >
                      <option value="false">No</option>
                      <option value="true">Si</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <span className="label-admin">Puertos disponibles</span>
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                      {MONITOR_PORTS.map((port) => (
                        <label
                          htmlFor={fieldOptionId('ports', port)}
                          key={port}
                          className="flex items-center gap-2 rounded-lg border bg-white p-3 text-sm font-semibold"
                        >
                          <input
                            id={fieldOptionId('ports', port)}
                            type="checkbox"
                            checked={formData.ports.includes(port)}
                            onChange={() => handleMultiSelectChange('ports', port)}
                          />
                          <span>{port}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}
              {formData.category === 'KEYBOARD' && (
                <>
                  <div>
                    <label htmlFor={fieldId('brand')} className="label-admin">
                      Marca
                    </label>
                    <select
                      id={fieldId('brand')}
                      name="brand"
                      value={formData.brand}
                      onChange={handleChange}
                      className="input-admin"
                      required
                    >
                      <option value="">Seleccionar marca</option>
                      {KEYBOARD_BRANDS.map((brand) => (
                        <option key={brand} value={brand}>
                          {brand}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={fieldId('keyboardType')} className="label-admin">
                      Tipo de teclado
                    </label>
                    <select
                      id={fieldId('keyboardType')}
                      name="keyboardType"
                      value={formData.keyboardType}
                      onChange={handleChange}
                      className="input-admin"
                    >
                      {KEYBOARD_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <span className="label-admin">Conectividad</span>
                    <div className="grid grid-cols-3 gap-2">
                      {PERIPHERAL_CONNECTIONS.map((connection) => (
                        <label
                          htmlFor={fieldOptionId('connections', connection)}
                          key={connection}
                          className="flex items-center gap-2 rounded-lg border bg-white p-3 text-sm font-semibold"
                        >
                          <input
                            id={fieldOptionId('connections', connection)}
                            type="checkbox"
                            checked={formData.connections.includes(connection)}
                            onChange={() => handleMultiSelectChange('connections', connection)}
                          />
                          <span>{connection}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label htmlFor={fieldId('layoutLanguage')} className="label-admin">
                      Idioma / Layout
                    </label>
                    <select
                      id={fieldId('layoutLanguage')}
                      name="layoutLanguage"
                      value={formData.layoutLanguage}
                      onChange={handleChange}
                      className="input-admin"
                    >
                      {LAYOUT_LANGUAGES.map((lang) => (
                        <option key={lang} value={lang}>
                          {lang}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={fieldId('keyboardFormFactor')} className="label-admin">
                      Formato de teclado
                    </label>
                    <select
                      id={fieldId('keyboardFormFactor')}
                      name="keyboardFormFactor"
                      value={formData.keyboardFormFactor}
                      onChange={handleChange}
                      className="input-admin"
                    >
                      {KEYBOARD_FORM_FACTORS.map((format) => (
                        <option key={format} value={format}>
                          {format}
                        </option>
                      ))}
                    </select>
                  </div>
                  {formData.keyboardType === 'Hibrido' && (
                    <div>
                      <label htmlFor={fieldId('hasLighting')} className="label-admin">
                        RGB
                      </label>
                      <select
                        id={fieldId('hasLighting')}
                        name="hasLighting"
                        value={formData.hasLighting}
                        onChange={handleChange}
                        className="input-admin"
                      >
                        <option value="false">No</option>
                        <option value="true">Si</option>
                      </select>
                    </div>
                  )}
                  <div>
                    <label htmlFor={fieldId('switchType')} className="label-admin">
                      Tipo de switch
                    </label>
                    <input
                      id={fieldId('switchType')}
                      name="switchType"
                      value={formData.switchType}
                      onChange={handleChange}
                      className="input-admin"
                      placeholder={getKeyboardSwitchPlaceholder(formData.keyboardType)}
                    />
                  </div>
                </>
              )}
              {formData.category === 'MOUSE' && (
                <>
                  <div>
                    <label htmlFor={fieldId('brand')} className="label-admin">
                      Marca
                    </label>
                    <select
                      id={fieldId('brand')}
                      name="brand"
                      value={formData.brand}
                      onChange={handleChange}
                      className="input-admin"
                      required
                    >
                      <option value="">Seleccionar marca</option>
                      {MOUSE_BRANDS.map((brand) => (
                        <option key={brand} value={brand}>
                          {brand}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={fieldId('mouseType')} className="label-admin">
                      Tipo de mouse
                    </label>
                    <select
                      id={fieldId('mouseType')}
                      name="mouseType"
                      onChange={handleChange}
                      className="input-admin"
                    >
                      {MOUSE_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <span className="label-admin">Tipo de conexion</span>
                    <div className="grid grid-cols-3 gap-2">
                      {MOUSE_CONNECTIONS.map((connection) => (
                        <label
                          htmlFor={fieldOptionId('connections', connection)}
                          key={connection}
                          className="flex items-center gap-2 rounded-lg border bg-white p-3 text-sm font-semibold"
                        >
                          <input
                            id={fieldOptionId('connections', connection)}
                            type="checkbox"
                            checked={formData.connections.includes(connection)}
                            onChange={() => handleMultiSelectChange('connections', connection)}
                          />
                          <span>{connection}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  {formData.mouseType === 'Gamer' && (
                    <>
                      <div>
                        <label htmlFor={fieldId('buttonCount')} className="label-admin">
                          Cantidad de botones
                        </label>
                        <input
                          id={fieldId('buttonCount')}
                          name="buttonCount"
                          type="number"
                          onChange={handleChange}
                          className="input-admin"
                          placeholder="Ej: 6"
                        />
                      </div>
                      <div>
                        <label htmlFor={fieldId('dpi')} className="label-admin">
                          DPI maximo
                        </label>
                        <input
                          id={fieldId('dpi')}
                          name="dpi"
                          type="number"
                          onChange={handleChange}
                          className="input-admin"
                          placeholder="Ej: 26000"
                        />
                      </div>
                      <div>
                        <label htmlFor={fieldId('pollingRateHz')} className="label-admin">
                          Polling Rate
                        </label>
                        <select
                          id={fieldId('pollingRateHz')}
                          name="pollingRateHz"
                          onChange={handleChange}
                          className="input-admin"
                        >
                          {POLLING_RATES.map((rate) => (
                            <option key={rate} value={rate}>
                              {rate} Hz
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
                  <div>
                    <label htmlFor={fieldId('powerType')} className="label-admin">
                      Usa bateria o pila?
                    </label>
                    <select
                      id={fieldId('powerType')}
                      name="powerType"
                      onChange={handleChange}
                      className="input-admin"
                    >
                      {MOUSE_POWER_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={fieldId('weightGrams')} className="label-admin">
                      Peso (g)
                    </label>
                    <input
                      id={fieldId('weightGrams')}
                      name="weightGrams"
                      type="number"
                      onChange={handleChange}
                      className="input-admin"
                      placeholder="Ej: 63"
                    />
                  </div>
                </>
              )}

              {formData.category === 'MOUSEPAD' && (
                <>
                  <div>
                    <label htmlFor={fieldId('brand')} className="label-admin">
                      Marca
                    </label>
                    <select
                      id={fieldId('brand')}
                      name="brand"
                      value={formData.brand}
                      onChange={handleChange}
                      className="input-admin"
                      required
                    >
                      <option value="">Seleccionar marca</option>
                      {MOUSEPAD_BRANDS.map((brand) => (
                        <option key={brand} value={brand}>
                          {brand}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={fieldId('widthCm')} className="label-admin">
                      Ancho (mm)
                    </label>
                    <input
                      id={fieldId('widthCm')}
                      name="widthCm"
                      type="number"
                      onChange={handleChange}
                      className="input-admin"
                      placeholder="Ej: 900"
                    />
                  </div>
                  <div>
                    <label htmlFor={fieldId('lengthCm')} className="label-admin">
                      Largo (mm)
                    </label>
                    <input
                      id={fieldId('lengthCm')}
                      name="lengthCm"
                      type="number"
                      onChange={handleChange}
                      className="input-admin"
                      placeholder="Ej: 400"
                    />
                  </div>
                  <div>
                    <label htmlFor={fieldId('hasLed')} className="label-admin">
                      Tiene LEDs
                    </label>
                    <select
                      id={fieldId('hasLed')}
                      name="hasLed"
                      onChange={handleChange}
                      className="input-admin"
                    >
                      <option value="false">No</option>
                      <option value="true">Si</option>
                    </select>
                  </div>
                </>
              )}

              {formData.category === 'WEBCAM' && (
                <>
                  <div>
                    <label htmlFor={fieldId('brand')} className="label-admin">
                      Marca
                    </label>
                    <select
                      id={fieldId('brand')}
                      name="brand"
                      value={formData.brand}
                      onChange={handleChange}
                      className="input-admin"
                      required
                    >
                      <option value="">Seleccionar marca</option>
                      {WEBCAM_BRANDS.map((brand) => (
                        <option key={brand} value={brand}>
                          {brand}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={fieldId('resolution')} className="label-admin">
                      Resolucion
                    </label>
                    <select
                      id={fieldId('resolution')}
                      name="resolution"
                      value={formData.resolution}
                      onChange={handleChange}
                      className="input-admin"
                    >
                      {VIDEO_RESOLUTION_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={fieldId('fps')} className="label-admin">
                      FPS
                    </label>
                    <select
                      id={fieldId('fps')}
                      name="fps"
                      value={formData.fps}
                      onChange={handleChange}
                      className="input-admin"
                    >
                      {WEBCAM_FPS_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option} FPS
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {formData.category === 'CAPTURE_CARD' && (
                <>
                  <div>
                    <label htmlFor={fieldId('brand')} className="label-admin">
                      Marca
                    </label>
                    <select
                      id={fieldId('brand')}
                      name="brand"
                      value={formData.brand}
                      onChange={handleChange}
                      className="input-admin"
                      required
                    >
                      <option value="">Seleccionar marca</option>
                      {CAPTURE_CARD_BRANDS.map((brand) => (
                        <option key={brand} value={brand}>
                          {brand}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={fieldId('resolution')} className="label-admin">
                      Resolucion
                    </label>
                    <select
                      id={fieldId('resolution')}
                      name="resolution"
                      value={formData.resolution}
                      onChange={handleChange}
                      className="input-admin"
                    >
                      {VIDEO_RESOLUTION_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={fieldId('fps')} className="label-admin">
                      FPS
                    </label>
                    <select
                      id={fieldId('fps')}
                      name="fps"
                      value={formData.fps}
                      onChange={handleChange}
                      className="input-admin"
                    >
                      {CAPTURE_CARD_FPS_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option} FPS
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {formData.category === 'CABLE_HUB' && (
                <>
                  <div>
                    <label htmlFor={fieldId('brand')} className="label-admin">
                      Marca
                    </label>
                    <select
                      id={fieldId('brand')}
                      name="brand"
                      value={formData.brand}
                      onChange={handleChange}
                      className="input-admin"
                      required
                    >
                      <option value="">Seleccionar marca</option>
                      {CABLE_HUB_BRANDS.map((brand) => (
                        <option key={brand} value={brand}>
                          {brand}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={fieldId('cableHubType')} className="label-admin">
                      Tipo
                    </label>
                    <select
                      id={fieldId('cableHubType')}
                      name="cableHubType"
                      value={formData.cableHubType}
                      onChange={handleChange}
                      className="input-admin"
                    >
                      {CABLE_HUB_TYPES.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                  {formData.cableHubType === 'Cable' && (
                    <>
                      <div>
                        <label htmlFor={fieldId('cableType')} className="label-admin">
                          Tipo de cable
                        </label>
                        <select
                          id={fieldId('cableType')}
                          name="cableType"
                          value={formData.cableType}
                          onChange={handleChange}
                          className="input-admin"
                        >
                          {CABLE_TYPES.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor={fieldId('cableLengthMeters')} className="label-admin">
                          Largo en metros
                        </label>
                        <select
                          id={fieldId('cableLengthMeters')}
                          name="cableLengthMeters"
                          value={formData.cableLengthMeters}
                          onChange={handleChange}
                          className="input-admin"
                        >
                          {CABLE_LENGTHS.map((option) => (
                            <option key={option} value={option}>
                              {option} m
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
                  {formData.cableHubType === 'Hub' && (
                    <>
                      <div>
                        <label htmlFor={fieldId('hubInputType')} className="label-admin">
                          Tipo de entrada
                        </label>
                        <select
                          id={fieldId('hubInputType')}
                          name="hubInputType"
                          value={formData.hubInputType}
                          onChange={handleChange}
                          className="input-admin"
                        >
                          {HUB_INPUT_TYPES.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor={fieldId('hasHdmiOutput')} className="label-admin">
                          Salida HDMI
                        </label>
                        <select
                          id={fieldId('hasHdmiOutput')}
                          name="hasHdmiOutput"
                          value={formData.hasHdmiOutput}
                          onChange={handleChange}
                          className="input-admin"
                        >
                          <option value="false">No</option>
                          <option value="true">Si</option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor={fieldId('hasRj45Output')} className="label-admin">
                          Salida RJ45
                        </label>
                        <select
                          id={fieldId('hasRj45Output')}
                          name="hasRj45Output"
                          value={formData.hasRj45Output}
                          onChange={handleChange}
                          className="input-admin"
                        >
                          <option value="false">No</option>
                          <option value="true">Si</option>
                        </select>
                      </div>
                    </>
                  )}
                </>
              )}

              {formData.category === 'CHAIR' && (
                <>
                  <div>
                    <label htmlFor={fieldId('brand')} className="label-admin">
                      Marca
                    </label>
                    <input
                      id={fieldId('brand')}
                      name="brand"
                      onChange={handleChange}
                      className="input-admin"
                    />
                  </div>
                  <div>
                    <label htmlFor={fieldId('color')} className="label-admin">
                      Color
                    </label>
                    <input
                      id={fieldId('color')}
                      name="color"
                      onChange={handleChange}
                      className="input-admin"
                      placeholder="Ej: Negro/Rojo"
                    />
                  </div>
                  <div>
                    <label htmlFor={fieldId('material')} className="label-admin">
                      Material
                    </label>
                    <select
                      id={fieldId('material')}
                      name="material"
                      onChange={handleChange}
                      className="input-admin"
                    >
                      {CHAIR_MATERIALS.map((material) => (
                        <option key={material} value={material}>
                          {material}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={fieldId('maxWeightKg')} className="label-admin">
                      Peso maximo soportado (kg)
                    </label>
                    <input
                      id={fieldId('maxWeightKg')}
                      name="maxWeightKg"
                      type="number"
                      onChange={handleChange}
                      className="input-admin"
                      placeholder="Ej: 120"
                    />
                  </div>
                </>
              )}

              {formData.category === 'GAMING_DESK' && (
                <>
                  <div>
                    <label htmlFor={fieldId('brand')} className="label-admin">
                      Marca
                    </label>
                    <input
                      id={fieldId('brand')}
                      name="brand"
                      onChange={handleChange}
                      className="input-admin"
                    />
                  </div>
                  <div>
                    <label htmlFor={fieldId('color')} className="label-admin">
                      Color
                    </label>
                    <input
                      id={fieldId('color')}
                      name="color"
                      onChange={handleChange}
                      className="input-admin"
                    />
                  </div>
                  <div>
                    <label htmlFor={fieldId('surface')} className="label-admin">
                      Superficie
                    </label>
                    <input
                      id={fieldId('surface')}
                      name="surface"
                      onChange={handleChange}
                      className="input-admin"
                      placeholder="Ej: Carbono, madera, melamina"
                    />
                  </div>
                  <div>
                    <label htmlFor={fieldId('weightKg')} className="label-admin">
                      Peso (kg)
                    </label>
                    <input
                      id={fieldId('weightKg')}
                      name="weightKg"
                      type="number"
                      onChange={handleChange}
                      className="input-admin"
                      placeholder="Ej: 25"
                    />
                  </div>
                </>
              )}

              {/* ================= AUDIO ================= */}

              {formData.category === 'HEADSET' && (
                <>
                  <div className="col-span-2 flex items-center gap-2 text-blue-800 font-bold border-b border-blue-200 pb-2">
                    <FiHeadphones /> Datos de Audifonos
                  </div>
                  <div>
                    <label htmlFor={fieldId('brand')} className="label-admin">
                      Marca
                    </label>
                    <select
                      id={fieldId('brand')}
                      name="brand"
                      value={formData.brand}
                      onChange={handleChange}
                      className="input-admin"
                      required
                    >
                      <option value="">Seleccionar marca</option>
                      {HEADSET_BRANDS.map((brand) => (
                        <option key={brand} value={brand}>
                          {brand}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={fieldId('audioType')} className="label-admin">
                      Tipo de audio
                    </label>
                    <select
                      id={fieldId('audioType')}
                      name="audioType"
                      value={formData.audioType}
                      onChange={handleChange}
                      className="input-admin"
                    >
                      {HEADSET_AUDIO_TYPES.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={fieldId('connection')} className="label-admin">
                      Conectividad
                    </label>
                    <select
                      id={fieldId('connection')}
                      name="connection"
                      value={formData.connection}
                      onChange={handleChange}
                      className="input-admin"
                    >
                      {AUDIO_CONNECTIVITY_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <span className="label-admin">Tipo de conexion</span>
                    <div className="grid grid-cols-2 gap-2">
                      {AUDIO_CONNECTION_TYPE_OPTIONS.map((option) => (
                        <label
                          htmlFor={fieldOptionId('supportedConnections', option)}
                          key={option}
                          className="flex items-center gap-2 rounded-lg border bg-white p-3 text-sm font-semibold"
                        >
                          <input
                            id={fieldOptionId('supportedConnections', option)}
                            type="checkbox"
                            checked={formData.supportedConnections.includes(option)}
                            onChange={() => handleMultiSelectChange('supportedConnections', option)}
                          />
                          <span>{option}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label htmlFor={fieldId('driverSize')} className="label-admin">
                      Drivers (mm)
                    </label>
                    <input
                      id={fieldId('driverSize')}
                      name="driverSize"
                      type="number"
                      onChange={handleChange}
                      className="input-admin"
                      placeholder="Ej: 50"
                    />
                  </div>
                  <div>
                    <label htmlFor={fieldId('impedance')} className="label-admin">
                      Impedancia (Ohms)
                    </label>
                    <input
                      id={fieldId('impedance')}
                      name="impedance"
                      type="number"
                      onChange={handleChange}
                      className="input-admin"
                      placeholder="Ej: 32"
                    />
                  </div>
                  <div>
                    <label htmlFor={fieldId('micType')} className="label-admin">
                      Microfono
                    </label>
                    <select
                      id={fieldId('micType')}
                      name="micType"
                      onChange={handleChange}
                      className="input-admin"
                    >
                      <option value="Unidireccional">Unidireccional</option>
                      <option value="Bidireccional">Bidireccional</option>
                      <option value="Omnidireccional">Omnidireccional</option>
                      <option value="Sin microfono">Sin microfono</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor={fieldId('micIntegrated')} className="label-admin">
                      Microfono integrado
                    </label>
                    <select
                      id={fieldId('micIntegrated')}
                      name="micIntegrated"
                      value={formData.micIntegrated}
                      onChange={handleChange}
                      className="input-admin"
                    >
                      <option value="false">No</option>
                      <option value="true">Si</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor={fieldId('micRemovable')} className="label-admin">
                      Microfono removible
                    </label>
                    <select
                      id={fieldId('micRemovable')}
                      name="micRemovable"
                      value={formData.micRemovable}
                      onChange={handleChange}
                      className="input-admin"
                    >
                      <option value="false">No</option>
                      <option value="true">Si</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor={fieldId('noiseCancel')} className="label-admin">
                      Cancelacion de Ruido
                    </label>
                    <select
                      id={fieldId('noiseCancel')}
                      name="noiseCancel"
                      onChange={handleChange}
                      className="input-admin"
                    >
                      <option value="false">No</option>
                      <option value="true">Si (ANC)</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor={fieldId('surroundSound')} className="label-admin">
                      Sonido surround
                    </label>
                    <select
                      id={fieldId('surroundSound')}
                      name="surroundSound"
                      value={formData.surroundSound}
                      onChange={handleChange}
                      className="input-admin"
                    >
                      {HEADSET_SURROUND_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={fieldId('consoleCompatible')} className="label-admin">
                      Compatible consola
                    </label>
                    <select
                      id={fieldId('consoleCompatible')}
                      name="consoleCompatible"
                      value={formData.consoleCompatible}
                      onChange={handleChange}
                      className="input-admin"
                    >
                      <option value="false">No</option>
                      <option value="true">Si</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor={fieldId('hasRGB')} className="label-admin">
                      RGB?
                    </label>
                    <select
                      id={fieldId('hasRGB')}
                      name="hasRGB"
                      onChange={handleChange}
                      className="input-admin"
                    >
                      <option value="false">No</option>
                      <option value="true">Si</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor={fieldId('color')} className="label-admin">
                      Color
                    </label>
                    <input
                      id={fieldId('color')}
                      name="color"
                      value={formData.color}
                      onChange={handleChange}
                      className="input-admin"
                      placeholder="Ej: Negro/Rojo"
                    />
                  </div>
                </>
              )}

              {formData.category === 'MICROPHONE' && (
                <>
                  <div className="col-span-2 flex items-center gap-2 text-blue-800 font-bold border-b border-blue-200 pb-2">
                    <FiHeadphones /> Datos de Microfono
                  </div>
                  <div>
                    <label htmlFor={fieldId('brand')} className="label-admin">
                      Marca
                    </label>
                    <select
                      id={fieldId('brand')}
                      name="brand"
                      value={formData.brand}
                      onChange={handleChange}
                      className="input-admin"
                      required
                    >
                      <option value="">Seleccionar marca</option>
                      {MICROPHONE_BRANDS.map((brand) => (
                        <option key={brand} value={brand}>
                          {brand}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={fieldId('microphoneType')} className="label-admin">
                      Tipo de microfono
                    </label>
                    <select
                      id={fieldId('microphoneType')}
                      name="microphoneType"
                      value={formData.microphoneType}
                      onChange={handleChange}
                      className="input-admin"
                    >
                      {MICROPHONE_TYPES.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={fieldId('connection')} className="label-admin">
                      Conectividad
                    </label>
                    <select
                      id={fieldId('connection')}
                      name="connection"
                      value={formData.connection}
                      onChange={handleChange}
                      className="input-admin"
                    >
                      {AUDIO_CONNECTIVITY_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <span className="label-admin">Tipo de conexion</span>
                    <div className="grid grid-cols-2 gap-2">
                      {AUDIO_CONNECTION_TYPE_OPTIONS.map((option) => (
                        <label
                          htmlFor={fieldOptionId('connectionTypes', option)}
                          key={option}
                          className="flex items-center gap-2 rounded-lg border bg-white p-3 text-sm font-semibold"
                        >
                          <input
                            id={fieldOptionId('connectionTypes', option)}
                            type="checkbox"
                            checked={formData.connectionTypes.includes(option)}
                            onChange={() => handleMultiSelectChange('connectionTypes', option)}
                          />
                          <span>{option}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label htmlFor={fieldId('micType')} className="label-admin">
                      Patron Polar
                    </label>
                    <select
                      id={fieldId('micType')}
                      name="micType"
                      onChange={handleChange}
                      className="input-admin"
                    >
                      {POLAR_PATTERN_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={fieldId('frequencyResponse')} className="label-admin">
                      Frecuencia respuesta
                    </label>
                    <input
                      id={fieldId('frequencyResponse')}
                      name="frequencyResponse"
                      value={formData.frequencyResponse}
                      onChange={handleChange}
                      className="input-admin"
                      placeholder="Ej: 20Hz-20kHz"
                    />
                  </div>
                  <div>
                    <label htmlFor={fieldId('includesArm')} className="label-admin">
                      Incluye brazo
                    </label>
                    <select
                      id={fieldId('includesArm')}
                      name="includesArm"
                      value={formData.includesArm}
                      onChange={handleChange}
                      className="input-admin"
                    >
                      <option value="false">No</option>
                      <option value="true">Si</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor={fieldId('includesPopFilter')} className="label-admin">
                      Incluye filtro pop
                    </label>
                    <select
                      id={fieldId('includesPopFilter')}
                      name="includesPopFilter"
                      value={formData.includesPopFilter}
                      onChange={handleChange}
                      className="input-admin"
                    >
                      <option value="false">No</option>
                      <option value="true">Si</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor={fieldId('hasRGB')} className="label-admin">
                      RGB?
                    </label>
                    <select
                      id={fieldId('hasRGB')}
                      name="hasRGB"
                      onChange={handleChange}
                      className="input-admin"
                    >
                      <option value="false">No</option>
                      <option value="true">Si</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor={fieldId('color')} className="label-admin">
                      Color
                    </label>
                    <input
                      id={fieldId('color')}
                      name="color"
                      value={formData.color}
                      onChange={handleChange}
                      className="input-admin"
                      placeholder="Ej: Negro"
                    />
                  </div>
                </>
              )}

              {formData.category === 'SPEAKER' && (
                <>
                  <div className="col-span-2 flex items-center gap-2 text-blue-800 font-bold border-b border-blue-200 pb-2">
                    <FiHeadphones /> Datos de Parlantes
                  </div>
                  <div>
                    <label htmlFor={fieldId('brand')} className="label-admin">
                      Marca
                    </label>
                    <select
                      id={fieldId('brand')}
                      name="brand"
                      value={formData.brand}
                      onChange={handleChange}
                      className="input-admin"
                      required
                    >
                      <option value="">Seleccionar marca</option>
                      {SPEAKER_BRANDS.map((brand) => (
                        <option key={brand} value={brand}>
                          {brand}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={fieldId('speakerType')} className="label-admin">
                      Tipo de parlante
                    </label>
                    <select
                      id={fieldId('speakerType')}
                      name="speakerType"
                      value={formData.speakerType}
                      onChange={handleChange}
                      className="input-admin"
                    >
                      {SPEAKER_TYPES.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={fieldId('channels')} className="label-admin">
                      Canales
                    </label>
                    <select
                      id={fieldId('channels')}
                      name="channels"
                      value={formData.channels}
                      onChange={handleChange}
                      className="input-admin"
                    >
                      {SPEAKER_CHANNELS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={fieldId('connection')} className="label-admin">
                      Conectividad
                    </label>
                    <select
                      id={fieldId('connection')}
                      name="connection"
                      value={formData.connection}
                      onChange={handleChange}
                      className="input-admin"
                    >
                      {AUDIO_CONNECTIVITY_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <span className="label-admin">Tipo de conexion</span>
                    <div className="grid grid-cols-2 gap-2">
                      {AUDIO_CONNECTION_TYPE_OPTIONS.map((option) => (
                        <label
                          htmlFor={fieldOptionId('connectionTypes', option)}
                          key={option}
                          className="flex items-center gap-2 rounded-lg border bg-white p-3 text-sm font-semibold"
                        >
                          <input
                            id={fieldOptionId('connectionTypes', option)}
                            type="checkbox"
                            checked={formData.connectionTypes.includes(option)}
                            onChange={() => handleMultiSelectChange('connectionTypes', option)}
                          />
                          <span>{option}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label htmlFor={fieldId('wattage')} className="label-admin">
                      Potencia (Watts)
                    </label>
                    <input
                      id={fieldId('wattage')}
                      name="wattage"
                      type="number"
                      onChange={handleChange}
                      className="input-admin"
                      placeholder="Ej: 20"
                    />
                  </div>
                  <div>
                    <label htmlFor={fieldId('hasSubwoofer')} className="label-admin">
                      Subwoofer
                    </label>
                    <select
                      id={fieldId('hasSubwoofer')}
                      name="hasSubwoofer"
                      value={formData.hasSubwoofer}
                      onChange={handleChange}
                      className="input-admin"
                    >
                      <option value="false">No</option>
                      <option value="true">Si</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor={fieldId('remoteControl')} className="label-admin">
                      Control remoto
                    </label>
                    <select
                      id={fieldId('remoteControl')}
                      name="remoteControl"
                      value={formData.remoteControl}
                      onChange={handleChange}
                      className="input-admin"
                    >
                      <option value="false">No</option>
                      <option value="true">Si</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor={fieldId('hasRGB')} className="label-admin">
                      RGB?
                    </label>
                    <select
                      id={fieldId('hasRGB')}
                      name="hasRGB"
                      onChange={handleChange}
                      className="input-admin"
                    >
                      <option value="false">No</option>
                      <option value="true">Si</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor={fieldId('color')} className="label-admin">
                      Color
                    </label>
                    <input
                      id={fieldId('color')}
                      name="color"
                      value={formData.color}
                      onChange={handleChange}
                      className="input-admin"
                      placeholder="Ej: Negro"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* === COLUMNA DERECHA: SELECCION DE CATEGORIA (Ocupa 4 columnas) === */}
        <div className="lg:col-span-4 space-y-6">
          <div className="sticky top-4 rounded-2xl border border-gray-200 bg-gray-50/70 p-6">
            <h3 className="text-lg font-black text-gray-800 mb-6">Clasificacion</h3>

            {/* 1. SELECCIONAR DEPARTAMENTO */}
            <div className="mb-6">
              <span className="label-admin mb-2">1. Categoria</span>
              <div className="grid grid-cols-2 gap-2">
                {Object.keys(DEPARTMENTS).map((deptKey) => (
                  <button
                    key={deptKey}
                    type="button"
                    onClick={() => setSelectedDept(deptKey)}
                    className={`p-3 rounded-lg text-xs font-bold transition-all border
                       ${
                         selectedDept === deptKey
                           ? 'bg-black text-white border-black'
                           : 'bg-transparent text-gray-500 border-gray-300 hover:border-brand-cyan hover:text-gray-900'
                       }
                     `}
                  >
                    {deptKey}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. SELECCIONAR TIPO ESPECIFICO */}
            <div className="mb-8">
              <label htmlFor={fieldId('category')} className="label-admin mb-2">
                2. Tipo de Producto
              </label>
              <select
                id={fieldId('category')}
                name="category"
                value={formData.category}
                onChange={handleChange}
                disabled={!selectedDept}
                className="w-full p-4 text-lg border-2 border-gray-300 rounded-xl font-bold outline-none cursor-pointer bg-gray-50 focus:bg-white focus:border-black transition text-gray-900 disabled:cursor-not-allowed disabled:text-gray-400"
              >
                {!selectedDept ? (
                  <option value="">Selecciona una categoria</option>
                ) : (
                  // @ts-expect-error DEPARTMENTS is indexed by the selected department key.
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
            <strong>Tip: Tip:</strong> Asegurate de elegir la categoria correcta para que el
            producto aparezca en los filtros de busqueda de la tienda.
          </div>
        </div>
      </form>

      <style jsx>{`
        .label-admin {
          display: block;
          font-size: 0.75rem;
          font-weight: 800;
          text-transform: uppercase;
          color: #6b7280;
          margin-bottom: 0.5rem;
          letter-spacing: 0.05em;
        }
        .input-admin {
          width: 100%;
          border: 1px solid #e5e7eb;
          padding: 0.75rem;
          border-radius: 0.75rem;
          outline: none;
          transition: all;
          background: #fff;
          font-weight: 500;
          color: #1f2937;
        }
        .input-admin:focus {
          border-color: #00d1b2;
          ring: 2px;
          ring-color: #00d1b2;
        }
      `}</style>
    </div>
  );
}
