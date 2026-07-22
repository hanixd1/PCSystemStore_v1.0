import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EmailModule } from '../common/email/email.module';
import { SecurityModule } from '../security/security.module';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PasswordResetService } from './services/password-reset.service';
import { UserAddressService } from './services/user-address.service';
import { UserAuthService } from './services/user-auth.service';
import { UserProfileService } from './services/user-profile.service';
import { UserSessionService } from './services/user-session.service';

@Module({
  imports: [AuthModule, EmailModule, SecurityModule],
  controllers: [UsersController],
  providers: [
    UsersService,
    PasswordResetService,
    UserAuthService,
    UserSessionService,
    UserProfileService,
    UserAddressService,
  ],
})
export class UsersModule {}
