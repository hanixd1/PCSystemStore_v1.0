import { expandProductSearchQuery, rankProductMatch } from './product-search';

const product = (overrides: Record<string, any>) => ({
  id: overrides.id ?? 'product-id',
  sku: overrides.sku ?? 'SKU-TEST',
  slug: overrides.slug ?? 'producto-test',
  name: overrides.name ?? 'Producto test',
  description: overrides.description ?? '',
  category: overrides.category,
  cpuSpecs: overrides.cpuSpecs ?? null,
  motherboardSpecs: overrides.motherboardSpecs ?? null,
  ramSpecs: overrides.ramSpecs ?? null,
  gpuSpecs: overrides.gpuSpecs ?? null,
  storageSpecs: overrides.storageSpecs ?? null,
  psuSpecs: overrides.psuSpecs ?? null,
  caseSpecs: overrides.caseSpecs ?? null,
  coolerSpecs: overrides.coolerSpecs ?? null,
  monitorSpecs: overrides.monitorSpecs ?? null,
  keyboardSpecs: overrides.keyboardSpecs ?? null,
  mouseSpecs: overrides.mouseSpecs ?? null,
});

const cpu = product({
  category: 'CPU',
  name: 'AMD Ryzen 5 9600X',
  slug: 'amd-ryzen-5-9600x',
  cpuSpecs: { brand: 'AMD', socket: 'AM5', frequency: '5.4 GHz' },
});

const motherboard = product({
  category: 'MOTHERBOARD',
  name: 'Motherboard Gigabyte B650M DDR5',
  slug: 'motherboard-gigabyte-b650m-ddr5',
  motherboardSpecs: { brand: 'Gigabyte', socket: 'AM5', memoryType: 'DDR5' },
});

const gpu = product({
  category: 'GPU',
  name: 'GeForce RTX 4060 8GB',
  slug: 'geforce-rtx-4060',
  gpuSpecs: { brand: 'MSI', chipset: 'NVIDIA RTX 4060', vram: 8 },
});

const ram = product({
  category: 'RAM',
  name: 'Kingston Fury DDR5 16GB',
  slug: 'kingston-fury-ddr5-16gb',
  ramSpecs: { memoryType: 'DDR5', capacity: 16, speed: 5600 },
});

describe('product public search', () => {
  it.each(['procesador', 'procesadores', 'proce', 'cpu'])(
    'relaciona "%s" con productos CPU',
    (query) => {
      const expansion = expandProductSearchQuery(query);

      expect(expansion.candidateCategories).toContain('CPU');
      expect(rankProductMatch(cpu, expansion)).toBeGreaterThan(0);
    },
  );

  it.each(['placa', 'placa madre', 'motherboard', 'board'])(
    'relaciona "%s" con placas madre',
    (query) => {
      const expansion = expandProductSearchQuery(query);

      expect(expansion.candidateCategories).toContain('MOTHERBOARD');
      expect(rankProductMatch(motherboard, expansion)).toBeGreaterThan(0);
    },
  );

  it.each(['gpu', 'grafica', 'tarjeta de video'])(
    'relaciona "%s" con tarjetas graficas',
    (query) => {
      const expansion = expandProductSearchQuery(query);

      expect(expansion.candidateCategories).toContain('GPU');
      expect(rankProductMatch(gpu, expansion)).toBeGreaterThan(0);
    },
  );

  it('prioriza coincidencia exacta de modelo tecnico 9600x', () => {
    const expansion = expandProductSearchQuery('9600x');

    expect(rankProductMatch(cpu, expansion)).toBeGreaterThan(
      rankProductMatch(motherboard, expansion),
    );
  });

  it('encuentra DDR5 en RAM y placas madre compatibles por specs', () => {
    const expansion = expandProductSearchQuery('ddr5');

    expect(rankProductMatch(ram, expansion)).toBeGreaterThan(0);
    expect(rankProductMatch(motherboard, expansion)).toBeGreaterThan(0);
  });
});
