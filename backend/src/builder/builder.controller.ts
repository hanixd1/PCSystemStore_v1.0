// src/builder/builder.controller.ts
import { Controller, Get, Query } from '@nestjs/common';
import { BuilderService } from './builder.service';

@Controller('builder')
export class BuilderController {
  constructor(private readonly builderService: BuilderService) {}

  @Get('motherboards')
  getMotherboards(@Query('cpuId') cpuId?: string) {
    return this.builderService.getCompatibleMotherboards(cpuId);
  }

  @Get('rams')
  getRams(@Query('motherboardId') motherboardId?: string) {
    return this.builderService.getCompatibleRam(motherboardId);
  }
  
  @Get('cpus')
  getCpus() {
    return this.builderService.getCpus();
  }
}