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
    { label: 'Refrigeración', value: 'COOLER' },
    { label: 'Almacenamiento', value: 'STORAGE' },
  ],
  ORDENADORES: [
    { label: 'Laptop / Portátil', value: 'LAPTOP' },
    { label: 'PC de Escritorio', value: 'PC_DESKTOP' },
    { label: 'Software / Licencia', value: 'SOFTWARE' },
  ],
  PERIFERICOS: [
    { label: 'Monitor', value: 'MONITOR' },
    { label: 'Teclado', value: 'KEYBOARD' },
    { label: 'Mouse', value: 'MOUSE' },
    { label: 'Mousepad', value: 'MOUSEPAD' },
    { label: 'Silla Gaming', value: 'CHAIR' },
    { label: 'Mesa Gamer', value: 'GAMING_DESK' },
  ],
  AUDIO: [
    { label: 'Audífonos / Headset', value: 'HEADSET' },
    { label: 'Micrófono', value: 'MICROPHONE' },
    { label: 'Parlantes', value: 'SPEAKER' },
  ]
};

// Listas de Opciones Técnicas
const CPU_BRANDS = ['AMD', 'Intel'];
const CPU_SOCKETS_BY_BRAND: Record<string, string[]> = {
  AMD: ['AM4', 'AM5'],
  Intel: ['LGA 1200', 'LGA 1700', 'LGA 1851'],
};
const SOCKETS = ["AM5", "AM4", "LGA 1700", "LGA 1200", "LGA 1851"];
const M2_FORM_FACTORS = ['2230', '2242', '2260', '2280', '22110'];
const COOLER_SOCKET_OPTIONS = ['AM4', 'AM5', 'LGA 1200', 'LGA 1700', 'LGA 1851'];
const FORM_FACTORS = ["ATX", "Micro-ATX", "Mini-ITX", "E-ATX"];
const RAM_TYPES = ["DDR4", "DDR5"];
const RAM_CAPACITIES = [8, 16, 24, 32, 48, 64, 96];
const PSU_CERTS = ["Sin Certificación", "80+ White", "80+ Bronze", "80+ Gold", "80+ Platinum", "80+ Titanium"];
const GPU_CHIPSETS = ["NVIDIA GeForce", "AMD Radeon", "Intel Arc"];
const STORAGE_TYPES = ["SSD 2.5", "NVMe M.2", "M.2 SATA", "HDD 3.5"];
const NVME_GENS = ["SATA", "PCIe 3.0", "PCIe 4.0", "PCIe 5.0"];
const PANEL_TYPES = ["IPS", "VA", "TN", "OLED"];
const LAPTOP_BRANDS = ["ASUS", "Lenovo", "HP", "Dell", "MSI", "Acer"];
const DESKTOP_COOLER_TYPES = ['De serie', 'Aire (Torre)', 'Liquida (AIO)', 'No especificado'];
const MONITOR_PORTS = ['VGA', 'HDMI', 'DisplayPort', 'USB-C'];
const PERIPHERAL_CONNECTIONS = ['Cableado', 'Bluetooth', 'Dongle USB'];
const KEYBOARD_TYPES = ['Membrana', 'Semi-mecanico', 'Mecanico', 'Magnetico'];
const LAYOUT_LANGUAGES = ['Español', 'Ingles'];
const MOUSE_TYPES = ['Oficina', 'Gamer'];
const POLLING_RATES = ['1000', '2000', '4000', '8000'];
const CHAIR_MATERIALS = ['Cuero sintetico', 'Tela', 'Malla', 'Mixto', 'Otro'];
const MOUSE_POWER_TYPES = ['Pila', 'Bateria', 'Ninguno'];

