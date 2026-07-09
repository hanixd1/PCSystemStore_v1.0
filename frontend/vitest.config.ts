import { defineConfig } from 'vitest/config';

export default defineConfig({
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
