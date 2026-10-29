import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { CHAT_LIMITS, ChatDto } from './chat.dto';

// Same options as main.ts.
const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { enableImplicitConversion: true },
});
const validate = (body: unknown) =>
  pipe.transform(body, { type: 'body', metatype: ChatDto }) as Promise<ChatDto>;

const product = {
  id: 'p1',
  name: 'RTX 5060',
  category: 'GPU',
  price: 1650,
  stock: 3,
  imageUrl: null,
  productUrl: '/producto/rtx-5060',
};

describe('ChatDto', () => {
  it('acepta el estado que devuelve el ai-service y descarta campos desconocidos', async () => {
    const dto = await validate({
      message: 'y mas barato?',
      history: [{ role: 'user', content: 'hola' }],
      conversationState: {
        intent: 'product_search',
        lastSearchQuery: 'rtx',
        lastRecommendedProducts: [{ ...product, slug: 'nuevo-campo' }],
        futureField: 'ignorado',
      },
    });

    expect(dto.conversationState).not.toHaveProperty('futureField');
    expect(dto.conversationState?.lastRecommendedProducts?.[0]).not.toHaveProperty('slug');
    expect(dto.conversationState?.lastSearchQuery).toBe('rtx');
  });

  it.each([
    ['lastSearchQuery gigante', { lastSearchQuery: 'x'.repeat(500_000) }],
    ['productos como objeto', { lastRecommendedProducts: {} }],
    [
      'demasiados productos',
      { lastRecommendedProducts: Array.from({ length: CHAT_LIMITS.products + 1 }, () => product) },
    ],
    ['producto sin forma', { lastRecommendedBuild: [{ id: 1 }] }],
    ['intent inventado', { intent: 'drop_tables' }],
  ])('rechaza %s', async (_label, conversationState) => {
    await expect(validate({ message: 'hola', conversationState })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('limita el historial', async () => {
    const history = Array.from({ length: CHAT_LIMITS.history + 1 }, () => ({
      role: 'user',
      content: 'hola',
    }));
    await expect(validate({ message: 'hola', history })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(
      validate({ message: 'hola', history: [{ role: 'system', content: 'x' }] }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
