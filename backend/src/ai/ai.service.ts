import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { withPublicProductCriteria } from '../products/product-publication';
import { ProductPricingService } from '../products/services/product-pricing.service';
import { expandProductSearchQuery, rankProductMatch } from '../products/product-search';
import { buildAiServiceHeaders, getAiServiceUrl } from './ai-service-request';
import { isRefinementOnly, parseChatSearchQuery } from './chat-query';
import type { ChatSearchQuery } from './chat-query';

type ChatRole = 'user' | 'assistant';

interface ChatMessageInput {
  role: ChatRole;
  content: string;
}

interface ChatConversationState {
  intent?: string | null;
  budget?: number | null;
  usage?: string | null;
  includesPeripherals?: boolean | null;
  mentionedProducts?: string[];
  lastRecommendedProducts?: unknown[];
  lastRecommendedBuild?: unknown[];
  lastFocusedProductId?: string | null;
  awaiting?: string | null;
  lastSearchQuery?: string | null;
  anchorProductId?: string | null;
}

/** Product as sent to the ai-service. `attributes` lets it check build compatibility. */
interface ChatCatalogProduct {
  id: string;
  name: string;
  slug?: string;
  category: string;
  brand?: string;
  price: number;
  stock: number;
  imageUrl: string | null;
  productUrl: string;
  relevance?: number;
  attributes?: Record<string, string | number | null>;
}

interface ChatSearchContext extends ChatSearchQuery {
  categories: string[];
  matched: boolean;
}

interface CommercialChatResponse {
  reply: string;
  intent: string;
  conversationState: ChatConversationState;
  products: unknown[];
  status: 'ok' | 'degraded';
}

const AI_UNAVAILABLE_REPLY =
  'Buenas, por el momento Puchi no se encuentra disponible. Puedes revisar el catálogo o usar el armador de PCs mientras el servicio vuelve a estar operativo.';

const MAX_CHAT_MESSAGE_LENGTH = 500;
const AI_REQUEST_TIMEOUT_MS = 5000;
const SEARCH_CANDIDATE_LIMIT = 600;
const SEARCH_RESULT_LIMIT = 12;
/** Below this score a product only matched generic words (e.g. inside its description). */
const MIN_SEARCH_SCORE = 150;
const BUILD_CATEGORIES = ['CPU', 'MOTHERBOARD', 'RAM', 'GPU', 'STORAGE', 'PSU', 'CASE'];
const PERIPHERAL_CATEGORIES = ['MONITOR', 'KEYBOARD', 'MOUSE'];
const BUILD_WORDS =
  /\b(armar|arma|armalo|armala|armame|armarme|armado|ensamblar|pc|computadora|setup|torre completa)\b/;
/** "armalo con una pc", "arma una pc con esa grafica": build a PC around a chosen component. */
const BUILD_AROUND_VERB = /\b(arm(?:a|ar|alo|ala|ame|amelo|amela|arme)|ensambl\w*)\b/;
/** Words removed before looking up the component a build should be based on. */
const BUILD_AROUND_FILLER =
  /\b(arm\w*|ensambl\w*|pc|computadora|equipo|torre|completa|con|una|un|esa|ese|esta|este|eso|alrededor|de|la|el|me|lo|en|base|sobre)\b/g;
const PREVIOUS_PRODUCT_REFERENCE = /\b(esa|ese|esta|este|eso|la misma|el mismo)\b/;
/** Short brand answers ("nvidia", "amd") to a brand question are searched within that category. */
const BRAND_QUESTIONS: Record<string, { prefix: string; category: string }> = {
  cpu_brand: { prefix: 'procesador', category: 'CPU' },
  gpu_brand: { prefix: 'tarjeta de video', category: 'GPU' },
};
const NO_IGPU_MODEL = /\d{3,5}K?F\b/i;
const BUILD_AWAITING_STATES = new Set([
  'budget_and_usage',
  'budget',
  'usage',
  'peripherals',
  'build_adjust',
]);
/** Answers to the build questions ("solo la torre", "gaming", "3000") are not product searches. */
const BUILD_ANSWER =
  /\b(solo (la )?torre|sin (monitor|teclado|mouse|perifericos)|con (monitor|todo|perifericos)|todo completo|gam\w*|jug\w*|oficina|estudi\w*|edicion|edit\w*|diseno|render|stream\w*|soles?|\d+k?)\b/;

