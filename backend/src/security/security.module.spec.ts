import { Test } from '@nestjs/testing';
import { PasswordResetService } from '../users/services/password-reset.service';
import { UsersModule } from '../users/users.module';
import { PrismaService } from '../prisma/prisma.service';
import { SecurityModule } from './security.module';
import { SecurityRateLimitStorage } from './security-rate-limit.storage';

describe('SecurityModule dependency injection', () => {
  it('compila el consumidor PasswordResetService y comparte una unica instancia del storage', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SecurityModule, UsersModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();

    const storage = moduleRef.get(SecurityRateLimitStorage);
    const reset = moduleRef.get(PasswordResetService);

    expect(storage).toBeDefined();
    expect((reset as any).accountRateLimit).toBe(storage);
    await moduleRef.close();
  });
});
