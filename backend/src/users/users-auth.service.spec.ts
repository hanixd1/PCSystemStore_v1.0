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
    expect(jwtService.signAsync).toHaveBeenCalledWith(expect.objectContaining({ role: 'ADMIN' }), {
      expiresIn: '3h',
    });
    expect(prisma.actionLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'ADMIN_LOGIN',
          module: 'SECURITY',
        }),
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

  it('USERS-01 lista usuarios internos como ADMIN primero y EDITOR despues', async () => {
    const prisma = {
      user: {
        findMany: jest.fn(async () => [
          {
            id: 'editor-1',
            name: 'Editor QA',
            email: 'editor@test.com',
            role: 'EDITOR',
            status: 'ACTIVE',
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedAt: new Date('2026-01-02T00:00:00.000Z'),
          },
          {
            id: 'admin-1',
            name: 'Admin QA',
            email: 'admin@test.com',
            role: 'ADMIN',
            status: 'ACTIVE',
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedAt: new Date('2026-01-02T00:00:00.000Z'),
          },
        ]),
      },
    };
    const jwtService = {
      signAsync: jest.fn(),
    };
    const service = new UsersService(prisma as any, jwtService as any);

    const result = await service.findInternalUsers();

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { role: { in: ['ADMIN', 'EDITOR'] } },
      }),
    );
    expect(result.map((user) => user.role)).toEqual(['ADMIN', 'EDITOR']);
  });

  it('USERS-02 no permite bloquear la cuenta principal', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn(async () => ({
          id: 'primary-admin',
          email: 'admin@pcsystemstore.com',
          role: 'ADMIN',
          status: 'ACTIVE',
        })),
      },
      actionLog: {
        create: jest.fn(),
      },
    };
    const service = new UsersService(prisma as any, { signAsync: jest.fn() } as any);

    await expect(service.toggleStatus('primary-admin', 'admin-2')).rejects.toThrow(
      'La cuenta principal del sistema no puede bloquearse ni degradarse.',
    );
  });

  it('USERS-03 no permite degradar la cuenta principal', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn(async () => ({
          id: 'primary-admin',
          email: 'admin@pcsystemstore.com',
          role: 'ADMIN',
          status: 'ACTIVE',
        })),
      },
      actionLog: {
        create: jest.fn(),
      },
    };
    const service = new UsersService(prisma as any, { signAsync: jest.fn() } as any);

    await expect(
      service.updateUser('primary-admin', { role: 'EDITOR' }, 'admin-2'),
    ).rejects.toThrow('La cuenta principal del sistema no puede bloquearse ni degradarse.');
  });

  it('USERS-04 permite editar y degradar un ADMIN normal si queda otro ADMIN activo', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn(async () => ({
          id: 'admin-normal',
          email: 'admin.normal@test.com',
          role: 'ADMIN',
          status: 'ACTIVE',
        })),
        count: jest.fn(async () => 1),
        update: jest.fn(async ({ data }) => ({
          id: 'admin-normal',
          name: data.name,
          email: 'admin.normal@test.com',
          role: data.role,
          status: data.status,
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        })),
      },
      actionLog: {
        create: jest.fn(async (args) => args),
      },
    };
    const service = new UsersService(prisma as any, { signAsync: jest.fn() } as any);

    const result = await service.updateUser(
      'admin-normal',
      { name: 'Admin editado', role: 'EDITOR', status: 'INACTIVE' },
      'admin-2',
    );

    expect(prisma.user.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          role: 'ADMIN',
          status: 'ACTIVE',
          id: { not: 'admin-normal' },
        }),
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({ name: 'Admin editado', role: 'EDITOR', status: 'INACTIVE' }),
    );
  });
});
