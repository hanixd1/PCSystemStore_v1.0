import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { UpdateProductDto } from './update-product.dto';

const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { enableImplicitConversion: true },
});
const validate = (body: unknown) =>
  pipe.transform(body, { type: 'body', metatype: UpdateProductDto });

describe('product image URLs', () => {
  it('acepta Cloudinary y las imagenes locales heredadas', async () => {
    await expect(
      validate({
        images: [
          'https://res.cloudinary.com/demo/image/upload/v1/pcsystemstore/products/a.webp',
          '/uploads/1776811530006-d9d61fa5.png',
        ],
      }),
    ).resolves.toBeDefined();
  });

  it.each(['javascript:alert(1)', '//evil.com/a.png', 'data:image/png;base64,AAAA', 'foto.png'])(
    'rechaza %s',
    async (image) => {
      await expect(validate({ images: [image] })).rejects.toBeInstanceOf(BadRequestException);
      await expect(validate({ image })).rejects.toBeInstanceOf(BadRequestException);
    },
  );
});
