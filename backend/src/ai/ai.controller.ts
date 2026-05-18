import { Controller, Post, Body, Get } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { Roles } from '../auth/roles.decorator';
import { AiService } from './ai.service';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  // =========================================================
  // 1. ENDPOINT PARA EL CHATBOT DEL CLIENTE (Frontend)
  // =========================================================
  @Public()
  @Post('chat')
  async chat(
    @Body()
    body: {
      message: string;
      history?: Array<{ role: 'user' | 'assistant'; content: string }>;
      conversationState?: {
        intent?: string | null;
        budget?: number | null;
        usage?: string | null;
        includesPeripherals?: boolean | null;
        mentionedProducts?: string[];
        lastRecommendedProducts?: unknown[];
        lastRecommendedBuild?: unknown[];
        lastFocusedProductId?: string | null;
        awaiting?: string | null;
      };
    },
  ): Promise<unknown> {
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
