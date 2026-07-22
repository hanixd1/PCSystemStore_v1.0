import AdmZip from 'adm-zip';
import { Workbook } from 'exceljs';
import { ProductImportService } from './product-import.service';
import { normalizeSocket } from './product-import-normalizers';

async function excelFile(rows: Record<string, unknown>[]) {
  const workbook = new Workbook();
  const sheet = workbook.addWorksheet('Productos');
  const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  sheet.addRow(headers);
  for (const row of rows) {
    sheet.addRow(headers.map((header) => row[header] ?? ''));
  }
  return {
    originalname: 'productos.xlsx',
    mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: Buffer.from(await workbook.xlsx.writeBuffer()),
  } as Express.Multer.File;
}

async function workbookFile(workbook: Workbook) {
  return {
    originalname: 'productos.xlsx',
    mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: Buffer.from(await workbook.xlsx.writeBuffer()),
  } as Express.Multer.File;
}

function invalidFile(originalname: string, buffer: Buffer, mimetype = 'application/octet-stream') {
  return { originalname, mimetype, buffer } as Express.Multer.File;
}

function zipFile(files: string[]) {
  const zip = new AdmZip();
  for (const file of files) {
    zip.addFile(file, Buffer.from([0xff, 0xd8, 0xff, 0xd9]));
  }
  return {
    originalname: 'imagenes.zip',
    mimetype: 'application/zip',
    buffer: zip.toBuffer(),
  } as Express.Multer.File;
}

function cpuRow(overrides: Record<string, unknown> = {}) {
  return {
    nombre: 'AMD Ryzen QA',
    sku: 'CPU-QA-1',
    precio: '1000',
    stock: '5',
    descripcion: 'Producto QA para importacion',
    imagenPrincipal: 'cpu.jpg',
    imagenesArchivos: 'cpu.jpg;cpu-2.jpg',
    marcaProcesador: 'AMD',
    socket: 'AM5',
    tdpBase: '65',
    tdpMaximo: '105',
    nucleos: '6',
    threads: '12',
    frecuenciaGhz: '4.2',
    graficosIntegrados: 'No',
    incluyeCooler: 'Si',
    ...overrides,
  };
}

function motherboardRow(overrides: Record<string, unknown> = {}) {
  return {
    nombre: 'Placa Madre QA',
    sku: 'MB-QA-1',
    marca: 'ASUS',
    precio: '800',
    stock: '3',
    descripcion: 'Producto QA para importacion',
    imagenPrincipal: 'mb.jpg',
    imagenesArchivos: 'mb.jpg',
    socket: 'socket sTR5',
    formato: 'ATX',
    tipoRam: 'DDR5',
    slotsRam: '4',
    slotsM2: '2',
    m2_2280: 'Si',
    ...overrides,
  };
}

function ramRow(overrides: Record<string, unknown> = {}) {
  return {
    nombre: 'RAM QA',
    sku: 'RAM-QA-1',
    marca: 'Kingston',
    precio: '210',
    stock: '10',
    descripcion: 'Memoria RAM QA para importacion',
    imagenPrincipal: 'ram.jpg',
    imagenesArchivos: 'ram.jpg',
    tipoRam: 'DDR5',
    capacidadPorModulo: '16GB',
    frecuencia: '6000MHz',
    modulos: '1x16GB',
    latencia: 'CL36',
    rgb: 'No',
    ...overrides,
  };
}

function gpuRow(overrides: Record<string, unknown> = {}) {
  return {
    nombre: 'GPU QA',
    sku: 'GPU-QA-1',
    marca: 'MSI',
    precio: '2899',
    stock: '3',
    descripcion: 'Tarjeta de video QA para importacion',
    imagenPrincipal: 'gpu.jpg',
    imagenesArchivos: 'gpu.jpg',
    chipset: 'NVIDIA GeForce',
    vram: '12GB',
    tipoVram: 'GDDR6X',
    tdp: '220',
    fuenteRecomendada: '650W',
    largoMm: '305',
    ventiladores: '3',
    ...overrides,
  };
}

