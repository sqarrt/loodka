import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    testTimeout: 15000,
    // Все тесты — интеграционные и бьют в один локальный стек Supabase.
    // Параллельный запуск файлов гонял admin.auth.admin.createUser() и
    // изредка ловил null user из-за состязания в GoTrue/Postgres.
    fileParallelism: false,
  },
});
