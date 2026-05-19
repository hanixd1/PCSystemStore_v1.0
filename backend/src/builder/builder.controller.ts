import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { BuilderService } from './builder.service';
import { ValidateBuildDto } from './dto/validate-build.dto';

@Public()
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

  @Post('validate')
  validateBuild(@Body() body: ValidateBuildDto) {
    return this.builderService.validateBuild(body.items);
  }
}
