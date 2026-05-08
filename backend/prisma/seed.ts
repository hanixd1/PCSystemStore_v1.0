import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...');

  // Limpiar base de datos antes de empezar
  try {
    await prisma.payment.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.cpuSpecs.deleteMany();
    await prisma.motherboardSpecs.deleteMany();
    await prisma.ramSpecs.deleteMany();
    await prisma.product.deleteMany();
  } catch (e) {
    console.log("Base de datos ya estaba limpia o es la primera vez.");
  }

  // ==========================================
  // CREAR O ACTUALIZAR USUARIO ADMINISTRADOR
  // ==========================================
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('admin123', salt); // Contraseña: admin123

  const admin = await prisma.user.upsert({
    where: { email: 'admin@pcsystem.com' },
    update: { 
      // ¡ESTO ES LO QUE FALTABA! Si el usuario ya existe, actualiza su clave vieja por la nueva encriptada
      password: hashedPassword, 
      role: 'ADMIN',
      status: 'ACTIVE'
    }, 
    create: {
      email: 'admin@pcsystem.com',
      name: 'Administrador Principal',
      password: hashedPassword,
      role: 'ADMIN',
      status: 'ACTIVE' // Aseguramos que nazca activo
    },
  });

  console.log('👤 Usuario Admin creado/actualizado:', admin.email);

  // Cuenta cliente local de prueba:
  // email: hanny@test.com
  // password: h12345
  const customerPassword = await bcrypt.hash('h12345', salt);
  const customer = await prisma.user.upsert({
    where: { email: 'hanny@test.com' },
    update: {
      name: 'Hanny T',
      password: customerPassword,
      role: 'CUSTOMER',
      status: 'ACTIVE',
    },
    create: {
      email: 'hanny@test.com',
      name: 'Hanny T',
      password: customerPassword,
      role: 'CUSTOMER',
      status: 'ACTIVE',
    },
  });

  console.log('Cliente de prueba creado/actualizado:', customer.email);

  await prisma.storeBranding.upsert({
    where: { id: 'default-store-branding' },
    update: {
      storeName: 'PCSystemStore',
      logoAlt: 'PCSystemStore',
    },
    create: {
      id: 'default-store-branding',
      storeName: 'PCSystemStore',
      logoAlt: 'PCSystemStore',
    },
  });

  const seedBanners = [
    {
      id: 'seed-banner-rtx-serie-40',
      title: 'RTX Serie 40',
      subtitle: 'Potencia grafica para gaming y creacion',
      imageUrl: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=1920&q=80',
      linkUrl: '/categoria/graficas',
      sortOrder: 1,
      isActive: true,
    },
    {
      id: 'seed-banner-procesadores',
      title: 'Procesadores AMD e Intel',
      subtitle: 'Componentes listos para tu proximo ensamble',
      imageUrl: 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&w=1920&q=80',
      linkUrl: '/categoria/cpu',
      sortOrder: 2,
      isActive: true,
    },
    {
      id: 'seed-banner-promociones',
      title: 'Promociones PCSystemStore',
      subtitle: 'Renueva tu setup con ofertas seleccionadas',
      imageUrl: 'https://images.unsplash.com/photo-1616588589676-62b3bd4ff6d2?auto=format&fit=crop&w=1920&q=80',
      linkUrl: '/ofertas',
      sortOrder: 3,
      isActive: true,
    },
  ];

  for (const banner of seedBanners) {
    await prisma.homeBanner.upsert({
      where: { id: banner.id },
      update: banner,
      create: banner,
    });
  }

  // ==========================================
  // PRODUCTOS (Se mantienen igual)
  // ==========================================

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
