import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SecurityRateLimitStorage } from './security-rate-limit.storage';

@Module({
  imports: [PrismaModule],
  providers: [SecurityRateLimitStorage],
  exports: [SecurityRateLimitStorage],
})
export class SecurityModule {}
