import { Injectable } from '@nestjs/common';
import { Workbook, type Worksheet } from 'exceljs';
import { resolveImportProductType, TEMPLATE_GENERAL_COLUMNS } from './product-import-catalog';
import type { ProductImportBody } from './product-import.types';

type TemplateDefinition = {
  filename: string;
  omitGeneralColumns?: string[];
  specificColumns: string[];
  example: Record<string, string | number>;
  allowedValues: Array<[string, string]>;
};

type GeneratedTemplate = {
  buffer: Buffer;
  filename: string;
  contentType: string;
};

const EXCEL_CONTENT_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const COMMON_ALLOWED_VALUES: Array<[string, string]> = [
  ['booleanos', 'Si, No'],
  [
    'imagenesArchivos',
    'Separar multiples archivos con punto y coma. Ej: producto-1.jpg; producto-2.jpg',
  ],
  ['imagenes permitidas', 'jpg, jpeg, png, webp'],
];

const TEMPLATE_DEFINITIONS: Record<string, TemplateDefinition> = {
  CPU: {
    filename: 'plantilla-procesador.xlsx',
    omitGeneralColumns: ['marca'],
    specificColumns: [
      'marcaProcesador',
      'socket',
      'tdpBase',
      'tdpMaximo',
      'nucleos',
      'threads',
      'frecuenciaGhz',
      'graficosIntegrados',
      'incluyeCooler',
    ],
    example: {
      nombre: 'PROCESADOR AMD RYZEN 5 7600X 4.7GHZ 6 NUCLEOS AM5',
      sku: '100-100000593WOF',
      precio: 899,
      stock: 5,
      descripcion:
        'Procesador AMD Ryzen 5 7600X para socket AM5, 6 nucleos, 12 threads, frecuencia base 4.7GHz y graficos integrados.',
      imagenPrincipal: 'ryzen-5-7600x-1.jpg',
      imagenesArchivos: 'ryzen-5-7600x-1.jpg; ryzen-5-7600x-2.jpg',
      marcaProcesador: 'AMD',
      socket: 'AM5',
      tdpBase: 105,
      tdpMaximo: 142,
      nucleos: 6,
      threads: 12,
      frecuenciaGhz: 4.7,
      graficosIntegrados: 'Si',
      incluyeCooler: 'No',
    },
    allowedValues: [
      ['socket', 'AM4, AM5, sTR5, LGA1700, LGA1851'],
      ['marcaProcesador', 'AMD, Intel'],
      ...COMMON_ALLOWED_VALUES,
    ],
  },
  MOTHERBOARD: {
    filename: 'plantilla-placa-madre.xlsx',
    specificColumns: [
      'socket',
      'formato',
      'tipoRam',
      'slotsRam',
      'slotsM2',
      'm2_2230',
      'm2_2242',
      'm2_2260',
      'm2_2280',
      'm2_22110',
    ],
    example: {
      nombre: 'MOTHERBOARD GIGABYTE B650M D3HP AX MATX AMD AM5',
      sku: 'B650M D3HP AX',
      marca: 'GIGABYTE',
      precio: 485,
      stock: 1,
      descripcion:
        'Placa madre Gigabyte B650M D3HP AX para procesadores AMD AM5, formato Micro ATX, soporte DDR5, 4 slots de memoria RAM y 2 ranuras M.2.',
      imagenPrincipal: 'b650m-d3hp-ax-1.jpg',
      imagenesArchivos: 'b650m-d3hp-ax-1.jpg; b650m-d3hp-ax-2.jpg',
      socket: 'AM5',
      formato: 'MICRO ATX',
      tipoRam: 'DDR5',
      slotsRam: 4,
      slotsM2: 2,
      m2_2230: 'No',
      m2_2242: 'No',
      m2_2260: 'No',
      m2_2280: 'Si',
      m2_22110: 'Si',
    },
    allowedValues: [
      ['socket', 'AM4, AM5, sTR5, LGA1700, LGA1851'],
      ['formato', 'ATX, MICRO ATX, MINI ITX, E-ATX'],
      ['tipoRam', 'DDR3, DDR4, DDR5'],
      ...COMMON_ALLOWED_VALUES,
    ],
  },
  RAM: {
    filename: 'plantilla-memoria-ram.xlsx',
    specificColumns: ['tipoRam', 'capacidadPorModulo', 'frecuencia', 'modulos', 'latencia', 'rgb'],
    example: {
      nombre: 'MEMORIA RAM KINGSTON FURY BEAST 16GB DDR5 6000MHZ',
      sku: 'KF560C36BBE-16',
      marca: 'Kingston',
      precio: 210,
      stock: 10,
      descripcion:
        'Memoria RAM Kingston Fury Beast DDR5 de 16GB por modulo a 6000MHz, latencia CL36.',
      imagenPrincipal: 'kingston-fury-ddr5-16gb-1.jpg',
      imagenesArchivos: 'kingston-fury-ddr5-16gb-1.jpg; kingston-fury-ddr5-16gb-2.jpg',
      tipoRam: 'DDR5',
      capacidadPorModulo: '16GB',
      frecuencia: '6000MHz',
      modulos: '1x16GB',
      latencia: 'CL36',
      rgb: 'No',
    },
    allowedValues: [
      ['tipoRam', 'DDR3, DDR4, DDR5'],
      ['marca', 'Kingston, TeamGroup, ADATA, Corsair, Otros'],
      ['capacidadPorModulo', 'Ej: 8GB, 16GB, 24GB, 32GB'],
      ['frecuencia', 'Ej: 3200MHz, 5600MHz, 6000MHz'],
      ['modulos', 'Ej: 1x16GB, 2x16GB'],
      ['latencia', 'Ej: CL16, CL18, CL30, CL36, CL40'],
      ...COMMON_ALLOWED_VALUES,
    ],
  },
  GPU: {
    filename: 'plantilla-tarjeta-video.xlsx',
    specificColumns: [
      'chipset',
      'vram',
      'tipoVram',
      'tdp',
      'fuenteRecomendada',
      'largoMm',
      'ventiladores',
    ],
    example: {
      nombre: 'TARJETA DE VIDEO MSI RTX 4070 SUPER 12GB GDDR6X',
      sku: 'RTX 4070 SUPER 12G',
      marca: 'MSI',
      precio: 2899,
      stock: 3,
      descripcion:
        'Tarjeta de video MSI GeForce RTX 4070 SUPER con 12GB GDDR6X, largo de 305 mm y triple ventilador.',
      imagenPrincipal: 'msi-rtx-4070-super-1.jpg',
      imagenesArchivos: 'msi-rtx-4070-super-1.jpg; msi-rtx-4070-super-2.jpg',
      chipset: 'NVIDIA GeForce',
      vram: 12,
      tipoVram: 'GDDR6X',
      tdp: 220,
      fuenteRecomendada: '650W',
      largoMm: 305,
      ventiladores: 3,
    },
    allowedValues: [
      ['chipset', 'NVIDIA GeForce, AMD Radeon, Intel Arc'],
      ['tipoVram', 'GDDR6, GDDR6X, GDDR7'],
      ['vram', 'Ej: 8GB, 12GB, 16GB'],
      ['tdp', 'Numero en watts. Ej: 220'],
      ['fuenteRecomendada', 'Ej: 650W, 750W'],
      ['largoMm', 'Numero en milimetros. Ej: 305'],
      ['ventiladores', '1, 2, 3, 4'],
      ...COMMON_ALLOWED_VALUES,
    ],
  },
  PSU: {
    filename: 'plantilla-fuente-poder.xlsx',
    specificColumns: ['potenciaWatts', 'certificacion', 'modularidad', 'formato'],
    example: {
      nombre: 'FUENTE MSI MAG A750GL 750W 80 PLUS GOLD FULL MODULAR',
      sku: 'MAG A750GL PCIE5',
      marca: 'MSI',
      precio: 420,
      stock: 4,
      descripcion:
        'Fuente de poder MSI MAG A750GL de 750W con certificacion 80 Plus Gold y cableado full modular.',
      imagenPrincipal: 'msi-mag-a750gl-1.jpg',
      imagenesArchivos: 'msi-mag-a750gl-1.jpg; msi-mag-a750gl-2.jpg',
      potenciaWatts: 750,
      certificacion: '80 PLUS GOLD',
      modularidad: 'FULL MODULAR',
      formato: 'ATX',
    },
    allowedValues: [
      [
        'certificacion',
        '80 PLUS BRONZE, 80 PLUS SILVER, 80 PLUS GOLD, 80 PLUS PLATINUM, 80 PLUS TITANIUM',
      ],
      ['modularidad', 'NO MODULAR, SEMI MODULAR, FULL MODULAR'],
      ['formato', 'ATX, SFX'],
      ...COMMON_ALLOWED_VALUES,
    ],
  },
  CASE: {
    filename: 'plantilla-gabinete-case.xlsx',
    specificColumns: [
      'soportePlaca',
      'largoGpuMax',
      'soporteRadiadorLiquido',
      'soportaRefrigeracionTorre',
      'ventiladoresIncluidos',
    ],
    example: {
      nombre: 'CASE MSI MAG FORGE 120A AIRFLOW ATX',
      sku: 'MAG FORGE 120A AIRFLOW',
      marca: 'MSI',
      precio: 260,
      stock: 5,
      descripcion:
        'Gabinete MSI MAG Forge 120A Airflow compatible con placas ATX, Micro-ATX y Mini-ITX, soporte para GPU de hasta 330 mm y refrigeración de torre.',
      imagenPrincipal: 'msi-mag-forge-120a-1.jpg',
      imagenesArchivos: 'msi-mag-forge-120a-1.jpg; msi-mag-forge-120a-2.jpg',
      soportePlaca: 'ATX; Micro-ATX; Mini-ITX',
      largoGpuMax: 330,
      soporteRadiadorLiquido: '120 mm; 240 mm; 360 mm',
      soportaRefrigeracionTorre: 'Si',
      ventiladoresIncluidos: 3,
    },
    allowedValues: [
      ['soportePlaca', 'ATX; Micro-ATX; Mini-ITX; E-ATX'],
      ['largoGpuMax', 'Numero en milimetros. Ej: 330'],
      [
        'soporteRadiadorLiquido',
        'No soporta; 120 mm; 140 mm; 240 mm; 280 mm; 360 mm; 420 mm; 460 mm',
      ],
      ['soportaRefrigeracionTorre', 'Si, No'],
      ['ventiladoresIncluidos', 'Numero entero. Ej: 3'],
      ...COMMON_ALLOWED_VALUES,
    ],
  },
  COOLER: {
    filename: 'plantilla-refrigeracion.xlsx',
    specificColumns: [
      'tipo',
      'socketSoportado',
      'radiadorMm',
      'tdpSoportado',
      'pantallaLcd',
      'rgb',
    ],
    example: {
      nombre: 'COOLER LIQUIDO DEEPCOOL LS720 SE 360MM ARGB',
      sku: 'LS720 SE 360',
      marca: 'DEEPCOOL',
      precio: 420,
      stock: 4,
      descripcion:
        'Refrigeracion liquida DeepCool LS720 SE de 360 mm con iluminacion ARGB, compatible con sockets AMD e Intel.',
      imagenPrincipal: 'deepcool-ls720-se-1.jpg',
      imagenesArchivos: 'deepcool-ls720-se-1.jpg; deepcool-ls720-se-2.jpg',
      tipo: 'Líquida',
      socketSoportado: 'AM4; AM5; LGA1700; LGA1851',
      radiadorMm: 360,
      tdpSoportado: 300,
      pantallaLcd: 'No',
      rgb: 'Si',
    },
    allowedValues: [
      ['tipo', 'Torre, Líquida'],
      ['socketSoportado', 'AM4; AM5; sTR5; LGA1700; LGA1851'],
      ['radiadorMm', 'Usar para refrigeracion liquida. Numero en milimetros.'],
      ['pantallaLcd', 'Si, No'],
      ['rgb', 'Si, No'],
      ...COMMON_ALLOWED_VALUES,
    ],
  },
  STORAGE: {
    filename: 'plantilla-almacenamiento.xlsx',
    specificColumns: [
      'tipoAlmacenamiento',
      'capacidadGB',
      'generacion',
      'velocidadLecturaMBs',
      'velocidadEscrituraMBs',
      'tamanoFisicoM2',
    ],
    example: {
      nombre: 'SSD KINGSTON NV2 1TB M.2 NVME',
      sku: 'SNV2S-1000G',
      marca: 'KINGSTON',
      precio: 250,
      stock: 8,
      descripcion: 'Unidad SSD Kingston NV2 de 1TB con interfaz NVMe PCIe y formato M.2 2280.',
      imagenPrincipal: 'kingston-nv2-1tb-1.jpg',
      imagenesArchivos: 'kingston-nv2-1tb-1.jpg; kingston-nv2-1tb-2.jpg',
      tipoAlmacenamiento: 'Sólido M.2',
      capacidadGB: 1000,
      generacion: 'PCIe 4.0',
      velocidadLecturaMBs: 3500,
      velocidadEscrituraMBs: 2100,
      tamanoFisicoM2: '2280',
    },
    allowedValues: [
      ['tipoAlmacenamiento', 'SSD 2.5, Sólido M.2, HDD 3.5'],
      ['capacidadGB', 'Numero en GB. Ej: 1000 para 1TB'],
      [
        'generacion',
        'Para Sólido M.2: SATA, PCIe 3.0, PCIe 4.0 o PCIe 5.0. Para SSD 2.5/HDD 3.5: vacio o SATA.',
      ],
      ['velocidadLecturaMBs', 'Numero en MB/s. Ej: 3500'],
      ['velocidadEscrituraMBs', 'Numero en MB/s. Ej: 2100'],
      ['tamanoFisicoM2', '2230, 2242, 2260, 2280, 22110. Solo para Sólido M.2'],
      ...COMMON_ALLOWED_VALUES,
    ],
  },
  LAPTOP: {
    filename: 'plantilla-laptop.xlsx',
    specificColumns: [
      'procesador',
      'memoriaRam',
      'almacenamiento',
      'tieneGraficaDedicada',
      'marcaGpu',
      'modeloGpu',
      'tamanoPantalla',
      'tasaRefrescoHz',
      'incluyeWindowsSerie',
    ],
    example: {
      nombre: 'LAPTOP GAMER ASUS TUF F15 I7 16GB 512GB RTX 4060 15.6 144HZ',
      sku: 'ASUS-TUF-F15-I7-RTX4060',
      marca: 'ASUS',
      precio: 4299,
      stock: 3,
      descripcion:
        'Laptop gamer ASUS TUF F15 con procesador Intel Core i7, 16GB de RAM, SSD de 512GB, grafica dedicada RTX 4060 y pantalla de 15.6 pulgadas a 144Hz.',
      imagenPrincipal: 'asus-tuf-f15-1.jpg',
      imagenesArchivos: 'asus-tuf-f15-1.jpg; asus-tuf-f15-2.jpg',
      procesador: 'Intel Core i7-13700H',
      memoriaRam: '16 GB',
      almacenamiento: '512 GB SSD',
      tieneGraficaDedicada: 'Si',
      marcaGpu: 'NVIDIA',
      modeloGpu: 'RTX 4060',
      tamanoPantalla: '15.6"',
      tasaRefrescoHz: '144 Hz',
      incluyeWindowsSerie: 'Si',
    },
    allowedValues: [
      ['memoriaRam', '8 GB, 12 GB, 16 GB, 24 GB, 32 GB, 48 GB, 64 GB'],
      ['tieneGraficaDedicada', 'Si, No'],
      ['marcaGpu', 'NVIDIA, AMD, Intel, No aplica, Otros'],
      ['tamanoPantalla', '14", 15.6", 16", 17.3"'],
      ['tasaRefrescoHz', '60 Hz, 75 Hz, 120 Hz, 144 Hz, 165 Hz, 240 Hz, 300 Hz, 360 Hz'],
      ['incluyeWindowsSerie', 'Si, No'],
      ...COMMON_ALLOWED_VALUES,
    ],
  },
  PC_DESKTOP: {
    filename: 'plantilla-pc-desktop.xlsx',
    specificColumns: [
      'procesador',
      'memoriaRam',
      'almacenamiento',
      'tieneGraficaDedicada',
      'marcaGpu',
      'modeloGpu',
      'coolerIncluido',
      'fuentePoderWatts',
      'modeloCase',
    ],
    example: {
      nombre: 'PC GAMER RYZEN 5 7600 16GB DDR5 1TB RTX 4060',
      sku: 'PC-R5-7600-RTX4060',
      marca: 'PCSystemStore',
      precio: 3899,
      stock: 2,
      descripcion:
        'PC gamer pre-ensamblada con procesador Ryzen 5 7600, 16GB de RAM DDR5, SSD de 1TB, tarjeta grafica RTX 4060, fuente de 650W y case gamer.',
      imagenPrincipal: 'pc-gamer-r5-7600-rtx4060-1.jpg',
      imagenesArchivos: 'pc-gamer-r5-7600-rtx4060-1.jpg; pc-gamer-r5-7600-rtx4060-2.jpg',
      procesador: 'AMD Ryzen 5 7600',
      memoriaRam: '16 GB',
      almacenamiento: '1TB NVMe',
      tieneGraficaDedicada: 'Si',
      marcaGpu: 'NVIDIA',
      modeloGpu: 'RTX 4060',
      coolerIncluido: 'De serie',
      fuentePoderWatts: 650,
      modeloCase: 'MSI Gungnir 110M',
    },
    allowedValues: [
      ['memoriaRam', '8 GB, 12 GB, 16 GB, 24 GB, 32 GB, 48 GB, 64 GB'],
      ['tieneGraficaDedicada', 'Si, No'],
      ['marcaGpu', 'NVIDIA, AMD, Intel, No aplica, Otros'],
      ['coolerIncluido', 'De serie, Torre, Liquida, No incluye'],
      ['fuentePoderWatts', 'Numero en watts. Ej: 650'],
      ...COMMON_ALLOWED_VALUES,
    ],
  },
  SOFTWARE: {
    filename: 'plantilla-software-licencia.xlsx',
    specificColumns: ['tipoLicencia', 'plataforma'],
    example: {
      nombre: 'LICENCIA WINDOWS 11 PRO DIGITAL',
      sku: 'WIN11-PRO-DIGITAL',
      marca: 'Microsoft',
      precio: 120,
      stock: 20,
      descripcion:
        'Licencia digital para Windows 11 Pro compatible con activacion en equipos personales.',
      imagenPrincipal: 'windows-11-pro-1.jpg',
      imagenesArchivos: 'windows-11-pro-1.jpg',
      tipoLicencia: 'Digital',
      plataforma: 'Windows',
    },
    allowedValues: [
      ['tipoLicencia', 'Digital, OEM, Retail, Suscripcion'],
      ['plataforma', 'Windows, Office, Antivirus, Otro'],
      ...COMMON_ALLOWED_VALUES,
    ],
  },
  LAPTOP_COOLING_BASE: {
    filename: 'plantilla-base-refrigeradora.xlsx',
    specificColumns: ['tamanoLaptopSoportado', 'ventiladores', 'rgb', 'color'],
    example: {
      nombre: 'BASE REFRIGERADORA PARA LAPTOP 15.6 RGB',
      sku: 'BASE-RGB-156',
      marca: 'Cooler Master',
      precio: 90,
      stock: 6,
      descripcion:
        'Base refrigeradora para laptop de hasta 15.6 pulgadas con ventiladores integrados e iluminacion RGB.',
      imagenPrincipal: 'base-refrigeradora-rgb-1.jpg',
      imagenesArchivos: 'base-refrigeradora-rgb-1.jpg; base-refrigeradora-rgb-2.jpg',
      tamanoLaptopSoportado: '15.6"',
      ventiladores: 2,
      rgb: 'Si',
      color: 'Negro',
    },
    allowedValues: [
      ['tamanoLaptopSoportado', '14", 15.6", 16", 17.3"'],
      ['ventiladores', 'Numero entero. Ej: 2'],
      ['rgb', 'Si, No'],
      ['color', 'Negro, Gris, Blanco, Otros'],
      ...COMMON_ALLOWED_VALUES,
    ],
  },
  BACKPACK: {
    filename: 'plantilla-mochila.xlsx',
    specificColumns: ['color', 'tamanoLaptopSoportado'],
    example: {
      nombre: 'MOCHILA PARA LAPTOP LENOVO 15.6 NEGRA',
      sku: 'MOCHILA-LENOVO-156-NEGRA',
      marca: 'Lenovo',
      precio: 85,
      stock: 10,
      descripcion:
        'Mochila para laptop de hasta 15.6 pulgadas, color negro, con compartimentos para accesorios.',
      imagenPrincipal: 'mochila-lenovo-156-1.jpg',
      imagenesArchivos: 'mochila-lenovo-156-1.jpg; mochila-lenovo-156-2.jpg',
      color: 'Negro',
      tamanoLaptopSoportado: '15.6"',
    },
    allowedValues: [
      ['color', 'Negro, Gris, Azul, Rojo, Otros'],
      ['tamanoLaptopSoportado', '14", 15.6", 16", 17.3"'],
      ...COMMON_ALLOWED_VALUES,
    ],
  },
  MONITOR: {
    filename: 'plantilla-monitor.xlsx',
    specificColumns: [
      'tamanoPulgadas',
      'resolucion',
      'panel',
      'hz',
      'latenciaMs',
      'parlantesIntegrados',
      'puertoVga',
      'puertoHdmi',
      'puertoDisplayPort',
      'puertoUsbC',
    ],
    example: {
      nombre: 'MONITOR MSI 24 FHD IPS 180HZ 1MS',
      sku: 'MSI-24-FHD-180HZ',
      marca: 'MSI',
      precio: 699,
      stock: 5,
      descripcion:
        'Monitor MSI de 24 pulgadas con resolucion FHD, panel IPS, frecuencia de 180Hz y tiempo de respuesta de 1ms.',
      imagenPrincipal: 'monitor-msi-24-180hz-1.jpg',
      imagenesArchivos: 'monitor-msi-24-180hz-1.jpg; monitor-msi-24-180hz-2.jpg',
      tamanoPulgadas: 24,
      resolucion: 'FHD (1920x1080)',
      panel: 'IPS',
      hz: '180 Hz',
      latenciaMs: 1,
      parlantesIntegrados: 'No',
      puertoVga: 'No',
      puertoHdmi: 'Si',
      puertoDisplayPort: 'Si',
      puertoUsbC: 'No',
    },
    allowedValues: [
      [
        'resolucion',
        'HD (1366x768), FHD (1920x1080), QHD (2560x1440), UWQHD (3440x1440), 4K (3840x2160)',
      ],
      ['panel', 'IPS, VA, TN, OLED, Mini LED'],
      ['hz', '60 Hz, 75 Hz, 100 Hz, 120 Hz, 144 Hz, 165 Hz, 180 Hz, 200 Hz, 240 Hz, 360 Hz'],
      ['latenciaMs', 'Numero en milisegundos. Ej: 1'],
      ...COMMON_ALLOWED_VALUES,
    ],
  },
  KEYBOARD: {
    filename: 'plantilla-teclado.xlsx',
    specificColumns: [
      'tipoTeclado',
      'conectividad',
      'idiomaLayout',
      'formatoTeclado',
      'tipoSwitch',
    ],
    example: {
      nombre: 'TECLADO MECANICO MSI VIGOR GK50 TKL RGB ESPANOL',
      sku: 'MSI-GK50-TKL-ES',
      marca: 'MSI',
      precio: 220,
      stock: 6,
      descripcion:
        'Teclado mecanico MSI Vigor GK50 TKL con iluminacion RGB, layout espanol y conectividad cableada.',
      imagenPrincipal: 'teclado-msi-gk50-tkl-1.jpg',
      imagenesArchivos: 'teclado-msi-gk50-tkl-1.jpg; teclado-msi-gk50-tkl-2.jpg',
      tipoTeclado: 'Mecanico',
      conectividad: 'Cableado',
      idiomaLayout: 'Espanol',
      formatoTeclado: 'TKL',
      tipoSwitch: 'Red',
    },
    allowedValues: [
      ['tipoTeclado', 'Mecanico, Membrana, Magnetico, Optico, Hibrido'],
      ['conectividad', 'Cableado; Bluetooth; Dongle USB'],
      ['idiomaLayout', 'Espanol, Ingles, Latinoamericano'],
      ['formatoTeclado', 'Completo, TKL, 80%, 75%, 65%, 60%'],
      ['tipoSwitch mecanico', 'Red, Blue, Brown, Silver, Black, Silent Red, Speed'],
      [
        'tipoSwitch magnetico',
        'Magnetic HE, Hall Effect, Magnetic Jade, Magnetic White, Magnetic Red',
      ],
      ['tipoSwitch optico', 'Optical Red, Optical Blue, Optical Brown'],
      ['tipoSwitch membrana', 'Membrana, Rubber Dome, No aplica'],
      ...COMMON_ALLOWED_VALUES,
    ],
  },
  MOUSE: {
    filename: 'plantilla-mouse.xlsx',
    specificColumns: ['dpi', 'conectividad', 'sensor', 'botones', 'rgb', 'pesoGramos'],
    example: {
      nombre: 'MOUSE LOGITECH G PRO X SUPERLIGHT 2 INALAMBRICO',
      sku: 'LOGI-GPX-SL2',
      marca: 'Logitech',
      precio: 520,
      stock: 4,
      descripcion:
        'Mouse inalambrico Logitech G Pro X Superlight 2 con sensor de alta precision y diseno ultraligero.',
      imagenPrincipal: 'logitech-gpx-superlight-2-1.jpg',
      imagenesArchivos: 'logitech-gpx-superlight-2-1.jpg; logitech-gpx-superlight-2-2.jpg',
      dpi: 32000,
      conectividad: 'Inalambrico',
      sensor: 'Optico',
      botones: 5,
      rgb: 'No',
      pesoGramos: 60,
    },
    allowedValues: [
      [
        'conectividad',
        'Cableado, Inalambrico, Bluetooth, 2.4 GHz, Cableado; Bluetooth, Bluetooth; 2.4 GHz',
      ],
      ['sensor', 'Optico, Laser'],
      ['rgb', 'Si, No'],
      ...COMMON_ALLOWED_VALUES,
    ],
  },
  MOUSEPAD: {
    filename: 'plantilla-mousepad.xlsx',
    specificColumns: ['tamano', 'material', 'rgb', 'baseAntideslizante', 'color'],
    example: {
      nombre: 'MOUSEPAD HYPERX FURY S LARGE NEGRO',
      sku: 'HYPERX-FURY-S-L',
      marca: 'HyperX',
      precio: 70,
      stock: 10,
      descripcion:
        'Mousepad HyperX Fury S tamano Large con superficie de tela y base antideslizante.',
      imagenPrincipal: 'hyperx-fury-s-large-1.jpg',
      imagenesArchivos: 'hyperx-fury-s-large-1.jpg',
      tamano: 'Large',
      material: 'Tela',
      rgb: 'No',
      baseAntideslizante: 'Si',
      color: 'Negro',
    },
    allowedValues: [
      ['tamano', 'Small, Medium, Large, XL, XXL, Deskmat'],
      ['material', 'Tela, Plastico, Hibrido, Vidrio'],
      ['rgb', 'Si, No'],
      ['baseAntideslizante', 'Si, No'],
      ['color', 'Negro, Gris, Blanco, Otros'],
      ...COMMON_ALLOWED_VALUES,
    ],
  },
  CHAIR: {
    filename: 'plantilla-sillas-gamer.xlsx',
    specificColumns: [
      'material',
      'color',
      'pesoMaximoKg',
      'reclinable',
      'reposabrazosAjustable',
      'cojinesIncluidos',
    ],
    example: {
      nombre: 'SILLA GAMER ANTRYX XTREME RACING NEGRA ROJA',
      sku: 'ANTRYX-XTREME-RACING-NR',
      marca: 'Antryx',
      precio: 650,
      stock: 3,
      descripcion:
        'Silla gamer reclinable con diseno racing, reposabrazos ajustables y cojines incluidos.',
      imagenPrincipal: 'silla-gamer-antryx-1.jpg',
      imagenesArchivos: 'silla-gamer-antryx-1.jpg; silla-gamer-antryx-2.jpg',
      material: 'Cuero sintetico',
      color: 'Negro/Rojo',
      pesoMaximoKg: 120,
      reclinable: 'Si',
      reposabrazosAjustable: 'Si',
      cojinesIncluidos: 'Si',
    },
    allowedValues: [
      ['material', 'Cuero sintetico, Tela, Malla, Hibrido'],
      ['reclinable', 'Si, No'],
      ['reposabrazosAjustable', 'Si, No'],
      ['cojinesIncluidos', 'Si, No'],
      ...COMMON_ALLOWED_VALUES,
    ],
  },
  GAMING_DESK: {
    filename: 'plantilla-mesas-gamer.xlsx',
    specificColumns: [
      'largoCm',
      'anchoCm',
      'alturaCm',
      'material',
      'rgb',
      'soporteAudifonos',
      'soporteVasos',
      'color',
    ],
    example: {
      nombre: 'MESA GAMER RGB 120CM NEGRA',
      sku: 'MESA-GAMER-RGB-120',
      marca: 'Generica',
      precio: 380,
      stock: 4,
      descripcion:
        'Mesa gamer de 120 cm con iluminacion RGB, soporte para audifonos y soporte para vaso.',
      imagenPrincipal: 'mesa-gamer-rgb-120-1.jpg',
      imagenesArchivos: 'mesa-gamer-rgb-120-1.jpg; mesa-gamer-rgb-120-2.jpg',
      largoCm: 120,
      anchoCm: 60,
      alturaCm: 75,
      material: 'MDF/Metal',
      rgb: 'Si',
      soporteAudifonos: 'Si',
      soporteVasos: 'Si',
      color: 'Negro',
    },
    allowedValues: [
      ['rgb', 'Si, No'],
      ['soporteAudifonos', 'Si, No'],
      ['soporteVasos', 'Si, No'],
      ...COMMON_ALLOWED_VALUES,
    ],
  },
  WEBCAM: {
    filename: 'plantilla-webcam.xlsx',
    specificColumns: [
      'resolucion',
      'fps',
      'microfonoIntegrado',
      'enfoqueAutomatico',
      'conexion',
      'campoVisionGrados',
    ],
    example: {
      nombre: 'WEBCAM LOGITECH C920 FHD 1080P 30FPS',
      sku: 'LOGI-C920-FHD',
      marca: 'Logitech',
      precio: 280,
      stock: 5,
      descripcion:
        'Webcam Logitech C920 con resolucion Full HD 1080p, 30 FPS y microfono integrado.',
      imagenPrincipal: 'logitech-c920-1.jpg',
      imagenesArchivos: 'logitech-c920-1.jpg',
      resolucion: '1080p',
      fps: 30,
      microfonoIntegrado: 'Si',
      enfoqueAutomatico: 'Si',
      conexion: 'USB',
      campoVisionGrados: 78,
    },
    allowedValues: [
      ['resolucion', '720p, 1080p, 1440p, 4K'],
      ['fps', '30, 60'],
      ['conexion', 'USB, USB-C'],
      ...COMMON_ALLOWED_VALUES,
    ],
  },
  CAPTURE_CARD: {
    filename: 'plantilla-capturadora.xlsx',
    specificColumns: [
      'resolucionCaptura',
      'fpsCaptura',
      'entrada',
      'salida',
      'conexionPc',
      'passthrough',
      'compatibleConsolas',
    ],
    example: {
      nombre: 'CAPTURADORA ELGATO HD60 X 1080P 60FPS',
      sku: 'ELGATO-HD60X',
      marca: 'Elgato',
      precio: 720,
      stock: 2,
      descripcion: 'Capturadora Elgato HD60 X con captura 1080p a 60 FPS y passthrough 4K.',
      imagenPrincipal: 'elgato-hd60x-1.jpg',
      imagenesArchivos: 'elgato-hd60x-1.jpg; elgato-hd60x-2.jpg',
      resolucionCaptura: '1080p',
      fpsCaptura: 60,
      entrada: 'HDMI',
      salida: 'HDMI',
      conexionPc: 'USB-C',
      passthrough: '4K 60Hz',
      compatibleConsolas: 'Si',
    },
    allowedValues: [
      ['resolucionCaptura', '720p, 1080p, 1440p, 4K'],
      ['fpsCaptura', '30, 60, 120'],
      ['entrada', 'HDMI'],
      ['salida', 'HDMI'],
      ['conexionPc', 'USB, USB-C'],
      ...COMMON_ALLOWED_VALUES,
    ],
  },
  CABLE_HUB: {
    filename: 'plantilla-cables-y-hub.xlsx',
    specificColumns: [
      'tipoAccesorio',
      'conectores',
      'longitudMetros',
      'velocidadTransferencia',
      'potenciaCargaWatts',
      'material',
      'color',
    ],
    example: {
      nombre: 'HUB USB-C 6 EN 1 HDMI USB 3.0 PD',
      sku: 'HUB-USBC-6EN1',
      marca: 'UGREEN',
      precio: 120,
      stock: 8,
      descripcion: 'Hub USB-C 6 en 1 con HDMI, USB 3.0, lector SD y carga PD.',
      imagenPrincipal: 'hub-usbc-6en1-1.jpg',
      imagenesArchivos: 'hub-usbc-6en1-1.jpg; hub-usbc-6en1-2.jpg',
      tipoAccesorio: 'Hub',
      conectores: 'USB-C; HDMI; USB-A; SD; MicroSD',
      longitudMetros: '',
      velocidadTransferencia: '5Gbps',
      potenciaCargaWatts: 100,
      material: 'Aluminio',
      color: 'Gris',
    },
    allowedValues: [
      ['tipoAccesorio', 'Cable, Hub, Adaptador, Dock'],
      ['conectores', 'Separar multiples conectores con punto y coma. Ej: USB-C; HDMI; USB-A'],
      ['longitudMetros', 'Numero en metros para cables. Puede quedar vacio para hubs.'],
      ...COMMON_ALLOWED_VALUES,
    ],
  },
  HEADSET: {
    filename: 'plantilla-audifono-headset.xlsx',
    specificColumns: [
      'tipoAudio',
      'conectividad',
      'tipoConexion',
      'microfonoIntegrado',
      'microfonoRemovible',
      'cancelacionRuido',
      'sonidoSurround',
      'compatibleConsola',
      'rgb',
      'color',
    ],
    example: {
      nombre: 'HEADSET HYPERX CLOUD II 7.1 USB NEGRO ROJO',
      sku: 'HYPERX-CLOUD-II-71',
      marca: 'HyperX',
      precio: 320,
      stock: 5,
      descripcion:
        'Headset HyperX Cloud II con sonido 7.1 virtual, conexion USB y Jack 3.5mm, microfono removible y compatibilidad con PC y consolas.',
      imagenPrincipal: 'hyperx-cloud-ii-1.jpg',
      imagenesArchivos: 'hyperx-cloud-ii-1.jpg; hyperx-cloud-ii-2.jpg',
      tipoAudio: 'Headset',
      conectividad: 'Cableado',
      tipoConexion: 'USB; Jack 3.5mm',
      microfonoIntegrado: 'Si',
      microfonoRemovible: 'Si',
      cancelacionRuido: 'Si',
      sonidoSurround: '7.1 Virtual',
      compatibleConsola: 'Si',
      rgb: 'No',
      color: 'Negro/Rojo',
    },
    allowedValues: [
      ['tipoAudio', 'Audifono, Headset, In-ear, On-ear, Over-ear'],
      [
        'conectividad',
        'Cableado, Inalambrico, Bluetooth, 2.4 GHz, Cableado; Bluetooth, Bluetooth; 2.4 GHz',
      ],
      [
        'tipoConexion',
        'USB, USB-C, Jack 3.5mm, Bluetooth, 2.4 GHz, USB; Jack 3.5mm, Bluetooth; 2.4 GHz',
      ],
      ['microfonoIntegrado', 'Si, No'],
      ['microfonoRemovible', 'Si, No'],
      ['cancelacionRuido', 'Si, No'],
      ['sonidoSurround', 'No, 7.1 Virtual, Dolby Atmos, DTS Headphone:X'],
      ['compatibleConsola', 'Si, No'],
      ['rgb', 'Si, No'],
      ...COMMON_ALLOWED_VALUES,
    ],
  },
  MICROPHONE: {
    filename: 'plantilla-microfono.xlsx',
    specificColumns: [
      'tipoMicrofono',
      'patronPolar',
      'conectividad',
      'tipoConexion',
      'frecuenciaRespuesta',
      'incluyeBrazo',
      'incluyeFiltroPop',
      'rgb',
      'color',
    ],
    example: {
      nombre: 'MICROFONO HYPERX QUADCAST USB RGB',
      sku: 'HYPERX-QUADCAST-USB',
      marca: 'HyperX',
      precio: 450,
      stock: 4,
      descripcion:
        'Microfono USB HyperX QuadCast con iluminacion RGB, patrones polares seleccionables y filtro pop integrado.',
      imagenPrincipal: 'hyperx-quadcast-1.jpg',
      imagenesArchivos: 'hyperx-quadcast-1.jpg; hyperx-quadcast-2.jpg',
      tipoMicrofono: 'Condensador',
      patronPolar: 'Cardioide',
      conectividad: 'Cableado',
      tipoConexion: 'USB',
      frecuenciaRespuesta: '20Hz-20kHz',
      incluyeBrazo: 'No',
      incluyeFiltroPop: 'Si',
      rgb: 'Si',
      color: 'Negro',
    },
    allowedValues: [
      ['tipoMicrofono', 'Condensador, Dinamico, Lavalier, Shotgun'],
      ['patronPolar', 'Cardioide, Omnidireccional, Bidireccional, Supercardioide, Multiple'],
      ['conectividad', 'Cableado, Inalambrico'],
      ['tipoConexion', 'USB, USB-C, XLR, Jack 3.5mm, Bluetooth, 2.4 GHz'],
      ['incluyeBrazo', 'Si, No'],
      ['incluyeFiltroPop', 'Si, No'],
      ['rgb', 'Si, No'],
      ...COMMON_ALLOWED_VALUES,
    ],
  },
  SPEAKER: {
    filename: 'plantilla-parlantes.xlsx',
    specificColumns: [
      'tipoParlante',
      'canales',
      'potenciaWatts',
      'conectividad',
      'tipoConexion',
      'subwoofer',
      'controlRemoto',
      'rgb',
      'color',
    ],
    example: {
      nombre: 'PARLANTES LOGITECH Z407 2.1 BLUETOOTH',
      sku: 'LOGI-Z407-21',
      marca: 'Logitech',
      precio: 420,
      stock: 3,
      descripcion:
        'Parlantes Logitech Z407 sistema 2.1 con subwoofer, conexion Bluetooth, USB y control inalambrico.',
      imagenPrincipal: 'logitech-z407-1.jpg',
      imagenesArchivos: 'logitech-z407-1.jpg; logitech-z407-2.jpg',
      tipoParlante: 'Escritorio',
      canales: '2.1',
      potenciaWatts: 80,
      conectividad: 'Bluetooth; Cableado',
      tipoConexion: 'Bluetooth; USB; Jack 3.5mm',
      subwoofer: 'Si',
      controlRemoto: 'Si',
      rgb: 'No',
      color: 'Negro',
    },
    allowedValues: [
      ['tipoParlante', 'Escritorio, Barra de sonido, Portatil, Torre, Monitor de estudio'],
      ['canales', '2.0, 2.1, 5.1, 7.1'],
      ['potenciaWatts', 'Numero en watts. Ej: 80'],
      ['conectividad', 'Cableado, Bluetooth, 2.4 GHz, Cableado; Bluetooth'],
      ['tipoConexion', 'USB, USB-C, Jack 3.5mm, Bluetooth, RCA, Optico, HDMI ARC'],
      ['subwoofer', 'Si, No'],
      ['controlRemoto', 'Si, No'],
      ['rgb', 'Si, No'],
      ...COMMON_ALLOWED_VALUES,
    ],
  },
};

