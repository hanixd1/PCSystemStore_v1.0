import { Prisma, PrismaClient } from '@prisma/client';
import crypto from 'node:crypto';
import { PasswordHashingService } from '../../src/auth/password-hashing.service';

const passwordHashing = new PasswordHashingService();

const getQaPassword = (envName: string): string =>
  process.env[envName] ?? `QA_${crypto.randomUUID()}_Test`;

export const qaUsers = {
  admin: {
    email: 'admin.qa@pcsystemstore.test',
    password: getQaPassword('QA_ADMIN_PASSWORD'),
  },
  editor: {
    email: 'editor.qa@pcsystemstore.test',
    password: getQaPassword('QA_EDITOR_PASSWORD'),
  },
  customer: {
    email: 'cliente.qa@pcsystemstore.test',
    password: getQaPassword('QA_CLIENT_PASSWORD'),
  },
};

export const qaSkus = {
  cpuAmd: 'QA-CPU-AMD-AM5',
  cpuIntel: 'QA-CPU-INTEL-LGA1700',
  boardAm5: 'QA-MB-AM5',
  boardIntel: 'QA-MB-LGA1700',
  ramDdr5: 'QA-RAM-DDR5',
  ramDdr4: 'QA-RAM-DDR4',
  psuGood: 'QA-PSU-750',
  psuBad: 'QA-PSU-250',
  coolerGood: 'QA-COOLER-AM5-220W',
  coolerBad: 'QA-COOLER-LGA-65W',
  stockZero: 'QA-STOCK-ZERO',
  stockLow: 'QA-STOCK-LOW',
  saleActive: 'QA-SALE-ACTIVE',
  noSale: 'QA-NO-SALE',
};

export async function resetQaDatabase(prisma: PrismaClient) {
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.actionLog.deleteMany();
  await prisma.homeBanner.deleteMany();
  await prisma.storeBranding.deleteMany();
  await prisma.address.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();
}

