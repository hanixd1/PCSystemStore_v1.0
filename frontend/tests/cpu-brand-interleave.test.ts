import { describe, expect, it } from 'vitest';
import {
  buildHomeProcessorList,
  detectCpuBrand,
  interleaveCpuBrands,
} from '../lib/products/cpuBrandInterleave';

function cpu(id: string, brand?: unknown, name = `Procesador ${id}`) {
  return {
    id,
    slug: id,
    name,
    category: 'CPU',
    cpuSpecs: brand === undefined ? null : { brand },
  };
}

describe('CPU brand detection', () => {
  it.each([
    ['Intel', 'intel'],
    [' INTEL ', 'intel'],
    ['intel', 'intel'],
    ['AMD', 'amd'],
    [' Amd ', 'amd'],
    ['amd', 'amd'],
  ] as const)('normalizes structured brand %s', (brand, expected) => {
    expect(detectCpuBrand(cpu('cpu', brand))).toBe(expected);
  });

  it('uses a brand relation before legacy name fallback', () => {
    expect(detectCpuBrand({ ...cpu('relation'), cpuSpecs: null, brand: { name: ' Intel ' } })).toBe(
      'intel',
    );
  });

  it('detects legacy brands from the product name and tolerates null values', () => {
    expect(detectCpuBrand(cpu('legacy-amd', undefined, 'Procesador Ryzen 7 9700X'))).toBe('amd');
    expect(detectCpuBrand(cpu('legacy-intel', undefined, 'Procesador Core Ultra 7'))).toBe('intel');
    expect(detectCpuBrand(null)).toBe('other');
  });
});

describe('deterministic CPU interleaving', () => {
  it('interleaves equal Intel and AMD groups while preserving internal order', () => {
    const products = [
      cpu('intel-1', 'Intel'),
      cpu('intel-2', 'Intel'),
      cpu('amd-1', 'AMD'),
      cpu('amd-2', 'AMD'),
    ];
    expect(interleaveCpuBrands(products).map((product) => product.id)).toEqual([
      'intel-1',
      'amd-1',
      'intel-2',
      'amd-2',
    ]);
  });

  it('starts with AMD when AMD is the first ranked known brand', () => {
    const products = [cpu('amd-1', 'AMD'), cpu('intel-1', 'Intel'), cpu('amd-2', 'AMD')];
    expect(interleaveCpuBrands(products).map((product) => product.id)).toEqual([
      'amd-1',
      'intel-1',
      'amd-2',
    ]);
  });

  it('appends remaining Intel products after AMD is exhausted', () => {
    const products = [
      cpu('intel-1', 'Intel'),
      cpu('intel-2', 'Intel'),
      cpu('amd-1', 'AMD'),
      cpu('intel-3', 'Intel'),
    ];
    expect(interleaveCpuBrands(products).map((product) => product.id)).toEqual([
      'intel-1',
      'amd-1',
      'intel-2',
      'intel-3',
    ]);
  });

  it('appends remaining AMD products after Intel is exhausted', () => {
    const products = [
      cpu('amd-1', 'AMD'),
      cpu('amd-2', 'AMD'),
      cpu('intel-1', 'Intel'),
      cpu('amd-3', 'AMD'),
    ];
    expect(interleaveCpuBrands(products).map((product) => product.id)).toEqual([
      'amd-1',
      'intel-1',
      'amd-2',
      'amd-3',
    ]);
  });

  it('preserves a single available brand', () => {
    expect(interleaveCpuBrands([cpu('intel-1', 'Intel'), cpu('intel-2', 'Intel')])).toHaveLength(2);
    expect(interleaveCpuBrands([cpu('amd-1', 'AMD'), cpu('amd-2', 'AMD')])).toHaveLength(2);
  });

  it('keeps unknown and third-party brands at the end', () => {
    const products = [
      cpu('intel-1', 'Intel'),
      cpu('unknown-1', undefined),
      cpu('amd-1', 'AMD'),
      cpu('third-1', 'VIA'),
    ];
    expect(interleaveCpuBrands(products).map((product) => product.id)).toEqual([
      'intel-1',
      'amd-1',
      'unknown-1',
      'third-1',
    ]);
  });

  it('returns an empty list for empty/null input entries and removes duplicate IDs', () => {
    expect(interleaveCpuBrands([])).toEqual([]);
    const first = cpu('intel-1', 'Intel');
    expect(interleaveCpuBrands([null, first, { ...first }, cpu('amd-1', 'AMD')])).toEqual([
      first,
      cpu('amd-1', 'AMD'),
    ]);
  });

  it('does not mutate the original list', () => {
    const products = [cpu('intel-1', 'Intel'), cpu('amd-1', 'AMD'), cpu('intel-2', 'Intel')];
    const original = [...products];
    interleaveCpuBrands(products);
    expect(products).toEqual(original);
  });

  it('builds the home section with two products per brand in the first four cards', () => {
    const products = [
      cpu('intel-1', 'Intel'),
      cpu('intel-2', 'Intel'),
      cpu('intel-3', 'Intel'),
      cpu('amd-1', 'AMD'),
      cpu('amd-2', 'AMD'),
      cpu('amd-3', 'AMD'),
      { ...cpu('ram-1', 'AMD'), category: 'RAM' },
    ];
    const selected = buildHomeProcessorList(products, 4);
    expect(selected.map(detectCpuBrand)).toEqual(['intel', 'amd', 'intel', 'amd']);
    expect(selected).toHaveLength(4);
  });
});
