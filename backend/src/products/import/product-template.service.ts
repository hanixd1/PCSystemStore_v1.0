import { Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';
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
      'alturaCoolerMax',
      'soporteRadiadorLiquido',
      'ventiladoresIncluidos',
    ],
    example: {
      nombre: 'CASE MSI MAG FORGE 120A AIRFLOW ATX',
      sku: 'MAG FORGE 120A AIRFLOW',
      marca: 'MSI',
      precio: 260,
      stock: 5,
      descripcion:
        'Gabinete MSI MAG Forge 120A Airflow compatible con placas ATX, Micro-ATX y Mini-ITX, soporte para GPU de hasta 330 mm y cooler de hasta 160 mm.',
      imagenPrincipal: 'msi-mag-forge-120a-1.jpg',
      imagenesArchivos: 'msi-mag-forge-120a-1.jpg; msi-mag-forge-120a-2.jpg',
      soportePlaca: 'ATX; Micro-ATX; Mini-ITX',
      largoGpuMax: 330,
      alturaCoolerMax: 160,
      soporteRadiadorLiquido: '120 mm; 240 mm; 360 mm',
      ventiladoresIncluidos: 3,
    },
    allowedValues: [
      ['soportePlaca', 'ATX; Micro-ATX; Mini-ITX; E-ATX'],
      ['largoGpuMax', 'Numero en milimetros. Ej: 330'],
      ['alturaCoolerMax', 'Numero en milimetros. Ej: 160'],
      ['soporteRadiadorLiquido', 'No soporta; 120 mm; 140 mm; 240 mm; 280 mm; 360 mm; 420 mm'],
      ['ventiladoresIncluidos', 'Numero entero. Ej: 3'],
      ...COMMON_ALLOWED_VALUES,
    ],
  },
  COOLER: {
    filename: 'plantilla-refrigeracion.xlsx',
    specificColumns: [
      'tipo',
      'socketSoportado',
      'alturaMm',
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
      alturaMm: '',
      radiadorMm: 360,
      tdpSoportado: 300,
      pantallaLcd: 'No',
      rgb: 'Si',
    },
    allowedValues: [
      ['tipo', 'Torre, Líquida'],
      ['socketSoportado', 'AM4; AM5; sTR5; LGA1700; LGA1851'],
      ['alturaMm', 'Usar para cooler tipo Torre. Numero en milimetros.'],
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
};

@Injectable()
export class ProductTemplateService {
  generateTemplate(query: ProductImportBody): GeneratedTemplate {
    const resolved = resolveImportProductType(query.category, query.productType);
    const definition =
      TEMPLATE_DEFINITIONS[resolved.category] ?? this.buildGenericDefinition(resolved);
    const generalColumns = TEMPLATE_GENERAL_COLUMNS.filter(
      (column) => !definition.omitGeneralColumns?.includes(column),
    );
    const columns = [...generalColumns, ...definition.specificColumns];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      this.buildProductsSheet(columns, definition.example),
      'Productos',
    );
    XLSX.utils.book_append_sheet(
      workbook,
      this.buildInstructionsSheet(resolved.group, resolved.label, columns),
      'Instrucciones',
    );
    XLSX.utils.book_append_sheet(
      workbook,
      this.buildAllowedValuesSheet(definition.allowedValues),
      'Valores permitidos',
    );

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    return {
      buffer,
      filename: definition.filename,
      contentType: EXCEL_CONTENT_TYPE,
    };
  }

  private buildProductsSheet(columns: string[], example: Record<string, string | number>) {
    const sheet = XLSX.utils.aoa_to_sheet([
      columns,
      columns.map((column) => example[column] ?? ''),
      columns.map(() => ''),
    ]);
    sheet['!cols'] = columns.map((column) => ({
      wch: Math.max(14, Math.min(42, column.length + 8)),
    }));
    sheet['!autofilter'] = {
      ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 0, c: columns.length - 1 } }),
    };
    return sheet;
  }

  private buildInstructionsSheet(group: string, productType: string, columns: string[]) {
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
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    sheet['!cols'] = [{ wch: 52 }, { wch: 42 }];
    return sheet;
  }

  private buildAllowedValuesSheet(allowedValues: Array<[string, string]>) {
    const sheet = XLSX.utils.aoa_to_sheet([
      ['Campo', 'Valores permitidos o sugeridos'],
      ...allowedValues,
    ]);
    sheet['!cols'] = [{ wch: 24 }, { wch: 92 }];
    sheet['!autofilter'] = { ref: 'A1:B1' };
    return sheet;
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