function psuRow(overrides: Record<string, unknown> = {}) {
  return {
    nombre: 'Fuente QA',
    sku: 'PSU-QA-1',
    marca: 'MSI',
    precio: '420',
    stock: '4',
    descripcion: 'Fuente de poder QA para importacion',
    imagenPrincipal: 'psu.jpg',
    imagenesArchivos: 'psu.jpg',
    potenciaWatts: '750',
    certificacion: '80 PLUS GOLD',
    modularidad: 'FULL MODULAR',
    formato: 'ATX',
    ...overrides,
  };
}

function caseRow(overrides: Record<string, unknown> = {}) {
  return {
    nombre: 'Case QA',
    sku: 'CASE-QA-1',
    marca: 'MSI',
    precio: '260',
    stock: '5',
    descripcion: 'Gabinete QA para importacion',
    imagenPrincipal: 'case.jpg',
    imagenesArchivos: 'case.jpg',
    soportePlaca: 'ATX; Micro-ATX; Mini-ITX',
    largoGpuMax: '330',
    soporteRadiadorLiquido: '120 mm; 240 mm; 360 mm',
    soportaRefrigeracionTorre: 'Si',
    ventiladoresIncluidos: '3',
    ...overrides,
  };
}

function coolerRow(overrides: Record<string, unknown> = {}) {
  return {
    nombre: 'Cooler QA',
    sku: 'COOLER-QA-1',
    marca: 'DEEPCOOL',
    precio: '420',
    stock: '4',
    descripcion: 'Refrigeracion QA para importacion',
    imagenPrincipal: 'cooler.jpg',
    imagenesArchivos: 'cooler.jpg',
    tipo: 'Liquida',
    socketSoportado: 'AM4; AM5; LGA1700; LGA1851',
    radiadorMm: '360',
    tdpSoportado: '300',
    pantallaLcd: 'No',
    rgb: 'Si',
    ...overrides,
  };
}

function storageRow(overrides: Record<string, unknown> = {}) {
  return {
    nombre: 'Storage QA',
    sku: 'STORAGE-QA-1',
    marca: 'KINGSTON',
    precio: '250',
    stock: '8',
    descripcion: 'Almacenamiento QA para importacion',
    imagenPrincipal: 'storage.jpg',
    imagenesArchivos: 'storage.jpg',
    tipoAlmacenamiento: 'Sólido M.2',
    capacidadGB: '1000',
    generacion: 'PCIe 4.0',
    velocidadLecturaMBs: '3500',
    velocidadEscrituraMBs: '2100',
    tamanoFisicoM2: '2280',
    ...overrides,
  };
}

function createService(existingProduct: any = null) {
  const prisma = {
    product: {
      findUnique: jest.fn(async () => existingProduct),
    },
  };
  const productsService = {
    create: jest.fn(),
    update: jest.fn(),
  };
  const cloudinary = {
    uploadImage: jest.fn(async (file: Express.Multer.File) => ({
      secureUrl: `https://cdn.test/${file.originalname}`,
      publicId: file.originalname,
    })),
  };
  const audit = {
    log: jest.fn(async (args) => args),
  };

  return {
    service: new ProductImportService(
      prisma as any,
      productsService as any,
      cloudinary as any,
      audit as any,
    ),
    prisma,
    productsService,
  };
}