const INITIAL_FORM_DATA = {
  name: '', description: '', price: '', stock: '', category: 'CPU', image: '',
  cpuBrand: 'AMD', socket: 'AM5', cores: '', threads: '', frequency: '', tdp: '', integratedGraphics: 'false', includesCooler: 'false',
  memorySlots: '4', m2Slots: '2', formFactor: 'ATX', supportedM2FormFactors: ['2280'],
  memoryType: 'DDR5', capacity: '16', speed: '5200', modules: '1', hasRGB: 'false',
  chipset: 'NVIDIA GeForce', vram: '8', length: '', fans: '2',
  wattage: '', certification: '80+ Bronze', modular: 'No Modular',
  maxGpuLength: '', includesPsu: 'false', includedFans: '0',
  type: 'AIR', fanCount: '1', radiatorSize: '240', hasScreen: 'false', compatibleSockets: ['AM4', 'AM5'], tdpCapacity: '', coolerHeight: '',
  interface: 'PCIe 4.0', readSpeed: '', writeSpeed: '', m2FormFactor: '2280',
  screenSize: '15.6', refreshRate: '60', panelType: 'IPS', resolution: '1920x1080',
  processor: 'Intel Core i5', ram: '8GB', storage: '512GB SSD',
  hasDedicatedGpu: 'false', gpuBrand: '', gpuModel: '', includesWindows: 'true',
  coolerType: 'No especificado', psuWatts: '', caseModel: '',
  responseTimeMs: '', ports: [] as string[], hasSpeakers: 'false',
  switchType: 'Mecánico', layout: 'Español', connection: 'USB',
  dpi: '16000', sensor: 'Óptico', wireless: 'false',
  brand: '', keyboardType: 'Membrana', connections: ['Cableado'] as string[], layoutLanguage: 'Español',
  hasLighting: 'false', keyboardFormFactor: '',
  mouseType: 'Oficina', buttonCount: '', pollingRateHz: '1000', weightGrams: '', powerType: 'Ninguno',
  widthCm: '', lengthCm: '', hasLed: 'false',
  color: '', material: 'Cuero sintetico', maxWeightKg: '', surface: '', weightKg: '',
  licenseType: 'Permanente', platform: 'Windows',
  driverSize: '50', impedance: '32', micType: 'Unidireccional', noiseCancel: 'false',
};

const createInitialFormData = (category = '') => ({
  ...INITIAL_FORM_DATA,
  category,
  supportedM2FormFactors: [...INITIAL_FORM_DATA.supportedM2FormFactors],
  compatibleSockets: [...INITIAL_FORM_DATA.compatibleSockets],
  ports: [...INITIAL_FORM_DATA.ports],
  connections: [...INITIAL_FORM_DATA.connections],
});

const NON_NEGATIVE_FIELDS = new Set([
  'price', 'stock', 'cores', 'threads', 'tdp', 'memorySlots', 'm2Slots', 'capacity', 'speed',
  'modules', 'vram', 'length', 'fans', 'wattage', 'maxGpuLength', 'includedFans',
  'fanCount', 'radiatorSize', 'tdpCapacity', 'coolerHeight', 'readSpeed', 'writeSpeed',
  'refreshRate', 'psuWatts', 'responseTimeMs', 'dpi', 'buttonCount', 'weightGrams',
  'widthCm', 'lengthCm', 'maxWeightKg', 'weightKg', 'driverSize', 'impedance',
]);

const NO_NEGATIVE_TEXT_FIELDS = new Set(['frequency']);

const NAME_REGEX = /^[A-Za-zÁÉÍÓÚáéíóúÑñ0-9().,+\-/%\s]{10,120}$/;
const DESCRIPTION_REGEX = /^[A-Za-zÁÉÍÓÚáéíóúÑñ0-9().,;:+\-/%\s]{20,1200}$/;

