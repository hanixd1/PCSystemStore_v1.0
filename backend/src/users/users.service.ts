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
import { AccountTokenType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { Request } from 'express';
import { createHash, randomBytes } from 'node:crypto';
import { JwtUserPayload, USER_ROLES } from '../auth/auth.constants';
import { EmailService } from '../common/email/email.service';
import { CreateUserDto } from './dto/create-user.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { RegisterUserDto } from './dto/register-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const CUSTOMER_SESSION_EXPIRES_IN = '12h';
const ADMIN_SESSION_EXPIRES_IN = '3h';
const RESET_PASSWORD_TOKEN_EXPIRES_MS = 30 * 60 * 1000;
const INTERNAL_USER_ROLES = ['ADMIN', 'EDITOR', 'EMPLOYEE'] as const;
const ADMIN_RESET_ROLES = ['ADMIN', 'EDITOR'] as const;

type ProfileUpdateData = {
  name?: string;
  email?: string;
  emailVerified?: boolean;
  emailVerifiedAt?: Date | null;
  birthDate?: Date | null;
  documentType?: string;
  documentNumber?: string;
  gender?: string;
  mobilePhone?: string;
};

type ProfileCurrentUser = {
  email: string;
  emailVerified: boolean;
  documentNumber: string | null;
};

@Injectable()
export class UsersService {
  private readonly adminLoginAttempts = new Map<
    string,
    { count: number; firstAttemptAt: number }
  >();

  constructor(
    private prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  private sanitizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private getFrontendUrl() {
    return process.env.FRONTEND_URL?.trim().replace(/\/$/, '') || '';
  }

  private getRequiredFrontendUrl() {
    const frontendUrl = this.getFrontendUrl();
    if (!frontendUrl) {
      throw new InternalServerErrorException('FRONTEND_URL no esta configurado en el backend.');
    }

    return frontendUrl;
  }

  private getResetPasswordPath(flow: 'client' | 'admin') {
    if (flow === 'admin') {
      return process.env.ADMIN_RESET_PASSWORD_PATH?.trim() || '/admin/reset-password';
    }

    return process.env.CLIENT_RESET_PASSWORD_PATH?.trim() || '/auth/reset-password';
  }

  private generateSecureResetToken(): string {
    return randomBytes(32).toString('hex');
  }

  private hashResetToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async createAccountToken(userId: string, type: AccountTokenType) {
    const plainToken = this.generateSecureResetToken();
    const tokenHash = this.hashResetToken(plainToken);

    await this.prisma.accountToken.create({
      data: {
        userId,
        type,
        tokenHash,
        expiresAt: new Date(Date.now() + RESET_PASSWORD_TOKEN_EXPIRES_MS),
      },
    });

    return plainToken;
  }

  private async consumeAccountToken(token: string, type: AccountTokenType) {
    const tokenHash = this.hashResetToken(token);
    const accountToken = await this.prisma.accountToken.findFirst({
      where: {
        tokenHash,
        type,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!accountToken) {
      throw new BadRequestException('El enlace no es valido o ha expirado.');
    }

    await this.prisma.accountToken.update({
      where: { id: accountToken.id },
      data: { usedAt: new Date() },
    });

    return accountToken.user;
  }

  private async buildSession(user: {
    id: string;
    name: string;
    email: string;
    role: string;
    emailVerified?: boolean;
    documentType?: string | null;
    documentNumber?: string | null;
    mobilePhone?: string | null;
  }) {
    const payload: JwtUserPayload = {
      sub: user.id,
      email: user.email,
      role: USER_ROLES.includes(user.role as (typeof USER_ROLES)[number])
        ? (user.role as JwtUserPayload['role'])
        : 'CUSTOMER',
    };

    const expiresIn =
      payload.role === 'CUSTOMER' ? CUSTOMER_SESSION_EXPIRES_IN : ADMIN_SESSION_EXPIRES_IN;

    return {
      message: 'Login exitoso',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: Boolean(user.emailVerified),
        profileComplete: this.isCustomerProfileComplete(user),
      },
      token: await this.jwtService.signAsync(payload, { expiresIn }),
    };
  }

  private getRequestIp(request?: Request) {
    const forwardedFor = request?.headers['x-forwarded-for'];
    if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
      return forwardedFor.split(',')[0]?.trim();
    }

    return request?.ip || request?.socket?.remoteAddress;
  }

  private getUserAgent(request?: Request) {
    return request?.headers['user-agent'];
  }

  private async createLog(
    userId: string,
    action: string,
    entity: string,
    details: string,
    request?: Request,
  ) {
    const module = action.startsWith('ADMIN_')
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
        ipAddress: this.getRequestIp(request),
        userAgent: this.getUserAgent(request),
      },
    });
  }

  private getLoginAttemptKey(email: string, request?: Request) {
    return `${this.sanitizeEmail(email)}:${this.getRequestIp(request) || 'unknown'}`;
  }

  private assertAdminLoginAllowed(email: string, request?: Request) {
    const key = this.getLoginAttemptKey(email, request);
    const attempt = this.adminLoginAttempts.get(key);
    const windowMs = 15 * 60 * 1000;

    if (!attempt) {
      return;
    }

    if (Date.now() - attempt.firstAttemptAt > windowMs) {
      this.adminLoginAttempts.delete(key);
      return;
    }

    if (attempt.count >= 5) {
      throw new UnauthorizedException('Credenciales invalidas o acceso no autorizado.');
    }
  }

  private registerAdminLoginFailure(email: string, request?: Request) {
    const key = this.getLoginAttemptKey(email, request);
    const current = this.adminLoginAttempts.get(key);
    const windowMs = 15 * 60 * 1000;

    if (!current || Date.now() - current.firstAttemptAt > windowMs) {
      this.adminLoginAttempts.set(key, {
        count: 1,
        firstAttemptAt: Date.now(),
      });
      return;
    }

    this.adminLoginAttempts.set(key, {
      ...current,
      count: current.count + 1,
    });
  }

  private clearAdminLoginFailures(email: string, request?: Request) {
    this.adminLoginAttempts.delete(this.getLoginAttemptKey(email, request));
  }

  private async logAuthEvent(action: string, userId: string, details: string, request?: Request) {
    await this.createLog(userId, action, 'USER', details, request);
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
      throw new UnauthorizedException('Cuenta suspendida. Contacte al administrador.');
    }

    const isMatch = await bcrypt.compare(pass, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Credenciales invalidas');
    }

    return user;
  }

  async login(email: string, pass: string, request?: Request) {
    return this.customerLogin(email, pass, request);
  }

  async customerLogin(email: string, pass: string, request?: Request) {
    try {
      const user = await this.validateCredentials(email, pass);

      if (user.role !== 'CUSTOMER') {
        await this.logAuthEvent(
          'CUSTOMER_LOGIN_FAILED',
          user.id,
          `Intento de login cliente no autorizado para ${user.email}`,
          request,
        );
        throw new ForbiddenException('Credenciales invalidas o acceso no autorizado.');
      }

      await this.logAuthEvent(
        'CUSTOMER_LOGIN_SUCCESS',
        user.id,
        `Inicio de sesion cliente de ${user.email}`,
        request,
      );

      return this.buildSession(user);
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }

      throw error;
    }
  }

  async adminLogin(email: string, pass: string, request?: Request) {
    this.assertAdminLoginAllowed(email, request);

    try {
      const user = await this.validateCredentials(email, pass);

      if (!['ADMIN', 'EDITOR', 'EMPLOYEE'].includes(user.role)) {
        this.registerAdminLoginFailure(email, request);
        await this.logAuthEvent(
          'ADMIN_LOGIN_FAILED',
          user.id,
          `Intento de login administrativo no autorizado para ${user.email}`,
          request,
        );
        throw new ForbiddenException('Credenciales invalidas o acceso no autorizado.');
      }

      this.clearAdminLoginFailures(email, request);
      await this.logAuthEvent(
        'ADMIN_LOGIN_SUCCESS',
        user.id,
        `Inicio de sesion administrativo de ${user.email}`,
        request,
      );
      await this.logAuthEvent(
        'ADMIN_LOGIN',
        user.id,
        `Inicio de sesion administrativo de ${user.email}`,
        request,
      );

      return this.buildSession(user);
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }

      this.registerAdminLoginFailure(email, request);
      throw new UnauthorizedException('Credenciales invalidas o acceso no autorizado.');
    }
  }

  async recordLogout(userId: string, action: 'ADMIN_LOGOUT' | 'CUSTOMER_LOGOUT') {
    await this.createLog(userId, action, 'USER', 'Cierre de sesion');
  }

  async register(data: RegisterUserDto) {
    if (data.password !== data.confirmPassword) {
      throw new BadRequestException('Las contrasenas no coinciden.');
    }

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
        emailVerified: false,
      },
    });

    const token = await this.createAccountToken(user.id, AccountTokenType.EMAIL_VERIFICATION);
    const verificationLink = `${this.getRequiredFrontendUrl()}/auth/verify-email?token=${token}`;
    await this.emailService.sendEmailVerificationEmail({
      to: user.email,
      name: user.name,
      link: verificationLink,
    });

    return {
      message: 'Cuenta creada correctamente. Revisa tu correo para verificar tu cuenta.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        profileComplete: this.isCustomerProfileComplete(user),
      },
    };
  }

  private async verifyGoogleIdToken(idToken: string) {
    if (!idToken?.trim()) {
      throw new BadRequestException('Token de Google requerido');
    }

    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
    );

    if (!response.ok) {
      throw new UnauthorizedException('No se pudo verificar la cuenta de Google');
    }

    const payload = (await response.json()) as {
      aud?: string;
      email?: string;
      email_verified?: string;
      name?: string;
    };

    const configuredClientId = process.env.GOOGLE_CLIENT_ID;
    if (configuredClientId && payload.aud !== configuredClientId) {
      throw new UnauthorizedException('El cliente de Google no coincide con la configuracion');
    }

    if (!payload.email || payload.email_verified !== 'true') {
      throw new UnauthorizedException('La cuenta de Google no tiene un correo verificado');
    }

    return {
      email: this.sanitizeEmail(payload.email),
      name: payload.name?.trim() || payload.email.split('@')[0],
    };
  }

  async loginWithGoogle(idToken: string) {
    const googleProfile = await this.verifyGoogleIdToken(idToken);
    const user = await this.prisma.user.findUnique({
      where: { email: googleProfile.email },
    });

    if (!user) {
      throw new UnauthorizedException(
        'No existe una cuenta asociada a este Google. Crea una cuenta para continuar.',
      );
    }

    if (user?.status === 'INACTIVE') {
      throw new UnauthorizedException('Cuenta suspendida. Contacte al administrador.');
    }

    if (user && user.role !== 'CUSTOMER') {
      throw new UnauthorizedException(
        'Esta cuenta no puede iniciar sesion como cliente con Google',
      );
    }

    await this.createLog(
      user.id,
      'LOGIN',
      'USER',
      `Inicio de sesion cliente con Google de ${user.email}`,
    );

    return this.buildSession(user);
  }

  async registerWithGoogle(idToken: string) {
    const googleProfile = await this.verifyGoogleIdToken(idToken);
    let user = await this.prisma.user.findUnique({
      where: { email: googleProfile.email },
    });

    if (user?.status === 'INACTIVE') {
      throw new UnauthorizedException('Cuenta suspendida. Contacte al administrador.');
    }

    if (user && user.role !== 'CUSTOMER') {
      throw new UnauthorizedException('Esta cuenta no puede registrarse como cliente con Google');
    }

    let createdUser = false;
    if (!user) {
      const generatedPassword = await bcrypt.hash(`${googleProfile.email}-${Date.now()}`, 10);
      user = await this.prisma.user.create({
        data: {
          name: googleProfile.name,
          email: googleProfile.email,
          password: generatedPassword,
          role: 'CUSTOMER',
          status: 'ACTIVE',
          emailVerified: true,
          emailVerifiedAt: new Date(),
        },
      });
      createdUser = true;
    }

    if (createdUser) {
      const token = await this.createAccountToken(user.id, AccountTokenType.SET_PASSWORD);
      const setPasswordLink = `${this.getRequiredFrontendUrl()}/auth/set-password?token=${token}`;
      await this.emailService.sendGoogleWelcomeSetPasswordEmail({
        to: user.email,
        name: user.name,
        link: setPasswordLink,
      });
    }

    await this.createLog(
      user.id,
      createdUser ? 'REGISTER' : 'LOGIN',
      'USER',
      `${createdUser ? 'Registro' : 'Inicio de sesion'} cliente con Google de ${user.email}`,
    );

    return this.buildSession(user);
  }

  async forgotPassword(email: string, flow: 'client' | 'admin' = 'client') {
    const normalizedEmail = this.sanitizeEmail(email);
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    const genericResponse = {
      message: 'Si el correo esta registrado, recibiras las instrucciones de recuperacion.',
    };

    if (!user) {
      return genericResponse;
    }

    if (!this.canUsePasswordResetFlow(user.role, flow)) {
      return genericResponse;
    }

    const plainToken = await this.createAccountToken(user.id, AccountTokenType.PASSWORD_RESET);

    const resetPath = this.getResetPasswordPath(flow);
    const resetLink = `${this.getRequiredFrontendUrl()}${resetPath}?token=${plainToken}`;
    await this.emailService.sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      resetLink,
      flow,
    });

    return genericResponse;
  }

  async resetPassword(token: string, newPassword: string, flow?: 'client' | 'admin') {
    const user = await this.consumeAccountToken(token, AccountTokenType.PASSWORD_RESET);

    if (flow && !this.canUsePasswordResetFlow(user.role, flow)) {
      throw new BadRequestException('El enlace de recuperacion no es valido o ha expirado.');
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

    await this.createLog(user.id, 'UPDATE', 'USER', `Actualizacion de contrasena de ${user.email}`);

    return { message: 'Contrasena actualizada correctamente' };
  }

  async setCustomerPassword(token: string, password: string, confirmPassword: string) {
    if (password !== confirmPassword) {
      throw new BadRequestException('Las contrasenas no coinciden.');
    }

    const user = await this.consumeAccountToken(token, AccountTokenType.SET_PASSWORD);
    if (user.role !== 'CUSTOMER') {
      throw new BadRequestException('El enlace no es valido o ha expirado.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    return { message: 'Contrasena creada correctamente' };
  }

  async verifyEmail(token: string) {
    const user = await this.consumeAccountToken(token, AccountTokenType.EMAIL_VERIFICATION);
    if (user.role !== 'CUSTOMER') {
      throw new BadRequestException('El enlace no es valido o ha expirado.');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerifiedAt: new Date(),
      },
    });

    return { message: 'Correo verificado correctamente' };
  }

  private canUsePasswordResetFlow(role: string, flow: 'client' | 'admin'): boolean {
    if (flow === 'client') {
      return role === 'CUSTOMER';
    }

    return ADMIN_RESET_ROLES.includes(role as (typeof ADMIN_RESET_ROLES)[number]);
  }

  private isCustomerProfileComplete(user: {
    role?: string;
    documentType?: string | null;
    documentNumber?: string | null;
    mobilePhone?: string | null;
    emailVerified?: boolean | null;
  }): boolean {
    if (user.role && user.role !== 'CUSTOMER') {
      return true;
    }

    return Boolean(
      user.emailVerified &&
      user.documentType?.trim() &&
      user.documentNumber?.trim() &&
      user.mobilePhone?.trim(),
    );
  }

  private assertValidCustomerProfileData(data: {
    documentType?: string;
    documentNumber?: string;
    mobilePhone?: string;
  }): void {
    if (
      data.documentType !== undefined &&
      !['DNI', 'Carnet de extranjeria', 'Pasaporte'].includes(data.documentType)
    ) {
      throw new BadRequestException('Tipo de documento invalido');
    }

    if (data.documentNumber !== undefined && data.documentType) {
      this.assertValidDocumentNumber(data.documentType, data.documentNumber);
    }

    if (data.mobilePhone !== undefined && !this.isValidPeruMobilePhone(data.mobilePhone)) {
      throw new BadRequestException('El numero de celular debe tener 9 digitos');
    }
  }

  private assertValidDocumentNumber(documentType: string, documentNumber: string): void {
    const value = documentNumber.trim();

    if (documentType === 'DNI' && !this.isNumericText(value, 8, 8)) {
      throw new BadRequestException('El DNI debe tener 8 digitos numericos');
    }

    if (documentType === 'Carnet de extranjeria' && !this.isAlphaNumericText(value, 9, 12)) {
      throw new BadRequestException('El carnet de extranjeria debe tener entre 9 y 12 caracteres');
    }

    if (documentType === 'Pasaporte' && !this.isAlphaNumericText(value, 6, 12)) {
      throw new BadRequestException('El pasaporte debe tener entre 6 y 12 caracteres');
    }
  }

  private isValidPeruMobilePhone(value: string): boolean {
    const normalized = value.trim().startsWith('+51') ? value.trim().slice(3) : value.trim();
    return this.isNumericText(normalized, 9, 9);
  }

  private isNumericText(value: string, min: number, max: number): boolean {
    return (
      value.length >= min &&
      value.length <= max &&
      Array.from(value).every((char) => char >= '0' && char <= '9')
    );
  }

  private isAlphaNumericText(value: string, min: number, max: number): boolean {
    return (
      value.length >= min &&
      value.length <= max &&
      Array.from(value).every((char) => {
        const code = char.codePointAt(0);
        return (
          code !== undefined &&
          ((code >= 48 && code <= 57) || (code >= 65 && code <= 90) || (code >= 97 && code <= 122))
        );
      })
    );
  }

  async create(data: CreateUserDto) {
    const role = data.role || 'EDITOR';
    this.assertInternalUserRole(role);

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
      },
    });

    await this.createLog(user.id, 'CREATE', 'USER', `Creacion de usuario ${user.email}`);

    return {
      ...user,
      profileComplete: this.isCustomerProfileComplete(user),
    };
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
        emailVerified: true,
        emailVerifiedAt: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return {
      ...user,
      profileComplete: this.isCustomerProfileComplete(user),
    };
  }

  async updateProfile(id: string, data: UpdateProfileDto) {
    const existingCurrentUser = await this.findProfileUserOrThrow(id);
    this.assertValidCustomerProfileData({
      documentType: data.documentType,
      documentNumber: data.documentNumber,
      mobilePhone: data.mobilePhone,
    });
    const updateData = await this.buildProfileUpdateData(id, data, existingCurrentUser);

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
        emailVerified: true,
      },
    });

    return {
      message: 'Datos actualizados correctamente',
      user: {
        ...user,
        profileComplete: this.isCustomerProfileComplete(user),
      },
    };
  }

  private async findProfileUserOrThrow(id: string): Promise<ProfileCurrentUser> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { email: true, emailVerified: true, documentNumber: true },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return user;
  }

  private async buildProfileUpdateData(
    id: string,
    data: UpdateProfileDto,
    currentUser: ProfileCurrentUser,
  ): Promise<ProfileUpdateData> {
    const updateData: ProfileUpdateData = {};

    this.applyBasicProfileFields(updateData, data);

    if (data.email !== undefined) {
      await this.applyProfileEmailUpdate(updateData, data.email, id, currentUser);
    }

    this.applyDocumentProfileFields(updateData, data, currentUser.documentNumber);
    this.assertProfileUpdateIsNotEmpty(updateData);

    return updateData;
  }

  private applyBasicProfileFields(updateData: ProfileUpdateData, data: UpdateProfileDto): void {
    if (data.name !== undefined) {
      updateData.name = data.name.trim();
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
  }

  private async getAvailableProfileEmail(email: string, userId: string): Promise<string> {
    const normalizedEmail = this.sanitizeEmail(email);
    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser && existingUser.id !== userId) {
      throw new ConflictException('Ese correo ya esta registrado');
    }

    return normalizedEmail;
  }

  private async applyProfileEmailUpdate(
    updateData: ProfileUpdateData,
    email: string,
    userId: string,
    currentUser: ProfileCurrentUser,
  ): Promise<void> {
    const normalizedEmail = this.sanitizeEmail(email);

    if (normalizedEmail === currentUser.email.toLowerCase()) {
      updateData.email = normalizedEmail;
      return;
    }

    if (currentUser.emailVerified) {
      throw new BadRequestException(
        'Para cambiar un correo verificado debes iniciar un proceso de verificacion.',
      );
    }

    updateData.email = await this.getAvailableProfileEmail(normalizedEmail, userId);
    updateData.emailVerified = false;
    updateData.emailVerifiedAt = null;
  }

  private applyDocumentProfileFields(
    updateData: ProfileUpdateData,
    data: UpdateProfileDto,
    currentDocumentNumber: string | null,
  ): void {
    this.assertDocumentCanBeChanged(currentDocumentNumber, data);

    if (currentDocumentNumber) {
      return;
    }

    if (data.documentType !== undefined) {
      updateData.documentType = data.documentType.trim();
    }

    if (data.documentNumber !== undefined) {
      updateData.documentNumber = data.documentNumber.trim();
    }
  }

  private assertDocumentCanBeChanged(
    currentDocumentNumber: string | null,
    data: UpdateProfileDto,
  ): void {
    const wantsDocumentChange =
      data.documentType !== undefined || data.documentNumber !== undefined;

    if (currentDocumentNumber && wantsDocumentChange) {
      throw new BadRequestException(
        'El documento de identidad no puede modificarse una vez registrado.',
      );
    }
  }

  private assertProfileUpdateIsNotEmpty(updateData: ProfileUpdateData): void {
    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('Debes enviar al menos un campo valido');
    }
  }

  async changePassword(id: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);

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
    return this.findStaffUsers();
  }

  async findStaffUsers() {
    return this.prisma.user.findMany({
      where: {
        role: {
          in: [...INTERNAL_USER_ROLES],
        },
      },
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
    this.assertInternalUser(user.role);

    const newStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { status: newStatus },
      select: { id: true, name: true, status: true },
    });

    await this.createLog(id, 'UPDATE', 'USER', `Cambio de estado de ${user.email} a ${newStatus}`);

    return updatedUser;
  }

  async updateUser(id: string, data: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, role: true },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    this.assertInternalUser(user.role);

    const updateData: any = {};

    if (data.name !== undefined) {
      updateData.name = data.name.trim();
    }

    if (data.role !== undefined) {
      this.assertInternalUserRole(data.role);
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
      throw new BadRequestException('Debes enviar al menos un campo valido para actualizar');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, name: true, email: true, role: true },
    });

    await this.createLog(id, 'UPDATE', 'USER', `Actualizacion de usuario ${updatedUser.email}`);

    return updatedUser;
  }

  private assertInternalUser(role: string) {
    if (!this.isInternalUserRole(role)) {
      throw new NotFoundException('Usuario no encontrado');
    }
  }

  private assertInternalUserRole(role: string) {
    if (!this.isInternalUserRole(role)) {
      throw new BadRequestException('Gestion de Personal solo permite roles internos');
    }
  }

  private isInternalUserRole(role: string): boolean {
    return INTERNAL_USER_ROLES.includes(role as (typeof INTERNAL_USER_ROLES)[number]);
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
