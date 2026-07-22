import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../common/email/email.service';
import { Request } from 'express';
import { CreateAddressDto } from './dto/create-address.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { RegisterUserDto } from './dto/register-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PasswordResetService } from './services/password-reset.service';
import { UserAddressService } from './services/user-address.service';
import { UserAuthService } from './services/user-auth.service';
import { UserProfileService } from './services/user-profile.service';
import { isCustomerProfileComplete, UserSessionService } from './services/user-session.service';

const STAFF_MANAGEMENT_ROLES = ['ADMIN', 'EDITOR'] as const;
const PRIMARY_ADMIN_EMAIL =
  process.env.PRIMARY_ADMIN_EMAIL?.trim().toLowerCase() || 'admin@pcsystemstore.com';

/** Public facade retained for controllers, guards and existing consumers. */
@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    jwtService: JwtService,
    emailService: EmailService = undefined as never,
    private readonly session: UserSessionService = new UserSessionService(jwtService),
    private readonly passwordReset: PasswordResetService = new PasswordResetService(
      prisma,
      emailService,
    ),
    private readonly auth: UserAuthService = new UserAuthService(
      prisma,
      session,
      emailService,
      passwordReset,
    ),
    private readonly profile: UserProfileService = new UserProfileService(prisma),
    private readonly addresses: UserAddressService = new UserAddressService(prisma),
  ) {}

  async login(email: string, pass: string, request?: Request) {
    return this.auth.customerLogin(email, pass, request);
  }
  async customerLogin(email: string, pass: string, request?: Request) {
    return this.auth.customerLogin(email, pass, request);
  }
  async adminLogin(email: string, pass: string, request?: Request) {
    return this.auth.adminLogin(email, pass, request);
  }
  async recordLogout(userId: string, action: 'ADMIN_LOGOUT' | 'CUSTOMER_LOGOUT') {
    return this.auth.recordLogout(userId, action);
  }
  async register(data: RegisterUserDto) {
    return this.auth.register(data);
  }
  createGoogleOAuthUrl(mode: string) {
    return this.auth.createGoogleOAuthUrl(mode);
  }
  async handleGoogleOAuthCallback(code: string, state: string, stateCookie?: string) {
    return this.auth.handleGoogleOAuthCallback(code, state, stateCookie);
  }
  async loginWithGoogle(idToken: string) {
    return this.auth.loginWithGoogle(idToken);
  }
  async registerWithGoogle(idToken: string) {
    return this.auth.registerWithGoogle(idToken);
  }
  async forgotPassword(email: string, flow: 'client' | 'admin' = 'client') {
    return this.passwordReset.forgotPassword(email, flow);
  }
  async resetPassword(token: string, newPassword: string, flow?: 'client' | 'admin') {
    return this.passwordReset.resetPassword(token, newPassword, flow);
  }
  async setCustomerPassword(token: string, password: string, confirmPassword: string) {
    return this.passwordReset.setCustomerPassword(token, password, confirmPassword);
  }
  async verifyEmail(token: string) {
    return this.passwordReset.verifyEmail(token);
  }
  async getMe(id: string) {
    return this.profile.getMe(id);
  }
  async updateProfile(id: string, data: UpdateProfileDto) {
    return this.profile.updateProfile(id, data);
  }
  async changePassword(id: string, currentPassword: string, newPassword: string) {
    return this.profile.changePassword(id, currentPassword, newPassword);
  }
  getAddresses(userId: string) {
    return this.addresses.getAddresses(userId);
  }
  createAddress(userId: string, data: CreateAddressDto) {
    return this.addresses.createAddress(userId, data);
  }
  async deleteAddress(userId: string, id: string) {
    return this.addresses.deleteAddress(userId, id);
  }

  async create(data: CreateUserDto) {
    const role = data.role || 'EDITOR';
    this.assertInternalUserRole(role);
    this.auth.assertAdministrativePassword(data.password);
    const email = this.auth.sanitizeEmail(data.email);
    if (await this.prisma.user.findUnique({ where: { email } })) {
      throw new ConflictException('Ese correo ya esta registrado');
    }

    const user = await this.prisma.user.create({
      data: {
        name: data.name.trim(),
        email,
        password: await this.auth.hashPassword(data.password),
        role,
        status: 'ACTIVE',
        emailVerified: true,
        emailVerifiedAt: new Date(),
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
        emailVerified: true,
        emailVerifiedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    await this.createLog(user.id, 'CREATE', `Creacion de usuario ${user.email}`);
    return { ...user, profileComplete: isCustomerProfileComplete(user) };
  }
  async createEditor(data: CreateUserDto) {
    return this.create({ ...data, role: 'EDITOR' });
  }
  async findAll() {
    return this.findInternalUsers();
  }

  async findInternalUsers() {
    const users = await this.prisma.user.findMany({
      where: { role: { in: [...STAFF_MANAGEMENT_ROLES] } },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return users.sort((left, right) =>
      left.role !== right.role
        ? left.role === 'ADMIN'
          ? -1
          : 1
        : right.createdAt.getTime() - left.createdAt.getTime(),
    );
  }
  async findEditors() {
    return this.prisma.user.findMany({
      where: { role: 'EDITOR' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async toggleStatus(id: string, actorUserId?: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    this.assertInternalUser(user.role);
    const status = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    await this.assertInternalUserMutationAllowed(user, { status }, actorUserId);
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { status },
      select: { id: true, name: true, status: true },
    });
    await this.createLog(id, 'UPDATE', `Cambio de estado de ${user.email} a ${status}`);
    return updatedUser;
  }

  async updateUser(id: string, data: UpdateUserDto, actorUserId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, role: true, status: true },
    });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    this.assertInternalUser(user.role);
    await this.assertInternalUserMutationAllowed(user, data, actorUserId);
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) {
      updateData.name = data.name.trim();
    }
    if (data.role !== undefined) {
      this.assertInternalUserRole(data.role);
      updateData.role = data.role;
    }
    if (data.email !== undefined) {
      const email = this.auth.sanitizeEmail(data.email);
      const existingUser = await this.prisma.user.findUnique({ where: { email } });
      if (existingUser && existingUser.id !== id) {
        throw new ConflictException('Ese correo ya esta registrado');
      }
      updateData.email = email;
    }
    if (data.status !== undefined) {
      updateData.status = data.status;
    }
    if (data.password && data.password.trim() !== '') {
      this.auth.assertAdministrativePassword(data.password);
      updateData.password = await this.auth.hashPassword(data.password);
    }
    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('Debes enviar al menos un campo valido para actualizar');
    }
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, name: true, email: true, role: true, status: true, updatedAt: true },
    });
    await this.createLog(id, 'UPDATE', `Actualizacion de usuario ${updatedUser.email}`);
    return updatedUser;
  }

  async getAuditLogs() {
    return this.prisma.actionLog.findMany({
      where: {
        NOT: [
          { action: 'LOGIN', user: { role: 'CUSTOMER' } },
          { action: 'REGISTER', user: { role: 'CUSTOMER' } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true, role: true } } },
    });
  }

  private async createLog(userId: string, action: string, details: string) {
    await this.prisma.actionLog.create({
      data: { userId, action, entity: 'USER', entityType: 'USER', entityId: userId, details },
    });
  }
  private assertInternalUser(role: string) {
    if (!this.isAllowedInternalUserRole(role)) {
      throw new NotFoundException('Usuario no encontrado');
    }
  }
  private assertInternalUserRole(role: string) {
    if (!this.isAllowedInternalUserRole(role)) {
      throw new BadRequestException('Rol no permitido para gestión de personal.');
    }
  }
  private isAllowedInternalUserRole(role: string) {
    return STAFF_MANAGEMENT_ROLES.includes(role as (typeof STAFF_MANAGEMENT_ROLES)[number]);
  }
  private isPrimaryAdminEmail(email: string) {
    return this.auth.sanitizeEmail(email) === PRIMARY_ADMIN_EMAIL;
  }
  private async assertInternalUserMutationAllowed(
    user: { id: string; email: string; role: string; status?: string },
    data: UpdateUserDto,
    actorUserId?: string,
  ) {
    const isPrimaryAdmin = this.isPrimaryAdminEmail(user.email);
    if (
      isPrimaryAdmin &&
      ((data.role !== undefined && data.role !== 'ADMIN') ||
        data.status === 'INACTIVE' ||
        (data.email !== undefined &&
          this.auth.sanitizeEmail(data.email) !== this.auth.sanitizeEmail(user.email)))
    ) {
      throw new BadRequestException(
        'La cuenta principal del sistema no puede bloquearse ni degradarse.',
      );
    }
    if (actorUserId && user.id === actorUserId) {
      if (data.status === 'INACTIVE') {
        throw new BadRequestException('No puedes bloquear tu propia cuenta administrativa.');
      }
      if (data.role !== undefined && data.role !== 'ADMIN') {
        throw new BadRequestException('No puedes degradar tu propia cuenta administrativa.');
      }
    }
    const willStopBeingActiveAdmin =
      user.role === 'ADMIN' &&
      user.status === 'ACTIVE' &&
      ((data.role !== undefined && data.role !== 'ADMIN') || data.status === 'INACTIVE');
    if (!willStopBeingActiveAdmin) {
      return;
    }
    if (
      (await this.prisma.user.count({
        where: { role: 'ADMIN', status: 'ACTIVE', id: { not: user.id } },
      })) === 0
    ) {
      throw new BadRequestException('Debe quedar al menos un administrador activo.');
    }
  }
}
