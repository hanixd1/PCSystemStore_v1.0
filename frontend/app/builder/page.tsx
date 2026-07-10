'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FiBox,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiCpu,
  FiGrid,
  FiHardDrive,
  FiMonitor,
  FiRefreshCw,
  FiShoppingCart,
  FiWind,
  FiZap,
} from 'react-icons/fi';
import { useCartStore } from '@/store/useCartStore';
import { api } from '@/lib/api';
import { getEffectivePrice } from '@/lib/pricing';
import { calculateRecommendedPsuWatts } from '@/lib/products/psuRecommendation';
import { confirmAction, notify } from '@/lib/notify';

const PRODUCTS_PER_PAGE = 9;
const BUILDER_STORAGE_KEY = 'pcsystemstore_pc_builder_state';

const STEPS = [
  { id: 'cpu', title: 'Procesador', shortTitle: 'CPU', category: 'CPU', icon: FiCpu },
  {
    id: 'motherboard',
    title: 'Placa Madre',
    shortTitle: 'Placa',
    category: 'MOTHERBOARD',
    icon: FiGrid,
  },
  { id: 'ram', title: 'Memoria RAM', shortTitle: 'RAM', category: 'RAM', icon: FiZap },
  {
    id: 'storage',
    title: 'Almacenamiento',
    shortTitle: 'SSD',
    category: 'STORAGE',
    icon: FiHardDrive,
  },
  { id: 'gpu', title: 'Tarjeta de Video', shortTitle: 'GPU', category: 'GPU', icon: FiMonitor },
  { id: 'cooler', title: 'Refrigeración', shortTitle: 'Cooler', category: 'COOLER', icon: FiWind },
  { id: 'case', title: 'Case', shortTitle: 'Case', category: 'CASE', icon: FiBox },
  { id: 'psu', title: 'Fuente', shortTitle: 'PSU', category: 'PSU', icon: FiZap },
  { id: 'summary', title: 'Resumen', shortTitle: 'Resumen', icon: FiCheckCircle },
] as const;

type StepId = (typeof STEPS)[number]['id'];
type Platform = 'INTEL' | 'AMD';
type SkippedStep = { skipped: true; reason: string };

const STEP_SHORT_LABELS: Partial<Record<StepId, string>> = {
  cpu: 'CPU',
  motherboard: 'Placa',
  ram: 'RAM',
  storage: 'SSD',
  gpu: 'GPU',
  cooler: 'Cooler',
  case: 'Case',
  psu: 'PSU',
};

type BuildValidationResponse = {
  compatible: boolean;
  errors: { code: string; message: string; products?: string[] }[];
  warnings: { code: string; message: string; products?: string[] }[];
  summary: {
    estimatedPower: number;
    recommendedPsu: number;
  };
};

type PersistedBuilderState = {
  selectedPlatform: Platform | null;
  currentStep: number;
  selectedProducts: Record<string, any>;
  skippedSteps: Record<string, SkippedStep>;
  currentPage: number;
};

function getProductPath(product: { id: string; slug?: string | null }) {
  return `/producto/${product.slug || product.id}`;
}

function normalizeText(value: unknown) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function compactText(value: unknown) {
  return normalizeText(value).replace(/[^a-z0-9]+/g, '');
}

function productText(product: any) {
  return normalizeText(
    [
      product?.name,
      product?.slug,
      product?.sku,
      product?.brand,
      product?.description,
      product?.cpuSpecs?.frequency,
      product?.cpuSpecs?.brand,
      product?.caseSpecs?.brand,
      JSON.stringify(product?.cpuSpecs || {}),
      JSON.stringify(product?.caseSpecs || {}),
    ].join(' '),
  );
}

function isIntelFSkuWithoutIgpu(product: any) {
  const text = productText(product);
  return /\bi[3579][-\s]?\d{4,5}f\b/i.test(text) || /\bcore\s+ultra\s+\d+\s+\d{3,4}f\b/i.test(text);
}

function processorHasIntegratedGraphics(processor: any) {
  if (!processor) return false;

  const text = productText(processor);
  const negativeSignals = [
    'sin graficos integrados',
    'sin gráficos integrados',
    'no incluye graficos',
    'no incluye gráficos',
    'requiere tarjeta grafica dedicada',
    'requiere tarjeta gráfica dedicada',
    'no integrated graphics',
    'without integrated graphics',
  ];

  if (negativeSignals.some((signal) => text.includes(normalizeText(signal)))) return false;
  if (isIntelFSkuWithoutIgpu(processor)) return false;

  const explicitValue =
    processor?.cpuSpecs?.integratedGraphics ??
    processor?.integratedGraphics ??
    processor?.hasIntegratedGraphics ??
    processor?.graphicsIntegrated;

  if (explicitValue === true) return true;
  if (explicitValue === false) return false;

  if (/\b(ryzen\s*)?\d{4}g\b/i.test(text)) return true;

  return [
    'radeon graphics',
    'intel uhd',
    'intel graphics',
    'intel iris',
    'igpu',
    'graficos integrados',
    'gráficos integrados',
    'integrated graphics',
  ].some((signal) => text.includes(normalizeText(signal)));
}

