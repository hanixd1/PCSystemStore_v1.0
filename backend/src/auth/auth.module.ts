import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import type { JwtModuleOptions } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { CsrfController } from './csrf.controller';
import { CsrfGuard } from './csrf.guard';
import { CsrfTokenService } from './csrf-token.service';
import { PasswordHashingService } from './password-hashing.service';
import { AdminLoginProtectionService } from './admin-login-protection.service';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET?.trim() || 'development-jwt-secret-change-me',
        signOptions: {
          expiresIn: (process.env.JWT_EXPIRES_IN?.trim() || '1d') as NonNullable<
            JwtModuleOptions['signOptions']
          >['expiresIn'],
        },
      }),
    }),
  ],
  controllers: [CsrfController],
  providers: [
    JwtAuthGuard,
    RolesGuard,
    CsrfGuard,
    CsrfTokenService,
    PasswordHashingService,
    AdminLoginProtectionService,
  ],
  exports: [
    JwtModule,
    JwtAuthGuard,
    RolesGuard,
    CsrfGuard,
    CsrfTokenService,
    PasswordHashingService,
    AdminLoginProtectionService,
  ],
})
export class AuthModule {}
