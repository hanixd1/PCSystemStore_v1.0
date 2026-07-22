import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProductSlugService {
  constructor(private readonly prisma: PrismaService = undefined as never) {}

  buildSlug(name: string): string {
    const normalized = String(name || '')
      .toLowerCase()
      .trim()
      .normalize('NFD');
    const slugChars: string[] = [];
    let previousWasSeparator = false;

    for (const char of normalized) {
      const code = char.codePointAt(0);
      if (code === undefined) {
        continue;
      }
      if (this.isCombiningMark(code)) {
        continue;
      }

      if (this.isSlugAllowedCharacter(code)) {
        slugChars.push(char);
        previousWasSeparator = false;
        continue;
      }

      if (char !== '.' && !previousWasSeparator && slugChars.length > 0) {
        slugChars.push('-');
        previousWasSeparator = true;
      }
    }

    const baseSlug = slugChars.join('').split('-').filter(Boolean).join('-');
    return (baseSlug || 'producto').slice(0, 120).replace(/-+$/g, '') || 'producto';
  }

  async buildUniqueSlug(name: string, currentProductId?: string): Promise<string> {
    const baseSlug = this.buildSlug(name);

    for (let suffix = 0; suffix < 1000; suffix += 1) {
      const suffixText = suffix === 0 ? '' : `-${suffix + 1}`;
      const candidateBase = baseSlug.slice(0, 120 - suffixText.length).replace(/-+$/g, '');
      const candidate = `${candidateBase || 'producto'}${suffixText}`;
      const existingProduct = await this.prisma.product.findUnique({ where: { slug: candidate } });

      if (!existingProduct || existingProduct.id === currentProductId) {
        return candidate;
      }
    }

    throw new BadRequestException('No se pudo generar un slug unico para este producto.');
  }

  private isCombiningMark(code: number): boolean {
    return code >= 0x0300 && code <= 0x036f;
  }

  private isSlugAllowedCharacter(code: number): boolean {
    return (code >= 97 && code <= 122) || (code >= 48 && code <= 57);
  }
}
