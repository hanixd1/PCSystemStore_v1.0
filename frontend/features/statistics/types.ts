export type InventoryStatus = 'NORMAL' | 'LOW_STOCK' | 'OUT_OF_STOCK';
export type AiMode = 'AI_SERVICE' | 'LOCAL_FALLBACK';
export type StockAlertType = 'OUT_OF_STOCK' | 'LOW_STOCK';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ProbabilityBound = 'within' | 'above' | 'below';
export type Reliability = 'validated' | 'sensitivity' | 'extrapolation';

export type CategoryForecastRisk = {
  category: string;
  label: string;
  stock: number;
  forecastMedian: number;
  forecastP90: number;
  stockoutProbability: number;
  bound: ProbabilityBound;
  coverageMonths: number | null;
  riskLevel: RiskLevel;
  suggestedReorder: number;
};

export type InventoryDashboard = {
  summary: {
    totalProducts: number;
    outOfStockProducts: number;
    lowStockProducts: number;
    riskCategories: number | null;
    riskAvailable?: boolean;
    estimatedInventoryValue: number;
  };
  alerts: Array<{
    productId: string;
    alertType: StockAlertType;
    name: string;
    category: string;
    stock: number;
    status: InventoryStatus;
    risk: number | null;
    recommendation: string;
    alertState: 'ACTIVE' | 'REVIEWED' | 'DISMISSED';
  }>;
  forecastRisk: {
    month: string;
    horizon: number;
    reliability: Reliability;
    model: string;
    lastObservedMonth: string;
    items: CategoryForecastRisk[];
  } | null;
  recommendations: Array<{
    type: string;
    message: string;
  }>;
  aiStatus: {
    available: boolean;
    mode: AiMode;
    model: string | null;
    lastObservedMonth: string | null;
    lastUpdated: string;
  };
};

export type QuantileBand = {
  p10: number;
  p25: number;
  median: number;
  p75: number;
  p90: number;
};

export type ProbabilityPoint = {
  units: number;
  probability: number;
  bound: ProbabilityBound;
};

export type ForecastOverview = {
  model: string;
  lastObservedMonth: string;
  firstForecastMonth: string;
  lastForecastMonth: string;
  defaultMonth: string;
  maxHorizon: number;
  validatedHorizon: number;
  sensitivityHorizon: number;
};

export type MonthForecast = {
  month: string;
  horizon: number;
  reliability: Reliability;
  model: string;
  lastObservedMonth: string;
  total: QuantileBand & {
    probabilities: ProbabilityPoint[];
    requested: ProbabilityPoint | null;
    sameMonthLastYear: {
      month: string;
      units: number | null;
      probabilityAbove: ProbabilityPoint | null;
    };
  };
  path: Array<QuantileBand & { month: string }>;
  history: Array<{ month: string; units: number }>;
  categories: Array<
    QuantileBand & {
      key: string;
      label: string;
      share: number;
      probabilityAtLeastOne: number;
      sameMonthLastYear: number | null;
    }
  >;
  products: Array<{
    name: string;
    category: string;
    probabilityOfSale: number;
    expectedUnits: number;
    unitsLast18Months: number;
  }>;
};

export type ResearchSummary = {
  data: {
    firstMonth: string;
    lastMonth: string;
    recordEnd: string | null;
    months: number;
    units: number;
    amount: number;
    skus: number;
    categories: number;
    structuralBreak: string;
  };
  sources: Array<{ month: string; channel: 'vecinos' | 'facturado'; units: number }>;
  freeze: { tag: string | null; frozenAt: string | null };
  accuracy: {
    runId: string;
    origins: number;
    testWindow: { test_start?: string; test_end?: string } | null;
    rows: Array<{
      level: string;
      model: string;
      label: string;
      series: number;
      medianMase: number;
      medianRmsse: number;
      meanRank: number;
      shareBeatsNaive: number;
    }>;
  } | null;
  inventory: {
    runId: string;
    leadTime: number;
    fillRateTarget: number;
    rows: Array<{
      level: string;
      model: string;
      label: string;
      fillRate: number | null;
      meanOnHand: number;
      lostUnits: number;
      lostValue: number;
    }>;
  } | null;
  patterns: Array<{ level: string; pattern: string; label: string; series: number }>;
  hypotheses: Array<{ id: string; decision: string; statement: string; evidence: string }>;
};
