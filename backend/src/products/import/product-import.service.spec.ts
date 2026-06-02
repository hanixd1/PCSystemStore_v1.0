import AdmZip from 'adm-zip';
import * as XLSX from 'xlsx';
import { ProductImportService } from './product-import.service';
import { normalizeSocket } from './product-import-normalizers';

function excelFile(rows: Record<string, unknown>[]) {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'Productos');
  return {
    originalname: 'productos.xlsx',
    buffer: XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }),
  } as Express.Multer.File;
}

function zipFile(files: string[]) {
  const zip = new AdmZip();
  for (const file of files) {
    zip.addFile(file, Buffer.from('fake-image'));
  }
  return {
    originalname: 'imagenes.zip',
    buffer: zip.toBuffer(),
  } as Express.Multer.File;
}

function cpuRow(overrides: Record<string, unknown> = {}) {
  return {
    nombre: 'AMD Ryzen QA',
    numeroParte: 'CPU-QA-1',
    marca: 'AMD',
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
    numeroParte: 'MB-QA-1',
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
    frecuenciaRam: '6000',
    m2_2280: 'Si',
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
  it('preview rechaza Excel sin columna nombre', async () => {
    const { service } = createService();
    const result = await service.preview(
      { category: 'COMPONENTES', productType: 'Procesador (CPU)' },
      {
        excel: [
          excelFile([
            {
              numeroParte: 'CPU-QA-1',
              marca: 'AMD',
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
      { excel: [excelFile([cpuRow()])], imagesZip: [zipFile(['otra.jpg'])] },
    );

    expect(result.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'imagenPrincipal' })]),
    );
  });

  it('preview detecta producto existente por numeroParte/SKU', async () => {
    const { service } = createService({ id: 'product-1', sku: 'CPU-QA-1' });
    const result = await service.preview(
      { category: 'COMPONENTES', productType: 'Procesador (CPU)' },
      { excel: [excelFile([cpuRow()])], imagesZip: [zipFile(['cpu.jpg', 'cpu-2.jpg'])] },
    );

    expect(result.productsToUpdate).toBe(1);
    expect(result.warnings).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'numeroParte' })]),
    );
  });

  it('confirm no importa si hay errores criticos', async () => {
    const { service, productsService } = createService();
    const result = await service.confirm(
      { category: 'COMPONENTES', productType: 'Procesador (CPU)' },
      { excel: [excelFile([cpuRow()])], imagesZip: [zipFile(['otra.jpg'])] },
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
      { excel: [excelFile([cpuRow()])], imagesZip: [zipFile(['cpu.jpg', 'cpu-2.jpg'])] },
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
      { excel: [excelFile([cpuRow()])], imagesZip: [zipFile(['cpu.jpg', 'cpu-2.jpg'])] },
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
        excel: [excelFile([cpuRow({ tdpMaximo: 'abc' })])],
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
      { excel: [excelFile([motherboardRow({ tipoRam: 'DDR9' })])], imagesZip: [zipFile(['mb.jpg'])] },
    );

    expect(result.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'tipoRam' })]),
    );
  });

  it('normaliza socket STR5 y socket sTR5 a sTR5', () => {
    expect(normalizeSocket('STR5')).toBe('sTR5');
    expect(normalizeSocket('socket sTR5')).toBe('sTR5');
  });
});
