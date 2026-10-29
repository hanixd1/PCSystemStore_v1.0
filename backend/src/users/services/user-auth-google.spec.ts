import { ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { UserAuthService } from './user-auth.service';

describe('UserAuthService Google idToken', () => {
  const originalFetch = global.fetch;
  const originalClientId = process.env.GOOGLE_CLIENT_ID;

  const tokenInfo = (aud: string) =>
    jest.fn(async () => ({
      ok: true,
      json: async () => ({
        aud,
        email: 'cliente@gmail.com',
        email_verified: 'true',
        name: 'Cliente',
      }),
    }));

  const createService = () => {
    const prisma = {
      user: {
        findUnique: jest.fn(async () => null),
        create: jest.fn(async ({ data }: any) => ({ id: 'user-1', ...data })),
      },
      actionLog: { create: jest.fn(async (args: unknown) => args) },
    };
    const session = { buildSession: jest.fn(async (user: unknown) => ({ user })) };
    const emailService = { sendGoogleWelcomeSetPasswordEmail: jest.fn(async () => undefined) };
    const passwordReset = {
      createAccountToken: jest.fn(async () => 'token'),
      getClientFrontendUrl: () => 'http://localhost:3001',
    };
    const passwordHashing = { hashPassword: jest.fn(async (value: string) => `hash:${value}`) };
    const service = new UserAuthService(
      prisma as any,
      session as any,
      emailService as any,
      passwordReset as any,
      passwordHashing as any,
    );
    return { service, prisma, passwordHashing };
  };

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalClientId === undefined) {
      delete process.env.GOOGLE_CLIENT_ID;
    } else {
      process.env.GOOGLE_CLIENT_ID = originalClientId;
    }
  });

  it('rechaza el token si GOOGLE_CLIENT_ID no esta configurado, sin consultar a Google', async () => {
    delete process.env.GOOGLE_CLIENT_ID;
    const fetchMock = tokenInfo('cualquier-cliente');
    global.fetch = fetchMock as any;
    const { service } = createService();

    await expect(service.loginWithGoogle('id-token')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rechaza tokens emitidos para otro cliente de Google', async () => {
    process.env.GOOGLE_CLIENT_ID = 'cliente-tienda';
    global.fetch = tokenInfo('otro-cliente') as any;
    const { service } = createService();

    await expect(service.registerWithGoogle('id-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('crea la cuenta Google con una contrasena aleatoria, no derivada del correo', async () => {
    process.env.GOOGLE_CLIENT_ID = 'cliente-tienda';
    global.fetch = tokenInfo('cliente-tienda') as any;
    const { service, prisma, passwordHashing } = createService();

    await service.registerWithGoogle('id-token');

    const [secret] = passwordHashing.hashPassword.mock.calls[0];
    expect(secret).toMatch(/^[0-9a-f]{64}$/);
    expect(secret).not.toContain('cliente@gmail.com');
    expect((prisma.user.create.mock.calls[0] as any)[0].data.password).toBe(`hash:${secret}`);
  });
});
