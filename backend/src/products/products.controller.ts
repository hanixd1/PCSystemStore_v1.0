import { Controller, Post, Body, Get, Param, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ProductsService } from './products.service';
import { uploadToCloudinary } from '../utils/cloudinary.util';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @UseInterceptors(FilesInterceptor('images', 5, { storage: memoryStorage() }))
  async create(@Body() body: any, @UploadedFiles() files: Array<Express.Multer.File>) {
    
    // AQUÍ ESTÁ EL CAMBIO: Le decimos explícitamente que es un array de strings
    const imageUrls: string[] = []; 

    if (files && files.length > 0) {
      for (const file of files) {
        const url = await uploadToCloudinary(file);
        imageUrls.push(url); // ¡El error desaparece!
      }
    }

    body.uploadedImages = imageUrls;

    return this.productsService.create(body);
  }

  @Get()
  findAll() {
    return this.productsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }
}