function processorIncludesCooler(processor: any) {
  if (!processor) return false;

  const text = productText(processor);
  const negativeSignals = ['no incluye cooler', 'sin cooler', 'requiere cooler', 'without cooler'];
  if (negativeSignals.some((signal) => text.includes(normalizeText(signal)))) return false;

  const explicitValue =
    processor?.cpuSpecs?.includesCooler ??
    processor?.includesCooler ??
    processor?.hasCooler ??
    processor?.coolerIncluded;

  if (explicitValue === true) return true;
  if (explicitValue === false) return false;

  return [
    'incluye cooler',
    'cooler incluido',
    'con cooler',
    'stock cooler',
    'wraith stealth',
    'wraith prism',
    'wraith spire',
  ].some((signal) => text.includes(normalizeText(signal)));
}

function caseIncludesPowerSupply(pcCase: any) {
  if (!pcCase) return false;

  const text = productText(pcCase);
  const negativeSignals = ['sin fuente', 'no incluye fuente', 'sin psu', 'no incluye psu'];
  if (negativeSignals.some((signal) => text.includes(normalizeText(signal)))) return false;

  const explicitValue =
    pcCase?.caseSpecs?.includesPsu ??
    pcCase?.caseSpecs?.includesPowerSupply ??
    pcCase?.includesPowerSupply ??
    pcCase?.hasPsu ??
    pcCase?.psuIncluded ??
    pcCase?.powerSupplyIncluded;

  if (explicitValue === true) return true;
  if (explicitValue === false) return false;

  return [
    'incluye fuente',
    'con fuente',
    'fuente incluida',
    'psu incluida',
    'con psu',
    'incluye psu',
  ].some((signal) => text.includes(normalizeText(signal)));
}

function cpuMatchesPlatform(product: any, platform: Platform | null) {
  if (!platform) return true;

  const text = productText(product);
  const brand = compactText(product?.cpuSpecs?.brand ?? product?.brand);

  if (platform === 'INTEL') {
    return (
      brand.includes('intel') ||
      /\bintel\b/.test(text) ||
      /\bcore\s+i[3579]\b/.test(text) ||
      /\bcore\s+ultra\b/.test(text)
    );
  }

  return (
    brand.includes('amd') ||
    /\bamd\b/.test(text) ||
    /\bryzen\b/.test(text) ||
    /\bthreadripper\b/.test(text)
  );
}

function getCoolerSockets(product: any) {
  const sockets = product.coolerSpecs?.compatibleSockets;
  if (Array.isArray(sockets) && sockets.length > 0) return sockets;
  return String(product.coolerSpecs?.socketSupport || '')
    .split(/[;,]/)
    .map((socket) => socket.trim())
    .filter(Boolean);
}

function isM2Storage(product: any) {
  const specs = product.storageSpecs || {};
  const type = normalizeText(specs.type);
  const storageInterface = normalizeText(specs.interface);
  const formFactor = normalizeText(specs.m2FormFactor);
  return (
    type.includes('m.2') ||
    type.includes('nvme') ||
    storageInterface.includes('nvme') ||
    formFactor.includes('m.2')
  );
}

function normalizeCoolerType(product: any) {
  const value = normalizeText(product.coolerSpecs?.type);
  if (value === 'aio' || value.includes('liqu')) return 'Líquida';
  return 'Torre';
}

function getCaseTowerCoolerSupport(product: any): boolean | undefined {
  const specs = product.caseSpecs || {};
  if (typeof specs.supportsTowerCooler === 'boolean') return specs.supportsTowerCooler;

  const value = compactText(specs.supportsTowerCooler);
  if (['TRUE', 'SI', 'YES', '1'].includes(value)) return true;
  if (['FALSE', 'NO', '0'].includes(value)) return false;
  return undefined;
}

function getCaseFormFactors(product: any) {
  const specs = product.caseSpecs || {};
  const values =
    Array.isArray(specs.supportedFormFactors) && specs.supportedFormFactors.length
      ? specs.supportedFormFactors
      : specs.formFactor;

  return (Array.isArray(values) ? values : String(values || '').split(/[;,]/))
    .map((item) => compactText(item))
    .filter(Boolean);
}

function getCaseRadiatorSizes(product: any) {
  const specs = product.caseSpecs || {};
  const values =
    Array.isArray(specs.radiatorSupportMmValues) && specs.radiatorSupportMmValues.length
      ? specs.radiatorSupportMmValues
      : specs.radiatorSupportMm;

  return (Array.isArray(values) ? values : String(values || '').split(/[;,]/))
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0);
}

function caseSupportsMotherboard(pcCase: any, motherboard: any) {
  if (!pcCase || !motherboard) return true;
  const motherboardFormFactor = compactText(motherboard.motherboardSpecs?.formFactor);
  const caseFormFactors = getCaseFormFactors(pcCase);
  return (
    !motherboardFormFactor ||
    caseFormFactors.length === 0 ||
    caseFormFactors.includes(motherboardFormFactor)
  );
}

function caseSupportsGpu(pcCase: any, gpu: any) {
  if (!pcCase || !gpu) return true;
  const caseMaxGpu = Number(pcCase.caseSpecs?.maxGpuLength || 0);
  const gpuLength = Number(gpu.gpuSpecs?.length || 0);
  return caseMaxGpu <= 0 || gpuLength <= 0 || gpuLength <= caseMaxGpu;
}

function caseSupportsCooler(pcCase: any, cooler: any) {
  if (!pcCase || !cooler) return true;
  if (normalizeCoolerType(cooler) === 'Torre') {
    return getCaseTowerCoolerSupport(pcCase) !== false;
  }

  const radiatorSize = Number(cooler.coolerSpecs?.radiatorSize || 0);
  const caseRadiators = getCaseRadiatorSizes(pcCase);
  return radiatorSize <= 0 || caseRadiators.length === 0 || caseRadiators.includes(radiatorSize);
}

