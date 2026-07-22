import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './auth/public.decorator';
import { SkipThrottle } from '@nestjs/throttler';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @SkipThrottle()
  @Get()
  getHello() {
    return this.appService.getHello();
  }

  @Public()
  @SkipThrottle()
  @Get('health')
  getHealth() {
    return this.appService.getHealth();
  }

  @Public()
  @SkipThrottle()
  @Get('health/db')
  getDatabaseHealth() {
    return this.appService.getDatabaseHealth();
  }

  @Public()
  @SkipThrottle()
  @Get('ready')
  getReadiness() {
    return this.appService.getDatabaseHealth();
  }
}
