import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type InventoryStatus = 'NORMAL' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'BREAK_RISK';
type AiMode = 'AI_SERVICE' | 'LOCAL_FALLBACK';

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
  name: string;
  category: string;
  stock: number;
  status: InventoryStatus;
  risk: number;
  recommendation: string;
}

interface DashboardRecommendation {
  type: 'REPLENISHMENT' | 'OUT_OF_STOCK' | 'LOW_STOCK' | 'DATA_QUALITY' | 'INFO';
  message: string;
}

interface AiRiskProduct {
  productId?: string;
  id?: string;
  risk?: number;
  status?: InventoryStatus;
  recommendation?: string;
}

interface AiStatisticsResponse {
  available?: boolean;
  generatedBy?: string;
  riskProducts?: AiRiskProduct[];
  message?: string;
}

interface AiStatisticsResult {
  available: boolean;
  mode: AiMode;
  riskByProductId: Map<string, AiRiskProduct>;
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
      const [totalProducts, products, aiResult] = await Promise.all([
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
        this.getStockStatisticsFromAi(),
      ]);

      const alerts = this.buildAlerts(products, aiResult.riskByProductId);
      const outOfStockProducts = products.filter((product) => product.stock === 0).length;
      const lowStockProducts = products.filter(
        (product) => product.stock > 0 && product.stock <= LOW_STOCK_THRESHOLD,
      ).length;
      const riskProducts = alerts.filter((alert) => alert.risk >= 60).length;
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
          riskProducts,
          estimatedInventoryValue: Number(estimatedInventoryValue.toFixed(2)),
        },
        alerts,
        recommendations: this.buildRecommendations({
          outOfStockProducts,
          lowStockProducts,
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

  async getStockStatisticsFromAi(): Promise<AiStatisticsResult> {
    const aiServiceUrl = process.env.AI_SERVICE_URL?.trim().replace(/\/$/, '');

    if (!aiServiceUrl) {
      return this.getLocalFallbackAiResult();
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), AI_SERVICE_TIMEOUT_MS);

    try {
      const response = await fetch(`${aiServiceUrl}/statistics/inventory`, {
        method: 'GET',
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`ai-service respondio ${response.status}`);
      }

      const payload = (await response.json()) as AiStatisticsResponse;
      const riskByProductId = new Map<string, AiRiskProduct>();

      for (const riskProduct of payload.riskProducts ?? []) {
        const productId = riskProduct.productId ?? riskProduct.id;
        if (productId) {
          riskByProductId.set(productId, riskProduct);
        }
      }

      return {
        available: payload.available !== false,
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
    aiRiskByProductId: Map<string, AiRiskProduct>,
  ): InventoryAlert[] {
    return products
      .map((product) => {
        const aiRisk = aiRiskByProductId.get(product.id);
        const localRisk = this.calculateLocalRisk(product.stock);
        const risk = Math.max(localRisk, this.normalizeRisk(aiRisk?.risk));
        const status = this.resolveStatus(product.stock, risk, aiRisk?.status);

        return {
          productId: product.id,
          name: product.name,
          category: this.formatCategory(product.category),
          stock: product.stock,
          status,
          risk,
          recommendation:
            aiRisk?.recommendation?.trim() || this.buildStockRecommendation(product.stock),
        };
      })
      .filter((alert) => alert.stock <= LOW_STOCK_THRESHOLD || alert.risk >= 60)
      .sort((left, right) => right.risk - left.risk || left.stock - right.stock);
  }

  private calculateLocalRisk(stock: number): number {
    if (stock <= 0) {
      return 100;
    }

    if (stock === 1) {
      return 90;
    }

    if (stock === 2) {
      return 75;
    }

    if (stock === 3) {
      return 60;
    }

    return 0;
  }

  private normalizeRisk(value: unknown): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return 0;
    }

    return Math.max(0, Math.min(100, Math.round(parsed)));
  }

  private resolveStatus(stock: number, risk: number, aiStatus?: InventoryStatus): InventoryStatus {
    if (aiStatus && ['NORMAL', 'LOW_STOCK', 'OUT_OF_STOCK', 'BREAK_RISK'].includes(aiStatus)) {
      return aiStatus;
    }

    if (stock <= 0) {
      return 'OUT_OF_STOCK';
    }

    if (risk >= 85) {
      return 'BREAK_RISK';
    }

    if (stock <= LOW_STOCK_THRESHOLD) {
      return 'LOW_STOCK';
    }

    return 'NORMAL';
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
}
