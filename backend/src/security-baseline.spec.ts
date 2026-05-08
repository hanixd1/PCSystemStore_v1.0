import { readFileSync } from 'fs';
import { join } from 'path';

describe('Security baseline documental', () => {
  it('SEC-06 .env.example no debe exponer placeholders con secretos reales evidentes', () => {
    const envExample = readFileSync(join(process.cwd(), '.env.example'), 'utf8');
    const riskyPatterns = [
      /password\s*=\s*[^<\s]*[A-Za-z0-9]{12,}/i,
      /secret\s*=\s*[^<\s]*[A-Za-z0-9]{24,}/i,
      /api[_-]?key\s*=\s*[^<\s]*[A-Za-z0-9]{24,}/i,
    ];

    for (const pattern of riskyPatterns) {
      expect(envExample).not.toMatch(pattern);
    }
  });
});
