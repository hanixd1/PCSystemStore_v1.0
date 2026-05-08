import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AiPythonRunnerService } from './services/ai-python-runner.service';

type ChatRole = 'user' | 'assistant';
type ChatIntent = 'build_pc' | 'product_search' | 'compatibility' | 'unknown';
type BuildUseCase = 'gaming' | 'office' | 'study' | 'editing';
type PlatformPreference = 'AMD' | 'Intel' | 'ANY';
type SlotBoolean = boolean | null;

interface ChatMessageInput {
  role: ChatRole;
  content: string;
}

interface AiProductInput {
  id: string;
  sku?: string;
  slug?: string;
  name: string;
  description?: string;
  price: number;
  stock: number;
  images?: string[];
  category?: string;
  createdAt?: string;
  updatedAt?: string;
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

interface ConversationSlots {
  budget: number | null;
  useCase: BuildUseCase | null;
  includeMonitor: SlotBoolean;
  includeKeyboard: SlotBoolean;
  includeMouse: SlotBoolean;
  platformPreference: PlatformPreference | null;
  wantsDedicatedGpu: SlotBoolean;
}

interface BuildComponentSelection {
  category: string;
  label: string;
  product: any | null;
  reason: string;
}

interface BuildRecommendation {
  components: BuildComponentSelection[];
  total: number;
  towerBudget: number;
  missingCategories: string[];
  notes: string[];
}

const CHAT_STOP_WORDS = new Set([
  'a',
  'al',
  'algo',
  'anda',
  'busco',
  'con',
  'cual',
  'cuanto',
  'de',
  'del',
  'el',
  'en',
  'esta',
  'este',
  'hay',
  'hola',
  'la',
  'las',
  'lo',
  'los',
  'me',
  'mi',
  'necesito',
  'para',
  'por',
  'precio',
  'que',
  'quiero',
  'se',
  'tienen',
  'tienes',
  'un',
  'una',
  'unas',
  'unos',
  'ver',
]);

const CATEGORY_LABELS: Record<string, string> = {
  CPU: 'Procesador',
  MOTHERBOARD: 'Placa madre',
  RAM: 'Memoria RAM',
  GPU: 'Tarjeta de video',
  STORAGE: 'Almacenamiento',
  PSU: 'Fuente de poder',
  CASE: 'Gabinete',
  MONITOR: 'Monitor',
  KEYBOARD: 'Teclado',
  MOUSE: 'Mouse',
};

const USE_CASE_LABELS: Record<BuildUseCase, string> = {
  gaming: 'gaming',
  office: 'oficina',
  study: 'estudio',
  editing: 'edicion',
};

const CATEGORY_HINTS = [
  {
    category: 'CPU',
    keywords: ['cpu', 'procesador', 'ryzen', 'intel', 'core i'],
  },
  {
    category: 'GPU',
    keywords: ['gpu', 'grafica', 'tarjeta', 'rtx', 'radeon', 'video'],
  },
  { category: 'RAM', keywords: ['ram', 'memoria', 'ddr4', 'ddr5'] },
  {
    category: 'STORAGE',
    keywords: ['ssd', 'nvme', 'hdd', 'm2', 'almacenamiento'],
  },
  { category: 'MOTHERBOARD', keywords: ['placa', 'board', 'motherboard'] },
  { category: 'PSU', keywords: ['fuente', 'psu', 'power'] },
  { category: 'CASE', keywords: ['case', 'gabinete', 'torre'] },
  { category: 'MONITOR', keywords: ['monitor', 'pantalla'] },
  { category: 'KEYBOARD', keywords: ['teclado', 'keyboard'] },
  { category: 'MOUSE', keywords: ['mouse', 'raton'] },
];

const FALLBACK_PREDICTION: AiPrediction = {
  id: 'error-fallback',
  nombre: 'Producto',
  stock: 0,
  estado: 'DESCONOCIDO',
  mensaje_cliente:
    'El producto esta disponible, pero conviene confirmar el stock real con un asesor.',
  alerta_admin: 'No se pudo calcular la prediccion automaticamente.',
};

const PRODUCT_INCLUDE = {
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
  headsetSpecs: true,
  microphoneSpecs: true,
  speakerSpecs: true,
} as const;

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private prisma: PrismaService,
    private readonly pythonRunner: AiPythonRunnerService,
  ) {}

  private getFrontendUrl(): string {
    return process.env.FRONTEND_URL?.trim().replace(/\/$/, '') || '';
  }

  private normalizeText(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  private normalizePrice(
    value: Prisma.Decimal | number | string | null | undefined,
  ): number {
    if (value === null || value === undefined) {
      return 0;
    }

    if (typeof value === 'number') {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }

    const parsed = Number(value.toString());
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private formatPrice(value: Prisma.Decimal | number | string): string {
    return this.normalizePrice(value).toFixed(2);
  }

  private normalizeProduct(product: any): AiProductInput {
    return {
      id: String(product.id),
      sku: product.sku ? String(product.sku) : undefined,
      slug: product.slug ? String(product.slug) : undefined,
      name: product.name ? String(product.name) : 'Producto sin nombre',
      description: product.description ? String(product.description) : '',
      price: this.normalizePrice(product.price),
      stock: Number(product.stock ?? 0),
      images: Array.isArray(product.images) ? product.images : [],
      category: product.category ? String(product.category) : 'GENERAL',
      createdAt:
        product.createdAt instanceof Date
          ? product.createdAt.toISOString()
          : product.createdAt,
      updatedAt:
        product.updatedAt instanceof Date
          ? product.updatedAt.toISOString()
          : product.updatedAt,
    };
  }

  private extractSearchTerms(userMessage: string): string[] {
    const normalized = this.normalizeText(userMessage);

    return [...new Set(normalized.split(/[^a-z0-9]+/i))]
      .filter((term) => term.length > 1 && !CHAT_STOP_WORDS.has(term))
      .slice(0, 8);
  }

  private getConversationText(
    history: ChatMessageInput[],
    userMessage: string,
  ): string {
    const fullConversation = [
      ...history,
      { role: 'user' as const, content: userMessage },
    ]
      .filter((message) => message.role === 'user')
      .map((message) => message.content)
      .join(' ');

    return this.normalizeText(fullConversation);
  }

  private extractBudgetFromText(text: string): number | null {
    const compact = text.replace(/\s+/g, ' ');
    const kiloMatch = compact.match(/(\d+(?:[.,]\d+)?)\s*k\b/);
    if (kiloMatch) {
      return Math.round(Number(kiloMatch[1].replace(',', '.')) * 1000);
    }

    const currencyMatch = compact.match(
      /(?:s\/\.?|s\/|soles|presupuesto|tengo)\s*(\d{3,5}(?:[.,]\d{1,2})?)/,
    );
    if (currencyMatch) {
      return Math.round(Number(currencyMatch[1].replace(/,/g, '')));
    }

    const genericAmount = compact.match(/\b(\d{3,5})\b/);
    if (genericAmount) {
      const amount = Number(genericAmount[1]);
      return amount >= 500 ? amount : null;
    }

    return null;
  }

  private inferUseCase(text: string): BuildUseCase | null {
    const checks: Array<[BuildUseCase, string[]]> = [
      [
        'gaming',
        [
          'gaming',
          'gamer',
          'jugar',
          'juegos',
          'warzone',
          'fortnite',
          'valorant',
          'fps',
        ],
      ],
      ['office', ['oficina', 'trabajo', 'excel', 'word', 'administrativo']],
      [
        'study',
        ['estudio', 'universidad', 'clases', 'zoom', 'tareas', 'estudiar'],
      ],
      [
        'editing',
        [
          'edicion',
          'editar',
          'premiere',
          'photoshop',
          'render',
          'arquitectura',
          'diseno',
        ],
      ],
    ];

    for (const [useCase, keywords] of checks) {
      if (keywords.some((keyword) => text.includes(keyword))) {
        return useCase;
      }
    }

    return null;
  }

  private inferPlatformPreference(text: string): PlatformPreference | null {
    if (text.includes('amd')) {
      return 'AMD';
    }

    if (text.includes('intel')) {
      return 'Intel';
    }

    if (text.includes('me da igual') || text.includes('cualquiera')) {
      return 'ANY';
    }

    return null;
  }

  private inferDedicatedGpu(text: string): SlotBoolean {
    if (
      text.includes('sin tarjeta') ||
      text.includes('sin grafica') ||
      text.includes('sin gpu')
    ) {
      return false;
    }

    if (
      text.includes('con tarjeta') ||
      text.includes('con grafica') ||
      text.includes('con gpu') ||
      text.includes('quiero jugar')
    ) {
      return true;
    }

    return null;
  }

  private inferPeripheralSlot(
    text: string,
    positiveKeywords: string[],
    negativeKeywords: string[],
  ): SlotBoolean {
    if (negativeKeywords.some((keyword) => text.includes(keyword))) {
      return false;
    }

    if (positiveKeywords.some((keyword) => text.includes(keyword))) {
      return true;
    }

    return null;
  }

  private extractConversationSlots(
    history: ChatMessageInput[],
    userMessage: string,
  ): ConversationSlots {
    const conversationText = this.getConversationText(history, userMessage);
    const allMessages = [
      ...history,
      { role: 'user' as const, content: userMessage },
    ]
      .map((message) => this.normalizeText(message.content))
      .join(' ');

    const includeEverything =
      allMessages.includes('con todo') ||
      allMessages.includes('completa') ||
      allMessages.includes('con monitor teclado y mouse');
    const onlyTower =
      allMessages.includes('solo torre') ||
      allMessages.includes('solo cpu') ||
      allMessages.includes('sin perifericos');

    const includeMonitor = includeEverything
      ? true
      : onlyTower
        ? false
        : this.inferPeripheralSlot(
            allMessages,
            [
              'con monitor',
              'incluye monitor',
              'quiero monitor',
              'tambien monitor',
            ],
            ['sin monitor', 'ya tengo monitor'],
          );

    const includeKeyboard = includeEverything
      ? true
      : onlyTower
        ? false
        : this.inferPeripheralSlot(
            allMessages,
            ['con teclado', 'incluye teclado', 'quiero teclado'],
            ['sin teclado', 'ya tengo teclado'],
          );

    const includeMouse = includeEverything
      ? true
      : onlyTower
        ? false
        : this.inferPeripheralSlot(
            allMessages,
            ['con mouse', 'incluye mouse', 'quiero mouse', 'con raton'],
            ['sin mouse', 'ya tengo mouse', 'sin raton'],
          );

    return {
      budget: this.extractBudgetFromText(conversationText),
      useCase: this.inferUseCase(conversationText),
      includeMonitor,
      includeKeyboard,
      includeMouse,
      platformPreference: this.inferPlatformPreference(conversationText),
      wantsDedicatedGpu: this.inferDedicatedGpu(conversationText),
    };
  }

  private detectIntent(
    history: ChatMessageInput[],
    userMessage: string,
    slots: ConversationSlots,
  ): ChatIntent {
    const text = this.getConversationText(history, userMessage);

    if (
      text.includes('compatib') ||
      text.includes('sirve con') ||
      text.includes('va con')
    ) {
      return 'compatibility';
    }

    if (
      text.includes('pc') ||
      text.includes('computadora') ||
      text.includes('armar') ||
      text.includes('setup') ||
      slots.budget !== null ||
      slots.useCase !== null
    ) {
      return 'build_pc';
    }

    const productKeywords = CATEGORY_HINTS.some((hint) =>
      hint.keywords.some((keyword) =>
        text.includes(this.normalizeText(keyword)),
      ),
    );

    if (productKeywords) {
      return 'product_search';
    }

    return 'unknown';
  }

  private getMissingBuildFields(slots: ConversationSlots): string[] {
    const missing: string[] = [];

    if (!slots.useCase) {
      missing.push('useCase');
    }

    if (!slots.budget) {
      missing.push('budget');
    }

    if (
      slots.includeMonitor === null &&
      slots.includeKeyboard === null &&
      slots.includeMouse === null
    ) {
      missing.push('peripherals');
    }

    return missing;
  }

  private buildQuestionForMissingField(
    slots: ConversationSlots,
    missingField: string,
  ): string {
    const knownBits: string[] = [];

    if (slots.budget) {
      knownBits.push(`presupuesto de S/. ${slots.budget}`);
    }

    if (slots.useCase) {
      knownBits.push(`uso para ${USE_CASE_LABELS[slots.useCase]}`);
    }

    const intro =
      knownBits.length > 0
        ? `Perfecto, ya tome nota de tu ${knownBits.join(' y ')}. `
        : '';

    if (missingField === 'useCase') {
      return `${intro}Ahora dime para que la quieres principalmente: gaming, oficina, estudio o edicion.`;
    }

    if (missingField === 'budget') {
      return `${intro}Lo siguiente es el presupuesto. Dime mas o menos con cuanto cuentas en soles y te lo acomodo al catalogo real.`;
    }

    if (missingField === 'peripherals') {
      return `${intro}Una mas para cerrarlo bien: ese presupuesto es solo para la torre o tambien debe incluir monitor, teclado y mouse?`;
    }

    return `${intro}Dame un poco mas de detalle para afinar la recomendacion.`;
  }

  private getBuildProfile(slots: ConversationSlots) {
    const useCase = slots.useCase ?? 'gaming';
    const includeMonitor = slots.includeMonitor === true;
    const includeKeyboard = slots.includeKeyboard === true;
    const includeMouse = slots.includeMouse === true;
    const platformPreference = slots.platformPreference ?? 'ANY';

    const monitorReserve =
      includeMonitor === true
        ? useCase === 'gaming' || useCase === 'editing'
          ? 650
          : 480
        : 0;
    const keyboardReserve = includeKeyboard ? 90 : 0;
    const mouseReserve = includeMouse ? 80 : 0;

    const towerBudget = Math.max(
      (slots.budget ?? 0) - monitorReserve - keyboardReserve - mouseReserve,
      0,
    );

    const needsDedicatedGpu =
      slots.wantsDedicatedGpu !== null
        ? slots.wantsDedicatedGpu
        : useCase === 'gaming' || useCase === 'editing'
          ? towerBudget >= 2500
          : false;

    const weightsByUseCase: Record<BuildUseCase, Record<string, number>> = {
      gaming: {
        CPU: 0.21,
        MOTHERBOARD: 0.12,
        RAM: 0.1,
        GPU: needsDedicatedGpu ? 0.33 : 0,
        STORAGE: 0.08,
        PSU: 0.08,
        CASE: 0.08,
        MONITOR: includeMonitor ? 0.18 : 0,
        KEYBOARD: includeKeyboard ? 0.04 : 0,
        MOUSE: includeMouse ? 0.03 : 0,
      },
      office: {
        CPU: 0.25,
        MOTHERBOARD: 0.15,
        RAM: 0.12,
        GPU: 0,
        STORAGE: 0.12,
        PSU: 0.1,
        CASE: 0.08,
        MONITOR: includeMonitor ? 0.15 : 0,
        KEYBOARD: includeKeyboard ? 0.02 : 0,
        MOUSE: includeMouse ? 0.01 : 0,
      },
      study: {
        CPU: 0.24,
        MOTHERBOARD: 0.15,
        RAM: 0.12,
        GPU: 0,
        STORAGE: 0.12,
        PSU: 0.09,
        CASE: 0.08,
        MONITOR: includeMonitor ? 0.15 : 0,
        KEYBOARD: includeKeyboard ? 0.03 : 0,
        MOUSE: includeMouse ? 0.02 : 0,
      },
      editing: {
        CPU: 0.24,
        MOTHERBOARD: 0.13,
        RAM: 0.12,
        GPU: needsDedicatedGpu ? 0.28 : 0,
        STORAGE: 0.1,
        PSU: 0.08,
        CASE: 0.07,
        MONITOR: includeMonitor ? 0.16 : 0,
        KEYBOARD: includeKeyboard ? 0.02 : 0,
        MOUSE: includeMouse ? 0.02 : 0,
      },
    };

    return {
      useCase,
      towerBudget,
      totalBudget: slots.budget ?? 0,
      platformPreference,
      needsDedicatedGpu,
      includeMonitor,
      includeKeyboard,
      includeMouse,
      weights: weightsByUseCase[useCase],
    };
  }

  private async getStockedProducts(categories: string[]) {
    return this.prisma.product.findMany({
      where: {
        category: { in: categories },
        stock: { gt: 0 },
      },
      include: PRODUCT_INCLUDE,
      orderBy: [{ stock: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  private scoreCpu(
    product: any,
    targetBudget: number,
    profile: ReturnType<typeof this.getBuildProfile>,
  ) {
    const price = this.normalizePrice(product.price);
    const cores = product.cpuSpecs?.cores ?? 0;
    const integratedGraphics = Boolean(product.cpuSpecs?.integratedGraphics);
    let score = 200 - Math.abs(targetBudget - price);
    score += cores * 25;

    if (!profile.needsDedicatedGpu && integratedGraphics) {
      score += 150;
    }

    if (
      profile.platformPreference === 'AMD' &&
      this.normalizeText(product.name).includes('amd')
    ) {
      score += 80;
    }

    if (
      profile.platformPreference === 'Intel' &&
      this.normalizeText(product.name).includes('intel')
    ) {
      score += 80;
    }

    return score;
  }

  private selectBestCpu(
    products: any[],
    profile: ReturnType<typeof this.getBuildProfile>,
  ) {
    const target = profile.towerBudget * profile.weights.CPU;
    const filtered = products.filter((product) => {
      const normalizedName = this.normalizeText(product.name);
      if (profile.platformPreference === 'AMD') {
        return (
          normalizedName.includes('amd') || normalizedName.includes('ryzen')
        );
      }

      if (profile.platformPreference === 'Intel') {
        return (
          normalizedName.includes('intel') || normalizedName.includes('core')
        );
      }

      return true;
    });

    const withGraphicsConstraint = !profile.needsDedicatedGpu
      ? filtered.filter((product) => product.cpuSpecs?.integratedGraphics)
      : filtered;

    const pool =
      withGraphicsConstraint.length > 0 ? withGraphicsConstraint : filtered;
    return (
      [...pool].sort(
        (a, b) =>
          this.scoreCpu(b, target, profile) - this.scoreCpu(a, target, profile),
      )[0] ?? null
    );
  }

  private selectBestMotherboard(
    products: any[],
    cpu: any,
    profile: ReturnType<typeof this.getBuildProfile>,
  ) {
    if (!cpu?.cpuSpecs?.socket) {
      return null;
    }

    const target = profile.towerBudget * profile.weights.MOTHERBOARD;
    const compatible = products.filter(
      (product) => product.motherboardSpecs?.socket === cpu.cpuSpecs.socket,
    );

    return (
      [...compatible].sort((a, b) => {
        const scoreA =
          150 -
          Math.abs(target - this.normalizePrice(a.price)) +
          (profile.towerBudget >= 3500 &&
          a.motherboardSpecs?.memoryType === 'DDR5'
            ? 60
            : 0);
        const scoreB =
          150 -
          Math.abs(target - this.normalizePrice(b.price)) +
          (profile.towerBudget >= 3500 &&
          b.motherboardSpecs?.memoryType === 'DDR5'
            ? 60
            : 0);
        return scoreB - scoreA;
      })[0] ?? null
    );
  }

  private selectBestRam(
    products: any[],
    motherboard: any,
    profile: ReturnType<typeof this.getBuildProfile>,
  ) {
    const target = profile.towerBudget * profile.weights.RAM;
    const memoryType = motherboard?.motherboardSpecs?.memoryType;
    const targetCapacity =
      profile.useCase === 'editing' || profile.towerBudget >= 4200 ? 32 : 16;

    const compatible = products.filter(
      (product) => !memoryType || product.ramSpecs?.memoryType === memoryType,
    );

    return (
      [...compatible].sort((a, b) => {
        const scoreA =
          160 -
          Math.abs(target - this.normalizePrice(a.price)) +
          18 * Math.min(a.ramSpecs?.capacity ?? 0, targetCapacity) +
          (a.ramSpecs?.speed ?? 0) / 150;
        const scoreB =
          160 -
          Math.abs(target - this.normalizePrice(b.price)) +
          18 * Math.min(b.ramSpecs?.capacity ?? 0, targetCapacity) +
          (b.ramSpecs?.speed ?? 0) / 150;
        return scoreB - scoreA;
      })[0] ?? null
    );
  }

  private selectBestStorage(
    products: any[],
    profile: ReturnType<typeof this.getBuildProfile>,
  ) {
    const target = profile.towerBudget * profile.weights.STORAGE;
    const targetCapacity =
      profile.useCase === 'gaming' || profile.useCase === 'editing'
        ? 1000
        : 500;

    return (
      [...products].sort((a, b) => {
        const typeBonusA = this.normalizeText(
          a.storageSpecs?.type ?? '',
        ).includes('nvme')
          ? 80
          : 0;
        const typeBonusB = this.normalizeText(
          b.storageSpecs?.type ?? '',
        ).includes('nvme')
          ? 80
          : 0;
        const scoreA =
          150 -
          Math.abs(target - this.normalizePrice(a.price)) +
          Math.min(a.storageSpecs?.capacity ?? 0, targetCapacity) / 8 +
          typeBonusA +
          (a.storageSpecs?.readSpeed ?? 0) / 120;
        const scoreB =
          150 -
          Math.abs(target - this.normalizePrice(b.price)) +
          Math.min(b.storageSpecs?.capacity ?? 0, targetCapacity) / 8 +
          typeBonusB +
          (b.storageSpecs?.readSpeed ?? 0) / 120;
        return scoreB - scoreA;
      })[0] ?? null
    );
  }

  private selectBestGpu(
    products: any[],
    profile: ReturnType<typeof this.getBuildProfile>,
  ) {
    if (!profile.needsDedicatedGpu) {
      return null;
    }

    const target = profile.towerBudget * profile.weights.GPU;
    return (
      [...products].sort((a, b) => {
        const scoreA =
          220 -
          Math.abs(target - this.normalizePrice(a.price)) +
          (a.gpuSpecs?.vram ?? 0) * 22 +
          (a.gpuSpecs?.fans ?? 0) * 10;
        const scoreB =
          220 -
          Math.abs(target - this.normalizePrice(b.price)) +
          (b.gpuSpecs?.vram ?? 0) * 22 +
          (b.gpuSpecs?.fans ?? 0) * 10;
        return scoreB - scoreA;
      })[0] ?? null
    );
  }

  private selectBestPsu(
    products: any[],
    requiredWattage: number,
    profile: ReturnType<typeof this.getBuildProfile>,
  ) {
    const target = Math.max(
      profile.towerBudget * profile.weights.PSU,
      requiredWattage * 0.45,
    );
    const compatible = products.filter(
      (product) => (product.psuSpecs?.wattage ?? 0) >= requiredWattage,
    );
    const pool = compatible.length > 0 ? compatible : products;

    return (
      [...pool].sort((a, b) => {
        const certBonusA = this.normalizeText(
          a.psuSpecs?.certification ?? '',
        ).includes('gold')
          ? 50
          : 0;
        const certBonusB = this.normalizeText(
          b.psuSpecs?.certification ?? '',
        ).includes('gold')
          ? 50
          : 0;
        const scoreA =
          140 -
          Math.abs(target - this.normalizePrice(a.price)) +
          certBonusA +
          (a.psuSpecs?.wattage ?? 0) / 12;
        const scoreB =
          140 -
          Math.abs(target - this.normalizePrice(b.price)) +
          certBonusB +
          (b.psuSpecs?.wattage ?? 0) / 12;
        return scoreB - scoreA;
      })[0] ?? null
    );
  }

  private selectBestCase(
    products: any[],
    motherboard: any,
    gpu: any,
    profile: ReturnType<typeof this.getBuildProfile>,
  ) {
    const target = profile.towerBudget * profile.weights.CASE;
    const requiredGpuLength = gpu?.gpuSpecs?.length ?? 0;
    const requiredFormFactor =
      motherboard?.motherboardSpecs?.formFactor ?? null;

    const compatible = products.filter((product) => {
      const supportsFormFactor =
        !requiredFormFactor ||
        this.normalizeText(product.caseSpecs?.formFactor ?? '').includes(
          this.normalizeText(requiredFormFactor),
        );
      const supportsGpu =
        requiredGpuLength === 0 ||
        (product.caseSpecs?.maxGpuLength ?? 0) >= requiredGpuLength;

      return supportsFormFactor && supportsGpu;
    });

    const pool = compatible.length > 0 ? compatible : products;
    return (
      [...pool].sort((a, b) => {
        const scoreA =
          130 -
          Math.abs(target - this.normalizePrice(a.price)) +
          (a.caseSpecs?.includedFans ?? 0) * 12;
        const scoreB =
          130 -
          Math.abs(target - this.normalizePrice(b.price)) +
          (b.caseSpecs?.includedFans ?? 0) * 12;
        return scoreB - scoreA;
      })[0] ?? null
    );
  }

  private selectBestMonitor(
    products: any[],
    profile: ReturnType<typeof this.getBuildProfile>,
  ) {
    if (!profile.includeMonitor) {
      return null;
    }

    const target =
      profile.totalBudget > 0
        ? profile.totalBudget * profile.weights.MONITOR
        : profile.towerBudget * 0.15;

    return (
      [...products].sort((a, b) => {
        const refreshA = a.monitorSpecs?.refreshRate ?? 60;
        const refreshB = b.monitorSpecs?.refreshRate ?? 60;
        const gamingBonusA =
          profile.useCase === 'gaming'
            ? Math.min(refreshA, 180)
            : Math.min(refreshA, 100);
        const gamingBonusB =
          profile.useCase === 'gaming'
            ? Math.min(refreshB, 180)
            : Math.min(refreshB, 100);
        const scoreA =
          140 - Math.abs(target - this.normalizePrice(a.price)) + gamingBonusA;
        const scoreB =
          140 - Math.abs(target - this.normalizePrice(b.price)) + gamingBonusB;
        return scoreB - scoreA;
      })[0] ?? null
    );
  }

  private selectAffordablePeripheral(products: any[], weightBudget: number) {
    return (
      [...products].sort((a, b) => {
        const scoreA =
          100 - Math.abs(weightBudget - this.normalizePrice(a.price));
        const scoreB =
          100 - Math.abs(weightBudget - this.normalizePrice(b.price));
        return scoreB - scoreA;
      })[0] ?? null
    );
  }

  private buildComponentLine(product: any, category: string): string {
    const price = `S/. ${this.formatPrice(product.price)}`;
    return `- ${CATEGORY_LABELS[category]}: ${product.name} (${price})`;
  }

  private summarizeUrgency(
    predictionMap: Map<string, AiPrediction>,
    selectedProducts: any[],
  ): string[] {
    const warnings: string[] = [];

    for (const product of selectedProducts) {
      const prediction = predictionMap.get(product.id);
      if (!prediction) {
        continue;
      }

      if (prediction.estado === 'CRITICO') {
        warnings.push(`Ojo con ${product.name}: ${prediction.mensaje_cliente}`);
      } else if (prediction.estado === 'AGOTADO') {
        warnings.push(`${product.name} esta agotado en este momento.`);
      }
    }

    return warnings.slice(0, 2);
  }

  private async generateBuildRecommendation(
    slots: ConversationSlots,
  ): Promise<BuildRecommendation> {
    const profile = this.getBuildProfile(slots);
    const categories = [
      'CPU',
      'MOTHERBOARD',
      'RAM',
      'GPU',
      'STORAGE',
      'PSU',
      'CASE',
      'MONITOR',
      'KEYBOARD',
      'MOUSE',
    ];
    const products = await this.getStockedProducts(categories);
    const byCategory = categories.reduce<Record<string, any[]>>(
      (acc, category) => {
        acc[category] = products.filter(
          (product) => product.category === category,
        );
        return acc;
      },
      {},
    );

    const cpu = this.selectBestCpu(byCategory.CPU, profile);
    const motherboard = this.selectBestMotherboard(
      byCategory.MOTHERBOARD,
      cpu,
      profile,
    );
    const ram = this.selectBestRam(byCategory.RAM, motherboard, profile);
    const storage = this.selectBestStorage(byCategory.STORAGE, profile);
    const gpu = this.selectBestGpu(byCategory.GPU, profile);

    const cpuTdp = cpu?.cpuSpecs?.tdp ?? 65;
    const gpuTdp = gpu?.gpuSpecs?.tdp ?? 0;
    const requiredWattage = Math.max(
      450,
      Math.round((cpuTdp + gpuTdp + 180) * 1.25),
    );
    const psu = this.selectBestPsu(byCategory.PSU, requiredWattage, profile);
    const caseProduct = this.selectBestCase(
      byCategory.CASE,
      motherboard,
      gpu,
      profile,
    );
    const monitor = this.selectBestMonitor(byCategory.MONITOR, profile);
    const keyboard = profile.includeKeyboard
      ? this.selectAffordablePeripheral(byCategory.KEYBOARD, 90)
      : null;
    const mouse = profile.includeMouse
      ? this.selectAffordablePeripheral(byCategory.MOUSE, 80)
      : null;

    const selections: BuildComponentSelection[] = [
      {
        category: 'CPU',
        label: CATEGORY_LABELS.CPU,
        product: cpu,
        reason:
          !profile.needsDedicatedGpu && cpu?.cpuSpecs?.integratedGraphics
            ? 'te deja arrancar sin grafica dedicada'
            : 'equilibra rendimiento y presupuesto',
      },
      {
        category: 'MOTHERBOARD',
        label: CATEGORY_LABELS.MOTHERBOARD,
        product: motherboard,
        reason: 'es compatible con el socket del procesador',
      },
      {
        category: 'RAM',
        label: CATEGORY_LABELS.RAM,
        product: ram,
        reason: 'mantiene compatibilidad con la placa y deja una base solida',
      },
      {
        category: 'GPU',
        label: CATEGORY_LABELS.GPU,
        product: gpu,
        reason: 'prioriza el rendimiento grafico para tu perfil',
      },
      {
        category: 'STORAGE',
        label: CATEGORY_LABELS.STORAGE,
        product: storage,
        reason: 'te da un SSD rapido para sistema y programas',
      },
      {
        category: 'PSU',
        label: CATEGORY_LABELS.PSU,
        product: psu,
        reason: 'cubre el consumo estimado con margen',
      },
      {
        category: 'CASE',
        label: CATEGORY_LABELS.CASE,
        product: caseProduct,
        reason: 'mantiene la compatibilidad fisica del armado',
      },
      {
        category: 'MONITOR',
        label: CATEGORY_LABELS.MONITOR,
        product: monitor,
        reason: 'entra en el presupuesto del setup completo',
      },
      {
        category: 'KEYBOARD',
        label: CATEGORY_LABELS.KEYBOARD,
        product: keyboard,
        reason: 'acompaña el setup sin comerse mucho presupuesto',
      },
      {
        category: 'MOUSE',
        label: CATEGORY_LABELS.MOUSE,
        product: mouse,
        reason: 'acompaña el setup sin comerse mucho presupuesto',
      },
    ].filter(
      (item) =>
        item.product ||
        ['GPU', 'MONITOR', 'KEYBOARD', 'MOUSE'].includes(item.category),
    );

    const missingCategories = selections
      .filter((item) => !item.product)
      .map((item) => item.label);

    const total = selections.reduce(
      (acc, item) =>
        acc + (item.product ? this.normalizePrice(item.product.price) : 0),
      0,
    );

    const notes: string[] = [];
    if (!profile.needsDedicatedGpu) {
      notes.push(
        'Para ese presupuesto priorice una base equilibrada y video integrado antes que una grafica dedicada floja.',
      );
    }

    if (total > (slots.budget ?? 0)) {
      notes.push(
        'La propuesta se pasa un poco del presupuesto. Si quieres, la bajo recortando monitor o ajustando procesador.',
      );
    }

    if (profile.platformPreference === 'ANY') {
      notes.push(
        'Si prefieres AMD o Intel te la puedo reajustar sin problema.',
      );
    }

    return {
      components: selections,
      total,
      towerBudget: profile.towerBudget,
      missingCategories,
      notes,
    };
  }

  private async createBuildReply(
    slots: ConversationSlots,
    recommendation: BuildRecommendation,
  ) {
    const selectedProducts = recommendation.components
      .map((component) => component.product)
      .filter(Boolean);
    const predictions = await this.getAiPredictions(selectedProducts);
    const predictionMap = new Map(predictions.map((item) => [item.id, item]));
    const urgencyLines = this.summarizeUrgency(predictionMap, selectedProducts);
    const availableLines = recommendation.components
      .filter((component) => component.product)
      .map((component) =>
        this.buildComponentLine(component.product, component.category),
      );

    const opening = `Ya con lo que me dijiste, te armaria una propuesta para ${USE_CASE_LABELS[slots.useCase ?? 'gaming']} con presupuesto de S/. ${slots.budget}.`;
    const totalsLine = `El total estimado me queda en S/. ${recommendation.total.toFixed(2)}.`;
    const missingLine =
      recommendation.missingCategories.length > 0
        ? `Ahora mismo me faltan opciones en catalogo para: ${recommendation.missingCategories.join(', ')}.`
        : '';
    const notes = [...recommendation.notes, ...urgencyLines];
    const notesBlock = notes.length > 0 ? `\n\n${notes.join('\n')}` : '';

    return {
      reply: `${opening}\n\n${availableLines.join('\n')}\n\n${totalsLine}${missingLine ? `\n${missingLine}` : ''}${notesBlock}\n\nSi quieres, la siguiente vuelta te la ajusto a mas FPS, mas oficina o con monitor/perifericos distintos.`,
      recommendation,
    };
  }

  private async findMatchingProducts(userMessage: string) {
    const terms = this.extractSearchTerms(userMessage);

    if (terms.length > 0) {
      const products = await this.prisma.product.findMany({
        where: {
          OR: [
            ...terms.map((term) => ({
              name: { contains: term, mode: 'insensitive' as const },
            })),
            ...terms.map((term) => ({
              description: { contains: term, mode: 'insensitive' as const },
            })),
            ...terms.map((term) => ({
              category: { contains: term, mode: 'insensitive' as const },
            })),
          ],
        },
        take: 5,
        orderBy: [{ stock: 'desc' }, { updatedAt: 'desc' }],
      });

      if (products.length > 0) {
        return products;
      }
    }

    const normalized = this.normalizeText(userMessage);
    const inferredCategory = CATEGORY_HINTS.find((hint) =>
      hint.keywords.some((keyword) =>
        normalized.includes(this.normalizeText(keyword)),
      ),
    );

    if (!inferredCategory) {
      return [];
    }

    return this.prisma.product.findMany({
      where: { category: inferredCategory.category },
      take: 3,
      orderBy: [{ stock: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  private buildProductSearchReply(
    userMessage: string,
    matchedProducts: any[],
    predictions: AiPrediction[],
  ) {
    if (matchedProducts.length === 0) {
      return {
        reply:
          'No encontre un producto exacto con ese nombre. Si quieres, dime la categoria, la marca o para que uso lo necesitas y te ayudo a aterrizarlo.',
      };
    }

    const predictionMap = new Map(predictions.map((item) => [item.id, item]));
    const mainProduct = matchedProducts[0];
    const mainPrediction =
      predictionMap.get(mainProduct.id) ?? FALLBACK_PREDICTION;
    const alternativeProducts = matchedProducts
      .slice(1, 3)
      .map(
        (product) => `${product.name} (S/. ${this.formatPrice(product.price)})`,
      )
      .join(', ');

    const normalizedMessage = this.normalizeText(userMessage);
    const intro = normalizedMessage.includes('precio')
      ? `Si, tengo ${mainProduct.name} por S/. ${this.formatPrice(mainProduct.price)}.`
      : `Encontre ${mainProduct.name} por S/. ${this.formatPrice(mainProduct.price)}.`;

    const alternativeLine = alternativeProducts
      ? ` Tambien te podria mostrar ${alternativeProducts}.`
      : '';

      return {
        reply: `${intro} ${mainPrediction.mensaje_cliente}${alternativeLine}`,
        productLink:
          mainProduct.id && this.getFrontendUrl()
            ? `${this.getFrontendUrl()}/product/${mainProduct.id}`
            : null,
        matches: matchedProducts.map((product) => ({
          id: product.id,
        slug: product.slug,
        name: product.name,
        category: product.category,
        stock: product.stock,
        price: this.normalizePrice(product.price),
        estado: predictionMap.get(product.id)?.estado ?? 'DESCONOCIDO',
      })),
    };
  }

  async getAiPredictions(productsContext?: any[]) {
    try {
      const sourceProducts =
        productsContext && productsContext.length > 0
          ? productsContext
          : await this.prisma.product.findMany({
              select: {
                id: true,
                sku: true,
                slug: true,
                name: true,
                description: true,
                price: true,
                stock: true,
                images: true,
                category: true,
                createdAt: true,
                updatedAt: true,
              },
              take: 10,
              orderBy: [{ stock: 'asc' }, { updatedAt: 'desc' }],
            });

      const normalizedProducts = sourceProducts.map((product) =>
        this.normalizeProduct(product),
      );

      if (normalizedProducts.length === 0) {
        return [];
      }

      return await this.pythonRunner.runPredictor(normalizedProducts);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Error en el motor de IA de Python: ${errorMessage}`);

      return [{ ...FALLBACK_PREDICTION }];
    }
  }

  async processCustomerChat(
    userMessage: string,
    history: ChatMessageInput[] = [],
  ): Promise<unknown> {
    const cleanMessage = userMessage.trim();

    if (!cleanMessage) {
      return {
        reply:
          'Escribeme lo que tienes en mente y lo aterrizamos juntos. Puede ser un componente o toda una PC.',
      };
    }

    const sanitizedHistory = history
      .filter(
        (message) =>
          (message.role === 'user' || message.role === 'assistant') &&
          typeof message.content === 'string',
      )
      .slice(-12);

    const slots = this.extractConversationSlots(sanitizedHistory, cleanMessage);
    const intent = this.detectIntent(sanitizedHistory, cleanMessage, slots);

    if (intent === 'build_pc') {
      const missingFields = this.getMissingBuildFields(slots);

      if (missingFields.length > 0) {
        return {
          reply: this.buildQuestionForMissingField(slots, missingFields[0]),
          detectedIntent: intent,
          conversationState: {
            slots,
            missingFields,
            readyForRecommendation: false,
          },
        };
      }

      const recommendation = await this.generateBuildRecommendation(slots);
      const buildReply = await this.createBuildReply(slots, recommendation);

      return {
        ...buildReply,
        detectedIntent: intent,
        conversationState: {
          slots,
          missingFields: [],
          readyForRecommendation: true,
        },
      };
    }

    if (intent === 'compatibility') {
      return {
        reply:
          'Puedo ayudarte con compatibilidad, pero necesito al menos dos piezas claras. Por ejemplo: "este Ryzen 5 con que placa va?" o "quiero una RAM para una B650 DDR5".',
        detectedIntent: intent,
      };
    }

    const matchedProducts = await this.findMatchingProducts(cleanMessage);
    const predictions = await this.getAiPredictions(matchedProducts);

    if (intent === 'product_search' || matchedProducts.length > 0) {
      return {
        ...this.buildProductSearchReply(
          cleanMessage,
          matchedProducts,
          predictions,
        ),
        detectedIntent: matchedProducts.length > 0 ? 'product_search' : intent,
      };
    }

    return {
      reply:
        'Te puedo ayudar de dos formas: encontrar un componente puntual o armarte una PC por presupuesto. Si quieres, dime algo como "busco una RTX 4060" o "tengo 3000 soles y quiero una PC para oficina".',
      detectedIntent: 'unknown',
    };
  }
}
