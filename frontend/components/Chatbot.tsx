'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { FiMessageSquare, FiX, FiSend, FiCpu } from 'react-icons/fi';
import { api } from '@/lib/api';
import { MAX_CART_ITEM_QUANTITY, useCartStore } from '@/store/useCartStore';

type ChatProduct = {
  id: string;
  name: string;
  price: number;
  stock: number;
  imageUrl?: string | null;
  productUrl: string;
};

type ChatMessage = {
  id: string;
  text: string;
  role: 'user' | 'assistant';
  products?: ChatProduct[];
};

type ChatAction = {
  type: 'add_to_cart';
  productId: string;
  quantity?: number;
};

type ConversationState = {
  intent:
    | 'product_search'
    | 'pc_build'
    | 'budget_pc_build'
    | 'cart_action'
    | 'total_query'
    | 'checkout_guidance'
    | 'support'
    | 'unknown'
    | null;
  budget: number | null;
  usage: string | null;
  includesPeripherals: boolean | null;
  mentionedProducts: string[];
  lastRecommendedProducts: ChatProduct[];
  lastRecommendedBuild: ChatProduct[];
  lastFocusedProductId: string | null;
  awaiting: string | null;
};

type CatalogCategory =
  | 'GPU'
  | 'CPU'
  | 'RAM'
  | 'MOTHERBOARD'
  | 'STORAGE'
  | 'PSU'
  | 'CASE'
  | 'COOLER';

type GuidedStep =
  | 'gpuBrand'
  | 'cpuBrand'
  | 'ramType'
  | 'ramCapacity'
  | 'ramModules'
  | 'motherboardPlatform'
  | 'motherboardSocket'
  | 'storageType'
  | 'storageCapacity'
  | 'psuWattage'
  | 'caseFormFactor'
  | 'caseIncludesPsu'
  | 'coolerType'
  | 'coolerRadiator';

type GuidedSearchState = {
  category: CatalogCategory;
  step: GuidedStep;
  filters: Record<string, string>;
};

type CatalogProduct = Record<string, any> & {
  id: string;
  name: string;
  price: number | string;
  stock: number;
  images?: string[];
  imageUrl?: string | null;
  category?: string;
};

type CatalogSearchResponse = {
  success: boolean;
  searchAvailable?: boolean;
  message?: string;
  items: CatalogProduct[];
};

const STARTER_PROMPTS = [
  'Tengo 3000 soles y quiero una PC para jugar',
  'Busco una PC para oficina con monitor',
  'Quiero una PC para estudio, solo torre',
  'Tienes alguna RTX para gaming?',
];

const AI_UNAVAILABLE_REPLY =
  'Buenas, por el momento Alex no se encuentra disponible. Puedes revisar el catálogo o usar el armador de PCs mientras el servicio vuelve a estar operativo.';

const CHATBOT_MAX_INPUT_LENGTH = 300;
const UNIT_TOKENS = ['gb', 'tb', 'w'] as const;

type UnitToken = (typeof UNIT_TOKENS)[number];

