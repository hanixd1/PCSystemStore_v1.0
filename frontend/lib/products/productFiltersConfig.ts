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

const PSU_WATT_OPTIONS: ProductFilterOption[] = [
  { label: 'Todos', value: '' },
  ...['450', '500', '550', '600', '650', '700', '750', '800', '850', '1000', '1200', '1500'].map(
    (value) => ({
      label: `${value} W`,
      value,
    }),
  ),
];

const LAPTOP_RAM_OPTIONS = withAllOptions([
  ['8GB', '8 GB'],
  ['16GB', '16 GB'],
  ['24GB', '24 GB'],
  ['32GB', '32 GB'],
  ['64GB', '64 GB'],
]);

const LAPTOP_STORAGE_OPTIONS = withAllOptions([
  ['256GB SSD', '256 GB SSD'],
  ['512GB SSD', '512 GB SSD'],
  ['1TB SSD', '1 TB SSD'],
  ['2TB SSD', '2 TB SSD'],
  ['1TB HDD', '1 TB HDD'],
  ['2TB HDD', '2 TB HDD'],
  ['512GB SSD + 1TB HDD', '512 GB SSD + 1 TB HDD'],
  ['1TB SSD + 1TB HDD', '1 TB SSD + 1 TB HDD'],
]);

const LAPTOP_SCREEN_OPTIONS = withAllOptions([
  ['13', '13"'],
  ['14', '14"'],
  ['15.6', '15.6"'],
  ['16', '16"'],
  ['17.3', '17.3"'],
  ['18', '18"'],
]);

const LAPTOP_REFRESH_OPTIONS = withAllOptions([
  ['60', '60 Hz'],
  ['75', '75 Hz'],
  ['120', '120 Hz'],
  ['144', '144 Hz'],
  ['165', '165 Hz'],
  ['240', '240 Hz'],
  ['300', '300 Hz'],
  ['360', '360 Hz'],
]);

const MONITOR_RESOLUTION_OPTIONS = withAllOptions([
  ['FHD (1920x1080)', 'FHD (1920x1080)'],
  ['QHD (2560x1440)', 'QHD (2560x1440)'],
  ['Ultra Wide QHD (3440x1440)', 'Ultra Wide QHD (3440x1440)'],
  ['4K UHD (3840x2160)', '4K UHD (3840x2160)'],
  ['Otro', 'Otro'],
]);

const MONITOR_REFRESH_OPTIONS = withAllOptions([
  ['60', '60 Hz'],
  ['75', '75 Hz'],
  ['100', '100 Hz'],
  ['120', '120 Hz'],
  ['144', '144 Hz'],
  ['165', '165 Hz'],
  ['180', '180 Hz'],
  ['200', '200 Hz'],
  ['240', '240 Hz'],
  ['280', '280 Hz'],
  ['360', '360 Hz'],
]);

