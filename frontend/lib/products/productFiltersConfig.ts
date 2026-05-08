export type ProductFilterOption = {
  label: string;
  value: string;
};

export type ProductFilterConfig = {
  key: string;
  label: string;
  type: 'select' | 'number' | 'text';
  options?: ProductFilterOption[];
  optionSource?: string;
  dependsOn?: {
    key: string;
    values: string[];
  };
};

export const GENERAL_PRODUCT_FILTERS: ProductFilterConfig[] = [
  { key: 'search', label: 'Buscar', type: 'text' },
  { key: 'minPrice', label: 'Precio minimo', type: 'number' },
  { key: 'maxPrice', label: 'Precio maximo', type: 'number' },
  {
    key: 'inStock',
    label: 'Disponibilidad',
    type: 'select',
    options: [
      { label: 'Todos', value: '' },
      { label: 'En stock', value: 'true' },
      { label: 'Sin stock', value: 'false' },
    ],
  },
  {
    key: 'isOnSale',
    label: 'Oferta',
    type: 'select',
    options: [
      { label: 'Todos', value: '' },
      { label: 'En oferta', value: 'true' },
      { label: 'Sin oferta', value: 'false' },
    ],
  },
  {
    key: 'sortBy',
    label: 'Ordenar por',
    type: 'select',
    options: [
      { label: 'Mas recientes', value: 'createdAt:desc' },
      { label: 'Precio menor a mayor', value: 'price:asc' },
      { label: 'Precio mayor a menor', value: 'price:desc' },
      { label: 'Nombre A-Z', value: 'name:asc' },
      { label: 'Nombre Z-A', value: 'name:desc' },
      { label: 'Stock mayor a menor', value: 'stock:desc' },
    ],
  },
];

