import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { JwtUserPayload, USER_ROLES } from '../auth/auth.constants';
import { CreateUserDto } from './dto/create-user.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { RegisterUserDto } from './dto/register-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  private sanitizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private getFrontendUrl() {
    return process.env.FRONTEND_URL?.trim().replace(/\/$/, '') || '';
  }

  private getResetPasswordPath(flow: 'client' | 'admin') {
    if (flow === 'admin') {
      return process.env.ADMIN_RESET_PASSWORD_PATH?.trim() || '/admin/reset-password';
    }

    return process.env.CLIENT_RESET_PASSWORD_PATH?.trim() || '/auth/reset-password';
  }

  private async buildSession(user: {
    id: string;
    name: string;
    email: string;
    role: string;
  }) {
    const payload: JwtUserPayload = {
      sub: user.id,
      email: user.email,
      role: USER_ROLES.includes(user.role as (typeof USER_ROLES)[number])
        ? (user.role as JwtUserPayload['role'])
        : 'CUSTOMER',
    };

    return {
      message: 'Login exitoso',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token: await this.jwtService.signAsync(payload),
    };
  }

  private async createLog(
    userId: string,
    action: string,
    entity: string,
    details: string,
  ) {
    const module =
      action === 'ADMIN_LOGIN'
        ? 'SECURITY'
        : entity === 'USER'
          ? 'EMPLOYEES'
          : undefined;

    await this.prisma.actionLog.create({
      data: {
        userId,
        action,
        entity,
        module,
        entityType: entity,
        entityId: userId,
        details,
      },
    });
  }

  private async validateCredentials(email: string, pass: string) {
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

    return user;
  }

  async login(email: string, pass: string) {
    const user = await this.validateCredentials(email, pass);

    if (['ADMIN', 'EDITOR'].includes(user.role)) {
      await this.createLog(
        user.id,
        'ADMIN_LOGIN',
        'USER',
        `Inicio de sesion administrativo de ${user.email}`,
      );
    }

    return this.buildSession(user);
  }

  async customerLogin(email: string, pass: string) {
    const user = await this.validateCredentials(email, pass);

    if (user.role !== 'CUSTOMER') {
      throw new ForbiddenException('Esta cuenta no esta registrada como cliente.');
    }

    return this.buildSession(user);
  }

  async adminLogin(email: string, pass: string) {
    const user = await this.validateCredentials(email, pass);

    if (!['ADMIN', 'EDITOR', 'EMPLOYEE'].includes(user.role)) {
      throw new ForbiddenException('Esta cuenta no tiene permisos administrativos.');
    }

    await this.createLog(
      user.id,
      'ADMIN_LOGIN',
      'USER',
      `Inicio de sesion administrativo de ${user.email}`,
    );

    return this.buildSession(user);
  }

  async register(data: RegisterUserDto) {
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

    if (['ADMIN', 'EDITOR'].includes(user.role)) {
      await this.createLog(
        user.id,
        'ADMIN_LOGIN',
        'USER',
        `Inicio de sesion administrativo con Google de ${user.email}`,
      );
    }

    return this.buildSession(user);
  }

  async forgotPassword(email: string, flow: 'client' | 'admin' = 'client') {
    const normalizedEmail = this.sanitizeEmail(email);
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    const genericResponse = {
      message:
        'Si el correo esta registrado, recibiras las instrucciones de recuperacion.',
    };

    if (!user) {
      return genericResponse;
    }

    const isAdminFlow = flow === 'admin';
    const isAdminUser = ['ADMIN', 'EDITOR'].includes(user.role);
    if (isAdminFlow !== isAdminUser) {
      return genericResponse;
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

    const resetPath = this.getResetPasswordPath(flow);
    const resetLink = `${frontendUrl}${resetPath}?token=${token}`;
    console.log(
      '[SIMULACION EMAIL] Para recuperar contrasena entra aqui:',
      resetLink,
    );

    return genericResponse;
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

  async create(data: CreateUserDto) {
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
        role: data.role || 'EDITOR',
        status: 'ACTIVE',
      },
      select: {
        id: true,
        name: true,
        email: true,
        birthDate: true,
        documentType: true,
        documentNumber: true,
        gender: true,
        mobilePhone: true,
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

  async getMe(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        birthDate: true,
        documentType: true,
        documentNumber: true,
        gender: true,
        mobilePhone: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return user;
  }

  async updateProfile(id: string, data: UpdateProfileDto) {
    const existingCurrentUser = await this.prisma.user.findUnique({
      where: { id },
      select: { documentNumber: true },
    });

    if (!existingCurrentUser) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const updateData: {
      name?: string;
      email?: string;
      birthDate?: Date | null;
      documentType?: string;
      documentNumber?: string;
      gender?: string;
      mobilePhone?: string;
    } = {};

    if (data.name !== undefined) {
      updateData.name = data.name.trim();
    }

    if (data.email !== undefined) {
      const normalizedEmail = this.sanitizeEmail(data.email);
      const existingUser = await this.prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (existingUser && existingUser.id !== id) {
        throw new ConflictException('Ese correo ya esta registrado');
      }

      updateData.email = normalizedEmail;
    }

    const wantsDocumentChange =
      data.documentType !== undefined || data.documentNumber !== undefined;
    if (existingCurrentUser.documentNumber && wantsDocumentChange) {
      throw new BadRequestException(
        'El documento de identidad no puede modificarse una vez registrado.',
      );
    }

    if (!existingCurrentUser.documentNumber) {
      if (data.documentType !== undefined) {
        updateData.documentType = data.documentType.trim();
      }

      if (data.documentNumber !== undefined) {
        updateData.documentNumber = data.documentNumber.trim();
      }
    }

    if (data.birthDate !== undefined) {
      updateData.birthDate = data.birthDate ? new Date(data.birthDate) : null;
    }

    if (data.gender !== undefined) {
      updateData.gender = data.gender.trim();
    }

    if (data.mobilePhone !== undefined) {
      updateData.mobilePhone = data.mobilePhone.trim();
    }

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('Debes enviar al menos un campo valido');
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        birthDate: true,
        documentType: true,
        documentNumber: true,
        gender: true,
        mobilePhone: true,
        role: true,
      },
    });

    return {
      message: 'Datos actualizados correctamente',
      user,
    };
  }

  async changePassword(id: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('La contrasena actual es incorrecta');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    return { message: 'Contrasena actualizada correctamente.' };
  }

  getAddresses(userId: string) {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  createAddress(userId: string, data: CreateAddressDto) {
    return this.prisma.address.create({
      data: {
        userId,
        label: data.label?.trim() || 'Direccion',
        department: data.department.trim(),
        province: data.province.trim(),
        district: data.district.trim(),
        addressLine: data.addressLine.trim(),
        reference: data.reference?.trim() || null,
        phone: data.phone?.trim() || null,
      },
    });
  }

  async deleteAddress(userId: string, id: string) {
    const address = await this.prisma.address.findFirst({
      where: { id, userId },
    });

    if (!address) {
      throw new NotFoundException('Direccion no encontrada');
    }

    await this.prisma.address.delete({ where: { id } });
    return { message: 'Direccion eliminada correctamente' };
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

  async updateUser(id: string, data: UpdateUserDto) {
    const updateData: any = {};

    if (data.name !== undefined) {
      updateData.name = data.name.trim();
    }

    if (data.role !== undefined) {
      updateData.role = data.role;
    }

    if (data.email !== undefined) {
      const normalizedEmail = this.sanitizeEmail(data.email);
      const existingUser = await this.prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (existingUser && existingUser.id !== id) {
        throw new ConflictException('Ese correo ya esta registrado');
      }

      updateData.email = normalizedEmail;
    }

    if (data.password && data.password.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(data.password, salt);
    }

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException(
        'Debes enviar al menos un campo valido para actualizar',
      );
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
      where: {
        NOT: [
          {
            action: 'LOGIN',
            user: { role: 'CUSTOMER' },
          },
          {
            action: 'REGISTER',
            user: { role: 'CUSTOMER' },
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, role: true } },
      },
    });
  }
}
