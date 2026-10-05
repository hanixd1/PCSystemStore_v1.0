import { Controller, Get, Header, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Public } from './public.decorator';
import { CsrfTokenService } from './csrf-token.service';

@Controller('auth')
export class CsrfController {
  constructor(private readonly csrf: CsrfTokenService) {}

  @Public()
  @Get('csrf-token')
  @Header('Cache-Control', 'no-store')
  getToken(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    return { csrfToken: this.csrf.ensure(request, response) };
  }
}
