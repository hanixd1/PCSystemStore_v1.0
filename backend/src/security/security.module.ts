import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { HybridThrottlerStorage } from './hybrid-throttler.storage';
import { SecurityRateLimitStorage } from './security-rate-limit.storage';

@Module({
  imports: [PrismaModule],
  providers: [SecurityRateLimitStorage, HybridThrottlerStorage],
  exports: [SecurityRateLimitStorage, HybridThrottlerStorage],
})
export class SecurityModule {}
