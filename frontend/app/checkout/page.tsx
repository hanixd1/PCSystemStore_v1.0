'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FiCheckCircle, FiCreditCard, FiShield, FiSmartphone } from 'react-icons/fi';
import { api, getApiErrorMessage } from '@/lib/api';
import { useCustomerSession } from '@/lib/customerSession';
import { createIdempotencyKey, IDEMPOTENCY_HEADER } from '@/lib/idempotency';
import { MANUAL_WALLET_PAYMENT_LIMIT } from '@/lib/payment-constants';
import { useCartStore } from '@/store/useCartStore';

type PaymentMethod = 'CARD_CREDIT' | 'CARD_DEBIT' | 'YAPE' | 'PLIN';
type SimulateResult = 'APPROVED' | 'REJECTED';

const methodLabels: Record<PaymentMethod, string> = {
  CARD_CREDIT: 'Tarjeta de credito',
  CARD_DEBIT: 'Tarjeta de debito',
  YAPE: 'Yape',
  PLIN: 'Plin',
};

const ONLINE_PAYMENTS_ENABLED = process.env.NEXT_PUBLIC_PAYMENTS_ENABLED === 'true';
const CHECKOUT_MODE = process.env.NEXT_PUBLIC_CHECKOUT_MODE || 'CONTACT_ONLY';
const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.trim() || '51959139676';
const WHATSAPP_DISPLAY = '959139676';
const CONTACT_ONLY_MESSAGE =
  'Por el momento, los pagos en línea se encuentran temporalmente deshabilitados. Para concluir tu compra, comunícate con nuestro equipo de ventas por WhatsApp y te ayudaremos a confirmar disponibilidad, método de pago y entrega.';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, clearCart } = useCartStore();
  const { customer, isCheckingCustomer } = useCustomerSession();
  const [method, setMethod] = useState<PaymentMethod>('CARD_CREDIT');
  const [installments, setInstallments] = useState(1);
  const [operationCode, setOperationCode] = useState('');
  const [holderName, setHolderName] = useState('');
  const [testCard, setTestCard] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const orderIdempotencyKeyRef = useRef<string | null>(null);
  const paymentIdempotencyKeyRef = useRef<string | null>(null);

  const total = useMemo(() => items.reduce((sum, item) => sum + item.price * item.qty, 0), [items]);
  const cartSignature = useMemo(
    () =>
      items
        .map((item) => `${item.id}:${item.qty}`)
        .sort((a, b) => a.localeCompare(b))
        .join('|'),
    [items],
  );
  const igv = total * (18 / 118);
  const subtotal = total - igv;
  const isManual = method === 'YAPE' || method === 'PLIN';
  const isWalletPaymentDisabled = total > MANUAL_WALLET_PAYMENT_LIMIT;
  const isCredit = method === 'CARD_CREDIT';
  const isContactOnlyCheckout = !ONLINE_PAYMENTS_ENABLED || CHECKOUT_MODE === 'CONTACT_ONLY';
  const whatsappMessage = useMemo(() => {
    if (items.length === 0) return 'Hola PCSystemStore, quiero concluir mi compra desde la web.';

    const cartLines = items
      .map(
        (item) =>
          `- ${item.name} x${item.qty} - S/. ${(item.price * item.qty).toFixed(2)}`,
      )
      .join('\n');

    return `Hola PCSystemStore, quiero concluir mi compra. Mi carrito incluye:\n${cartLines}\nTotal: S/. ${total.toFixed(2)}`;
  }, [items, total]);
  const whatsappHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(whatsappMessage)}`;

  useEffect(() => {
    if (!isCheckingCustomer && !customer) {
      router.replace('/auth/login?redirect=/checkout');
    }
  }, [customer, isCheckingCustomer, router]);

  useEffect(() => {
    if (!isCheckingCustomer && customer && !customer.profileComplete) {
      router.replace('/mi-cuenta/datos?reason=checkout-profile');
    }
  }, [customer, isCheckingCustomer, router]);

  useEffect(() => {
    if (isWalletPaymentDisabled && isManual) {
      setMethod('CARD_CREDIT');
      setMessage('No disponible');
    }
  }, [isManual, isWalletPaymentDisabled]);

  useEffect(() => {
    if (loading) {
      return;
    }

    orderIdempotencyKeyRef.current = null;
    paymentIdempotencyKeyRef.current = null;
    setCreatedOrderId(null);
  }, [cartSignature, method, installments, operationCode, testCard]);

  const getOrderIdempotencyKey = () => {
    orderIdempotencyKeyRef.current ||= createIdempotencyKey();
    return orderIdempotencyKeyRef.current;
  };

  const getPaymentIdempotencyKey = () => {
    paymentIdempotencyKeyRef.current ||= createIdempotencyKey();
    return paymentIdempotencyKeyRef.current;
  };

  const clearIdempotencyKeys = () => {
    orderIdempotencyKeyRef.current = null;
    paymentIdempotencyKeyRef.current = null;
  };

  const handleSelectMethod = (nextMethod: PaymentMethod) => {
    const isBlockedWalletMethod =
      (nextMethod === 'YAPE' || nextMethod === 'PLIN') && isWalletPaymentDisabled;

    if (isBlockedWalletMethod) {
      setMessage('No disponible');
      return;
    }

    setMessage('');
    setMethod(nextMethod);
  };

  const createOrder = async () => {
    if (createdOrderId) {
      return { id: createdOrderId };
    }

    const hasBuilderItems = items.some((item) => item.source === 'builder');

    const orderRes = await api.post(
      '/orders',
      {
        method,
        source: hasBuilderItems ? 'builder' : undefined,
        items: items.map((item) => ({
          productId: String(item.id),
          quantity: item.qty,
        })),
      },
      {
        headers: {
          [IDEMPOTENCY_HEADER]: getOrderIdempotencyKey(),
        },
      },
    );

    setCreatedOrderId(orderRes.data.id);
    return orderRes.data;
  };

  const handleCardPayment = async (simulateResult: SimulateResult) => {
    if (!customer) {
      router.replace('/auth/login?redirect=/checkout');
      return;
    }

    if (items.length === 0) {
      setMessage('Tu carrito esta vacio.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const order = await createOrder();
      const cardForSimulation = testCard.replace(/\s+/g, '');
      const finalResult = cardForSimulation === '4000000000000002' ? 'REJECTED' : simulateResult;

      await api.post(
        '/payments/simulate',
        {
          orderId: order.id,
          method,
          simulateResult: finalResult,
          installments: isCredit ? installments : undefined,
        },
        {
          headers: {
            [IDEMPOTENCY_HEADER]: getPaymentIdempotencyKey(),
          },
        },
      );

      if (finalResult === 'APPROVED') {
        clearCart();
        clearIdempotencyKeys();
        setMessage('Pago simulado aprobado. Tu orden fue confirmada.');
      } else {
        clearIdempotencyKeys();
        setMessage('Pago simulado rechazado. No se desconto stock.');
      }
    } catch (error) {
      setMessage(getApiErrorMessage(error, 'No se pudo procesar el pago.'));
    } finally {
      setLoading(false);
    }
  };

  const handleManualPayment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!customer) {
      router.replace('/auth/login?redirect=/checkout');
      return;
    }

    if (items.length === 0) {
      setMessage('Tu carrito esta vacio.');
      return;
    }

    if (isWalletPaymentDisabled) {
      setMessage('No disponible');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const order = await createOrder();
      await api.post(
        '/payments/manual',
        {
          orderId: order.id,
          method,
          operationCode: operationCode.trim(),
        },
        {
          headers: {
            [IDEMPOTENCY_HEADER]: getPaymentIdempotencyKey(),
          },
        },
      );

      clearCart();
      clearIdempotencyKeys();
      setMessage('Pago enviado para validacion. La orden queda pendiente de revision.');
    } catch (error) {
      setMessage(getApiErrorMessage(error, 'No se pudo registrar el pago manual.'));
    } finally {
      setLoading(false);
    }
  };

  if (isCheckingCustomer || !customer) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-brand-cyan" />
      </div>
    );
  }

  if (items.length === 0 && !message) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-16">
        <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center shadow-sm">
          <h1 className="text-3xl font-black text-gray-900">Checkout</h1>
          <p className="mt-3 text-gray-500">Tu carrito esta vacio.</p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-xl bg-brand-cyan px-6 py-3 font-bold text-gray-900"
          >
            Volver a la tienda
          </Link>
        </div>
      </div>
    );
  }

  if (isContactOnlyCheckout) {
    return (
      <div className="min-h-screen bg-gray-50 py-10">
        <div className="container mx-auto grid max-w-6xl gap-8 px-4 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
            <h1 className="text-3xl font-black text-gray-900">Checkout</h1>
            <div className="mt-6 border border-cyan-200 bg-cyan-50/70 p-6">
              <p className="text-2xl font-black text-gray-950">Finaliza tu compra por WhatsApp</p>
              <p className="mt-3 text-sm font-medium leading-6 text-gray-700">
                {CONTACT_ONLY_MESSAGE}
              </p>
              <p className="mt-5 text-sm font-black text-gray-900">
                WhatsApp: <span className="text-cyan-700">{WHATSAPP_DISPLAY}</span>
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-brand-cyan px-5 py-3 font-black text-gray-900 transition hover:bg-cyan-400"
                >
                  Continuar por WhatsApp
                </a>
                <Link
                  href="/"
                  className="border border-gray-300 px-5 py-3 font-black text-gray-800 transition hover:border-gray-500"
                >
                  Volver a la tienda
                </Link>
              </div>
            </div>
          </section>

          <aside className="h-max rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-xl font-black text-gray-900">Resumen</h2>
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between gap-4 border-b border-gray-100 pb-3 text-sm"
                >
                  <div>
                    <p className="font-bold text-gray-800">{item.name}</p>
                    <p className="text-gray-500">Cantidad: {item.qty}</p>
                  </div>
                  <p className="font-black text-gray-900">
                    S/. {(item.price * item.qty).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 space-y-2 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span>
                <span>S/. {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>IGV incluido</span>
                <span>S/. {igv.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-100 pt-3 text-xl font-black text-gray-900">
                <span>Total</span>
                <span>S/. {total.toFixed(2)}</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="container mx-auto grid max-w-6xl gap-8 px-4 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h1 className="mb-2 text-3xl font-black text-gray-900">Checkout</h1>
          <p className="mb-6 flex items-center gap-2 text-sm font-medium text-gray-500">
            <FiShield className="text-brand-cyan" />
            Pago simulado para entorno de pruebas. No ingreses datos reales.
          </p>

          <div className="mb-6 grid gap-3 sm:grid-cols-2">
            {(['CARD_CREDIT', 'CARD_DEBIT', 'YAPE', 'PLIN'] as PaymentMethod[]).map((item) => {
              const isBlockedWalletMethod =
                (item === 'YAPE' || item === 'PLIN') && isWalletPaymentDisabled;

              return (
                <button
                  key={item}
                  type="button"
                  aria-disabled={isBlockedWalletMethod}
                  title={isBlockedWalletMethod ? 'No disponible' : undefined}
                  onClick={() => handleSelectMethod(item)}
                  className={[
                    'flex items-center gap-3 rounded-xl border p-4 text-left font-bold transition',
                    isBlockedWalletMethod
                      ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400'
                      : method === item
                        ? 'border-brand-cyan bg-cyan-50 text-gray-900'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300',
                  ].join(' ')}
                >
                  {item.startsWith('CARD') ? <FiCreditCard /> : <FiSmartphone />}
                  <span>{methodLabels[item]}</span>
                  {isBlockedWalletMethod ? (
                    <span className="ml-auto text-xs font-black uppercase">No disponible</span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {!isManual ? (
            <div className="space-y-4">
              <input
                value={holderName}
                onChange={(event) => setHolderName(event.target.value)}
                placeholder="Nombre del titular (simulado)"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 font-medium outline-none focus:border-brand-cyan"
              />
              <input
                value={testCard}
                onChange={(event) => setTestCard(event.target.value)}
                placeholder="Tarjeta de prueba opcional: 4111111111111111"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 font-medium outline-none focus:border-brand-cyan"
              />
              <p className="text-xs font-medium text-gray-500">
                Usa 4111111111111111 para aprobado o 4000000000000002 para rechazado. No se guarda
                el numero.
              </p>

              {isCredit ? (
                <select
                  value={installments}
                  onChange={(event) => setInstallments(Number(event.target.value))}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 font-bold outline-none focus:border-brand-cyan"
                >
                  {[1, 3, 6, 12].map((option) => (
                    <option key={option} value={option}>
                      {option} cuota{option > 1 ? 's' : ''}
                    </option>
                  ))}
                </select>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  disabled={loading}
                  onClick={() => handleCardPayment('APPROVED')}
                  className="rounded-xl bg-brand-cyan px-5 py-3 font-black text-gray-900 shadow-lg shadow-brand-cyan/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? 'Procesando...' : 'Simular pago aprobado'}
                </button>
                <button
                  disabled={loading}
                  onClick={() => handleCardPayment('REJECTED')}
                  className="rounded-xl bg-gray-900 px-5 py-3 font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? 'Procesando...' : 'Simular pago rechazado'}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleManualPayment} className="space-y-4">
              <div className="rounded-xl bg-cyan-50 p-4 text-sm font-medium text-gray-700">
                Realiza el pago por {methodLabels[method]} y registra tu codigo de operacion para
                validacion administrativa.
              </div>
              <input
                value={operationCode}
                onChange={(event) => setOperationCode(event.target.value)}
                placeholder="Codigo de operacion"
                minLength={4}
                required
                className="w-full rounded-xl border border-gray-200 px-4 py-3 font-medium outline-none focus:border-brand-cyan"
              />
              <button
                disabled={loading}
                className="w-full rounded-xl bg-brand-cyan px-5 py-3 font-black text-gray-900 shadow-lg shadow-brand-cyan/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Procesando...' : 'Enviar para validacion'}
              </button>
            </form>
          )}

          {message ? (
            <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm font-bold text-gray-700">
              <div className="flex items-center gap-2">
                <FiCheckCircle className="text-brand-cyan" />
                {message}
              </div>
              {createdOrderId ? (
                <p className="mt-2 text-xs font-medium text-gray-500">Orden: {createdOrderId}</p>
              ) : null}
              <button
                onClick={() => router.push('/')}
                className="mt-4 text-brand-cyan hover:underline"
              >
                Volver a la tienda
              </button>
            </div>
          ) : null}
        </section>

        <aside className="h-max rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-black text-gray-900">Resumen</h2>
          <div className="space-y-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex justify-between gap-4 border-b border-gray-100 pb-3 text-sm"
              >
                <div>
                  <p className="font-bold text-gray-800">{item.name}</p>
                  <p className="text-gray-500">Cantidad: {item.qty}</p>
                </div>
                <p className="font-black text-gray-900">S/. {(item.price * item.qty).toFixed(2)}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 space-y-2 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>Subtotal</span>
              <span>S/. {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>IGV incluido</span>
              <span>S/. {igv.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t border-gray-100 pt-3 text-xl font-black text-gray-900">
              <span>Total</span>
              <span>S/. {total.toFixed(2)}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
