'use client';

import { FiBarChart2 } from 'react-icons/fi';

export default function EstadisticaPage() {
  return (
    <div className="max-w-7xl mx-auto pb-20">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-black rounded-xl text-white shadow-lg">
          <FiBarChart2 size={24} />
        </div>
        <div>
          <h1 className="text-3xl font-black text-gray-800">Estadistica</h1>
          <p className="text-gray-500 font-medium">
            Aqui ira el modulo de graficos y recomendaciones de reposicion.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <div className="border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center bg-gray-50">
          <p className="text-lg font-black text-gray-700 mb-2">Graficos no ma</p>
          <p className="text-sm text-gray-500">
            Este espacio quedara listo para mostrar ventas, rotacion de productos y alertas de stock.
          </p>
        </div>
      </div>
    </div>
  );
}