export const GENERAL_PRODUCT_FILTERS: ProductFilterConfig[] = [
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
      { label: 'Precio menor a mayor', value: 'price:asc' },
      { label: 'Precio mayor a menor', value: 'price:desc' },
      { label: 'Nombre A-Z', value: 'name:asc' },
      { label: 'Nombre Z-A', value: 'name:desc' },
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
        { label: 'sTR4', value: 'sTR4' },
        { label: 'sTRX4', value: 'sTRX4' },
        { label: 'sWRX8', value: 'sWRX8' },
        { label: 'sTR5', value: 'sTR5' },
        { label: 'LGA 1200', value: 'LGA 1200' },
        { label: 'LGA 1700', value: 'LGA 1700' },
        { label: 'LGA 1851', value: 'LGA 1851' },
      ],
    },
    {
      key: 'integratedGraphics',
      label: 'Graficos integrados',
      type: 'select',
      options: yesNoOptions(),
    },
  ],
  MOTHERBOARD: [
    {
      key: 'brand',
      label: 'Marca',
      type: 'select',
      options: withAll(['ASUS', 'MSI', 'Gigabyte', 'ASRock', 'Otros']),
    },
    { key: 'platform', label: 'Plataforma', type: 'select', options: withAll(['AMD', 'Intel']) },
    {
      key: 'socket',
      label: 'Socket',
      type: 'select',
      options: withAll(['AM4', 'AM5', 'sTR4', 'sTRX4', 'sWRX8', 'sTR5', 'LGA 1200', 'LGA 1700', 'LGA 1851']),
    },
    {
      key: 'formFactor',
      label: 'Formato',
      type: 'select',
      options: withAll(['ATX', 'Micro-ATX', 'Mini-ITX']),
    },
  ],
  RAM: [
    {
      key: 'brand',
      label: 'Marca',
      type: 'select',
      optionSource: 'brands',
      options: withAll(['Kingston', 'Corsair', 'Crucial', 'G.Skill', 'TeamGroup', 'XPG', 'Otra']),
    },
    { key: 'ramType', label: 'Tipo', type: 'select', options: withAll(['DDR4', 'DDR5']) },
    {
      key: 'capacity',
      label: 'Capacidad',
      type: 'select',
      options: withAll(['8', '16', '24', '32']),
    },
    {
      key: 'speed',
      label: 'Frecuencia',
      type: 'select',
      options: withAll(['2666', '3200', '3600', '5200', '5600', '6000']),
    },
    { key: 'hasRGB', label: 'RGB', type: 'select', options: yesNoOptions() },
  ],
  GPU: [
    {
      key: 'brand',
      label: 'Marca ensambladora',
      type: 'select',
      options: withAll(['Gigabyte', 'ASUS', 'MSI', 'PNY', 'Otros']),
    },
    {
      key: 'gpuChipset',
      label: 'Chipset',
      type: 'select',
      optionSource: 'gpuChipsets',
      options: withAll(['NVIDIA', 'AMD', 'Intel']),
    },
    {
      key: 'vram',
      label: 'VRAM',
      type: 'select',
      optionSource: 'vram',
      options: withAll(['4', '6', '8', '12', '16', '24', '32']),
    },
  ],
  PSU: [
    {
      key: 'brand',
      label: 'Marca',
      type: 'select',
      options: withAll([
        'MSI',
        'ASUS',
        'Gigabyte',
        'Corsair',
        'DeepCool',
        'Antryx',
        'Cooler Master',
        'Seasonic',
        'Thermaltake',
        'Otros',
      ]),
    },
    { key: 'psuWatts', label: 'Potencia', type: 'select', options: PSU_WATT_OPTIONS },
  ],
  COOLER: [
    {
      key: 'brand',
      label: 'Marca',
      type: 'select',
      options: withAll(['MSI', 'DeepCool', 'Corsair', 'Gigabyte', 'ASUS', 'Otros']),
    },
    { key: 'coolerType', label: 'Tipo', type: 'select', options: withAll(['Torre', 'Líquida']) },
    {
      key: 'compatibleSockets',
      label: 'Socket compatible',
      type: 'select',
      optionSource: 'sockets',
      options: withAll(['AM4', 'AM5', 'sTR4', 'sTRX4', 'sWRX8', 'sTR5', 'LGA 1200', 'LGA 1700', 'LGA 1851']),
    },
    { key: 'hasRGB', label: 'RGB', type: 'select', options: yesNoOptions() },
    { key: 'hasScreen', label: 'Pantalla LCD', type: 'select', options: yesNoOptions() },
  ],
  STORAGE: [
    {
      key: 'brand',
      label: 'Marca',
      type: 'select',
      optionSource: 'brands',
      options: withAll(['Kingston', 'Samsung', 'Western Digital', 'Crucial', 'Seagate', 'Otra']),
    },
    {
      key: 'storageType',
      label: 'Tipo',
      type: 'select',
      optionSource: 'storageTypes',
      options: withAll(['HDD', 'SSD SATA', 'NVMe M.2', 'M.2 SATA']),
    },
    {
      key: 'capacity',
      label: 'Capacidad',
      type: 'select',
      optionSource: 'capacities',
      options: withAll(['250', '500', '1000', '2000', '4000']),
    },
  ],
  CASE: [
    {
      key: 'brand',
      label: 'Marca',
      type: 'select',
      options: withAll([
        'Halion',
        'Micronics',
        'ASUS',
        'Gigabyte',
        'DeepCool',
        'Antryx',
        'MSI',
        'Lian Li',
        'Otros',
      ]),
    },
    {
      key: 'formFactor',
      label: 'Formato soportado',
      type: 'select',
      options: withAll(['ATX', 'Micro-ATX', 'Mini-ITX']),
    },
    { key: 'includesPsu', label: 'Incluye fuente', type: 'select', options: yesNoOptions() },
    { key: 'hasRGB', label: 'RGB', type: 'select', options: yesNoOptions() },
  ],
  LAPTOP: [
    {
      key: 'brand',
      label: 'Marca',
      type: 'select',
      optionSource: 'brands',
      options: withAll(['ASUS', 'Lenovo', 'HP', 'Acer', 'Dell', 'MSI', 'Otra']),
    },
    { key: 'ram', label: 'RAM', type: 'select', options: LAPTOP_RAM_OPTIONS },
    { key: 'storage', label: 'Almacenamiento', type: 'select', options: LAPTOP_STORAGE_OPTIONS },
    {
      key: 'screenSize',
      label: 'Tamano de pantalla',
      type: 'select',
      options: LAPTOP_SCREEN_OPTIONS,
    },
    { key: 'refreshRateHz', label: 'Hz', type: 'select', options: LAPTOP_REFRESH_OPTIONS },
  ],
  PC_DESKTOP: [
    { key: 'processor', label: 'Procesador', type: 'select', options: withAll(['Intel', 'AMD']) },
    { key: 'ram', label: 'RAM', type: 'select', options: withAll(['8GB', '16GB', '32GB', '64GB']) },
    {
      key: 'storage',
      label: 'Almacenamiento',
      type: 'select',
      options: withAll(['512GB', '1TB', '2TB']),
    },
    { key: 'hasDedicatedGpu', label: 'GPU', type: 'select', options: yesNoOptions() },
  ],
  MONITOR: [
    {
      key: 'brand',
      label: 'Marca',
      type: 'select',
      options: withAll(['MSI', 'Gigabyte', 'Teros', 'LG', 'Samsung', 'Otros']),
    },
    { key: 'resolution', label: 'Resolucion', type: 'select', options: MONITOR_RESOLUTION_OPTIONS },
    { key: 'refreshRateHz', label: 'Hz', type: 'select', options: MONITOR_REFRESH_OPTIONS },
    {
      key: 'screenSize',
      label: 'Tamano',
      type: 'select',
      options: withAll(['21.5', '24', '27', '32', '34']),
    },
    {
      key: 'panel',
      label: 'Panel',
      type: 'select',
      optionSource: 'panels',
      options: withAll(['IPS', 'VA', 'TN', 'OLED']),
    },
  ],
  KEYBOARD: [
    {
      key: 'brand',
      label: 'Marca',
      type: 'select',
      options: withAll(['Redragon', 'MSI', 'Logitech', 'Razer', 'Aula', 'Royal Kludge', 'Otros']),
    },
    {
      key: 'keyboardType',
      label: 'Tipo teclado',
      type: 'select',
      optionSource: 'keyboardTypes',
      options: withAll(['Membrana', 'Semi-mecanico', 'Mecanico', 'Magnetico']),
    },
    {
      key: 'connections',
      label: 'Conectividad',
      type: 'select',
      optionSource: 'connections',
      options: withAll(['Cableado', 'Bluetooth', 'Dongle USB']),
    },
    {
      key: 'layoutLanguage',
      label: 'Idioma / Layout',
      type: 'select',
      options: withAll(['Espanol', 'Ingles']),
    },
    { key: 'hasLighting', label: 'RGB', type: 'select', options: yesNoOptions() },
  ],
  MOUSE: [
    {
      key: 'brand',
      label: 'Marca',
      type: 'select',
      options: withAll(['Redragon', 'Logitech', 'Razer', 'MSI', 'Teros', 'Otros']),
    },
    {
      key: 'connections',
      label: 'Conexion',
      type: 'select',
      optionSource: 'connections',
      options: withAll(['Cableado', 'Bluetooth', 'Dongle USB']),
    },
  ],
  MOUSEPAD: [
    {
      key: 'brand',
      label: 'Marca',
      type: 'select',
      options: withAll(['HyperX', 'Logitech', 'Redragon', 'Otros']),
    },
  ],
  CHAIR: [{ key: 'brand', label: 'Marca', type: 'select', optionSource: 'brands' }],
  GAMING_DESK: [{ key: 'brand', label: 'Marca', type: 'select', optionSource: 'brands' }],
  WEBCAM: [
    {
      key: 'brand',
      label: 'Marca',
      type: 'select',
      options: withAll(['Logitech', 'Redragon', 'Otros']),
    },
    {
      key: 'resolution',
      label: 'Resolucion',
      type: 'select',
      options: withAll(['HD', 'FHD', '4K']),
    },
    { key: 'fps', label: 'FPS', type: 'select', options: withAll(['30', '60']) },
  ],
  CAPTURE_CARD: [
    {
      key: 'brand',
      label: 'Marca',
      type: 'select',
      options: withAll(['Corsair', 'Streamplify', 'Otros']),
    },
    {
      key: 'resolution',
      label: 'Resolucion',
      type: 'select',
      options: withAll(['HD', 'FHD', '4K']),
    },
    { key: 'fps', label: 'FPS', type: 'select', options: withAll(['30', '60', '120']) },
  ],
  CABLE_HUB: [
    {
      key: 'brand',
      label: 'Marca',
      type: 'select',
      options: withAll(['Cabletime', 'Ugreen', 'Otros']),
    },
    { key: 'cableHubType', label: 'Tipo', type: 'select', options: withAll(['Cable', 'Hub']) },
  ],
  LAPTOP_COOLING_BASE: [
    {
      key: 'brand',
      label: 'Marca',
      type: 'select',
      options: withAll(['Cooler Master', 'Antryx', 'Teros', 'Otros']),
    },
  ],
  BACKPACK: [
    {
      key: 'brand',
      label: 'Marca',
      type: 'select',
      options: withAll(['Redragon', 'ASUS', 'Teros', 'Gigabyte', 'Otros']),
    },
  ],
  HEADSET: [
    {
      key: 'brand',
      label: 'Marca',
      type: 'select',
      options: withAll(['Logitech', 'Redragon', 'HyperX', 'Razer', 'Teros', 'Otros']),
    },
    {
      key: 'connection',
      label: 'Conexion',
      type: 'select',
      options: withAll(['Cableado', 'Inalambrico']),
    },
  ],
  MICROPHONE: [
    {
      key: 'brand',
      label: 'Marca',
      type: 'select',
      options: withAll([
        'Fifine',
        'Streamplify',
        'Redragon',
        'Razer',
        'Logitech',
        'Corsair',
        'Otros',
      ]),
    },
  ],
  SPEAKER: [
    {
      key: 'brand',
      label: 'Marca',
      type: 'select',
      options: withAll(['Logitech', 'Redragon', 'Creative', 'Genius', 'Otros']),
    },
  ],
};

