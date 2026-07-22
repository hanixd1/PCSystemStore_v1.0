import { Body, Controller, Get, INestApplication, Post } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SkipThrottle, Throttle, ThrottlerModule } from '@nestjs/throttler';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { configureHttpApplication } from '../src/app.setup';
import { CsrfGuard } from '../src/auth/csrf.guard';
import { SecurityThrottlerGuard } from '../src/security/security-throttler.guard';

@Controller('security-test')
class SecurityTestController {
  @Get('health')
  @SkipThrottle()
  health() {
    return { ok: true };
  }

  @Post('mutate')
  mutate(@Body() body: Record<string, unknown>) {
    return body;
  }

  @Post('limited')
  @Throttle({ default: { limit: 2, ttl: 60_000, blockDuration: 60_000 } })
  limited() {
    return { ok: true };
  }
}

describe('HTTP security hardening (e2e)', () => {
  let app: INestApplication;
  // Isolated test double: production always uses SecurityRateLimitStorage + PostgreSQL.
  const entries = new Map<string, { hits: number; expiresAt: number; blockedUntil: number }>();
  const storage = {
    increment: async (key: string, ttl: number, limit: number, blockDuration: number) => {
      const now = Date.now();
      const current = entries.get(key);
      const entry =
        !current || current.expiresAt <= now
          ? { hits: 0, expiresAt: now + ttl, blockedUntil: 0 }
          : current;
      entry.hits += 1;
      if (entry.hits > limit && entry.blockedUntil <= now) {
        entry.blockedUntil = now + blockDuration;
      }
      entries.set(key, entry);
      return {
        totalHits: entry.hits,
        timeToExpire: Math.max(0, entry.expiresAt - now),
        isBlocked: entry.blockedUntil > now,
        timeToBlockExpire: Math.max(0, entry.blockedUntil - now),
      };
    },
    clear: () => entries.clear(),
  };
  const previousNodeEnv = process.env.NODE_ENV;

  beforeAll(async () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'security-test-secret';
    process.env.CORS_ORIGINS = 'https://store.example.com';
    process.env.CSRF_ALLOWED_ORIGINS = 'https://store.example.com';
    process.env.TRUST_PROXY = '1';
    process.env.BODY_LIMIT = '1mb';
    process.env.RATE_LIMIT_KEY_SECRET = 'security-http-test-key';

    const moduleRef = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [{ name: 'default', limit: 100, ttl: 60_000 }],
          storage: storage as any,
        }),
      ],
      controllers: [SecurityTestController],
      providers: [
        { provide: APP_GUARD, useClass: SecurityThrottlerGuard },
        { provide: APP_GUARD, useClass: CsrfGuard },
      ],
    }).compile();

    app = moduleRef.createNestApplication<NestExpressApplication>({ bodyParser: false });
    configureHttpApplication(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    process.env.NODE_ENV = previousNodeEnv;
  });

  beforeEach(() => storage.clear());

  it('agrega Helmet y solo HSTS cuando la solicitud HTTPS llega por el proxy confiable', async () => {
    const httpResponse = await request(app.getHttpServer())
      .get('/security-test/health')
      .expect(200);
    expect(httpResponse.headers['content-security-policy']).toContain("default-src 'none'");
    expect(httpResponse.headers['x-content-type-options']).toBe('nosniff');
    expect(httpResponse.headers['x-frame-options']).toBe('DENY');
    expect(httpResponse.headers['referrer-policy']).toBe('no-referrer');
    expect(httpResponse.headers['cross-origin-opener-policy']).toBe('same-origin');
    expect(httpResponse.headers['x-powered-by']).toBeUndefined();
    expect(httpResponse.headers['strict-transport-security']).toBeUndefined();

    const httpsResponse = await request(app.getHttpServer())
      .get('/security-test/health')
      .set('X-Forwarded-Proto', 'https')
      .expect(200);
    expect(httpsResponse.headers['strict-transport-security']).toContain('max-age=31536000');
  });

  it('acepta CORS configurado y rechaza un origen no autorizado sin revelar la allowlist', async () => {
    const allowed = await request(app.getHttpServer())
      .get('/security-test/health')
      .set('Origin', 'https://store.example.com')
      .expect(200);
    expect(allowed.headers['access-control-allow-origin']).toBe('https://store.example.com');
    expect(allowed.headers['access-control-allow-credentials']).toBe('true');

    const rejected = await request(app.getHttpServer())
      .get('/security-test/health')
      .set('Origin', 'https://evil.example');
    expect(rejected.status).toBeGreaterThanOrEqual(400);
    expect(JSON.stringify(rejected.body)).not.toContain('store.example.com');
    expect(rejected.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('devuelve 413 al exceder el limite JSON global', async () => {
    await request(app.getHttpServer())
      .post('/security-test/mutate')
      .send({ value: 'x'.repeat(1024 * 1024 + 1) })
      .expect(413);
  });

  it('exige origen y double-submit CSRF en mutaciones autenticadas por cookie', async () => {
    const cookie = 'pcs_customer_session=jwt; pcs_csrf_token=token-seguro';

    await request(app.getHttpServer())
      .post('/security-test/mutate')
      .set('Cookie', cookie)
      .set('Origin', 'https://store.example.com')
      .send({ ok: true })
      .expect(403);

    await request(app.getHttpServer())
      .post('/security-test/mutate')
      .set('Cookie', cookie)
      .set('Origin', 'https://store.example.com')
      .set('X-CSRF-Token', 'token-seguro')
      .send({ ok: true })
      .expect(201, { ok: true });
  });

  it('devuelve 429 generico con Retry-After y no limita health', async () => {
    await request(app.getHttpServer()).post('/security-test/limited').expect(201);
    await request(app.getHttpServer()).post('/security-test/limited').expect(201);
    const blocked = await request(app.getHttpServer()).post('/security-test/limited').expect(429);
    expect(blocked.headers['retry-after']).toBeDefined();
    expect(blocked.body.message).toBe('Demasiadas solicitudes. Intenta nuevamente mas tarde.');

    for (let index = 0; index < 105; index += 1) {
      await request(app.getHttpServer()).get('/security-test/health').expect(200);
    }
  });
});
