import { normalizeSearchText } from '../products/product-search';

export type ChatPriceSort = 'cheapest' | 'premium' | null;

export interface ChatSearchQuery {
  /** Message without greetings, filler words or price phrases; fed to the store search engine. */
  text: string;
  maxPrice: number | null;
  minPrice: number | null;
  sort: ChatPriceSort;
}

const MAX_QUERY_LENGTH = 300;
const MIN_PRICE_AMOUNT = 10;
const MAX_PRICE_AMOUNT = 100_000;

/** Conversational words that carry no product meaning and would add noise to ranking. */
const FILLER_WORDS = new Set([
  'a',
  'al',
  'algo',
  'alguna',
  'alguno',
  'algun',
  'amigo',
  'busco',
  'buscando',
  'buenas',
  'buenos',
  'cuanto',
  'cuesta',
  'cual',
  'cuales',
  'con',
  'de',
  'del',
  'dias',
  'disponible',
  'disponibles',
  'el',
  'en',
  'es',
  'esta',
  'estan',
  'estoy',
  'favor',
  'gracias',
  'hay',
  'hola',
  'la',
  'las',
  'le',
  'lo',
  'los',
  'me',
  'mi',
  'muestrame',
  'necesito',
  'o',
  'para',
  'por',
  'porfa',
  'precio',
  'precios',
  'puedes',
  'que',
  'quiero',
  'recomiendas',
  'recomienda',
  'sale',
  'se',
  'si',
  'stock',
  'tal',
  'tardes',
  'tendran',
  'tiene',
  'tienen',
  'tienes',
  'un',
  'una',
  'unas',
  'uno',
  'unos',
  'ver',
  'venden',
  'vendes',
  'xfa',
  'y',
  'ya',
  // Price/sort words are handled separately.
  'soles',
  'sol',
  'barato',
  'barata',
  'baratos',
  'baratas',
  'economico',
  'economica',
  'economicos',
  'economicas',
  'mejor',
  'mejores',
  'potente',
  'gama',
  'alta',
  'mas',
  'menos',
]);

const MAX_PRICE_MARKERS = ['hasta', 'maximo', 'max', 'menos de', 'no mas de', 'debajo de', 'tope'];
const MIN_PRICE_MARKERS = ['desde', 'mas de', 'minimo', 'arriba de', 'encima de'];
const CHEAP_WORDS = ['barato', 'barata', 'economico', 'economica', 'bajo precio', 'mas bajo'];
const PREMIUM_WORDS = ['gama alta', 'mas potente', 'el mejor', 'la mejor', 'top', 'premium'];

function wordsPattern(words: string[]) {
  return new RegExp(`\\b(?:${words.join('|')})\\b`, 'g');
}

/** Parses "1500", "1,500", "1.5k", "s/1200" into an amount, rejecting model numbers. */
function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/^s\/\.?/, '').replace(/,/g, '');
  const match = /^(\d+(?:\.\d+)?)(k)?$/.exec(cleaned);
  if (!match) {
    return null;
  }
  const amount = Math.round(Number(match[1]) * (match[2] ? 1000 : 1));
  return amount >= MIN_PRICE_AMOUNT && amount <= MAX_PRICE_AMOUNT ? amount : null;
}

function precededBy(text: string, index: number, markers: string[]) {
  const before = text.slice(Math.max(0, index - 14), index).trimEnd();
  return markers.some((marker) => before.endsWith(marker));
}

/**
 * Extracts the product query and price constraints from a customer message.
 * Only numbers with explicit money context ("s/", "soles", "hasta", "desde"...) count as prices,
 * so model numbers such as "RTX 4060" or "650W" are kept in the search text.
 */
export function parseChatSearchQuery(message: string): ChatSearchQuery {
  const lowered = message
    .slice(0, MAX_QUERY_LENGTH)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

  let maxPrice: number | null = null;
  let minPrice: number | null = null;
  const priceSpans: Array<[number, number]> = [];
  const amountPattern = /(s\/\.?\s*)?(\d[\d,]*(?:\.\d+)?k?)(\s*(?:soles|sol|lucas)\b)?/g;

  for (const match of lowered.matchAll(amountPattern)) {
    const [whole, currency, digits, currencySuffix] = match;
    const index = match.index ?? 0;
    const amount = parseAmount(digits);
    if (amount === null) {
      continue;
    }

    const isMin = precededBy(lowered, index, MIN_PRICE_MARKERS);
    const isMax = !isMin && precededBy(lowered, index, MAX_PRICE_MARKERS);
    if (!isMin && !isMax && !currency && !currencySuffix) {
      continue;
    }

    if (isMin) {
      minPrice = amount;
    } else {
      maxPrice = amount;
    }
    priceSpans.push([index, index + whole.length]);
  }

  let withoutPrices = lowered;
  for (const [start, end] of [...priceSpans].reverse()) {
    withoutPrices = `${withoutPrices.slice(0, start)} ${withoutPrices.slice(end)}`;
  }
  withoutPrices = withoutPrices.replace(
    wordsPattern([...MAX_PRICE_MARKERS, ...MIN_PRICE_MARKERS]),
    ' ',
  );

  const sort: ChatPriceSort = wordsPattern(PREMIUM_WORDS).test(lowered)
    ? 'premium'
    : wordsPattern(CHEAP_WORDS).test(lowered)
      ? 'cheapest'
      : null;

  const text = normalizeSearchText(withoutPrices)
    .split(' ')
    .filter((word) => word && !FILLER_WORDS.has(word))
    .join(' ');

  return { text, maxPrice, minPrice, sort };
}

/** Short follow-ups ("y mas barato?", "hasta 800") refine the previous search instead of replacing it. */
export function isRefinementOnly(query: ChatSearchQuery) {
  return (
    query.text.length === 0 &&
    (query.maxPrice !== null || query.minPrice !== null || query.sort !== null)
  );
}
