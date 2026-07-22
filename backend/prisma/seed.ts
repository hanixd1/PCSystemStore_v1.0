import 'dotenv/config';
import { PaymentMethod, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { PasswordHashingService } from '../src/auth/password-hashing.service';
import { normalizePostgresConnectionString } from '../src/prisma/database-url';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL must be configured to run seed.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: normalizePostgresConnectionString(databaseUrl),
  }),
});
const passwordHashing = new PasswordHashingService();

function getSeedPassword(name: string, administrative: boolean): string {
  const password = process.env[name] ?? '';
  passwordHashing.assertPasswordPolicy(password, administrative);
  return password;
}

async function cleanCatalogData() {
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.idempotencyKey.deleteMany();

  await prisma.cpuSpecs.deleteMany();
  await prisma.motherboardSpecs.deleteMany();
  await prisma.ramSpecs.deleteMany();
  await prisma.gpuSpecs.deleteMany();
  await prisma.psuSpecs.deleteMany();
  await prisma.caseSpecs.deleteMany();
  await prisma.coolerSpecs.deleteMany();
  await prisma.storageSpecs.deleteMany();
  await prisma.laptopSpecs.deleteMany();
  await prisma.desktopSpecs.deleteMany();
  await prisma.monitorSpecs.deleteMany();
  await prisma.keyboardSpecs.deleteMany();
  await prisma.mouseSpecs.deleteMany();
  await prisma.mousepadSpecs.deleteMany();
  await prisma.chairSpecs.deleteMany();
  await prisma.gamingDeskSpecs.deleteMany();
  await prisma.headsetSpecs.deleteMany();
  await prisma.microphoneSpecs.deleteMany();
  await prisma.speakerSpecs.deleteMany();
  await prisma.webcamSpecs.deleteMany();
  await prisma.captureCardSpecs.deleteMany();
  await prisma.cableHubSpecs.deleteMany();
  await prisma.laptopCoolingBaseSpecs.deleteMany();
  await prisma.backpackSpecs.deleteMany();
  await prisma.softwareSpecs.deleteMany();

  await prisma.product.deleteMany();
}

