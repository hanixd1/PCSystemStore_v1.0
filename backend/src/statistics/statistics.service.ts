import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type InventoryStatus =
  | 'NORMAL'
  | 'LOW_STOCK'
  | 'OUT_OF_STOCK'
  | 'BREAK_RISK'
  | 'PREDICTIVE_RISK';
type AiMode = 'AI_SERVICE' | 'LOCAL_FALLBACK';
type StockAlertType = 'OUT_OF_STOCK' | 'LOW_STOCK' | 'PREDICTIVE_RISK';
type StockAlertStateStatus = 'ACTIVE' | 'REVIEWED' | 'DISMISSED';
type AiRiskLevel = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
type AiRiskStatus = 'NORMAL' | 'WATCH' | 'RISK' | 'CRITICAL';

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
  riskLevel?: AiRiskLevel;
  estimatedDaysToStockout?: number | null;
  recommendedQuantity?: number;
  reasons?: string[];
  alertState: StockAlertStateStatus;
}

interface DashboardRecommendation {
  type: 'REPLENISHMENT' | 'OUT_OF_STOCK' | 'LOW_STOCK' | 'DATA_QUALITY' | 'INFO';
  message: string;
}

interface AiRiskProduct {
  productId?: string;
  name?: string;
  riskScore?: number;
  riskLevel?: AiRiskLevel;
  status?: AiRiskStatus;
  estimatedDaysToStockout?: number | null;
  recommendedAction?: string;
  recommendedQuantity?: number;
  reasons?: string[];
}

interface AiStockPredictionResponse {
  mode?: string;
  generatedAt?: string;
  summary?: {
    totalProducts?: number;
    riskProducts?: number;
    criticalProducts?: number;
    insufficientDataProducts?: number;
  };
  items?: AiRiskProduct[];
}

interface AiStatisticsResult {
  available: boolean;
  mode: AiMode;
  riskByProductId: Map<string, AiRiskProduct>;
}

interface PersistedAlertState {
  productId: string;
  alertType: string;
  status: string;
}

interface ProductSalesSummary {
  productId: string;
  _sum: {
    quantity: number | null;
  };
}

const LOW_STOCK_THRESHOLD = 3;
const AI_SERVICE_TIMEOUT_MS = 2500;

