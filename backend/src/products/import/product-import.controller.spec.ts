import { ROLES_KEY, USER_ROLES } from '../../auth/auth.constants';
import { ProductImportController } from './product-import.controller';

describe('ProductImportController roles', () => {
  it('restringe preview y confirm solo a ADMIN', () => {
    // Reflect metadata intentionally receives decorated method references.
    /* eslint-disable @typescript-eslint/unbound-method */
    expect(
      Reflect.getMetadata(ROLES_KEY, ProductImportController.prototype.downloadTemplate),
    ).toEqual(['ADMIN']);
    expect(Reflect.getMetadata(ROLES_KEY, ProductImportController.prototype.preview)).toEqual([
      'ADMIN',
    ]);
    expect(Reflect.getMetadata(ROLES_KEY, ProductImportController.prototype.confirm)).toEqual([
      'ADMIN',
    ]);
    /* eslint-enable @typescript-eslint/unbound-method */
  });

  it('expone solo los roles finales del sistema', () => {
    expect(USER_ROLES).toEqual(['ADMIN', 'EDITOR', 'CUSTOMER']);
  });
});
