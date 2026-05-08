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

const CPU_BRANDS = ['AMD', 'Intel'];
const CPU_SOCKETS_BY_BRAND: Record<string, string[]> = {
  AMD: ['AM4', 'AM5'],
  Intel: ['LGA 1200', 'LGA 1700', 'LGA 1851'],
};
const SOCKETS = ['AM4', 'AM5', 'LGA 1200', 'LGA 1700', 'LGA 1851'];
const M2_FORM_FACTORS = ['2230', '2242', '2260', '2280', '22110'];
const STORAGE_TYPES = ['SSD 2.5', 'NVMe M.2', 'M.2 SATA', 'HDD 3.5'];
const NVME_GENS = ['SATA', 'PCIe 3.0', 'PCIe 4.0', 'PCIe 5.0'];
const FORM_FACTORS = ['ATX', 'Micro-ATX', 'Mini-ITX', 'E-ATX'];
const RAM_TYPES = ['DDR4', 'DDR5'];
const DESKTOP_COOLER_TYPES = ['De serie', 'Aire (Torre)', 'Liquida (AIO)', 'No especificado'];
const PANEL_TYPES = ['IPS', 'VA', 'TN', 'OLED'];
const MONITOR_PORTS = ['VGA', 'HDMI', 'DisplayPort', 'USB-C'];
const PERIPHERAL_CONNECTIONS = ['Cableado', 'Bluetooth', 'Dongle USB'];
const KEYBOARD_TYPES = ['Membrana', 'Semi-mecanico', 'Mecanico', 'Magnetico'];
const LAYOUT_LANGUAGES = ['Español', 'Ingles'];
const MOUSE_TYPES = ['Oficina', 'Gamer'];
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
  tdp: string;
  integratedGraphics: string;
  includesCooler: string;
  formFactor: string;
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
  capacity: string;
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
  tdp: '',
  integratedGraphics: 'false',
  includesCooler: 'false',
  formFactor: 'ATX',
  memoryType: 'DDR5',
  memorySlots: '4',
  m2Slots: '2',
  supportedM2FormFactors: ['2280'],
  type: 'AIR',
  compatibleSockets: ['AM4', 'AM5'],
  tdpCapacity: '',
  coolerHeight: '',
  radiatorSize: '240',
  hasRGB: 'false',
  hasScreen: 'false',
  capacity: '',
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
  resolution: '1920x1080',
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
  layoutLanguage: 'Español',
  hasLighting: 'false',
  switchType: '',
  keyboardFormFactor: 'Completo',
  weightGrams: '',
  mouseType: 'Oficina',
  buttonCount: '',
  dpi: '',
  pollingRateHz: '1000',
  powerType: 'Ninguno',
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
          tdp: String(cpu.tdp ?? ''),
          integratedGraphics: boolToString(cpu.integratedGraphics),
          includesCooler: boolToString(cpu.includesCooler),
          formFactor: motherboard.formFactor ?? 'ATX',
          memoryType: motherboard.memoryType ?? 'DDR5',
          memorySlots: String(motherboard.memorySlots ?? '4'),
          m2Slots: String(motherboard.m2Slots ?? '2'),
          supportedM2FormFactors: arrayFromSpecs(motherboard.supportedM2FormFactors, ['2280']),
          type: cooler.type ?? storage.type ?? 'AIR',
          compatibleSockets: arrayFromSpecs(cooler.compatibleSockets ?? cooler.socketSupport, ['AM4', 'AM5']),
          tdpCapacity: String(cooler.tdpCapacity ?? ''),
          coolerHeight: String(cooler.coolerHeight ?? ''),
          radiatorSize: String(cooler.radiatorSize ?? '240'),
          hasRGB: boolToString(cooler.hasRGB),
          hasScreen: boolToString(cooler.hasScreen),
          capacity: String(storage.capacity ?? ''),
          interface: storage.interface ?? 'PCIe 4.0',
          readSpeed: String(storage.readSpeed ?? ''),
          writeSpeed: String(storage.writeSpeed ?? ''),
          m2FormFactor: storage.m2FormFactor ?? '2280',
          processor: laptop.processor ?? desktop.processor ?? '',
          ram: laptop.ram ?? desktop.ram ?? '',
          storage: laptop.storage ?? desktop.storage ?? '',
          screenSize: laptop.screenSize ?? monitor.screenSize ?? '15.6',
          refreshRate: String(laptop.refreshRate ?? monitor.refreshRate ?? '60'),
          panelType: laptop.panelType ?? monitor.panelType ?? 'IPS',
          resolution: monitor.resolution ?? '1920x1080',
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
          brand: keyboard.brand ?? mouse.brand ?? mousepad.brand ?? chair.brand ?? desk.brand ?? '',
          keyboardType: keyboard.keyboardType ?? 'Membrana',
          connections: arrayFromSpecs(keyboard.connections ?? mouse.connections, ['Cableado']),
          layoutLanguage: keyboard.layoutLanguage ?? keyboard.layout ?? 'Español',
          hasLighting: boolToString(keyboard.hasLighting ?? keyboard.hasRGB),
          switchType: keyboard.switchType ?? '',
          keyboardFormFactor: keyboard.keyboardFormFactor ?? '',
          weightGrams: String(mouse.weightGrams ?? ''),
          mouseType: mouse.mouseType ?? 'Oficina',
          buttonCount: String(mouse.buttonCount ?? ''),
          dpi: String(mouse.dpi ?? ''),
          pollingRateHz: String(mouse.pollingRateHz ?? '1000'),
          powerType: mouse.powerType ?? 'Ninguno',
          widthCm: String(mousepad.widthCm ?? ''),
          lengthCm: String(mousepad.lengthCm ?? ''),
          hasLed: boolToString(mousepad.hasLed),
          color: chair.color ?? desk.color ?? '',
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
        keyboardFormFactor: value === 'Mecanico' || value === 'Magnetico' ? prev.keyboardFormFactor : '',
      }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const toggleArrayValue = (field: 'compatibleSockets' | 'supportedM2FormFactors' | 'ports' | 'connections', value: string) => {
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
        'tdp',
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

    if (Number(formData.price) <= 0) {
      return 'El precio debe ser mayor a 0.';
    }

    if (formData.isOnSale === 'true') {
      const price = Number(formData.price);
      const salePrice = Number(formData.salePrice);
      if (!Number.isFinite(salePrice) || salePrice <= 0) {
        return 'El precio de oferta debe ser mayor a 0.';
      }

      if (salePrice >= price) {
        return 'El precio de oferta debe ser menor al precio normal.';
      }
    }

    if (formData.category === 'CPU') {
      const validSockets = CPU_SOCKETS_BY_BRAND[formData.cpuBrand] ?? [];
      if (!validSockets.includes(formData.socket)) return 'El socket no corresponde a la marca del procesador.';
      if (Number(formData.tdp) <= 0) return 'El TDP del procesador debe ser mayor a 0.';
    }

    if (formData.category === 'COOLER') {
      if (formData.compatibleSockets.length === 0) return 'Selecciona al menos un socket compatible para el cooler.';
      if (Number(formData.tdpCapacity) <= 0) return 'El TDP soportado del cooler debe ser mayor a 0.';
    }

    if (formData.category === 'STORAGE') {
      const isM2 = formData.type.includes('M.2') || formData.type.toUpperCase().includes('NVME');
      if (isM2 && !formData.m2FormFactor) return 'Selecciona el tamaño fisico M.2.';
    }

    if (formData.category === 'PC_DESKTOP' && formData.psuWatts !== '' && Number(formData.psuWatts) < 100) {
      return 'La fuente de poder debe ser un numero positivo. Recomendado minimo 100W.';
    }

    if (formData.category === 'MONITOR' && formData.responseTimeMs !== '' && Number(formData.responseTimeMs) < 0.1) {
      return 'El tiempo de respuesta debe ser mayor o igual a 0.1 ms.';
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
              <NumberField label="TDP (Watts)" value={formData.tdp} onChange={(value) => updateField('tdp', value)} />
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
              <SelectField label="Socket" value={formData.socket} onChange={(value) => updateField('socket', value)} options={SOCKETS} />
              <SelectField label="Formato" value={formData.formFactor} onChange={(value) => updateField('formFactor', value)} options={FORM_FACTORS} />
              <SelectField label="Tipo de RAM" value={formData.memoryType} onChange={(value) => updateField('memoryType', value)} options={RAM_TYPES} />
              <NumberField label="Slots RAM" value={formData.memorySlots} onChange={(value) => updateField('memorySlots', value)} />
              <NumberField label="Slots M.2" value={formData.m2Slots} onChange={(value) => updateField('m2Slots', value)} />
              <MultiCheckField label="Tamaños M.2 soportados" options={M2_FORM_FACTORS} values={formData.supportedM2FormFactors} onToggle={(value) => toggleArrayValue('supportedM2FormFactors', value)} />
            </div>
          </section>
        )}

        {formData.category === 'COOLER' && (
          <section className="rounded-xl border border-gray-200 bg-gray-50 p-5">
            <h2 className="mb-4 font-black text-gray-800">Especificaciones Cooler</h2>
            <div className="grid grid-cols-2 gap-4">
              <SelectField label="Tipo" value={formData.type} onChange={(value) => updateField('type', value)} options={['AIR', 'AIO']} labels={{ AIR: 'Aire (Torre)', AIO: 'Liquida (AIO)' }} />
              <NumberField label="TDP soportado (Watts)" value={formData.tdpCapacity} onChange={(value) => updateField('tdpCapacity', value)} />
              {formData.type === 'AIR' && <NumberField label="Altura cooler (mm)" value={formData.coolerHeight} onChange={(value) => updateField('coolerHeight', value)} />}
              {formData.type === 'AIO' && <SelectField label="Radiador" value={formData.radiatorSize} onChange={(value) => updateField('radiatorSize', value)} options={['120', '240', '280', '360']} labels={{ 120: '120mm', 240: '240mm', 280: '280mm', 360: '360mm' }} />}
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
              <TextField label="Procesador" value={formData.processor} onChange={(value) => updateField('processor', value)} />
              <TextField label="Memoria RAM" value={formData.ram} onChange={(value) => updateField('ram', value)} />
              <TextField label="Almacenamiento" value={formData.storage} onChange={(value) => updateField('storage', value)} />
              <SelectField label="Grafica dedicada" value={formData.hasDedicatedGpu} onChange={(value) => updateField('hasDedicatedGpu', value)} options={['false', 'true']} labels={{ false: 'No', true: 'Si' }} />
              {formData.hasDedicatedGpu === 'true' && (
                <>
                  <TextField label="Marca GPU" value={formData.gpuBrand} onChange={(value) => updateField('gpuBrand', value)} />
                  <TextField label="Modelo GPU" value={formData.gpuModel} onChange={(value) => updateField('gpuModel', value)} />
                </>
              )}
              {formData.category === 'LAPTOP' && (
                <>
                  <TextField label="Tamaño pantalla" value={formData.screenSize} onChange={(value) => updateField('screenSize', value)} />
                  <NumberField label="Tasa de refresco (Hz)" value={formData.refreshRate} onChange={(value) => updateField('refreshRate', value)} />
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
              <TextField label="Tamaño" value={formData.screenSize} onChange={(value) => updateField('screenSize', value)} />
              <TextField label="Resolucion" value={formData.resolution} onChange={(value) => updateField('resolution', value)} />
              <SelectField label="Panel" value={formData.panelType} onChange={(value) => updateField('panelType', value)} options={PANEL_TYPES} />
              <NumberField label="Hz" value={formData.refreshRate} onChange={(value) => updateField('refreshRate', value)} />
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
              <TextField label="Marca" value={formData.brand} onChange={(value) => updateField('brand', value)} />
              <SelectField label="Tipo de teclado" value={formData.keyboardType} onChange={(value) => updateField('keyboardType', value)} options={KEYBOARD_TYPES} />
              <MultiCheckField label="Tipo de conexion" options={PERIPHERAL_CONNECTIONS} values={formData.connections} onToggle={(value) => toggleArrayValue('connections', value)} />
              <SelectField label="Idioma (Layout)" value={formData.layoutLanguage} onChange={(value) => updateField('layoutLanguage', value)} options={LAYOUT_LANGUAGES} />
              {formData.keyboardType === 'Semi-mecanico' && <SelectField label="Tiene luces" value={formData.hasLighting} onChange={(value) => updateField('hasLighting', value)} options={['false', 'true']} labels={{ false: 'No', true: 'Si' }} />}
              {(formData.keyboardType === 'Mecanico' || formData.keyboardType === 'Magnetico') && <TextField label="Tipo de switch" value={formData.switchType} onChange={(value) => updateField('switchType', value)} />}
              {(formData.keyboardType === 'Mecanico' || formData.keyboardType === 'Magnetico') && <TextField label="Formato" value={formData.keyboardFormFactor} onChange={(value) => updateField('keyboardFormFactor', value)} />}
            </div>
          </section>
        )}

        {formData.category === 'MOUSE' && (
          <section className="rounded-xl border border-gray-200 bg-gray-50 p-5">
            <h2 className="mb-4 font-black text-gray-800">Especificaciones Mouse</h2>
            <div className="grid grid-cols-2 gap-4">
              <TextField label="Marca" value={formData.brand} onChange={(value) => updateField('brand', value)} />
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
              <TextField label="Marca" value={formData.brand} onChange={(value) => updateField('brand', value)} />
              <NumberField label="Ancho (mm)" value={formData.widthCm} onChange={(value) => updateField('widthCm', value)} />
              <NumberField label="Largo (mm)" value={formData.lengthCm} onChange={(value) => updateField('lengthCm', value)} />
              <SelectField label="Tiene LEDs" value={formData.hasLed} onChange={(value) => updateField('hasLed', value)} options={['false', 'true']} labels={{ false: 'No', true: 'Si' }} />
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

function NumberField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-gray-700">{label}</label>
      <input type="number" min="0" value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:ring-2 focus:ring-brand-cyan" />
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