export async function seedQaDatabase(prisma: PrismaClient) {
  const [adminPassword, editorPassword, customerPassword] = await Promise.all([
    passwordHashing.hashPassword(qaUsers.admin.password),
    passwordHashing.hashPassword(qaUsers.editor.password),
    passwordHashing.hashPassword(qaUsers.customer.password),
  ]);

  const [admin, editor, customer] = await Promise.all([
    prisma.user.create({
      data: {
        email: qaUsers.admin.email,
        password: adminPassword,
        name: 'Admin QA',
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    }),
    prisma.user.create({
      data: {
        email: qaUsers.editor.email,
        password: editorPassword,
        name: 'Editor QA',
        role: 'EDITOR',
        status: 'ACTIVE',
      },
    }),
    prisma.user.create({
      data: {
        email: qaUsers.customer.email,
        password: customerPassword,
        name: 'Cliente QA',
        role: 'CUSTOMER',
        status: 'ACTIVE',
      },
    }),
  ]);

  const createProduct = (data: Prisma.ProductCreateInput) => prisma.product.create({ data });

  const cpuAmd = await createProduct({
    sku: qaSkus.cpuAmd,
    slug: 'qa-cpu-amd-am5',
    name: 'QA AMD Ryzen AM5 105W',
    description: 'Procesador QA AMD con socket AM5 y TDP controlado para pruebas.',
    price: 1000,
    stock: 5,
    category: 'CPU',
    images: ['https://example.com/qa-cpu-amd.png'],
    cpuSpecs: {
      create: {
        brand: 'AMD',
        socket: 'AM5',
        cores: 6,
        threads: 12,
        frequency: '4.7',
        tdp: 105,
        integratedGraphics: true,
        includesCooler: false,
      },
    },
  });

  await createProduct({
    sku: qaSkus.cpuIntel,
    slug: 'qa-cpu-intel-lga1700',
    name: 'QA Intel Core LGA1700',
    description: 'Procesador QA Intel con socket LGA 1700 para pruebas.',
    price: 1100,
    stock: 5,
    category: 'CPU',
    images: ['https://example.com/qa-cpu-intel.png'],
    cpuSpecs: {
      create: {
        brand: 'Intel',
        socket: 'LGA 1700',
        cores: 8,
        threads: 16,
        frequency: '4.8',
        tdp: 125,
        integratedGraphics: true,
        includesCooler: false,
      },
    },
  });

  await createProduct({
    sku: qaSkus.boardAm5,
    slug: 'qa-motherboard-am5',
    name: 'QA Motherboard AM5 DDR5',
    description: 'Placa madre QA compatible con AM5 y memoria DDR5.',
    price: 650,
    stock: 5,
    category: 'MOTHERBOARD',
    images: ['https://example.com/qa-board-am5.png'],
    motherboardSpecs: {
      create: {
        socket: 'AM5',
        formFactor: 'ATX',
        memoryType: 'DDR5',
        memorySlots: 4,
        m2Slots: 2,
        supportedM2FormFactors: ['2280'],
      },
    },
  });

  await createProduct({
    sku: qaSkus.boardIntel,
    slug: 'qa-motherboard-lga1700',
    name: 'QA Motherboard LGA1700 DDR5',
    description: 'Placa madre QA compatible con LGA 1700 y memoria DDR5.',
    price: 700,
    stock: 5,
    category: 'MOTHERBOARD',
    images: ['https://example.com/qa-board-intel.png'],
    motherboardSpecs: {
      create: {
        socket: 'LGA 1700',
        formFactor: 'ATX',
        memoryType: 'DDR5',
        memorySlots: 4,
        m2Slots: 2,
        supportedM2FormFactors: ['2280'],
      },
    },
  });

  await Promise.all([
    createProduct({
      sku: qaSkus.ramDdr5,
      slug: 'qa-ram-ddr5',
      name: 'QA RAM DDR5 16GB',
      description: 'Memoria RAM QA DDR5 para pruebas de compatibilidad.',
      price: 250,
      stock: 5,
      category: 'RAM',
      images: ['https://example.com/qa-ram-ddr5.png'],
      ramSpecs: {
        create: {
          memoryType: 'DDR5',
          capacity: 16,
          speed: 5600,
          modules: 2,
          hasRGB: false,
        },
      },
    }),
    createProduct({
      sku: qaSkus.ramDdr4,
      slug: 'qa-ram-ddr4',
      name: 'QA RAM DDR4 16GB',
      description: 'Memoria RAM QA DDR4 para pruebas negativas.',
      price: 180,
      stock: 5,
      category: 'RAM',
      images: ['https://example.com/qa-ram-ddr4.png'],
      ramSpecs: {
        create: {
          memoryType: 'DDR4',
          capacity: 16,
          speed: 3200,
          modules: 2,
          hasRGB: false,
        },
      },
    }),
    createProduct({
      sku: qaSkus.stockZero,
      slug: 'qa-stock-zero',
      name: 'QA Producto Stock Cero',
      description: 'Producto QA sin stock para validar bloqueo de compra.',
      price: 300,
      stock: 0,
      category: 'GPU',
      images: ['https://example.com/qa-stock-zero.png'],
      gpuSpecs: {
        create: {
          brand: 'Gigabyte',
          chipset: 'QA',
          vram: 8,
          length: 250,
          tdp: 180,
          gpuPowerWatts: 180,
          recommendedPsuWatts: 550,
          fans: 2,
        },
      },
    }),
    createProduct({
      sku: qaSkus.stockLow,
      slug: 'qa-stock-low',
      name: 'QA Producto Stock Bajo',
      description: 'Producto QA con stock bajo para pruebas de concurrencia.',
      price: 400,
      stock: 1,
      category: 'GPU',
      images: ['https://example.com/qa-stock-low.png'],
      gpuSpecs: {
        create: {
          brand: 'ASUS',
          chipset: 'QA',
          vram: 8,
          length: 250,
          tdp: 180,
          gpuPowerWatts: 180,
          recommendedPsuWatts: 550,
          fans: 2,
        },
      },
    }),
    createProduct({
      sku: qaSkus.saleActive,
      slug: 'qa-producto-oferta-activa',
      name: 'QA Producto Oferta Activa',
      description: 'Producto QA con oferta activa para validar snapshots de precio.',
      price: 1000,
      isOnSale: true,
      salePrice: 800,
      stock: 5,
      category: 'GPU',
      images: ['https://example.com/qa-sale.png'],
      gpuSpecs: {
        create: {
          brand: 'MSI',
          chipset: 'QA',
          vram: 12,
          length: 260,
          tdp: 200,
          gpuPowerWatts: 200,
          recommendedPsuWatts: 600,
          fans: 2,
        },
      },
    }),
    createProduct({
      sku: qaSkus.noSale,
      slug: 'qa-producto-sin-oferta',
      name: 'QA Producto Sin Oferta',
      description: 'Producto QA sin oferta para validar precio normal.',
      price: 900,
      isOnSale: false,
      salePrice: null,
      stock: 5,
      category: 'GPU',
      images: ['https://example.com/qa-nosale.png'],
      gpuSpecs: {
        create: {
          brand: 'PNY',
          chipset: 'QA',
          vram: 8,
          length: 240,
          tdp: 160,
          gpuPowerWatts: 160,
          recommendedPsuWatts: 500,
          fans: 2,
        },
      },
    }),
  ]);

  const pendingOrder = await prisma.order.create({
    data: {
      userId: customer.id,
      status: 'PENDING_REVIEW',
      subtotal: 677.97,
      igv: 122.03,
      total: 800,
      currency: 'PEN',
      items: {
        create: {
          productId: cpuAmd.id,
          productNameSnapshot: cpuAmd.name,
          unitPriceSnapshot: 800,
          quantity: 1,
          subtotal: 800,
        },
      },
    },
  });

  await prisma.payment.create({
    data: {
      orderId: pendingOrder.id,
      provider: 'MANUAL',
      method: 'YAPE',
      status: 'PENDING_REVIEW',
      amount: 800,
      currency: 'PEN',
      commissionRate: 0.04,
      commissionAmount: 32,
      operationCode: 'QA123456',
    },
  });

  await prisma.storeBranding.create({
    data: {
      storeName: 'PCSystemStore QA',
      logoAlt: 'PCSystemStore QA',
    },
  });

  await Promise.all([
    prisma.homeBanner.create({
      data: {
        title: 'QA Banner Activo',
        imageUrl: 'https://example.com/banner-active.png',
        sortOrder: 1,
        isActive: true,
      },
    }),
    prisma.homeBanner.create({
      data: {
        title: 'QA Banner Inactivo',
        imageUrl: 'https://example.com/banner-inactive.png',
        sortOrder: 2,
        isActive: false,
      },
    }),
  ]);

  return { admin, editor, customer };
}
