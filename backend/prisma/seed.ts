import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...');

  // Limpiar base de datos antes de empezar
  // Usamos deleteMany dentro de una transacción o uno por uno para evitar errores de claves foráneas
  // El orden importa: primero specs, luego productos
    try {
      await prisma.cpuSpecs.deleteMany();
      await prisma.motherboardSpecs.deleteMany();
      await prisma.ramSpecs.deleteMany();
      await prisma.product.deleteMany();
    } catch (e) {
     console.log("Base de datos ya estaba limpia o es la primera vez.");
    }

    // CREAR USUARIO ADMINISTRADOR
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt); // Contraseña: admin123

    const admin = await prisma.user.upsert({
      where: { email: 'admin@pcsystem.com' },
      update: {}, // Si existe, no hace nada
      create: {
      email: 'admin@pcsystem.com',
      name: 'Administrador Principal',
      password: hashedPassword,
      role: 'ADMIN',
      },
    });

    console.log('👤 Usuario Admin creado:', admin.email);
    console.log('✅ Seed completado.');

  // 1. CREAR UN PROCESADOR (CPU)
  const cpu = await prisma.product.create({
    data: {
      name: 'AMD Ryzen 5 7600X',
      description: 'Procesador potente para gaming',
      price: 1250.00,
      stock: 10,
      sku: 'CPU-12345',
      slug: 'amd-ryzen-5-7600x',
      category: 'CPU',
      images: ['https://ejemplo.com/cpu.jpg'],
      cpuSpecs: {
        create: {
          socket: 'AM5',
          cores: 6,
          frequency: '4.7 GHz',
          tdp: 105,
          integratedGraphics: true,
          includesCooler: false,
        },
      },
    },
  });

  // 2. CREAR UNA PLACA MADRE
  const mobo = await prisma.product.create({
    data: {
      name: 'ASUS TUF Gaming B650-PLUS WiFi',
      slug: 'asus-tuf-gaming-b650-plus-wifi',
      sku: 'MOBO-SEED-002',
      description: 'Placa base ATX con WiFi 6 y PCIe 5.0',
      price: 950.00,
      stock: 5,
      category: 'MOTHERBOARD',
      images: ['https://m.media-amazon.com/images/I/81B-w+rXjHL._AC_SL1500_.jpg'],
      motherboardSpecs: {
        create: {
          socket: 'AM5',
          // chipset: 'B650', <--- ESTO DABA ERROR, YA LO QUITAMOS
          formFactor: 'ATX',
          memoryType: 'DDR5',
          memorySlots: 4,
          m2Slots: 3,
        },
      },
    },
  });

  // 3. CREAR MEMORIA RAM
  const ram = await prisma.product.create({
    data: {
      name: 'Kingston Fury Beast RGB 16GB',
      slug: 'kingston-fury-beast-rgb-16gb',
      sku: 'RAM-SEED-003',
      description: 'Memoria RAM DDR5 de alta velocidad',
      price: 320.00,
      stock: 20,
      category: 'RAM',
      images: ['https://m.media-amazon.com/images/I/612j17-NlPL._AC_SL1000_.jpg'],
      ramSpecs: {
        create: {
          memoryType: 'DDR5',
          capacity: 16,
          speed: 5200,
          modules: 2,
          hasRGB: true,
        },
      },
    },
  });

  console.log({ cpu, mobo, ram });
  console.log('✅ Seed completado con éxito.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });