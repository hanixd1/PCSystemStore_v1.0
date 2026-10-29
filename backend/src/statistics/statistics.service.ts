import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { buildAiServiceHeaders, getAiServiceUrl } from '../ai/ai-service-request';
import { PrismaService } from '../prisma/prisma.service';

type InventoryStatus = 'NORMAL' | 'LOW_STOCK' | 'OUT_OF_STOCK';
type AiMode = 'AI_SERVICE' | 'LOCAL_FALLBACK';
// Forecast risk is reported per category (forecastRisk), never as a product alert.
type StockAlertType = 'OUT_OF_STOCK' | 'LOW_STOCK';
type StockAlertStateStatus = 'ACTIVE' | 'REVIEWED' | 'DISMISSED';

interface InventoryProduct {
  id: string;
  name: string;
  category: string;
  price: Prisma.Decimal;
  isOnSale: boolean;
  salePrice: Prisma.Decimal | null;
  stock: number;
  cpuSpecs?: unknown;
  motherboardSpecs?: unknown;
  ramSpecs?: unknown;
  gpuSpecs?: unknown;
  psuSpecs?: unknown;
  caseSpecs?: unknown;
  storageSpecs?: unknown;
  monitorSpecs?: unknown;
  keyboardSpecs?: unknown;
  mouseSpecs?: unknown;
}

interface InventoryAlert {
  productId: string;
  alertType: StockAlertType;
  name: string;
  category: string;
  stock: number;
  status: InventoryStatus;
  risk: number | null;
  recommendation: string;
  alertState: StockAlertStateStatus;
}

interface DashboardRecommendation {
  type: 'REPLENISHMENT' | 'OUT_OF_STOCK' | 'LOW_STOCK' | 'DATA_QUALITY' | 'INFO';
  message: string;
}

/** Category-level stockout risk from the forecasting system (ai-service /forecast). */
interface CategoryForecastRisk {
  category: string;
  label: string;
  stock: number;
  forecastMedian: number;
  forecastP90: number;
  stockoutProbability: number;
  bound: 'within' | 'above' | 'below';
  coverageMonths: number | null;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  suggestedReorder: number;
}

interface ForecastCoverage {
  month: string;
  horizon: number;
  reliability: string;
  model: string;
  lastObservedMonth: string;
  items: CategoryForecastRisk[];
}

interface AiStatisticsResult {
  available: boolean;
  mode: AiMode;
  coverage: ForecastCoverage | null;
}

interface PersistedAlertState {
  productId: string;
  alertType: string;
  status: string;
}

const LOW_STOCK_THRESHOLD = 3;
/** Retired (soft-deleted) or deactivated products neither alert nor count as forecast stock. */
const INVENTORY_PRODUCT_WHERE = {
  deletedAt: null,
  isActive: true,
} satisfies Prisma.ProductWhereInput;
/**
 * Inventory dashboard call. The ai-service answers 503 at once while its startup warm-up runs
 * (Chronos, about 15 s), so this only bounds a slow network or a cold host.
 */
const DEFAULT_STOCK_COVERAGE_TIMEOUT_MS = 5000;
/** The first forecast request may load the Chronos weights (several seconds). */
const FORECAST_TIMEOUT_MS = 30000;
const FORECAST_UNAVAILABLE =
  'El sistema de pronostico no esta disponible. Verifica que el ai-service este activo.';

/** Spanish label of every product category (alerts and dashboards never show raw enums). */
export const CATEGORY_LABELS: Record<string, string> = {
  CPU: 'Procesador',
  MOTHERBOARD: 'Placa Madre',
  RAM: 'Memoria RAM',
  GPU: 'Tarjeta de Video',
  STORAGE: 'Almacenamiento',
  PSU: 'Fuente de Poder',
  CASE: 'Gabinete',
  COOLER: 'Refrigeracion',
  MONITOR: 'Monitor',
  KEYBOARD: 'Teclado',
  MOUSE: 'Mouse',
  HEADSET: 'Audifonos',
  MICROPHONE: 'Microfono',
  SPEAKER: 'Parlante',
  LAPTOP: 'Laptop',
  PC_DESKTOP: 'PC de Escritorio',
  SOFTWARE: 'Software / Licencia',
  MOUSEPAD: 'Mousepad',
  CHAIR: 'Silla Gamer',
  GAMING_DESK: 'Mesa Gamer',
  WEBCAM: 'Webcam',
  CAPTURE_CARD: 'Capturadora',
  CABLE_HUB: 'Cables y Hub',
  LAPTOP_COOLING_BASE: 'Base Refrigeradora',
  BACKPACK: 'Mochila',
  UPS: 'UPS',
  STABILIZER: 'Estabilizador',
  PROTECTION: 'Proteccion Electrica',
};