async function seedUsersAndBranding() {
  const adminPassword = getSeedPassword('SEED_ADMIN_PASSWORD', true);
  const editorPassword = getSeedPassword('SEED_EDITOR_PASSWORD', true);
  const customerPlainPassword = getSeedPassword('SEED_CUSTOMER_PASSWORD', false);
  const [hashedPassword, hashedEditorPassword, customerPassword] = await Promise.all([
    passwordHashing.hashPassword(adminPassword),
    passwordHashing.hashPassword(editorPassword),
    passwordHashing.hashPassword(customerPlainPassword),
  ]);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@pcsystem.com' },
    update: {
      password: hashedEditorPassword,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
    create: {
      email: 'admin@pcsystem.com',
      name: 'Administrador Principal',
      password: hashedEditorPassword,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  await prisma.user.upsert({
    where: { email: 'editor@pcsystem.com' },
    update: {
      name: 'Editor Principal',
      password: hashedPassword,
      role: 'EDITOR',
      status: 'ACTIVE',
    },
    create: {
      email: 'editor@pcsystem.com',
      name: 'Editor Principal',
      password: hashedPassword,
      role: 'EDITOR',
      status: 'ACTIVE',
    },
  });

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
      id: 'seed-banner-rtx-serie-50',
      title: 'RTX Serie 50',
      subtitle: 'Graficas NVIDIA Blackwell para gaming y creacion',
      imageUrl:
        'https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=1920&q=80',
      linkUrl: '/categoria/graficas',
      sortOrder: 1,
      isActive: true,
    },
    {
      id: 'seed-banner-procesadores',
      title: 'Procesadores AMD e Intel',
      subtitle: 'Componentes listos para tu proximo ensamble',
      imageUrl:
        'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&w=1920&q=80',
      linkUrl: '/categoria/cpu',
      sortOrder: 2,
      isActive: true,
    },
    {
      id: 'seed-banner-promociones',
      title: 'Promociones PCSystemStore',
      subtitle: 'Renueva tu setup con ofertas seleccionadas',
      imageUrl:
        'https://images.unsplash.com/photo-1616588589676-62b3bd4ff6d2?auto=format&fit=crop&w=1920&q=80',
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

  console.log('Usuarios seed:', { admin: admin.email, customer: customer.email });
}

async function seedCatalog() {
  const cpu = await prisma.product.create({
    data: {
      name: 'AMD Ryzen 5 7600X',
      description:
        'Procesador AMD Ryzen 7000 de 6 nucleos y 12 hilos para gaming en plataforma AM5. Frecuencia base 4.7 GHz y boost hasta 5.3 GHz. No incluye cooler.',
      price: 1250,
      stock: 10,
      sku: 'CPU-RYZEN-7600X',
      slug: 'amd-ryzen-5-7600x',
      category: 'CPU',
      images: [
        'https://www.amd.com/content/dam/amd/en/images/products/processors/ryzen/2505503-ryzen-5-7600x.jpg',
      ],
      isOnSale: false,
      salePrice: null,
      cpuSpecs: {
        create: {
          brand: 'AMD',
          socket: 'AM5',
          cores: 6,
          threads: 12,
          frequency: '4.7 GHz base / 5.3 GHz boost',
          baseTdpWatts: 105,
          tdp: 105,
          integratedGraphics: true,
          includesCooler: false,
        },
      },
    },
  });

  const motherboard = await prisma.product.create({
    data: {
      name: 'ASUS TUF Gaming B650-PLUS WiFi',
      slug: 'asus-tuf-gaming-b650-plus-wifi',
      sku: 'MOBO-ASUS-TUF-B650-PLUS-WIFI',
      description:
        'Placa madre ATX AM5 con chipset AMD B650, DDR5, WiFi 6, Bluetooth 5.2, 2.5Gb Ethernet, 3 ranuras M.2 y 4 puertos SATA.',
      price: 950,
      stock: 5,
      category: 'MOTHERBOARD',
      images: ['https://dlcdnwebimgs.asus.com/gain/0f26ec61-2f6d-47dc-9f2c-cb15f4b1f241/'],
      isOnSale: false,
      salePrice: null,
      motherboardSpecs: {
        create: {
          brand: 'ASUS',
          socket: 'AM5',
          formFactor: 'ATX',
          memoryType: 'DDR5',
          memorySlots: 4,
          m2Slots: 3,
          supportedM2FormFactors: ['2242', '2260', '2280', '22110'],
        },
      },
    },
  });

  const ram = await prisma.product.create({
    data: {
      name: 'Kingston FURY Beast RGB 16GB (2x8GB) DDR5-5200',
      slug: 'kingston-fury-beast-rgb-16gb-2x8gb-ddr5-5200',
      sku: 'RAM-KINGSTON-FURY-BEAST-RGB-16GB-5200',
      description:
        'Kit Kingston FURY Beast RGB DDR5 de 16GB compuesto por 2 modulos de 8GB, velocidad 5200 MT/s, perfil XMP 3.0 y latencia CL40.',
      price: 320,
      stock: 20,
      category: 'RAM',
      images: [
        'https://media.kingston.com/kingston/product/ktc-product-memory-beast-ddr5-rgb-dimm-1-lg.jpg',
      ],
      isOnSale: false,
      salePrice: null,
      ramSpecs: {
        create: {
          memoryType: 'DDR5',
          capacity: 8,
          speed: 5200,
          modules: 2,
          hasRGB: true,
        },
      },
    },
  });

  const cooler = await prisma.product.create({
    data: {
      name: 'Corsair iCUE H100i ELITE CAPELLIX XT 240mm',
      slug: 'corsair-icue-h100i-elite-capellix-xt-240mm',
      sku: 'COOLER-CORSAIR-H100I-ELITE-CAPELLIX-XT',
      description:
        'Refrigeracion liquida AIO Corsair de 240mm con dos ventiladores AF RGB ELITE de 120mm, compatible con AM5 y LGA 1700.',
      price: 680,
      stock: 6,
      category: 'COOLER',
      images: [
        'https://assets.corsair.com/image/upload/c_pad,q_auto,h_1024,w_1024/products/Cooling/CPU-Coolers/base-icue-h100i-elite-capellix-xt-config/Gallery/CW-9060068-WW_01.webp',
      ],
      isOnSale: false,
      salePrice: null,
      coolerSpecs: {
        create: {
          brand: 'Corsair',
          type: 'Liquida',
          socketSupport: 'AM4, AM5, LGA 1200, LGA 1700',
          compatibleSockets: ['AM4', 'AM5', 'LGA 1200', 'LGA 1700'],
          fanCount: 2,
          radiatorSize: 240,
          hasRGB: true,
          hasScreen: false,
          tdpCapacity: 250,
          coolerHeight: null,
        },
      },
    },
  });

  const gpu = await prisma.product.create({
    data: {
      name: 'Gigabyte GeForce RTX 5060 GAMING OC 8G',
      slug: 'gigabyte-geforce-rtx-5060-gaming-oc-8g',
      sku: 'GPU-GIGABYTE-RTX5060-GAMING-OC-8G',
      description:
        'Tarjeta grafica Gigabyte GeForce RTX 5060 GAMING OC con 8GB GDDR7, interfaz PCIe 5.0, 3840 CUDA cores, 3 ventiladores y conector PCIe de 8 pines.',
      price: 1650,
      stock: 4,
      category: 'GPU',
      images: [
        'https://static.bhphoto.com/images/images2500x2500/gigabyte_gv_n5060gaming_oc_8gd_geforce_rtx_5060_gaming_1895213.jpg',
      ],
      isOnSale: false,
      salePrice: null,
      gpuSpecs: {
        create: {
          brand: 'Gigabyte',
          chipset: 'NVIDIA GeForce RTX 5060',
          vram: 8,
          length: 281,
          tdp: 155,
          gpuPowerWatts: 155,
          recommendedPsuWatts: 500,
          fans: 3,
        },
      },
    },
  });

  const psu = await prisma.product.create({
    data: {
      name: 'Gigabyte P650G 650W 80 Plus Gold',
      slug: 'gigabyte-p650g-650w-80-plus-gold',
      sku: 'PSU-GIGABYTE-P650G-650W-GOLD',
      description:
        'Fuente Gigabyte P650G de 650W con certificacion 80 Plus Gold, formato ATX12V, PFC activo, ventilador HYB de 120mm y cableado plano negro.',
      price: 310,
      stock: 8,
      category: 'PSU',
      images: [
        'https://static.gigabyte.com/StaticFile/Image/Global/2a9c9b7821a936f3db64e2bb0c007ef0/Product/30338/png/1000',
      ],
      isOnSale: false,
      salePrice: null,
      psuSpecs: {
        create: {
          brand: 'Gigabyte',
          wattage: 650,
          certification: '80 Plus Gold',
          modular: 'No modular',
          formFactor: 'ATX',
        },
      },
    },
  });

  const pcCase = await prisma.product.create({
    data: {
      name: 'MSI MPG SEKIRA 100R',
      slug: 'msi-mpg-sekira-100r',
      sku: 'CASE-MSI-MPG-SEKIRA-100R',
      description:
        'Gabinete MSI MPG SEKIRA 100R mid-tower con soporte ATX, Micro-ATX y Mini-ITX, 4 ventiladores ARGB preinstalados, GPU hasta 340mm y radiador liquido frontal hasta 360mm.',
      price: 520,
      stock: 5,
      category: 'CASE',
      images: [
        'https://storage-asset.msi.com/global/picture/image/feature/PC-Case/MPG-SEKIRA-100R/kv-pd.png',
      ],
      isOnSale: false,
      salePrice: null,
      caseSpecs: {
        create: {
          brand: 'MSI',
          formFactor: 'ATX',
          maxGpuLength: 340,
          includesPsu: false,
          includedFans: 4,
          radiatorSupportMm: 360,
        },
      },
    },
  });

  console.log('Productos seed creados:', {
    cpu: cpu.name,
    motherboard: motherboard.name,
    ram: ram.name,
    cooler: cooler.name,
    gpu: gpu.name,
    psu: psu.name,
    case: pcCase.name,
  });
}

async function main() {
  console.log('Iniciando seed PCSystemStore...');
  await cleanCatalogData();
  await seedUsersAndBranding();
  await seedCatalog();
  console.log('Seed completado con exito.');
  console.log('Credenciales de seed leidas desde variables de entorno; no se muestran.');
  console.log('Metodo de pago de prueba soportado:', PaymentMethod.CARD_CREDIT);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
