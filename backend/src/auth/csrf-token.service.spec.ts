import type { Request, Response } from 'express';
import { CsrfTokenService } from './csrf-token.service';

describe('CsrfTokenService', () => {
  const service = new CsrfTokenService();
  const existingToken = 'a'.repeat(43);

  const requestWith = (cookie?: string) => ({ headers: { cookie } }) as Request;
  const responseMock = () => ({ cookie: jest.fn() }) as unknown as Response & { cookie: jest.Mock };

  it('issue siempre rota el token', () => {
    const response = responseMock();
    const token = service.issue(response);
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(response.cookie).toHaveBeenCalledWith('pcs_csrf_token', token, expect.any(Object));
  });

  it('ensure reutiliza el token vigente para no invalidar otras pestanas', () => {
    const response = responseMock();
    const token = service.ensure(
      requestWith(`pcs_admin_session=jwt; pcs_csrf_token=${existingToken}`),
      response,
    );
    expect(token).toBe(existingToken);
    expect(response.cookie).not.toHaveBeenCalled();
  });

  it.each([undefined, 'pcs_csrf_token=corto', 'otra=valor'])(
    'ensure emite un token nuevo cuando la cookie falta o es invalida (%s)',
    (cookie) => {
      const response = responseMock();
      const token = service.ensure(requestWith(cookie), response);
      expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(response.cookie).toHaveBeenCalledTimes(1);
    },
  );
});