@Injectable()
export class ProductTemplateService {
  async generateTemplate(query: ProductImportBody): Promise<GeneratedTemplate> {
    const resolved = resolveImportProductType(query.category, query.productType);
    const definition =
      TEMPLATE_DEFINITIONS[resolved.category] ?? this.buildGenericDefinition(resolved);
    const generalColumns = TEMPLATE_GENERAL_COLUMNS.filter(
      (column) => !definition.omitGeneralColumns?.includes(column),
    );
    const columns = [...generalColumns, ...definition.specificColumns];

    const workbook = new Workbook();
    this.buildProductsSheet(workbook.addWorksheet('Productos'), columns, definition.example);
    this.buildInstructionsSheet(
      workbook.addWorksheet('Instrucciones'),
      resolved.group,
      resolved.label,
      columns,
    );
    this.buildAllowedValuesSheet(
      workbook.addWorksheet('Valores permitidos'),
      definition.allowedValues,
    );

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    return {
      buffer,
      filename: definition.filename,
      contentType: EXCEL_CONTENT_TYPE,
    };
  }

  private buildProductsSheet(
    sheet: Worksheet,
    columns: string[],
    example: Record<string, string | number>,
  ) {
    sheet.addRows([columns, columns.map((column) => example[column] ?? ''), columns.map(() => '')]);
    sheet.columns = columns.map((column) => ({
      width: Math.max(14, Math.min(42, column.length + 8)),
    }));
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
  }

