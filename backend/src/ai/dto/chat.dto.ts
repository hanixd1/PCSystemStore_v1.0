import { IsArray, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class ChatDto {
  @IsString()
  @MaxLength(500)
  message: string;

  @IsOptional()
  @IsArray()
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;

  @IsOptional()
  @IsObject()
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
}
