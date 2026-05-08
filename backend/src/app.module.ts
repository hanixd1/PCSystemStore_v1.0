import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';
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

@Module({
  imports: [
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
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
