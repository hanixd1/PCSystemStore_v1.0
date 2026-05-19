import { Injectable } from '@nestjs/common';
import { PaymentMethod, PaymentProvider, PaymentStatus } from '@prisma/client';
import { randomInt, randomUUID } from 'node:crypto';

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
  private generateApprovalCode(): string {
    return `APP-${randomInt(100000, 1000000)}`;
  }

  createPayment(input: ProviderPaymentInput): ProviderPaymentResult {
    const approved = input.simulateResult === 'APPROVED';

    return {
      provider: PaymentProvider.SIMULATED,
      status: approved ? PaymentStatus.APPROVED : PaymentStatus.REJECTED,
      providerTransactionId: `sim_${randomUUID()}`,
      approvalCode: approved ? this.generateApprovalCode() : undefined,
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
