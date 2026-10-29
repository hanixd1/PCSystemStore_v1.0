/** Header the ai-service checks on every /chat and /forecast request (server to server only). */
export const INTERNAL_API_KEY_HEADER = 'X-Internal-API-Key';

export function getAiServiceUrl(): string {
  return process.env.AI_SERVICE_URL?.trim().replace(/\/$/, '') || '';
}

/** JSON headers plus the shared secret, when configured (INTERNAL_API_KEY, same value on both sides). */
export function buildAiServiceHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  const apiKey = process.env.INTERNAL_API_KEY?.trim();
  if (apiKey) {
    headers[INTERNAL_API_KEY_HEADER] = apiKey;
  }
  return headers;
}
