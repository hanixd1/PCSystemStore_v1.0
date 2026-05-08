import { Injectable } from '@nestjs/common';
import { PaymentMethod, PaymentProvider, PaymentStatus } from '@prisma/client';

export type ProviderPaymentInput = {
  method: PaymentMethod;
  amount: number;
  simulateResult?: 'APPROVED' | 'REJECTED';
};

export type ProviderPaymentResult = {
  provider: PaymentProvider;
  status: PaymentStatus;
  providerTransactionId?: string;
  approvalCode?: string;
};

@Injectable()
export class SimulatedPaymentProvider {
  createPayment(input: ProviderPaymentInput): ProviderPaymentResult {
    const approved = input.simulateResult === 'APPROVED';

    return {
      provider: PaymentProvider.SIMULATED,
      status: approved ? PaymentStatus.APPROVED : PaymentStatus.REJECTED,
      providerTransactionId: `sim_${Date.now()}`,
      approvalCode: approved ? `APP-${Math.floor(100000 + Math.random() * 900000)}` : undefined,
    };
  }
}

@Injectable()
export class ManualPaymentProvider {
  createPayment(): ProviderPaymentResult {
    return {
      provider: PaymentProvider.MANUAL,
      status: PaymentStatus.PENDING_REVIEW,
    };
  }
}

@Injectable()
export class NiubizPaymentProvider {
  createPayment(): never {
    // TODO: Integrar Niubiz Pago Web cuando exista HTTPS, credenciales y callback publico.
    throw new Error('Niubiz todavia no esta implementado');
  }
}
