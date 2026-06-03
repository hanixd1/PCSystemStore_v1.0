export type ProductSearchExpansion = {
  normalizedQuery: string;
  compactQuery: string;
  tokens: string[];
  terms: string[];
  candidateCategories: string[];
  rankingCategories: string[];
};

type CategorySearchDictionaryEntry = {
  category: string;
  categoryAliases: string[];
  technicalTerms?: string[];
};

const SEARCH_DICTIONARY: CategorySearchDictionaryEntry[] = [
  {
    category: 'CPU',
    categoryAliases: ['procesador', 'procesadores', 'proce', 'cpu', 'microprocesador'],
    technicalTerms: ['ryzen', 'intel core', 'core i3', 'core i5', 'core i7', 'core i9'],
  },
  {
    category: 'MOTHERBOARD',
    categoryAliases: [
      'placa',
      'placa madre',
      'motherboard',
      'mainboard',
      'board',
      'mobo',
      'main board',
    ],
    technicalTerms: ['b650', 'b550', 'x670', 'z790', 'h610', 'lga', 'am4', 'am5'],
  },
  {
    category: 'GPU',
    categoryAliases: ['tarjeta grafica', 'grafica', 'gpu', 'video', 'tarjeta de video'],
    technicalTerms: ['rtx', 'geforce', 'radeon', 'rx'],
  },
  {
    category: 'RAM',
    categoryAliases: ['memoria', 'ram', 'memoria ram'],
    technicalTerms: ['ddr4', 'ddr5', 'sodimm', 'dimm'],
  },
  {
    category: 'STORAGE',
    categoryAliases: [
      'ssd',
      'nvme',
      'm2',
      'm.2',
      'disco',
      'disco duro',
      'hdd',
      'almacenamiento',
      'sata',
    ],
    technicalTerms: ['1tb', '2tb', '500gb'],
  },
  {
    category: 'PSU',
    categoryAliases: ['fuente', 'fuente de poder', 'psu', 'power supply'],
    technicalTerms: ['500w', '650w', '750w', '850w', '80 plus', 'gold', 'bronze'],
  },
  {
    category: 'CASE',
    categoryAliases: ['case', 'gabinete', 'chasis', 'torre'],
    technicalTerms: ['atx', 'matx', 'micro atx'],
  },
  {
    category: 'COOLER',
    categoryAliases: [
      'cooler',
      'disipador',
      'refrigeracion',
      'aio',
      'liquida',
      'fan',
      'ventilador',
    ],
  },
  {
    category: 'MONITOR',
    categoryAliases: ['monitor', 'monitores', 'pantalla', 'display'],
    technicalTerms: ['144hz', '165hz', '240hz', 'ips', 'va', 'fhd', 'qhd', '4k'],
  },
  {
    category: 'LAPTOP',
    categoryAliases: ['laptop', 'laptops', 'notebook', 'portatil'],
  },
  {
    category: 'MOUSE',
    categoryAliases: ['mouse', 'raton', 'gaming mouse'],
    technicalTerms: ['inalambrico'],
  },
  {
    category: 'KEYBOARD',
    categoryAliases: ['teclado', 'teclados', 'keyboard'],
    technicalTerms: ['mecanico', 'switches', 'switch'],
  },
  {
    category: 'HEADSET',
    categoryAliases: ['audifonos', 'headset', 'auriculares'],
  },
  {
    category: 'SPEAKER',
    categoryAliases: ['parlantes'],
  },
  {
    category: 'MICROPHONE',
    categoryAliases: ['microfono'],
  },
  {
    category: 'WEBCAM',
    categoryAliases: ['webcam', 'camara'],
  },
  {
    category: 'CAPTURE_CARD',
    categoryAliases: ['capturadora'],
  },
  {
    category: 'CABLE_HUB',
    categoryAliases: ['cable', 'adaptador', 'hub', 'usb', 'usb-c', 'hdmi', 'displayport', 'dp'],
  },
  {
    category: 'PC_DESKTOP',
    categoryAliases: [
      'pc',
      'computadora',
      'ordenador',
      'pc gamer',
      'equipo armado',
      'computadora gamer',
    ],
  },
];

