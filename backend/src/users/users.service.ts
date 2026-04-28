import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  private sanitizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private getFrontendUrl() {
    return process.env.FRONTEND_URL?.trim().replace(/\/$/, '') || '';
  }

  private buildSession(user: {
    id: string;
    name: string;
    email: string;
    role: string;
  }) {
    return {
      message: 'Login exitoso',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token: `session-${user.id}`,
    };
  }

  private async createLog(
    userId: string,
    action: string,
    entity: string,
    details: string,
  ) {
    await this.prisma.actionLog.create({
      data: {
        userId,
        action,
        entity,
        details,
      },
    });
  }

  async login(email: string, pass: string) {
    const normalizedEmail = this.sanitizeEmail(email);
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales invalidas');
    }

    if (user.status === 'INACTIVE') {
      throw new UnauthorizedException(
        'Cuenta suspendida. Contacte al administrador.',
      );
    }

    const isMatch = await bcrypt.compare(pass, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Credenciales invalidas');
    }

    await this.createLog(
      user.id,
      'LOGIN',
      'USER',
      `Inicio de sesion de ${user.email}`,
    );

    return this.buildSession(user);
  }

  async register(data: { name: string; email: string; password: string }) {
    const normalizedEmail = this.sanitizeEmail(data.email);
    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new ConflictException('Ese correo ya esta registrado');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(data.password, salt);

    const user = await this.prisma.user.create({
      data: {
        name: data.name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        role: 'CUSTOMER',
        status: 'ACTIVE',
      },
    });

    await this.createLog(
      user.id,
      'REGISTER',
      'USER',
      `Registro de cuenta para ${user.email}`,
    );

    return {
      message: 'Cuenta creada correctamente',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  async loginWithGoogle(idToken: string) {
    if (!idToken) {
      throw new BadRequestException('Token de Google requerido');
    }

    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
    );

    if (!response.ok) {
      throw new UnauthorizedException(
        'No se pudo verificar la cuenta de Google',
      );
    }

    const payload = (await response.json()) as {
      aud?: string;
      email?: string;
      email_verified?: string;
      name?: string;
    };

    const configuredClientId = process.env.GOOGLE_CLIENT_ID;
    if (configuredClientId && payload.aud !== configuredClientId) {
      throw new UnauthorizedException(
        'El cliente de Google no coincide con la configuracion',
      );
    }

    if (!payload.email || payload.email_verified !== 'true') {
      throw new UnauthorizedException(
        'La cuenta de Google no tiene un correo verificado',
      );
    }

    const normalizedEmail = this.sanitizeEmail(payload.email);
    let user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (user?.status === 'INACTIVE') {
      throw new UnauthorizedException(
        'Cuenta suspendida. Contacte al administrador.',
      );
    }

    if (!user) {
      const generatedPassword = await bcrypt.hash(
        `${normalizedEmail}-${Date.now()}`,
        10,
      );
      user = await this.prisma.user.create({
        data: {
          name: payload.name?.trim() || normalizedEmail.split('@')[0],
          email: normalizedEmail,
          password: generatedPassword,
          role: 'CUSTOMER',
          status: 'ACTIVE',
        },
      });
    }

    await this.createLog(
      user.id,
      'LOGIN',
      'USER',
      `Inicio de sesion con Google de ${user.email}`,
    );

    return this.buildSession(user);
  }

  async forgotPassword(email: string) {
    const normalizedEmail = this.sanitizeEmail(email);
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const token =
      Math.random().toString(36).substring(2) + Date.now().toString(36);

    await this.prisma.user.update({
      where: { email: normalizedEmail },
      data: {
        resetToken: token,
        resetTokenExpiry: new Date(Date.now() + 3600000),
      },
    });

    const frontendUrl = this.getFrontendUrl();
    if (!frontendUrl) {
      throw new InternalServerErrorException(
        'FRONTEND_URL no esta configurado en el backend.',
      );
    }

    const resetLink = `${frontendUrl}/admin/reset-password?token=${token}`;
    console.log(
      '[SIMULACION EMAIL] Para recuperar contrasena entra aqui:',
      resetLink,
    );

    return {
      message: 'Correo de recuperacion enviado (Revisa la consola del backend)',
    };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      throw new BadRequestException('Token invalido o expirado');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    await this.createLog(
      user.id,
      'UPDATE',
      'USER',
      `Actualizacion de contrasena de ${user.email}`,
    );

    return { message: 'Contrasena actualizada correctamente' };
  }

  async create(data: any) {
    const normalizedEmail = this.sanitizeEmail(data.email);
    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new ConflictException('Ese correo ya esta registrado');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(data.password, salt);

    const user = await this.prisma.user.create({
      data: {
        name: data.name,
        email: normalizedEmail,
        password: hashedPassword,
        role: data.role || 'EDITOR',
        status: 'ACTIVE',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    await this.createLog(
      user.id,
      'CREATE',
      'USER',
      `Creacion de usuario ${user.email}`,
    );

    return user;
  }

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async toggleStatus(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const newStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { status: newStatus },
      select: { id: true, name: true, status: true },
    });

    await this.createLog(
      id,
      'UPDATE',
      'USER',
      `Cambio de estado de ${user.email} a ${newStatus}`,
    );

    return updatedUser;
  }

  async updateUser(id: string, data: any) {
    const updateData: any = { name: data.name, role: data.role };

    if (data.password && data.password.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(data.password, salt);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, name: true, email: true, role: true },
    });

    await this.createLog(
      id,
      'UPDATE',
      'USER',
      `Actualizacion de usuario ${updatedUser.email}`,
    );

    return updatedUser;
  }

  async getAuditLogs() {
    return this.prisma.actionLog.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, role: true } },
      },
    });
  }
}
