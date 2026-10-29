import { isSafeInternalPath } from './safe-url';

/** Same minimums as the backend DTOs (RegisterUserDto, ResetPasswordDto, CreateUserDto). */
export const PASSWORD_MIN_LENGTH = 8;
export const STAFF_PASSWORD_MIN_LENGTH = 12;

export const PASSWORD_MIN_LENGTH_MESSAGE = `La contrasena debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`;

/**
 * Internal path to return to after login, or `fallback`. Rejects protocol-relative URLs
 * (`//evil.com`, `/\evil.com`) that browsers resolve to another site.
 */
export function getSafeRedirectPath(value: string | null | undefined, fallback = '/'): string {
  return isSafeInternalPath(value) ? value : fallback;
}
