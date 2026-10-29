import { AiService } from './ai.service';
import { parseChatSearchQuery } from './chat-query';

describe('parseChatSearchQuery', () => {
  it.each([
    ['tienen tarjeta de video hasta 1500 soles?', 'tarjeta video', 1500, null],
    ['busco una rtx 4060', 'rtx 4060', null, null],
    ['fuente 650w', 'fuente 650w', null, null],
    ['monitor desde S/ 800', 'monitor', null, 800],
    ['mouse logitech menos de 1.5k', 'mouse logitech', 1500, null],
    ['procesador ryzen 5 5600 maximo 600', 'procesador ryzen 5 5600', 600, null],
  ])('interpreta "%s"', (message, text, maxPrice, minPrice) => {
    expect(parseChatSearchQuery(message)).toMatchObject({ text, maxPrice, minPrice });
  });

  it('detecta preferencia por precio sin confundir palabras como laptop', () => {
    expect(parseChatSearchQuery('quiero un teclado barato').sort).toBe('cheapest');
    expect(parseChatSearchQuery('la mejor laptop').sort).toBe('premium');
    expect(parseChatSearchQuery('laptop asus').sort).toBeNull();
  });

  it('procesa textos largos sin bloquearse', () => {
    const longMessage = `${' '.repeat(5000)} rtx 5060 ${'#'.repeat(5000)}`;
    expect(parseChatSearchQuery(longMessage).text).toBe('');
  });
});

