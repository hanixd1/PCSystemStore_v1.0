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

  it('genera plantilla case con soportePlaca, soporte de torre y soporteRadiadorLiquido', () => {
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
        'soporteRadiadorLiquido',
        'soportaRefrigeracionTorre',
        'ventiladoresIncluidos',
      ]),
    );
    expect(headers).not.toContain('formatoSoportado');
    expect(headers).not.toContain('tipoCase');
    expect(headers).not.toContain('alturaCoolerMax');
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
    expect(headers).not.toContain('alturaMm');
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

  it('genera plantilla Laptop con specs completas de ordenador portatil', () => {
    const template = service.generateTemplate({
      category: 'ORDENADORES',
      productType: 'Laptop / Portatil',
    });
    const headers = readProductsHeaders(template.buffer);

    expect(template.filename).toBe('plantilla-laptop.xlsx');
    expectUsesSkuOnly(headers);
    expect(headers).toEqual(
      expect.arrayContaining([
        'marca',
        'procesador',
        'memoriaRam',
        'almacenamiento',
        'tieneGraficaDedicada',
        'marcaGpu',
        'modeloGpu',
        'tamanoPantalla',
        'tasaRefrescoHz',
        'incluyeWindowsSerie',
      ]),
    );
  });

  it('genera plantilla PC Desktop con specs de equipo pre-ensamblado', () => {
    const template = service.generateTemplate({
      category: 'ORDENADORES',
      productType: 'PC de Escritorio',
    });
    const headers = readProductsHeaders(template.buffer);

    expect(template.filename).toBe('plantilla-pc-desktop.xlsx');
    expectUsesSkuOnly(headers);
    expect(headers).toEqual(
      expect.arrayContaining([
        'procesador',
        'memoriaRam',
        'almacenamiento',
        'tieneGraficaDedicada',
        'marcaGpu',
        'modeloGpu',
        'coolerIncluido',
        'fuentePoderWatts',
        'modeloCase',
      ]),
    );
  });

  it('genera plantilla Software con tipoLicencia y plataforma', () => {
    const template = service.generateTemplate({
      category: 'ORDENADORES',
      productType: 'Software / Licencia',
    });
    const headers = readProductsHeaders(template.buffer);

    expect(template.filename).toBe('plantilla-software-licencia.xlsx');
    expectUsesSkuOnly(headers);
    expect(headers).toEqual(expect.arrayContaining(['tipoLicencia', 'plataforma']));
  });

  it('genera plantilla Base Refrigeradora con tamano, ventiladores, rgb y color', () => {
    const template = service.generateTemplate({
      category: 'ORDENADORES',
      productType: 'Base refrigeradora',
    });
    const headers = readProductsHeaders(template.buffer);

    expect(template.filename).toBe('plantilla-base-refrigeradora.xlsx');
    expectUsesSkuOnly(headers);
    expect(headers).toEqual(
      expect.arrayContaining(['tamanoLaptopSoportado', 'ventiladores', 'rgb', 'color']),
    );
  });

  it('genera plantilla Mochila con marca, color y tamano soportado', () => {
    const template = service.generateTemplate({
      category: 'ORDENADORES',
      productType: 'Mochila',
    });
    const headers = readProductsHeaders(template.buffer);

    expect(template.filename).toBe('plantilla-mochila.xlsx');
    expectUsesSkuOnly(headers);
    expect(headers).toEqual(expect.arrayContaining(['marca', 'color', 'tamanoLaptopSoportado']));
  });

  it('genera plantilla Monitor con pantalla, puertos y parlantes', () => {
    const template = service.generateTemplate({
      category: 'PERIFERICOS',
      productType: 'Monitor',
    });
    const headers = readProductsHeaders(template.buffer);

    expect(template.filename).toBe('plantilla-monitor.xlsx');
    expectUsesSkuOnly(headers);
    expect(headers).toEqual(
      expect.arrayContaining([
        'tamanoPulgadas',
        'resolucion',
        'panel',
        'hz',
        'latenciaMs',
        'parlantesIntegrados',
        'puertoHdmi',
        'puertoDisplayPort',
      ]),
    );
  });

  it('genera plantilla Teclado con tipo, conectividad, layout, formato y switch', () => {
    const template = service.generateTemplate({
      category: 'PERIFERICOS',
      productType: 'Teclado',
    });
    const headers = readProductsHeaders(template.buffer);

    expect(template.filename).toBe('plantilla-teclado.xlsx');
    expectUsesSkuOnly(headers);
    expect(headers).toEqual(
      expect.arrayContaining([
        'tipoTeclado',
        'conectividad',
        'idiomaLayout',
        'formatoTeclado',
        'tipoSwitch',
      ]),
    );
  });

  it('genera plantilla Mouse con dpi, sensor, botones, rgb y peso', () => {
    const template = service.generateTemplate({
      category: 'PERIFERICOS',
      productType: 'Mouse',
    });
    const headers = readProductsHeaders(template.buffer);

    expect(template.filename).toBe('plantilla-mouse.xlsx');
    expectUsesSkuOnly(headers);
    expect(headers).toEqual(
      expect.arrayContaining(['dpi', 'conectividad', 'sensor', 'botones', 'rgb', 'pesoGramos']),
    );
  });

  it('genera plantilla Mousepad con tamano, material, rgb, base y color', () => {
    const template = service.generateTemplate({
      category: 'PERIFERICOS',
      productType: 'Mousepad',
    });
    const headers = readProductsHeaders(template.buffer);

    expect(template.filename).toBe('plantilla-mousepad.xlsx');
    expectUsesSkuOnly(headers);
    expect(headers).toEqual(
      expect.arrayContaining(['tamano', 'material', 'rgb', 'baseAntideslizante', 'color']),
    );
  });

  it('genera plantilla Sillas Gamer y acepta alias antiguo Sillas Gaming', () => {
    const template = service.generateTemplate({
      category: 'PERIFERICOS',
      productType: 'Sillas Gaming',
    });
    const headers = readProductsHeaders(template.buffer);

    expect(template.filename).toBe('plantilla-sillas-gamer.xlsx');
    expectUsesSkuOnly(headers);
    expect(headers).toEqual(
      expect.arrayContaining(['material', 'color', 'pesoMaximoKg', 'reclinable']),
    );
  });

  it('genera plantillas Mesas Gamer, Webcam, Capturadoras y Cables y Hub con specs propias', () => {
    const deskHeaders = readProductsHeaders(
      service.generateTemplate({ category: 'PERIFERICOS', productType: 'Mesa Gamer' }).buffer,
    );
    const webcamHeaders = readProductsHeaders(
      service.generateTemplate({ category: 'PERIFERICOS', productType: 'Webcam' }).buffer,
    );
    const captureHeaders = readProductsHeaders(
      service.generateTemplate({ category: 'PERIFERICOS', productType: 'Capturadora' }).buffer,
    );
    const cableHubHeaders = readProductsHeaders(
      service.generateTemplate({ category: 'PERIFERICOS', productType: 'Cables y Hub' }).buffer,
    );

    expectUsesSkuOnly(deskHeaders);
    expectUsesSkuOnly(webcamHeaders);
    expectUsesSkuOnly(captureHeaders);
    expectUsesSkuOnly(cableHubHeaders);
    expect(deskHeaders).toEqual(expect.arrayContaining(['largoCm', 'anchoCm', 'alturaCm']));
    expect(webcamHeaders).toEqual(
      expect.arrayContaining(['resolucion', 'fps', 'microfonoIntegrado']),
    );
    expect(captureHeaders).toEqual(expect.arrayContaining(['resolucionCaptura', 'fpsCaptura']));
    expect(cableHubHeaders).toEqual(expect.arrayContaining(['tipoAccesorio', 'conectores']));
  });

  it('genera plantilla Headset con specs tecnicas de audio y XLSX valido', () => {
    const template = service.generateTemplate({
      category: 'AUDIO',
      productType: 'Audifonos / Headset',
    });
    const headers = readProductsHeaders(template.buffer);

    expect(template.filename).toBe('plantilla-audifono-headset.xlsx');
    expect(template.buffer[0]).toBe(0x50);
    expect(template.buffer[1]).toBe(0x4b);
    expectUsesSkuOnly(headers);
    expect(headers).toEqual(
      expect.arrayContaining([
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
      ]),
    );
  });

  it('genera plantilla Microfono con specs tecnicas de audio', () => {
    const template = service.generateTemplate({
      category: 'AUDIO',
      productType: 'MIC',
    });
    const headers = readProductsHeaders(template.buffer);

    expect(template.filename).toBe('plantilla-microfono.xlsx');
    expectUsesSkuOnly(headers);
    expect(headers).toEqual(
      expect.arrayContaining([
        'tipoMicrofono',
        'patronPolar',
        'conectividad',
        'tipoConexion',
        'frecuenciaRespuesta',
        'incluyeBrazo',
        'incluyeFiltroPop',
        'rgb',
        'color',
      ]),
    );
  });

  it('genera plantilla Parlantes con specs tecnicas de audio', () => {
    const template = service.generateTemplate({
      category: 'AUDIO',
      productType: 'SPEAKERS',
    });
    const headers = readProductsHeaders(template.buffer);

    expect(template.filename).toBe('plantilla-parlantes.xlsx');
    expectUsesSkuOnly(headers);
    expect(headers).toEqual(
      expect.arrayContaining([
        'tipoParlante',
        'canales',
        'potenciaWatts',
        'conectividad',
        'tipoConexion',
        'subwoofer',
        'controlRemoto',
        'rgb',
        'color',
      ]),
    );
  });

  it('rechaza tipos AUDIO no soportados y no genera plantilla generica', () => {
    expect(() =>
      service.generateTemplate({ category: 'AUDIO', productType: 'Tipo Audio Inexistente' }),
    ).toThrow(BadRequestException);
  });
});
