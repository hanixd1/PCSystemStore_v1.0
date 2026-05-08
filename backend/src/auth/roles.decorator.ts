import { SetMetadata } from '@nestjs/common';
import { ROLES_KEY, UserRole } from './auth.constants';

export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
