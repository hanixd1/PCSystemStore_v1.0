import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PasswordHashingService } from '../../auth/password-hashing.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { isCustomerProfileComplete } from './user-session.service';

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
export class UserProfileService {
  constructor(
    private readonly prisma: PrismaService = undefined as never,
    private readonly passwordHashing: PasswordHashingService = new PasswordHashingService(),
  ) {}

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
    return { ...user, profileComplete: isCustomerProfileComplete(user) };
  }

  async updateProfile(id: string, data: UpdateProfileDto) {
    const currentUser = await this.findProfileUserOrThrow(id);
    this.assertValidCustomerProfileData(data);
    const updateData = await this.buildProfileUpdateData(id, data, currentUser);
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
      user: { ...user, profileComplete: isCustomerProfileComplete(user) },
    };
  }

  async changePassword(id: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    if (!(await this.passwordHashing.verifyPassword(user.password, currentPassword))) {
      throw new UnauthorizedException('La contrasena actual es incorrecta');
    }
    this.passwordHashing.assertPasswordPolicy(newPassword, user.role !== 'CUSTOMER');
    await this.prisma.user.update({
      where: { id },
      data: { password: await this.passwordHashing.hashPassword(newPassword) },
    });
    return { message: 'Contrasena actualizada correctamente.' };
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
    if (data.email !== undefined) {
      await this.applyProfileEmailUpdate(updateData, data.email, id, currentUser);
    }
    this.applyDocumentProfileFields(updateData, data, currentUser.documentNumber);
    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('Debes enviar al menos un campo valido');
    }
    return updateData;
  }

  private sanitizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private async applyProfileEmailUpdate(
    updateData: ProfileUpdateData,
    email: string,
    userId: string,
    currentUser: ProfileCurrentUser,
  ) {
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
    const existingUser = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser && existingUser.id !== userId) {
      throw new ConflictException('Ese correo ya esta registrado');
    }
    updateData.email = normalizedEmail;
    updateData.emailVerified = false;
    updateData.emailVerifiedAt = null;
  }

  private applyDocumentProfileFields(
    updateData: ProfileUpdateData,
    data: UpdateProfileDto,
    currentDocumentNumber: string | null,
  ) {
    const wantsDocumentChange =
      data.documentType !== undefined || data.documentNumber !== undefined;
    if (currentDocumentNumber && wantsDocumentChange) {
      throw new BadRequestException(
        'El documento de identidad no puede modificarse una vez registrado.',
      );
    }
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

  private assertValidCustomerProfileData(
    data: Pick<UpdateProfileDto, 'documentType' | 'documentNumber' | 'mobilePhone'>,
  ) {
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

  private assertValidDocumentNumber(documentType: string, documentNumber: string) {
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

  private isValidPeruMobilePhone(value: string) {
    const normalized = value.trim().startsWith('+51') ? value.trim().slice(3) : value.trim();
    return this.isNumericText(normalized, 9, 9);
  }
  private isNumericText(value: string, min: number, max: number) {
    return (
      value.length >= min &&
      value.length <= max &&
      Array.from(value).every((char) => char >= '0' && char <= '9')
    );
  }
  private isAlphaNumericText(value: string, min: number, max: number) {
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
}