const CATEGORY_LABELS: Record<string, string[]> = {
  CPU: ['cpu', 'procesador', 'procesadores'],
  MOTHERBOARD: ['motherboard', 'placa madre', 'placa', 'mainboard'],
  GPU: ['gpu', 'tarjeta grafica', 'grafica', 'video'],
  RAM: ['ram', 'memoria ram', 'memoria'],
  STORAGE: ['almacenamiento', 'ssd', 'nvme', 'disco'],
  PSU: ['fuente', 'fuente de poder', 'psu'],
  CASE: ['case', 'gabinete', 'torre'],
  COOLER: ['cooler', 'disipador', 'refrigeracion'],
  MONITOR: ['monitor', 'pantalla'],
  LAPTOP: ['laptop', 'notebook', 'portatil'],
  MOUSE: ['mouse', 'raton'],
  KEYBOARD: ['teclado', 'keyboard'],
  HEADSET: ['audifonos', 'headset', 'auriculares'],
  SPEAKER: ['parlantes', 'speaker'],
  MICROPHONE: ['microfono'],
  WEBCAM: ['webcam', 'camara'],
  CAPTURE_CARD: ['capturadora'],
  CABLE_HUB: ['cable', 'adaptador', 'hub'],
  PC_DESKTOP: ['pc', 'computadora', 'ordenador'],
};