const TECHNICAL_SPECS_BY_CATEGORY: Record<string, keyof InventoryProduct> = {
  CPU: 'cpuSpecs',
  MOTHERBOARD: 'motherboardSpecs',
  RAM: 'ramSpecs',
  GPU: 'gpuSpecs',
  PSU: 'psuSpecs',
  CASE: 'caseSpecs',
  STORAGE: 'storageSpecs',
  MONITOR: 'monitorSpecs',
  KEYBOARD: 'keyboardSpecs',
  MOUSE: 'mouseSpecs',
};

@Injectable()
export class StatisticsService {
  private readonly logger = new Logger(StatisticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getInventoryDashboard() {
    try {
      const [totalProducts, products, persistedAlertStates] = await Promise.all([
        this.prisma.product.count({ where: INVENTORY_PRODUCT_WHERE }),
        this.prisma.product.findMany({
          where: INVENTORY_PRODUCT_WHERE,
          select: {
            id: true,
            name: true,
            category: true,
            price: true,
            isOnSale: true,
            salePrice: true,
            stock: true,
            cpuSpecs: { select: { id: true } },
            motherboardSpecs: { select: { id: true } },
            ramSpecs: { select: { id: true } },
            gpuSpecs: { select: { id: true } },
            psuSpecs: { select: { id: true } },
            caseSpecs: { select: { id: true } },
            storageSpecs: { select: { id: true } },
            monitorSpecs: { select: { id: true } },
            keyboardSpecs: { select: { id: true } },
            mouseSpecs: { select: { id: true } },
          },
          orderBy: [{ stock: 'asc' }, { updatedAt: 'desc' }],
        }),
        this.prisma.stockAlertState.findMany({
          where: { status: { in: ['REVIEWED', 'DISMISSED'] } },
          select: { productId: true, alertType: true, status: true },
        }),
      ]);
      const aiResult = await this.getCategoryRiskFromForecast(products);

      const alerts = this.buildAlerts(products, persistedAlertStates);
      const outOfStockProducts = products.filter((product) => product.stock === 0).length;
      const lowStockProducts = products.filter(
        (product) => product.stock > 0 && product.stock <= LOW_STOCK_THRESHOLD,
      ).length;
      const riskCategories = aiResult.coverage
        ? aiResult.coverage.items.filter((item) => ['HIGH', 'CRITICAL'].includes(item.riskLevel))
            .length
        : null;
      const estimatedInventoryValue = products.reduce(
        (total, product) => total + this.getEffectivePrice(product) * product.stock,
        0,
      );
      const incompleteTechnicalData = this.countProductsWithIncompleteTechnicalData(products);

      return {
        summary: {
          totalProducts,
          outOfStockProducts,
          lowStockProducts,
          riskCategories,
          riskAvailable: aiResult.mode === 'AI_SERVICE',
          estimatedInventoryValue: Number(estimatedInventoryValue.toFixed(2)),
        },
        alerts,
        forecastRisk: aiResult.coverage,
        recommendations: this.buildRecommendations({
          outOfStockProducts,
          lowStockProducts,
          riskCategories,
          forecastMonth: aiResult.coverage?.month ?? null,
          incompleteTechnicalData,
        }),
        aiStatus: {
          available: aiResult.available,
          mode: aiResult.mode,
          model: aiResult.coverage?.model ?? null,
          lastObservedMonth: aiResult.coverage?.lastObservedMonth ?? null,
          lastUpdated: new Date().toISOString(),
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error generando estadisticas de inventario: ${message}`);
      throw new InternalServerErrorException('No se pudo generar el dashboard de inventario.');
    }
  }

  /** Stock per web category against the category forecast of the forecasting system. */
  async getCategoryRiskFromForecast(products: InventoryProduct[]): Promise<AiStatisticsResult> {
    const stockByCategory = new Map<string, number>();
    for (const product of products) {
      stockByCategory.set(
        product.category,
        (stockByCategory.get(product.category) ?? 0) + Math.max(product.stock, 0),
      );
    }

    try {
      const coverage = await this.requestForecast<ForecastCoverage>(
        '/forecast/stock-coverage',
        {
          method: 'POST',
          body: JSON.stringify({
            categories: [...stockByCategory].map(([category, stock]) => ({ category, stock })),
          }),
        },
        this.getStockCoverageTimeoutMs(),
      );
      return { available: true, mode: 'AI_SERVICE', coverage };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Sistema de pronostico no disponible para estadisticas: ${message}`);
      return this.getLocalFallbackAiResult();
    }
  }

  private getStockCoverageTimeoutMs(): number {
    const configured = Number(process.env.FORECAST_COVERAGE_TIMEOUT_MS);
    return Number.isFinite(configured) && configured > 0
      ? configured
      : DEFAULT_STOCK_COVERAGE_TIMEOUT_MS;
  }

  getForecastOverview(): Promise<unknown> {
    return this.proxyForecast('/forecast/overview');
  }

  getMonthForecast(month?: string, threshold?: number): Promise<unknown> {
    const params = new URLSearchParams();
    if (month) {
      params.set('month', month);
    }
    if (threshold !== undefined) {
      params.set('threshold', String(threshold));
    }
    const query = params.toString();
    return this.proxyForecast(`/forecast/month${query ? `?${query}` : ''}`);
  }

  getForecastResearch(): Promise<unknown> {
    return this.proxyForecast('/forecast/research');
  }

  private async proxyForecast(path: string): Promise<unknown> {
    try {
      return await this.requestForecast<unknown>(path);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Sistema de pronostico no disponible (${path}): ${message}`);
      throw new ServiceUnavailableException(FORECAST_UNAVAILABLE);
    }
  }

  private async requestForecast<T>(
    path: string,
    init: RequestInit = {},
    timeoutMs = FORECAST_TIMEOUT_MS,
  ): Promise<T> {
    const aiServiceUrl = getAiServiceUrl();
    if (!aiServiceUrl) {
      throw new Error('AI_SERVICE_URL no configurado');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`${aiServiceUrl}${path}`, {
        ...init,
        signal: controller.signal,
        headers: buildAiServiceHeaders(),
      });
      if (response.status === 422) {
        const payload = (await response.json().catch(() => ({}))) as { detail?: unknown };
        throw new BadRequestException(
          typeof payload.detail === 'string'
            ? payload.detail
            : 'Parametros de pronostico invalidos.',
        );
      }
      if (!response.ok) {
        throw new Error(`ai-service respondio ${response.status}`);
      }
      return (await response.json()) as T;
    } finally {
      clearTimeout(timeout);
    }
  }

  private getLocalFallbackAiResult(): AiStatisticsResult {
    return {
      available: false,
      mode: 'LOCAL_FALLBACK',
      coverage: null,
    };
  }

  private buildAlerts(
    products: InventoryProduct[],
    persistedAlertStates: PersistedAlertState[],
  ): InventoryAlert[] {
    const hiddenAlerts = new Map(
      persistedAlertStates
        .filter((state) => ['REVIEWED', 'DISMISSED'].includes(state.status))
        .map((state) => [`${state.productId}:${state.alertType}`, state.status]),
    );
    const alerts: InventoryAlert[] = [];

    for (const product of products) {
      if (product.stock <= 0) {
        alerts.push(this.createAlert(product, 'OUT_OF_STOCK', 'OUT_OF_STOCK'));
      } else if (product.stock <= LOW_STOCK_THRESHOLD) {
        alerts.push(this.createAlert(product, 'LOW_STOCK', 'LOW_STOCK'));
      }
    }

    return alerts
      .filter((alert) => !hiddenAlerts.has(`${alert.productId}:${alert.alertType}`))
      .sort((left, right) => {
        const priority = this.getAlertPriority(right) - this.getAlertPriority(left);
        if (priority !== 0) {
          return priority;
        }
        return left.stock - right.stock;
      });
  }

  private createAlert(
    product: InventoryProduct,
    alertType: StockAlertType,
    status: InventoryStatus,
  ): InventoryAlert {
    return {
      productId: product.id,
      alertType,
      name: product.name,
      category: this.formatCategory(product.category),
      stock: product.stock,
      status,
      risk: null,
      recommendation: this.buildStockRecommendation(product.stock),
      alertState: 'ACTIVE',
    };
  }

  private getAlertPriority(alert: InventoryAlert): number {
    if (alert.alertType === 'OUT_OF_STOCK') {
      return 300;
    }
    if (alert.alertType === 'LOW_STOCK') {
      return 100;
    }
    return 0;
  }

  private buildStockRecommendation(stock: number): string {
    if (stock <= 0) {
      return 'Reponer urgente';
    }

    if (stock === 1) {
      return 'Reponer 5 unidades';
    }

    if (stock === 2 || stock === 3) {
      return 'Revisar reposicion';
    }

    return 'Sin accion inmediata';
  }

  private getEffectivePrice(product: InventoryProduct): number {
    const salePrice =
      product.isOnSale && product.salePrice ? Number(product.salePrice.toString()) : null;

    if (salePrice !== null && Number.isFinite(salePrice) && salePrice > 0) {
      return salePrice;
    }

    const price = Number(product.price.toString());
    return Number.isFinite(price) ? price : 0;
  }

  private countProductsWithIncompleteTechnicalData(products: InventoryProduct[]): number {
    return products.filter((product) => {
      const requiredSpec = TECHNICAL_SPECS_BY_CATEGORY[product.category];
      return Boolean(requiredSpec && !product[requiredSpec]);
    }).length;
  }

  private buildRecommendations(input: {
    outOfStockProducts: number;
    lowStockProducts: number;
    riskCategories: number | null;
    forecastMonth: string | null;
    incompleteTechnicalData: number;
  }): DashboardRecommendation[] {
    const recommendations: DashboardRecommendation[] = [];

    if (input.outOfStockProducts > 0) {
      recommendations.push({
        type: 'OUT_OF_STOCK',
        message: `Hay ${input.outOfStockProducts} productos sin stock. Prioriza reposicion urgente.`,
      });
    }

    if (input.lowStockProducts > 0) {
      recommendations.push({
        type: 'REPLENISHMENT',
        message: `Hay ${input.lowStockProducts} productos con stock bajo. Se recomienda revisar reposicion.`,
      });
    }

    if (input.riskCategories && input.riskCategories > 0) {
      recommendations.push({
        type: 'REPLENISHMENT',
        message: `Hay ${input.riskCategories} categorias con probabilidad alta de quiebre de stock en ${input.forecastMonth} segun el sistema de pronostico.`,
      });
    }

    if (input.riskCategories === null) {
      recommendations.push({
        type: 'INFO',
        message:
          'El riesgo predictivo requiere el sistema de pronostico del ai-service. El dashboard sigue usando analisis local operativo.',
      });
    }

    if (input.incompleteTechnicalData > 0) {
      recommendations.push({
        type: 'DATA_QUALITY',
        message: `${input.incompleteTechnicalData} productos tienen datos tecnicos incompletos. Completar fichas mejora recomendaciones y compatibilidad.`,
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        type: 'INFO',
        message: 'Inventario sin alertas criticas en el analisis local operativo.',
      });
    }

    return recommendations;
  }

  private formatCategory(category: string): string {
    return CATEGORY_LABELS[category] ?? category;
  }

  async updateStockAlertState(input: {
    productId: string;
    alertType: StockAlertType;
    status: StockAlertStateStatus;
    reviewedByUserId?: string;
    note?: string;
  }) {
    if (!['OUT_OF_STOCK', 'LOW_STOCK'].includes(input.alertType)) {
      throw new BadRequestException('Tipo de alerta invalido.');
    }

    if (!['REVIEWED', 'DISMISSED'].includes(input.status)) {
      throw new BadRequestException('Estado de alerta invalido.');
    }

    const product = await this.prisma.product.findUnique({
      where: { id: input.productId },
      select: { id: true },
    });

    if (!product) {
      throw new BadRequestException('Producto no encontrado.');
    }

    return this.prisma.stockAlertState.upsert({
      where: {
        productId_alertType: {
          productId: input.productId,
          alertType: input.alertType,
        },
      },
      create: {
        productId: input.productId,
        alertType: input.alertType,
        status: input.status,
        reviewedByUserId: input.reviewedByUserId,
        note: input.note,
      },
      update: {
        status: input.status,
        reviewedByUserId: input.reviewedByUserId,
        note: input.note,
      },
      select: {
        productId: true,
        alertType: true,
        status: true,
        updatedAt: true,
      },
    });
  }
}
