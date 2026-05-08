import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { AiPythonRunnerService } from './services/ai-python-runner.service';

@Module({
  controllers: [AiController],
  providers: [AiService, AiPythonRunnerService],
})
export class AiModule {}