const CHAT_PRODUCT_INCLUDE = {
  cpuSpecs: true,
  motherboardSpecs: true,
  ramSpecs: true,
  gpuSpecs: true,
  psuSpecs: true,
  caseSpecs: true,
  coolerSpecs: true,
  storageSpecs: true,
  laptopSpecs: true,
  desktopSpecs: true,
  softwareSpecs: true,
  monitorSpecs: true,
  keyboardSpecs: true,
  mouseSpecs: true,
  mousepadSpecs: true,
  chairSpecs: true,
  gamingDeskSpecs: true,
  headsetSpecs: true,
  microphoneSpecs: true,
  speakerSpecs: true,
  webcamSpecs: true,
  captureCardSpecs: true,
  cableHubSpecs: true,
  laptopCoolingBaseSpecs: true,
  backpackSpecs: true,
  powerProtectionSpecs: true,
} satisfies Prisma.ProductInclude;

type ChatProductRecord = Prisma.ProductGetPayload<{ include: typeof CHAT_PRODUCT_INCLUDE }>;

function normalizeChatText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

const pricing = new ProductPricingService();

/** Price the customer pays: the sale price while an offer is active (same rule as the store). */
function effectivePrice(product: ChatProductRecord): number {
  return pricing.getEffectivePrice(product);
}

function findBrand(product: ChatProductRecord): string | undefined {
  for (const value of Object.values(product)) {
    if (value && typeof value === 'object' && 'brand' in value && value.brand) {
      return String(value.brand);
    }
  }
  return undefined;
}