export const SLUG_TO_CATEGORY: Record<string, string> = {
  cpu: 'CPU',
  mobo: 'MOTHERBOARD',
  motherboard: 'MOTHERBOARD',
  ram: 'RAM',
  graficas: 'GPU',
  gpu: 'GPU',
  nvidia: 'GPU',
  amd: 'GPU',
  almacenamiento: 'STORAGE',
  solido: 'STORAGE',
  sata: 'STORAGE',
  torres: 'CASE',
  fuentes: 'PSU',
  refrigeracion: 'COOLER',
  pcs: 'PC_DESKTOP',
  'pc-desktop': 'PC_DESKTOP',
  desktop: 'PC_DESKTOP',
  laptops: 'LAPTOP',
  monitores: 'MONITOR',
  'monitores-gamer': 'MONITOR',
  teclados: 'KEYBOARD',
  'teclados-gamer': 'KEYBOARD',
  mouse: 'MOUSE',
  'mouse-gamer': 'MOUSE',
  mousepad: 'MOUSEPAD',
  chairs: 'CHAIR',
  'sillas-gaming': 'CHAIR',
  'mesa-gamer': 'GAMING_DESK',
  audifonos: 'HEADSET',
  headsets: 'HEADSET',
  'headsets-cableados': 'HEADSET',
  'headsets-inalambricos': 'HEADSET',
  microphones: 'MICROPHONE',
  microfonos: 'MICROPHONE',
  speakers: 'SPEAKER',
  parlantes: 'SPEAKER',
  webcams: 'WEBCAM',
  capturadoras: 'CAPTURE_CARD',
  cables: 'CABLE_HUB',
  'cables-y-hub': 'CABLE_HUB',
  'cables-hub': 'CABLE_HUB',
  adapters: 'CABLE_HUB',
  hubs: 'CABLE_HUB',
  hub: 'CABLE_HUB',
  'cables/hdmi': 'CABLE_HUB',
  'cables/dp': 'CABLE_HUB',
  'cables/ethernet': 'CABLE_HUB',
  'bases-refrigeradoras': 'LAPTOP_COOLING_BASE',
  mochilas: 'BACKPACK',
  proteccion: 'PROTECTION',
  ups: 'PROTECTION',
  supresores: 'PROTECTION',
  estabilizadores: 'PROTECTION',
};

function withAll(values: string[]): ProductFilterOption[] {
  return [{ label: 'Todos', value: '' }, ...values.map((value) => ({ label: value, value }))];
}

function withAllOptions(options: Array<[string, string]>): ProductFilterOption[] {
  return [{ label: 'Todos', value: '' }, ...options.map(([value, label]) => ({ value, label }))];
}

function yesNoOptions(): ProductFilterOption[] {
  return [
    { label: 'Todos', value: '' },
    { label: 'Si', value: 'true' },
    { label: 'No', value: 'false' },
  ];
}
