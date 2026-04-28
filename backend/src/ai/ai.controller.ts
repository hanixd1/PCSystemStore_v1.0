import { Controller, Post, Body, Get } from '@nestjs/common';
import { AiService } from './ai.service';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  // =========================================================
  // 1. ENDPOINT PARA EL CHATBOT DEL CLIENTE (Frontend)
  // =========================================================
  @Post('chat')
  async chat(
    @Body()
    body: {
      message: string;
      history?: Array<{ role: 'user' | 'assistant'; content: string }>;
    },
  ): Promise<unknown> {
    return this.aiService.processCustomerChat(body.message, body.history ?? []);
  }

  // =========================================================
  // 2. ENDPOINT PARA LAS ALERTAS DEL ADMINISTRADOR (Panel)
  // =========================================================
  @Get('predictions')
  async getPredictions(): Promise<unknown> {
    return this.aiService.getAiPredictions();
  }
}
