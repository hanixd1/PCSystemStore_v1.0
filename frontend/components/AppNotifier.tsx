'use client';

import { useEffect, useState } from 'react';
import { FiAlertTriangle, FiCheckCircle, FiInfo, FiX } from 'react-icons/fi';
import {
  APP_CONFIRM_EVENT,
  APP_NOTIFY_EVENT,
  ConfirmPayload,
  NotifyPayload,
  NotifyType,
} from '@/lib/notify';

type Toast = Required<NotifyPayload> & {
  id: number;
};

type ConfirmState = ConfirmPayload & {
  resolve: (value: boolean) => void;
};

const toastStyles: Record<NotifyType, string> = {
  success: 'border-cyan-200 bg-cyan-50 text-gray-900',
  error: 'border-red-200 bg-red-50 text-red-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  info: 'border-gray-200 bg-white text-gray-900',
};

const toastIcons: Record<NotifyType, React.ReactNode> = {
  success: <FiCheckCircle className="mt-0.5 shrink-0 text-cyan-500" />,
  error: <FiAlertTriangle className="mt-0.5 shrink-0 text-red-500" />,
  warning: <FiAlertTriangle className="mt-0.5 shrink-0 text-amber-500" />,
  info: <FiInfo className="mt-0.5 shrink-0 text-gray-500" />,
};

export default function AppNotifier() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  useEffect(() => {
    const handleNotify = (event: Event) => {
      const detail = (event as CustomEvent<NotifyPayload>).detail;
      const id = Date.now();
      const nextToast: Toast = {
        id,
        type: detail.type || 'info',
        message: detail.message,
      };

      setToasts((current) => [...current.slice(-2), nextToast]);
      window.setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
      }, 2800);
    };

    const handleConfirm = (event: Event) => {
      setConfirmState((event as CustomEvent<ConfirmState>).detail);
    };

    window.addEventListener(APP_NOTIFY_EVENT, handleNotify);
    window.addEventListener(APP_CONFIRM_EVENT, handleConfirm);

    return () => {
      window.removeEventListener(APP_NOTIFY_EVENT, handleNotify);
      window.removeEventListener(APP_CONFIRM_EVENT, handleConfirm);
    };
  }, []);

  const closeConfirm = (value: boolean) => {
    confirmState?.resolve(value);
    setConfirmState(null);
  };

  return (
    <>
      <div className="fixed right-4 top-4 z-[100] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={[
              'flex items-start gap-3 border px-4 py-3 text-sm font-semibold shadow-lg shadow-gray-900/5',
              toastStyles[toast.type],
            ].join(' ')}
            role="status"
          >
            {toastIcons[toast.type]}
            <p className="flex-1 leading-5">{toast.message}</p>
            <button
              type="button"
              aria-label="Cerrar notificación"
              onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}
              className="text-gray-500 transition hover:text-gray-900"
            >
              <FiX />
            </button>
          </div>
        ))}
      </div>

      {confirmState ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/45 px-4">
          <div
            className="w-full max-w-md border border-gray-200 bg-white p-6 shadow-xl"
            role="dialog"
            aria-modal="true"
          >
            <h2 className="text-xl font-black text-gray-950">
              {confirmState.title || 'Confirmar acción'}
            </h2>
            <p className="mt-3 text-sm leading-6 text-gray-700">{confirmState.message}</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => closeConfirm(false)}
                className="border border-gray-300 px-5 py-3 text-sm font-bold text-gray-700 transition hover:border-gray-500"
              >
                {confirmState.cancelText || 'Cancelar'}
              </button>
              <button
                type="button"
                onClick={() => closeConfirm(true)}
                className="bg-cyan-400 px-5 py-3 text-sm font-black text-gray-950 transition hover:bg-cyan-500"
              >
                {confirmState.confirmText || 'Aceptar'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
