import { BadRequestException } from '@nestjs/common';
import { CLOUDINARY_UPLOAD_FOLDERS, CloudinaryService } from './cloudinary.service';

const PRODUCTS = CLOUDINARY_UPLOAD_FOLDERS.products;
import { assertImageSignature } from './image-file.filter';

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]);
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBPVP8 ')]);

describe('assertImageSignature', () => {
  it.each([
    ['image/png', PNG],
    ['image/jpeg', JPEG],
    ['image/webp', WEBP],
  ])('acepta un %s real', (mimetype, buffer) => {
    expect(() => assertImageSignature({ mimetype, buffer })).not.toThrow();
  });

  it.each([
    ['image/png', Buffer.from('<svg onload="alert(1)">')],
    ['image/jpeg', PNG],
    ['image/gif', Buffer.from('GIF89a')],
  ])('rechaza un archivo que no es lo que declara (%s)', (mimetype, buffer) => {
    expect(() => assertImageSignature({ mimetype, buffer })).toThrow(BadRequestException);
  });
});

describe('CloudinaryService cleanup', () => {
  const original = process.env.CLOUDINARY_CLOUD_NAME;
  beforeEach(() => {
    process.env.CLOUDINARY_CLOUD_NAME = 'demo';
  });
  afterEach(() => {
    process.env.CLOUDINARY_CLOUD_NAME = original;
  });

  const base = 'https://res.cloudinary.com/demo/image/upload';

  it('solo reconoce imagenes subidas por la app en la carpeta del modulo', () => {
    const service = new CloudinaryService();
    expect(
      service.getOwnedPublicId(`${base}/v1712/pcsystemstore/products/abc123.webp`, PRODUCTS),
    ).toBe('pcsystemstore/products/abc123');
    expect(service.getOwnedPublicId(`${base}/pcsystemstore/products/abc123.jpg`, PRODUCTS)).toBe(
      'pcsystemstore/products/abc123',
    );
  });

  it.each([
    ['otra carpeta de la app', `${base}/v1/pcsystemstore/banners/abc.jpg`],
    ['comprobante de pago', `${base}/v1/pcsystemstore/payments/abc.jpg`],
    ['traversal codificado', `${base}/v1/pcsystemstore/products/%2e%2e/branding/logo.png`],
    ['traversal literal', `${base}/v1/pcsystemstore/products/../branding/logo.png`],
    ['doble barra', `${base}/v1/pcsystemstore/products//logo.png`],
    ['subcarpeta', `${base}/v1/pcsystemstore/products/x/abc.png`],
    ['transformacion', `${base}/c_fill,w_10/v1/pcsystemstore/products/abc.png`],
    ['query', `${base}/v1/pcsystemstore/products/abc.png?x=1`],
    ['carpeta ajena', `${base}/v1/otro/abc.jpg`],
    ['otra cuenta', 'https://res.cloudinary.com/otra/image/upload/v1/pcsystemstore/products/a.jpg'],
    ['ruta local', '/uploads/local.png'],
  ])('rechaza %s', (_label, url) => {
    expect(new CloudinaryService().getOwnedPublicId(url, PRODUCTS)).toBeNull();
  });

  it('borra solo las propias y no falla si Cloudinary falla', async () => {
    const service = new CloudinaryService();
    const deleteImage = jest
      .spyOn(service, 'deleteImage')
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValue(undefined);

    await expect(
      service.deleteImagesByUrl(
        [
          `${base}/v1/pcsystemstore/banners/a.jpg`,
          `${base}/v2/pcsystemstore/banners/b.jpg`,
          `${base}/v2/pcsystemstore/branding/logo.jpg`,
          'https://cdn.example.com/c.jpg',
          null,
        ],
        CLOUDINARY_UPLOAD_FOLDERS.banners,
      ),
    ).resolves.toBeUndefined();
    expect(deleteImage).toHaveBeenCalledTimes(2);
  });
});