export function normalizeSearchText(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[_/]+/g, ' ')
    .replace(/[^\p{L}\p{N}.+\-#\s]/gu, ' ')
    .replace(/\bm\.?\s*2\b/g, 'm2')
    .replace(/\b(\d+)\s*(tb|gb|hz|w)\b/g, '$1$2')
    .replace(/\b(rtx|rx|gtx)\s+(\d+)/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
}

export function compactSearchText(value: unknown): string {
  return normalizeSearchText(value).replace(/[\s.+\-#]/g, '');
}

export function getSearchDictionary() {
  return SEARCH_DICTIONARY;
}

export function expandProductSearchQuery(query: unknown): ProductSearchExpansion {
  const normalizedQuery = normalizeSearchText(query);
  const tokens = tokenizeSearchText(normalizedQuery);
  const candidateCategories = new Set<string>();
  const rankingCategories = new Set<string>();
  const terms = new Set<string>([normalizedQuery, ...tokens].filter(Boolean));

  for (const entry of SEARCH_DICTIONARY) {
    const categoryAliases = entry.categoryAliases.map(normalizeSearchText);
    const technicalTerms = (entry.technicalTerms ?? []).map(normalizeSearchText);

    if (matchesAnySearchTerm(normalizedQuery, tokens, categoryAliases)) {
      candidateCategories.add(entry.category);
      rankingCategories.add(entry.category);
      categoryAliases.forEach((term) => terms.add(term));
      technicalTerms.forEach((term) => terms.add(term));
    }

    if (matchesAnySearchTerm(normalizedQuery, tokens, technicalTerms)) {
      candidateCategories.add(entry.category);
      technicalTerms.forEach((term) => terms.add(term));
    }
  }

  return {
    normalizedQuery,
    compactQuery: compactSearchText(normalizedQuery),
    tokens,
    terms: Array.from(terms).filter(Boolean).slice(0, 80),
    candidateCategories: Array.from(candidateCategories),
    rankingCategories: Array.from(rankingCategories),
  };
}

export function buildProductSearchText(product: any): {
  name: string;
  sku: string;
  slug: string;
  description: string;
  category: string;
  brand: string;
  specs: string;
  full: string;
  compactIdentity: string;
} {
  const specValues = collectSpecValues(product);
  const categoryLabels = CATEGORY_LABELS[product?.category] ?? [];
  const brandValues = collectBrandValues(product);
  const payload = {
    name: normalizeSearchText(product?.name),
    sku: normalizeSearchText(product?.sku),
    slug: normalizeSearchText(product?.slug),
    description: normalizeSearchText(product?.description),
    category: normalizeSearchText([product?.category, ...categoryLabels].join(' ')),
    brand: normalizeSearchText(brandValues.join(' ')),
    specs: normalizeSearchText(specValues.join(' ')),
  };

  return {
    ...payload,
    full: normalizeSearchText(Object.values(payload).join(' ')),
    compactIdentity: compactSearchText([payload.name, payload.sku, payload.slug].join(' ')),
  };
}

export function rankProductMatch(product: any, expansion: ProductSearchExpansion): number {
  if (!expansion.normalizedQuery) {
    return 0;
  }

  const text = buildProductSearchText(product);
  let score = 0;
  const query = expansion.normalizedQuery;
  const compactQuery = expansion.compactQuery;
  const queryParts = [query, ...expansion.tokens].filter(Boolean);

  if (compactQuery && text.compactIdentity.includes(compactQuery)) {
    score += isModelLikeQuery(query) ? 1000 : 550;
  }

  if (query && text.name.includes(query)) {
    score += 500;
  }
  if (query && text.sku.includes(query)) {
    score += 480;
  }
  if (query && text.slug.includes(query)) {
    score += 460;
  }

  for (const token of queryParts) {
    const compactToken = compactSearchText(token);
    if (!token) {
      continue;
    }
    if (
      text.name.includes(token) ||
      (compactToken && text.compactIdentity.includes(compactToken))
    ) {
      score += 180;
    }
    if (text.brand.includes(token)) {
      score += 120;
    }
    if (text.specs.includes(token)) {
      score += 90;
    }
    if (text.description.includes(token)) {
      score += 40;
    }
    if (text.full.includes(token)) {
      score += 20;
    }
  }

  if (expansion.rankingCategories.includes(product?.category)) {
    score += 320;
  }

  return score;
}

function tokenizeSearchText(value: string): string[] {
  return value
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function matchesAnySearchTerm(query: string, tokens: string[], terms: string[]) {
  return terms.some((term) => {
    if (!term) {
      return false;
    }
    if (query === term || query.includes(term) || term.includes(query)) {
      return true;
    }
    return tokens.some(
      (token) => token === term || term.startsWith(token) || token.startsWith(term),
    );
  });
}

function isModelLikeQuery(value: string) {
  return /[a-z]+\d|\d+[a-z]/i.test(value.replace(/\s+/g, ''));
}

function collectBrandValues(product: any): string[] {
  return [
    product?.cpuSpecs?.brand,
    product?.motherboardSpecs?.brand,
    product?.gpuSpecs?.brand,
    product?.psuSpecs?.brand,
    product?.caseSpecs?.brand,
    product?.coolerSpecs?.brand,
    product?.laptopSpecs?.brand,
    product?.monitorSpecs?.brand,
    product?.keyboardSpecs?.brand,
    product?.mouseSpecs?.brand,
    product?.mousepadSpecs?.brand,
    product?.chairSpecs?.brand,
    product?.gamingDeskSpecs?.brand,
    product?.headsetSpecs?.brand,
    product?.microphoneSpecs?.brand,
    product?.speakerSpecs?.brand,
    product?.webcamSpecs?.brand,
    product?.captureCardSpecs?.brand,
    product?.cableHubSpecs?.brand,
    product?.laptopCoolingBaseSpecs?.brand,
    product?.backpackSpecs?.brand,
  ].filter(Boolean);
}

function collectSpecValues(value: unknown): string[] {
  if (value === null || value === undefined) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectSpecValues(item));
  }

  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, item]) => {
      if (['id', 'productId', 'product', 'images', 'createdAt', 'updatedAt'].includes(key)) {
        return [];
      }

      return collectSpecValues(item);
    });
  }

  return [String(value)];
}
