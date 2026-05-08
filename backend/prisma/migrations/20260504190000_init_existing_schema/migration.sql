-- CreateEnum
CREATE TYPE "CategoryType" AS ENUM ('CPU', 'MOTHERBOARD', 'RAM', 'GPU', 'STORAGE', 'PSU', 'CASE', 'COOLER', 'PERIPHERAL', 'MONITOR');

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "stock" INTEGER NOT NULL,
    "images" TEXT[],
    "category" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CpuSpecs" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "socket" TEXT NOT NULL,
    "cores" INTEGER NOT NULL,
    "frequency" TEXT NOT NULL,
    "tdp" INTEGER NOT NULL,
    "integratedGraphics" BOOLEAN NOT NULL,
    "includesCooler" BOOLEAN NOT NULL,

    CONSTRAINT "CpuSpecs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MotherboardSpecs" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "socket" TEXT NOT NULL,
    "formFactor" TEXT NOT NULL,
    "memoryType" TEXT NOT NULL,
    "memorySlots" INTEGER NOT NULL,
    "m2Slots" INTEGER NOT NULL,

    CONSTRAINT "MotherboardSpecs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RamSpecs" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "memoryType" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "speed" INTEGER NOT NULL,
    "modules" INTEGER NOT NULL,
    "hasRGB" BOOLEAN NOT NULL,

    CONSTRAINT "RamSpecs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GpuSpecs" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "chipset" TEXT NOT NULL,
    "vram" INTEGER NOT NULL,
    "length" INTEGER NOT NULL,
    "tdp" INTEGER NOT NULL,
    "fans" INTEGER NOT NULL,

    CONSTRAINT "GpuSpecs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PsuSpecs" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "wattage" INTEGER NOT NULL,
    "certification" TEXT NOT NULL,
    "modular" TEXT NOT NULL,
    "formFactor" TEXT NOT NULL,

    CONSTRAINT "PsuSpecs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseSpecs" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "formFactor" TEXT NOT NULL,
    "maxGpuLength" INTEGER NOT NULL,
    "includesPsu" BOOLEAN NOT NULL,
    "includedFans" INTEGER NOT NULL,

    CONSTRAINT "CaseSpecs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoolerSpecs" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "socketSupport" TEXT NOT NULL,
    "fanCount" INTEGER NOT NULL,
    "radiatorSize" INTEGER,
    "hasRGB" BOOLEAN NOT NULL,
    "hasScreen" BOOLEAN NOT NULL,
    "tdpCapacity" INTEGER,

    CONSTRAINT "CoolerSpecs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StorageSpecs" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "interface" TEXT NOT NULL,
    "readSpeed" INTEGER,

    CONSTRAINT "StorageSpecs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LaptopSpecs" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "processor" TEXT NOT NULL,
    "ram" TEXT NOT NULL,
    "storage" TEXT NOT NULL,
    "screenSize" TEXT NOT NULL,
    "refreshRate" INTEGER NOT NULL,
    "panelType" TEXT NOT NULL,
    "hasDedicatedGpu" BOOLEAN NOT NULL DEFAULT false,
    "gpuBrand" TEXT,
    "gpuModel" TEXT,

    CONSTRAINT "LaptopSpecs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DesktopSpecs" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "processor" TEXT NOT NULL,
    "ram" TEXT NOT NULL,
    "storage" TEXT NOT NULL,
    "hasDedicatedGpu" BOOLEAN NOT NULL DEFAULT false,
    "gpuBrand" TEXT,
    "gpuModel" TEXT,

    CONSTRAINT "DesktopSpecs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SoftwareSpecs" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "licenseType" TEXT NOT NULL,
    "platform" TEXT NOT NULL,

    CONSTRAINT "SoftwareSpecs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonitorSpecs" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "screenSize" TEXT NOT NULL,
    "resolution" TEXT NOT NULL,
    "panelType" TEXT NOT NULL,
    "refreshRate" INTEGER NOT NULL,

    CONSTRAINT "MonitorSpecs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KeyboardSpecs" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "connection" TEXT NOT NULL,
    "switchType" TEXT NOT NULL,
    "layout" TEXT NOT NULL,
    "hasRGB" BOOLEAN NOT NULL,

    CONSTRAINT "KeyboardSpecs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MouseSpecs" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "connection" TEXT NOT NULL,
    "dpi" INTEGER NOT NULL,
    "sensor" TEXT NOT NULL,
    "hasRGB" BOOLEAN NOT NULL,

    CONSTRAINT "MouseSpecs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HeadsetSpecs" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "connection" TEXT NOT NULL,
    "driverSize" INTEGER NOT NULL,
    "impedance" INTEGER NOT NULL,
    "micType" TEXT NOT NULL,
    "noiseCancel" BOOLEAN NOT NULL,
    "hasRGB" BOOLEAN NOT NULL,

    CONSTRAINT "HeadsetSpecs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MicrophoneSpecs" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "connection" TEXT NOT NULL,
    "micType" TEXT NOT NULL,
    "hasRGB" BOOLEAN NOT NULL,

    CONSTRAINT "MicrophoneSpecs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpeakerSpecs" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "connection" TEXT NOT NULL,
    "wattage" INTEGER NOT NULL,
    "hasRGB" BOOLEAN NOT NULL,

    CONSTRAINT "SpeakerSpecs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'EDITOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resetToken" TEXT,
    "resetTokenExpiry" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "CpuSpecs_productId_key" ON "CpuSpecs"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "MotherboardSpecs_productId_key" ON "MotherboardSpecs"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "RamSpecs_productId_key" ON "RamSpecs"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "GpuSpecs_productId_key" ON "GpuSpecs"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "PsuSpecs_productId_key" ON "PsuSpecs"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "CaseSpecs_productId_key" ON "CaseSpecs"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "CoolerSpecs_productId_key" ON "CoolerSpecs"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "StorageSpecs_productId_key" ON "StorageSpecs"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "LaptopSpecs_productId_key" ON "LaptopSpecs"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "DesktopSpecs_productId_key" ON "DesktopSpecs"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "SoftwareSpecs_productId_key" ON "SoftwareSpecs"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "MonitorSpecs_productId_key" ON "MonitorSpecs"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "KeyboardSpecs_productId_key" ON "KeyboardSpecs"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "MouseSpecs_productId_key" ON "MouseSpecs"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "HeadsetSpecs_productId_key" ON "HeadsetSpecs"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "MicrophoneSpecs_productId_key" ON "MicrophoneSpecs"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "SpeakerSpecs_productId_key" ON "SpeakerSpecs"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_resetToken_key" ON "User"("resetToken");

