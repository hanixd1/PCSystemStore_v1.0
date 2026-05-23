import { ServiceUnavailableException } from '@nestjs/common';

export const PAYMENT_DISABLED_MESSAGE =
  'Los pagos en línea están temporalmente deshabilitados. Contáctanos para finalizar tu compra.';

export const PAYMENT_SIMULATION_DISABLED_MESSAGE =
  'El proveedor de pago simulado está deshabilitado en producción.';

export function arePaymentsEnabled(): boolean {
  return process.env.PAYMENTS_ENABLED === 'true';
}

export function isPaymentSimulationEnabled(): boolean {
  return process.env.PAYMENT_SIMULATION_ENABLED === 'true';
}

export function getCheckoutMode(): string {
  return process.env.CHECKOUT_MODE || 'CONTACT_ONLY';
}

export function assertPaymentsEnabled(): void {
  if (!arePaymentsEnabled()) {
    throw new ServiceUnavailableException(PAYMENT_DISABLED_MESSAGE);
  }
}

export function assertPaymentSimulationEnabled(): void {
  if (!isPaymentSimulationEnabled()) {
    throw new ServiceUnavailableException(PAYMENT_SIMULATION_DISABLED_MESSAGE);
  }
}
