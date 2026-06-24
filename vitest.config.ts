import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'server/domain/**/*.test.ts',
      'server/application/**/*.test.ts',
      'server/**/*.test.ts',
    ],
  },
});
