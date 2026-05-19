export const IDEMPOTENCY_HEADER = 'Idempotency-Key';

export function createIdempotencyKey() {
  const cryptoApi = globalThis.crypto;

  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    return `idem_${cryptoApi.randomUUID()}`;
  }

  if (cryptoApi && typeof cryptoApi.getRandomValues === 'function') {
    const values = new Uint32Array(4);
    cryptoApi.getRandomValues(values);
    const randomPart = Array.from(values)
      .map((value) => value.toString(16).padStart(8, '0'))
      .join('');

    return `idem_${Date.now()}_${randomPart}`;
  }

  throw new Error('Secure random generator is not available.');
}
