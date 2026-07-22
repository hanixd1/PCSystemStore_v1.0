import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { CsrfGuard } from './auth/csrf.guard';
import { PrismaModule } from './prisma/prisma.module';
import { BuilderModule } from './builder/builder.module';
import { ProductsModule } from './products/products.module';
import { UsersModule } from './users/users.module';
import { AiModule } from './ai/ai.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { BrandingModule } from './branding/branding.module';
import { UploadsModule } from './uploads/uploads.module';
import { AuditModule } from './audit/audit.module';
import { StatisticsModule } from './statistics/statistics.module';
import { SecurityModule } from './security/security.module';
import { SecurityThrottlerGuard } from './security/security-throttler.guard';
import { SecurityRateLimitStorage } from './security/security-rate-limit.storage';

@Module({
  imports: [
    SecurityModule,
    ThrottlerModule.forRootAsync({
      imports: [SecurityModule],
      inject: [SecurityRateLimitStorage],
      useFactory: (storage: SecurityRateLimitStorage) => ({
        throttlers: [{ name: 'default', ttl: 60_000, limit: 100, blockDuration: 60_000 }],
        storage,
        errorMessage: 'Demasiadas solicitudes. Intenta nuevamente mas tarde.',
      }),
    }),
    AuthModule,
    PrismaModule,
    BuilderModule,
    ProductsModule,
    UsersModule,
    AiModule,
    OrdersModule,
    PaymentsModule,
    BrandingModule,
    UploadsModule,
    AuditModule,
    StatisticsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: SecurityThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: CsrfGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