export default function AddProductPage() {
  const [loading, setLoading] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [formResetKey, setFormResetKey] = useState(0);
  
  // Estado para el manejo del menú de categorías
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
      if (formData.compatibleSockets.length === 0) {
        return 'Selecciona al menos un socket compatible para el cooler.';
      }
      if (Number(formData.tdpCapacity) <= 0) {
        return 'El TDP soportado del cooler debe ser mayor a 0.';
      }
    }

    if (formData.category === 'STORAGE') {
      const isM2 = formData.type.includes('M.2') || formData.type.toUpperCase().includes('NVME');
      if (isM2 && !formData.m2FormFactor) {
        return 'Selecciona el tamaño fisico M.2 del almacenamiento.';
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

  // Cuando cambia el departamento, reseteamos la categoría y la información básica
  useEffect(() => {
    if (!selectedDept) return;
    // @ts-ignore
    const firstCategory = DEPARTMENTS[selectedDept][0].value;
    
    setFormData(createInitialFormData(firstCategory));
    
    // También resetear las imágenes
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
        keyboardFormFactor: value === 'Mecanico' || value === 'Magnetico' ? formData.keyboardFormFactor : '',
      });
      return;
    }

    setFormData({ ...formData, [name]: type === 'checkbox' ? String(checked) : value });
  };
  const handleMultiSelectChange = (field: 'compatibleSockets' | 'supportedM2FormFactors' | 'ports' | 'connections', value: string) => {
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
      alert('⚠️ Debes subir al menos 1 imagen del producto');
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
      
      // Agregar las imágenes
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
          
          {/* 1. INFORMACIÓN GENERAL (Siempre visible) */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
            <h2 className="text-xl font-bold mb-6 text-gray-800 border-b pb-2">Información Básica</h2>
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
                <label className="label-admin">Descripción del Producto</label>
                <textarea 
                  name="description" 
                  rows={4}
                  onChange={handleChange} 
                  className="input-admin resize-none" 
                  placeholder="Describe las características principales del producto..." 
                />
              </div>
              <div className="col-span-2">
                 <label className="label-admin">Imágenes del Producto (Máximo 5)</label>
                 <ImageUploader
                   mode="product"
                   files={imageFiles}
                   onFilesChange={setImageFiles}
                   maxFiles={5}
                   helperText="Sube entre 1 y 5 imágenes. La primera será la portada. Recomendación: imágenes cuadradas de 550 x 550 px, fondo limpio, formato JPG, PNG o WEBP."
                 />
              </div>
            </div>
          </div>

          {/* 2. ESPECIFICACIONES TÉCNICAS (Dinámico) */}
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
                    <label className="label-admin">TDP (Watts)</label>
                    <input name="tdp" type="number" onChange={handleChange} className="input-admin" placeholder="Ej: 105" required />
                    <span className="text-xs text-gray-500">Crucial para calcular fuente y cooler.</span>
                  </div>
                  <div>
                    <label className="label-admin">Núcleos</label>
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
                    <label className="label-admin">Gráficos Integrados</label>
                    <select name="integratedGraphics" onChange={handleChange} className="input-admin">
                      <option value="false">No</option>
                      <option value="true">Sí</option>
                    </select>
                  </div>
                  <div>
                    <label className="label-admin">¿Incluye Cooler?</label>
                    <select name="includesCooler" onChange={handleChange} className="input-admin">
                      <option value="false">No (Requiere comprar aparte)</option>
                      <option value="true">Sí (De stock)</option>
                    </select>
                  </div>
                </>
              )}

              {/* --- MOTHERBOARD --- */}
              {formData.category === 'MOTHERBOARD' && (
                <>
                  <div className="col-span-2 flex items-center gap-2 text-blue-800 font-bold border-b border-blue-200 pb-2"><FiGrid/> Datos de Placa</div>
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
                    <label className="label-admin">Tamaños M.2 soportados</label>
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
                    <label className="label-admin">Capacidad Total (GB)</label>
                    <select name="capacity" onChange={handleChange} className="input-admin">
                      {RAM_CAPACITIES.map(c => <option key={c} value={c}>{c} GB</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label-admin">Kit (Módulos)</label>
                    <select name="modules" onChange={handleChange} className="input-admin">
                      <option value="1">1 Módulo (Single)</option>
                      <option value="2">2 Módulos (Dual Kit)</option>
                      <option value="4">4 Módulos (Quad Kit)</option>
                    </select>
                  </div>
                  <div>
                    <label className="label-admin">Velocidad (MHz)</label>
                    <input name="speed" type="number" onChange={handleChange} className="input-admin" placeholder="Ej: 6000" />
                  </div>
                  <div>
                    <label className="label-admin">Iluminación RGB</label>
                    <select name="hasRGB" onChange={handleChange} className="input-admin">
                      <option value="false">No</option>
                      <option value="true">Sí</option>
                    </select>
                  </div>
                </>
              )}

              {/* --- GPU --- */}
              {formData.category === 'GPU' && (
                <>
                  <div className="col-span-2 flex items-center gap-2 text-blue-800 font-bold border-b border-blue-200 pb-2"><FiMonitor/> Datos de Video</div>
                  <div>
                    <label className="label-admin">Chipset</label>
                    <select name="chipset" onChange={handleChange} className="input-admin">
                      {GPU_CHIPSETS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label-admin">VRAM (GB)</label>
                    <input name="vram" type="number" onChange={handleChange} className="input-admin" placeholder="Ej: 8, 12, 16" />
                  </div>
                  <div>
                    <label className="label-admin">Largo (mm)</label>
                    <input name="length" type="number" onChange={handleChange} className="input-admin" placeholder="Ej: 320" required />
                    <span className="text-xs text-red-500">Vital para validar con Case.</span>
                  </div>
                  <div>
                    <label className="label-admin">Consumo (Watts)</label>
                    <input name="tdp" type="number" onChange={handleChange} className="input-admin" placeholder="Ej: 280" required />
                    <span className="text-xs text-red-500">Vital para validar Fuente.</span>
                  </div>
                  <div>
                    <label className="label-admin">Ventiladores</label>
                    <input name="fans" type="number" onChange={handleChange} className="input-admin" placeholder="Ej: 2 o 3" />
                  </div>
                </>
              )}

              {/* --- FUENTE (PSU) --- */}
              {formData.category === 'PSU' && (
                <>
                  <div className="col-span-2 flex items-center gap-2 text-blue-800 font-bold border-b border-blue-200 pb-2"><FiZap/> Datos de Fuente</div>
                  <div>
                    <label className="label-admin">Potencia (Watts)</label>
                    <input name="wattage" type="number" onChange={handleChange} className="input-admin" placeholder="Ej: 750" required />
                  </div>
                  <div>
                    <label className="label-admin">Certificación</label>
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
                      <option value="ATX">ATX (Estándar)</option>
                      <option value="SFX">SFX (Pequeña)</option>
                    </select>
                  </div>
                </>
              )}

              {/* --- GABINETE (CASE) --- */}
              {formData.category === 'CASE' && (
                <>
                  <div className="col-span-2 flex items-center gap-2 text-blue-800 font-bold border-b border-blue-200 pb-2"><FiBox/> Datos de Gabinete</div>
                  <div>
                    <label className="label-admin">Soporte Placa</label>
                    <select name="formFactor" onChange={handleChange} className="input-admin">
                      {FORM_FACTORS.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label-admin">Máx Largo GPU (mm)</label>
                    <input name="maxGpuLength" type="number" onChange={handleChange} className="input-admin" placeholder="Ej: 340" required />
                  </div>
                  <div>
                    <label className="label-admin">Incluye Fuente?</label>
                    <select name="includesPsu" onChange={handleChange} className="input-admin">
                      <option value="false">No</option>
                      <option value="true">Sí (Genérica)</option>
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
                  <div className="col-span-2 flex items-center gap-2 text-blue-800 font-bold border-b border-blue-200 pb-2"><FiWind/> Datos de Refrigeración</div>
                  <div className="col-span-2">
                    <label className="label-admin">Tipo de Refrigeración</label>
                    <div className="flex gap-4 mt-2">
                      <label className="flex items-center gap-2 border p-3 rounded-lg cursor-pointer hover:bg-blue-50">
                        <input type="radio" name="type" value="AIR" checked={formData.type === 'AIR'} onChange={handleChange} />
                        Aire (Torre)
                      </label>
                      <label className="flex items-center gap-2 border p-3 rounded-lg cursor-pointer hover:bg-blue-50">
                        <input type="radio" name="type" value="AIO" checked={formData.type === 'AIO'} onChange={handleChange} />
                        Líquida (AIO)
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

                  {formData.type === 'AIR' && (
                    <div>
                      <label className="label-admin">Altura del cooler (mm)</label>
                      <input name="coolerHeight" type="number" onChange={handleChange} className="input-admin" placeholder="Ej: 155" />
                    </div>
                  )}

                  {formData.type === 'AIO' && (
                    <div>
                      <label className="label-admin">Tamaño Radiador</label>
                      <select name="radiatorSize" onChange={handleChange} className="input-admin">
                        <option value="120">120mm</option>
                        <option value="240">240mm</option>
                        <option value="280">280mm</option>
                        <option value="360">360mm</option>
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="label-admin">Tiene Pantalla LCD?</label>
                    <select name="hasScreen" onChange={handleChange} className="input-admin">
                      <option value="false">No</option>
                      <option value="true">Sí</option>
                    </select>
                  </div>
                  <div>
                    <label className="label-admin">RGB?</label>
                    <select name="hasRGB" onChange={handleChange} className="input-admin">
                      <option value="false">No</option>
                      <option value="true">Sí</option>
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
                      <label className="label-admin">Generación</label>
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
                      <label className="label-admin">Tamaño fisico M.2</label>
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
                  <div><label className="label-admin">Procesador</label><input name="processor" onChange={handleChange} className="input-admin" placeholder="Ej: Intel Core i7-13700H" /></div>
                  <div><label className="label-admin">Memoria RAM</label><input name="ram" onChange={handleChange} className="input-admin" placeholder="Ej: 16GB DDR5" /></div>
                  <div><label className="label-admin">Almacenamiento</label><input name="storage" onChange={handleChange} className="input-admin" placeholder="Ej: 1TB NVMe" /></div>
                  <div>
                    <label className="label-admin">Tiene gráfica dedicada</label>
                    <select name="hasDedicatedGpu" onChange={handleChange} className="input-admin">
                      <option value="false">No (Gráficos Integrados)</option>
                      <option value="true">Sí</option>
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
                      <div><label className="label-admin">Tamaño Pantalla</label><input name="screenSize" onChange={handleChange} className="input-admin" placeholder='15.6"' /></div>
                      <div><label className="label-admin">Tasa Refresco (Hz)</label><input name="refreshRate" type="number" onChange={handleChange} className="input-admin" /></div>
                      <div>
                        <label className="label-admin">¿Incluye Windows de serie?</label>
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
                   <div><label className="label-admin">Tipo de Licencia</label><select name="licenseType" onChange={handleChange} className="input-admin"><option>Permanente</option><option>Suscripción 1 Año</option><option>OEM</option></select></div>
                   <div><label className="label-admin">Plataforma</label><select name="platform" onChange={handleChange} className="input-admin"><option>Windows</option><option>Mac</option><option>Android</option></select></div>
                 </>
              )}

              {/* ================= PERIFÉRICOS ================= */}

              {formData.category === 'MONITOR' && (
                 <>
                   <div><label className="label-admin">Tamaño (Pulgadas)</label><input name="screenSize" onChange={handleChange} className="input-admin" /></div>
                   <div><label className="label-admin">Resolución</label><input name="resolution" onChange={handleChange} className="input-admin" placeholder="1920x1080" /></div>
                   <div><label className="label-admin">Panel</label><select name="panelType" onChange={handleChange} className="input-admin">{PANEL_TYPES.map(p=><option key={p} value={p}>{p}</option>)}</select></div>
                   <div><label className="label-admin">Hz</label><input name="refreshRate" type="number" onChange={handleChange} className="input-admin" /></div>
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

              {formData.category === 'KEYBOARD_OLD' && (
                 <>
                   <div><label className="label-admin">Conexión</label><select name="connection" onChange={handleChange} className="input-admin"><option>USB (Cable)</option><option>Inalámbrico (USB/BT)</option></select></div>
                   <div><label className="label-admin">Tipo Switch</label><input name="switchType" onChange={handleChange} className="input-admin" placeholder="Ej: Red / Blue" /></div>
                   <div><label className="label-admin">Idioma (Layout)</label><input name="layout" onChange={handleChange} className="input-admin" placeholder="Español / Inglés" /></div>
                   <div><label className="label-admin">Es Gamer (RGB)?</label><select name="hasRGB" onChange={handleChange} className="input-admin"><option value="true">Sí</option><option value="false">No</option></select></div>
                 </>
              )}

              {formData.category === 'MOUSE_OLD' && (
                 <>
                   <div><label className="label-admin">Conexión</label><select name="connection" onChange={handleChange} className="input-admin"><option>USB (Cable)</option><option>Inalámbrico (USB/BT)</option></select></div>
                   <div><label className="label-admin">DPI Máximo</label><input name="dpi" type="number" onChange={handleChange} className="input-admin" placeholder="Ej: 16000" /></div>
                   <div><label className="label-admin">Sensor</label><input name="sensor" onChange={handleChange} className="input-admin" placeholder="Óptico / Láser" /></div>
                   <div><label className="label-admin">Es Gamer (RGB)?</label><select name="hasRGB" onChange={handleChange} className="input-admin"><option value="true">Sí</option><option value="false">No</option></select></div>
                 </>
              )}

              {formData.category === 'CHAIR_OLD' && (
                <>
                  <div className="col-span-2 text-center py-6 text-gray-500 italic border-2 border-dashed border-gray-300 rounded-xl">
                    Esta categoría solo requiere nombre, precio y stock por ahora.
                  </div>
                </>
              )}

              {formData.category === 'KEYBOARD' && (
                <>
                  <div><label className="label-admin">Marca</label><input name="brand" onChange={handleChange} className="input-admin" placeholder="Ej: Logitech, Redragon, Razer" /></div>
                  <div><label className="label-admin">Tipo de teclado</label><select name="keyboardType" onChange={handleChange} className="input-admin">{KEYBOARD_TYPES.map(type => <option key={type} value={type}>{type}</option>)}</select></div>
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
                  <div><label className="label-admin">Idioma (Layout)</label><select name="layoutLanguage" onChange={handleChange} className="input-admin">{LAYOUT_LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}</select></div>
                  {formData.keyboardType === 'Semi-mecanico' && <div><label className="label-admin">Tiene luces</label><select name="hasLighting" onChange={handleChange} className="input-admin"><option value="false">No</option><option value="true">Si</option></select></div>}
                  {(formData.keyboardType === 'Mecanico' || formData.keyboardType === 'Magnetico') && <div><label className="label-admin">Tipo de switch</label><input name="switchType" onChange={handleChange} className="input-admin" placeholder="Ej: Red, Blue, Magnetic HE" /></div>}
                  {(formData.keyboardType === 'Mecanico' || formData.keyboardType === 'Magnetico') && <div><label className="label-admin">Formato</label><input name="keyboardFormFactor" onChange={handleChange} className="input-admin" placeholder="Ej: TKL, 75%, Alice, compacto" /></div>}
                </>
              )}

              {formData.category === 'MOUSE' && (
                <>
                  <div><label className="label-admin">Marca</label><input name="brand" onChange={handleChange} className="input-admin" placeholder="Ej: Logitech, Razer" /></div>
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
                  <div><label className="label-admin">Marca</label><input name="brand" onChange={handleChange} className="input-admin" /></div>
                  <div><label className="label-admin">Ancho (mm)</label><input name="widthCm" type="number" onChange={handleChange} className="input-admin" placeholder="Ej: 900" /></div>
                  <div><label className="label-admin">Largo (mm)</label><input name="lengthCm" type="number" onChange={handleChange} className="input-admin" placeholder="Ej: 400" /></div>
                  <div><label className="label-admin">Tiene LEDs</label><select name="hasLed" onChange={handleChange} className="input-admin"><option value="false">No</option><option value="true">Si</option></select></div>
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
                  <div className="col-span-2 flex items-center gap-2 text-blue-800 font-bold border-b border-blue-200 pb-2"><FiHeadphones/> Datos de Audífonos</div>
                  <div>
                    <label className="label-admin">Conexión</label>
                    <select name="connection" onChange={handleChange} className="input-admin">
                      <option value="USB">USB (Cable)</option>
                      <option value="3.5mm Jack">3.5mm Jack</option>
                      <option value="Inalámbrico 2.4GHz">Inalámbrico 2.4GHz</option>
                      <option value="Bluetooth">Bluetooth</option>
                    </select>
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
                    <label className="label-admin">Micrófono</label>
                    <select name="micType" onChange={handleChange} className="input-admin">
                      <option value="Unidireccional">Unidireccional</option>
                      <option value="Bidireccional">Bidireccional</option>
                      <option value="Omnidireccional">Omnidireccional</option>
                      <option value="Sin micrófono">Sin micrófono</option>
                    </select>
                  </div>
                  <div>
                    <label className="label-admin">Cancelación de Ruido</label>
                    <select name="noiseCancel" onChange={handleChange} className="input-admin">
                      <option value="false">No</option>
                      <option value="true">Sí (ANC)</option>
                    </select>
                  </div>
                  <div>
                    <label className="label-admin">RGB?</label>
                    <select name="hasRGB" onChange={handleChange} className="input-admin">
                      <option value="false">No</option>
                      <option value="true">Sí</option>
                    </select>
                  </div>
                </>
              )}

              {formData.category === 'MICROPHONE' && (
                <>
                  <div className="col-span-2 flex items-center gap-2 text-blue-800 font-bold border-b border-blue-200 pb-2"><FiHeadphones/> Datos de Micrófono</div>
                  <div>
                    <label className="label-admin">Conexión</label>
                    <select name="connection" onChange={handleChange} className="input-admin">
                      <option value="USB">USB</option>
                      <option value="XLR">XLR (Profesional)</option>
                      <option value="3.5mm Jack">3.5mm Jack</option>
                    </select>
                  </div>
                  <div>
                    <label className="label-admin">Patrón Polar</label>
                    <select name="micType" onChange={handleChange} className="input-admin">
                      <option value="Cardioide">Cardioide</option>
                      <option value="Omnidireccional">Omnidireccional</option>
                      <option value="Bidireccional">Bidireccional</option>
                      <option value="Estéreo">Estéreo</option>
                    </select>
                  </div>
                  <div>
                    <label className="label-admin">RGB?</label>
                    <select name="hasRGB" onChange={handleChange} className="input-admin">
                      <option value="false">No</option>
                      <option value="true">Sí</option>
                    </select>
                  </div>
                </>
              )}

              {formData.category === 'SPEAKER' && (
                <>
                  <div className="col-span-2 flex items-center gap-2 text-blue-800 font-bold border-b border-blue-200 pb-2"><FiHeadphones/> Datos de Parlantes</div>
                  <div>
                    <label className="label-admin">Conexión</label>
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
                      <option value="true">Sí</option>
                    </select>
                  </div>
                </>
              )}

            </div>
          </div>
        </div>

        {/* === COLUMNA DERECHA: SELECCIÓN DE CATEGORÍA (Ocupa 4 columnas) === */}
        <div className="lg:col-span-4 space-y-6">
          
          <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200 sticky top-4">
             <h3 className="text-lg font-black text-gray-800 mb-6">Clasificación</h3>
             
             {/* 1. SELECCIONAR DEPARTAMENTO */}
             <div className="mb-6">
               <label className="label-admin mb-2">1. Categoría</label>
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

             {/* 2. SELECCIONAR TIPO ESPECÍFICO */}
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

             {/* BOTÓN DE GUARDADO */}
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
             <strong>💡 Tip:</strong> Asegúrate de elegir la categoría correcta para que el producto aparezca en los filtros de búsqueda de la tienda.
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
