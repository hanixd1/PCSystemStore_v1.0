import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UsersService } from './users.service';

describe('UsersService auth cliente/admin', () => {
  const hashedPassword = bcrypt.hashSync('secret123', 8);

  const createService = (user: any = null) => {
    const prisma = {
      user: {
        findUnique: jest.fn(async () => user),
      },
      actionLog: {
        create: jest.fn(async (args) => args),
      },
    };
    const jwtService = {
      signAsync: jest.fn(async (payload) => `token-${payload.role}`),
    };

    return {
      service: new UsersService(prisma as any, jwtService as any),
      prisma,
      jwtService,
    };
  };

  it('AUTH-01 permite login cliente solo con rol CUSTOMER', async () => {
    const { service, jwtService } = createService({
      id: 'customer-1',
      name: 'Cliente QA',
      email: 'cliente@test.com',
      password: hashedPassword,
      role: 'CUSTOMER',
      status: 'ACTIVE',
    });

    const result = await service.customerLogin('CLIENTE@test.com ', 'secret123');

    expect(result.user.role).toBe('CUSTOMER');
    expect(result.token).toBe('token-CUSTOMER');
    expect(jwtService.signAsync).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'CUSTOMER' }),
      { expiresIn: '12h' },
    );
  });

  it('AUTH-02 permite login admin solo con rol administrativo', async () => {
    const { service, prisma, jwtService } = createService({
      id: 'admin-1',
      name: 'Admin QA',
      email: 'admin@test.com',
      password: hashedPassword,
      role: 'ADMIN',
      status: 'ACTIVE',
    });

    const result = await service.adminLogin('admin@test.com', 'secret123');

    expect(result.user.role).toBe('ADMIN');
    expect(jwtService.signAsync).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'ADMIN' }),
      { expiresIn: '3h' },
    );
    expect(prisma.actionLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'ADMIN_LOGIN', module: 'SECURITY' }),
      }),
    );
  });

  it('AUTH-03 rechaza ADMIN en login cliente', async () => {
    const { service } = createService({
      id: 'admin-1',
      name: 'Admin QA',
      email: 'admin@test.com',
      password: hashedPassword,
      role: 'ADMIN',
      status: 'ACTIVE',
    });

    await expect(service.customerLogin('admin@test.com', 'secret123')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('AUTH-04 rechaza CUSTOMER en login admin', async () => {
    const { service } = createService({
      id: 'customer-1',
      name: 'Cliente QA',
      email: 'cliente@test.com',
      password: hashedPassword,
      role: 'CUSTOMER',
      status: 'ACTIVE',
    });

    await expect(service.adminLogin('cliente@test.com', 'secret123')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('SEC-01 no autentica payload tipo SQL Injection', async () => {
    const { service } = createService(null);

    await expect(service.customerLogin("' OR 1=1 --", "' OR 1=1 --")).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
