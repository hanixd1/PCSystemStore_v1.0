import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import type { Response } from 'express';
import { CSRF_COOKIE, getCsrfCookieOptions } from './auth-cookies';

@Injectable()
export class CsrfTokenService {
  issue(response: Response): string {
    const token = randomBytes(32).toString('base64url');
    response.cookie(CSRF_COOKIE, token, getCsrfCookieOptions());
    return token;
  }
}
