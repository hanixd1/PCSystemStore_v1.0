import { UserSessionService } from './user-session.service';

describe('UserSessionService', () => {
  it('conserva expiracion de cliente y rol en el JWT', async () => {
    const jwt = { signAsync: jest.fn(async () => 'customer-token') };
    const service = new UserSessionService(jwt as any);

    const result = await service.buildSession({
      id: 'customer-1',
      name: 'Cliente',
      email: 'cliente@test.com',
      role: 'CUSTOMER',
      emailVerified: false,
    });

    expect(result.token).toBe('customer-token');
    expect(jwt.signAsync).toHaveBeenCalledWith(expect.objectContaining({ role: 'CUSTOMER' }), {
      expiresIn: '12h',
    });
  });

  it('conserva expiracion administrativa', async () => {
    const jwt = { signAsync: jest.fn(async () => 'admin-token') };
    const service = new UserSessionService(jwt as any);

    await service.buildSession({
      id: 'admin-1',
      name: 'Admin',
      email: 'admin@test.com',
      role: 'ADMIN',
    });

    expect(jwt.signAsync).toHaveBeenCalledWith(expect.objectContaining({ role: 'ADMIN' }), {
      expiresIn: '3h',
    });
  });
});
