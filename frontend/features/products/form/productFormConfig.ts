export const CREATE_PRODUCT_FORM_CONFIG = (() => {
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
};

// Listas de Opciones Tecnicas
const CPU_BRANDS = ['AMD', 'Intel'];
const MOTHERBOARD_BRANDS = ['ASUS', 'MSI', 'Gigabyte', 'ASRock', 'Otros'];
const CPU_SOCKETS_BY_BRAND: Record<string, string[]> = {
  AMD: ['AM4', 'AM5', 'sTR4', 'sTRX4', 'sWRX8', 'sTR5'],
  Intel: ['LGA 1200', 'LGA 1700', 'LGA 1851'],
};
const SOCKETS = [
  'AM5',
  'AM4',
  'sTR4',
  'sTRX4',
  'sWRX8',
  'sTR5',
  'LGA 1700',
  'LGA 1200',
  'LGA 1851',
];
const M2_FORM_FACTORS = ['2230', '2242', '2260', '2280', '22110'];
const COOLER_SOCKET_OPTIONS = [
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
const COOLER_BRANDS = ['MSI', 'DeepCool', 'Corsair', 'Gigabyte', 'ASUS', 'Otros'];
const COOLER_RADIATOR_OPTIONS = ['120', '240', '280', '360', '460'];
const FORM_FACTORS = ['ATX', 'Micro-ATX', 'Mini-ITX', 'E-ATX'];
const CASE_BRANDS = [
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
const CASE_RADIATOR_SUPPORT_OPTIONS = [
  { value: '0', label: 'No soporta' },
  { value: '120', label: '120 mm' },
  { value: '140', label: '140 mm' },
  { value: '240', label: '240 mm' },
  { value: '280', label: '280 mm' },
  { value: '360', label: '360 mm' },
  { value: '420', label: '420 mm' },
  { value: '460', label: '460 mm' },
];
const RAM_TYPES = ['DDR4', 'DDR5'];
const RAM_BRANDS = ['Kingston', 'TeamGroup', 'ADATA', 'Corsair', 'Otros'];
const RAM_CAPACITIES = [8, 16, 24, 32];
const PSU_BRANDS = [
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
const PSU_WATT_OPTIONS = [
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
const PSU_CERTS = [
  'Sin Certificacion',
  '80+ White',
  '80+ Bronze',
  '80+ Gold',
  '80+ Platinum',
  '80+ Titanium',
];
const GPU_BRANDS = ['Gigabyte', 'ASUS', 'MSI', 'PNY', 'Otros'];
const GPU_CHIPSETS = ['NVIDIA GeForce', 'AMD Radeon', 'Intel Arc'];
const GPU_VRAM_OPTIONS = ['4', '6', '8', '12', '16', '24', '32'];
const GPU_VRAM_TYPES = ['GDDR6', 'GDDR6X', 'GDDR7'];
const GPU_FAN_OPTIONS = ['1', '2', '3', '4'];
const STORAGE_TYPES = ['SSD 2.5', 'Sólido M.2', 'HDD 3.5'];
const NVME_GENS = ['SATA', 'PCIe 3.0', 'PCIe 4.0', 'PCIe 5.0'];
const PANEL_TYPES = ['IPS', 'VA', 'TN', 'OLED'];
const LAPTOP_BRANDS = ['ASUS', 'Lenovo', 'HP', 'Acer', 'Dell', 'MSI', 'Otra'];
const LAPTOP_COOLING_BASE_BRANDS = ['Cooler Master', 'Antryx', 'Teros', 'Otros'];
const LAPTOP_COOLING_BASE_FAN_COUNTS = ['1', '2', '3', '4', '5', '6'];
const LAPTOP_ACCESSORY_CONNECTIVITY = ['USB-A', 'USB-C'];
const BACKPACK_BRANDS = ['Redragon', 'ASUS', 'Teros', 'Gigabyte', 'Otros'];
const HEADSET_BRANDS = ['Logitech', 'Redragon', 'HyperX', 'Razer', 'Teros', 'Otros'];
const MICROPHONE_BRANDS = [
  'Fifine',
  'Streamplify',
  'Redragon',
  'Razer',
  'Logitech',
  'Corsair',
  'Otros',
];
const SPEAKER_BRANDS = ['Logitech', 'Redragon', 'Creative', 'Genius', 'Otros'];
const HEADSET_CONNECTION_TYPES = ['Cableado', 'Inalambrico'];
const HEADSET_WIRED_CONNECTIONS = ['Cable USB', 'Jack 3.5 mm'];
const HEADSET_WIRELESS_CONNECTIONS = [
  'Cable USB',
  'Jack 3.5 mm',
  'USB Dongle 2.4 GHz',
  'Bluetooth',
];
const AUDIO_CONNECTIVITY_OPTIONS = ['Cableado', 'Inalambrico', 'Bluetooth', '2.4 GHz'];
const AUDIO_CONNECTION_TYPE_OPTIONS = [
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
const HEADSET_AUDIO_TYPES = ['Audifono', 'Headset', 'In-ear', 'On-ear', 'Over-ear'];
const HEADSET_SURROUND_OPTIONS = ['No', '7.1 Virtual', 'Dolby Atmos', 'DTS Headphone:X'];
const MICROPHONE_TYPES = ['Condensador', 'Dinamico', 'Lavalier', 'Shotgun'];
const POLAR_PATTERN_OPTIONS = [
  'Cardioide',
  'Omnidireccional',
  'Bidireccional',
  'Supercardioide',
  'Multiple',
];
const SPEAKER_TYPES = ['Escritorio', 'Barra de sonido', 'Portatil', 'Torre', 'Monitor de estudio'];
const SPEAKER_CHANNELS = ['2.0', '2.1', '5.1', '7.1'];
const LAPTOP_RAM_OPTIONS = ['8GB', '12GB', '16GB', '24GB', '32GB', '48GB', '64GB'];
const LAPTOP_STORAGE_OPTIONS = [
  '256GB SSD',
  '512GB SSD',
  '1TB SSD',
  '2TB SSD',
  '1TB HDD',
  '2TB HDD',
  '512GB SSD + 1TB HDD',
  '1TB SSD + 1TB HDD',
];
const LAPTOP_SCREEN_OPTIONS = ['13', '14', '15.6', '16', '17.3', '18'];
const LAPTOP_REFRESH_OPTIONS = ['60', '75', '120', '144', '165', '240', '300', '360'];
const LAPTOP_SUPPORTED_SIZE_OPTIONS = ['14"', '15.6"', '16"', '17.3"'];
const ACCESSORY_COLOR_OPTIONS = ['Negro', 'Gris', 'Blanco', 'Azul', 'Rojo', 'Otros'];
const MONITOR_BRANDS = ['MSI', 'Gigabyte', 'Teros', 'LG', 'Samsung', 'Otros'];
const MONITOR_RESOLUTION_OPTIONS = [
  'FHD (1920x1080)',
  'QHD (2560x1440)',
  'Ultra Wide QHD (3440x1440)',
  '4K UHD (3840x2160)',
  'Otro',
];
const MONITOR_REFRESH_OPTIONS = [
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
const LAPTOP_RAM_LABELS: Record<string, string> = {
  '8GB': '8 GB',
  '12GB': '12 GB',
  '16GB': '16 GB',
  '24GB': '24 GB',
  '32GB': '32 GB',
  '48GB': '48 GB',
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
const DESKTOP_COOLER_TYPES = ['De serie', 'Torre', 'Líquida', 'No incluye'];
const MONITOR_PORTS = ['VGA', 'HDMI', 'DisplayPort', 'USB-C'];
const PERIPHERAL_CONNECTIONS = ['Cableado', 'Bluetooth', 'Dongle USB'];
const MOUSE_CONNECTIONS = ['Cableado', 'Inalambrico', 'Bluetooth', '2.4 GHz'];
const KEYBOARD_BRANDS = ['Redragon', 'MSI', 'Logitech', 'Razer', 'Aula', 'Royal Kludge', 'Otros'];
const KEYBOARD_TYPES = ['Membrana', 'Mecanico', 'Magnetico', 'Optico', 'Hibrido'];
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
const CABLE_TYPES = [
  'HDMI a HDMI',
  'DisplayPort a DisplayPort',
  'Tipo C a HDMI',
  'Tipo C a DisplayPort',
  'Tipo C a Tipo C',
];
const CABLE_LENGTHS = ['1', '2', '3'];
const HUB_INPUT_TYPES = ['USB-C', 'USB-A'];
const POLLING_RATES = ['1000', '2000', '4000', '8000'];
const CHAIR_MATERIALS = ['Cuero sintetico', 'Tela', 'Malla', 'Mixto', 'Otro'];
const MOUSE_POWER_TYPES = ['Pila', 'Bateria', 'Ninguno'];


  return { DEPARTMENTS, CPU_BRANDS, MOTHERBOARD_BRANDS, CPU_SOCKETS_BY_BRAND, SOCKETS, M2_FORM_FACTORS, COOLER_SOCKET_OPTIONS, COOLER_BRANDS, COOLER_RADIATOR_OPTIONS, FORM_FACTORS, CASE_BRANDS, CASE_RADIATOR_SUPPORT_OPTIONS, RAM_TYPES, RAM_BRANDS, RAM_CAPACITIES, PSU_BRANDS, PSU_WATT_OPTIONS, PSU_CERTS, GPU_BRANDS, GPU_CHIPSETS, GPU_VRAM_OPTIONS, GPU_VRAM_TYPES, GPU_FAN_OPTIONS, STORAGE_TYPES, NVME_GENS, PANEL_TYPES, LAPTOP_BRANDS, LAPTOP_COOLING_BASE_BRANDS, LAPTOP_COOLING_BASE_FAN_COUNTS, LAPTOP_ACCESSORY_CONNECTIVITY, BACKPACK_BRANDS, HEADSET_BRANDS, MICROPHONE_BRANDS, SPEAKER_BRANDS, HEADSET_CONNECTION_TYPES, HEADSET_WIRED_CONNECTIONS, HEADSET_WIRELESS_CONNECTIONS, AUDIO_CONNECTIVITY_OPTIONS, AUDIO_CONNECTION_TYPE_OPTIONS, HEADSET_AUDIO_TYPES, HEADSET_SURROUND_OPTIONS, MICROPHONE_TYPES, POLAR_PATTERN_OPTIONS, SPEAKER_TYPES, SPEAKER_CHANNELS, LAPTOP_RAM_OPTIONS, LAPTOP_STORAGE_OPTIONS, LAPTOP_SCREEN_OPTIONS, LAPTOP_REFRESH_OPTIONS, LAPTOP_SUPPORTED_SIZE_OPTIONS, ACCESSORY_COLOR_OPTIONS, MONITOR_BRANDS, MONITOR_RESOLUTION_OPTIONS, MONITOR_REFRESH_OPTIONS, LAPTOP_RAM_LABELS, LAPTOP_STORAGE_LABELS, DESKTOP_COOLER_TYPES, MONITOR_PORTS, PERIPHERAL_CONNECTIONS, MOUSE_CONNECTIONS, KEYBOARD_BRANDS, KEYBOARD_TYPES, KEYBOARD_FORM_FACTORS, LAYOUT_LANGUAGES, MOUSE_TYPES, MOUSE_BRANDS, MOUSEPAD_BRANDS, WEBCAM_BRANDS, CAPTURE_CARD_BRANDS, CABLE_HUB_BRANDS, VIDEO_RESOLUTION_OPTIONS, WEBCAM_FPS_OPTIONS, CAPTURE_CARD_FPS_OPTIONS, CABLE_HUB_TYPES, CABLE_TYPES, CABLE_LENGTHS, HUB_INPUT_TYPES, POLLING_RATES, CHAIR_MATERIALS, MOUSE_POWER_TYPES };
})();

export const EDIT_PRODUCT_FORM_CONFIG = (() => {
const CPU_BRANDS = ['AMD', 'Intel'];
const MOTHERBOARD_BRANDS = ['ASUS', 'MSI', 'Gigabyte', 'ASRock', 'Otros'];
const CPU_SOCKETS_BY_BRAND: Record<string, string[]> = {
  AMD: ['AM4', 'AM5', 'sTR4', 'sTRX4', 'sWRX8', 'sTR5'],
  Intel: ['LGA 1200', 'LGA 1700', 'LGA 1851'],
};
const SOCKETS = [
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
const M2_FORM_FACTORS = ['2230', '2242', '2260', '2280', '22110'];
const COOLER_BRANDS = ['MSI', 'DeepCool', 'Corsair', 'Gigabyte', 'ASUS', 'Otros'];
const COOLER_TYPES = ['Torre', 'Líquida'];
const COOLER_RADIATOR_OPTIONS = ['120', '140', '240', '280', '360', '420'];
const STORAGE_TYPES = ['SSD 2.5', 'Sólido M.2', 'HDD 3.5'];
const NVME_GENS = ['SATA', 'PCIe 3.0', 'PCIe 4.0', 'PCIe 5.0'];
const FORM_FACTORS = ['ATX', 'Micro-ATX', 'Mini-ITX', 'E-ATX'];
const CASE_BRANDS = [
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
const CASE_RADIATOR_SUPPORT_OPTIONS = ['0', '120', '140', '240', '280', '360', '420', '460'];
const CASE_RADIATOR_SUPPORT_LABELS: Record<string, string> = {
  0: 'No soporta',
  120: '120 mm',
  140: '140 mm',
  240: '240 mm',
  280: '280 mm',
  360: '360 mm',
  420: '420 mm',
  460: '460 mm',
};
const RAM_TYPES = ['DDR4', 'DDR5'];
const RAM_BRANDS = ['Kingston', 'TeamGroup', 'ADATA', 'Corsair', 'Otros'];
const RAM_CAPACITIES = ['8', '16', '24', '32'];
const GPU_BRANDS = ['Gigabyte', 'ASUS', 'MSI', 'PNY', 'Otros'];
const GPU_CHIPSETS = ['NVIDIA GeForce', 'AMD Radeon', 'Intel Arc'];
const GPU_VRAM_OPTIONS = ['4', '6', '8', '12', '16', '24', '32'];
const GPU_VRAM_TYPES = ['GDDR6', 'GDDR6X', 'GDDR7'];
const GPU_FAN_OPTIONS = ['1', '2', '3', '4'];
const PSU_BRANDS = [
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
const PSU_WATT_OPTIONS = [
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
const PSU_CERTS = [
  'Sin Certificacion',
  '80+ White',
  '80+ Bronze',
  '80+ Gold',
  '80+ Platinum',
  '80+ Titanium',
];
const PSU_MODULAR_OPTIONS = ['No Modular', 'Semi Modular', 'Full Modular'];
const LAPTOP_BRANDS = ['ASUS', 'Lenovo', 'HP', 'Acer', 'Dell', 'MSI', 'Otra'];
const LAPTOP_RAM_OPTIONS = ['8GB', '12GB', '16GB', '24GB', '32GB', '48GB', '64GB'];
const LAPTOP_STORAGE_OPTIONS = [
  '256GB SSD',
  '512GB SSD',
  '1TB SSD',
  '2TB SSD',
  '1TB HDD',
  '2TB HDD',
  '512GB SSD + 1TB HDD',
  '1TB SSD + 1TB HDD',
];
const LAPTOP_SCREEN_OPTIONS = ['13', '14', '15.6', '16', '17.3', '18'];
const LAPTOP_REFRESH_OPTIONS = ['60', '75', '120', '144', '165', '240', '300', '360'];
const LAPTOP_SUPPORTED_SIZE_OPTIONS = ['14"', '15.6"', '16"', '17.3"'];
const LAPTOP_RAM_LABELS: Record<string, string> = {
  '8GB': '8 GB',
  '12GB': '12 GB',
  '16GB': '16 GB',
  '24GB': '24 GB',
  '32GB': '32 GB',
  '48GB': '48 GB',
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
const DESKTOP_COOLER_TYPES = ['De serie', 'Torre', 'Líquida', 'No incluye'];
const PANEL_TYPES = ['IPS', 'VA', 'TN', 'OLED'];
const MONITOR_BRANDS = ['MSI', 'Gigabyte', 'Teros', 'LG', 'Samsung', 'Otros'];
const MONITOR_RESOLUTION_OPTIONS = [
  'FHD (1920x1080)',
  'QHD (2560x1440)',
  'Ultra Wide QHD (3440x1440)',
  '4K UHD (3840x2160)',
  'Otro',
];
const MONITOR_REFRESH_OPTIONS = [
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
const MONITOR_PORTS = ['VGA', 'HDMI', 'DisplayPort', 'USB-C'];
const PERIPHERAL_CONNECTIONS = ['Cableado', 'Bluetooth', 'Dongle USB'];
const MOUSE_CONNECTIONS = ['Cableado', 'Inalambrico', 'Bluetooth', '2.4 GHz'];
const KEYBOARD_BRANDS = ['Redragon', 'MSI', 'Logitech', 'Razer', 'Aula', 'Royal Kludge', 'Otros'];
const KEYBOARD_TYPES = ['Membrana', 'Mecanico', 'Magnetico', 'Optico', 'Hibrido'];
const KEYBOARD_FORM_FACTORS = ['Completo', '80%', 'TKL', '75%', '65%', '60%'];
const LAYOUT_LANGUAGES = ['Espanol', 'Ingles'];
const MOUSE_TYPES = ['Oficina', 'Gamer'];
const MOUSE_BRANDS = ['Redragon', 'Logitech', 'Razer', 'MSI', 'Teros', 'Otros'];
const MOUSEPAD_BRANDS = ['HyperX', 'Logitech', 'Redragon', 'Otros'];
const LAPTOP_COOLING_BASE_BRANDS = ['Cooler Master', 'Antryx', 'Teros', 'Otros'];
const LAPTOP_COOLING_BASE_FAN_COUNTS = ['1', '2', '3', '4', '5', '6'];
const LAPTOP_ACCESSORY_CONNECTIVITY = ['USB-A', 'USB-C'];
const BACKPACK_BRANDS = ['Redragon', 'ASUS', 'Teros', 'Gigabyte', 'Otros'];
const ACCESSORY_COLOR_OPTIONS = ['Negro', 'Gris', 'Blanco', 'Azul', 'Rojo', 'Otros'];
const HEADSET_BRANDS = ['Logitech', 'Redragon', 'HyperX', 'Razer', 'Teros', 'Otros'];
const MICROPHONE_BRANDS = [
  'Fifine',
  'Streamplify',
  'Redragon',
  'Razer',
  'Logitech',
  'Corsair',
  'Otros',
];
const SPEAKER_BRANDS = ['Logitech', 'Redragon', 'Creative', 'Genius', 'Otros'];
const HEADSET_CONNECTION_TYPES = ['Cableado', 'Inalambrico'];
const HEADSET_WIRED_CONNECTIONS = ['Cable USB', 'Jack 3.5 mm'];
const HEADSET_WIRELESS_CONNECTIONS = [
  'Cable USB',
  'Jack 3.5 mm',
  'USB Dongle 2.4 GHz',
  'Bluetooth',
];
const AUDIO_CONNECTIVITY_OPTIONS = ['Cableado', 'Inalambrico', 'Bluetooth', '2.4 GHz'];
const AUDIO_CONNECTION_TYPE_OPTIONS = [
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
const HEADSET_AUDIO_TYPES = ['Audifono', 'Headset', 'In-ear', 'On-ear', 'Over-ear'];
const HEADSET_SURROUND_OPTIONS = ['No', '7.1 Virtual', 'Dolby Atmos', 'DTS Headphone:X'];
const MICROPHONE_TYPES = ['Condensador', 'Dinamico', 'Lavalier', 'Shotgun'];
const POLAR_PATTERN_OPTIONS = [
  'Cardioide',
  'Omnidireccional',
  'Bidireccional',
  'Supercardioide',
  'Multiple',
];
const SPEAKER_TYPES = ['Escritorio', 'Barra de sonido', 'Portatil', 'Torre', 'Monitor de estudio'];
const SPEAKER_CHANNELS = ['2.0', '2.1', '5.1', '7.1'];
const WEBCAM_BRANDS = ['Logitech', 'Redragon', 'Otros'];
const CAPTURE_CARD_BRANDS = ['Corsair', 'Streamplify', 'Otros'];
const CABLE_HUB_BRANDS = ['Cabletime', 'Ugreen', 'Otros'];
const VIDEO_RESOLUTION_OPTIONS = ['HD', 'FHD', '4K'];
const WEBCAM_FPS_OPTIONS = ['30', '60'];
const CAPTURE_CARD_FPS_OPTIONS = ['30', '60', '120'];
const CABLE_HUB_TYPES = ['Cable', 'Hub'];
const CABLE_TYPES = [
  'HDMI a HDMI',
  'DisplayPort a DisplayPort',
  'Tipo C a HDMI',
  'Tipo C a DisplayPort',
  'Tipo C a Tipo C',
];
const CABLE_LENGTHS = ['1', '2', '3'];
const HUB_INPUT_TYPES = ['USB-C', 'USB-A'];
const POLLING_RATES = ['1000', '2000', '4000', '8000'];
const MOUSE_POWER_TYPES = ['Pila', 'Bateria', 'Ninguno'];
const CHAIR_MATERIALS = ['Cuero sintetico', 'Tela', 'Malla', 'Mixto', 'Otro'];


  return { CPU_BRANDS, MOTHERBOARD_BRANDS, CPU_SOCKETS_BY_BRAND, SOCKETS, M2_FORM_FACTORS, COOLER_BRANDS, COOLER_TYPES, COOLER_RADIATOR_OPTIONS, STORAGE_TYPES, NVME_GENS, FORM_FACTORS, CASE_BRANDS, CASE_RADIATOR_SUPPORT_OPTIONS, CASE_RADIATOR_SUPPORT_LABELS, RAM_TYPES, RAM_BRANDS, RAM_CAPACITIES, GPU_BRANDS, GPU_CHIPSETS, GPU_VRAM_OPTIONS, GPU_VRAM_TYPES, GPU_FAN_OPTIONS, PSU_BRANDS, PSU_WATT_OPTIONS, PSU_CERTS, PSU_MODULAR_OPTIONS, LAPTOP_BRANDS, LAPTOP_RAM_OPTIONS, LAPTOP_STORAGE_OPTIONS, LAPTOP_SCREEN_OPTIONS, LAPTOP_REFRESH_OPTIONS, LAPTOP_SUPPORTED_SIZE_OPTIONS, LAPTOP_RAM_LABELS, LAPTOP_STORAGE_LABELS, DESKTOP_COOLER_TYPES, PANEL_TYPES, MONITOR_BRANDS, MONITOR_RESOLUTION_OPTIONS, MONITOR_REFRESH_OPTIONS, MONITOR_PORTS, PERIPHERAL_CONNECTIONS, MOUSE_CONNECTIONS, KEYBOARD_BRANDS, KEYBOARD_TYPES, KEYBOARD_FORM_FACTORS, LAYOUT_LANGUAGES, MOUSE_TYPES, MOUSE_BRANDS, MOUSEPAD_BRANDS, LAPTOP_COOLING_BASE_BRANDS, LAPTOP_COOLING_BASE_FAN_COUNTS, LAPTOP_ACCESSORY_CONNECTIVITY, BACKPACK_BRANDS, ACCESSORY_COLOR_OPTIONS, HEADSET_BRANDS, MICROPHONE_BRANDS, SPEAKER_BRANDS, HEADSET_CONNECTION_TYPES, HEADSET_WIRED_CONNECTIONS, HEADSET_WIRELESS_CONNECTIONS, AUDIO_CONNECTIVITY_OPTIONS, AUDIO_CONNECTION_TYPE_OPTIONS, HEADSET_AUDIO_TYPES, HEADSET_SURROUND_OPTIONS, MICROPHONE_TYPES, POLAR_PATTERN_OPTIONS, SPEAKER_TYPES, SPEAKER_CHANNELS, WEBCAM_BRANDS, CAPTURE_CARD_BRANDS, CABLE_HUB_BRANDS, VIDEO_RESOLUTION_OPTIONS, WEBCAM_FPS_OPTIONS, CAPTURE_CARD_FPS_OPTIONS, CABLE_HUB_TYPES, CABLE_TYPES, CABLE_LENGTHS, HUB_INPUT_TYPES, POLLING_RATES, MOUSE_POWER_TYPES, CHAIR_MATERIALS };
})();
