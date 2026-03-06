'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { 
  FiCpu, FiGrid, FiZap, FiMonitor, FiHardDrive, 
  FiBox, FiCheckCircle, FiShoppingCart, FiRefreshCw, FiChevronRight 
} from 'react-icons/fi';
import { useCartStore } from '@/store/useCartStore';

// Definición de los pasos del configurador
const STEPS = [
  { id: 'platform', title: 'Plataforma', icon: FiCpu },
  { id: 'cpu', title: 'Procesador', category: 'CPU', icon: FiCpu },
  { id: 'motherboard', title: 'Placa Madre', category: 'MOTHERBOARD', icon: FiGrid },
  { id: 'ram', title: 'Memoria RAM', category: 'RAM', icon: FiZap },
  { id: 'gpu', title: 'Tarjeta de Video', category: 'GPU', icon: FiMonitor, optional: true },
  { id: 'storage', title: 'Almacenamiento', category: 'STORAGE', icon: FiHardDrive },
  { id: 'psu', title: 'Fuente de Poder', category: 'PSU', icon: FiZap },
  { id: 'case', title: 'Gabinete', category: 'CASE', icon: FiBox },
  { id: 'summary', title: 'Resumen Final', icon: FiCheckCircle }
];

export default function PCBuilderPage() {
  const router = useRouter();
  const { addItem } = useCartStore();
  
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [currentStep, setCurrentStep] = useState(0);
  const [platform, setPlatform] = useState<'Intel' | 'AMD' | null>(null);
  const [build, setBuild] = useState<Record<string, any>>({});

  useEffect(() => {
    axios.get('https://pcsystemstore.onrender.com')
      .then(res => setProducts(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  // --- 1. LÓGICA DE FILTRADO MEJORADA (SOCKETS Y NOMBRES) ---
  const getFilteredProducts = () => {
    const stepDef = STEPS[currentStep];
    if (!stepDef.category) return [];

    let filtered = products.filter(p => p.category === stepDef.category);

    if (stepDef.id === 'cpu' && platform) {
      filtered = filtered.filter(p => {
        const name = p.name.toLowerCase();
        const socket = p.cpuSpecs?.socket?.toUpperCase() || '';
        
        // Filtro inteligente para AMD
        if (platform === 'AMD') {
          return name.includes('amd') || name.includes('ryzen') || socket.includes('AM4') || socket.includes('AM5');
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
      filtered = filtered.filter(p => p.motherboardSpecs?.socket === cpuSocket);
    }

    if (stepDef.id === 'ram' && build.motherboard) {
      const moboRamType = build.motherboard.motherboardSpecs?.memoryType;
      filtered = filtered.filter(p => p.ramSpecs?.memoryType === moboRamType);
    }

    return filtered;
  };

  // --- 2. NAVEGACIÓN Y SELECCIÓN ---
  const handleSelectPlatform = (selected: 'Intel' | 'AMD') => {
    if (selected !== platform) {
      setBuild({}); // Si cambia de bando, limpiamos todo
    }
    setPlatform(selected);
    setCurrentStep(1);
  };

  const handleSelectComponent = (product: any) => {
    const stepDef = STEPS[currentStep];
    
    setBuild(prev => {
      const newBuild = { ...prev, [stepDef.id]: product };
      // Seguridad: Si cambia de CPU, borramos placa y ram para evitar incompatibilidad
      if (stepDef.id === 'cpu' && prev.cpu?.id !== product.id) {
        delete newBuild.motherboard;
        delete newBuild.ram;
      }
      // Si cambia de placa, borramos la RAM
      if (stepDef.id === 'motherboard' && prev.motherboard?.id !== product.id) {
        delete newBuild.ram;
      }
      return newBuild;
    });
    
    setCurrentStep(prev => prev + 1);
  };

  const goToStep = (stepIndex: number) => {
    // Solo permitir volver a pasos anteriores
    if (stepIndex < currentStep) {
      setCurrentStep(stepIndex);
    }
  };

  const handleSkip = () => setCurrentStep(prev => prev + 1);

  const handleAddToCart = () => {
    Object.values(build).forEach(product => {
      if (product) addItem(product);
    });
    alert('¡PC completa añadida al carrito! 🚀');
    router.push('/carrito');
  };

  const handleRestart = () => {
    if (confirm('¿Estás seguro de querer reiniciar la configuración?')) {
      setPlatform(null);
      setBuild({});
      setCurrentStep(0);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-xl text-brand-cyan animate-pulse">Cargando arsenal...</div>;

  const currentStepDef = STEPS[currentStep];
  const StepIcon = currentStepDef.icon;
  const filteredProducts = getFilteredProducts();

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="container mx-auto px-4 max-w-6xl">
        
        {/* CABECERA Y PROGRESO CLICKEABLE */}
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-black text-gray-900 mb-2 tracking-tight">Arma tu <span className="text-brand-cyan">PC Ideal</span></h1>
          <p className="text-gray-500">Nos aseguramos de que todo sea 100% compatible.</p>
          
          <div className="flex items-center justify-center mt-8 overflow-x-auto pb-4 gap-2">
            {STEPS.map((step, idx) => (
              <div key={step.id} className="flex items-center">
                <button 
                  onClick={() => goToStep(idx)}
                  disabled={idx >= currentStep}
                  title={idx < currentStep ? `Volver a ${step.title}` : ''}
                  className={`flex items-center justify-center w-10 h-10 rounded-full font-bold transition-all ${
                    idx < currentStep ? 'bg-brand-cyan text-gray-900 cursor-pointer hover:scale-110 shadow-md' : 
                    idx === currentStep ? 'bg-gray-900 text-white ring-4 ring-gray-200 cursor-default' : 'bg-gray-200 text-gray-400 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <step.icon size={18} />
                </button>
                {idx < STEPS.length - 1 && (
                  <div className={`w-8 md:w-16 h-1 mx-2 rounded ${idx < currentStep ? 'bg-brand-cyan' : 'bg-gray-200'}`} />
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
                  <button onClick={handleSkip} className="text-sm font-bold text-gray-400 hover:text-gray-800 transition flex items-center gap-1">
                    Omitir paso <FiChevronRight />
                  </button>
                )}
              </div>

              {filteredProducts.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                  <p className="text-lg text-gray-500 font-medium">No hay componentes compatibles en stock para esta selección.</p>
                  <button onClick={() => setCurrentStep(prev => prev - 1)} className="mt-4 text-brand-cyan font-bold hover:underline">
                    Regresar al paso anterior
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredProducts.map(product => (
                    <div key={product.id} className="border border-gray-200 rounded-xl p-5 hover:shadow-lg transition-all flex flex-col group bg-white">
                      <div className="h-40 bg-gray-50 rounded-lg mb-4 p-2 flex items-center justify-center">
                        {product.images?.[0] ? (
                          <img src={product.images[0]} alt={product.name} className="max-h-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform" />
                        ) : <FiBox className="text-4xl text-gray-300" />}
                      </div>
                      <h3 className="font-bold text-gray-800 leading-tight mb-2 line-clamp-2">{product.name}</h3>
                      
                      <div className="text-xs text-gray-500 mb-4 space-y-1">
                        {product.category === 'CPU' && <p>🔌 Socket: {product.cpuSpecs?.socket} | ⚙️ {product.cpuSpecs?.cores} Núcleos</p>}
                        {product.category === 'MOTHERBOARD' && <p>🔌 Socket: {product.motherboardSpecs?.socket} | ⚡ {product.motherboardSpecs?.memoryType}</p>}
                        {product.category === 'RAM' && <p>⚡ {product.ramSpecs?.memoryType} | 💽 {product.ramSpecs?.capacity}GB a {product.ramSpecs?.speed}MHz</p>}
                      </div>

                      <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-100">
                        <span className="text-xl font-black text-gray-900">S/. {Number(product.price).toFixed(2)}</span>
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
                  {STEPS.filter(s => s.category).map(step => {
                    const item = build[step.id];
                    return (
                      <div key={step.id} className="flex justify-between items-center border-b border-gray-200 pb-4 last:border-0 last:pb-0">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm text-gray-400">
                            <step.icon size={20} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-gray-400 uppercase">{step.title}</p>
                            <p className={`font-medium ${item ? 'text-gray-900' : 'text-gray-400 italic'}`}>
                              {item ? item.name : '(No seleccionado)'}
                            </p>
                          </div>
                        </div>
                        {item && <span className="font-bold text-gray-900 whitespace-nowrap">S/. {Number(item.price).toFixed(2)}</span>}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-8 pt-6 border-t-2 border-gray-200 flex justify-between items-end">
                  <span className="text-gray-500 font-bold uppercase tracking-widest">Total Estimado</span>
                  <span className="text-4xl font-black text-blue-600">
                    S/. {Object.values(build).reduce((acc, item) => acc + (item ? Number(item.price) : 0), 0).toFixed(2)}
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
                  className="flex-1 bg-brand-cyan text-gray-900 py-4 rounded-xl font-black text-lg hover:bg-cyan-400 transition shadow-xl shadow-brand-cyan/30 flex items-center justify-center gap-2"
                >
                  <FiShoppingCart size={22} /> Añadir al carrito
                </button>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}