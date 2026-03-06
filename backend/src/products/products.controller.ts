import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  UseInterceptors, // <--- FALTABA ESTE
  UploadedFiles    // <--- FALTABA ESTE
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { FilesInterceptor } from '@nestjs/platform-express';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @UseInterceptors(FilesInterceptor('images')) // Ahora sí funcionará
  create(@Body() createProductDto: any, @UploadedFiles() files: Array<Express.Multer.File>) {
    
    // Si subieron archivos, creamos URLs falsas (o reales si configuras S3/Cloudinary)
    const imageUrls = files ? files.map(f => `https://fake-cloud.com/${f.originalname}`) : [];
    
    // Si el usuario mandó URLs de texto manuales, aquí podríamos combinarlas
    // Por ahora, le damos prioridad a los archivos subidos si existen
    
    // Pasamos todo al servicio
    return this.productsService.create({ 
      ...createProductDto, 
      uploadedImages: imageUrls 
    });
  }

  @Get()
  findAll() {
    return this.productsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProductDto: any) {
    return this.productsService.update(id, updateProductDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}