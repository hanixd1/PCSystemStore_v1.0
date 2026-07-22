import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';
import { normalizePostgresConnectionString } from './src/prisma/database-url';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: normalizePostgresConnectionString(env('DIRECT_URL'), 'DIRECT_URL'),
  },
});
