import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFiles,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtUserPayload } from '../auth/auth.constants';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Roles } from '../auth/roles.decorator';
import { Public } from '../auth/public.decorator';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { uploadToCloudinary } from '../utils/cloudinary.util';
import { MulterUploadExceptionFilter } from '../uploads/multer-upload-exception.filter';
import { PRODUCT_IMAGE_UPLOAD_OPTIONS } from '../uploads/multer-options';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Roles('ADMIN', 'EDITOR')
  @Post()
  @UseFilters(
    new MulterUploadExceptionFilter('La imagen supera el tamano maximo permitido de 2 MB.'),
  )
  @UseInterceptors(
    FilesInterceptor('images', 5, PRODUCT_IMAGE_UPLOAD_OPTIONS),
  )
  async create(
    @Body() body: CreateProductDto,
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Req() request: Request & { user: JwtUserPayload },
  ) {
    const imageUrls = files?.length
      ? await Promise.all(files.map((file) => uploadToCloudinary(file)))
      : [];

    const payload = {
      ...body,
      uploadedImages: imageUrls,
    };

    return this.productsService.create(payload, request.user.sub);
  }

  @Public()
  @Get()
  findAll(@Query() query: Record<string, string | string[]>) {
    return this.productsService.findAll(query);
  }

  @Public()
  @Get('filter-options')
  getFilterOptions(@Query() query: Record<string, string | string[]>) {
    return this.productsService.getFilterOptions(query);
  }

  @Public()
  @Get('related/:id')
  findRelated(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.findRelated(id);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.findOne(id);
  }

  @Roles('ADMIN', 'EDITOR')
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateProductDto,
    @Req() request: Request & { user: JwtUserPayload },
  ) {
    return this.productsService.update(id, body, request.user.sub);
  }

  @Roles('ADMIN')
  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: Request & { user: JwtUserPayload },
  ) {
    return this.productsService.remove(id, request.user.sub);
  }
}
