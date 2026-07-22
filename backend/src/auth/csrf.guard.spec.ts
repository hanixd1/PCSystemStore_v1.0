import type { ExecutionContext } from '@nestjs/common';
import { ForbiddenException } from '@nestjs/common';
import type { Request } from 'express';
import { CsrfGuard } from './csrf.guard';

describe('CsrfGuard', () => {
  const guard = new CsrfGuard();

  beforeEach(() => {
    process.env.CSRF_ALLOWED_ORIGINS = 'https://store.example.com';
  });

  const contextFor = (request: Partial<Request>): ExecutionContext =>
    ({
      switchToHttp: () => ({ getRequest: () => request }),
    }) as ExecutionContext;

  it('permite metodos seguros sin token', () => {
    expect(guard.canActivate(contextFor({ method: 'GET', headers: {} }))).toBe(true);
  });

  it('permite autenticacion Bearer sin cookie de sesion', () => {
    expect(guard.canActivate(contextFor({ method: 'POST', headers: {} }))).toBe(true);
  });

  it('permite origen y double-submit token validos', () => {
    expect(
      guard.canActivate(
        contextFor({
          method: 'PATCH',
          headers: {
            cookie: 'pcs_customer_session=jwt; pcs_csrf_token=token-seguro',
            origin: 'https://store.example.com',
            'x-csrf-token': 'token-seguro',
            'sec-fetch-site': 'same-site',
          },
        }),
      ),
    ).toBe(true);
  });

  it.each([
    ['origen invalido', { origin: 'https://evil.example', 'x-csrf-token': 'token-seguro' }],
    ['token ausente', { origin: 'https://store.example.com' }],
    ['token incorrecto', { origin: 'https://store.example.com', 'x-csrf-token': 'otro' }],
    [
      'Sec-Fetch-Site cross-site desde origen no permitido',
      {
        origin: 'https://evil.example',
        'x-csrf-token': 'token-seguro',
        'sec-fetch-site': 'cross-site',
      },
    ],
  ])('rechaza %s', (_caseName, headers) => {
    expect(() =>
      guard.canActivate(
        contextFor({
          method: 'POST',
          headers: {
            cookie: 'pcs_admin_session=jwt; pcs_csrf_token=token-seguro',
            ...headers,
          },
        }),
      ),
    ).toThrow(ForbiddenException);
  });
});