function validateCpuMotherboardCompatibility(build: Record<string, any>) {
  if (
    build.cpu &&
    build.motherboard &&
    compactText(build.cpu.cpuSpecs?.socket) !==
      compactText(build.motherboard.motherboardSpecs?.socket)
  ) {
    return ['La placa madre no coincide con el socket del procesador.'];
  }

  return [];
}

function validateCoolerCompatibility(
  build: Record<string, any>,
  skipped: Record<string, SkippedStep>,
) {
  const errors: string[] = [];
  const cpuSocket = build.cpu?.cpuSpecs?.socket;
  const cpuTdp = Number(build.cpu?.cpuSpecs?.tdp || 0);

  if (!build.cpu || !build.cooler || skipped.cooler) {
    return errors;
  }

  if (
    !getCoolerSockets(build.cooler).some((socket) => compactText(socket) === compactText(cpuSocket))
  ) {
    errors.push('La refrigeración seleccionada no es compatible con el socket del procesador.');
  }

  if (Number(build.cooler.coolerSpecs?.tdpCapacity || 0) < cpuTdp) {
    errors.push('La refrigeración seleccionada no soporta el TDP del procesador.');
  }

  return errors;
}

function validateCoolerCaseCompatibility(
  build: Record<string, any>,
  skipped: Record<string, SkippedStep>,
) {
  if (!build.cooler || !build.case || skipped.cooler) return [];
  return normalizeCoolerType(build.cooler) === 'Torre'
    ? validateTowerCoolerCaseCompatibility(build)
    : validateLiquidCoolerCaseCompatibility(build);
}

function validateTowerCoolerCaseCompatibility(build: Record<string, any>) {
  if (getCaseTowerCoolerSupport(build.case) === false) {
    return ['Este case no soporta refrigeración de torre.'];
  }

  return [];
}

function validateLiquidCoolerCaseCompatibility(build: Record<string, any>) {
  const radiatorSize = Number(build.cooler.coolerSpecs?.radiatorSize || 0);
  const caseRadiators = getCaseRadiatorSizes(build.case);
  if (radiatorSize > 0 && caseRadiators.length > 0 && !caseRadiators.includes(radiatorSize)) {
    return [`Este case no soporta un radiador de ${radiatorSize} mm.`];
  }

  return [];
}

function validateStorageCompatibility(build: Record<string, any>) {
  const errors: string[] = [];
  if (!build.motherboard || !build.storage || !isM2Storage(build.storage)) {
    return errors;
  }

  const m2Slots = Number(build.motherboard.motherboardSpecs?.m2Slots || 0);
  const supportedSizes = build.motherboard.motherboardSpecs?.supportedM2FormFactors || [];
  const storageSize = build.storage.storageSpecs?.m2FormFactor;

  if (m2Slots <= 0) {
    errors.push('La placa madre no tiene slots M.2 para el almacenamiento seleccionado.');
  }

  if (
    storageSize &&
    supportedSizes.length > 0 &&
    !supportedSizes.some((size: string) => compactText(size) === compactText(storageSize))
  ) {
    errors.push('La placa madre no soporta el tamaño M.2 del almacenamiento seleccionado.');
  }

  return errors;
}

function validatePsuCompatibility(
  build: Record<string, any>,
  skipped: Record<string, SkippedStep>,
  requiredWatts: number,
) {
  if (skipped.psu) return [];
  if (build.psu && Number(build.psu.psuSpecs?.wattage || 0) < requiredWatts) {
    return [
      `La fuente seleccionada no cubre el consumo estimado con margen de seguridad (${requiredWatts}W).`,
    ];
  }

  return [];
}

function getProductSpecsSummary(product: any) {
  if (product.category === 'CPU') {
    return [
      product.cpuSpecs?.socket ? `Socket ${product.cpuSpecs.socket}` : null,
      product.cpuSpecs?.cores ? `${product.cpuSpecs.cores} núcleos` : null,
      processorHasIntegratedGraphics(product) ? 'Gráficos integrados' : null,
    ];
  }

  if (product.category === 'MOTHERBOARD') {
    return [
      product.motherboardSpecs?.socket ? `Socket ${product.motherboardSpecs.socket}` : null,
      product.motherboardSpecs?.memoryType,
      product.motherboardSpecs?.formFactor,
    ];
  }

  if (product.category === 'RAM') {
    return [
      product.ramSpecs?.memoryType,
      product.ramSpecs?.capacity ? `${product.ramSpecs.capacity} GB` : null,
      product.ramSpecs?.speed ? `${product.ramSpecs.speed} MHz` : null,
    ];
  }

  if (product.category === 'STORAGE') {
    return [
      product.storageSpecs?.type,
      product.storageSpecs?.capacity ? `${product.storageSpecs.capacity} GB` : null,
      product.storageSpecs?.interface,
    ];
  }

  if (product.category === 'GPU') {
    return [
      product.gpuSpecs?.chipset,
      product.gpuSpecs?.vram ? `${product.gpuSpecs.vram} GB VRAM` : null,
      product.gpuSpecs?.length ? `${product.gpuSpecs.length} mm` : null,
    ];
  }

  if (product.category === 'COOLER') {
    return [
      normalizeCoolerType(product),
      product.coolerSpecs?.tdpCapacity ? `${product.coolerSpecs.tdpCapacity}W TDP` : null,
      product.coolerSpecs?.radiatorSize ? `${product.coolerSpecs.radiatorSize} mm` : null,
    ];
  }

  if (product.category === 'CASE') {
    return [
      product.caseSpecs?.maxGpuLength ? `GPU hasta ${product.caseSpecs.maxGpuLength} mm` : null,
      product.caseSpecs?.supportsTowerCooler === true
        ? 'Compatible con refrigeración de torre'
        : product.caseSpecs?.supportsTowerCooler === false
          ? 'No soporta refrigeración de torre'
          : null,
      caseIncludesPowerSupply(product) ? 'Incluye fuente' : null,
    ];
  }

  if (product.category === 'PSU') {
    return [
      product.psuSpecs?.wattage ? `${product.psuSpecs.wattage}W` : null,
      product.psuSpecs?.certification,
      product.psuSpecs?.modular,
    ];
  }

  return [];
}