  private buildInstructionsSheet(
    sheet: Worksheet,
    group: string,
    productType: string,
    columns: string[],
  ) {
    const rows = [
      ['PCSystemStore - Plantilla de importacion masiva'],
      ['Categoria seleccionada', group],
      ['Tipo de producto seleccionado', productType],
      [],
      ['Instrucciones'],
      ['No cambies los nombres de las columnas.'],
      ['La categoria y tipo de producto se seleccionan en el importador, no dentro del Excel.'],
      ['El archivo ZIP debe contener las imagenes indicadas con nombres exactos.'],
      ['imagenPrincipal debe existir dentro del ZIP y sera la primera imagen del producto.'],
      ['imagenesArchivos acepta varias imagenes separadas por punto y coma.'],
      ['Los valores Si/No seran normalizados por el sistema.'],
      ['Completa una fila por producto. Puedes borrar la fila de ejemplo antes de importar.'],
      [],
      ['Columnas incluidas'],
      ...columns.map((column) => [column]),
    ];
    sheet.addRows(rows);
    sheet.getColumn(1).width = 52;
    sheet.getColumn(2).width = 42;
  }

  private buildAllowedValuesSheet(sheet: Worksheet, allowedValues: Array<[string, string]>) {
    sheet.addRows([['Campo', 'Valores permitidos o sugeridos'], ...allowedValues]);
    sheet.getColumn(1).width = 24;
    sheet.getColumn(2).width = 92;
    sheet.autoFilter = 'A1:B1';
  }

  private buildGenericDefinition(resolved: {
    label: string;
    category: string;
  }): TemplateDefinition {
    const filename = `plantilla-${this.slugify(resolved.label)}.xlsx`;
    return {
      filename,
      specificColumns: [],
      example: {
        nombre: `${resolved.label.toUpperCase()} DE EJEMPLO`,
        sku: `${resolved.category}-EJEMPLO-001`,
        marca: 'MARCA',
        precio: 100,
        stock: 1,
        descripcion: `Producto de ejemplo para ${resolved.label}.`,
        imagenPrincipal: 'producto-ejemplo-1.jpg',
        imagenesArchivos: 'producto-ejemplo-1.jpg; producto-ejemplo-2.jpg',
      },
      allowedValues: COMMON_ALLOWED_VALUES,
    };
  }

  private slugify(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);
  }
}
