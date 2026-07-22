import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Public } from './public.decorator';
import { CsrfTokenService } from './csrf-token.service';

@Controller('auth')
export class CsrfController {
  constructor(private readonly csrf: CsrfTokenService) {}

  @Public()
  @Get('csrf-token')
  getToken(@Res({ passthrough: true }) response: Response) {
    return { csrfToken: this.csrf.issue(response) };
  }
}
