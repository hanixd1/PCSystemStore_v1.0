import { BadRequestException, Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import * as bcrypt from 'bcrypt';
import { getPositiveInteger, SECURITY_DEFAULTS } from '../security/security.config';

const BCRYPT_PATTERN = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;
const ARGON2ID_PATTERN = /^\$argon2id\$v=\d+\$m=(\d+),t=(\d+),p=(\d+)\$/;
const DUMMY_BCRYPT_HASH = '$2b$12$igWRVVarwUOVxG7cc2RxZO0z2U/5P2LcT5HiAjDif.upVBlMtvqkW';

@Injectable()
export class PasswordHashingService {
  async hashPassword(password: string): Promise<string> {
    this.assertLength(password, 1);
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: this.memoryCost,
      timeCost: this.timeCost,
      parallelism: this.parallelism,
    });
  }

  async verifyPassword(hash: string, password: string): Promise<boolean> {
    if (!password || password.length > 128) {
      return false;
    }
    try {
      if (hash.startsWith('$argon2id$')) {
        return await argon2.verify(hash, password);
      }
      if (this.isLegacyBcryptHash(hash)) {
        return await bcrypt.compare(password, hash);
      }
      return false;
    } catch {
      return false;
    }
  }

  needsRehash(hash: string): boolean {
    if (this.isLegacyBcryptHash(hash)) {
      return true;
    }
    const match = hash.match(ARGON2ID_PATTERN);
    if (!match) {
      return true;
    }
    const [, memory, time, parallelism] = match;
    return (
      Number(memory) < this.memoryCost ||
      Number(time) < this.timeCost ||
      Number(parallelism) < this.parallelism
    );
  }

  isLegacyBcryptHash(hash: string): boolean {
    return BCRYPT_PATTERN.test(hash);
  }

  async simulateVerification(password: string): Promise<void> {
    await bcrypt.compare(password.slice(0, 128), DUMMY_BCRYPT_HASH);
  }

  assertPasswordPolicy(password: string, administrative = false): void {
    this.assertLength(password, administrative ? 12 : 8);
  }

  private assertLength(password: string, minimum: number): void {
    if (password.length < minimum || password.length > 128) {
      throw new BadRequestException(
        `La contrasena debe tener entre ${minimum} y 128 caracteres y no sera truncada.`,
      );
    }
  }

  private get memoryCost(): number {
    return getPositiveInteger(
      'ARGON2_MEMORY_COST',
      SECURITY_DEFAULTS.argon2MemoryCost,
      SECURITY_DEFAULTS.argon2MemoryCost,
    );
  }

  private get timeCost(): number {
    return getPositiveInteger(
      'ARGON2_TIME_COST',
      SECURITY_DEFAULTS.argon2TimeCost,
      SECURITY_DEFAULTS.argon2TimeCost,
    );
  }

  private get parallelism(): number {
    return getPositiveInteger(
      'ARGON2_PARALLELISM',
      SECURITY_DEFAULTS.argon2Parallelism,
      SECURITY_DEFAULTS.argon2Parallelism,
    );
  }
}
