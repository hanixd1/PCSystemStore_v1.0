import { Injectable, UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // ========================================================
  // 1. LÓGICA DE AUTENTICACIÓN (LO QUE YA TENÍAS)
  // ========================================================
  
  async login(email: string, pass: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    
    if (!user) throw new UnauthorizedException('Credenciales inválidas');
    if (user.status === 'INACTIVE') throw new UnauthorizedException('Cuenta suspendida. Contacte al administrador.');

    const isMatch = await bcrypt.compare(pass, user.password);
    if (!isMatch) throw new UnauthorizedException('Credenciales inválidas');

    return {
      message: 'Login exitoso',
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      token: 'fake-jwt-token-12345'
    };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
    
    await this.prisma.user.update({
      where: { email },
      data: {
        resetToken: token,
        resetTokenExpiry: new Date(Date.now() + 3600000), // 1 hora
      },
    });

    const resetLink = `http://localhost:3001/admin/reset-password?token=${token}`;
    console.log('📧 [SIMULACIÓN EMAIL] Para recuperar contraseña entra aquí:', resetLink);

    return { message: 'Correo de recuperación enviado (Revisa la consola del backend)' };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: { gt: new Date() }, 
      },
    });

    if (!user) throw new BadRequestException('Token inválido o expirado');

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

    return { message: 'Contraseña actualizada correctamente' };
  }

  // ========================================================
  // 2. LÓGICA DE GESTIÓN DE EMPLEADOS (LO NUEVO)
  // ========================================================

  async create(data: any) {
    // 1. Encriptar la contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(data.password, salt);
    
    // 2. Guardar en la BD
    return this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        role: data.role || 'EDITOR', // ADMIN o EDITOR
        status: 'ACTIVE'
      },
      // Devolvemos la info sin la contraseña por seguridad
      select: { id: true, name: true, email: true, role: true, status: true, createdAt: true }
    });
  }

  async findAll() {
    return this.prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  async toggleStatus(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const newStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    
    return this.prisma.user.update({
      where: { id },
      data: { status: newStatus },
      select: { id: true, name: true, status: true }
    });
  }
  async updateUser(id: string, data: any) {
    const updateData: any = { name: data.name, role: data.role };
    
    // Si escribió una nueva contraseña, la encriptamos. Si no, la dejamos igual.
    if (data.password && data.password.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(data.password, salt);
    }

    return this.prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, name: true, email: true, role: true }
    });
  }
  async getAuditLogs() {
    return this.prisma.actionLog.findMany({
      orderBy: { createdAt: 'desc' },
      include: { 
        user: { select: { name: true, role: true } } // Traemos el nombre de quien hizo la acción
      }
    });
  }
}