describe('ProductImportService', () => {
  afterEach(() => {
    delete process.env.EXCEL_MAX_FILE_SIZE;
    delete process.env.IMPORT_MAX_ROWS;
    delete process.env.IMPORT_MAX_COLUMNS;
    delete process.env.IMPORT_MAX_ZIP_ENTRIES;
    delete process.env.IMPORT_MAX_UNCOMPRESSED_SIZE;
    delete process.env.IMPORT_MAX_COMPRESSION_RATIO;
  });

  it('preview rechaza Excel sin columna nombre', async () => {
    const { service } = createService();
    const result = await service.preview(
      { category: 'COMPONENTES', productType: 'Procesador (CPU)' },
      {
        excel: [
          await excelFile([
            {
              numeroParte: 'CPU-QA-1',
              precio: '1000',
              stock: '5',
              descripcion: 'Producto QA para importacion',
              imagenPrincipal: 'cpu.jpg',
            },
          ]),
        ],
        imagesZip: [zipFile(['cpu.jpg'])],
      },
    );

    expect(result.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ row: 1, field: 'nombre' })]),
    );
  });

  it('preview rechaza imagenPrincipal inexistente en ZIP', async () => {
    const { service } = createService();
    const result = await service.preview(
      { category: 'COMPONENTES', productType: 'Procesador (CPU)' },
      { excel: [await excelFile([cpuRow()])], imagesZip: [zipFile(['otra.jpg'])] },
    );

    expect(result.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'imagenPrincipal' })]),
    );
  });

  it('preview detecta producto existente por SKU', async () => {
    const { service } = createService({ id: 'product-1', sku: 'CPU-QA-1' });
    const result = await service.preview(
      { category: 'COMPONENTES', productType: 'Procesador (CPU)' },
      { excel: [await excelFile([cpuRow()])], imagesZip: [zipFile(['cpu.jpg', 'cpu-2.jpg'])] },
    );

    expect(result.productsToUpdate).toBe(1);
    expect(result.warnings).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'sku' })]),
    );
  });

  it('preview acepta numeroParte como alias temporal de sku', async () => {
    const { service } = createService();
    const result = await service.preview(
      { category: 'COMPONENTES', productType: 'Procesador (CPU)' },
      {
        excel: [await excelFile([cpuRow({ sku: undefined, numeroParte: 'CPU-ALIAS-1' })])],
        imagesZip: [zipFile(['cpu.jpg', 'cpu-2.jpg'])],
      },
    );

    expect(result.validRows).toBe(1);
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'sku',
          message: 'numeroParte fue normalizado a sku.',
        }),
      ]),
    );
  });

  it('lee un XLSX valido con multiples productos', async () => {
    const { service } = createService();
    const result = await service.preview(
      { category: 'COMPONENTES', productType: 'Procesador (CPU)' },
      {
        excel: [await excelFile([cpuRow(), cpuRow({ sku: 'CPU-QA-2', nombre: 'CPU QA 2' })])],
        imagesZip: [zipFile(['cpu.jpg', 'cpu-2.jpg'])],
      },
    );

    expect(result.totalRows).toBe(2);
    expect(result.validRows).toBe(2);
  });

  it('rechaza un archivo renombrado y un libro corrupto', async () => {
    const { service } = createService();
    const images = zipFile(['cpu.jpg']);

    await expect(
      service.preview(
        { category: 'COMPONENTES', productType: 'Procesador (CPU)' },
        { excel: [invalidFile('productos.xlsx', Buffer.from('no es xlsx'))], imagesZip: [images] },
      ),
    ).rejects.toThrow('no contiene un XLSX valido');

    await expect(
      service.preview(
        { category: 'COMPONENTES', productType: 'Procesador (CPU)' },
        {
          excel: [invalidFile('productos.xlsx', Buffer.from([0x50, 0x4b, 0x03, 0x04, 1, 2]))],
          imagesZip: [images],
        },
      ),
    ).rejects.toThrow('No se pudo leer el archivo XLSX');
  });

  it('rechaza libros sin productos y hojas vacias', async () => {
    const { service } = createService();
    const withoutSheets = new Workbook();
    const emptySheet = new Workbook();
    emptySheet.addWorksheet('Productos');
    const images = zipFile(['cpu.jpg']);

    await expect(
      service.preview(
        { category: 'COMPONENTES', productType: 'Procesador (CPU)' },
        { excel: [await workbookFile(withoutSheets)], imagesZip: [images] },
      ),
    ).rejects.toThrow(/no contiene (hojas|productos)/i);
    await expect(
      service.preview(
        { category: 'COMPONENTES', productType: 'Procesador (CPU)' },
        { excel: [await workbookFile(emptySheet)], imagesZip: [images] },
      ),
    ).rejects.toThrow(/no contiene productos|esta vacia/i);
  });

  it('aplica limites configurables de filas, columnas y tamano', async () => {
    const { service } = createService();
    const excel = await excelFile([cpuRow(), cpuRow({ sku: 'CPU-QA-2' })]);
    const images = zipFile(['cpu.jpg', 'cpu-2.jpg']);

    process.env.IMPORT_MAX_ROWS = '1';
    await expect(
      service.preview(
        { category: 'COMPONENTES', productType: 'Procesador (CPU)' },
        { excel: [excel], imagesZip: [images] },
      ),
    ).rejects.toThrow('mas filas de las permitidas');

    delete process.env.IMPORT_MAX_ROWS;
    process.env.IMPORT_MAX_COLUMNS = '2';
    await expect(
      service.preview(
        { category: 'COMPONENTES', productType: 'Procesador (CPU)' },
        { excel: [excel], imagesZip: [images] },
      ),
    ).rejects.toThrow('mas columnas de las permitidas');

    delete process.env.IMPORT_MAX_COLUMNS;
    process.env.EXCEL_MAX_FILE_SIZE = '10';
    await expect(
      service.preview(
        { category: 'COMPONENTES', productType: 'Procesador (CPU)' },
        { excel: [excel], imagesZip: [images] },
      ),
    ).rejects.toThrow('supera el limite permitido');
  });

  it('rechaza formulas y encabezados que permiten prototype pollution', async () => {
    const { service } = createService();
    const formulaRow = cpuRow({ precio: { formula: '1+1', result: 2 } });
    const images = zipFile(['cpu.jpg', 'cpu-2.jpg']);

    await expect(
      service.preview(
        { category: 'COMPONENTES', productType: 'Procesador (CPU)' },
        { excel: [await excelFile([formulaRow])], imagesZip: [images] },
      ),
    ).rejects.toThrow('Las formulas no estan permitidas');

    for (const dangerousHeader of ['__proto__', 'constructor', 'prototype']) {
      const workbook = new Workbook();
      const sheet = workbook.addWorksheet('Productos');
      sheet.addRow([dangerousHeader, 'nombre']);
      sheet.addRow(['valor', 'CPU QA']);
      await expect(
        service.preview(
          { category: 'COMPONENTES', productType: 'Procesador (CPU)' },
          { excel: [await workbookFile(workbook)], imagesZip: [images] },
        ),
      ).rejects.toThrow('encabezado inseguro');
    }
  });

  it('rechaza ZIP bombs, exceso de entradas y tamano descomprimido acumulado', async () => {
    const { service } = createService();
    const excel = await excelFile([cpuRow()]);
    const bomb = new AdmZip();
    bomb.addFile(
      'bomb.jpg',
      Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(50_000)]),
    );

    process.env.IMPORT_MAX_COMPRESSION_RATIO = '2';
    await expect(
      service.preview(
        { category: 'COMPONENTES', productType: 'Procesador (CPU)' },
        {
          excel: [excel],
          imagesZip: [invalidFile('imagenes.zip', bomb.toBuffer(), 'application/zip')],
        },
      ),
    ).rejects.toThrow('proporcion de compresion');

    delete process.env.IMPORT_MAX_COMPRESSION_RATIO;
    process.env.IMPORT_MAX_ZIP_ENTRIES = '1';
    await expect(
      service.preview(
        { category: 'COMPONENTES', productType: 'Procesador (CPU)' },
        { excel: [excel], imagesZip: [zipFile(['cpu.jpg', 'cpu-2.jpg'])] },
      ),
    ).rejects.toThrow('demasiados archivos internos');

    delete process.env.IMPORT_MAX_ZIP_ENTRIES;
    process.env.IMPORT_MAX_UNCOMPRESSED_SIZE = '3';
    await expect(
      service.preview(
        { category: 'COMPONENTES', productType: 'Procesador (CPU)' },
        { excel: [excel], imagesZip: [zipFile(['cpu.jpg'])] },
      ),
    ).rejects.toThrow('tamano descomprimido');
  });

  it('confirm no importa si hay errores criticos', async () => {
    const { service, productsService } = createService();
    const result = await service.confirm(
      { category: 'COMPONENTES', productType: 'Procesador (CPU)' },
      { excel: [await excelFile([cpuRow()])], imagesZip: [zipFile(['otra.jpg'])] },
      'admin-1',
    );

    expect(result.created).toBe(0);
    expect(result.failed).toBe(1);
    expect(productsService.create).not.toHaveBeenCalled();
  });

  it('confirm crea producto valido con dos imagenes', async () => {
    const { service, productsService } = createService();
    productsService.create.mockResolvedValue({
      id: 'product-1',
      name: 'AMD Ryzen QA',
      sku: 'CPU-QA-1',
    });

    const result = await service.confirm(
      { category: 'COMPONENTES', productType: 'Procesador (CPU)' },
      { excel: [await excelFile([cpuRow()])], imagesZip: [zipFile(['cpu.jpg', 'cpu-2.jpg'])] },
      'admin-1',
    );

    expect(result.created).toBe(1);
    expect(result.uploadedImages).toBe(2);
    expect(productsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        uploadedImages: ['https://cdn.test/cpu.jpg', 'https://cdn.test/cpu-2.jpg'],
      }),
      'admin-1',
    );
  });

  it('confirm actualiza producto existente con imagenes importadas', async () => {
    const { service, productsService } = createService({ id: 'product-1', sku: 'CPU-QA-1' });

    const result = await service.confirm(
      { category: 'COMPONENTES', productType: 'Procesador (CPU)' },
      { excel: [await excelFile([cpuRow()])], imagesZip: [zipFile(['cpu.jpg', 'cpu-2.jpg'])] },
      'admin-1',
    );

    expect(result.updated).toBe(1);
    expect(productsService.update).toHaveBeenCalledWith(
      'product-1',
      expect.objectContaining({
        images: ['https://cdn.test/cpu.jpg', 'https://cdn.test/cpu-2.jpg'],
      }),
      'admin-1',
    );
  });

  it('validacion CPU rechaza tdp no numerico', async () => {
    const { service } = createService();
    const result = await service.preview(
      { category: 'COMPONENTES', productType: 'Procesador (CPU)' },
      {
        excel: [await excelFile([cpuRow({ tdpMaximo: 'abc' })])],
        imagesZip: [zipFile(['cpu.jpg', 'cpu-2.jpg'])],
      },
    );

    expect(result.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'tdpMaximo' })]),
    );
  });

  it('validacion motherboard rechaza tipoRam invalido', async () => {
    const { service } = createService();
    const result = await service.preview(
      { category: 'COMPONENTES', productType: 'Placa Madre' },
      {
        excel: [await excelFile([motherboardRow({ tipoRam: 'DDR9' })])],
        imagesZip: [zipFile(['mb.jpg'])],
      },
    );

    expect(result.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'tipoRam' })]),
    );
  });

  it('motherboard ignora frecuenciaRam antigua con warning', async () => {
    const { service } = createService();
    const result = await service.preview(
      { category: 'COMPONENTES', productType: 'Placa Madre' },
      {
        excel: [await excelFile([motherboardRow({ frecuenciaRam: '6000' })])],
        imagesZip: [zipFile(['mb.jpg'])],
      },
    );

    expect(result.validRows).toBe(1);
    expect(result.warnings).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'frecuenciaRam' })]),
    );
  });

  it('RAM importa marca, latencia y capacidadPorModulo', async () => {
    const { service, productsService } = createService();
    productsService.create.mockResolvedValue({
      id: 'ram-1',
      name: 'RAM QA',
      sku: 'RAM-QA-1',
    });

    await service.confirm(
      { category: 'COMPONENTES', productType: 'Memoria RAM' },
      { excel: [await excelFile([ramRow()])], imagesZip: [zipFile(['ram.jpg'])] },
      'admin-1',
    );

    expect(productsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        brand: 'Kingston',
        capacity: 16,
        speed: 6000,
        modules: 1,
        latency: 'CL36',
      }),
      'admin-1',
    );
  });

  it('RAM normaliza cantidad antigua a capacidadPorModulo', async () => {
    const { service } = createService();
    const result = await service.preview(
      { category: 'COMPONENTES', productType: 'Memoria RAM' },
      {
        excel: [await excelFile([ramRow({ capacidadPorModulo: undefined, cantidad: '16GB' })])],
        imagesZip: [zipFile(['ram.jpg'])],
      },
    );

    expect(result.validRows).toBe(1);
    expect(result.warnings).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'capacidadPorModulo' })]),
    );
  });

  it('GPU importa chipset, tipoVram, largoMm y ventiladores', async () => {
    const { service, productsService } = createService();
    productsService.create.mockResolvedValue({
      id: 'gpu-1',
      name: 'GPU QA',
      sku: 'GPU-QA-1',
    });

    await service.confirm(
      { category: 'COMPONENTES', productType: 'Tarjeta de Video' },
      { excel: [await excelFile([gpuRow()])], imagesZip: [zipFile(['gpu.jpg'])] },
      'admin-1',
    );

    expect(productsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        chipset: 'NVIDIA GeForce',
        typeVram: 'GDDR6X',
        length: 305,
        fans: 3,
      }),
      'admin-1',
    );
  });

  it('GPU normaliza longitudMm antigua a largoMm', async () => {
    const { service } = createService();
    const result = await service.preview(
      { category: 'COMPONENTES', productType: 'Tarjeta de Video' },
      {
        excel: [await excelFile([gpuRow({ largoMm: undefined, longitudMm: '305' })])],
        imagesZip: [zipFile(['gpu.jpg'])],
      },
    );

    expect(result.validRows).toBe(1);
    expect(result.warnings).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'largoMm' })]),
    );
  });

  it('PSU importa potenciaWatts y acepta watts como alias', async () => {
    const { service, productsService } = createService();
    productsService.create.mockResolvedValue({ id: 'psu-1', name: 'Fuente QA', sku: 'PSU-QA-1' });

    await service.confirm(
      { category: 'COMPONENTES', productType: 'Fuente de Poder' },
      { excel: [await excelFile([psuRow()])], imagesZip: [zipFile(['psu.jpg'])] },
      'admin-1',
    );

    expect(productsService.create).toHaveBeenCalledWith(
      expect.objectContaining({ wattage: 750 }),
      'admin-1',
    );

    const preview = await service.preview(
      { category: 'COMPONENTES', productType: 'Fuente de Poder' },
      {
        excel: [await excelFile([psuRow({ potenciaWatts: undefined, watts: '750' })])],
        imagesZip: [zipFile(['psu.jpg'])],
      },
    );

    expect(preview.validRows).toBe(1);
    expect(preview.warnings).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'potenciaWatts' })]),
    );
  });

  it('CASE importa soportePlaca multiple, soporte de torre y radiadores multiples', async () => {
    const { service, productsService } = createService();
    productsService.create.mockResolvedValue({ id: 'case-1', name: 'Case QA', sku: 'CASE-QA-1' });

    await service.confirm(
      { category: 'COMPONENTES', productType: 'Gabinete / Case' },
      { excel: [await excelFile([caseRow()])], imagesZip: [zipFile(['case.jpg'])] },
      'admin-1',
    );

    expect(productsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        supportedFormFactors: ['ATX', 'Micro-ATX', 'Mini-ITX'],
        maxGpuLength: 330,
        supportsTowerCooler: true,
        radiatorSupportMmValues: ['120', '240', '360'],
        includedFans: 3,
      }),
      'admin-1',
    );
  });

  it('CASE acepta formatoSoportado y longitudGpuMax como aliases e ignora tipoCase', async () => {
    const { service } = createService();
    const result = await service.preview(
      { category: 'COMPONENTES', productType: 'Gabinete / Case' },
      {
        excel: [
          await excelFile([
            caseRow({
              soportePlaca: undefined,
              formatoSoportado: 'ATX; Micro-ATX',
              largoGpuMax: undefined,
              longitudGpuMax: '330',
              tipoCase: 'MID TOWER',
            }),
          ]),
        ],
        imagesZip: [zipFile(['case.jpg'])],
      },
    );

    expect(result.validRows).toBe(1);
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'soportePlaca' }),
        expect.objectContaining({ field: 'largoGpuMax' }),
        expect.objectContaining({ field: 'tipoCase' }),
      ]),
    );
  });

  it('COOLER importa pantallaLcd y rgb, y normaliza Aire a Torre', async () => {
    const { service, productsService } = createService();
    productsService.create.mockResolvedValue({
      id: 'cooler-1',
      name: 'Cooler QA',
      sku: 'COOLER-QA-1',
    });

    await service.confirm(
      { category: 'COMPONENTES', productType: 'Refrigeracion' },
      { excel: [await excelFile([coolerRow()])], imagesZip: [zipFile(['cooler.jpg'])] },
      'admin-1',
    );

    expect(productsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'Líquida',
        radiatorSize: 360,
        hasScreen: false,
        hasRGB: true,
      }),
      'admin-1',
    );

    const preview = await service.preview(
      { category: 'COMPONENTES', productType: 'Refrigeracion' },
      {
        excel: [await excelFile([coolerRow({ tipo: 'Aire', radiadorMm: '' })])],
        imagesZip: [zipFile(['cooler.jpg'])],
      },
    );

    expect(preview.validRows).toBe(1);
    expect(preview.warnings).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'tipo' })]),
    );
  });

  it('STORAGE importa Sólido M.2 con generacion y velocidades', async () => {
    const { service, productsService } = createService();
    productsService.create.mockResolvedValue({
      id: 'storage-1',
      name: 'Storage QA',
      sku: 'STORAGE-QA-1',
    });

    await service.confirm(
      { category: 'COMPONENTES', productType: 'Almacenamiento' },
      { excel: [await excelFile([storageRow()])], imagesZip: [zipFile(['storage.jpg'])] },
      'admin-1',
    );

    expect(productsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'Sólido M.2',
        capacity: 1000,
        interface: 'PCIe 4.0',
        readSpeed: 3500,
        writeSpeed: 2100,
        m2FormFactor: '2280',
      }),
      'admin-1',
    );
  });

  it('STORAGE normaliza aliases antiguos de tipo, interfaz y capacidad', async () => {
    const { service } = createService();
    const result = await service.preview(
      { category: 'COMPONENTES', productType: 'Almacenamiento' },
      {
        excel: [
          await excelFile([
            storageRow({
              tipoAlmacenamiento: 'M.2 SATA',
              capacidadGB: undefined,
              capacidad: '1TB',
              generacion: undefined,
              interfaz: 'SATA',
            }),
          ]),
        ],
        imagesZip: [zipFile(['storage.jpg'])],
      },
    );

    expect(result.validRows).toBe(1);
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'capacidadGB' }),
        expect.objectContaining({ field: 'generacion' }),
      ]),
    );
  });

  it('STORAGE normaliza generacion PCIe a SATA para SSD 2.5', async () => {
    const { service, productsService } = createService();
    productsService.create.mockResolvedValue({
      id: 'storage-2',
      name: 'Storage SATA QA',
      sku: 'STORAGE-SATA-QA',
    });

    await service.confirm(
      { category: 'COMPONENTES', productType: 'Almacenamiento' },
      {
        excel: [
          await excelFile([
            storageRow({
              sku: 'STORAGE-SATA-QA',
              tipoAlmacenamiento: 'SSD 2.5',
              generacion: 'PCIe 4.0',
              tamanoFisicoM2: '',
            }),
          ]),
        ],
        imagesZip: [zipFile(['storage.jpg'])],
      },
      'admin-1',
    );

    expect(productsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'SSD 2.5',
        interface: 'SATA',
        m2FormFactor: null,
      }),
      'admin-1',
    );
  });

  it('normaliza socket STR5 y socket sTR5 a sTR5', () => {
    expect(normalizeSocket('STR5')).toBe('sTR5');
    expect(normalizeSocket('socket sTR5')).toBe('sTR5');
  });
});
