import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAddressDto } from '../dto/create-address.dto';

@Injectable()
export class UserAddressService {
  constructor(private readonly prisma: PrismaService = undefined as never) {}

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
    const address = await this.prisma.address.findFirst({ where: { id, userId } });
    if (!address) {
      throw new NotFoundException('Direccion no encontrada');
    }

    await this.prisma.address.delete({ where: { id } });
    return { message: 'Direccion eliminada correctamente' };
  }
}