const CATEGORY_LABELS: Record<string, string> = {
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
      const sevenDaysAgo = this.getDateDaysAgo(7);
      const thirtyDaysAgo = this.getDateDaysAgo(30);

      const [
        totalProducts,
        products,
        salesLast7Days,
        salesLast30Days,
        persistedAlertStates,
      ] = await Promise.all([
        this.prisma.product.count(),
        this.prisma.product.findMany({
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
        this.prisma.orderItem.groupBy({
          by: ['productId'],
          where: {
            order: {
              status: 'PAID',
              paidAt: { gte: sevenDaysAgo },
            },
          },
          _sum: { quantity: true },
        }),
        this.prisma.orderItem.groupBy({
          by: ['productId'],
          where: {
            order: {
              status: 'PAID',
              paidAt: { gte: thirtyDaysAgo },
            },
          },
          _sum: { quantity: true },
        }),
        this.prisma.stockAlertState.findMany({
          where: { status: { in: ['REVIEWED', 'DISMISSED'] } },
          select: { productId: true, alertType: true, status: true },
        }),
      ]);
      const salesLast7DaysByProduct = this.buildSalesMap(salesLast7Days);
      const salesLast30DaysByProduct = this.buildSalesMap(salesLast30Days);
      const aiResult = await this.getStockStatisticsFromAi(products, {
        salesLast7DaysByProduct,
        salesLast30DaysByProduct,
      });

      const alerts = this.buildAlerts(products, aiResult, persistedAlertStates);
      const outOfStockProducts = products.filter((product) => product.stock === 0).length;
      const lowStockProducts = products.filter(
        (product) => product.stock > 0 && product.stock <= LOW_STOCK_THRESHOLD,
      ).length;
      const predictiveRiskProducts =
        aiResult.mode === 'AI_SERVICE'
          ? products.filter(
              (product) => product.stock > 0 && aiResult.riskByProductId.has(product.id),
            ).length
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
          riskProducts: predictiveRiskProducts,
          riskAvailable: aiResult.mode === 'AI_SERVICE',
          estimatedInventoryValue: Number(estimatedInventoryValue.toFixed(2)),
        },
        alerts,
        recommendations: this.buildRecommendations({
          outOfStockProducts,
          lowStockProducts,
          predictiveRiskProducts,
          incompleteTechnicalData,
        }),
        aiStatus: {
          available: aiResult.available,
          mode: aiResult.mode,
          lastUpdated: new Date().toISOString(),
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error generando estadisticas de inventario: ${message}`);
      throw new InternalServerErrorException('No se pudo generar el dashboard de inventario.');
    }
  }

  async getStockStatisticsFromAi(
    products: InventoryProduct[],
    sales: {
      salesLast7DaysByProduct: Map<string, number>;
      salesLast30DaysByProduct: Map<string, number>;
    },
  ): Promise<AiStatisticsResult> {
    const aiServiceUrl = process.env.AI_SERVICE_URL?.trim().replace(/\/$/, '');

    if (!aiServiceUrl) {
      return this.getLocalFallbackAiResult();
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), AI_SERVICE_TIMEOUT_MS);

    try {
      const response = await fetch(`${aiServiceUrl}/stock-prediction/batch-risk-score`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          products: products.map((product) => {
            const ventasUltimos7Dias = sales.salesLast7DaysByProduct.get(product.id);
            const ventasUltimos30Dias = sales.salesLast30DaysByProduct.get(product.id);

            return {
              productId: product.id,
              name: product.name,
              category: product.category,
              productType: this.formatCategory(product.category),
              stockActual: product.stock,
              precio: this.getEffectivePrice(product),
              ...(ventasUltimos7Dias !== undefined ? { ventasUltimos7Dias } : {}),
              ...(ventasUltimos30Dias !== undefined ? { ventasUltimos30Dias } : {}),
              diasReposicionEstimados: 7,
              umbralStockBajo: LOW_STOCK_THRESHOLD,
            };
          }),
          config: {
            defaultLowStockThreshold: LOW_STOCK_THRESHOLD,
            defaultLeadTimeDays: 7,
            riskThreshold: 70,
            criticalThreshold: 90,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`ai-service respondio ${response.status}`);
      }

      const payload = (await response.json()) as AiStockPredictionResponse;
      const riskByProductId = new Map<string, AiRiskProduct>();

      for (const riskProduct of payload.items ?? []) {
        const productId = riskProduct.productId;
        if (productId && this.isPredictiveRisk(riskProduct)) {
          riskByProductId.set(productId, riskProduct);
        }
      }

      return {
        available: true,
        mode: 'AI_SERVICE',
        riskByProductId,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`ai-service no disponible para estadisticas: ${message}`);
      return this.getLocalFallbackAiResult();
    } finally {
      clearTimeout(timeout);
    }
  }

  private getLocalFallbackAiResult(): AiStatisticsResult {
    return {
      available: false,
      mode: 'LOCAL_FALLBACK',
      riskByProductId: new Map(),
    };
  }

  private buildAlerts(
    products: InventoryProduct[],
    aiResult: AiStatisticsResult,
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
        alerts.push(this.createAlert(product, 'OUT_OF_STOCK', 'OUT_OF_STOCK', null));
      } else if (product.stock <= LOW_STOCK_THRESHOLD) {
        alerts.push(this.createAlert(product, 'LOW_STOCK', 'LOW_STOCK', null));
      }

      if (aiResult.mode === 'AI_SERVICE') {
        const aiRisk = aiResult.riskByProductId.get(product.id);
        const risk = this.normalizeRisk(aiRisk?.riskScore);

        if (aiRisk && product.stock > 0) {
          alerts.push(
            this.createAlert(
              product,
              'PREDICTIVE_RISK',
              'PREDICTIVE_RISK',
              risk,
              aiRisk.recommendedAction,
              {
                riskLevel: aiRisk.riskLevel,
                estimatedDaysToStockout: aiRisk.estimatedDaysToStockout,
                recommendedQuantity: aiRisk.recommendedQuantity,
                reasons: aiRisk.reasons,
              },
            ),
          );
        }
      }
    }

    return alerts
      .filter((alert) => !hiddenAlerts.has(`${alert.productId}:${alert.alertType}`))
      .sort((left, right) => {
        const priority = this.getAlertPriority(right) - this.getAlertPriority(left);
        if (priority !== 0) return priority;
        return left.stock - right.stock;
      });
  }

  private createAlert(
    product: InventoryProduct,
    alertType: StockAlertType,
    status: InventoryStatus,
    risk: number | null,
    recommendation?: string,
    aiDetails?: {
      riskLevel?: AiRiskLevel;
      estimatedDaysToStockout?: number | null;
      recommendedQuantity?: number;
      reasons?: string[];
    },
  ): InventoryAlert {
    return {
      productId: product.id,
      alertType,
      name: product.name,
      category: this.formatCategory(product.category),
      stock: product.stock,
      status,
      risk,
      recommendation:
        recommendation?.trim() || this.buildStockRecommendation(product.stock, alertType),
      riskLevel: aiDetails?.riskLevel,
      estimatedDaysToStockout: aiDetails?.estimatedDaysToStockout,
      recommendedQuantity: aiDetails?.recommendedQuantity,
      reasons: aiDetails?.reasons,
      alertState: 'ACTIVE',
    };
  }

  private normalizeRisk(value: unknown): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return 0;
    }

    return Math.max(0, Math.min(100, Math.round(parsed)));
  }

  private getAlertPriority(alert: InventoryAlert): number {
    if (alert.alertType === 'OUT_OF_STOCK') return 300;
    if (alert.alertType === 'PREDICTIVE_RISK') return 200 + (alert.risk ?? 0);
    if (alert.alertType === 'LOW_STOCK') return 100;
    return 0;
  }

  private buildStockRecommendation(stock: number, alertType?: StockAlertType): string {
    if (alertType === 'PREDICTIVE_RISK') {
      return 'Revisar riesgo predictivo';
    }

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
    predictiveRiskProducts: number | null;
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

    if (input.predictiveRiskProducts && input.predictiveRiskProducts > 0) {
      recommendations.push({
        type: 'REPLENISHMENT',
        message: `Hay ${input.predictiveRiskProducts} productos con riesgo predictivo de quiebre segun el motor IA.`,
      });
    }

    if (input.predictiveRiskProducts === null) {
      recommendations.push({
        type: 'INFO',
        message:
          'El riesgo predictivo requiere motor IA o historico de ventas activo. El dashboard sigue usando analisis local operativo.',
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

  private getDateDaysAgo(days: number): Date {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
  }

  private buildSalesMap(salesSummary: ProductSalesSummary[]): Map<string, number> {
    return new Map(
      salesSummary.map((summary) => [summary.productId, Number(summary._sum.quantity ?? 0)]),
    );
  }

  private isPredictiveRisk(item: AiRiskProduct): boolean {
    return (
      item.riskLevel === 'HIGH' ||
      item.riskLevel === 'CRITICAL' ||
      item.status === 'RISK' ||
      item.status === 'CRITICAL'
    );
  }

  async updateStockAlertState(input: {
    productId: string;
    alertType: StockAlertType;
    status: StockAlertStateStatus;
    reviewedByUserId?: string;
    note?: string;
  }) {
    if (!['OUT_OF_STOCK', 'LOW_STOCK', 'PREDICTIVE_RISK'].includes(input.alertType)) {
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
