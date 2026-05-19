import { PaymentMethod } from '@prisma/client';

export const MANUAL_WALLET_PAYMENT_LIMIT = 500;
export const MANUAL_WALLET_PAYMENT_LIMIT_MESSAGE =
  'Yape/Plin no disponible para pedidos mayores a S/. 500.';

export function isManualWalletPayment(method: PaymentMethod | string) {
  return method === PaymentMethod.YAPE || method === PaymentMethod.PLIN;
}
