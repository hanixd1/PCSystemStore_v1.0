import * as bcrypt from 'bcrypt';
import { PasswordHashingService } from './password-hashing.service';

describe('PasswordHashingService', () => {
  const service = new PasswordHashingService();

  it('genera hashes Argon2id distintos para la misma contrasena', async () => {
    const first = await service.hashPassword('frase de paso suficientemente larga');
    const second = await service.hashPassword('frase de paso suficientemente larga');

    expect(first).toMatch(/^\$argon2id\$/);
    expect(second).toMatch(/^\$argon2id\$/);
    expect(first).not.toBe(second);
  });

  it('valida la contrasena correcta y rechaza una incorrecta', async () => {
    const hash = await service.hashPassword('frase de paso suficientemente larga');

    await expect(service.verifyPassword(hash, 'frase de paso suficientemente larga')).resolves.toBe(
      true,
    );
    await expect(service.verifyPassword(hash, 'otra frase incorrecta')).resolves.toBe(false);
  });

  it('mantiene compatibilidad de lectura con bcrypt y exige rehash', async () => {
    const hash = await bcrypt.hash('contrasena heredada', 10);

    expect(service.isLegacyBcryptHash(hash)).toBe(true);
    expect(service.needsRehash(hash)).toBe(true);
    await expect(service.verifyPassword(hash, 'contrasena heredada')).resolves.toBe(true);
  });

  it('rechaza hashes desconocidos sin lanzar detalles criptograficos', async () => {
    await expect(service.verifyPassword('texto-no-valido', 'secreto')).resolves.toBe(false);
  });
});
