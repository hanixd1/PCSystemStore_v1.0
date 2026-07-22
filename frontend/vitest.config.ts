import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.{ts,tsx,js,mjs}', 'lib/**/*.test.{ts,tsx,js,mjs}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: [
        'lib/adminRouting.ts',
        'lib/normalizers.ts',
        'lib/pricing.ts',
        'lib/productPayload.ts',
      ],
    },
  },
});