describe('AiService chat catalog', () => {
  const product = (overrides: Record<string, unknown>) => ({
    id: String(overrides.name),
    slug: null,
    images: [],
    stock: 3,
    description: '',
    ...overrides,
  });

  const catalog = [
    product({
      name: 'MOUSE LOGITECH G203',
      category: 'MOUSE',
      price: 89,
      mouseSpecs: { brand: 'Logitech' },
    }),
    product({
      name: 'MOUSE REDRAGON COBRA',
      category: 'MOUSE',
      price: 59,
      mouseSpecs: { brand: 'Redragon' },
    }),
    product({
      name: 'TECLADO LOGITECH K120',
      category: 'KEYBOARD',
      price: 45,
      keyboardSpecs: { brand: 'Logitech' },
    }),
    product({
      name: 'TARJETA DE VIDEO GIGABYTE RTX 5050 8GB WINDFORCE OC',
      category: 'GPU',
      price: 1350,
      gpuSpecs: { brand: 'Gigabyte', gpuPowerWatts: 130 },
    }),
    product({
      name: 'TARJETA DE VIDEO ASROCK RX 9060XT CHALLENGER 8GB',
      category: 'GPU',
      price: 1550,
      gpuSpecs: { brand: 'ASRock' },
    }),
    product({
      name: 'PROCESADOR AMD RYZEN 5 7600',
      category: 'CPU',
      price: 900,
      cpuSpecs: { brand: 'AMD', socket: 'AM5' },
    }),
    product({
      name: 'UPS CDP R-UPR 1008',
      category: 'UPS',
      price: 320,
      powerProtectionSpecs: { brand: 'CDP', wattage: 500 },
    }),
  ];

  const setup = () => {
    const prisma = {
      product: {
        findMany: jest.fn(async ({ where }: any) => {
          const allowed: string[] | undefined =
            where?.AND?.find?.((c: any) => c.category)?.category?.in ?? where?.category?.in;
          return allowed ? catalog.filter((item) => allowed.includes(item.category)) : catalog;
        }),
        findFirst: jest.fn(async ({ where }: any) => {
          const id = where?.AND?.find?.((c: any) => c.id)?.id ?? where?.id;
          return catalog.find((item) => item.id === id) ?? null;
        }),
      },
    };
    const fetchMock = jest.fn(async (_url: string, init: { body: string }) => ({
      ok: true,
      json: async () => ({ status: 'ok', sent: JSON.parse(init.body) }),
    }));
    global.fetch = fetchMock as any;
    process.env.AI_SERVICE_URL = 'http://ai.test';
    return { service: new AiService(prisma as any), prisma };
  };

  const sentPayload = async (message: string, state?: Record<string, unknown>) => {
    const { service } = setup();
    const response = (await service.processCustomerChat(message, [], state)) as any;
    return response.sent;
  };

  it('envia al ai-service productos rankeados por marca y categoria', async () => {
    const payload = await sentPayload('tienen mouse logitech?');
    expect(payload.catalog[0]).toMatchObject({ name: 'MOUSE LOGITECH G203', brand: 'Logitech' });
    expect(payload.search).toMatchObject({ text: 'mouse logitech', categories: ['MOUSE'] });
  });

  it('usa el precio de oferta vigente para el catalogo y el presupuesto', async () => {
    const logitech = catalog.find((item) => item.name === 'MOUSE LOGITECH G203')!;
    Object.assign(logitech, { isOnSale: true, salePrice: 65 });
    try {
      const payload = await sentPayload('mouse hasta 70 soles');
      const names = payload.catalog.map((item: any) => item.name);
      expect(names).toContain('MOUSE LOGITECH G203');
      expect(payload.catalog.find((item: any) => item.name === 'MOUSE LOGITECH G203').price).toBe(
        65,
      );
    } finally {
      Object.assign(logitech, { isOnSale: false, salePrice: null });
    }
  });

  it('aplica el precio maximo pedido por el cliente', async () => {
    const payload = await sentPayload('mouse hasta 70 soles');
    expect(payload.catalog.map((item: any) => item.name)).toEqual(['MOUSE REDRAGON COBRA']);
  });

  it('reconoce categorias nuevas como UPS', async () => {
    const payload = await sentPayload('tienen ups?');
    expect(payload.catalog[0]).toMatchObject({ category: 'UPS', brand: 'CDP' });
  });

  it('refina la busqueda anterior con mensajes cortos de precio', async () => {
    const payload = await sentPayload('y mas barato?', { lastSearchQuery: 'mouse' });
    expect(payload.search).toMatchObject({ text: 'mouse', sort: 'cheapest' });
    expect(payload.catalog[0].name).toBe('MOUSE REDRAGON COBRA');
  });

  it('trata "solo la torre" como respuesta del armado y no como busqueda de cases', async () => {
    const payload = await sentPayload('solo la torre', {
      intent: 'budget_pc_build',
      awaiting: 'peripherals',
    });
    expect(payload.search).toBeNull();
  });

  it('responde busquedas con el catalogo cuando el ai-service no esta disponible', async () => {
    const { service } = setup();
    global.fetch = jest.fn(async () => {
      throw new Error('ECONNREFUSED');
    }) as any;

    const response = (await service.processCustomerChat('mouse logitech')) as any;

    expect(response.status).toBe('ok');
    expect(response.reply).toContain('MOUSE LOGITECH G203');
    expect(response.conversationState.lastSearchQuery).toBe('mouse logitech');
  });

  it('arma una PC alrededor del componente nombrado en el mensaje', async () => {
    const payload = await sentPayload('esa rtx 5050 gigabyte, armalo con una pc');
    expect(payload.anchorProductId).toBe('TARJETA DE VIDEO GIGABYTE RTX 5050 8GB WINDFORCE OC');
    expect(payload.search).toBeNull();
    expect(payload.catalog.map((item: any) => item.category)).toEqual(
      expect.arrayContaining(['CPU', 'GPU']),
    );
  });

  it('arma una PC alrededor del producto que el cliente estaba viendo', async () => {
    const payload = await sentPayload('armame una pc con esa', {
      lastFocusedProductId: 'PROCESADOR AMD RYZEN 5 7600',
    });
    expect(payload.anchorProductId).toBe('PROCESADOR AMD RYZEN 5 7600');
  });

  it('no fija componente en un armado por presupuesto', async () => {
    const payload = await sentPayload('arma una pc gamer de 3000 soles');
    expect(payload.anchorProductId).toBeUndefined();
    expect(payload.search).toBeNull();
  });

  it('busca la respuesta de marca dentro de tarjetas de video', async () => {
    const payload = await sentPayload('nvidia', { awaiting: 'gpu_brand' });
    expect(payload.search).toMatchObject({ text: 'tarjeta de video nvidia', categories: ['GPU'] });

    const changed = await sentPayload('mejor un mouse', { awaiting: 'gpu_brand' });
    expect(changed.search).toMatchObject({ text: 'mouse', categories: ['MOUSE'] });
  });

  it.each(['hola', 'buenas tardes', 'gracias'])(
    'no convierte el saludo "%s" en una busqueda de categorias',
    async (message) => {
      const payload = await sentPayload(message);
      expect(payload.search).toMatchObject({ text: '', categories: [], matched: false });
      expect(payload.catalog).toEqual([]);
    },
  );

  afterAll(() => {
    delete process.env.AI_SERVICE_URL;
  });
});
