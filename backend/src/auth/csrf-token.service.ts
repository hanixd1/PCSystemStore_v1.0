import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import type { Request, Response } from 'express';
import { CSRF_COOKIE, getCookieValue, getCsrfCookieOptions } from './auth-cookies';

const CSRF_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

@Injectable()
export class CsrfTokenService {
  /** Always rotates the token. Use when the session changes (login, OAuth callback). */
  issue(response: Response): string {
    const token = randomBytes(32).toString('base64url');
    response.cookie(CSRF_COOKIE, token, getCsrfCookieOptions());
    return token;
  }

  /**
   * Returns the browser's current token, issuing one only when missing or malformed.
   * Rotating here would invalidate the token held in memory by every other open tab.
   */
  ensure(request: Request, response: Response): string {
    const current = getCookieValue(request, CSRF_COOKIE);
    if (current && CSRF_TOKEN_PATTERN.test(current)) {
      return current;
    }
    return this.issue(response);
  }
}
