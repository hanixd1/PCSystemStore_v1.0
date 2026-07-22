import type { CookieOptions, Request } from 'express';

export type SessionScope = 'customer' | 'admin';

export const CUSTOMER_SESSION_COOKIE = 'pcs_customer_session';
export const ADMIN_SESSION_COOKIE = 'pcs_admin_session';
export const GOOGLE_OAUTH_STATE_COOKIE = 'pcs_google_oauth_state';
export const CSRF_COOKIE = 'pcs_csrf_token';
export const CUSTOMER_SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000;
export const ADMIN_SESSION_MAX_AGE_MS = 3 * 60 * 60 * 1000;
export const GOOGLE_OAUTH_STATE_MAX_AGE_MS = 5 * 60 * 1000;

export function getCookieValue(request: Request, name: string): string | undefined {
  const raw = request.headers.cookie
    ?.split(';')
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${name}=`))
    ?.slice(name.length + 1);
  if (!raw) {
    return undefined;
  }
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function getSameSite(): CookieOptions['sameSite'] {
  const configured = process.env.COOKIE_SAME_SITE?.trim().toLowerCase();
  if (configured === 'none') {
    return 'none';
  }
  if (configured === 'strict') {
    return 'strict';
  }
  if (configured === 'lax') {
    return 'lax';
  }
  // The documented production topology is Vercel -> Railway, which is cross-site.
  return process.env.NODE_ENV === 'production' ? 'none' : 'lax';
}

function baseCookieOptions(): CookieOptions {
  const sameSite = getSameSite();
  const secure = process.env.NODE_ENV === 'production' || sameSite === 'none';
  return { secure, sameSite, path: '/' };
}

export function getSessionCookieName(scope: SessionScope): string {
  return scope === 'admin' ? ADMIN_SESSION_COOKIE : CUSTOMER_SESSION_COOKIE;
}

export function getSessionCookieOptions(scope: SessionScope): CookieOptions {
  return {
    ...baseCookieOptions(),
    httpOnly: true,
    maxAge: scope === 'admin' ? ADMIN_SESSION_MAX_AGE_MS : CUSTOMER_SESSION_MAX_AGE_MS,
  };
}

export function getClearSessionCookieOptions(scope: SessionScope): CookieOptions {
  const { maxAge: _maxAge, ...options } = getSessionCookieOptions(scope);
  return options;
}

export function getGoogleOAuthStateCookieOptions(): CookieOptions {
  return { ...baseCookieOptions(), httpOnly: true, maxAge: GOOGLE_OAUTH_STATE_MAX_AGE_MS };
}

export function getClearGoogleOAuthStateCookieOptions(): CookieOptions {
  const { maxAge: _maxAge, ...options } = getGoogleOAuthStateCookieOptions();
  return options;
}

export function getCsrfCookieOptions(): CookieOptions {
  return { ...baseCookieOptions(), httpOnly: false, maxAge: CUSTOMER_SESSION_MAX_AGE_MS };
}

export function getClearCsrfCookieOptions(): CookieOptions {
  const { maxAge: _maxAge, ...options } = getCsrfCookieOptions();
  return options;
}
