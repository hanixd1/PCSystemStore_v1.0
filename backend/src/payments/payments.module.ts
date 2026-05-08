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

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    SimulatedPaymentProvider,
    ManualPaymentProvider,
    NiubizPaymentProvider,
  ],
})
export class PaymentsModule {}
