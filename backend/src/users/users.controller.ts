import { Controller, Post, Body, Get, Patch, Param } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ==========================
  // RUTAS DE AUTENTICACIÓN
  // ==========================
  @Post('login')
  login(@Body() body: any) {
    return this.usersService.login(body.email, body.password);
  }

  @Post('forgot-password')
  forgotPassword(@Body() body: { email: string }) {
    return this.usersService.forgotPassword(body.email);
  }

  @Post('reset-password')
  resetPassword(@Body() body: { token: string; newPassword: string }) {
    return this.usersService.resetPassword(body.token, body.newPassword);
  }

  // ==========================
  // RUTAS DE GESTIÓN DE EMPLEADOS
  // ==========================
  
  // Crear un empleado nuevo (Ej: POST http://localhost:3000/users)
  @Post()
  create(@Body() body: any) {
    return this.usersService.create(body);
  }

  // Listar todos los empleados (Ej: GET http://localhost:3000/users)
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  // Suspender / Activar cuenta (Ej: PATCH http://localhost:3000/users/ID_DEL_USER/toggle-status)
  @Patch(':id/toggle-status')
  toggleStatus(@Param('id') id: string) {
    return this.usersService.toggleStatus(id);
  }
  @Get('audit/logs')
  getLogs() {
    return this.usersService.getAuditLogs();
  }

  // Editar un empleado
  @Patch(':id')
  updateUser(@Param('id') id: string, @Body() body: any) {
    return this.usersService.updateUser(id, body);
  }
}