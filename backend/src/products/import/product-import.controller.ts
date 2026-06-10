import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UploadedFiles,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Request, Response } from 'express';
import { Roles } from '../../auth/roles.decorator';
import { JwtUserPayload } from '../../auth/auth.constants';
import { MulterUploadExceptionFilter } from '../../uploads/multer-upload-exception.filter';
import { ProductImportService } from './product-import.service';
import { ProductTemplateService } from './product-template.service';
import type { ProductImportBody } from './product-import.types';

const IMPORT_UPLOAD_OPTIONS = {
  storage: memoryStorage(),
  limits: {
    fileSize: 200 * 1024 * 1024,
    files: 2,
    fields: 8,
    parts: 12,
    fieldSize: 1024 * 1024,
  },
  fileFilter: (
    _req: Request,
    file: Express.Multer.File,
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    if (file.fieldname === 'excel' && /\.xlsx$/i.test(file.originalname)) {
      callback(null, true);
      return;
    }

    if (file.fieldname === 'imagesZip' && /\.zip$/i.test(file.originalname)) {
      callback(null, true);
      return;
    }

    callback(new Error('Solo se acepta un Excel .xlsx y un ZIP .zip de imagenes.'), false);
  },
};

@Controller('products/import')
export class ProductImportController {
  constructor(
    private readonly productImportService: ProductImportService,
    private readonly productTemplateService: ProductTemplateService,
  ) {}

  @Roles('ADMIN')
  @Get('template')
  async downloadTemplate(
    @Query() query: ProductImportBody,
    @Res({ passthrough: false }) response: Response,
  ): Promise<void> {
    const template = this.productTemplateService.generateTemplate(query);
    response.status(200);
    response.setHeader('Content-Type', template.contentType);
    response.setHeader('Content-Disposition', `attachment; filename="${template.filename}"`);
    response.setHeader('Content-Length', String(template.buffer.length));
    response.send(template.buffer);
  }

  @Roles('ADMIN')
  @Post('preview')
  @UseFilters(new MulterUploadExceptionFilter('Archivo de importacion invalido.'))
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'excel', maxCount: 1 },
        { name: 'imagesZip', maxCount: 1 },
      ],
      IMPORT_UPLOAD_OPTIONS,
    ),
  )
  preview(
    @Body() body: ProductImportBody,
    @UploadedFiles() files: { excel?: Express.Multer.File[]; imagesZip?: Express.Multer.File[] },
    @Req() request: Request & { user: JwtUserPayload },
  ) {
    return this.productImportService.preview(body, files, request.user.sub);
  }

  @Roles('ADMIN')
  @Post('confirm')
  @UseFilters(new MulterUploadExceptionFilter('Archivo de importacion invalido.'))
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'excel', maxCount: 1 },
        { name: 'imagesZip', maxCount: 1 },
      ],
      IMPORT_UPLOAD_OPTIONS,
    ),
  )
  confirm(
    @Body() body: ProductImportBody,
    @UploadedFiles() files: { excel?: Express.Multer.File[]; imagesZip?: Express.Multer.File[] },
    @Req() request: Request & { user: JwtUserPayload },
  ) {
    return this.productImportService.confirm(body, files, request.user.sub);
  }
}
