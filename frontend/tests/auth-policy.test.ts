import { afterEach, describe, expect, it, vi } from 'vitest';
import { getSafeRedirectPath, PASSWORD_MIN_LENGTH } from '../lib/auth-policy';

describe('login redirect', () => {
  it.each(['/mi-cuenta', '/checkout?step=2'])('keeps internal path %s', (path) => {
    expect(getSafeRedirectPath(path)).toBe(path);
  });

  it.each([null, '', 'https://evil.com', '//evil.com', '/\\evil.com', 'javascript:alert(1)'])(
    'falls back to / for %s',
    (value) => {
      expect(getSafeRedirectPath(value)).toBe('/');
    },
  );

  it('matches the backend password minimum', () => {
    expect(PASSWORD_MIN_LENGTH).toBe(8);
  });
});

describe('shared customer session', () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it('shares one GET /users/me between concurrent callers', async () => {
    const store = new Map<string, string>([
      ['customerUser', JSON.stringify({ id: '1', name: 'A', email: 'a@b.pe', role: 'CUSTOMER' })],
    ]);
    vi.stubGlobal('window', { addEventListener: vi.fn(), dispatchEvent: vi.fn() });
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
    });
    const get = vi.fn(async () => ({
      data: { id: '1', name: 'A', email: 'a@b.pe', role: 'CUSTOMER' },
    }));
    vi.doMock('@/lib/api', () => ({ api: { get, post: vi.fn(async () => undefined) } }));
    vi.doMock('@/store/useCartStore', () => ({ resetCartState: vi.fn() }));

    const session = await import('../lib/customerSession');
    await Promise.all([
      session.syncCustomerSession(),
      session.syncCustomerSession(),
      session.syncCustomerSession(),
    ]);

    expect(get).toHaveBeenCalledTimes(1);
  });
});
