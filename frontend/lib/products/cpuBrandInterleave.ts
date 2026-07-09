type CpuProduct = Record<string, any>;

export type CpuBrand = 'intel' | 'amd' | 'other';

function normalizeCpuText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function serializeSpecs(specs: unknown) {
  if (!specs) return '';
  if (typeof specs === 'string') return specs;

  try {
    return JSON.stringify(specs);
  } catch {
    return '';
  }
}

export function detectCpuBrand(product: CpuProduct): CpuBrand {
  const normalizedText = normalizeCpuText(
    [
      product.name,
      product.slug,
      product.brand,
      product.category,
      product.subcategory,
      product.type,
      serializeSpecs(product.specs),
    ]
      .filter(Boolean)
      .join(' '),
  );

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
  const intel: T[] = [];
  const amd: T[] = [];
  const other: T[] = [];

  products.forEach((product) => {
    const brand = detectCpuBrand(product);
    if (brand === 'intel') intel.push(product);
    else if (brand === 'amd') amd.push(product);
    else other.push(product);
  });

  const firstCpuBrand = products
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
