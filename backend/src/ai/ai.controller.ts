import { Controller, Post, Body, Get } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { Roles } from '../auth/roles.decorator';
import { AiService } from './ai.service';
import { ChatDto } from './dto/chat.dto';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  // =========================================================
  // 1. ENDPOINT PARA EL CHATBOT DEL CLIENTE (Frontend)
  // =========================================================
  @Public()
  @Post('chat')
  async chat(@Body() body: ChatDto): Promise<unknown> {
    return this.aiService.processCustomerChat(
      body.message,
      body.history ?? [],
      body.conversationState as any,
    );
  }

  // =========================================================
  // 2. ENDPOINT PARA LAS ALERTAS DEL ADMINISTRADOR (Panel)
  // =========================================================
  @Roles('ADMIN', 'EDITOR')
  @Get('predictions')
  async getPredictions(): Promise<unknown> {
    return this.aiService.getAiPredictions();
  }
}
