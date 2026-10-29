import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { UpdateStockAlertStateDto } from './update-stock-alert-state.dto';

const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
const validate = (body: unknown) =>
  pipe.transform(body, { type: 'body', metatype: UpdateStockAlertStateDto });
const valid = {
  productId: '1baee1e0-0f69-485d-b4f0-bb52a504aa58',
  alertType: 'LOW_STOCK',
  action: 'REVIEWED',
  note: 'Pedido al proveedor',
};

describe('UpdateStockAlertStateDto', () => {
  it('acepta una revision valida', async () => {
    await expect(validate(valid)).resolves.toMatchObject(valid);
  });

  it.each([
    { note: 'x'.repeat(501) },
    { productId: 'no-uuid' },
    { alertType: 'PREDICTIVE_RISK' },
    { action: 'DELETE' },
    { extra: true },
  ])('rechaza %j', async (override) => {
    await expect(validate({ ...valid, ...override })).rejects.toBeInstanceOf(BadRequestException);
  });
});
