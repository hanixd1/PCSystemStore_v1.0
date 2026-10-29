import { afterEach, describe, expect, it, vi } from 'vitest';

describe('CSRF retry', () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('after a 403 asks the API for a new token instead of resending the stale cookie', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.test');
    vi.stubGlobal('window', { location: { protocol: 'https:' } });
    vi.stubGlobal('document', { cookie: 'pcs_csrf_token=stale' });
    const axios = (await import('axios')).default;
    const freshToken = vi.spyOn(axios, 'get').mockResolvedValue({ data: { csrfToken: 'fresh' } });
    const { api } = await import('../lib/api');

    const sent: string[] = [];
    api.defaults.adapter = async (config) => {
      sent.push(String(config.headers['X-CSRF-Token']));
      if (sent.length === 1 || config.url === '/always-403') {
        return Promise.reject(
          Object.assign(new axios.AxiosError('forbidden', 'ERR_BAD_REQUEST', config), {
            response: {
              status: 403,
              data: { message: 'Solicitud de seguridad invalida.' },
              headers: {},
              config,
              statusText: 'Forbidden',
            },
          }),
        );
      }
      return { data: { ok: true }, status: 200, statusText: 'OK', headers: {}, config };
    };

    await expect(api.post('/orders', {})).resolves.toMatchObject({ data: { ok: true } });
    expect(sent).toEqual(['stale', 'fresh']);
    expect(freshToken).toHaveBeenCalledTimes(1);

    // A second rejection is final: the retry happens once, never in a loop.
    sent.length = 0;
    await expect(api.post('/always-403', {})).rejects.toBeDefined();
    expect(sent).toHaveLength(2);
  });
});
