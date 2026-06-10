import { BadRequestException, Injectable } from '@nestjs/common';
import AdmZip from 'adm-zip';
import * as XLSX from 'xlsx';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { CLOUDINARY_UPLOAD_FOLDERS, CloudinaryService } from '../../uploads/cloudinary.service';
import { ProductsService } from '../products.service';
import {
  ProductImportBody,
  ProductImportConfirmResult,
  ProductImportIssue,
  ProductImportPreviewResult,
  PreparedImport,
  PreparedImportRow,
} from './product-import.types';
import { REQUIRED_GENERAL_COLUMNS, resolveImportProductType } from './product-import-catalog';
import {
  isAllowedImageFile,
  isAmdSocket,
  isKnownSocket,
  isSafeZipEntryName,
  normalizeFormFactor,
  normalizeHeader,
  normalizeMemoryType,
  normalizePartNumber,
  normalizeSocket,
  normalizeSocketList,
  normalizeText,
  normalizeZipFileName,
  parseImportBoolean,
  parseRequiredInteger,
  parseRequiredNumber,
  splitFileList,
  getMimeTypeFromFileName,
} from './product-import-normalizers';

type ImportFiles = {
  excel?: Express.Multer.File[];
  imagesZip?: Express.Multer.File[];
};

type RawRow = Record<string, unknown>;
type NormalizedRow = Record<string, unknown>;

