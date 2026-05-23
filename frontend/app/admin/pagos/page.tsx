'use client';

import { useEffect, useRef, useState } from 'react';
import { FiCheck, FiRefreshCw, FiX } from 'react-icons/fi';
import { api, getApiErrorMessage } from '@/lib/api';
import { createIdempotencyKey, IDEMPOTENCY_HEADER } from '@/lib/idempotency';

type PendingPayment = {
  id: string;
  method: 'YAPE' | 'PLIN';
  status: string;
  amount: string | number;
  operationCode?: string;
  createdAt: string;
  order: {
    id: string;
    user?: { name: string; email: string } | null;
    items: Array<{
      productNameSnapshot: string;
      quantity: number;
      subtotal: string | number;
    }>;
  };
};

const ONLINE_PAYMENTS_ENABLED = process.env.NEXT_PUBLIC_PAYMENTS_ENABLED === 'true';

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PendingPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const actionKeysRef = useRef<Record<string, string>>({});

  const loadPayments = async () => {
    setLoading(true);
    setMessage('');

    try {
      const res = await api.get('/admin/payments/pending');
      setPayments(res.data);
    } catch (error) {
      setMessage(getApiErrorMessage(error, 'No se pudieron cargar los pagos pendientes.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  const updatePayment = async (id: string, action: 'approve' | 'reject') => {
    const actionKey = `${id}:${action}`;
    if (processingAction) {
      return;
    }

    setMessage('');
    setProcessingAction(actionKey);
    actionKeysRef.current[actionKey] ||= createIdempotencyKey();

    try {
      await api.patch(`/admin/payments/${id}/${action}`, undefined, {
        headers: {
          [IDEMPOTENCY_HEADER]: actionKeysRef.current[actionKey],
        },
      });
      setMessage(
        action === 'approve'
          ? 'Pago aprobado y stock descontado.'
          : 'Pago rechazado sin descontar stock.',
      );
      delete actionKeysRef.current[actionKey];
      await loadPayments();
    } catch (error) {
      setMessage(getApiErrorMessage(error, 'No se pudo actualizar el pago.'));
    } finally {
      setProcessingAction(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900">Pagos pendientes</h1>
          <p className="mt-1 text-sm font-medium text-gray-500">
            Revision manual de Yape y Plin. Solo al aprobar se descuenta stock.
          </p>
        </div>
        <button
          onClick={loadPayments}
          className="flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-3 font-bold text-white transition hover:bg-brand-cyan hover:text-gray-900"
        >
          <FiRefreshCw /> Actualizar
        </button>
      </div>

      {message ? (
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm font-bold text-gray-700">
          {message}
        </div>
      ) : null}

      {!ONLINE_PAYMENTS_ENABLED ? (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm font-bold text-yellow-800">
          Los pagos estan deshabilitados temporalmente. Puedes revisar pagos existentes, pero no
          aprobarlos hasta activar PAYMENTS_ENABLED.
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-10 text-center font-bold text-gray-500">Cargando pagos...</div>
        ) : payments.length === 0 ? (
          <div className="p-10 text-center font-bold text-gray-500">
            No hay pagos manuales pendientes por revisar.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {payments.map((payment) => (
              <div key={payment.id} className="grid gap-5 p-5 lg:grid-cols-[1.1fr_0.9fr_auto]">
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-black text-brand-cyan">
                      {payment.method}
                    </span>
                    <span className="rounded-full bg-yellow-50 px-3 py-1 text-xs font-black text-yellow-700">
                      {payment.status}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-gray-500">Orden: {payment.order.id}</p>
                  <p className="mt-1 text-2xl font-black text-gray-900">
                    S/. {Number(payment.amount).toFixed(2)}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Codigo de operacion:{' '}
                    <span className="font-bold text-gray-800">{payment.operationCode}</span>
                  </p>
                </div>

                <div className="text-sm">
                  <p className="mb-2 font-black text-gray-900">Productos</p>
                  <div className="space-y-1 text-gray-600">
                    {payment.order.items.map((item) => (
                      <p key={`${payment.id}-${item.productNameSnapshot}`}>
                        {item.quantity} x {item.productNameSnapshot}
                      </p>
                    ))}
                  </div>
                  <p className="mt-3 text-xs font-medium text-gray-400">
                    {new Date(payment.createdAt).toLocaleString()}
                  </p>
                </div>

                <div className="flex items-center gap-3 lg:flex-col lg:justify-center">
                  <button
                    disabled={processingAction !== null || !ONLINE_PAYMENTS_ENABLED}
                    onClick={() => updatePayment(payment.id, 'approve')}
                    className="flex items-center gap-2 rounded-xl bg-green-600 px-4 py-3 font-black text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <FiCheck />{' '}
                    {!ONLINE_PAYMENTS_ENABLED
                      ? 'Deshabilitado'
                      : processingAction === `${payment.id}:approve`
                        ? 'Procesando...'
                        : 'Aprobar'}
                  </button>
                  <button
                    disabled={processingAction !== null}
                    onClick={() => updatePayment(payment.id, 'reject')}
                    className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-3 font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <FiX />{' '}
                    {processingAction === `${payment.id}:reject` ? 'Procesando...' : 'Rechazar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
