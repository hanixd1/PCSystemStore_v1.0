'use client';

import { useEffect, useMemo, useState } from 'react';
import { FiAlertTriangle } from 'react-icons/fi';
import { api, getApiErrorMessage } from '@/lib/api';

type Order = {
  id: string;
  status: string;
  total: string | number;
  createdAt: string;
  payments?: Array<{ method: string; status: string }>;
};

type OrderTab = 'pending' | 'delivered' | 'cancelled' | 'all';

const tabs: Array<{ key: OrderTab; label: string }> = [
  { key: 'pending', label: 'Pendientes' },
  { key: 'delivered', label: 'Entregados' },
  { key: 'cancelled', label: 'Cancelados' },
  { key: 'all', label: 'Todos' },
];

const statusLabels: Record<string, string> = {
  PENDING_PAYMENT: 'Pendiente de pago',
  PENDING_REVIEW: 'En revisión',
  PAID: 'Pagado',
  DELIVERED: 'Entregado',
  COMPLETED: 'Completado',
  REJECTED: 'Rechazado',
  CANCELLED: 'Cancelado',
  EXPIRED: 'Expirado',
};

const methodLabels: Record<string, string> = {
  CARD_CREDIT: 'Tarjeta de crédito',
  CARD_DEBIT: 'Tarjeta de débito',
  YAPE: 'Yape',
  PLIN: 'Plin',
};

function orderMatchesTab(order: Order, tab: OrderTab) {
  if (tab === 'all') return true;
  if (tab === 'pending') return ['PENDING_PAYMENT', 'PENDING_REVIEW'].includes(order.status);
  if (tab === 'delivered') return ['PAID', 'DELIVERED', 'COMPLETED'].includes(order.status);
  return ['REJECTED', 'CANCELLED', 'EXPIRED'].includes(order.status);
}

export default function AccountOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<OrderTab>('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    const loadOrders = async () => {
      try {
        const res = await api.get('/users/me/orders');
        if (mounted) setOrders(res.data);
      } catch (error) {
        if (mounted) setError(getApiErrorMessage(error, 'No se pudieron cargar tus pedidos.'));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void loadOrders();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredOrders = useMemo(
    () => orders.filter((order) => orderMatchesTab(order, activeTab)),
    [activeTab, orders],
  );

  return (
    <div>
      <h1 className="text-3xl font-black text-gray-900">Mis pedidos</h1>

      <div className="mt-5 flex gap-8 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={[
              'border-b-4 pb-3 text-sm transition',
              activeTab === tab.key
                ? 'border-brand-cyan font-black text-gray-900'
                : 'border-transparent font-medium text-gray-500 hover:text-brand-cyan',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="mt-10 flex justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-brand-cyan" />
        </div>
      ) : error ? (
        <p className="mt-6 rounded-xl bg-red-50 p-4 text-sm font-bold text-red-700">{error}</p>
      ) : filteredOrders.length === 0 ? (
        <div className="mt-0 flex items-center gap-4 bg-yellow-50 px-4 py-4 text-sm font-medium text-gray-800">
          <FiAlertTriangle className="text-2xl text-yellow-600" />
          No ha realizado ningún pedido.
        </div>
      ) : (
        <div className="mt-8 overflow-hidden rounded-2xl border border-gray-200">
          <div className="hidden grid-cols-[1.2fr_1fr_1fr_1fr_1fr_0.8fr] bg-gray-900 px-5 py-3 text-xs font-black uppercase tracking-wide text-white md:grid">
            <span>N° pedido</span>
            <span>Fecha</span>
            <span>Estado</span>
            <span>Total</span>
            <span>Método</span>
            <span>Acción</span>
          </div>
          <div className="divide-y divide-gray-100">
            {filteredOrders.map((order) => {
              const payment = order.payments?.[0];
              return (
                <div
                  key={order.id}
                  className="grid gap-2 px-5 py-4 text-sm md:grid-cols-[1.2fr_1fr_1fr_1fr_1fr_0.8fr]"
                >
                  <span className="font-bold text-gray-900">
                    #{order.id.slice(0, 8).toUpperCase()}
                  </span>
                  <span className="text-gray-600">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </span>
                  <span className="font-bold text-brand-cyan">
                    {statusLabels[order.status] || order.status}
                  </span>
                  <span className="font-black text-gray-900">
                    S/. {Number(order.total).toFixed(2)}
                  </span>
                  <span className="text-gray-600">
                    {payment ? methodLabels[payment.method] || payment.method : 'Pendiente'}
                  </span>
                  <button className="text-left font-bold text-brand-cyan hover:underline">
                    Ver detalle
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
