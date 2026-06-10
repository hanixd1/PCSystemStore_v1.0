import { BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { ProductTemplateService } from './product-template.service';

function readProductsHeaders(buffer: Buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets.Productos;
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    header: 1,
  })[0] as string[];
}

function readProductsRows(buffer: Buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets.Productos;
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
}

function expectUsesSkuOnly(headers: string[]) {
  expect(headers).toContain('sku');
  expect(headers).not.toContain('numeroParte');
}

describe('ProductTemplateService', () => {
  const service = new ProductTemplateService();

  it('rechaza query sin categoria o tipo de producto', () => {
    expect(() => service.generateTemplate({})).toThrow(BadRequestException);
  });

  it('rechaza productType invalido', () => {
    expect(() =>
      service.generateTemplate({ category: 'COMPONENTES', productType: 'Tipo inexistente' }),
    ).toThrow(BadRequestException);
  });

  it('genera plantilla CPU sin marca generica y con marcaProcesador', () => {
    const template = service.generateTemplate({
      category: 'COMPONENTES',
      productType: 'Procesador (CPU)',
    });
    const headers = readProductsHeaders(template.buffer);

    expect(template.contentType).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    expect(template.filename).toBe('plantilla-procesador.xlsx');
    expect(template.buffer.length).toBeGreaterThan(0);
    expect(template.buffer[0]).toBe(0x50);
    expect(template.buffer[1]).toBe(0x4b);
    expectUsesSkuOnly(headers);
    expect(headers).toEqual(expect.arrayContaining(['tdpBase', 'marcaProcesador']));
    expect(headers).not.toContain('marca');
  });

  it('genera plantilla placa madre sin frecuenciaRam', () => {
    const template = service.generateTemplate({
      category: 'COMPONENTES',
      productType: 'Placa Madre',
    });
    const headers = readProductsHeaders(template.buffer);

    expect(template.filename).toBe('plantilla-placa-madre.xlsx');
    expectUsesSkuOnly(headers);
    expect(headers).toEqual(expect.arrayContaining(['socket']));
    expect(headers).not.toContain('frecuenciaRam');
  });

  it('genera plantilla RAM con marca, capacidadPorModulo, frecuencia y latencia', () => {
    const template = service.generateTemplate({
      category: 'COMPONENTES',
      productType: 'Memoria RAM',
    });
    const headers = readProductsHeaders(template.buffer);

    expectUsesSkuOnly(headers);
    expect(headers).toEqual(
      expect.arrayContaining(['marca', 'capacidadPorModulo', 'frecuencia', 'latencia']),
    );
    expect(headers).not.toContain('cantidad');
  });

  it('genera plantilla GPU con chipset, tipoVram, largoMm y ventiladores', () => {
    const template = service.generateTemplate({
      category: 'COMPONENTES',
      productType: 'Tarjeta de Video',
    });
    const headers = readProductsHeaders(template.buffer);

    expectUsesSkuOnly(headers);
    expect(headers).toEqual(
      expect.arrayContaining(['chipset', 'tipoVram', 'largoMm', 'ventiladores']),
    );
    expect(headers).not.toContain('longitudMm');
    expect(headers).not.toContain('longitud');
  });

  it('genera plantilla fuente con potenciaWatts y sin watts', () => {
    const template = service.generateTemplate({
      category: 'COMPONENTES',
      productType: 'Fuente de Poder',
    });
    const headers = readProductsHeaders(template.buffer);

    expectUsesSkuOnly(headers);
    expect(headers).toContain('potenciaWatts');
    expect(headers).not.toContain('watts');
  });

  it('genera plantilla case con soportePlaca, alturaCoolerMax y soporteRadiadorLiquido', () => {
    const template = service.generateTemplate({
      category: 'COMPONENTES',
      productType: 'Gabinete / Case',
    });
    const headers = readProductsHeaders(template.buffer);

    expectUsesSkuOnly(headers);
    expect(headers).toEqual(
      expect.arrayContaining([
        'soportePlaca',
        'largoGpuMax',
        'alturaCoolerMax',
        'soporteRadiadorLiquido',
        'ventiladoresIncluidos',
      ]),
    );
    expect(headers).not.toContain('formatoSoportado');
    expect(headers).not.toContain('tipoCase');
  });

  it('genera plantilla refrigeracion con pantallaLcd, rgb y tipo Torre/Líquida', () => {
    const template = service.generateTemplate({
      category: 'COMPONENTES',
      productType: 'Refrigeracion',
    });
    const headers = readProductsHeaders(template.buffer);
    const [example] = readProductsRows(template.buffer);

    expectUsesSkuOnly(headers);
    expect(headers).toEqual(expect.arrayContaining(['pantallaLcd', 'rgb']));
    expect(String(example.tipo)).not.toBe('Aire');
    expect(['Torre', 'Líquida']).toContain(String(example.tipo));
  });

  it('genera plantilla almacenamiento con generacion, capacidadGB y velocidades', () => {
    const template = service.generateTemplate({
      category: 'COMPONENTES',
      productType: 'Almacenamiento',
    });
    const headers = readProductsHeaders(template.buffer);
    const [example] = readProductsRows(template.buffer);

    expectUsesSkuOnly(headers);
    expect(headers).toEqual(
      expect.arrayContaining([
        'tipoAlmacenamiento',
        'capacidadGB',
        'generacion',
        'velocidadLecturaMBs',
        'velocidadEscrituraMBs',
        'tamanoFisicoM2',
      ]),
    );
    expect(headers).not.toContain('interfaz');
    expect(String(example.tipoAlmacenamiento)).toBe('Sólido M.2');
    expect(String(example.tipoAlmacenamiento)).not.toBe('NVMe M.2');
    expect(String(example.tipoAlmacenamiento)).not.toBe('M.2 SATA');
  });
});