export const PRODUCT_FILTERS_BY_CATEGORY: Record<string, ProductFilterConfig[]> = {
  CPU: [
    {
      key: 'cpuBrand',
      label: 'Marca del procesador',
      type: 'select',
      options: [
        { label: 'Todos', value: '' },
        { label: 'AMD', value: 'AMD' },
        { label: 'Intel', value: 'Intel' },
      ],
    },
    {
      key: 'socket',
      label: 'Socket',
      type: 'select',
      options: [
        { label: 'Todos', value: '' },
        { label: 'AM4', value: 'AM4' },
        { label: 'AM5', value: 'AM5' },
        { label: 'LGA 1200', value: 'LGA 1200' },
        { label: 'LGA 1700', value: 'LGA 1700' },
        { label: 'LGA 1851', value: 'LGA 1851' },
      ],
    },
    { key: 'integratedGraphics', label: 'Graficos integrados', type: 'select', options: yesNoOptions() },
    { key: 'includesCooler', label: 'Incluye cooler', type: 'select', options: yesNoOptions() },
    { key: 'minTdp', label: 'TDP minimo', type: 'number' },
    { key: 'maxTdp', label: 'TDP maximo', type: 'number' },
  ],
  MOTHERBOARD: [
    { key: 'platform', label: 'Plataforma', type: 'select', options: withAll(['AMD', 'Intel']) },
    { key: 'socket', label: 'Socket', type: 'select', options: withAll(['AM4', 'AM5', 'LGA 1200', 'LGA 1700', 'LGA 1851']) },
    { key: 'brand', label: 'Marca', type: 'select', optionSource: 'brands', options: withAll(['ASUS', 'MSI', 'Gigabyte', 'ASRock', 'Biostar', 'Otra']) },
    { key: 'formFactor', label: 'Formato', type: 'select', options: withAll(['ATX', 'Micro-ATX', 'Mini-ITX']) },
    { key: 'ramType', label: 'Tipo de RAM', type: 'select', options: withAll(['DDR4', 'DDR5']) },
    { key: 'm2Slots', label: 'Slots M.2', type: 'select', options: withAll(['1', '2', '3']) },
  ],
  RAM: [
    { key: 'brand', label: 'Marca', type: 'select', optionSource: 'brands', options: withAll(['Kingston', 'Corsair', 'Crucial', 'G.Skill', 'TeamGroup', 'XPG', 'Otra']) },
    { key: 'ramType', label: 'Tipo', type: 'select', options: withAll(['DDR4', 'DDR5']) },
    { key: 'capacity', label: 'Capacidad', type: 'select', options: withAll(['8', '16', '32', '64']) },
    { key: 'speed', label: 'Frecuencia', type: 'select', options: withAll(['2666', '3200', '3600', '5200', '5600', '6000']) },
    { key: 'hasRGB', label: 'RGB', type: 'select', options: yesNoOptions() },
  ],
  GPU: [
    { key: 'brand', label: 'Marca ensambladora', type: 'select', optionSource: 'brands', options: withAll(['ASUS', 'MSI', 'Gigabyte', 'Zotac', 'PNY', 'Sapphire', 'PowerColor', 'Otra']) },
    { key: 'gpuChipset', label: 'Chipset', type: 'select', optionSource: 'gpuChipsets', options: withAll(['NVIDIA', 'AMD', 'Intel']) },
    { key: 'vram', label: 'VRAM', type: 'select', optionSource: 'vram', options: withAll(['4', '6', '8', '12', '16', '24']) },
    { key: 'minGpuTdp', label: 'TDP minimo', type: 'number' },
    { key: 'maxGpuTdp', label: 'TDP maximo', type: 'number' },
  ],
  PSU: [
    { key: 'brand', label: 'Marca', type: 'select', optionSource: 'brands', options: withAll(['Corsair', 'EVGA', 'Cooler Master', 'Seasonic', 'Thermaltake', 'MSI', 'DeepCool', 'Otra']) },
    { key: 'psuWatts', label: 'Potencia', type: 'select', optionSource: 'psuWatts', options: withAll(['450', '550', '650', '750', '850', '1000']) },
    { key: 'certification', label: 'Certificacion', type: 'select', optionSource: 'certifications', options: withAll(['80 Plus White', '80 Plus Bronze', '80 Plus Silver', '80 Plus Gold', '80 Plus Platinum', '80 Plus Titanium']) },
    { key: 'modular', label: 'Modularidad', type: 'select', options: withAll(['No modular', 'Semi modular', 'Full modular']) },
  ],
  COOLER: [
    { key: 'brand', label: 'Marca', type: 'select', optionSource: 'brands' },
    { key: 'coolerType', label: 'Tipo', type: 'select', optionSource: 'coolerTypes', options: withAll(['Aire (Torre)', 'Liquida (AIO)', 'AIR', 'AIO']) },
    { key: 'compatibleSockets', label: 'Socket compatible', type: 'select', optionSource: 'sockets', options: withAll(['AM4', 'AM5', 'LGA 1200', 'LGA 1700', 'LGA 1851']) },
    { key: 'minMaxTdp', label: 'TDP soportado minimo', type: 'number' },
    { key: 'hasRGB', label: 'RGB', type: 'select', options: yesNoOptions() },
    { key: 'hasScreen', label: 'Pantalla LCD', type: 'select', options: yesNoOptions() },
    { key: 'radiatorSize', label: 'Radiador', type: 'select', options: withAll(['120', '240', '280', '360']) },
  ],
  STORAGE: [
    { key: 'brand', label: 'Marca', type: 'select', optionSource: 'brands', options: withAll(['Kingston', 'Samsung', 'Western Digital', 'Crucial', 'Seagate', 'Lexar', 'Otra']) },
    { key: 'storageType', label: 'Tipo', type: 'select', optionSource: 'storageTypes', options: withAll(['HDD', 'SSD SATA', 'NVMe M.2', 'M.2 SATA']) },
    { key: 'generation', label: 'Generacion', type: 'select', options: withAll(['SATA', 'PCIe 3.0', 'PCIe 4.0', 'PCIe 5.0']) },
    { key: 'capacity', label: 'Capacidad', type: 'select', optionSource: 'capacities', options: withAll(['250', '500', '1000', '2000', '4000']) },
    { key: 'm2FormFactor', label: 'Tamano M.2', type: 'select', optionSource: 'm2FormFactors', options: withAll(['2230', '2242', '2260', '2280', '22110']) },
    { key: 'minReadSpeed', label: 'Lectura minima', type: 'number' },
    { key: 'minWriteSpeed', label: 'Escritura minima', type: 'number' },
  ],
  CASE: [
    { key: 'brand', label: 'Marca', type: 'select', optionSource: 'brands' },
    { key: 'formFactor', label: 'Formato soportado', type: 'select', options: withAll(['ATX', 'Micro-ATX', 'Mini-ITX']) },
    { key: 'hasRGB', label: 'RGB', type: 'select', options: yesNoOptions() },
  ],
  LAPTOP: [
    { key: 'brand', label: 'Marca', type: 'select', optionSource: 'brands', options: withAll(['ASUS', 'Lenovo', 'HP', 'Acer', 'Dell', 'MSI', 'Otra']) },
    { key: 'processor', label: 'Procesador', type: 'select', options: withAll(['Intel', 'AMD']) },
    { key: 'ram', label: 'RAM', type: 'select', options: withAll(['8GB', '16GB', '32GB', '64GB']) },
    { key: 'storage', label: 'Almacenamiento', type: 'select', options: withAll(['256GB', '512GB', '1TB', '2TB']) },
    { key: 'hasDedicatedGpu', label: 'Grafica dedicada', type: 'select', options: yesNoOptions() },
    { key: 'includesWindows', label: 'Windows de serie', type: 'select', options: yesNoOptions() },
    { key: 'screenSize', label: 'Pantalla', type: 'select', options: withAll(['14', '15.6', '16', '17.3']) },
    { key: 'refreshRateHz', label: 'Hz', type: 'select', optionSource: 'refreshRates', options: withAll(['60', '120', '144', '165', '240']) },
  ],
  PC_DESKTOP: [
    { key: 'brand', label: 'Marca', type: 'select', optionSource: 'brands' },
    { key: 'processor', label: 'Procesador', type: 'select', options: withAll(['Intel', 'AMD']) },
    { key: 'ram', label: 'RAM', type: 'select', options: withAll(['8GB', '16GB', '32GB', '64GB']) },
    { key: 'storage', label: 'Almacenamiento', type: 'select', options: withAll(['512GB', '1TB', '2TB']) },
    { key: 'hasDedicatedGpu', label: 'Grafica dedicada', type: 'select', options: yesNoOptions() },
    { key: 'gpuChipset', label: 'Marca GPU', type: 'select', options: withAll(['NVIDIA', 'AMD', 'Intel']) },
    { key: 'psuWatts', label: 'Fuente', type: 'select', optionSource: 'psuWatts', options: withAll(['450', '550', '650', '750', '850']) },
    { key: 'coolerType', label: 'Cooler incluido', type: 'select', optionSource: 'coolerTypes', options: withAll(['De serie', 'Aire (Torre)', 'Liquida (AIO)']) },
  ],
  MONITOR: [
    { key: 'brand', label: 'Marca', type: 'select', optionSource: 'brands' },
    { key: 'screenSize', label: 'Tamano', type: 'select', options: withAll(['21.5', '24', '27', '32', '34']) },
    { key: 'resolution', label: 'Resolucion', type: 'select', optionSource: 'resolutions', options: withAll(['1920x1080', '2560x1440', '3440x1440', '3840x2160']) },
    { key: 'panel', label: 'Panel', type: 'select', optionSource: 'panels', options: withAll(['IPS', 'VA', 'TN', 'OLED']) },
    { key: 'refreshRateHz', label: 'Hz', type: 'select', optionSource: 'refreshRates', options: withAll(['60', '75', '100', '144', '165', '240']) },
    { key: 'responseTimeMs', label: 'Latencia', type: 'select', options: withAll(['1', '2', '4', '5']) },
    { key: 'ports', label: 'Puertos', type: 'select', optionSource: 'ports', options: withAll(['VGA', 'HDMI', 'DisplayPort', 'USB-C']) },
    { key: 'hasSpeakers', label: 'Parlantes', type: 'select', options: yesNoOptions() },
  ],
  KEYBOARD: [
    { key: 'brand', label: 'Marca', type: 'select', optionSource: 'brands' },
    { key: 'keyboardType', label: 'Tipo teclado', type: 'select', optionSource: 'keyboardTypes', options: withAll(['Membrana', 'Semi-mecanico', 'Mecanico', 'Magnetico']) },
    { key: 'connections', label: 'Conexion', type: 'select', optionSource: 'connections', options: withAll(['Cableado', 'Bluetooth', 'Dongle USB']) },
    { key: 'layoutLanguage', label: 'Idioma', type: 'select', options: withAll(['Espanol', 'Ingles']) },
    { key: 'keyboardFormFactor', label: 'Formato', type: 'select', options: withAll(['Completo', 'TKL', '75%', '65%', '60%']) },
    { key: 'hasLighting', label: 'Luces/RGB', type: 'select', options: yesNoOptions() },
  ],
  MOUSE: [
    { key: 'brand', label: 'Marca', type: 'select', optionSource: 'brands' },
    { key: 'mouseType', label: 'Tipo mouse', type: 'select', optionSource: 'mouseTypes', options: withAll(['Oficina', 'Gamer']) },
    { key: 'connections', label: 'Conexion', type: 'select', optionSource: 'connections', options: withAll(['Cableado', 'Bluetooth', 'Dongle USB']) },
    { key: 'minDpi', label: 'DPI minimo', type: 'number' },
    { key: 'maxDpi', label: 'DPI maximo', type: 'number' },
    { key: 'pollingRateHz', label: 'Polling rate', type: 'select', options: withAll(['1000', '2000', '4000', '8000']) },
  ],
  MOUSEPAD: [
    { key: 'brand', label: 'Marca', type: 'select', optionSource: 'brands' },
    { key: 'mousepadSize', label: 'Tamano', type: 'select', options: withAll(['Pequeno', 'Mediano', 'Grande', 'XL', 'XXL']) },
    { key: 'hasLed', label: 'LEDs', type: 'select', options: yesNoOptions() },
  ],
  CHAIR: [
    { key: 'brand', label: 'Marca', type: 'select', optionSource: 'brands' },
    { key: 'color', label: 'Color', type: 'select', optionSource: 'colors' },
    { key: 'material', label: 'Material', type: 'select', optionSource: 'materials', options: withAll(['Cuero sintetico', 'Tela', 'Malla', 'Mixto', 'Otro']) },
    { key: 'minMaxWeight', label: 'Peso maximo minimo', type: 'number' },
  ],
  GAMING_DESK: [
    { key: 'brand', label: 'Marca', type: 'select', optionSource: 'brands' },
    { key: 'color', label: 'Color', type: 'select', optionSource: 'colors' },
    { key: 'surface', label: 'Superficie', type: 'select', optionSource: 'surfaces', options: withAll(['Carbono', 'Madera', 'Melamina', 'Vidrio templado', 'Otro']) },
    { key: 'minWeight', label: 'Peso minimo', type: 'number' },
  ],
};

export const SLUG_TO_CATEGORY: Record<string, string> = {
  cpu: 'CPU',
  mobo: 'MOTHERBOARD',
  ram: 'RAM',
  graficas: 'GPU',
  nvidia: 'GPU',
  amd: 'GPU',
  almacenamiento: 'STORAGE',
  solido: 'STORAGE',
  sata: 'STORAGE',
  torres: 'CASE',
  fuentes: 'PSU',
  refrigeracion: 'COOLER',
  pcs: 'PC_DESKTOP',
  laptops: 'LAPTOP',
  monitores: 'MONITOR',
  teclados: 'KEYBOARD',
  mouse: 'MOUSE',
  chairs: 'CHAIR',
};

function withAll(values: string[]): ProductFilterOption[] {
  return [{ label: 'Todos', value: '' }, ...values.map((value) => ({ label: value, value }))];
}

function yesNoOptions(): ProductFilterOption[] {
  return [
    { label: 'Todos', value: '' },
    { label: 'Si', value: 'true' },
    { label: 'No', value: 'false' },
  ];
}