/** Compatibility data the ai-service needs to assemble a coherent PC build. */
function buildAttributes(product: ChatProductRecord): ChatCatalogProduct['attributes'] {
  switch (product.category) {
    case 'CPU':
      return {
        socket: product.cpuSpecs?.socket ?? null,
        tdp: product.cpuSpecs?.tdp ?? null,
        // "F"/"KF" models (i5-12400F, Ryzen 5 8400F) never have integrated graphics,
        // even when the stored spec says otherwise.
        integratedGraphics:
          product.cpuSpecs?.integratedGraphics && !NO_IGPU_MODEL.test(product.name) ? 1 : 0,
      };
    case 'MOTHERBOARD':
      return {
        socket: product.motherboardSpecs?.socket ?? null,
        memoryType: product.motherboardSpecs?.memoryType ?? null,
        formFactor: product.motherboardSpecs?.formFactor ?? null,
      };
    case 'RAM':
      return { memoryType: product.ramSpecs?.memoryType ?? null };
    case 'GPU':
      return { powerWatts: product.gpuSpecs?.gpuPowerWatts ?? null };
    case 'PSU':
      return { wattage: product.psuSpecs?.wattage ?? null };
    default:
      return undefined;
  }
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(private prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // Customer chat
  // ---------------------------------------------------------------------------

  private toCatalogProduct(product: ChatProductRecord, relevance?: number): ChatCatalogProduct {
    const images = Array.isArray(product.images) ? product.images : [];
    const firstImage = typeof images[0] === 'string' ? images[0].trim() : '';
    return {
      id: product.id,
      name: product.name,
      slug: product.slug ?? undefined,
      category: product.category,
      brand: findBrand(product),
      price: effectivePrice(product),
      stock: product.stock,
      imageUrl: firstImage || null,
      productUrl: `/producto/${product.slug || product.id}`,
      relevance,
      attributes: buildAttributes(product),
    };
  }

  private isBuildRequest(normalizedMessage: string, state?: ChatConversationState) {
    if (BUILD_WORDS.test(normalizedMessage)) {
      return true;
    }
    return (
      ['pc_build', 'budget_pc_build'].includes(state?.intent ?? '') && Boolean(state?.awaiting)
    );
  }

  private async getBuildCatalog(): Promise<ChatCatalogProduct[]> {
    const products = await this.prisma.product.findMany({
      where: withPublicProductCriteria({
        category: { in: [...BUILD_CATEGORIES, ...PERIPHERAL_CATEGORIES] },
        stock: { gt: 0 },
      }),
      include: CHAT_PRODUCT_INCLUDE,
      orderBy: [{ price: 'asc' }],
      take: SEARCH_CANDIDATE_LIMIT,
    });
    return products.map((product) => this.toCatalogProduct(product));
  }

  /**
   * Ranks the public catalog with the same engine as the store search bar, so the chatbot
   * understands categories, brands, specs and synonyms, then applies price constraints.
   */
  private async searchChatCatalog(
    message: string,
    state?: ChatConversationState,
  ): Promise<{ catalog: ChatCatalogProduct[]; search: ChatSearchContext }> {
    const parsed = parseChatSearchQuery(message);
    let text = parsed.text;
    // "y mas barato?" / "hasta 800" refine the previous search.
    const brandQuestion = BRAND_QUESTIONS[state?.awaiting ?? ''];
    if (isRefinementOnly(parsed) && typeof state?.lastSearchQuery === 'string') {
      // Same bound as the message: the state comes from the client (ChatDto also limits it).
      text = state.lastSearchQuery.slice(0, MAX_CHAT_MESSAGE_LENGTH);
    } else if (brandQuestion) {
      // "nvidia" answers the brand question; "mejor un mouse" starts a new search.
      const named = expandProductSearchQuery(text).candidateCategories;
      if (!named.length || named.includes(brandQuestion.category)) {
        text = `${brandQuestion.prefix} ${text}`.trim();
      }
    }

    const expansion = expandProductSearchQuery(text);
    const search: ChatSearchContext = {
      ...parsed,
      text,
      categories: expansion.candidateCategories,
      matched: false,
    };
    if (!text) {
      return { catalog: [], search };
    }

    const candidates = await this.prisma.product.findMany({
      where: withPublicProductCriteria(
        expansion.candidateCategories.length
          ? { category: { in: expansion.candidateCategories } }
          : {},
      ),
      include: CHAT_PRODUCT_INCLUDE,
      take: SEARCH_CANDIDATE_LIMIT,
    });

    const inPriceRange = (price: number) =>
      (search.maxPrice === null || price <= search.maxPrice) &&
      (search.minPrice === null || price >= search.minPrice);

    const ranked = candidates
      .map((product) => ({ product, score: rankProductMatch(product, expansion) }))
      .filter((entry) => entry.score >= MIN_SEARCH_SCORE);
    search.matched = ranked.length > 0;

    const sorted = ranked
      .filter((entry) => inPriceRange(effectivePrice(entry.product)))
      .sort((left, right) => {
        const stockOrder = Number(right.product.stock > 0) - Number(left.product.stock > 0);
        if (stockOrder) {
          return stockOrder;
        }
        const priceDiff = effectivePrice(left.product) - effectivePrice(right.product);
        if (search.sort === 'cheapest') {
          return priceDiff;
        }
        if (search.sort === 'premium') {
          return -priceDiff;
        }
        return right.score - left.score || priceDiff;
      });

    // Nothing within budget: still send the closest matches so the reply can say so.
    const results = sorted.length
      ? sorted
      : ranked.sort((left, right) => effectivePrice(left.product) - effectivePrice(right.product));

    return {
      catalog: results
        .slice(0, SEARCH_RESULT_LIMIT)
        .map(({ product, score }) => this.toCatalogProduct(product, score)),
      search,
    };
  }

  private async findCatalogProduct(id: string): Promise<ChatCatalogProduct | null> {
    const product = await this.prisma.product.findFirst({
      where: withPublicProductCriteria({ id }),
      include: CHAT_PRODUCT_INCLUDE,
    });
    return product ? this.toCatalogProduct(product) : null;
  }

  /**
   * Component a requested build should be based on: the part named in the message
   * ("esa rtx 5050 gigabyte, armalo con una pc") or the one the customer was looking at ("armame una pc con esa").
   */
  private async resolveBuildAnchor(
    message: string,
    state?: ChatConversationState,
  ): Promise<ChatCatalogProduct | null> {
    const normalized = normalizeChatText(message);
    if (!BUILD_AROUND_VERB.test(normalized)) {
      return null;
    }

    const productText = normalized.replace(BUILD_AROUND_FILLER, ' ').replace(/\s+/g, ' ').trim();
    if (productText) {
      const { catalog, search } = await this.searchChatCatalog(productText);
      const top = catalog[0];
      const namesOnlyBuildParts =
        search.categories.length > 0 &&
        search.categories.every((category) => BUILD_CATEGORIES.includes(category));
      if (
        top &&
        search.matched &&
        namesOnlyBuildParts &&
        search.categories.includes(top.category)
      ) {
        return top;
      }
    }

    if (!PREVIOUS_PRODUCT_REFERENCE.test(normalized)) {
      return null;
    }
    const remembered = (
      Array.isArray(state?.lastRecommendedProducts) ? state.lastRecommendedProducts : []
    ) as Array<{
      id?: string;
      category?: string;
    }>;
    const previousId =
      state?.lastFocusedProductId ??
      remembered.find((product) => BUILD_CATEGORIES.includes(product.category ?? ''))?.id;
    const previous = previousId ? await this.findCatalogProduct(previousId) : null;
    return previous && BUILD_CATEGORIES.includes(previous.category) ? previous : null;
  }

  /** Build catalog that is guaranteed to contain the component the build is based on. */
  private async getBuildCatalogWith(anchorId?: string | null, anchor?: ChatCatalogProduct | null) {
    const catalog = await this.getBuildCatalog();
    if (anchorId && !catalog.some((product) => product.id === anchorId)) {
      const product = anchor ?? (await this.findCatalogProduct(anchorId));
      if (product) {
        catalog.push(product);
      }
    }
    return catalog;
  }

  private async requestCommercialChat(
    message: string,
    conversationState?: ChatConversationState,
  ): Promise<CommercialChatResponse> {
    const anchor = await this.resolveBuildAnchor(message, conversationState);
    if (anchor) {
      const catalog = await this.getBuildCatalogWith(anchor.id, anchor);
      try {
        return await this.postToAiService({
          message,
          conversationState,
          catalog,
          search: null,
          anchorProductId: anchor.id,
        });
      } catch (error: unknown) {
        const reason = error instanceof Error ? error.message : String(error);
        this.logger.warn(`[AI] Servicio no disponible: ${reason}`);
        return this.buildAiUnavailableResponse(conversationState);
      }
    }

    const searchResult = await this.searchChatCatalog(message, conversationState);
    let catalog = searchResult.catalog;
    let search: ChatSearchContext | null = searchResult.search;
    // "fuente para pc" is a product search; "pc gamer de 3000 soles" is a build request.
    // Build requests are sent without search context, which is how the ai-service tells them apart.
    const namesComponent = search.categories.some((category) => category !== 'PC_DESKTOP');
    const answersBuildQuestion =
      BUILD_AWAITING_STATES.has(conversationState?.awaiting ?? '') &&
      BUILD_ANSWER.test(normalizeChatText(message));
    if (
      answersBuildQuestion ||
      (!namesComponent && this.isBuildRequest(search.text, conversationState))
    ) {
      catalog = await this.getBuildCatalogWith(conversationState?.anchorProductId);
      search = null;
    }

    try {
      return await this.postToAiService({ message, conversationState, catalog, search });
    } catch (error: unknown) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.warn(`[AI] Servicio no disponible: ${reason}`);
      // Product searches do not need the ai-service: answer them with the ranked catalog.
      if (search?.matched && catalog.length > 0) {
        return this.buildLocalSearchResponse(catalog, search, conversationState);
      }
      return this.buildAiUnavailableResponse(conversationState);
    }
  }

  private async postToAiService(body: unknown): Promise<CommercialChatResponse> {
    const aiServiceUrl = getAiServiceUrl();
    if (!aiServiceUrl) {
      throw new Error('AI_SERVICE_URL no configurado');
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(`${aiServiceUrl}/chat`, {
        method: 'POST',
        headers: buildAiServiceHeaders(),
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`AI chat respondio ${response.status}`);
      }
      return (await response.json()) as CommercialChatResponse;
    } finally {
      clearTimeout(timeout);
    }
  }

  private buildLocalSearchResponse(
    catalog: ChatCatalogProduct[],
    search: ChatSearchContext,
    conversationState?: ChatConversationState,
  ): CommercialChatResponse {
    const products = catalog.slice(0, 4).map((product) => ({
      id: product.id,
      name: product.name,
      category: product.category,
      price: product.price,
      stock: product.stock,
      imageUrl: product.imageUrl,
      productUrl: product.productUrl,
    }));
    const lines = products
      .slice(0, 3)
      .map(
        (product) =>
          `- ${product.name}: S/. ${product.price.toFixed(2)} (${product.stock > 0 ? 'en stock' : 'sin stock'})`,
      )
      .join('\n');
    return {
      reply: `Encontre estas opciones en la tienda:\n${lines}`,
      intent: 'product_search',
      conversationState: {
        ...conversationState,
        intent: 'product_search',
        awaiting: null,
        lastSearchQuery: search.text,
        lastRecommendedProducts: products,
        lastRecommendedBuild: [],
        lastFocusedProductId: products.length === 1 ? products[0].id : null,
      },
      products,
      status: 'ok',
    };
  }

  private buildAiUnavailableResponse(conversationState?: ChatConversationState) {
    return {
      success: false,
      aiAvailable: false,
      message: AI_UNAVAILABLE_REPLY,
      reply: AI_UNAVAILABLE_REPLY,
      intent: conversationState?.intent ?? 'unknown',
      conversationState: conversationState ?? {
        intent: null,
        budget: null,
        usage: null,
        includesPeripherals: null,
        mentionedProducts: [],
      },
      products: [],
      actions: [],
      totals: null,
      status: 'degraded' as const,
    };
  }

  async processCustomerChat(
    userMessage: string,
    _history: ChatMessageInput[] = [],
    conversationState?: ChatConversationState,
  ): Promise<unknown> {
    const cleanMessage = userMessage.slice(0, MAX_CHAT_MESSAGE_LENGTH).trim();

    if (!cleanMessage) {
      return {
        reply:
          'Hola, soy Puchi. Puedo ayudarte a encontrar productos o armar una PC segun tu presupuesto.',
        products: [],
        actions: [],
        totals: null,
        status: 'ok',
        conversationState: conversationState ?? {
          intent: null,
          budget: null,
          usage: null,
          includesPeripherals: null,
          mentionedProducts: [],
        },
      };
    }

    try {
      const response = await this.requestCommercialChat(cleanMessage, conversationState);
      return response.status === 'degraded'
        ? this.buildAiUnavailableResponse(conversationState)
        : response;
    } catch (error: unknown) {
      // Catalog lookup failed (e.g. database unavailable).
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`[AI] Chat no disponible: ${message}`);
      return this.buildAiUnavailableResponse(conversationState);
    }
  }
}
