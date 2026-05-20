import { create } from 'zustand';

interface BuilderState {
  selectedCpu: any | null; // Guardará el objeto del CPU elegido
  selectedMobo: any | null;
  step: number; // 1: CPU, 2: Mobo, 3: RAM

  // Acciones (Funciones para modificar el estado)
  setCpu: (cpu: any) => void;
  setMobo: (mobo: any) => void;
  reset: () => void;
}

export const useBuilderStore = create<BuilderState>((set) => ({
  selectedCpu: null,
  selectedMobo: null,
  step: 1, // Empezamos en el paso 1 (Elegir CPU)

  setCpu: (cpu) => set({ selectedCpu: cpu, step: 2 }), // Al elegir CPU, avanza al paso 2
  setMobo: (mobo) => set({ selectedMobo: mobo, step: 3 }), // Al elegir Mobo, avanza al paso 3

  reset: () => set({ selectedCpu: null, selectedMobo: null, step: 1 }),
}));
