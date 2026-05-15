import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { PaymentsController } from './payments.controller';
import {
  ManualPaymentProvider,
  NiubizPaymentProvider,
  SimulatedPaymentProvider,
} from './payment-provider.service';
import { PaymentsService } from './payments.service';
import { IdempotencyModule } from '../idempotency/idempotency.module';

@Module({
  imports: [PrismaModule, AuditModule, IdempotencyModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    SimulatedPaymentProvider,
    ManualPaymentProvider,
    NiubizPaymentProvider,
  ],
})
export class PaymentsModule {}
