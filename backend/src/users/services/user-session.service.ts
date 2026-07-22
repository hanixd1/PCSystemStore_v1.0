import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtUserPayload, USER_ROLES } from '../../auth/auth.constants';

const CUSTOMER_SESSION_EXPIRES_IN = '12h';
const ADMIN_SESSION_EXPIRES_IN = '3h';

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  emailVerified?: boolean | null;
  documentType?: string | null;
  documentNumber?: string | null;
  mobilePhone?: string | null;
};

export function isCustomerProfileComplete(
  user: Pick<
    SessionUser,
    'role' | 'emailVerified' | 'documentType' | 'documentNumber' | 'mobilePhone'
  >,
): boolean {
  if (user.role && user.role !== 'CUSTOMER') {
    return true;
  }

  return Boolean(
    user.emailVerified &&
    user.documentType?.trim() &&
    user.documentNumber?.trim() &&
    user.mobilePhone?.trim(),
  );
}

@Injectable()
export class UserSessionService {
  constructor(private readonly jwtService: JwtService = undefined as never) {}

  async buildSession(user: SessionUser) {
    const payload: JwtUserPayload = {
      sub: user.id,
      email: user.email,
      role: USER_ROLES.includes(user.role as (typeof USER_ROLES)[number])
        ? (user.role as JwtUserPayload['role'])
        : 'CUSTOMER',
    };

    const expiresIn =
      payload.role === 'CUSTOMER' ? CUSTOMER_SESSION_EXPIRES_IN : ADMIN_SESSION_EXPIRES_IN;

    return {
      message: 'Login exitoso',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: Boolean(user.emailVerified),
        profileComplete: isCustomerProfileComplete(user),
      },
      token: await this.jwtService.signAsync(payload, { expiresIn }),
    };
  }
}
