// src/builder/builder.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { CategoryType } from '@prisma/client';
// CORRECCIÓN: La ruta debe apuntar a donde creamos el archivo global
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BuilderService {
  // Necesitamos inyectarlo aquí para poder usar 'this.prisma' abajo
  constructor(private prisma: PrismaService) {}

  // 1. Obtener Placas Madre (Filtradas por CPU si existe)
  async getCompatibleMotherboards(cpuId?: string) {
    // Filtro base: Quiero productos que sean MOTHERBOARD
    const whereClause: any = {
      category: CategoryType.MOTHERBOARD,
      stock: { gt: 0 },
    };

    if (cpuId) {
      const selectedCpu = await this.prisma.product.findUnique({
        where: { id: cpuId },
        include: { cpuSpecs: true },
      });

      if (!selectedCpu || !selectedCpu.cpuSpecs) {
        throw new NotFoundException('CPU no encontrado o sin especificaciones');
      }

      // LA MAGIA: Socket debe ser idéntico
      whereClause.motherboardSpecs = {
        socket: selectedCpu.cpuSpecs.socket,
      };
    }

    return this.prisma.product.findMany({
      where: whereClause,
      include: {
        motherboardSpecs: true,
      },
    });
  }

  // 2. Obtener RAM (Filtradas por Motherboard si existe)
  async getCompatibleRam(motherboardId?: string) {
    const whereClause: any = {
      category: CategoryType.RAM,
      stock: { gt: 0 },
    };

    if (motherboardId) {
      const selectedMobo = await this.prisma.product.findUnique({
        where: { id: motherboardId },
        include: { motherboardSpecs: true },
      });

      if (!selectedMobo || !selectedMobo.motherboardSpecs) {
        throw new NotFoundException('Placa madre no encontrada');
      }

      // Filtramos por tipo de memoria (DDR4 vs DDR5)
      whereClause.ramSpecs = {
        memoryType: selectedMobo.motherboardSpecs.memoryType,
      };
    }

    return this.prisma.product.findMany({
      where: whereClause,
      include: { ramSpecs: true },
    });
  }
  async getCpus() {
    return this.prisma.product.findMany({
      where: {
        category: CategoryType.CPU,
        stock: { gt: 0 },
      },
      include: { cpuSpecs: true },
    });
  }
}
