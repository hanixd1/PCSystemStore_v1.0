type CpuProduct = Record<string, unknown> | null | undefined;

export type CpuBrand = 'intel' | 'amd' | 'other';

function normalizeCpuText(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function nestedValue(value: unknown, key: string) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)[key]
    : undefined;
}

export function detectCpuBrand(product: CpuProduct): CpuBrand {
  if (!product || typeof product !== 'object') return 'other';

  const structuredCandidates = [
    nestedValue(product.cpuSpecs, 'brand'),
    nestedValue(product.cpuSpecs, 'marcaProcesador'),
    typeof product.brand === 'object' ? nestedValue(product.brand, 'name') : product.brand,
    product.marca,
    product.manufacturer,
    nestedValue(product.specs, 'brand'),
    nestedValue(product.specs, 'marcaProcesador'),
  ];

  for (const candidate of structuredCandidates) {
    const brand = classifyCpuBrand(candidate);
    if (brand !== 'other') return brand;
  }

  return classifyCpuBrand([product.name, product.slug].filter(Boolean).join(' '));
}

function classifyCpuBrand(value: unknown): CpuBrand {
  const normalizedText = normalizeCpuText(value);

  if (
    /\bintel\b/.test(normalizedText) ||
    /\bcore\s+i/.test(normalizedText) ||
    /\bcore\s+ultra\b/.test(normalizedText)
  ) {
    return 'intel';
  }

  if (
    /\bamd\b/.test(normalizedText) ||
    /\bryzen\b/.test(normalizedText) ||
    /\bthreadripper\b/.test(normalizedText)
  ) {
    return 'amd';
  }

  return 'other';
}

export function interleaveCpuBrands<T extends CpuProduct>(products: T[]) {
  const uniqueProducts: T[] = [];
  const seenProducts = new Set<unknown>();

  for (const product of products) {
    if (!product || typeof product !== 'object') continue;
    const id = typeof product.id === 'string' ? product.id.trim() : '';
    const slug = typeof product.slug === 'string' ? product.slug.trim() : '';
    const identity: unknown = id ? `id:${id}` : slug ? `slug:${slug}` : product;
    if (seenProducts.has(identity)) continue;
    seenProducts.add(identity);
    uniqueProducts.push(product);
  }

  const intel: T[] = [];
  const amd: T[] = [];
  const other: T[] = [];

  uniqueProducts.forEach((product) => {
    const brand = detectCpuBrand(product);
    if (brand === 'intel') intel.push(product);
    else if (brand === 'amd') amd.push(product);
    else other.push(product);
  });

  const firstCpuBrand = uniqueProducts
    .map((product) => detectCpuBrand(product))
    .find((brand) => brand === 'intel' || brand === 'amd');
  const first = firstCpuBrand === 'amd' ? amd : intel;
  const second = firstCpuBrand === 'amd' ? intel : amd;
  const interleaved: T[] = [];
  const maxLength = Math.max(first.length, second.length);

  for (let index = 0; index < maxLength; index += 1) {
    if (first[index]) interleaved.push(first[index]);
    if (second[index]) interleaved.push(second[index]);
  }

  return [...interleaved, ...other];
}

export function buildHomeProcessorList<T extends CpuProduct>(products: T[], limit = 15) {
  const safeLimit = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : 15;
  const processors = products.filter(
    (product) => product && typeof product === 'object' && product.category === 'CPU',
  );
  return interleaveCpuBrands(processors).slice(0, safeLimit);
}
