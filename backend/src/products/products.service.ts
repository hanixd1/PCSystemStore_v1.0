import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  // Helpers
  private toInt(val: any): number { const n = parseInt(val); return isNaN(n) ? 0 : n; }
  private toFloat(val: any): number { const n = parseFloat(val); return isNaN(n) ? 0.0 : n; }
  private toBool(val: any): boolean { return String(val) === 'true'; }

  async create(data: any) {
    const slug = data.name.toLowerCase().trim().replace(/ /g, '-').replace(/[^\w-]+/g, '');
    const sku = `${data.category}-${Date.now()}`;

    // Manejo de Imágenes: Si vienen del upload (files) o del campo texto
    let finalImages: string[] = [];
    if (data.uploadedImages && data.uploadedImages.length > 0) {
      finalImages = data.uploadedImages; // Las que procesó el controlador
    } else if (data.image) {
      finalImages = [data.image]; // Fallback por si enviaron texto
    }

    const productData: any = {
      name: data.name,
      description: data.description || '',
      price: this.toFloat(data.price),
      stock: this.toInt(data.stock),
      category: data.category,
      images: finalImages,
      slug: slug,
      sku: sku,
    };

    switch (data.category) {
      case 'CPU':
        productData.cpuSpecs = { create: {
            socket: data.socket || 'N/A', cores: this.toInt(data.cores),
            frequency: data.frequency || '', tdp: this.toInt(data.tdp),
            integratedGraphics: this.toBool(data.integratedGraphics),
            includesCooler: this.toBool(data.includesCooler),
        }}; break;
      
      case 'MOTHERBOARD':
        productData.motherboardSpecs = { create: {
            socket: data.socket || 'N/A', formFactor: data.formFactor || 'ATX',
            memoryType: data.memoryType || 'DDR4', memorySlots: this.toInt(data.memorySlots),
            m2Slots: this.toInt(data.m2Slots),
        }}; break;

      case 'RAM':
        productData.ramSpecs = { create: {
            memoryType: data.memoryType || 'DDR4', capacity: this.toInt(data.capacity),
            speed: this.toInt(data.speed), modules: this.toInt(data.modules),
            hasRGB: this.toBool(data.hasRGB),
        }}; break;

      case 'GPU':
        productData.gpuSpecs = { create: {
            chipset: data.chipset || 'N/A', vram: this.toInt(data.vram),
            length: this.toInt(data.length), tdp: this.toInt(data.tdp),
            fans: this.toInt(data.fans),
        }}; break;

      case 'PSU':
        productData.psuSpecs = { create: {
            wattage: this.toInt(data.wattage), certification: data.certification || 'None',
            modular: data.modular || 'No', formFactor: data.formFactor || 'ATX',
        }}; break;

      case 'CASE':
        productData.caseSpecs = { create: {
            formFactor: data.formFactor || 'ATX', maxGpuLength: this.toInt(data.maxGpuLength),
            includesPsu: this.toBool(data.includesPsu), includedFans: this.toInt(data.includedFans),
        }}; break;

      case 'COOLER':
        productData.coolerSpecs = { create: {
            type: data.type || 'AIR', fanCount: this.toInt(data.fanCount),
            radiatorSize: this.toInt(data.radiatorSize), hasScreen: this.toBool(data.hasScreen),
            hasRGB: this.toBool(data.hasRGB),
        }}; break;

      case 'STORAGE':
        productData.storageSpecs = { create: {
            type: data.type || 'SSD', capacity: this.toInt(data.capacity),
            interface: data.interface || 'SATA', readSpeed: this.toInt(data.readSpeed),
        }}; break;

      case 'LAPTOP':
        productData.laptopSpecs = { create: {
            processor: data.processor || 'N/A', ram: data.ram || 'N/A', storage: data.storage || 'N/A',
            screenSize: data.screenSize || '15.6"', refreshRate: this.toInt(data.refreshRate),
            panelType: data.panelType || 'IPS',
            hasDedicatedGpu: this.toBool(data.hasDedicatedGpu),
            gpuBrand: data.gpuBrand || '', gpuModel: data.gpuModel || ''
        }}; break;

      case 'PC_DESKTOP':
        productData.desktopSpecs = { create: {
            processor: data.processor || 'N/A', ram: data.ram || 'N/A', storage: data.storage || 'N/A',
            hasDedicatedGpu: this.toBool(data.hasDedicatedGpu),
            gpuBrand: data.gpuBrand || '', gpuModel: data.gpuModel || ''
        }}; break;

      case 'SOFTWARE':
        productData.softwareSpecs = { create: {
            licenseType: data.licenseType || 'Permanente', platform: data.platform || 'Windows',
        }}; break;

      case 'MONITOR':
        productData.monitorSpecs = { create: {
            screenSize: data.screenSize || '24"', resolution: data.resolution || '1080p',
            panelType: data.panelType || 'IPS', refreshRate: this.toInt(data.refreshRate),
        }}; break;

      case 'KEYBOARD':
        productData.keyboardSpecs = { create: {
            connection: data.connection || 'USB', switchType: data.switchType || 'Membrana',
            layout: data.layout || 'ES', hasRGB: this.toBool(data.hasRGB),
        }}; break;

      case 'MOUSE':
        productData.mouseSpecs = { create: {
            connection: data.connection || 'USB', dpi: this.toInt(data.dpi),
            sensor: data.sensor || 'Óptico', hasRGB: this.toBool(data.hasRGB),
        }}; break;

      case 'HEADSET':
        productData.headsetSpecs = {
          create: {
            connection: data.connection || '3.5mm', 
            driverSize: this.toInt(data.driverSize) || 40,
            impedance: this.toInt(data.impedance) || 32,
            micType: data.micType || 'Estándar',
            noiseCancel: this.toBool(data.noiseCancel),
            hasRGB: this.toBool(data.hasRGB),
          }
        };
        break;

      case 'MICROPHONE':
        productData.microphoneSpecs = { create: {
            connection: data.connection || 'USB', micType: data.micType || 'Cardioide',
            hasRGB: this.toBool(data.hasRGB),
        }}; break;

      case 'SPEAKER':
        productData.speakerSpecs = { create: {
            connection: data.connection || 'Jack', wattage: this.toInt(data.wattage),
            hasRGB: this.toBool(data.hasRGB),
        }}; break;
    }

    return this.prisma.product.create({ data: productData });
  }

  // --- LEER TODOS (INCLUYENDO LAS NUEVAS TABLAS) ---
  findAll() { 
    return this.prisma.product.findMany({
      include: {
        cpuSpecs: true, motherboardSpecs: true, ramSpecs: true, gpuSpecs: true,
        psuSpecs: true, caseSpecs: true, coolerSpecs: true, storageSpecs: true,
        laptopSpecs: true, desktopSpecs: true, softwareSpecs: true,
        monitorSpecs: true, keyboardSpecs: true, mouseSpecs: true,
        headsetSpecs: true, microphoneSpecs: true, speakerSpecs: true,
      }
    }); 
  }

  findOne(id: string) { 
    return this.prisma.product.findUnique({ 
      where: { id },
      include: {
        cpuSpecs: true, motherboardSpecs: true, ramSpecs: true, gpuSpecs: true,
        psuSpecs: true, caseSpecs: true, coolerSpecs: true, storageSpecs: true,
        laptopSpecs: true, desktopSpecs: true, softwareSpecs: true,
        monitorSpecs: true, keyboardSpecs: true, mouseSpecs: true,
        headsetSpecs: true, microphoneSpecs: true, speakerSpecs: true,
      }
    }); 
  }

  update(id: string, data: any) { 
    return this.prisma.product.update({ where: { id }, data: {
      name: data.name, price: this.toFloat(data.price), stock: this.toInt(data.stock)
    }}); 
  }
  
  remove(id: string) { return this.prisma.product.delete({ where: { id } }); }
}