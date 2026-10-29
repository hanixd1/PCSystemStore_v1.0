import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

/**
 * POST /ai/chat is public: every nested field is bounded, so the 1 MB body limit cannot be
 * spent on a giant `lastSearchQuery` or product list that the backend would then rank and
 * forward to the ai-service. Limits follow what the ai-service itself produces.
 */
export const CHAT_LIMITS = {
  message: 500,
  history: 20,
  historyContent: 2000,
  text: 500,
  id: 100,
  productName: 300,
  url: 2048,
  products: 20,
} as const;

const CHAT_INTENTS = [
  'product_search',
  'pc_build',
  'budget_pc_build',
  'cart_action',
  'total_query',
  'checkout_guidance',
  'support',
  'unknown',
] as const;

const STORED_PRODUCT_KEYS = [
  'id',
  'name',
  'category',
  'price',
  'stock',
  'imageUrl',
  'productUrl',
] as const;
const STATE_KEYS = [
  'intent',
  'budget',
  'usage',
  'includesPeripherals',
  'mentionedProducts',
  'lastRecommendedProducts',
  'lastRecommendedBuild',
  'lastFocusedProductId',
  'awaiting',
  'lastSearchQuery',
  'anchorProductId',
] as const;

function pick(value: unknown, keys: readonly string[]): Record<string, unknown> | unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return value;
  }
  const source = value as Record<string, unknown>;
  return Object.fromEntries(keys.filter((key) => key in source).map((key) => [key, source[key]]));
}

/**
 * The client echoes back the state the ai-service returned. Fields the API does not know
 * (a newer ai-service, an old browser tab) are dropped instead of failing the whole chat;
 * everything kept is then validated strictly.
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

// Instances are built by hand so the nested validators see the values exactly as sent.
function toKnownProducts(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) =>
        isPlainObject(item)
          ? Object.assign(new ChatStoredProductDto(), pick(item, STORED_PRODUCT_KEYS))
          : item,
      )
    : value;
}

// Reads the raw request value (`obj[key]`): `value` arrives already coerced with the reflected
// types (implicit conversion), which would hide a malformed state.
function toKnownState({ obj, key }: { obj: Record<string, unknown>; key: string }) {
  const value = obj[key];
  if (!isPlainObject(value)) {
    return value;
  }
  const state = pick(value, STATE_KEYS) as Record<string, unknown>;
  for (const key of ['lastRecommendedProducts', 'lastRecommendedBuild']) {
    if (key in state) {
      state[key] = toKnownProducts(state[key]);
    }
  }
  return Object.assign(new ChatConversationStateDto(), state);
}

export class ChatHistoryItemDto {
  @IsIn(['user', 'assistant'])
  role!: 'user' | 'assistant';

  @IsString()
  @MaxLength(CHAT_LIMITS.historyContent)
  content!: string;
}

export class ChatStoredProductDto {
  @IsString()
  @MaxLength(CHAT_LIMITS.id)
  id!: string;

  @IsString()
  @MaxLength(CHAT_LIMITS.productName)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  category?: string | null;

  @IsNumber()
  @Min(0)
  @Max(1_000_000)
  price!: number;

  @IsInt()
  @Min(0)
  stock!: number;

  @IsOptional()
  @IsString()
  @MaxLength(CHAT_LIMITS.url)
  imageUrl?: string | null;

  @IsString()
  @MaxLength(CHAT_LIMITS.url)
  productUrl!: string;
}

export class ChatConversationStateDto {
  @IsOptional()
  @IsIn(CHAT_INTENTS)
  intent?: (typeof CHAT_INTENTS)[number] | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1_000_000)
  budget?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  usage?: string | null;

  @IsOptional()
  @IsBoolean()
  includesPeripherals?: boolean | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(CHAT_LIMITS.products)
  @IsString({ each: true })
  @MaxLength(CHAT_LIMITS.productName, { each: true })
  mentionedProducts?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(CHAT_LIMITS.products)
  @ValidateNested({ each: true })
  lastRecommendedProducts?: ChatStoredProductDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(CHAT_LIMITS.products)
  @ValidateNested({ each: true })
  lastRecommendedBuild?: ChatStoredProductDto[];

  @IsOptional()
  @IsString()
  @MaxLength(CHAT_LIMITS.id)
  lastFocusedProductId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  awaiting?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(CHAT_LIMITS.text)
  lastSearchQuery?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(CHAT_LIMITS.id)
  anchorProductId?: string | null;
}

export class ChatDto {
  @IsString()
  @MaxLength(CHAT_LIMITS.message)
  message: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(CHAT_LIMITS.history)
  @ValidateNested({ each: true })
  @Type(() => ChatHistoryItemDto)
  history?: ChatHistoryItemDto[];

  @IsOptional()
  @Transform(toKnownState)
  @IsObject()
  @ValidateNested()
  conversationState?: ChatConversationStateDto;
}
