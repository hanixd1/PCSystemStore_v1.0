import { Injectable, UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';


@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async login(email: string, pass: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    
    if (!user) throw new UnauthorizedException('Credenciales inválidas');

    const isMatch = await bcrypt.compare(pass, user.password);
    if (!isMatch) throw new UnauthorizedException('Credenciales inválidas');

    return {
      message: 'Login exitoso',
      user: { id: user.id, name: user.name, email: user.email },
      token: 'fake-jwt-token-12345'
    };
  }

  // 1. SOLICITAR CAMBIO (Genera el token)
  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    // Generar un token simple (en producción usa crypto)
    const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
    
    // Guardar token en BD con 1 hora de validez
    await this.prisma.user.update({
      where: { email },
      data: {
        resetToken: token,
        resetTokenExpiry: new Date(Date.now() + 3600000), // 1 hora
      },
    });

    // --- SIMULACIÓN DE EMAIL ---
    const resetLink = `http://localhost:3001/admin/reset-password?token=${token}`;
    console.log('📧 [SIMULACIÓN EMAIL] Para recuperar contraseña entra aquí:', resetLink);
    // ---------------------------

    return { message: 'Correo de recuperación enviado (Revisa la consola del backend)' };
  }

  // 2. EJECUTAR CAMBIO (Usa el token para cambiar la pass)
  async resetPassword(token: string, newPassword: string) {
    // Buscar usuario con ese token y que no haya expirado
    const user = await this.prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: { gt: new Date() }, // Que la fecha de expiración sea mayor a hoy
      },
    });

    if (!user) throw new BadRequestException('Token inválido o expirado');

    // Encriptar nueva contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Actualizar usuario y borrar el token usado
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return { message: 'Contraseña actualizada correctamente' };
  }
}