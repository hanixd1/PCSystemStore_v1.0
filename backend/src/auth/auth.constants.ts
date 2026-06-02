export const IS_PUBLIC_KEY = 'isPublic';
export const ROLES_KEY = 'roles';

export const USER_ROLES = ['ADMIN', 'EDITOR', 'CUSTOMER'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export interface JwtUserPayload {
  sub: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}
