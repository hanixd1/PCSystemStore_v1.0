import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { withPublicProductCriteria } from '../products/product-publication';
import { expandProductSearchQuery, rankProductMatch } from '../products/product-search';
import { isRefinementOnly, parseChatSearchQuery } from './chat-query';
import type { ChatSearchQuery } from './chat-query';

type ChatRole = 'user' | 'assistant';

interface ChatMessageInput {
  role: ChatRole;
  content: string;
}

interface AiProductInput {
  id: string;
  name: string;
  price: number;
  stock: number;
  category?: string;
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

interface AiPrediction {
  id: string;
  nombre: string;
  stock: number;
  estado: string;
  mensaje_cliente: string;
  alerta_admin: string;
  dias_restantes_estimados?: number;
}

interface AiServicePrediction {
  productId: string;
  productName: string;
  risk: 'low' | 'medium' | 'high' | 'critical';
  probability: number;
  message: string;
  recommendedReorder: number;
}

const AI_UNAVAILABLE_REPLY =
  'Buenas, por el momento Alex no se encuentra disponible. Puedes revisar el catálogo o usar el armador de PCs mientras el servicio vuelve a estar operativo.';

const MAX_CHAT_MESSAGE_LENGTH = 500;
const AI_REQUEST_TIMEOUT_MS = 5000;
const SEARCH_CANDIDATE_LIMIT = 600;
const SEARCH_RESULT_LIMIT = 12;
/** Below this score a product only matched generic words (e.g. inside its description). */
const MIN_SEARCH_SCORE = 150;
const BUILD_CATEGORIES = ['CPU', 'MOTHERBOARD', 'RAM', 'GPU', 'STORAGE', 'PSU', 'CASE'];
const PERIPHERAL_CATEGORIES = ['MONITOR', 'KEYBOARD', 'MOUSE'];
const BUILD_WORDS = /\b(armar|arma|armado|ensamblar|pc|computadora|setup|torre completa)\b/;
const NO_IGPU_MODEL = /\d{3,5}K?F\b/i;
const BUILD_AWAITING_STATES = new Set(['budget_and_usage', 'budget', 'usage', 'peripherals']);
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

function toNumber(value: Prisma.Decimal | number | string | null | undefined): number {
  const parsed = Number(value?.toString() ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
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

  private getAiServiceUrl(): string {
    return process.env.AI_SERVICE_URL?.trim().replace(/\/$/, '') || '';
  }

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
      price: toNumber(product.price),
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
    if (isRefinementOnly(parsed) && state?.lastSearchQuery) {
      text = state.lastSearchQuery;
    } else if (state?.awaiting === 'cpu_brand') {
      text = `procesador ${text}`.trim();
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
      .filter((entry) => inPriceRange(toNumber(entry.product.price)))
      .sort((left, right) => {
        const stockOrder = Number(right.product.stock > 0) - Number(left.product.stock > 0);
        if (stockOrder) {
          return stockOrder;
        }
        const priceDiff = toNumber(left.product.price) - toNumber(right.product.price);
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
      : ranked.sort((left, right) => toNumber(left.product.price) - toNumber(right.product.price));

    return {
      catalog: results
        .slice(0, SEARCH_RESULT_LIMIT)
        .map(({ product, score }) => this.toCatalogProduct(product, score)),
      search,
    };
  }

  private async requestCommercialChat(
    message: string,
    conversationState?: ChatConversationState,
  ): Promise<CommercialChatResponse> {
    const searchResult = await this.searchChatCatalog(message, conversationState);
    let catalog = searchResult.catalog;
    let search: ChatSearchContext | null = searchResult.search;
    // "fuente para pc" is a product search; "pc gamer de 3000 soles" is a build request.
    // Build requests are sent without search context, which is how the ai-service tells them apart.
    const namesComponent = search.categories.some((category) => category !== 'PC_DESKTOP');
    const answersBuildQuestion =
      BUILD_AWAITING_STATES.has(conversationState?.awaiting ?? '') &&
      BUILD_ANSWER.test(
        message
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, ''),
      );
    if (
      answersBuildQuestion ||
      (!namesComponent && this.isBuildRequest(search.text, conversationState))
    ) {
      catalog = await this.getBuildCatalog();
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
    const aiServiceUrl = this.getAiServiceUrl();
    if (!aiServiceUrl) {
      throw new Error('AI_SERVICE_URL no configurado');
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(`${aiServiceUrl}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
          'Hola, soy Alex. Puedo ayudarte a encontrar productos o armar una PC segun tu presupuesto.',
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

  // ---------------------------------------------------------------------------
  // Admin stock predictions
  // ---------------------------------------------------------------------------

  private mapRiskToEstado(risk: AiServicePrediction['risk']) {
    const mapping: Record<AiServicePrediction['risk'], string> = {
      low: 'BAJO',
      medium: 'MEDIO',
      high: 'ALTO',
      critical: 'CRITICO',
    };
    return mapping[risk] ?? 'DESCONOCIDO';
  }

  private mapAiServicePrediction(
    prediction: AiServicePrediction,
    productById: Map<string, AiProductInput>,
  ): AiPrediction {
    const product = productById.get(prediction.productId);
    return {
      id: prediction.productId,
      nombre: prediction.productName,
      stock: product?.stock ?? 0,
      estado: this.mapRiskToEstado(prediction.risk),
      mensaje_cliente: prediction.message,
      alerta_admin: `${prediction.message} Reposicion sugerida: ${prediction.recommendedReorder}.`,
      dias_restantes_estimados:
        prediction.recommendedReorder > 0
          ? Math.max(
              1,
              Math.round((product?.stock ?? 0) / Math.max(1, prediction.recommendedReorder)),
            )
          : undefined,
    };
  }

  private async requestStockPredictions(products: AiProductInput[]): Promise<AiPrediction[]> {
    const aiServiceUrl = this.getAiServiceUrl();
    if (!aiServiceUrl) {
      this.logger.warn('AI_SERVICE_URL no configurado. Se omiten predicciones IA.');
      return [];
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(`${aiServiceUrl}/predict-stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products: products.map((product) => ({
            id: product.id,
            name: product.name,
            category: product.category ?? 'GENERAL',
            stock: product.stock,
            price: product.price,
            monthlySales: 0,
          })),
        }),
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`AI service respondio ${response.status}`);
      }

      const payload = (await response.json()) as { predictions?: AiServicePrediction[] };
      const productById = new Map(products.map((product) => [product.id, product]));
      return Array.isArray(payload.predictions)
        ? payload.predictions.map((prediction) =>
            this.mapAiServicePrediction(prediction, productById),
          )
        : [];
    } finally {
      clearTimeout(timeout);
    }
  }

  async getAiPredictions() {
    try {
      const products = await this.prisma.product.findMany({
        where: withPublicProductCriteria(),
        select: { id: true, name: true, price: true, stock: true, category: true },
        take: 10,
        orderBy: [{ stock: 'asc' }, { updatedAt: 'desc' }],
      });
      if (products.length === 0) {
        return [];
      }
      return await this.requestStockPredictions(
        products.map((product) => ({ ...product, price: toNumber(product.price) })),
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.warn(`AI service no disponible. Se aplica degradacion segura: ${errorMessage}`);
      return [];
    }
  }
}
