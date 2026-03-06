'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  FiSave, FiCpu, FiGrid, FiHardDrive, FiMonitor, FiWind, 
  FiBox, FiZap, FiMousePointer, FiHeadphones, FiLayers 
} from 'react-icons/fi';
import { MdComputer, MdLaptop, MdSecurity, MdKeyboard } from 'react-icons/md';

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
    { label: 'Silla Gaming', value: 'CHAIR' },
  ],
  AUDIO: [
    { label: 'Audífonos / Headset', value: 'HEADSET' },
    { label: 'Micrófono', value: 'MICROPHONE' },
    { label: 'Parlantes', value: 'SPEAKER' },
  ]
};

// Listas de Opciones Técnicas
const SOCKETS = ["AM5", "AM4", "LGA 1700", "LGA 1200", "LGA 1851"];
const FORM_FACTORS = ["ATX", "Micro-ATX", "Mini-ITX", "E-ATX"];
const RAM_TYPES = ["DDR4", "DDR5"];
const RAM_CAPACITIES = [8, 16, 24, 32, 48, 64, 96];
const PSU_CERTS = ["Sin Certificación", "80+ White", "80+ Bronze", "80+ Gold", "80+ Platinum", "80+ Titanium"];
const GPU_CHIPSETS = ["NVIDIA GeForce", "AMD Radeon", "Intel Arc"];
const STORAGE_TYPES = ["SSD 2.5", "NVMe M.2", "HDD 3.5"];
const NVME_GENS = ["SATA", "PCIe 3.0", "PCIe 4.0", "PCIe 5.0"];
const PANEL_TYPES = ["IPS", "VA", "TN", "OLED"];
const LAPTOP_BRANDS = ["ASUS", "Lenovo", "HP", "Dell", "MSI", "Acer"];