function ChatProductImage({ src, alt }: { src?: string | null; alt: string }) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-[10px] font-bold text-gray-400">
        Sin imagen
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className="h-16 w-16 shrink-0 rounded-lg object-cover bg-gray-100"
      onError={() => setHasError(true)}
    />
  );
}

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAiAvailable, setIsAiAvailable] = useState(true);
  const [guidedSearch, setGuidedSearch] = useState<GuidedSearchState | null>(null);
  const addItem = useCartStore((state) => state.addItem);
  const [conversationState, setConversationState] = useState<ConversationState>({
    intent: null,
    budget: null,
    usage: null,
    includesPeripherals: null,
    mentionedProducts: [],
    lastRecommendedProducts: [],
    lastRecommendedBuild: [],
    lastFocusedProductId: null,
    awaiting: null,
  });
  const messageSequenceRef = useRef(1);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      text: 'Hola, soy tu Alex, tu asistente virtual. Si quieres, te ayudo a encontrar una pieza puntual o a armar una PC segun tu presupuesto y uso.',
      role: 'assistant',
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(false);
  const activeRequestControllerRef = useRef<AbortController | null>(null);

  const nextMessageId = (prefix: 'user' | 'assistant') => {
    const id = `${prefix}-${messageSequenceRef.current}`;
    messageSequenceRef.current += 1;
    return id;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      activeRequestControllerRef.current?.abort();
    };
  }, []);

  const normalizeRecommendedProducts = (value: unknown): ChatProduct[] => {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.filter((product): product is ChatProduct => {
      const candidate = product as Partial<ChatProduct>;
      return (
        typeof candidate.id === 'string' &&
        typeof candidate.name === 'string' &&
        typeof candidate.price === 'number' &&
        typeof candidate.stock === 'number' &&
        typeof candidate.productUrl === 'string'
      );
    });
  };

  const appendAssistantMessage = (text: string) => {
    if (!isMountedRef.current) {
      return;
    }

    setMessages((prev) => [
      ...prev,
      {
        id: nextMessageId('assistant'),
        text,
        role: 'assistant',
      },
    ]);
  };

  const findActionProduct = (
    productId: string,
    responseProducts: ChatProduct[],
    state: ConversationState,
  ): ChatProduct | undefined => {
    return [
      ...responseProducts,
      ...state.lastRecommendedProducts,
      ...state.lastRecommendedBuild,
    ].find((product) => String(product.id) === String(productId));
  };

  const addProductToCart = (product: ChatProduct, quantity = 1): string => {
    if (product.stock <= 0) {
      return `${product.name} esta sin stock disponible.`;
    }

    const currentItem = useCartStore
      .getState()
      .items.find((item) => String(item.id) === String(product.id));
    const currentQty = currentItem?.qty ?? 0;
    const maxAllowed = Math.min(product.stock, MAX_CART_ITEM_QUANTITY);
    const availableQty = Math.max(0, maxAllowed - currentQty);

    if (availableQty <= 0) {
      return `${product.name} ya alcanzo la cantidad maxima disponible en tu carrito.`;
    }

    const quantityToAdd = Math.min(Math.max(1, quantity), availableQty);
    for (let index = 0; index < quantityToAdd; index += 1) {
      addItem({
        id: product.id,
        name: product.name,
        price: product.price,
        qty: 1,
        image: product.imageUrl ?? undefined,
      });
    }

    return quantityToAdd === 1
      ? `${product.name} agregado al carrito.`
      : `${product.name} agregado al carrito (${quantityToAdd} unidades).`;
  };

  const handleBotActions = (
    actions: ChatAction[],
    responseProducts: ChatProduct[],
    nextState: ConversationState,
  ): string[] => {
    if (actions.length === 0) {
      return [];
    }

    return actions.map((action) => {
      if (action.type !== 'add_to_cart') {
        return 'No pude ejecutar una accion no soportada.';
      }

      const product = findActionProduct(action.productId, responseProducts, nextState);
      if (!product) {
        return 'No pude encontrar el producto para agregarlo al carrito.';
      }

      return addProductToCart(product, action.quantity ?? 1);
    });
  };

  const handleProductCardAdd = (product: ChatProduct) => {
    appendAssistantMessage(addProductToCart(product, 1));
  };

  const normalizeText = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ');

  const splitByWhitespace = (text: string): string[] => {
    const tokens: string[] = [];
    let current = '';

    for (const char of text) {
      if (char === ' ' || char === '\n' || char === '\t' || char === '\r') {
        if (current) {
          tokens.push(current);
          current = '';
        }
        continue;
      }

      current += char;
    }

    if (current) {
      tokens.push(current);
    }

    return tokens;
  };

  const isDigitString = (value: string) =>
    value.length > 0 &&
    value.length <= 5 &&
    Array.from(value).every((char) => char >= '0' && char <= '9');

  const normalizeUnitSpacing = (text: string): string =>
    splitByWhitespace(text)
      .map((token) => {
        const lower = token.toLowerCase();

        for (const unit of UNIT_TOKENS) {
          if (lower.endsWith(unit)) {
            const numberPart = lower.slice(0, -unit.length);
            if (isDigitString(numberPart)) {
              return `${numberPart} ${unit}`;
            }
          }
        }

        return lower;
      })
      .join(' ');

  const hasStandaloneToken = (text: string, token: string): boolean =>
    splitByWhitespace(text).includes(token);

  const hasNumberWithUnit = (text: string, unit: UnitToken): boolean => {
    const tokens = splitByWhitespace(text);

    for (let index = 0; index < tokens.length; index += 1) {
      const token = tokens[index].toLowerCase();

      if (token.endsWith(unit)) {
        const numberPart = token.slice(0, -unit.length);
        if (isDigitString(numberPart)) {
          return true;
        }
      }

      if (
        index + 1 < tokens.length &&
        tokens[index + 1].toLowerCase() === unit &&
        isDigitString(token)
      ) {
        return true;
      }
    }

    return false;
  };

  const hasM2Token = (text: string): boolean =>
    text.includes('m.2') || hasStandaloneToken(text, 'm2');

  const getFirstInteger = (text: string): number => {
    for (const token of splitByWhitespace(text)) {
      const numberPart = UNIT_TOKENS.reduce(
        (current, unit) => (current.endsWith(unit) ? current.slice(0, -unit.length) : current),
        token.toLowerCase(),
      );

      if (isDigitString(numberPart)) {
        return Number(numberPart);
      }
    }

    return 0;
  };

  const normalizeCatalogReply = (value: string) =>
    normalizeUnitSpacing(normalizeText(value.slice(0, CHATBOT_MAX_INPUT_LENGTH)))
      .replace('ver todas', 'todas')
      .replace('ver todos', 'todas')
      .replace('todos', 'todas');

  const appendCatalogAssistantMessage = (text: string, products: ChatProduct[] = []) => {
    setMessages((prev) => [
      ...prev,
      {
        id: nextMessageId('assistant'),
        text,
        role: 'assistant',
        products,
      },
    ]);
  };

  const getProductSpecs = (product: CatalogProduct) => ({
    cpu: product.cpuSpecs ?? {},
    gpu: product.gpuSpecs ?? {},
    ram: product.ramSpecs ?? {},
    motherboard: product.motherboardSpecs ?? {},
    storage: product.storageSpecs ?? {},
    psu: product.psuSpecs ?? {},
    caseSpecs: product.caseSpecs ?? {},
    cooler: product.coolerSpecs ?? {},
  });

  const mapCatalogProducts = (products: CatalogProduct[]): ChatProduct[] =>
    products.slice(0, 5).map((product) => ({
      id: String(product.id),
      name: String(product.name),
      price: Number(product.price) || 0,
      stock: Number(product.stock) || 0,
      imageUrl:
        product.imageUrl ??
        (Array.isArray(product.images) && product.images[0] ? product.images[0] : null),
      productUrl: `/product/${product.id}`,
    }));

  const fetchCatalogProducts = async (
    category: CatalogCategory,
    search = '',
  ): Promise<CatalogSearchResponse> => {
    const res = await api.get('/products/chat-search', {
      params: {
        category,
        search,
        inStock: true,
        limit: 5,
      },
    });
    const rawProducts = Array.isArray(res.data) ? res.data : res.data?.items;
    return {
      success: res.data?.success !== false,
      searchAvailable: res.data?.searchAvailable,
      message: res.data?.message,
      items: Array.isArray(rawProducts) ? rawProducts : [],
    };
  };

  const productMatchesFilters = (
    product: CatalogProduct,
    category: CatalogCategory,
    filters: Record<string, string>,
  ) => {
    const text = normalizeText(`${product.name} ${product.description ?? ''}`);
    const specs = getProductSpecs(product);

    if (category === 'GPU' && filters.brand) {
      const brandText = normalizeText(
        `${specs.gpu.brand ?? ''} ${specs.gpu.chipset ?? ''} ${text}`,
      );
      return filters.brand === 'NVIDIA'
        ? ['nvidia', 'rtx', 'gtx'].some((token) => brandText.includes(token))
        : ['amd', 'radeon', ' rx '].some((token) => ` ${brandText} `.includes(token));
    }

    if (category === 'CPU' && filters.brand) {
      const brandText = normalizeText(`${specs.cpu.brand ?? ''} ${text}`);
      return filters.brand === 'Intel'
        ? ['intel', 'core i', 'core ultra', 'i3', 'i5', 'i7', 'i9'].some((token) =>
            brandText.includes(token),
          )
        : ['amd', 'ryzen'].some((token) => brandText.includes(token));
    }

    if (category === 'RAM') {
      const memoryType = normalizeText(String(specs.ram.memoryType ?? text));
      const capacity = Number(specs.ram.capacity ?? 0);
      const modules = Number(specs.ram.modules ?? 0);
      return (
        (!filters.memoryType || memoryType.includes(normalizeText(filters.memoryType))) &&
        (!filters.capacity || capacity === Number(filters.capacity)) &&
        (!filters.modules || modules === Number(filters.modules))
      );
    }

    if (category === 'MOTHERBOARD') {
      const socket = normalizeText(String(specs.motherboard.socket ?? ''));
      return !filters.socket || socket.includes(normalizeText(filters.socket));
    }

    if (category === 'STORAGE') {
      const storageText = normalizeText(
        `${specs.storage.type ?? ''} ${specs.storage.interface ?? ''} ${text}`,
      );
      const capacity = Number(specs.storage.capacity ?? 0);
      return (
        (!filters.type || storageText.includes(normalizeText(filters.type))) &&
        (!filters.capacity || capacity === Number(filters.capacity))
      );
    }

    if (category === 'PSU') {
      const wattage = Number(specs.psu.wattage ?? 0);
      return !filters.wattage || wattage >= Number(filters.wattage);
    }

    if (category === 'CASE') {
      const formFactor = normalizeText(String(specs.caseSpecs.formFactor ?? text));
      const includesPsu = Boolean(specs.caseSpecs.includesPsu);
      return (
        (!filters.formFactor || formFactor.includes(normalizeText(filters.formFactor))) &&
        (!filters.includesPsu ||
          filters.includesPsu === 'any' ||
          includesPsu === (filters.includesPsu === 'yes'))
      );
    }

    if (category === 'COOLER') {
      const coolerType = normalizeText(String(specs.cooler.type ?? text));
      const radiatorSize = Number(specs.cooler.radiatorSize ?? 0);
      return (
        (!filters.type || coolerType.includes(normalizeText(filters.type))) &&
        (!filters.radiatorSize || radiatorSize === Number(filters.radiatorSize))
      );
    }

    return true;
  };

  const showCatalogResults = async (
    category: CatalogCategory,
    filters: Record<string, string>,
    intro: string,
    search = '',
  ) => {
    setIsLoading(true);
    try {
      const response = await fetchCatalogProducts(category, search);

      if (!response.success) {
        appendCatalogAssistantMessage(
          response.message ??
            'Por ahora no pude consultar el catálogo. Intenta nuevamente en unos segundos.',
        );
        return false;
      }

      const filteredProducts = response.items
        .filter((product) => productMatchesFilters(product, category, filters))
        .sort((a, b) => Number(b.stock ?? 0) - Number(a.stock ?? 0));
      const mappedProducts = mapCatalogProducts(filteredProducts);

      if (mappedProducts.length === 0) {
        appendCatalogAssistantMessage(
          'Por ahora no encontré productos disponibles con ese filtro. Puedes revisar el catálogo o cambiar el criterio.',
        );
        return false;
      }

      const first = mappedProducts[0];
      const message =
        mappedProducts.length === 1
          ? `Encontré una opción en la tienda: ${first.name} por S/. ${first.price.toFixed(2)}. Estado: ${first.stock > 0 ? 'en stock' : 'sin stock'}.`
          : intro;
      appendCatalogAssistantMessage(message, mappedProducts);
      return true;
    } catch {
      appendCatalogAssistantMessage(
        'Por ahora no pude consultar el catálogo. Intenta nuevamente en unos segundos.',
      );
      return false;
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  const detectCatalogCategory = (text: string): CatalogCategory | null => {
    const normalized = normalizeText(text);
    if (/(tarjeta de video|tarjeta grafica|gpu|grafica|rtx|gtx|radeon|\brx\b)/.test(normalized)) {
      return 'GPU';
    }
    if (/(procesador|cpu|ryzen|intel|core i|core ultra|\bi[3579]\b)/.test(normalized)) {
      return 'CPU';
    }
    if (/(memoria ram|\bram\b|ddr4|ddr5)/.test(normalized)) {
      return 'RAM';
    }
    if (/(placa madre|motherboard|mainboard)/.test(normalized)) {
      return 'MOTHERBOARD';
    }
    if (/(almacenamiento|ssd|disco duro|hdd|m\.?2|nvme)/.test(normalized)) {
      return 'STORAGE';
    }
    if (/(fuente de poder|\bpsu\b|\bfuente\b|\d{3,4}\s?w)/.test(normalized)) {
      return 'PSU';
    }
    if (/(case|gabinete)/.test(normalized)) {
      return 'CASE';
    }
    if (/(cooler|refrigeracion|disipador|aio|liquida)/.test(normalized)) {
      return 'COOLER';
    }
    return null;
  };

  const isSpecificSearch = (text: string) => {
    const normalized = normalizeText(text.slice(0, CHATBOT_MAX_INPUT_LENGTH));
    const directTerms = [
      'rtx',
      'gtx',
      'radeon',
      'ryzen',
      'core i',
      'i3',
      'i5',
      'i7',
      'i9',
      'ddr4',
      'ddr5',
      'nvme',
    ];

    if (directTerms.some((term) => normalized.includes(term))) {
      return true;
    }

    return (
      hasStandaloneToken(normalized, 'rx') ||
      hasNumberWithUnit(normalized, 'gb') ||
      hasNumberWithUnit(normalized, 'tb') ||
      hasNumberWithUnit(normalized, 'w') ||
      hasM2Token(normalized)
    );
  };

  const startGuidedCatalogFlow = (category: CatalogCategory) => {
    const prompts: Record<CatalogCategory, { text: string; step: GuidedStep }> = {
      GPU: {
        text: 'Claro, ¿prefieres una tarjeta de video NVIDIA o AMD? También puedes escribir "todas".',
        step: 'gpuBrand',
      },
      CPU: {
        text: 'Claro, ¿prefieres procesador Intel o AMD? También puedes escribir "todos".',
        step: 'cpuBrand',
      },
      RAM: {
        text: 'Claro, ¿qué tipo de RAM necesitas: DDR4 o DDR5? También puedes escribir "todas".',
        step: 'ramType',
      },
      MOTHERBOARD: {
        text: 'Claro, ¿para qué plataforma la necesitas? Puedes escribir Intel, AMD o todas.',
        step: 'motherboardPlatform',
      },
      STORAGE: {
        text: 'Claro, ¿qué tipo de almacenamiento buscas? Puedes escribir NVMe, SATA, HDD o todos.',
        step: 'storageType',
      },
      PSU: {
        text: 'Claro, ¿qué potencia buscas? Puedes escribir 500W, 600W, 650W, 750W, 850W, 1000W o todas.',
        step: 'psuWattage',
      },
      CASE: {
        text: 'Claro, ¿qué formato de placa necesitas soportar? Puedes escribir ATX, Micro-ATX, Mini-ITX o todos.',
        step: 'caseFormFactor',
      },
      COOLER: {
        text: 'Claro, ¿buscas cooler de torre o refrigeración líquida? Puedes escribir Torre, Líquida o todos.',
        step: 'coolerType',
      },
    };
    const prompt = prompts[category];
    setGuidedSearch({ category, step: prompt.step, filters: {} });
    appendCatalogAssistantMessage(prompt.text);
  };

  const continueGuidedCatalogFlow = async (text: string) => {
    if (!guidedSearch) {
      return false;
    }

    const value = normalizeCatalogReply(text);
    const nextFilters = { ...guidedSearch.filters };
    const isAll = value.includes('todas');

    if (['cancelar', 'reiniciar', 'empezar de nuevo'].includes(value)) {
      setGuidedSearch(null);
      appendCatalogAssistantMessage('Listo, reinicié la búsqueda. ¿Qué componente necesitas?');
      return true;
    }

    if (guidedSearch.step === 'gpuBrand') {
      if (!isAll && value.includes('amd')) {
        nextFilters.brand = 'AMD';
      } else if (!isAll && ['nvidia', 'rtx', 'gtx'].some((token) => value.includes(token))) {
        nextFilters.brand = 'NVIDIA';
      } else if (!isAll) {
        appendCatalogAssistantMessage('No entendí la marca. Escribe NVIDIA, AMD o todas.');
        return true;
      }

      const found = await showCatalogResults(
        'GPU',
        nextFilters,
        `Encontré estas tarjetas ${nextFilters.brand ?? 'de video'} disponibles:`,
      );
      if (found) setGuidedSearch(null);
      return true;
    }

    if (guidedSearch.step === 'cpuBrand') {
      if (
        !isAll &&
        ['intel', 'core', 'i3', 'i5', 'i7', 'i9'].some((token) => value.includes(token))
      ) {
        nextFilters.brand = 'Intel';
      } else if (!isAll && ['amd', 'ryzen'].some((token) => value.includes(token))) {
        nextFilters.brand = 'AMD';
      } else if (!isAll) {
        appendCatalogAssistantMessage('No entendí la marca. Escribe Intel, AMD o todos.');
        return true;
      }

      const found = await showCatalogResults(
        'CPU',
        nextFilters,
        `Encontré estos procesadores ${nextFilters.brand ?? ''} disponibles:`,
      );
      if (found) setGuidedSearch(null);
      return true;
    }

    if (guidedSearch.step === 'ramType') {
      if (!isAll && value.includes('ddr4')) {
        nextFilters.memoryType = 'DDR4';
      } else if (!isAll && value.includes('ddr5')) {
        nextFilters.memoryType = 'DDR5';
      } else if (!isAll) {
        appendCatalogAssistantMessage('No entendí el tipo de RAM. Escribe DDR4, DDR5 o todas.');
        return true;
      }
      setGuidedSearch({ category: 'RAM', step: 'ramCapacity', filters: nextFilters });
      appendCatalogAssistantMessage('¿Qué capacidad buscas por módulo?');
      return true;
    }

    if (guidedSearch.step === 'ramCapacity') {
      const capacity = getFirstInteger(value);
      if (!isAll && [8, 16, 24, 32].includes(capacity)) {
        nextFilters.capacity = String(capacity);
      } else if (!isAll) {
        appendCatalogAssistantMessage(
          'No entendí la capacidad. Escribe 8 GB, 16 GB, 24 GB, 32 GB o todas.',
        );
        return true;
      }
      setGuidedSearch({ category: 'RAM', step: 'ramModules', filters: nextFilters });
      appendCatalogAssistantMessage('¿Prefieres 1 módulo, 2 módulos o 4 módulos?');
      return true;
    }

    if (guidedSearch.step === 'ramModules') {
      const modules = getFirstInteger(value);
      if (!isAll && [1, 2, 4].includes(modules)) {
        nextFilters.modules = String(modules);
      } else if (!isAll) {
        appendCatalogAssistantMessage('No entendí los módulos. Escribe 1, 2, 4 o todas.');
        return true;
      }
      const found = await showCatalogResults(
        'RAM',
        nextFilters,
        'Encontré estas memorias disponibles:',
      );
      if (found) setGuidedSearch(null);
      return true;
    }

    if (guidedSearch.step === 'motherboardPlatform') {
      if (value.includes('intel')) {
        setGuidedSearch({ category: 'MOTHERBOARD', step: 'motherboardSocket', filters: {} });
        appendCatalogAssistantMessage('¿Qué socket Intel necesitas?');
        return true;
      }
      if (value.includes('amd')) {
        setGuidedSearch({ category: 'MOTHERBOARD', step: 'motherboardSocket', filters: {} });
        appendCatalogAssistantMessage('¿Qué socket AMD necesitas?');
        return true;
      }
      setGuidedSearch(null);
      await showCatalogResults('MOTHERBOARD', {}, 'Encontré estas placas madre disponibles:');
      return true;
    }

    if (guidedSearch.step === 'motherboardSocket') {
      if (!isAll) nextFilters.socket = text.toUpperCase();
      setGuidedSearch(null);
      await showCatalogResults(
        'MOTHERBOARD',
        nextFilters,
        'Encontré estas placas madre disponibles:',
      );
      return true;
    }

    if (guidedSearch.step === 'storageType') {
      if (!isAll && value.includes('hdd')) {
        nextFilters.type = 'HDD';
      } else if (!isAll && value.includes('sata')) {
        nextFilters.type = 'SATA';
      } else if (!isAll && value.includes('nvme')) {
        nextFilters.type = 'NVMe';
      } else if (!isAll) {
        appendCatalogAssistantMessage('No entendí el tipo. Escribe NVMe, SATA, HDD o todos.');
        return true;
      }
      setGuidedSearch({ category: 'STORAGE', step: 'storageCapacity', filters: nextFilters });
      appendCatalogAssistantMessage('¿Qué capacidad buscas?');
      return true;
    }

    if (guidedSearch.step === 'storageCapacity') {
      const rawCapacity = getFirstInteger(value);
      if (!isAll && rawCapacity > 0) {
        nextFilters.capacity = String(value.includes('tb') ? rawCapacity * 1000 : rawCapacity);
      }
      setGuidedSearch(null);
      await showCatalogResults(
        'STORAGE',
        nextFilters,
        'Encontré estos almacenamientos disponibles:',
      );
      return true;
    }

    if (guidedSearch.step === 'psuWattage') {
      const wattage = getFirstInteger(value);
      if (!isAll && [500, 600, 650, 750, 850, 1000].includes(wattage)) {
        nextFilters.wattage = String(wattage);
      } else if (!isAll) {
        appendCatalogAssistantMessage(
          'No entendí la potencia. Escribe 500W, 600W, 650W, 750W, 850W, 1000W o todas.',
        );
        return true;
      }
      setGuidedSearch(null);
      await showCatalogResults('PSU', nextFilters, 'Encontré estas fuentes disponibles:');
      return true;
    }

    if (guidedSearch.step === 'caseFormFactor') {
      if (!isAll) nextFilters.formFactor = text;
      setGuidedSearch({ category: 'CASE', step: 'caseIncludesPsu', filters: nextFilters });
      appendCatalogAssistantMessage('¿Quieres que incluya fuente?');
      return true;
    }

    if (guidedSearch.step === 'caseIncludesPsu') {
      if (!value.includes('igual')) nextFilters.includesPsu = value.includes('si') ? 'yes' : 'no';
      setGuidedSearch(null);
      await showCatalogResults('CASE', nextFilters, 'Encontré estos gabinetes disponibles:');
      return true;
    }

    if (guidedSearch.step === 'coolerType') {
      if (!isAll) nextFilters.type = value.includes('liquida') ? 'Liquida' : 'Torre';
      if (nextFilters.type === 'Liquida') {
        setGuidedSearch({ category: 'COOLER', step: 'coolerRadiator', filters: nextFilters });
        appendCatalogAssistantMessage('¿Qué tamaño de radiador buscas?');
        return true;
      }
      setGuidedSearch(null);
      await showCatalogResults('COOLER', nextFilters, 'Encontré estos coolers disponibles:');
      return true;
    }

    if (guidedSearch.step === 'coolerRadiator') {
      const radiatorSize = getFirstInteger(value);
      if (!isAll && radiatorSize > 0) nextFilters.radiatorSize = String(radiatorSize);
      setGuidedSearch(null);
      await showCatalogResults(
        'COOLER',
        nextFilters,
        'Encontré estas refrigeraciones disponibles:',
      );
      return true;
    }

    return false;
  };

  const handleCatalogAssistant = async (text: string) => {
    const category = detectCatalogCategory(text);
    const startsNewSearch = /\b(busco|buscar|quiero|necesito|recomienda|recomiendame)\b/.test(
      normalizeText(text),
    );

    if (guidedSearch && category && startsNewSearch) {
      setGuidedSearch(null);
      if (isSpecificSearch(text)) {
        await showCatalogResults(category, {}, 'Encontré estas opciones disponibles:', text);
        return true;
      }
      startGuidedCatalogFlow(category);
      return true;
    }

    if (await continueGuidedCatalogFlow(text)) {
      return true;
    }

    if (!category) {
      return false;
    }

    if (isSpecificSearch(text)) {
      await showCatalogResults(category, {}, 'Encontré estas opciones disponibles:', text);
      return true;
    }

    startGuidedCatalogFlow(category);
    return true;
  };

  const sendMessage = async (userText: string) => {
    const trimmed = userText.trim();
    if (!trimmed || isLoading) {
      return;
    }

    const userMessage: ChatMessage = {
      id: nextMessageId('user'),
      text: trimmed,
      role: 'user',
    };

    const historyForBackend = messages.map((message) => ({
      role: message.role,
      content: message.text,
    }));

    setMessages((prev) => [...prev, userMessage]);
    setInput('');

    if (await handleCatalogAssistant(trimmed)) {
      return;
    }

    setIsLoading(true);

    activeRequestControllerRef.current?.abort();
    const controller = new AbortController();
    activeRequestControllerRef.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 5000);

    try {
      const res = await api.post(
        '/ai/chat',
        {
          message: trimmed,
          history: historyForBackend,
          conversationState,
        },
        { signal: controller.signal },
      );

      if (!isMountedRef.current) {
        return;
      }

      if (res.data?.aiAvailable === false || res.data?.success === false) {
        setIsAiAvailable(false);
        setMessages((prev) => [
          ...prev,
          {
            id: nextMessageId('assistant'),
            text:
              typeof res.data?.message === 'string' && res.data.message.trim()
                ? res.data.message
                : AI_UNAVAILABLE_REPLY,
            role: 'assistant',
          },
        ]);
        return;
      }

      setIsAiAvailable(true);

      const responseState = res.data?.conversationState ?? {};
      const nextState: ConversationState = {
        ...conversationState,
        ...responseState,
        mentionedProducts: Array.isArray(responseState.mentionedProducts)
          ? responseState.mentionedProducts
          : conversationState.mentionedProducts,
        lastRecommendedProducts: Object.prototype.hasOwnProperty.call(
          responseState,
          'lastRecommendedProducts',
        )
          ? normalizeRecommendedProducts(responseState.lastRecommendedProducts)
          : conversationState.lastRecommendedProducts,
        lastRecommendedBuild: Object.prototype.hasOwnProperty.call(
          responseState,
          'lastRecommendedBuild',
        )
          ? normalizeRecommendedProducts(responseState.lastRecommendedBuild)
          : conversationState.lastRecommendedBuild,
        lastFocusedProductId:
          typeof responseState.lastFocusedProductId === 'string'
            ? responseState.lastFocusedProductId
            : responseState.lastFocusedProductId === null
              ? null
              : conversationState.lastFocusedProductId,
        awaiting:
          typeof responseState.awaiting === 'string'
            ? responseState.awaiting
            : responseState.awaiting === null
              ? null
              : conversationState.awaiting,
      };

      if (res.data?.conversationState) {
        setConversationState(nextState);
      }

      const responseProducts = Array.isArray(res.data?.products) ? res.data.products : [];

      const botMessage: ChatMessage = {
        id: nextMessageId('assistant'),
        text:
          typeof res.data?.reply === 'string'
            ? res.data.reply
            : 'No pude procesar bien tu pedido. Intentemos con otra forma de decirlo.',
        role: 'assistant',
        products: responseProducts,
      };

      const actionMessages = handleBotActions(
        Array.isArray(res.data?.actions) ? res.data.actions : [],
        responseProducts,
        nextState,
      ).map<ChatMessage>((text) => ({
        id: nextMessageId('assistant'),
        text,
        role: 'assistant',
      }));

      setMessages((prev) => [...prev, botMessage, ...actionMessages]);
    } catch {
      if (controller.signal.aborted) {
        if (!isMountedRef.current) {
          return;
        }
      }

      if (!isMountedRef.current) {
        return;
      }

      setIsAiAvailable(false);
      setMessages((prev) => [
        ...prev,
        {
          id: nextMessageId('assistant'),
          text: AI_UNAVAILABLE_REPLY,
          role: 'assistant',
        },
      ]);
    } finally {
      window.clearTimeout(timeout);

      if (activeRequestControllerRef.current === controller) {
        activeRequestControllerRef.current = null;
      }

      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendMessage(input);
  };

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-[100] bg-brand-cyan text-gray-900 p-4 rounded-full shadow-2xl shadow-brand-cyan/40 hover:bg-cyan-400 hover:scale-110 transition-all duration-300 flex items-center justify-center"
        >
          <img src="/chatbot.png" alt="Abrir chatbot Alex" className="h-10 w-10 object-cover" />
        </button>
      )}

      {isOpen && (
        <div
          className="fixed bottom-6 right-6 z-[100] w-[350px] sm:w-[420px] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-gray-200 animate-fade-in-up"
          style={{ height: '580px', maxHeight: '85vh' }}
        >
          <div className="bg-[#1a1f2b] text-white p-4 flex justify-between items-center shadow-md z-10">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-brand-cyan">
                <img src="/chatbot.png" alt="Alex" className="h-full w-full object-cover" />
              </div>
              <div>
                <h3 className="font-bold text-sm tracking-wide">Alex</h3>
                <div
                  className={`flex items-center gap-2 text-[10px] font-medium ${
                    isAiAvailable ? 'text-green-400' : 'text-yellow-300'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`h-1.5 w-1.5 rounded-full ${
                      isAiAvailable ? 'animate-pulse bg-green-400' : 'bg-yellow-300'
                    }`}
                  />
                  <span>{isAiAvailable ? 'En linea' : 'Temporalmente fuera de linea'}</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <FiX size={24} />
            </button>
          </div>

          <div className="flex-1 p-4 overflow-y-auto bg-gray-50 space-y-4">
            <p className="text-center text-[10px] text-gray-400 font-medium uppercase tracking-widest my-2">
              Hoy
            </p>

            {messages.length === 1 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Prueba con algo como:
                </p>
                <div className="flex flex-wrap gap-2">
                  {STARTER_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => void sendMessage(prompt)}
                      className="text-left text-xs px-3 py-2 rounded-full bg-white border border-gray-200 text-gray-600 hover:border-brand-cyan hover:text-gray-900 transition"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'assistant' ? 'justify-start' : 'justify-end'}`}
              >
                <div className="max-w-[88%] space-y-2">
                  <div
                    className={`p-3.5 text-sm shadow-sm whitespace-pre-line ${
                      msg.role === 'assistant'
                        ? 'bg-white border border-gray-100 text-gray-800 rounded-2xl rounded-tl-sm'
                        : 'bg-brand-cyan text-gray-900 font-medium rounded-2xl rounded-tr-sm'
                    }`}
                  >
                    {msg.text}
                  </div>

                  {msg.role === 'assistant' && msg.products && msg.products.length > 0 ? (
                    <div className="space-y-2">
                      {msg.products.map((product) => (
                        <div
                          key={`${msg.id}-${product.id}`}
                          className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
                        >
                          <div className="flex gap-3 p-3">
                            <ChatProductImage src={product.imageUrl} alt={product.name} />
                            <div className="min-w-0 flex-1">
                              <p className="line-clamp-2 text-xs font-black text-gray-900">
                                {product.name}
                              </p>
                              <p className="mt-1 text-xs font-bold text-gray-700">
                                S/. {Number(product.price).toFixed(2)}
                              </p>
                              <p className="text-[11px] font-medium text-gray-500">
                                {product.stock > 0 ? `En stock: ${product.stock}` : 'Sin stock'}
                              </p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 border-t border-gray-100 text-center text-xs font-black">
                            <Link
                              href={product.productUrl}
                              className="px-3 py-2 text-brand-cyan hover:bg-cyan-50"
                            >
                              Ver producto
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleProductCardAdd(product)}
                              disabled={product.stock <= 0}
                              className="border-l border-gray-100 px-3 py-2 text-gray-800 hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400"
                            >
                              Agregar al carrito
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-100 p-4 rounded-2xl rounded-tl-sm flex gap-1.5 items-center shadow-sm">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                  <span
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0.15s' }}
                  ></span>
                  <span
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0.3s' }}
                  ></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 bg-white border-t border-gray-100">
            <form onSubmit={handleSend} className="flex gap-2 relative">
              <input
                type="text"
                className="flex-1 border-2 border-gray-200 rounded-xl pl-4 pr-12 py-3 text-sm outline-none focus:border-brand-cyan transition-colors"
                placeholder="Ej: tengo 3000 soles y quiero una PC gamer"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="absolute right-2 top-2 bottom-2 bg-[#1a1f2b] text-white px-3 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-all flex items-center justify-center"
              >
                <FiSend size={18} />
              </button>
            </form>
            <p className="text-center text-[10px] text-gray-400 mt-2">
              La recomendacion se basa en el catalogo y stock actual. Verifica el carrito antes de
              pagar.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
