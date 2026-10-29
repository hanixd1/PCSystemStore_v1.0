import { Reflector } from '@nestjs/core';
import { HybridThrottlerStorage, MEMORY_THROTTLE_PREFIX } from './hybrid-throttler.storage';
import { SecurityThrottlerGuard } from './security-throttler.guard';

const context = (method: string, url: string) =>
  ({
    getClass: () => class ProductsController {},
    getHandler: () => function findAll() {},
    switchToHttp: () => ({ getRequest: () => ({ method, originalUrl: url }) }),
  }) as any;

describe('rate limit storage by route', () => {
  const guard = new SecurityThrottlerGuard({ throttlers: [] }, {} as any, new Reflector());
  const keyFor = (method: string, url: string) =>
    (guard as any).generateKey(context(method, url), 'ip:1.2.3.4', 'default') as string;

  it.each([
    ['GET', '/products?page=2'],
    ['GET', '/public/banners'],
    ['HEAD', '/products/abc'],
  ])('%s %s se cuenta en memoria', (method, url) => {
    expect(keyFor(method, url).startsWith(MEMORY_THROTTLE_PREFIX)).toBe(true);
  });

  it.each([
    ['POST', '/users/customer-login'],
    ['POST', '/products'],
    ['GET', '/users/me'],
    ['GET', '/orders/my-orders'],
    ['POST', '/ai/chat'],
    ['GET', '/payments/manual/pending'],
  ])('%s %s se cuenta en PostgreSQL', (method, url) => {
    expect(keyFor(method, url).startsWith(MEMORY_THROTTLE_PREFIX)).toBe(false);
  });

  it('las lecturas publicas no escriben en la base de datos', async () => {
    const shared = { increment: jest.fn(async () => ({ totalHits: 1 })) };
    const storage = new HybridThrottlerStorage(shared as any);

    const record = await storage.increment(
      `${MEMORY_THROTTLE_PREFIX}k`,
      60_000,
      100,
      60_000,
      'default',
    );
    await storage.increment('k', 60_000, 100, 60_000, 'default');
    storage.onApplicationShutdown();

    expect(record.totalHits).toBe(1);
    expect(shared.increment).toHaveBeenCalledTimes(1);
    expect(shared.increment).toHaveBeenCalledWith('k', 60_000, 100, 60_000, 'default');
  });
});
