// Option lists shared by the admin create and edit product forms.
export const DEPARTMENTS: Record<string, Array<{ label: string; value: string }>> = {
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
    { label: 'Silla Gamer', value: 'CHAIR' },
    { label: 'Mesa Gamer', value: 'GAMING_DESK' },
    { label: 'Webcam', value: 'WEBCAM' },
    { label: 'Capturadora', value: 'CAPTURE_CARD' },
    { label: 'Cables y Hub', value: 'CABLE_HUB' },
  ],
  AUDIO: [
    { label: 'Audífono / Headset', value: 'HEADSET' },
    { label: 'Micrófono', value: 'MICROPHONE' },
    { label: 'Parlantes', value: 'SPEAKER' },
  ],
  PROTECCION: [
    { label: 'UPS', value: 'UPS' },
    { label: 'Estabilizador', value: 'STABILIZER' },
  ],
};

// Listas de Opciones Tecnicas
export const CPU_BRANDS = ['AMD', 'Intel'];
export const MOTHERBOARD_BRANDS = ['ASUS', 'MSI', 'Gigabyte', 'ASRock', 'Otros'];
export const CPU_SOCKETS_BY_BRAND: Record<string, string[]> = {
  AMD: ['AM4', 'AM5', 'sTR4', 'sTRX4', 'sWRX8', 'sTR5'],
  Intel: ['LGA 1200', 'LGA 1700', 'LGA 1851'],
};
export const SOCKETS = [
  'AM4',
  'AM5',
  'sTR4',
  'sTRX4',
  'sWRX8',
  'sTR5',
  'LGA 1200',
  'LGA 1700',
  'LGA 1851',
];
export const M2_FORM_FACTORS = ['2230', '2242', '2260', '2280', '22110'];
export const COOLER_SOCKET_OPTIONS = [
  'AM4',
  'AM5',
  'sTR4',
  'sTRX4',
  'sWRX8',
  'sTR5',
  'LGA 1200',
  'LGA 1700',
  'LGA 1851',
];
export const COOLER_BRANDS = ['MSI', 'DeepCool', 'Corsair', 'Gigabyte', 'ASUS', 'Otros'];
export const COOLER_RADIATOR_OPTIONS = ['120', '140', '240', '280', '360', '420', '460'];
export const FORM_FACTORS = ['ATX', 'Micro-ATX', 'Mini-ITX', 'E-ATX'];
export const CASE_BRANDS = [
  'Halion',
  'Micronics',
  'ASUS',
  'Gigabyte',
  'DeepCool',
  'Antryx',
  'MSI',
  'Lian Li',
  'Otros',
];
export const CASE_RADIATOR_SUPPORT_OPTIONS = [
  { value: '0', label: 'No soporta' },
  { value: '120', label: '120 mm' },
  { value: '140', label: '140 mm' },
  { value: '240', label: '240 mm' },
  { value: '280', label: '280 mm' },
  { value: '360', label: '360 mm' },
  { value: '420', label: '420 mm' },
  { value: '460', label: '460 mm' },
];
export const RAM_TYPES = ['DDR4', 'DDR5'];
export const RAM_BRANDS = ['Kingston', 'TeamGroup', 'ADATA', 'Corsair', 'Otros'];
export const RAM_CAPACITIES = ['8', '16', '24', '32'];
export const PSU_BRANDS = [
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
];
export const PSU_WATT_OPTIONS = [
  '450',
  '500',
  '550',
  '600',
  '650',
  '700',
  '750',
  '800',
  '850',
  '1000',
  '1200',
  '1500',
];
export const PSU_CERTS = [
  'Sin Certificacion',
  '80+ White',
  '80+ Bronze',
  '80+ Gold',
  '80+ Platinum',
  '80+ Titanium',
];
export const GPU_BRANDS = ['Gigabyte', 'ASUS', 'MSI', 'PNY', 'Otros'];
export const GPU_CHIPSETS = ['NVIDIA GeForce', 'AMD Radeon', 'Intel Arc'];
export const GPU_VRAM_OPTIONS = ['4', '6', '8', '12', '16', '24', '32'];
export const GPU_VRAM_TYPES = ['GDDR6', 'GDDR6X', 'GDDR7'];
export const GPU_FAN_OPTIONS = ['1', '2', '3', '4'];
export const STORAGE_TYPES = ['SSD 2.5', 'Sólido M.2', 'HDD 3.5'];
export const NVME_GENS = ['SATA', 'PCIe 3.0', 'PCIe 4.0', 'PCIe 5.0'];
export const PANEL_TYPES = ['IPS', 'VA', 'TN', 'OLED'];
export const LAPTOP_BRANDS = ['ASUS', 'Lenovo', 'HP', 'Acer', 'Dell', 'MSI', 'Otra'];
export const LAPTOP_COOLING_BASE_BRANDS = ['Cooler Master', 'Antryx', 'Teros', 'Otros'];
export const LAPTOP_COOLING_BASE_FAN_COUNTS = ['1', '2', '3', '4', '5', '6'];
export const LAPTOP_ACCESSORY_CONNECTIVITY = ['USB-A', 'USB-C'];
export const BACKPACK_BRANDS = ['Redragon', 'ASUS', 'Teros', 'Gigabyte', 'Otros'];
export const HEADSET_BRANDS = ['Logitech', 'Redragon', 'HyperX', 'Razer', 'Teros', 'Otros'];
export const MICROPHONE_BRANDS = [
  'Fifine',
  'Streamplify',
  'Redragon',
  'Razer',
  'Logitech',
  'Corsair',
  'Otros',
];
export const SPEAKER_BRANDS = ['Logitech', 'Redragon', 'Creative', 'Genius', 'Otros'];
export const HEADSET_CONNECTION_TYPES = ['Cableado', 'Inalambrico'];
// Must stay within the backend's allowed headset connections (product-validation.service.ts).
export const HEADSET_WIRED_CONNECTIONS = ['USB', 'USB-C', 'Jack 3.5mm'];
export const HEADSET_WIRELESS_CONNECTIONS = [
  ...HEADSET_WIRED_CONNECTIONS,
  'USB Dongle 2.4 GHz',
  'Bluetooth',
];
export const AUDIO_CONNECTIVITY_OPTIONS = ['Cableado', 'Inalambrico', 'Bluetooth', '2.4 GHz'];
export const AUDIO_CONNECTION_TYPE_OPTIONS = [
  'USB',
  'USB-C',
  'Jack 3.5mm',
  'Bluetooth',
  '2.4 GHz',
  'RCA',
  'Optico',
  'HDMI ARC',
  'XLR',
];
export const HEADSET_AUDIO_TYPES = ['Audifono', 'Headset', 'In-ear', 'On-ear', 'Over-ear'];
export const HEADSET_SURROUND_OPTIONS = ['No', '7.1 Virtual', 'Dolby Atmos', 'DTS Headphone:X'];
export const MICROPHONE_TYPES = ['Condensador', 'Dinamico', 'Lavalier', 'Shotgun'];
export const POLAR_PATTERN_OPTIONS = [
  'Cardioide',
  'Omnidireccional',
  'Bidireccional',
  'Supercardioide',
  'Multiple',
];
export const SPEAKER_TYPES = [
  'Escritorio',
  'Barra de sonido',
  'Portatil',
  'Torre',
  'Monitor de estudio',
];
export const SPEAKER_CHANNELS = ['2.0', '2.1', '5.1', '7.1'];
export const LAPTOP_RAM_OPTIONS = ['8GB', '12GB', '16GB', '24GB', '32GB', '48GB', '64GB'];
export const LAPTOP_STORAGE_OPTIONS = [
  '256GB SSD',
  '512GB SSD',
  '1TB SSD',
  '2TB SSD',
  '1TB HDD',
  '2TB HDD',
  '512GB SSD + 1TB HDD',
  '1TB SSD + 1TB HDD',
];
export const LAPTOP_SCREEN_OPTIONS = ['13', '14', '15.6', '16', '17.3', '18'];
export const LAPTOP_REFRESH_OPTIONS = ['60', '75', '120', '144', '165', '240', '300', '360'];
export const LAPTOP_SUPPORTED_SIZE_OPTIONS = ['14"', '15.6"', '16"', '17.3"'];
export const ACCESSORY_COLOR_OPTIONS = ['Negro', 'Gris', 'Blanco', 'Azul', 'Rojo', 'Otros'];
export const MONITOR_BRANDS = ['MSI', 'Gigabyte', 'Teros', 'LG', 'Samsung', 'Otros'];
export const MONITOR_RESOLUTION_OPTIONS = [
  'FHD (1920x1080)',
  'QHD (2560x1440)',
  'Ultra Wide QHD (3440x1440)',
  '4K UHD (3840x2160)',
  'Otro',
];
export const MONITOR_REFRESH_OPTIONS = [
  '60',
  '75',
  '100',
  '120',
  '144',
  '165',
  '180',
  '200',
  '240',
  '280',
  '360',
];
export const LAPTOP_RAM_LABELS: Record<string, string> = {
  '8GB': '8 GB',
  '12GB': '12 GB',
  '16GB': '16 GB',
  '24GB': '24 GB',
  '32GB': '32 GB',
  '48GB': '48 GB',
  '64GB': '64 GB',
};
export const LAPTOP_STORAGE_LABELS: Record<string, string> = {
  '256GB SSD': '256 GB SSD',
  '512GB SSD': '512 GB SSD',
  '1TB SSD': '1 TB SSD',
  '2TB SSD': '2 TB SSD',
  '1TB HDD': '1 TB HDD',
  '2TB HDD': '2 TB HDD',
  '512GB SSD + 1TB HDD': '512 GB SSD + 1 TB HDD',
  '1TB SSD + 1TB HDD': '1 TB SSD + 1 TB HDD',
};
export const DESKTOP_COOLER_TYPES = ['De serie', 'Torre', 'Líquida', 'No incluye'];
export const MONITOR_PORTS = ['VGA', 'HDMI', 'DisplayPort', 'USB-C'];
export const PERIPHERAL_CONNECTIONS = ['Cableado', 'Bluetooth', 'Dongle USB'];
export const MOUSE_CONNECTIONS = ['Cableado', 'Inalambrico', 'Bluetooth', '2.4 GHz'];
export const KEYBOARD_BRANDS = [
  'Redragon',
  'MSI',
  'Logitech',
  'Razer',
  'Aula',
  'Royal Kludge',
  'Otros',
];
export const KEYBOARD_TYPES = ['Membrana', 'Mecanico', 'Magnetico', 'Optico', 'Hibrido'];
export const KEYBOARD_FORM_FACTORS = ['Completo', '80%', 'TKL', '75%', '65%', '60%'];
export const LAYOUT_LANGUAGES = ['Espanol', 'Ingles'];
export const MOUSE_TYPES = ['Oficina', 'Gamer'];
export const MOUSE_BRANDS = ['Redragon', 'Logitech', 'Razer', 'MSI', 'Teros', 'Otros'];
export const MOUSEPAD_BRANDS = ['HyperX', 'Logitech', 'Redragon', 'Otros'];
export const WEBCAM_BRANDS = ['Logitech', 'Redragon', 'Otros'];
export const CAPTURE_CARD_BRANDS = ['Corsair', 'Streamplify', 'Otros'];
export const CABLE_HUB_BRANDS = ['Cabletime', 'Ugreen', 'Otros'];
export const VIDEO_RESOLUTION_OPTIONS = ['HD', 'FHD', '4K'];
export const WEBCAM_FPS_OPTIONS = ['30', '60'];
export const CAPTURE_CARD_FPS_OPTIONS = ['30', '60', '120'];
export const CABLE_HUB_TYPES = ['Cable', 'Hub'];
export const CABLE_TYPES = [
  'HDMI a HDMI',
  'DisplayPort a DisplayPort',
  'Tipo C a HDMI',
  'Tipo C a DisplayPort',
  'Tipo C a Tipo C',
];
export const CABLE_LENGTHS = ['1', '2', '3'];
export const HUB_INPUT_TYPES = ['USB-C', 'USB-A'];
export const POLLING_RATES = ['1000', '2000', '4000', '8000'];
export const CHAIR_MATERIALS = ['Cuero sintetico', 'Tela', 'Malla', 'Mixto', 'Otro'];
export const MOUSE_POWER_TYPES = ['Pila', 'Bateria', 'Ninguno'];
export const CASE_RADIATOR_SUPPORT_LABELS: Record<string, string> = Object.fromEntries(
  CASE_RADIATOR_SUPPORT_OPTIONS.map((option) => [option.value, option.label]),
);
export const COOLER_TYPES = ['Torre', 'Líquida'];
export const PSU_MODULAR_OPTIONS = ['No Modular', 'Semi Modular', 'Full Modular'];
export const LAPTOP_GPU_BRANDS = ['NVIDIA', 'AMD', 'Intel', 'No aplica', 'Otros'];
export const HEADSET_MIC_TYPES = [
  'Unidireccional',
  'Bidireccional',
  'Omnidireccional',
  'Sin microfono',
];
export const SOFTWARE_LICENSE_TYPES = ['Permanente', 'Suscripcion 1 Ano', 'OEM'];
export const POWER_PROTECTION_BRANDS = ['CDP', 'Forza', 'Otro'];
// Must match POWER_PROTECTION_OUTLET_TYPES in the backend DTO.
export const POWER_PROTECTION_OUTLET_TYPES = [
  'Solo tomas de corriente',
  'Tomas de corriente + USB',
];
export const SOFTWARE_PLATFORMS = ['Windows', 'Mac', 'Android'];
