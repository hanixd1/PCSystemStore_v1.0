import { ROLES_KEY, USER_ROLES } from '../../auth/auth.constants';
import { ProductImportController } from './product-import.controller';

describe('ProductImportController roles', () => {
  it('restringe preview y confirm solo a ADMIN', () => {
    expect(
      Reflect.getMetadata(ROLES_KEY, ProductImportController.prototype.downloadTemplate),
    ).toEqual(['ADMIN']);
    expect(Reflect.getMetadata(ROLES_KEY, ProductImportController.prototype.preview)).toEqual([
      'ADMIN',
    ]);
    expect(Reflect.getMetadata(ROLES_KEY, ProductImportController.prototype.confirm)).toEqual([
      'ADMIN',
    ]);
  });

  it('expone solo los roles finales del sistema', () => {
    expect(USER_ROLES).toEqual(['ADMIN', 'EDITOR', 'CUSTOMER']);
  });
});
