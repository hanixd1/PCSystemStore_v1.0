import {
  buildAiServiceHeaders,
  getAiServiceUrl,
  INTERNAL_API_KEY_HEADER,
} from './ai-service-request';

describe('ai-service request helpers', () => {
  const original = { url: process.env.AI_SERVICE_URL, key: process.env.INTERNAL_API_KEY };

  afterEach(() => {
    process.env.AI_SERVICE_URL = original.url;
    process.env.INTERNAL_API_KEY = original.key;
    if (original.url === undefined) {
      delete process.env.AI_SERVICE_URL;
    }
    if (original.key === undefined) {
      delete process.env.INTERNAL_API_KEY;
    }
  });

  it('quita la barra final de AI_SERVICE_URL', () => {
    process.env.AI_SERVICE_URL = ' http://ai.test/ ';
    expect(getAiServiceUrl()).toBe('http://ai.test');
  });

  it('envia la clave interna compartida cuando esta configurada', () => {
    process.env.INTERNAL_API_KEY = ' secreto ';
    expect(buildAiServiceHeaders()).toEqual({
      Accept: 'application/json',
      'Content-Type': 'application/json',
      [INTERNAL_API_KEY_HEADER]: 'secreto',
    });
  });

  it('no envia la cabecera sin clave configurada', () => {
    delete process.env.INTERNAL_API_KEY;
    expect(buildAiServiceHeaders()).not.toHaveProperty(INTERNAL_API_KEY_HEADER);
  });
});