export default function AddProductPage() {
  const [loading, setLoading] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  
  // Estado para el manejo del menú de categorías
  const [selectedDept, setSelectedDept] = useState('COMPONENTES');

  const [formData, setFormData] = useState({
    // Generales
    name: '', description: '', price: '', stock: '', category: 'CPU', image: '',
    
    // CPU & Mobo
    socket: 'AM5', cores: '', frequency: '', tdp: '', integratedGraphics: 'false', includesCooler: 'false',
    
    // Mobo
    memorySlots: '4', m2Slots: '2', formFactor: 'ATX',
    
    // RAM
    memoryType: 'DDR5', capacity: '16', speed: '5200', modules: '1', hasRGB: 'false',
    
    // GPU
    chipset: 'NVIDIA GeForce', vram: '8', length: '', fans: '2',
    
    // PSU
    wattage: '', certification: '80+ Bronze', modular: 'No Modular',
    
    // Case
    maxGpuLength: '', includesPsu: 'false', includedFans: '0',
    
    // Cooler
    type: 'AIR', fanCount: '1', radiatorSize: '240', hasScreen: 'false',
    
    // Storage
    interface: 'PCIe 4.0', readSpeed: '',

    // Ordenadores / Periféricos
    screenSize: '15.6', refreshRate: '60', panelType: 'IPS', resolution: '1920x1080',
    processor: 'Intel Core i5', ram: '8GB', storage: '512GB SSD',
    hasDedicatedGpu: 'false', gpuBrand: '', gpuModel: '', // GPU dedicada para laptops/PC
    switchType: 'Mecánico', layout: 'Español', connection: 'USB',
    dpi: '16000', sensor: 'Óptico', wireless: 'false',
    licenseType: 'Permanente', platform: 'Windows',
    
    // Audio
    driverSize: '50', impedance: '32', micType: 'Unidireccional', noiseCancel: 'false',
  });

  // Cuando cambia el departamento, reseteamos la categoría y la información básica
  useEffect(() => {
    // @ts-ignore
    const firstCategory = DEPARTMENTS[selectedDept][0].value;
    
    // Resetear todo el formulario manteniendo solo la nueva categoría
    setFormData({
      // Generales (RESETEAR)
      name: '', 
      description: '', 
      price: '', 
      stock: '', 
      category: firstCategory, 
      image: '',
      
      // CPU & Mobo
      socket: 'AM5', cores: '', frequency: '', tdp: '', integratedGraphics: 'false', includesCooler: 'false',
      
      // Mobo
      memorySlots: '4', m2Slots: '2', formFactor: 'ATX',
      
      // RAM
      memoryType: 'DDR5', capacity: '16', speed: '5200', modules: '1', hasRGB: 'false',
      
      // GPU
      chipset: 'NVIDIA GeForce', vram: '8', length: '', fans: '2',
      
      // PSU
      wattage: '', certification: '80+ Bronze', modular: 'No Modular',
      
      // Case
      maxGpuLength: '', includesPsu: 'false', includedFans: '0',
      
      // Cooler
      type: 'AIR', fanCount: '1', radiatorSize: '240', hasScreen: 'false',
      
      // Storage
      interface: 'PCIe 4.0', readSpeed: '',

      // Ordenadores / Periféricos
      screenSize: '15.6', refreshRate: '60', panelType: 'IPS', resolution: '1920x1080',
      processor: 'Intel Core i5', ram: '8GB', storage: '512GB SSD',
      hasDedicatedGpu: 'false', gpuBrand: '', gpuModel: '',
      switchType: 'Mecánico', layout: 'Español', connection: 'USB',
      dpi: '16000', sensor: 'Óptico', wireless: 'false',
      licenseType: 'Permanente', platform: 'Windows',
      
      // Audio
      driverSize: '50', impedance: '32', micType: 'Unidireccional', noiseCancel: 'false',
    });
    
    // También resetear las imágenes
    setImageFiles([]);
  }, [selectedDept]);

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    
    // Si se está cambiando la categoría, resetear todo el formulario
    if (name === 'category') {
      setFormData({
        name: '', 
        description: '', 
        price: '', 
        stock: '', 
        category: value, 
        image: '',
        socket: 'AM5', cores: '', frequency: '', tdp: '', integratedGraphics: 'false', includesCooler: 'false',
        memorySlots: '4', m2Slots: '2', formFactor: 'ATX',
        memoryType: 'DDR5', capacity: '16', speed: '5200', modules: '1', hasRGB: 'false',
        chipset: 'NVIDIA GeForce', vram: '8', length: '', fans: '2',
        wattage: '', certification: '80+ Bronze', modular: 'No Modular',
        maxGpuLength: '', includesPsu: 'false', includedFans: '0',
        type: 'AIR', fanCount: '1', radiatorSize: '240', hasScreen: 'false',
        interface: 'PCIe 4.0', readSpeed: '',
        screenSize: '15.6', refreshRate: '60', panelType: 'IPS', resolution: '1920x1080',
        processor: 'Intel Core i5', ram: '8GB', storage: '512GB SSD',
        hasDedicatedGpu: 'false', gpuBrand: '', gpuModel: '',
        switchType: 'Mecánico', layout: 'Español', connection: 'USB',
        dpi: '16000', sensor: 'Óptico', wireless: 'false',
        licenseType: 'Permanente', platform: 'Windows',
        driverSize: '50', impedance: '32', micType: 'Unidireccional', noiseCancel: 'false',
      });
      setImageFiles([]);
    } else {
      // Para otros campos, actualizar normalmente
      setFormData({ ...formData, [name]: type === 'checkbox' ? String(checked) : value });
    }
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    
    if (imageFiles.length === 0) {
      alert('⚠️ Debes subir al menos 1 imagen del producto');
      return;
    }
    
    setLoading(true);
    try {
      // Crear FormData para enviar archivos
      const formDataToSend = new FormData();
      
      // Agregar todos los campos del formulario
      Object.keys(formData).forEach(key => {
        // @ts-ignore
        formDataToSend.append(key, formData[key]);
      });
      
      // Agregar las imágenes
      imageFiles.forEach((file, index) => {
        formDataToSend.append('images', file);
      });
      
      await axios.post('https://pcsystemstore.onrender.com', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      alert('✅ Producto guardado correctamente');
      // Opcional: Limpiar formulario
      // window.location.reload();
    } catch (error) {
      console.error(error);
      alert('❌ Error al guardar. Revisa que el Backend soporte esta categoría y carga de archivos.');
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

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
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
                 <input 
                   type="file"
                   accept="image/*"
                   multiple
                   onChange={(e) => {
                     const files = Array.from(e.target.files || []);
                     if (files.length > 5) {
                       alert('⚠️ Máximo 5 imágenes permitidas');
                       e.target.value = '';
                       return;
                     }
                     setImageFiles(files);
                   }}
                   className="input-admin cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-brand-cyan file:text-gray-900 hover:file:bg-cyan-400 file:cursor-pointer"
                 />
                 <div className="mt-2 flex items-start gap-2">
                   <p className="text-xs text-gray-400 flex-1">
                     <FiMonitor className="inline mr-1" /> 
                     Sube entre 1 y 5 imágenes. La primera será la portada.
                   </p>
                   {imageFiles.length > 0 && (
                     <span className="text-xs font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full">
                       {imageFiles.length} {imageFiles.length === 1 ? 'imagen' : 'imágenes'} seleccionada{imageFiles.length > 1 ? 's' : ''}
                     </span>
                   )}
                 </div>
                 {imageFiles.length > 0 && (
                   <div className="mt-3 flex flex-wrap gap-2">
                     {imageFiles.map((file, index) => (
                       <div key={index} className="relative group">
                         <img 
                           src={URL.createObjectURL(file)} 
                           alt={`Preview ${index + 1}`}
                           className="w-20 h-20 object-cover rounded-lg border-2 border-gray-200"
                         />
                         <div className="absolute -top-2 -right-2 bg-brand-cyan text-gray-900 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-md">
                           {index + 1}
                         </div>
                       </div>
                     ))}
                   </div>
                 )}
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
                    <label className="label-admin">Socket</label>
                    <select name="socket" onChange={handleChange} className="input-admin">
                      {SOCKETS.map(s => <option key={s} value={s}>{s}</option>)}
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
                  
                  {formData.type === 'NVMe M.2' && (
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

                  {formData.category === 'LAPTOP' && (
                    <>
                      <div className="col-span-2 border-b pb-2 mb-2 font-bold text-gray-500 mt-4">Pantalla</div>
                      <div><label className="label-admin">Tamaño Pantalla</label><input name="screenSize" onChange={handleChange} className="input-admin" placeholder='15.6"' /></div>
                      <div><label className="label-admin">Tasa Refresco (Hz)</label><input name="refreshRate" type="number" onChange={handleChange} className="input-admin" /></div>
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
                 </>
              )}

              {formData.category === 'KEYBOARD' && (
                 <>
                   <div><label className="label-admin">Conexión</label><select name="connection" onChange={handleChange} className="input-admin"><option>USB (Cable)</option><option>Inalámbrico (USB/BT)</option></select></div>
                   <div><label className="label-admin">Tipo Switch</label><input name="switchType" onChange={handleChange} className="input-admin" placeholder="Ej: Red / Blue" /></div>
                   <div><label className="label-admin">Idioma (Layout)</label><input name="layout" onChange={handleChange} className="input-admin" placeholder="Español / Inglés" /></div>
                   <div><label className="label-admin">Es Gamer (RGB)?</label><select name="hasRGB" onChange={handleChange} className="input-admin"><option value="true">Sí</option><option value="false">No</option></select></div>
                 </>
              )}

              {formData.category === 'MOUSE' && (
                 <>
                   <div><label className="label-admin">Conexión</label><select name="connection" onChange={handleChange} className="input-admin"><option>USB (Cable)</option><option>Inalámbrico (USB/BT)</option></select></div>
                   <div><label className="label-admin">DPI Máximo</label><input name="dpi" type="number" onChange={handleChange} className="input-admin" placeholder="Ej: 16000" /></div>
                   <div><label className="label-admin">Sensor</label><input name="sensor" onChange={handleChange} className="input-admin" placeholder="Óptico / Láser" /></div>
                   <div><label className="label-admin">Es Gamer (RGB)?</label><select name="hasRGB" onChange={handleChange} className="input-admin"><option value="true">Sí</option><option value="false">No</option></select></div>
                 </>
              )}

              {formData.category === 'CHAIR' && (
                <>
                  <div className="col-span-2 text-center py-6 text-gray-500 italic border-2 border-dashed border-gray-300 rounded-xl">
                    Esta categoría solo requiere nombre, precio y stock por ahora.
                  </div>
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
                 className="w-full p-4 text-lg border-2 border-gray-300 rounded-xl font-bold outline-none cursor-pointer bg-gray-50 focus:bg-white focus:border-black transition text-gray-900"
               >
                 {/* @ts-ignore */}
                 {DEPARTMENTS[selectedDept].map((item: any) => (
                   <option key={item.value} value={item.value}>
                     {item.label}
                   </option>
                 ))}
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