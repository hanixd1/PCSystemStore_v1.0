'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  FiCpu,
  FiGrid,
  FiZap,
  FiMonitor,
  FiHardDrive,
  FiBox,
  FiCheckCircle,
  FiShoppingCart,
  FiRefreshCw,
  FiChevronRight,
  FiWind,
} from 'react-icons/fi';
import { useCartStore } from '@/store/useCartStore';
import { api } from '@/lib/api';
import { getEffectivePrice } from '@/lib/pricing';
import { calculateRecommendedPsuWatts } from '@/lib/products/psuRecommendation';

// Definición de los pasos del configurador
const STEPS = [
  { id: 'platform', title: 'Plataforma', icon: FiCpu },
  { id: 'cpu', title: 'Procesador', category: 'CPU', icon: FiCpu },
  { id: 'motherboard', title: 'Placa Madre', category: 'MOTHERBOARD', icon: FiGrid },
  { id: 'cooler', title: 'Refrigeracion', category: 'COOLER', icon: FiWind },
  { id: 'ram', title: 'Memoria RAM', category: 'RAM', icon: FiZap },
  { id: 'gpu', title: 'Tarjeta de Video', category: 'GPU', icon: FiMonitor, optional: true },
  { id: 'storage', title: 'Almacenamiento', category: 'STORAGE', icon: FiHardDrive },
  { id: 'psu', title: 'Fuente de Poder', category: 'PSU', icon: FiZap },
  { id: 'case', title: 'Gabinete', category: 'CASE', icon: FiBox },
  { id: 'summary', title: 'Resumen Final', icon: FiCheckCircle },
];

type BuildValidationResponse = {
  compatible: boolean;
  errors: { code: string; message: string; products?: string[] }[];
  warnings: { code: string; message: string; products?: string[] }[];
  summary: {
    estimatedPower: number;
    recommendedPsu: number;
  };
};