-- AddForeignKey
ALTER TABLE "CpuSpecs" ADD CONSTRAINT "CpuSpecs_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MotherboardSpecs" ADD CONSTRAINT "MotherboardSpecs_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RamSpecs" ADD CONSTRAINT "RamSpecs_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GpuSpecs" ADD CONSTRAINT "GpuSpecs_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PsuSpecs" ADD CONSTRAINT "PsuSpecs_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseSpecs" ADD CONSTRAINT "CaseSpecs_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoolerSpecs" ADD CONSTRAINT "CoolerSpecs_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorageSpecs" ADD CONSTRAINT "StorageSpecs_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LaptopSpecs" ADD CONSTRAINT "LaptopSpecs_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesktopSpecs" ADD CONSTRAINT "DesktopSpecs_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SoftwareSpecs" ADD CONSTRAINT "SoftwareSpecs_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonitorSpecs" ADD CONSTRAINT "MonitorSpecs_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KeyboardSpecs" ADD CONSTRAINT "KeyboardSpecs_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MouseSpecs" ADD CONSTRAINT "MouseSpecs_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HeadsetSpecs" ADD CONSTRAINT "HeadsetSpecs_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MicrophoneSpecs" ADD CONSTRAINT "MicrophoneSpecs_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeakerSpecs" ADD CONSTRAINT "SpeakerSpecs_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionLog" ADD CONSTRAINT "ActionLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