export default function PCBuilderPage() {
  const router = useRouter();
  const { addItem } = useCartStore();
  const productsSectionRef = useRef<HTMLDivElement | null>(null);
  const hasRestoredStateRef = useRef(false);

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [page, setPage] = useState(1);
  const [build, setBuild] = useState<Record<string, any>>({});
  const [skipped, setSkipped] = useState<Record<string, SkippedStep>>({});
  const [backendValidation, setBackendValidation] = useState<BuildValidationResponse | null>(null);
  const [validatingBuild, setValidatingBuild] = useState(false);

  useEffect(() => {
    try {
      const rawState = window.sessionStorage.getItem(BUILDER_STORAGE_KEY);
      if (!rawState) {
        hasRestoredStateRef.current = true;
        return;
      }

      const parsedState = JSON.parse(rawState) as Partial<PersistedBuilderState>;
      const restoredPlatform =
        parsedState.selectedPlatform === 'INTEL' || parsedState.selectedPlatform === 'AMD'
          ? parsedState.selectedPlatform
          : null;
      const restoredStep = Number(parsedState.currentStep);
      const restoredPage = Number(parsedState.currentPage);

      setPlatform(restoredPlatform);
      setCurrentStep(
        Number.isInteger(restoredStep) && restoredStep >= 0 && restoredStep < STEPS.length
          ? restoredStep
          : 0,
      );
      setPage(Number.isInteger(restoredPage) && restoredPage > 0 ? restoredPage : 1);
      setBuild(
        parsedState.selectedProducts &&
          typeof parsedState.selectedProducts === 'object' &&
          !Array.isArray(parsedState.selectedProducts)
          ? parsedState.selectedProducts
          : {},
      );
      setSkipped(
        parsedState.skippedSteps &&
          typeof parsedState.skippedSteps === 'object' &&
          !Array.isArray(parsedState.skippedSteps)
          ? parsedState.skippedSteps
          : {},
      );
    } catch (error) {
      console.warn('No se pudo restaurar el estado de Arma tu PC.', error);
      window.sessionStorage.removeItem(BUILDER_STORAGE_KEY);
    } finally {
      hasRestoredStateRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (!hasRestoredStateRef.current) return;

    const stateToPersist: PersistedBuilderState = {
      selectedPlatform: platform,
      currentStep,
      selectedProducts: build,
      skippedSteps: skipped,
      currentPage: page,
    };

    window.sessionStorage.setItem(BUILDER_STORAGE_KEY, JSON.stringify(stateToPersist));
  }, [platform, currentStep, build, skipped, page]);

  useEffect(() => {
    api
      .get('/products')
      .then((res) => setProducts(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setPage(1);
  }, [
    platform,
    currentStep,
    build.cpu?.id,
    build.motherboard?.id,
    build.gpu?.id,
    build.cooler?.id,
    build.case?.id,
  ]);

  const getRequiredPsuWatts = () => calculateRecommendedPsuWatts(build);

  const getBuildValidationItems = () =>
    Object.values(build)
      .filter(Boolean)
      .map((product: any) => ({
        productId: String(product.id),
        category: String(product.category || '').toLowerCase(),
      }));

  const validateBuildWithBackend = async () => {
    const response = await api.post<BuildValidationResponse>('/builder/validate', {
      source: 'builder',
      items: getBuildValidationItems(),
    });
    setBackendValidation(response.data);
    return response.data;
  };

  useEffect(() => {
    if (currentStep !== STEPS.length - 1) {
      setBackendValidation(null);
      return;
    }

    const items = getBuildValidationItems();
    if (items.length === 0) {
      setBackendValidation(null);
      return;
    }

    let cancelled = false;
    setValidatingBuild(true);
    api
      .post<BuildValidationResponse>('/builder/validate', {
        source: 'builder',
        items,
      })
      .then((response) => {
        if (!cancelled) setBackendValidation(response.data);
      })
      .catch(() => {
        if (!cancelled) {
          setBackendValidation({
            compatible: false,
            errors: [
              {
                code: 'BACKEND_VALIDATION_UNAVAILABLE',
                message: 'No se pudo validar la compatibilidad con el servidor.',
              },
            ],
            warnings: [],
            summary: { estimatedPower: 0, recommendedPsu: 0 },
          });
        }
      })
      .finally(() => {
        if (!cancelled) setValidatingBuild(false);
      });

    return () => {
      cancelled = true;
    };
  }, [build, currentStep]);

  const getCompatibilityErrors = () => {
    const requiredWatts = getRequiredPsuWatts();
    return [
      ...validateCpuMotherboardCompatibility(build),
      ...validateCoolerCompatibility(build, skipped),
      ...validateCoolerCaseCompatibility(build, skipped),
      ...validateStorageCompatibility(build),
      ...validatePsuCompatibility(build, skipped, requiredWatts),
    ];
  };

  const getFilteredProducts = () => {
    const stepDef = STEPS[currentStep];
    if (!('category' in stepDef)) return [];

    let filtered = products.filter(
      (product) => product.category === stepDef.category && product.stock > 0,
    );

    if (stepDef.id === 'cpu') {
      filtered = filtered.filter((product) => cpuMatchesPlatform(product, platform));
    }

    if (stepDef.id === 'motherboard' && build.cpu) {
      const cpuSocket = build.cpu.cpuSpecs?.socket;
      filtered = filtered.filter(
        (product) => compactText(product.motherboardSpecs?.socket) === compactText(cpuSocket),
      );
    }

    if (stepDef.id === 'ram' && build.motherboard) {
      const moboRamType = build.motherboard.motherboardSpecs?.memoryType;
      filtered = filtered.filter(
        (product) => compactText(product.ramSpecs?.memoryType) === compactText(moboRamType),
      );
    }

    if (stepDef.id === 'storage' && build.motherboard) {
      filtered = filtered.filter((product) => {
        if (!isM2Storage(product)) return true;

        const m2Slots = Number(build.motherboard.motherboardSpecs?.m2Slots || 0);
        const supportedSizes = build.motherboard.motherboardSpecs?.supportedM2FormFactors || [];
        const storageSize = product.storageSpecs?.m2FormFactor;

        if (m2Slots <= 0) return false;
        return (
          !storageSize ||
          supportedSizes.length === 0 ||
          supportedSizes.some((size: string) => compactText(size) === compactText(storageSize))
        );
      });
    }

    if (stepDef.id === 'cooler' && build.cpu) {
      const cpuSocket = build.cpu.cpuSpecs?.socket;
      const cpuTdp = Number(build.cpu.cpuSpecs?.tdp || 0);
      filtered = filtered.filter((product) => {
        const coolerSockets = getCoolerSockets(product);
        const coolerTdp = Number(product.coolerSpecs?.tdpCapacity || 0);
        return (
          coolerSockets.some((socket) => compactText(socket) === compactText(cpuSocket)) &&
          (coolerTdp <= 0 || cpuTdp <= 0 || coolerTdp >= cpuTdp)
        );
      });
    }

    if (stepDef.id === 'case') {
      filtered = filtered.filter(
        (product) =>
          caseSupportsMotherboard(product, build.motherboard) &&
          caseSupportsGpu(product, build.gpu) &&
          caseSupportsCooler(product, build.cooler),
      );
    }

    if (stepDef.id === 'psu') {
      const requiredWatts = getRequiredPsuWatts();
      filtered = filtered.filter(
        (product) => Number(product.psuSpecs?.wattage || 0) >= requiredWatts,
      );
    }

    return filtered;
  };

  const canSkipStep = (stepId: StepId) => {
    if (stepId === 'gpu') return processorHasIntegratedGraphics(build.cpu);
    if (stepId === 'cooler') return processorIncludesCooler(build.cpu);
    if (stepId === 'psu') return caseIncludesPowerSupply(build.case);
    return false;
  };

  const getSkipReason = (stepId: StepId) => {
    if (stepId === 'gpu') return 'procesador con gráficos integrados';
    if (stepId === 'cooler') return 'procesador incluye cooler';
    if (stepId === 'psu') return 'case con fuente incluida';
    return '';
  };

  const resetBuildForPlatform = () => {
    setBuild({});
    setSkipped({});
    setBackendValidation(null);
    setCurrentStep(0);
    setPage(1);
  };

  const clearPersistedBuilderState = () => {
    window.sessionStorage.removeItem(BUILDER_STORAGE_KEY);
  };

  const handleSelectPlatform = (selectedPlatform: Platform) => {
    setPlatform(selectedPlatform);
    resetBuildForPlatform();
  };

  const handleChangePlatform = () => {
    clearPersistedBuilderState();
    setPlatform(null);
    resetBuildForPlatform();
  };

  const handleSelectComponent = (product: any) => {
    const stepDef = STEPS[currentStep];
    if (!('category' in stepDef)) return;

    setBuild((prev) => {
      const newBuild = { ...prev, [stepDef.id]: product };

      if (stepDef.id === 'cpu' && prev.cpu?.id !== product.id) {
        delete newBuild.motherboard;
        delete newBuild.ram;
        delete newBuild.storage;
        delete newBuild.gpu;
        delete newBuild.cooler;
        delete newBuild.case;
        delete newBuild.psu;
      }

      if (stepDef.id === 'motherboard' && prev.motherboard?.id !== product.id) {
        delete newBuild.ram;
        delete newBuild.storage;
        delete newBuild.case;
      }

      if (stepDef.id === 'gpu' && prev.gpu?.id !== product.id) {
        delete newBuild.case;
        delete newBuild.psu;
      }

      if (stepDef.id === 'cooler' && prev.cooler?.id !== product.id) {
        delete newBuild.case;
      }

      if (stepDef.id === 'case' && prev.case?.id !== product.id) {
        delete newBuild.psu;
      }

      return newBuild;
    });

    setSkipped((prev) => {
      const next = { ...prev };
      delete next[stepDef.id];
      if (stepDef.id === 'cpu') {
        delete next.gpu;
        delete next.cooler;
        delete next.psu;
      }
      if (stepDef.id === 'case') delete next.psu;
      return next;
    });
    setBackendValidation(null);
    setCurrentStep((prev) => prev + 1);
  };

  const goToStep = (stepIndex: number) => {
    if (stepIndex < currentStep) {
      setCurrentStep(stepIndex);
    }
  };

  const handleBack = () => {
    if (currentStep === 0) {
      handleChangePlatform();
      return;
    }

    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSkip = () => {
    const stepDef = STEPS[currentStep];
    if (!canSkipStep(stepDef.id)) return;

    setBuild((prev) => {
      const next = { ...prev };
      delete next[stepDef.id];
      return next;
    });
    setSkipped((prev) => ({
      ...prev,
      [stepDef.id]: { skipped: true, reason: getSkipReason(stepDef.id) },
    }));
    setBackendValidation(null);
    setCurrentStep((prev) => prev + 1);
  };

  const getMissingRequiredSteps = () =>
    STEPS.filter((step) => 'category' in step).filter((step) => {
      if (build[step.id]) return false;
      if (skipped[step.id] && canSkipStep(step.id)) return false;
      return true;
    });

  const handleAddToCart = async () => {
    const missingSteps = getMissingRequiredSteps();
    if (missingSteps.length > 0) {
      notify.error(
        `Completa los pasos obligatorios: ${missingSteps.map((step) => step.title).join(', ')}.`,
      );
      return;
    }

    const errors = getCompatibilityErrors();
    if (errors.length > 0) {
      notify.error(errors.join('\n'));
      return;
    }

    setValidatingBuild(true);
    try {
      const validation = await validateBuildWithBackend();
      if (!validation.compatible) {
        notify.error(validation.errors.map((error) => error.message).join('\n'));
        return;
      }
    } catch {
      notify.error('No se pudo validar la compatibilidad con el servidor.');
      return;
    } finally {
      setValidatingBuild(false);
    }

    Object.values(build).forEach((product) => {
      if (product) addItem({ ...product, source: 'builder' });
    });
    router.push('/carrito');
  };

  const handleRestart = async () => {
    const confirmed = await confirmAction({
      title: 'Reiniciar armado',
      message: '¿Estás seguro de querer reiniciar el armado de tu PC?',
      confirmText: 'Reiniciar',
    });

    if (!confirmed) return;

    clearPersistedBuilderState();
    setPlatform(null);
    setBuild({});
    setSkipped({});
    setBackendValidation(null);
    setCurrentStep(0);
    setPage(1);
  };

  const currentStepDef = STEPS[currentStep];
  const StepIcon = currentStepDef.icon;
  const filteredProducts = useMemo(getFilteredProducts, [products, platform, currentStep, build]);
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE));
  const paginatedProducts = filteredProducts.slice(
    (page - 1) * PRODUCTS_PER_PAGE,
    page * PRODUCTS_PER_PAGE,
  );
  const compatibilityErrors = getCompatibilityErrors();
  const backendErrorMessages = backendValidation?.errors.map((error) => error.message) ?? [];
  const backendWarningMessages =
    backendValidation?.warnings.map((warning) => warning.message) ?? [];

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const scrollToProductsSection = () => {
    window.requestAnimationFrame(() => {
      productsSectionRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  };

  const handleProductPageChange = (nextPage: number) => {
    const normalizedPage = Math.min(Math.max(1, nextPage), totalPages);
    if (normalizedPage === page) return;

    setPage(normalizedPage);
    scrollToProductsSection();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-xl font-bold text-brand-cyan animate-pulse">
        Cargando productos compatibles...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 md:py-10">
      <div className="container mx-auto max-w-6xl px-4">
        <div className="mb-8 text-center md:mb-10">
          <p className="mb-2 text-xs font-black uppercase tracking-[0.24em] text-brand-cyan">
            PCSystemStore
          </p>
          <h1 className="mb-2 text-4xl font-black tracking-tight text-gray-950 md:text-5xl">
            Arma tu <span className="text-brand-cyan">PC</span>
          </h1>
          <p className="text-gray-500">
            Elige cada componente en orden y valida compatibilidad antes de comprar.
          </p>

          {platform && (
            <div className="mt-8 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="mx-auto flex w-max min-w-full items-center justify-start gap-2 md:justify-center">
                {STEPS.filter((step) => 'category' in step).map((step, idx) => {
                  const isCompleted = idx < currentStep;
                  const isActive = idx === currentStep;
                  const isSkipped = Boolean(skipped[step.id]);

                  return (
                    <div key={step.id} className="flex shrink-0 items-center">
                      <button
                        type="button"
                        onClick={() => goToStep(idx)}
                        disabled={idx >= currentStep}
                        title={idx < currentStep ? `Volver a ${step.title}` : step.title}
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm font-black transition md:h-11 md:w-11 ${
                          isActive
                            ? 'border-gray-950 bg-gray-950 text-white ring-4 ring-cyan-100'
                            : isCompleted
                              ? isSkipped
                                ? 'border-amber-300 bg-amber-50 text-amber-700 hover:border-amber-400'
                                : 'border-brand-cyan bg-brand-cyan text-gray-950 hover:scale-105'
                              : 'border-gray-200 bg-gray-100 text-gray-400'
                        }`}
                      >
                        <step.icon size={18} />
                      </button>
                      <div className="ml-1.5 min-w-10 text-left md:min-w-12">
                        <p
                          className={`text-[10px] font-black uppercase leading-tight md:text-[11px] ${
                            isActive
                              ? 'text-gray-950'
                              : isCompleted
                                ? 'text-gray-700'
                                : 'text-gray-400'
                          }`}
                        >
                          {STEP_SHORT_LABELS[step.id] ?? step.title}
                        </p>
                      </div>
                      {idx < STEPS.filter((item) => 'category' in item).length - 1 && (
                        <div
                          className={`mx-2 h-1 w-5 rounded-full md:w-7 ${
                            idx < currentStep ? 'bg-brand-cyan' : 'bg-gray-200'
                          }`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="min-h-[520px]">
          {!platform && (
            <div className="animate-fade-in mx-auto max-w-4xl text-center">
              <h2 className="mb-3 text-3xl font-black text-gray-950">¿Qué bando eliges?</h2>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => handleSelectPlatform('INTEL')}
                  className="group flex min-h-56 flex-col items-center justify-center border border-gray-200 bg-gray-50 p-8 text-center transition hover:border-blue-500 hover:bg-blue-50/40"
                >
                  <h3 className="mb-2 text-4xl font-black tracking-widest text-blue-700">INTEL</h3>
                  <p className="font-semibold text-gray-500">Core i y Core Ultra</p>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectPlatform('AMD')}
                  className="group flex min-h-56 flex-col items-center justify-center border border-gray-200 bg-gray-50 p-8 text-center transition hover:border-red-500 hover:bg-red-50/40"
                >
                  <h3 className="mb-2 text-4xl font-black tracking-widest text-red-700">AMD</h3>
                  <p className="font-semibold text-gray-500">Ryzen y Threadripper</p>
                </button>
              </div>
            </div>
          )}

          {platform && currentStep < STEPS.length - 1 && (
            <div ref={productsSectionRef} className="animate-fade-in scroll-mt-28">
              <div className="mb-6 flex flex-col gap-4 border-b border-gray-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="mb-1 text-xs font-black uppercase tracking-[0.2em] text-brand-cyan">
                    Paso {currentStep + 1} de {STEPS.length - 1}
                  </p>
                  <h2 className="flex items-center gap-3 text-2xl font-black text-gray-900">
                    <StepIcon className="text-brand-cyan" />
                    Elige {currentStepDef.title}
                  </h2>
                  {currentStep === 0 && (
                    <p className="mt-2 text-sm font-semibold text-gray-500">
                      Plataforma seleccionada: <span className="text-gray-950">{platform}</span>
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                  {currentStep === 0 && (
                    <button
                      type="button"
                      onClick={handleChangePlatform}
                      className="text-sm font-bold text-gray-500 transition hover:text-brand-cyan"
                    >
                      Cambiar plataforma
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleBack}
                    className="inline-flex items-center gap-2 border border-gray-300 bg-gray-50 px-4 py-2 text-sm font-bold text-gray-700 transition hover:border-brand-cyan hover:text-brand-cyan"
                  >
                    <FiChevronLeft /> Regresar
                  </button>
                  {canSkipStep(currentStepDef.id) && (
                    <button
                      type="button"
                      onClick={handleSkip}
                      className="inline-flex items-center gap-2 bg-gray-950 px-4 py-2 text-sm font-black text-white transition hover:bg-brand-cyan hover:text-gray-950"
                    >
                      Omitir <FiChevronRight />
                    </button>
                  )}
                </div>
              </div>

              {filteredProducts.length === 0 ? (
                <div className="border-2 border-dashed border-gray-300 bg-gray-50 py-16 text-center">
                  <p className="text-lg font-semibold text-gray-500">
                    No hay productos compatibles en stock para esta selección.
                  </p>
                  <button
                    type="button"
                    onClick={handleBack}
                    className="mt-4 font-bold text-brand-cyan hover:underline"
                  >
                    Regresar al paso anterior
                  </button>
                </div>
              ) : (
                <>
                  <div className="mb-4 flex flex-col gap-2 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">
                    <span>
                      Mostrando {paginatedProducts.length} de {filteredProducts.length} opciones
                      compatibles.
                    </span>
                    <span className="font-bold text-gray-700">
                      Página {page} de {totalPages}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {paginatedProducts.map((product) => {
                      const specsSummary = getProductSpecsSummary(product).filter(Boolean);
                      const productPath = getProductPath(product);

                      return (
                        <div
                          key={product.id}
                          className="group flex min-h-[360px] flex-col border border-gray-200 bg-gray-50 p-4 transition hover:border-gray-500"
                        >
                          <Link
                            href={productPath}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Abrir detalle de ${product.name}`}
                            onClick={(event) => event.stopPropagation()}
                            className="mb-4 flex h-40 items-center justify-center border border-gray-200 bg-white/70 p-3"
                          >
                            {product.images?.[0] ? (
                              <img
                                src={product.images[0]}
                                alt={product.name}
                                className="max-h-full max-w-full object-contain mix-blend-multiply transition-transform group-hover:scale-105"
                              />
                            ) : (
                              <FiBox className="text-4xl text-gray-300" />
                            )}
                          </Link>

                          <Link
                            href={productPath}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Abrir detalle de ${product.name}`}
                            onClick={(event) => event.stopPropagation()}
                          >
                            <h3 className="mb-2 line-clamp-2 min-h-[44px] text-sm font-black leading-tight text-gray-900 transition-colors hover:text-brand-cyan">
                              {product.name}
                            </h3>
                          </Link>

                          <div className="mb-4 min-h-[48px] space-y-1 text-xs font-medium text-gray-500">
                            {specsSummary.slice(0, 3).map((spec) => (
                              <p key={String(spec)}>{spec}</p>
                            ))}
                          </div>

                          <div className="mt-auto flex items-end justify-between gap-3 border-t border-gray-200 pt-4">
                            <div>
                              <p className="text-[11px] font-bold uppercase text-gray-400">
                                Stock: {product.stock ?? 0}
                              </p>
                              <span className="text-xl font-black text-gray-950">
                                S/. {getEffectivePrice(product).toFixed(2)}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleSelectComponent(product)}
                              className="bg-gray-950 px-4 py-2 text-sm font-black text-white transition hover:bg-brand-cyan hover:text-gray-950"
                            >
                              Seleccionar
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {totalPages > 1 && (
                    <div className="mt-7 flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleProductPageChange(page - 1)}
                        disabled={page === 1}
                        className="border border-gray-300 px-4 py-2 text-sm font-bold text-gray-700 transition hover:border-brand-cyan hover:text-brand-cyan disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Anterior
                      </button>
                      <span className="min-w-28 text-center text-sm font-black text-gray-800">
                        Página {page} de {totalPages}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleProductPageChange(page + 1)}
                        disabled={page === totalPages}
                        className="border border-gray-300 px-4 py-2 text-sm font-bold text-gray-700 transition hover:border-brand-cyan hover:text-brand-cyan disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Siguiente
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {currentStep === STEPS.length - 1 && (
            <div className="animate-fade-in mx-auto max-w-4xl">
              <div className="mb-10 text-center">
                <div className="mb-4 inline-flex h-20 w-20 items-center justify-center border border-green-200 bg-green-50 text-green-500">
                  <FiCheckCircle size={40} />
                </div>
                <h2 className="text-3xl font-black text-gray-900">Tu PC está lista</h2>
                <p className="mt-2 text-gray-500">
                  Revisa el armado y agrega los componentes al carrito.
                </p>
              </div>

              <div className="mb-8 border border-gray-200 bg-gray-50 p-6 md:p-10">
                <div className="space-y-4">
                  {STEPS.filter((step) => 'category' in step).map((step) => {
                    const item = build[step.id];
                    const skippedStep = skipped[step.id];

                    return (
                      <div
                        key={step.id}
                        className="flex flex-col gap-3 border-b border-gray-200 pb-4 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center border border-gray-300 bg-white text-gray-400">
                            <step.icon size={20} />
                          </div>
                          <div>
                            <p className="text-xs font-black uppercase text-gray-400">
                              {step.title}
                            </p>
                            <p
                              className={`font-semibold ${
                                item
                                  ? 'text-gray-900'
                                  : skippedStep
                                    ? 'text-amber-700'
                                    : 'text-gray-400 italic'
                              }`}
                            >
                              {item
                                ? item.name
                                : skippedStep
                                  ? `Omitida (${skippedStep.reason})`
                                  : '(No seleccionado)'}
                            </p>
                          </div>
                        </div>
                        {item && (
                          <span className="font-black text-gray-950 sm:whitespace-nowrap">
                            S/. {getEffectivePrice(item).toFixed(2)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {compatibilityErrors.length > 0 && (
                  <div className="mt-6 border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                    {compatibilityErrors.map((error) => (
                      <p key={error}>{error}</p>
                    ))}
                  </div>
                )}

                {backendErrorMessages.length > 0 && (
                  <div className="mt-6 border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                    {backendErrorMessages.map((error) => (
                      <p key={error}>{error}</p>
                    ))}
                  </div>
                )}

                {backendWarningMessages.length > 0 && (
                  <div className="mt-6 border border-yellow-200 bg-yellow-50 p-4 text-sm font-semibold text-yellow-700">
                    {backendWarningMessages.map((warning) => (
                      <p key={warning}>{warning}</p>
                    ))}
                  </div>
                )}

                <div className="mt-8 flex items-end justify-between border-t-2 border-gray-200 pt-6">
                  <span className="font-black uppercase tracking-widest text-gray-500">
                    Total estimado
                  </span>
                  <span className="text-4xl font-black text-blue-600">
                    S/.{' '}
                    {Object.values(build)
                      .reduce((acc, item) => acc + (item ? getEffectivePrice(item) : 0), 0)
                      .toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex flex-col justify-center gap-4 sm:flex-row">
                <button
                  type="button"
                  onClick={handleRestart}
                  className="flex flex-1 items-center justify-center gap-2 border-2 border-gray-300 bg-white py-4 text-lg font-bold text-gray-700 transition hover:bg-gray-50"
                >
                  <FiRefreshCw /> Volver a armar
                </button>

                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={
                    validatingBuild ||
                    compatibilityErrors.length > 0 ||
                    backendValidation?.compatible === false
                  }
                  className="flex flex-1 items-center justify-center gap-2 bg-brand-cyan py-4 text-lg font-black text-gray-900 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
                >
                  <FiShoppingCart size={22} />{' '}
                  {validatingBuild ? 'Validando...' : 'Añadir al carrito'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