export default function PCBuilderPage() {
  const router = useRouter();
  const { addItem } = useCartStore();

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentStep, setCurrentStep] = useState(0);
  const [platform, setPlatform] = useState<'Intel' | 'AMD' | null>(null);
  const [build, setBuild] = useState<Record<string, any>>({});
  const [backendValidation, setBackendValidation] = useState<BuildValidationResponse | null>(null);
  const [validatingBuild, setValidatingBuild] = useState(false);

  useEffect(() => {
    api
      .get('/products')
      .then((res) => setProducts(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const getCoolerSockets = (product: any) => {
    const sockets = product.coolerSpecs?.compatibleSockets;
    if (Array.isArray(sockets) && sockets.length > 0) return sockets;
    return String(product.coolerSpecs?.socketSupport || '')
      .split(',')
      .map((socket) => socket.trim())
      .filter(Boolean);
  };

  const isM2Storage = (product: any) => {
    const type = String(product.storageSpecs?.type || '').toUpperCase();
    return type.includes('M.2') || type.includes('NVME');
  };

  const normalizeCoolerType = (product: any) => {
    const value = String(product.coolerSpecs?.type || '').toLowerCase();
    if (value === 'aio' || value.includes('liqu') || value.includes('líqu')) return 'Líquida';
    return 'Torre';
  };

  const getCaseMaxCoolerHeight = (product: any) => {
    const specs = product.caseSpecs || {};
    return Number(
      specs.maxCoolerHeightMm ?? specs.coolerHeightMm ?? specs.alturaMaximaCoolerMm ?? 0,
    );
  };

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
    const errors: string[] = [];
    const cpuSocket = build.cpu?.cpuSpecs?.socket;
    const cpuTdp = Number(build.cpu?.cpuSpecs?.tdp || 0);

    if (
      build.cpu &&
      build.motherboard &&
      cpuSocket !== build.motherboard.motherboardSpecs?.socket
    ) {
      errors.push('La placa madre no coincide con el socket del procesador.');
    }

    if (build.cpu && build.cooler) {
      const coolerSockets = getCoolerSockets(build.cooler);
      if (!coolerSockets.includes(cpuSocket)) {
        errors.push('El cooler seleccionado no es compatible con el socket del procesador.');
      }

      if (Number(build.cooler.coolerSpecs?.tdpCapacity || 0) < cpuTdp) {
        errors.push('El cooler seleccionado no soporta el TDP del procesador.');
      }
    }

    if (build.cooler && build.case) {
      const coolerType = normalizeCoolerType(build.cooler);
      if (coolerType === 'Torre') {
        const coolerHeight = Number(build.cooler.coolerSpecs?.coolerHeight || 0);
        const caseHeight = getCaseMaxCoolerHeight(build.case);
        if (coolerHeight > 0 && caseHeight > 0 && coolerHeight > caseHeight) {
          errors.push(
            `Este gabinete no soporta la altura del cooler seleccionado. El cooler requiere ${coolerHeight} mm y el gabinete soporta hasta ${caseHeight} mm.`,
          );
        }
      }

      if (coolerType === 'Líquida') {
        const radiatorSize = Number(build.cooler.coolerSpecs?.radiatorSize || 0);
        const caseRadiator = Number(build.case.caseSpecs?.radiatorSupportMm || 0);
        if (radiatorSize > 0 && caseRadiator > 0 && radiatorSize > caseRadiator) {
          errors.push(
            `Este gabinete no soporta el radiador seleccionado. El cooler requiere radiador de ${radiatorSize} mm y el gabinete soporta hasta ${caseRadiator} mm.`,
          );
        }
      }
    }

    if (build.motherboard && build.storage && isM2Storage(build.storage)) {
      const m2Slots = Number(build.motherboard.motherboardSpecs?.m2Slots || 0);
      const supportedSizes = build.motherboard.motherboardSpecs?.supportedM2FormFactors || [];
      const storageSize = build.storage.storageSpecs?.m2FormFactor;

      if (m2Slots <= 0) {
        errors.push('La placa madre no tiene slots M.2 para el almacenamiento seleccionado.');
      }

      if (storageSize && supportedSizes.length > 0 && !supportedSizes.includes(storageSize)) {
        errors.push('La placa madre no soporta el tamaño M.2 del almacenamiento seleccionado.');
      }
    }

    if (build.psu) {
      const requiredWatts = getRequiredPsuWatts();
      if (Number(build.psu.psuSpecs?.wattage || 0) < requiredWatts) {
        errors.push(
          `La fuente seleccionada no cubre el consumo estimado con margen de seguridad (${requiredWatts}W).`,
        );
      }
    }

    return errors;
  };

  // --- 1. LÓGICA DE FILTRADO MEJORADA (SOCKETS Y NOMBRES) ---
  const getFilteredProducts = () => {
    const stepDef = STEPS[currentStep];
    if (!stepDef.category) return [];

    let filtered = products.filter((p) => p.category === stepDef.category);

    if (stepDef.id === 'cpu' && platform) {
      filtered = filtered.filter((p) => {
        const name = p.name.toLowerCase();
        const socket = p.cpuSpecs?.socket?.toUpperCase() || '';
        const brand = p.cpuSpecs?.brand;
        if (brand) return brand === platform;

        // Filtro inteligente para AMD
        if (platform === 'AMD') {
          return (
            name.includes('amd') ||
            name.includes('ryzen') ||
            socket.includes('AM4') ||
            socket.includes('AM5')
          );
        }
        // Filtro inteligente para Intel
        else if (platform === 'Intel') {
          return name.includes('intel') || name.includes('core') || socket.includes('LGA');
        }
        return false;
      });
    }

    if (stepDef.id === 'motherboard' && build.cpu) {
      const cpuSocket = build.cpu.cpuSpecs?.socket;
      filtered = filtered.filter((p) => p.motherboardSpecs?.socket === cpuSocket);
    }

    if (stepDef.id === 'cooler' && build.cpu) {
      const cpuSocket = build.cpu.cpuSpecs?.socket;
      const cpuTdp = Number(build.cpu.cpuSpecs?.tdp || 0);
      filtered = filtered.filter((p) => {
        const coolerSockets = getCoolerSockets(p);
        const coolerTdp = Number(p.coolerSpecs?.tdpCapacity || 0);
        return coolerSockets.includes(cpuSocket) && coolerTdp >= cpuTdp;
      });
    }

    if (stepDef.id === 'ram' && build.motherboard) {
      const moboRamType = build.motherboard.motherboardSpecs?.memoryType;
      filtered = filtered.filter((p) => p.ramSpecs?.memoryType === moboRamType);
    }

    if (stepDef.id === 'storage' && build.motherboard) {
      filtered = filtered.filter((p) => {
        if (!isM2Storage(p)) return true;

        const m2Slots = Number(build.motherboard.motherboardSpecs?.m2Slots || 0);
        const supportedSizes = build.motherboard.motherboardSpecs?.supportedM2FormFactors || [];
        const storageSize = p.storageSpecs?.m2FormFactor;

        if (m2Slots <= 0) return false;
        return !storageSize || supportedSizes.length === 0 || supportedSizes.includes(storageSize);
      });
    }

    if (stepDef.id === 'psu') {
      const requiredWatts = getRequiredPsuWatts();
      filtered = filtered.filter((p) => Number(p.psuSpecs?.wattage || 0) >= requiredWatts);
    }

    if (stepDef.id === 'case' && build.cooler) {
      const coolerType = normalizeCoolerType(build.cooler);
      filtered = filtered.filter((p) => {
        if (coolerType === 'Torre') {
          const coolerHeight = Number(build.cooler.coolerSpecs?.coolerHeight || 0);
          const caseHeight = getCaseMaxCoolerHeight(p);
          return coolerHeight <= 0 || caseHeight <= 0 || coolerHeight <= caseHeight;
        }

        const radiatorSize = Number(build.cooler.coolerSpecs?.radiatorSize || 0);
        const caseRadiator = Number(p.caseSpecs?.radiatorSupportMm || 0);
        return radiatorSize <= 0 || caseRadiator <= 0 || radiatorSize <= caseRadiator;
      });
    }

    return filtered;
  };

  // --- 2. NAVEGACIÓN Y SELECCIÓN ---
  const handleSelectPlatform = (selected: 'Intel' | 'AMD') => {
    if (selected !== platform) {
      setBuild({}); // Si cambia de bando, limpiamos todo
      setBackendValidation(null);
    }
    setPlatform(selected);
    setCurrentStep(1);
  };

  const handleSelectComponent = (product: any) => {
    const stepDef = STEPS[currentStep];

    setBuild((prev) => {
      const newBuild = { ...prev, [stepDef.id]: product };
      // Seguridad: Si cambia de CPU, borramos placa y ram para evitar incompatibilidad
      if (stepDef.id === 'cpu' && prev.cpu?.id !== product.id) {
        delete newBuild.motherboard;
        delete newBuild.cooler;
        delete newBuild.ram;
        delete newBuild.storage;
        delete newBuild.psu;
      }
      // Si cambia de placa, borramos la RAM
      if (stepDef.id === 'motherboard' && prev.motherboard?.id !== product.id) {
        delete newBuild.ram;
        delete newBuild.storage;
      }
      if (stepDef.id === 'gpu' && prev.gpu?.id !== product.id) {
        delete newBuild.psu;
      }
      return newBuild;
    });
    setBackendValidation(null);

    setCurrentStep((prev) => prev + 1);
  };

  const goToStep = (stepIndex: number) => {
    // Solo permitir volver a pasos anteriores
    if (stepIndex < currentStep) {
      setCurrentStep(stepIndex);
    }
  };

  const handleSkip = () => setCurrentStep((prev) => prev + 1);

  const handleAddToCart = async () => {
    const errors = getCompatibilityErrors();
    if (errors.length > 0) {
      alert(errors.join('\n'));
      return;
    }

    setValidatingBuild(true);
    try {
      const validation = await validateBuildWithBackend();
      if (!validation.compatible) {
        alert(validation.errors.map((error) => error.message).join('\n'));
        return;
      }
    } catch {
      alert('No se pudo validar la compatibilidad con el servidor.');
      return;
    } finally {
      setValidatingBuild(false);
    }

    Object.values(build).forEach((product) => {
      if (product) addItem({ ...product, source: 'builder' });
    });
    alert('¡PC completa añadida al carrito! 🚀');
    router.push('/carrito');
  };

  const handleRestart = () => {
    if (confirm('¿Estás seguro de querer reiniciar la configuración?')) {
      setPlatform(null);
      setBuild({});
      setBackendValidation(null);
      setCurrentStep(0);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center font-bold text-xl text-brand-cyan animate-pulse">
        Cargando arsenal...
      </div>
    );

  const currentStepDef = STEPS[currentStep];
  const StepIcon = currentStepDef.icon;
  const filteredProducts = getFilteredProducts();
  const compatibilityErrors = getCompatibilityErrors();
  const backendErrorMessages = backendValidation?.errors.map((error) => error.message) ?? [];
  const backendWarningMessages =
    backendValidation?.warnings.map((warning) => warning.message) ?? [];

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* CABECERA Y PROGRESO CLICKEABLE */}
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-black text-gray-900 mb-2 tracking-tight">
            Arma tu <span className="text-brand-cyan">PC Ideal</span>
          </h1>
          <p className="text-gray-500">Nos aseguramos de que todo sea 100% compatible.</p>

          <div className="flex items-center justify-center mt-8 overflow-x-auto pb-4 gap-2">
            {STEPS.map((step, idx) => (
              <div key={step.id} className="flex items-center">
                <button
                  onClick={() => goToStep(idx)}
                  disabled={idx >= currentStep}
                  title={idx < currentStep ? `Volver a ${step.title}` : ''}
                  className={`flex items-center justify-center w-10 h-10 rounded-full font-bold transition-all ${
                    idx < currentStep
                      ? 'bg-brand-cyan text-gray-900 cursor-pointer hover:scale-110 shadow-md'
                      : idx === currentStep
                        ? 'bg-gray-900 text-white ring-4 ring-gray-200 cursor-default'
                        : 'bg-gray-200 text-gray-400 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <step.icon size={18} />
                </button>
                {idx < STEPS.length - 1 && (
                  <div
                    className={`w-8 md:w-16 h-1 mx-2 rounded ${idx < currentStep ? 'bg-brand-cyan' : 'bg-gray-200'}`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 md:p-10 min-h-[500px]">
          {/* PASO 0: ELEGIR PLATAFORMA */}
          {currentStep === 0 && (
            <div className="text-center animate-fade-in">
              <h2 className="text-2xl font-bold text-gray-800 mb-8">¿Qué bando eliges?</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
                <button
                  onClick={() => handleSelectPlatform('Intel')}
                  className="group relative border-2 border-gray-200 rounded-2xl p-10 hover:border-blue-500 hover:bg-blue-50 transition-all overflow-hidden"
                >
                  <div className="absolute inset-0 bg-blue-500 opacity-0 group-hover:opacity-10 transition-opacity"></div>
                  <h3 className="text-3xl font-black text-blue-600 tracking-widest mb-2">INTEL</h3>
                  <p className="text-gray-500 font-medium">Core i3, i5, i7, i9</p>
                </button>

                <button
                  onClick={() => handleSelectPlatform('AMD')}
                  className="group relative border-2 border-gray-200 rounded-2xl p-10 hover:border-red-500 hover:bg-red-50 transition-all overflow-hidden"
                >
                  <div className="absolute inset-0 bg-red-500 opacity-0 group-hover:opacity-10 transition-opacity"></div>
                  <h3 className="text-3xl font-black text-red-600 tracking-widest mb-2">AMD</h3>
                  <p className="text-gray-500 font-medium">Ryzen 5, 7, 9</p>
                </button>
              </div>
            </div>
          )}

          {/* PASOS DEL 1 AL 7: SELECCIÓN DE COMPONENTES */}
          {currentStep > 0 && currentStep < STEPS.length - 1 && (
            <div className="animate-fade-in">
              <div className="flex justify-between items-center mb-6 border-b pb-4">
                <h2 className="text-2xl font-bold flex items-center gap-3 text-gray-800">
                  <StepIcon className="text-brand-cyan" />
                  Elige tu {currentStepDef.title}
                </h2>
                {currentStepDef.optional && (
                  <button
                    onClick={handleSkip}
                    className="text-sm font-bold text-gray-400 hover:text-gray-800 transition flex items-center gap-1"
                  >
                    Omitir paso <FiChevronRight />
                  </button>
                )}
              </div>

              {filteredProducts.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                  <p className="text-lg text-gray-500 font-medium">
                    No hay componentes compatibles en stock para esta selección.
                  </p>
                  <button
                    onClick={() => setCurrentStep((prev) => prev - 1)}
                    className="mt-4 text-brand-cyan font-bold hover:underline"
                  >
                    Regresar al paso anterior
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredProducts.map((product) => (
                    <div
                      key={product.id}
                      className="border border-gray-200 rounded-xl p-5 hover:shadow-lg transition-all flex flex-col group bg-white"
                    >
                      <div className="h-40 bg-gray-50 rounded-lg mb-4 p-2 flex items-center justify-center">
                        {product.images?.[0] ? (
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="max-h-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform"
                          />
                        ) : (
                          <FiBox className="text-4xl text-gray-300" />
                        )}
                      </div>
                      <h3 className="font-bold text-gray-800 leading-tight mb-2 line-clamp-2">
                        {product.name}
                      </h3>

                      <div className="text-xs text-gray-500 mb-4 space-y-1">
                        {product.category === 'CPU' && (
                          <p>
                            🔌 Socket: {product.cpuSpecs?.socket} | ⚙️ {product.cpuSpecs?.cores}{' '}
                            Núcleos
                          </p>
                        )}
                        {product.category === 'MOTHERBOARD' && (
                          <p>
                            🔌 Socket: {product.motherboardSpecs?.socket} | ⚡{' '}
                            {product.motherboardSpecs?.memoryType}
                          </p>
                        )}
                        {product.category === 'RAM' && (
                          <p>
                            ⚡ {product.ramSpecs?.memoryType} | 💽 {product.ramSpecs?.capacity}GB a{' '}
                            {product.ramSpecs?.speed}MHz
                          </p>
                        )}
                      </div>

                      <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-100">
                        <span className="text-xl font-black text-gray-900">
                          S/. {getEffectivePrice(product).toFixed(2)}
                        </span>
                        <button
                          onClick={() => handleSelectComponent(product)}
                          className="bg-gray-900 text-white px-4 py-2 rounded-lg font-bold hover:bg-brand-cyan hover:text-gray-900 transition"
                        >
                          Seleccionar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* PASO 8: RESUMEN FINAL */}
          {currentStep === STEPS.length - 1 && (
            <div className="animate-fade-in max-w-4xl mx-auto">
              <div className="text-center mb-10">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 text-green-500 rounded-full mb-4">
                  <FiCheckCircle size={40} />
                </div>
                <h2 className="text-3xl font-black text-gray-800">¡Tu PC está lista! 🚀</h2>
                <p className="text-gray-500 mt-2">Revisa tu configuración y procede a la compra.</p>
              </div>

              <div className="bg-gray-50 rounded-2xl p-6 md:p-10 border border-gray-200 shadow-inner mb-8">
                <div className="space-y-4">
                  {STEPS.filter((s) => s.category).map((step) => {
                    const item = build[step.id];
                    return (
                      <div
                        key={step.id}
                        className="flex justify-between items-center border-b border-gray-200 pb-4 last:border-0 last:pb-0"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm text-gray-400">
                            <step.icon size={20} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-gray-400 uppercase">
                              {step.title}
                            </p>
                            <p
                              className={`font-medium ${item ? 'text-gray-900' : 'text-gray-400 italic'}`}
                            >
                              {item ? item.name : '(No seleccionado)'}
                            </p>
                          </div>
                        </div>
                        {item && (
                          <span className="font-bold text-gray-900 whitespace-nowrap">
                            S/. {getEffectivePrice(item).toFixed(2)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {compatibilityErrors.length > 0 && (
                  <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                    {compatibilityErrors.map((error) => (
                      <p key={error}>{error}</p>
                    ))}
                  </div>
                )}

                {backendErrorMessages.length > 0 && (
                  <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                    {backendErrorMessages.map((error) => (
                      <p key={error}>{error}</p>
                    ))}
                  </div>
                )}

                {backendWarningMessages.length > 0 && (
                  <div className="mt-6 rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm font-semibold text-yellow-700">
                    {backendWarningMessages.map((warning) => (
                      <p key={warning}>{warning}</p>
                    ))}
                  </div>
                )}

                <div className="mt-8 pt-6 border-t-2 border-gray-200 flex justify-between items-end">
                  <span className="text-gray-500 font-bold uppercase tracking-widest">
                    Total Estimado
                  </span>
                  <span className="text-4xl font-black text-blue-600">
                    S/.{' '}
                    {Object.values(build)
                      .reduce((acc, item) => acc + (item ? getEffectivePrice(item) : 0), 0)
                      .toFixed(2)}
                  </span>
                </div>
              </div>

              {/* BOTONES FINALES */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={handleRestart}
                  className="flex-1 bg-white border-2 border-gray-300 text-gray-700 py-4 rounded-xl font-bold text-lg hover:bg-gray-50 transition flex items-center justify-center gap-2"
                >
                  <FiRefreshCw /> Volver a armar
                </button>

                <button
                  onClick={handleAddToCart}
                  disabled={
                    validatingBuild ||
                    compatibilityErrors.length > 0 ||
                    backendValidation?.compatible === false
                  }
                  className="flex-1 bg-brand-cyan text-gray-900 py-4 rounded-xl font-black text-lg hover:bg-cyan-400 transition shadow-xl shadow-brand-cyan/30 flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none"
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
