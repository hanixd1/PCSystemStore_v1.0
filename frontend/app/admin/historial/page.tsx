'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { FiActivity, FiClock, FiBox, FiUser } from 'react-icons/fi';

export default function HistorialPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/users/audit/logs')
      .then(res => setLogs(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const getActionColor = (action: string) => {
    if(action.includes('CREATE')) return 'bg-green-100 text-green-700 border-green-200';
    if(action.includes('UPDATE')) return 'bg-blue-100 text-blue-700 border-blue-200';
    if(action.includes('DELETE')) return 'bg-red-100 text-red-700 border-red-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  return (
    <div className="max-w-7xl mx-auto pb-20">
      
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-black rounded-xl text-white shadow-lg">
          <FiActivity size={24} />
        </div>
        <div>
          <h1 className="text-3xl font-black text-gray-800">Historial de Auditoría</h1>
          <p className="text-gray-500 font-medium">Monitorea todos los cambios realizados en la tienda</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        {loading ? <p className="text-center text-gray-500 font-bold p-10">Cargando registros...</p> : 
         logs.length === 0 ? <p className="text-center text-gray-500 font-bold p-10">No hay acciones registradas aún.</p> : (
          <div className="space-y-4">
            {logs.map((log) => (
              <div key={log.id} className="flex gap-4 items-start p-4 hover:bg-gray-50 rounded-xl transition border border-transparent hover:border-gray-100">
                
                <div className={`p-3 rounded-full border ${getActionColor(log.action)}`}>
                  {log.entity === 'PRODUCT' ? <FiBox size={20} /> : <FiUser size={20} />}
                </div>

                <div className="flex-1">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-bold text-gray-800">
                      {log.user?.name || 'Sistema'} <span className="text-gray-400 font-normal text-sm ml-2">ejecutó una acción</span>
                    </h3>
                    <span className="flex items-center gap-1 text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-md">
                      <FiClock /> {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm">{log.details}</p>
                  <div className="mt-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                      {log.action}_{log.entity}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