@Injectable()
export class ProductImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly productsService: ProductsService,
    private readonly cloudinary: CloudinaryService,
    private readonly audit: AuditService,
  ) {}

  async preview(
    body: ProductImportBody,
    files: ImportFiles,
    actorId?: string,
  ): Promise<ProductImportPreviewResult> {
    const prepared = await this.prepareImport(body, files);
    const excelFileName = files.excel?.[0]?.originalname ?? '';
    if (actorId) {
      await this.audit.log({
        actorId,
        action: 'IMPORT_PRODUCTS_PREVIEW',
        module: 'PRODUCTS',
        entityType: 'Product',
        description: `Valido importacion masiva de ${prepared.totalRows} producto(s).`,
        metadata: {
          excelFileName,
          totalRows: prepared.totalRows,
          validRows: prepared.validRows,
          invalidRows: prepared.invalidRows,
          errorCount: prepared.errors.length,
          warningCount: prepared.warnings.length,
          newProducts: prepared.newProducts,
          productsToUpdate: prepared.productsToUpdate,
          imagesMissing: prepared.imagesMissing,
        },
      });
    }

    return this.toPreviewResult(prepared);
  }

  async confirm(
    body: ProductImportBody,
    files: ImportFiles,
    actorId: string,
  ): Promise<ProductImportConfirmResult> {
    const prepared = await this.prepareImport(body, files);
    const excelFileName = files.excel?.[0]?.originalname ?? '';
    if (prepared.errors.length > 0) {
      await this.audit.log({
        actorId,
        action: 'PRODUCT_BULK_IMPORT_FAILED',
        module: 'PRODUCTS',
        entityType: 'Product',
        description: `Importacion masiva bloqueada por ${prepared.errors.length} error(es).`,
        metadata: {
          excelFileName,
          totalRows: prepared.totalRows,
          validRows: prepared.validRows,
          errorCount: prepared.errors.length,
          warningCount: prepared.warnings.length,
          errors: prepared.errors,
        },
      });

      return {
        created: 0,
        updated: 0,
        failed: prepared.invalidRows,
        uploadedImages: 0,
        errors: prepared.errors,
        warnings: prepared.warnings,
      };
    }

    const zip = this.readZip(this.getRequiredFile(files.imagesZip, 'ZIP de imagenes'));
    const zipEntries = this.buildZipEntryMap(zip);
    let created = 0;
    let updated = 0;
    let uploadedImages = 0;
    const errors: ProductImportIssue[] = [];

    for (const row of prepared.preparedRows) {
      try {
        const imageUrls = await this.uploadRowImages(row, zipEntries);
        uploadedImages += imageUrls.length;
        const payload = { ...row.payload, uploadedImages: imageUrls };

        if (row.action === 'update' && row.productId) {
          await this.productsService.update(
            row.productId,
            { ...row.payload, images: imageUrls } as any,
            actorId,
          );
          updated += 1;
          await this.audit.log({
            actorId,
            action: 'PRODUCT_BULK_UPDATED',
            module: 'PRODUCTS',
            entityType: 'Product',
            entityId: row.productId,
            entityName: String(row.payload.name),
            description: `Producto actualizado por importacion masiva: ${row.payload.name}.`,
            metadata: { row: row.row, sku: String(row.payload.sku ?? '') },
          });
        } else {
          const product = await this.productsService.create(payload as any, actorId);
          created += 1;
          await this.audit.log({
            actorId,
            action: 'PRODUCT_BULK_CREATED',
            module: 'PRODUCTS',
            entityType: 'Product',
            entityId: product.id,
            entityName: product.name,
            description: `Producto creado por importacion masiva: ${product.name}.`,
            metadata: { row: row.row, sku: product.sku },
          });
        }
      } catch (error) {
        errors.push({
          row: row.row,
          field: 'importacion',
          message:
            error instanceof Error
              ? error.message
              : 'No se pudo importar el producto de esta fila.',
        });
      }
    }

    if (errors.length > 0) {
      await this.audit.log({
        actorId,
        action: 'PRODUCT_BULK_IMPORT_FAILED',
        module: 'PRODUCTS',
        entityType: 'Product',
        description: `Importacion masiva finalizo con ${errors.length} fallo(s).`,
        metadata: {
          excelFileName,
          created,
          updated,
          uploadedImages,
          errorCount: errors.length,
          errors,
        },
      });
    } else {
      await this.audit.log({
        actorId,
        action: 'PRODUCT_BULK_IMPORT_CONFIRMED',
        module: 'PRODUCTS',
        entityType: 'Product',
        description: `Importacion masiva confirmada: ${created} creado(s), ${updated} actualizado(s).`,
        metadata: {
          excelFileName,
          totalRows: prepared.totalRows,
          validRows: prepared.validRows,
          created,
          updated,
          uploadedImages,
          warningCount: prepared.warnings.length,
        },
      });
    }

    return {
      created,
      updated,
      failed: errors.length,
      uploadedImages,
      errors,
      warnings: prepared.warnings,
    };
  }

  private async prepareImport(
    body: ProductImportBody,
    files: ImportFiles,
  ): Promise<PreparedImport> {
    const productCategory = this.resolveProductCategory(body);
    const excelFile = this.getRequiredFile(files.excel, 'archivo Excel');
    const zipFile = this.getRequiredFile(files.imagesZip, 'ZIP de imagenes');
    this.validateUploadedFiles(excelFile, zipFile);

    const rawRows = this.readExcelRows(excelFile);
    const zipEntries = this.buildZipEntryMap(this.readZip(zipFile));
    const missingColumns = this.getMissingColumns(rawRows, productCategory);
    const errors: ProductImportIssue[] = [];
    const warnings: ProductImportIssue[] = [];
    const preparedRows: PreparedImportRow[] = [];
    const rows: ProductImportPreviewResult['rows'] = [];
    let imagesMissing = 0;
    let newProducts = 0;
    let productsToUpdate = 0;

    for (const column of missingColumns) {
      errors.push({
        row: 1,
        field: column,
        message: `Falta la columna obligatoria ${this.getFieldLabel(column)}.`,
      });
    }

    if (missingColumns.length > 0) {
      return this.buildPreparedResult(rawRows.length, zipEntries.size, errors, warnings, [], 0);
    }

    for (let index = 0; index < rawRows.length; index += 1) {
      const rowNumber = index + 2;
      const row = this.normalizeRow(rawRows[index]);
      const rowErrors: ProductImportIssue[] = [];
      const rowWarnings: ProductImportIssue[] = [];
      const payload = this.buildPayload(row, productCategory, rowNumber, rowErrors, rowWarnings);
      const imageFiles = this.resolveRowImages(row, rowNumber, zipEntries, rowErrors, rowWarnings);
      const sku = String(payload.sku ?? '');
      const existingProduct = sku ? await this.prisma.product.findUnique({ where: { sku } }) : null;
      const action = existingProduct ? 'update' : 'create';

      if (existingProduct) {
        rowWarnings.push({
          row: rowNumber,
          field: 'sku',
          message: 'El producto ya existe y sera actualizado.',
        });
      }

      if (imageFiles.length > 5) {
        rowErrors.push({
          row: rowNumber,
          field: 'imagenesArchivos',
          message: 'El sistema permite como maximo 5 imagenes por producto.',
        });
      }

      errors.push(...rowErrors);
      warnings.push(...rowWarnings);
      imagesMissing += rowErrors.filter((issue) => issue.field.includes('imagen')).length;

      if (rowErrors.length === 0) {
        preparedRows.push({
          row: rowNumber,
          action,
          productId: existingProduct?.id,
          payload,
          imageFiles,
        });
        if (action === 'update') productsToUpdate += 1;
        else newProducts += 1;
      }

      rows.push({
        row: rowNumber,
        status: rowErrors.length > 0 ? 'invalid' : 'valid',
        action,
        name: String(payload.name ?? ''),
        numeroParte: String(payload.sku ?? ''),
        imageCount: imageFiles.length,
      });
    }

    return {
      totalRows: rawRows.length,
      validRows: preparedRows.length,
      invalidRows: rawRows.length - preparedRows.length,
      newProducts,
      productsToUpdate,
      imagesFound: zipEntries.size,
      imagesMissing,
      errors,
      warnings,
      rows,
      preparedRows,
    };
  }

  private toPreviewResult(prepared: PreparedImport): ProductImportPreviewResult {
    const { preparedRows: _preparedRows, ...preview } = prepared;
    return preview;
  }

  private buildPreparedResult(
    totalRows: number,
    imagesFound: number,
    errors: ProductImportIssue[],
    warnings: ProductImportIssue[],
    rows: ProductImportPreviewResult['rows'],
    imagesMissing: number,
  ): PreparedImport {
    return {
      totalRows,
      validRows: 0,
      invalidRows: totalRows,
      newProducts: 0,
      productsToUpdate: 0,
      imagesFound,
      imagesMissing,
      errors,
      warnings,
      rows,
      preparedRows: [],
    };
  }

  private getRequiredFile(files: Express.Multer.File[] | undefined, label: string) {
    const file = files?.[0];
    if (!file) {
      throw new BadRequestException(`Debes adjuntar el ${label}.`);
    }
    return file;
  }

  private validateUploadedFiles(excel: Express.Multer.File, zip: Express.Multer.File) {
    if (!/\.xlsx$/i.test(excel.originalname)) {
      throw new BadRequestException('El archivo Excel debe tener extension .xlsx.');
    }

    if (!/\.zip$/i.test(zip.originalname)) {
      throw new BadRequestException('El archivo de imagenes debe ser un ZIP.');
    }
  }

  private readExcelRows(file: Express.Multer.File) {
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new BadRequestException('El Excel no contiene hojas para leer.');
    }

    const rows = XLSX.utils.sheet_to_json<RawRow>(workbook.Sheets[sheetName], {
      defval: '',
      raw: false,
    });

    if (rows.length === 0) {
      throw new BadRequestException('El Excel no contiene productos para importar.');
    }

    return rows;
  }

  private readZip(file: Express.Multer.File) {
    try {
      return new AdmZip(file.buffer);
    } catch {
      throw new BadRequestException('No se pudo leer el ZIP de imagenes.');
    }
  }

  private buildZipEntryMap(zip: AdmZip) {
    const entries = new Map<string, AdmZip.IZipEntry>();
    for (const entry of zip.getEntries()) {
      if (entry.isDirectory) continue;
      if (!isSafeZipEntryName(entry.entryName)) {
        throw new BadRequestException(`El ZIP contiene una ruta no permitida: ${entry.entryName}`);
      }
      if (!isAllowedImageFile(entry.entryName)) {
        continue;
      }
      const fileName = normalizeZipFileName(entry.entryName);
      if (fileName) entries.set(fileName, entry);
    }
    return entries;
  }

  private getMissingColumns(rawRows: RawRow[], category: string) {
    const firstRow = rawRows[0] ?? {};
    const headers = new Set(Object.keys(firstRow).map((key) => normalizeHeader(key)));
    const requiredColumns = REQUIRED_GENERAL_COLUMNS.filter(
      (column) => !(category === 'CPU' && column === 'marca'),
    );
    const missing = requiredColumns.filter((column) => !headers.has(normalizeHeader(column)));
    if (!headers.has('sku') && !headers.has('numeroparte')) {
      missing.splice(1, 0, 'sku');
    }
    return missing;
  }

  private normalizeRow(row: RawRow): NormalizedRow {
    const normalized: NormalizedRow = {};
    for (const [key, value] of Object.entries(row)) {
      normalized[normalizeHeader(key)] = value;
    }
    return normalized;
  }

  private resolveProductCategory(body: ProductImportBody) {
    return resolveImportProductType(body.category, body.productType).category;
  }

  private buildPayload(
    row: NormalizedRow,
    category: string,
    rowNumber: number,
    errors: ProductImportIssue[],
    warnings: ProductImportIssue[],
  ) {
    const name = normalizeText(row.nombre);
    const rawSku = normalizeText(row.sku);
    const rawNumeroParte = normalizeText(row.numeroparte);
    const sku = normalizePartNumber(rawSku || rawNumeroParte);
    const description = normalizeText(row.descripcion);
    const price = parseRequiredNumber(row.precio);
    const stock = parseRequiredInteger(row.stock);
    const brand =
      category === 'CPU' ? normalizeText(row.marcaprocesador) : normalizeText(row.marca);
    const payload: Record<string, unknown> = {
      sku,
      name,
      description,
      price,
      stock,
      category,
      brand,
    };

    if (!name) this.pushError(errors, rowNumber, 'nombre', 'El nombre es obligatorio.');
    if (!sku) this.pushError(errors, rowNumber, 'sku', 'El SKU del Producto es obligatorio.');
    if (rawNumeroParte && !rawSku) {
      warnings.push({
        row: rowNumber,
        field: 'sku',
        message: 'numeroParte fue normalizado a sku.',
      });
    }
    if (
      rawSku &&
      rawNumeroParte &&
      normalizePartNumber(rawSku) !== normalizePartNumber(rawNumeroParte)
    ) {
      warnings.push({
        row: rowNumber,
        field: 'sku',
        message: 'sku y numeroParte difieren; se usara sku como fuente principal.',
      });
    }
    if (!brand) {
      this.pushError(
        errors,
        rowNumber,
        category === 'CPU' ? 'marcaProcesador' : 'marca',
        category === 'CPU' ? 'La marca del procesador es obligatoria.' : 'La marca es obligatoria.',
      );
    }
    if (!description)
      this.pushError(errors, rowNumber, 'descripcion', 'La descripcion es obligatoria.');
    if (price === undefined || price <= 0) {
      this.pushError(errors, rowNumber, 'precio', 'El precio debe ser mayor a 0.');
    }
    if (stock === undefined || stock < 0) {
      this.pushError(errors, rowNumber, 'stock', 'El stock debe ser un entero mayor o igual a 0.');
    }

    this.applyCategoryPayload(row, category, payload, rowNumber, errors, warnings);
    return payload;
  }

  private applyCategoryPayload(
    row: NormalizedRow,
    category: string,
    payload: Record<string, unknown>,
    rowNumber: number,
    errors: ProductImportIssue[],
    warnings: ProductImportIssue[],
  ) {
    switch (category) {
      case 'CPU':
        this.applyCpuPayload(row, payload, rowNumber, errors);
        break;
      case 'MOTHERBOARD':
        if (row.frecuenciaram !== undefined) {
          warnings.push({
            row: rowNumber,
            field: 'frecuenciaRam',
            message: 'La columna frecuenciaRam ya no se usa para Placa Madre.',
          });
        }
        this.applyMotherboardPayload(row, payload, rowNumber, errors);
        break;
      case 'RAM':
        payload.brand = this.requiredText(row.marca, 'marca', rowNumber, errors);
        payload.memoryType = this.requiredText(row.tiporam, 'tipoRam', rowNumber, errors);
        if (normalizeText(row.cantidad) && !normalizeText(row.capacidadpormodulo)) {
          warnings.push({
            row: rowNumber,
            field: 'capacidadPorModulo',
            message: 'cantidad fue normalizado a capacidadPorModulo.',
          });
        }
        payload.capacity = this.requiredInteger(
          normalizeText(row.capacidadpormodulo) ? row.capacidadpormodulo : row.cantidad,
          'capacidadPorModulo',
          rowNumber,
          errors,
        );
        payload.speed = this.requiredInteger(row.frecuencia, 'frecuencia', rowNumber, errors);
        payload.modules = this.requiredInteger(row.modulos, 'modulos', rowNumber, errors);
        payload.latency = normalizeText(row.latencia) || undefined;
        payload.hasRGB = parseImportBoolean(row.rgb) ?? false;
        break;
      case 'GPU':
        payload.chipset = this.requiredGpuChipset(row.chipset, 'chipset', rowNumber, errors);
        payload.vram = this.requiredInteger(row.vram, 'vram', rowNumber, errors);
        payload.typeVram = this.requiredGpuVramType(row.tipovram, 'tipoVram', rowNumber, errors);
        if (normalizeText(row.longitudmm) && !normalizeText(row.largomm)) {
          warnings.push({
            row: rowNumber,
            field: 'largoMm',
            message: 'longitudMm fue normalizado a largoMm.',
          });
        }
        if (
          normalizeText(row.longitud) &&
          !normalizeText(row.largomm) &&
          !normalizeText(row.longitudmm)
        ) {
          warnings.push({
            row: rowNumber,
            field: 'largoMm',
            message: 'longitud fue normalizado a largoMm.',
          });
        }
        payload.length = this.requiredInteger(
          normalizeText(row.largomm)
            ? row.largomm
            : normalizeText(row.longitudmm)
              ? row.longitudmm
              : row.longitud,
          'largoMm',
          rowNumber,
          errors,
        );
        payload.gpuPowerWatts = this.requiredInteger(row.tdp, 'tdp', rowNumber, errors);
        payload.recommendedPsuWatts = this.requiredInteger(
          row.fuenterecomendada,
          'fuenteRecomendada',
          rowNumber,
          errors,
        );
        payload.fans = this.requiredInteger(row.ventiladores, 'ventiladores', rowNumber, errors);
        break;
      case 'PSU':
        if (normalizeText(row.watts) && !normalizeText(row.potenciawatts)) {
          warnings.push({
            row: rowNumber,
            field: 'potenciaWatts',
            message: 'watts fue normalizado a potenciaWatts.',
          });
        }
        payload.wattage = this.requiredInteger(
          normalizeText(row.potenciawatts) ? row.potenciawatts : row.watts,
          'potenciaWatts',
          rowNumber,
          errors,
        );
        payload.certification = this.requiredText(
          row.certificacion,
          'certificacion',
          rowNumber,
          errors,
        );
        payload.modular = this.requiredText(row.modularidad, 'modularidad', rowNumber, errors);
        payload.formFactor = normalizeText(row.formato) || 'ATX';
        break;
      case 'CASE':
        if (normalizeText(row.formatosoportado) && !normalizeText(row.soporteplaca)) {
          warnings.push({
            row: rowNumber,
            field: 'soportePlaca',
            message: 'formatoSoportado fue normalizado a soportePlaca.',
          });
        }
        if (normalizeText(row.tipocase)) {
          warnings.push({
            row: rowNumber,
            field: 'tipoCase',
            message: 'tipoCase ya no se usa y fue ignorado.',
          });
        }
        if (normalizeText(row.longitudgpumax) && !normalizeText(row.largogpumax)) {
          warnings.push({
            row: rowNumber,
            field: 'largoGpuMax',
            message: 'longitudGpuMax fue normalizado a largoGpuMax.',
          });
        }
        payload.supportedFormFactors = this.requiredFormFactorList(
          normalizeText(row.soporteplaca) ? row.soporteplaca : row.formatosoportado,
          'soportePlaca',
          rowNumber,
          errors,
        );
        payload.formFactor = (payload.supportedFormFactors as string[])[0] ?? 'ATX';
        payload.maxGpuLength = this.requiredInteger(
          normalizeText(row.largogpumax) ? row.largogpumax : row.longitudgpumax,
          'largoGpuMax',
          rowNumber,
          errors,
        );
        payload.maxCoolerHeight = this.requiredInteger(
          row.alturacoolermax,
          'alturaCoolerMax',
          rowNumber,
          errors,
        );
        payload.includesPsu = parseImportBoolean(row.fuenteincluida) ?? false;
        payload.includedFans =
          this.optionalInteger(
            normalizeText(row.ventiladoresincluidos)
              ? row.ventiladoresincluidos
              : row.coolersincluidos,
          ) ?? 0;
        payload.radiatorSupportMmValues = this.normalizeRadiatorValues(
          normalizeText(row.soporteradiadorliquido) ? row.soporteradiadorliquido : row.radiadormm,
        );
        payload.radiatorSupportMm = this.getMaxRadiatorValue(
          payload.radiatorSupportMmValues as string[],
        );
        break;
      case 'COOLER':
        payload.type = this.requiredCoolerType(row.tipo, 'tipo', rowNumber, errors, warnings);
        payload.compatibleSockets = this.requiredSocketList(
          row.socketsoportado,
          'socketSoportado',
          rowNumber,
          errors,
        );
        payload.socketSupport = (payload.compatibleSockets as string[]).join(', ');
        payload.coolerHeight = this.optionalInteger(row.alturamm) ?? 1;
        payload.radiatorSize = this.optionalInteger(row.radiadormm) ?? 0;
        payload.fanCount = this.optionalInteger(row.ventiladores) ?? 1;
        payload.hasRGB = parseImportBoolean(row.rgb) ?? false;
        payload.hasScreen =
          parseImportBoolean(normalizeText(row.pantallalcd) ? row.pantallalcd : row.pantalla) ??
          false;
        payload.tdpCapacity = this.optionalInteger(row.tdpsoportado) ?? 1;
        break;
      case 'STORAGE':
        payload.type = this.requiredStorageType(
          row.tipoalmacenamiento,
          'tipoAlmacenamiento',
          rowNumber,
          errors,
          warnings,
        );
        if (normalizeText(row.capacidad) && !normalizeText(row.capacidadgb)) {
          warnings.push({
            row: rowNumber,
            field: 'capacidadGB',
            message: 'capacidad fue normalizado a capacidadGB.',
          });
        }
        payload.capacity = this.requiredStorageCapacityGb(
          normalizeText(row.capacidadgb) ? row.capacidadgb : row.capacidad,
          'capacidadGB',
          rowNumber,
          errors,
        );
        if (normalizeText(row.interfaz) && !normalizeText(row.generacion)) {
          warnings.push({
            row: rowNumber,
            field: 'generacion',
            message: 'interfaz fue normalizado a generacion.',
          });
        }
        payload.interface = normalizeText(row.generacion)
          ? normalizeText(row.generacion)
          : this.normalizeStorageGeneration(
              row.interfaz,
              row.tipoalmacenamiento,
              payload.type as string,
              warnings,
              rowNumber,
            );
        if (payload.type !== 'Sólido M.2' && payload.interface !== 'SATA') {
          warnings.push({
            row: rowNumber,
            field: 'generacion',
            message:
              'La generacion solo aplica para Sólido M.2. Fue normalizada a SATA para este tipo de almacenamiento.',
          });
          payload.interface = 'SATA';
        }
        payload.m2FormFactor = this.normalizeStorageM2FormFactor(
          normalizeText(row.tamanofisicom2) ? row.tamanofisicom2 : row.formato,
          payload.type as string,
          rowNumber,
          errors,
        );
        payload.readSpeed = this.requiredInteger(
          normalizeText(row.velocidadlecturambs) ? row.velocidadlecturambs : row.lecturambs,
          'velocidadLecturaMBs',
          rowNumber,
          errors,
        );
        payload.writeSpeed = this.requiredInteger(
          normalizeText(row.velocidadescriturambs) ? row.velocidadescriturambs : row.escriturambs,
          'velocidadEscrituraMBs',
          rowNumber,
          errors,
        );
        break;
      default:
        this.applyGenericPayload(category, payload);
        break;
    }
  }

  private applyCpuPayload(
    row: NormalizedRow,
    payload: Record<string, unknown>,
    rowNumber: number,
    errors: ProductImportIssue[],
  ) {
    const socket = this.requiredSocket(row.socket, 'socket', rowNumber, errors);
    const cpuBrand = normalizeText(row.marcaprocesador) || normalizeText(row.marca);
    const integratedGraphics = this.requiredBoolean(
      row.graficosintegrados,
      'graficosIntegrados',
      rowNumber,
      errors,
    );
    const includesCooler = this.requiredBoolean(
      row.incluyecooler,
      'incluyeCooler',
      rowNumber,
      errors,
    );

    payload.cpuBrand = cpuBrand;
    payload.socket = socket;
    payload.baseTdpWatts = this.requiredInteger(row.tdpbase, 'tdpBase', rowNumber, errors);
    payload.tdp = this.requiredInteger(row.tdpmaximo, 'tdpMaximo', rowNumber, errors);
    payload.cores = this.requiredInteger(row.nucleos, 'nucleos', rowNumber, errors);
    payload.threads = this.requiredInteger(row.threads, 'threads', rowNumber, errors);
    payload.frequency = String(
      this.requiredNumber(row.frecuenciaghz, 'frecuenciaGhz', rowNumber, errors),
    );
    payload.integratedGraphics = integratedGraphics;
    payload.includesCooler = includesCooler;

    if (socket && isAmdSocket(socket) && !/amd/i.test(cpuBrand)) {
      this.pushError(
        errors,
        rowNumber,
        'marcaProcesador',
        'El socket seleccionado pertenece a AMD.',
      );
    }
  }

  private applyMotherboardPayload(
    row: NormalizedRow,
    payload: Record<string, unknown>,
    rowNumber: number,
    errors: ProductImportIssue[],
  ) {
    payload.socket = this.requiredSocket(row.socket, 'socket', rowNumber, errors);
    payload.formFactor = normalizeFormFactor(
      this.requiredText(row.formato, 'formato', rowNumber, errors),
    );
    const memoryType = normalizeMemoryType(
      this.requiredText(row.tiporam, 'tipoRam', rowNumber, errors),
    );
    if (!['DDR3', 'DDR4', 'DDR5'].includes(memoryType)) {
      this.pushError(errors, rowNumber, 'tipoRam', 'El tipo de RAM debe ser DDR3, DDR4 o DDR5.');
    }
    payload.memoryType = memoryType;
    payload.memorySlots = this.requiredInteger(row.slotsram, 'slotsRam', rowNumber, errors);
    payload.m2Slots = this.requiredInteger(row.slotsm2, 'slotsM2', rowNumber, errors);
    payload.supportedM2FormFactors = ['2230', '2242', '2260', '2280', '22110'].filter((size) => {
      const value = row[`m2${size}`];
      return parseImportBoolean(value) === true;
    });

    if ((payload.supportedM2FormFactors as string[]).length === 0) {
      payload.supportedM2FormFactors = ['2280'];
    }
  }

  private requiredFormFactorList(
    value: unknown,
    field: string,
    row: number,
    errors: ProductImportIssue[],
  ) {
    const formFactors = normalizeText(value)
      .split(';')
      .map((item) => normalizeFormFactor(item))
      .filter(Boolean);

    if (formFactors.length === 0) {
      this.pushError(errors, row, field, `El campo ${this.getFieldLabel(field)} es obligatorio.`);
    }

    return [...new Set(formFactors)];
  }

  private normalizeRadiatorValues(value: unknown) {
    const values = normalizeText(value)
      .split(';')
      .map((item) => {
        const text = normalizeText(item);
        const match = text.match(/\d+/);
        if (!match) return /no/i.test(text) ? '0' : '';
        return match[0];
      })
      .filter(Boolean);

    if (values.length === 0 || values.includes('0')) return ['0'];
    return [...new Set(values)];
  }

  private getMaxRadiatorValue(values: string[]) {
    if (values.includes('0')) return 0;
    return Math.max(0, ...values.map((value) => Number(value)).filter(Number.isFinite));
  }

  private requiredCoolerType(
    value: unknown,
    field: string,
    row: number,
    errors: ProductImportIssue[],
    warnings: ProductImportIssue[],
  ) {
    const rawType = normalizeText(value);
    if (!rawType) {
      this.pushError(errors, row, field, `El campo ${this.getFieldLabel(field)} es obligatorio.`);
      return 'Torre';
    }

    const normalized = rawType
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    if (normalized === 'aire') {
      warnings.push({
        row,
        field,
        message: 'Aire fue normalizado a Torre.',
      });
      return 'Torre';
    }

    if (normalized.includes('liqu')) return 'Líquida';
    if (normalized === 'torre') return 'Torre';

    this.pushError(errors, row, field, 'El tipo de refrigeracion debe ser Torre o Liquida.');
    return rawType;
  }

  private requiredStorageType(
    value: unknown,
    field: string,
    row: number,
    errors: ProductImportIssue[],
    warnings: ProductImportIssue[],
  ) {
    const rawType = normalizeText(value);
    if (!rawType) {
      this.pushError(errors, row, field, `El campo ${this.getFieldLabel(field)} es obligatorio.`);
      return 'SSD 2.5';
    }

    const normalized = rawType
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    if (normalized.includes('NVME') || normalized.includes('M.2')) {
      if (normalized.includes('NVME')) {
        warnings.push({
          row,
          field,
          message: 'NVMe M.2 fue normalizado a Sólido M.2.',
        });
      }
      return 'Sólido M.2';
    }
    if (normalized === 'SSD' || normalized.includes('SSD 2.5')) return 'SSD 2.5';
    if (normalized === 'HDD' || normalized.includes('HDD 3.5')) return 'HDD 3.5';

    this.pushError(
      errors,
      row,
      field,
      'El tipo de almacenamiento debe ser SSD 2.5, Sólido M.2 o HDD 3.5.',
    );
    return rawType;
  }

  private requiredStorageCapacityGb(
    value: unknown,
    field: string,
    row: number,
    errors: ProductImportIssue[],
  ) {
    const text = normalizeText(value).toUpperCase();
    const parsed = parseRequiredNumber(text);
    if (parsed === undefined) {
      this.pushError(
        errors,
        row,
        field,
        `El campo ${this.getFieldLabel(field)} debe ser numerico.`,
      );
      return 0;
    }

    return text.includes('TB') ? Math.round(parsed * 1000) : Math.round(parsed);
  }

  private normalizeStorageGeneration(
    value: unknown,
    rawStorageType: unknown,
    storageType: string,
    warnings: ProductImportIssue[],
    row: number,
  ) {
    const rawGeneration = normalizeText(value);
    const rawType = normalizeText(rawStorageType).toUpperCase();

    if (!rawGeneration && rawType.includes('M.2') && rawType.includes('SATA')) {
      warnings.push({
        row,
        field: 'generacion',
        message: 'M.2 SATA fue normalizado a Sólido M.2 con generacion SATA.',
      });
      return 'SATA';
    }

    if (!rawGeneration) return storageType === 'Sólido M.2' ? 'PCIe 4.0' : 'SATA';

    const normalized = rawGeneration.toUpperCase();
    if (normalized.includes('SATA')) return 'SATA';
    if (normalized.includes('5.0')) return 'PCIe 5.0';
    if (normalized.includes('4.0') || normalized.includes('NVME') || normalized.includes('PCIE')) {
      return normalized.includes('3.0') ? 'PCIe 3.0' : 'PCIe 4.0';
    }
    if (normalized.includes('3.0')) return 'PCIe 3.0';
    return rawGeneration;
  }

  private normalizeStorageM2FormFactor(
    value: unknown,
    storageType: string,
    row: number,
    errors: ProductImportIssue[],
  ) {
    if (storageType !== 'Sólido M.2') return null;

    const match = normalizeText(value).match(/2230|2242|2260|2280|22110/);
    if (!match) {
      this.pushError(errors, row, 'tamanoFisicoM2', 'El tamaño fisico M.2 es obligatorio.');
      return null;
    }

    return match[0];
  }

  private applyGenericPayload(category: string, payload: Record<string, unknown>) {
    const defaults: Record<string, Record<string, unknown>> = {
      LAPTOP: {
        processor: 'No especificado',
        ram: 'No especificado',
        storage: 'No especificado',
        screenSize: '15.6',
        refreshRate: 60,
        panelType: 'IPS',
        hasDedicatedGpu: false,
        includesWindows: true,
      },
      PC_DESKTOP: {
        processor: 'No especificado',
        ram: 'No especificado',
        storage: 'No especificado',
        hasDedicatedGpu: false,
      },
      MONITOR: {
        screenSize: '24',
        resolution: 'FHD (1920x1080)',
        panelType: 'IPS',
        refreshRate: 60,
        ports: [],
        hasSpeakers: false,
      },
      KEYBOARD: {
        connection: 'Cableado',
        switchType: '',
        layoutLanguage: 'Espanol',
        keyboardType: 'Membrana',
        connections: ['Cableado'],
        hasLighting: false,
        keyboardFormFactor: 'Completo',
      },
      MOUSE: {
        connection: 'Cableado',
        dpi: 0,
        sensor: 'Optico',
        hasRGB: false,
        mouseType: 'Oficina',
        connections: ['Cableado'],
        powerType: 'Ninguno',
      },
      MOUSEPAD: { hasLed: false },
      HEADSET: {
        connection: 'Cable USB',
        supportedConnections: ['Cable USB'],
        driverSize: 50,
        impedance: 32,
        micType: 'Unidireccional',
        noiseCancel: false,
        hasRGB: false,
      },
      MICROPHONE: { connection: 'USB', micType: 'Cardioide', hasRGB: false },
      SPEAKER: { connection: 'USB', wattage: 5, hasRGB: false },
      WEBCAM: { resolution: 'FHD', fps: 30 },
      CAPTURE_CARD: { resolution: 'FHD', fps: 30 },
      CABLE_HUB: { cableHubType: 'Cable', cableType: 'HDMI a HDMI', cableLengthMeters: 1 },
      LAPTOP_COOLING_BASE: { fanCount: 1, connectivity: 'USB-A' },
      BACKPACK: { color: '' },
      CHAIR: { color: '', material: 'Cuero sintetico' },
      GAMING_DESK: { color: '', surface: '' },
      SOFTWARE: { licenseType: 'Permanente', platform: 'Windows' },
    };

    Object.assign(payload, defaults[category] ?? {});
  }

  private resolveRowImages(
    row: NormalizedRow,
    rowNumber: number,
    zipEntries: Map<string, AdmZip.IZipEntry>,
    errors: ProductImportIssue[],
    warnings: ProductImportIssue[],
  ) {
    const primary = normalizeText(row.imagenprincipal);
    const listedImages = splitFileList(row.imagenesarchivos);
    const imageFiles = primary
      ? [primary, ...listedImages.filter((fileName) => normalizeText(fileName) !== primary)]
      : listedImages;

    if (!primary) {
      this.pushError(errors, rowNumber, 'imagenPrincipal', 'La imagen principal es obligatoria.');
    }

    if (
      primary &&
      !listedImages.some(
        (fileName) => normalizeZipFileName(fileName) === normalizeZipFileName(primary),
      )
    ) {
      warnings.push({
        row: rowNumber,
        field: 'imagenPrincipal',
        message: 'La imagen principal no estaba en imagenesArchivos y se agregara al inicio.',
      });
    }

    for (const fileName of imageFiles) {
      const normalizedFileName = normalizeZipFileName(fileName);
      if (!normalizedFileName || !isAllowedImageFile(fileName)) {
        this.pushError(errors, rowNumber, 'imagenesArchivos', `Imagen no permitida: ${fileName}`);
        continue;
      }

      if (!zipEntries.has(normalizedFileName)) {
        this.pushError(
          errors,
          rowNumber,
          fileName === primary ? 'imagenPrincipal' : 'imagenesArchivos',
          `La imagen ${fileName} no existe en el ZIP.`,
        );
      }
    }

    return Array.from(
      new Map(imageFiles.map((fileName) => [normalizeZipFileName(fileName), fileName])).values(),
    ).filter(Boolean);
  }

  private async uploadRowImages(row: PreparedImportRow, zipEntries: Map<string, AdmZip.IZipEntry>) {
    const uploaded: string[] = [];
    for (const fileName of row.imageFiles) {
      const entry = zipEntries.get(normalizeZipFileName(fileName) ?? '');
      if (!entry) {
        throw new BadRequestException(`No se encontro la imagen ${fileName} en el ZIP.`);
      }
      const buffer = entry.getData();
      const uploadedImage = await this.cloudinary.uploadImage(
        {
          buffer,
          originalname: fileName,
          mimetype: getMimeTypeFromFileName(fileName),
          size: buffer.length,
        } as Express.Multer.File,
        CLOUDINARY_UPLOAD_FOLDERS.products,
      );
      uploaded.push(uploadedImage.secureUrl);
    }
    return uploaded;
  }

  private requiredText(value: unknown, field: string, row: number, errors: ProductImportIssue[]) {
    const text = normalizeText(value);
    if (!text)
      this.pushError(errors, row, field, `El campo ${this.getFieldLabel(field)} es obligatorio.`);
    return text;
  }

  private requiredInteger(
    value: unknown,
    field: string,
    row: number,
    errors: ProductImportIssue[],
  ) {
    const parsed = parseRequiredInteger(value);
    if (parsed === undefined) {
      this.pushError(errors, row, field, `El campo ${this.getFieldLabel(field)} debe ser entero.`);
    }
    return parsed ?? 0;
  }

  private requiredNumber(value: unknown, field: string, row: number, errors: ProductImportIssue[]) {
    const parsed = parseRequiredNumber(value);
    if (parsed === undefined) {
      this.pushError(
        errors,
        row,
        field,
        `El campo ${this.getFieldLabel(field)} debe ser numerico.`,
      );
    }
    return parsed ?? 0;
  }

  private optionalInteger(value: unknown) {
    return parseRequiredInteger(value);
  }

  private requiredBoolean(
    value: unknown,
    field: string,
    row: number,
    errors: ProductImportIssue[],
  ) {
    const parsed = parseImportBoolean(value);
    if (parsed === undefined) {
      this.pushError(
        errors,
        row,
        field,
        `El campo ${this.getFieldLabel(field)} debe ser SI/NO, true/false o 1/0.`,
      );
    }
    return parsed ?? false;
  }

  private requiredGpuChipset(
    value: unknown,
    field: string,
    row: number,
    errors: ProductImportIssue[],
  ) {
    const chipset = this.requiredText(value, field, row, errors);
    const allowed = ['NVIDIA GeForce', 'AMD Radeon', 'Intel Arc'];
    if (chipset && !allowed.some((option) => option.toLowerCase() === chipset.toLowerCase())) {
      this.pushError(
        errors,
        row,
        field,
        'El chipset debe ser NVIDIA GeForce, AMD Radeon o Intel Arc.',
      );
    }
    return allowed.find((option) => option.toLowerCase() === chipset.toLowerCase()) ?? chipset;
  }

  private requiredGpuVramType(
    value: unknown,
    field: string,
    row: number,
    errors: ProductImportIssue[],
  ) {
    const typeVram = this.requiredText(value, field, row, errors).toUpperCase();
    const allowed = ['GDDR6', 'GDDR6X', 'GDDR7'];
    if (typeVram && !allowed.includes(typeVram)) {
      this.pushError(errors, row, field, 'El tipo de VRAM debe ser GDDR6, GDDR6X o GDDR7.');
    }
    return typeVram;
  }

  private requiredSocket(value: unknown, field: string, row: number, errors: ProductImportIssue[]) {
    const socket = normalizeSocket(value);
    if (!socket || !isKnownSocket(socket)) {
      this.pushError(errors, row, field, `El socket ${normalizeText(value)} no es valido.`);
    }
    return socket;
  }

  private requiredSocketList(
    value: unknown,
    field: string,
    row: number,
    errors: ProductImportIssue[],
  ) {
    const sockets = normalizeSocketList(value);
    if (sockets.length === 0) {
      this.pushError(errors, row, field, `El campo ${field} debe incluir al menos un socket.`);
    }
    for (const socket of sockets) {
      if (!isKnownSocket(socket)) {
        this.pushError(errors, row, field, `El socket ${socket} no es valido.`);
      }
    }
    return sockets;
  }

  private pushError(errors: ProductImportIssue[], row: number, field: string, message: string) {
    errors.push({ row, field, message });
  }

  private getFieldLabel(field: string) {
    const labels: Record<string, string> = {
      sku: 'SKU del Producto',
      numeroparte: 'SKU del Producto',
      numeroParte: 'SKU del Producto',
      marca: 'Marca',
      marcaProcesador: 'Marca del procesador',
      descripcion: 'Descripcion',
      imagenPrincipal: 'Imagen principal',
      imagenesArchivos: 'Imagenes',
      tipoRam: 'Tipo de RAM',
      capacidadPorModulo: 'Capacidad por modulo',
      frecuencia: 'Frecuencia',
      modulos: 'Modulos',
      latencia: 'Latencia',
      tipoVram: 'Tipo de VRAM',
      fuenteRecomendada: 'Fuente recomendada',
      largoMm: 'Largo (mm)',
      ventiladores: 'Ventiladores',
      potenciaWatts: 'Potencia (Watts)',
      soportePlaca: 'Soporte de placa',
      largoGpuMax: 'Max largo GPU (mm)',
      alturaCoolerMax: 'Altura maxima de cooler (mm)',
      soporteRadiadorLiquido: 'Soporte radiador liquido',
      ventiladoresIncluidos: 'Ventiladores incluidos',
      pantallaLcd: 'Pantalla LCD',
      capacidadGB: 'Capacidad (GB)',
      generacion: 'Generacion',
      velocidadLecturaMBs: 'Velocidad lectura (MB/s)',
      velocidadEscrituraMBs: 'Velocidad escritura (MB/s)',
      tamanoFisicoM2: 'Tamano fisico M.2',
    };

    return labels[field] ?? field;
  }
}
