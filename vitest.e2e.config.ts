import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'e2e',
    watch: false,
    environment: 'node',
    include: ['e2e/**/*.e2e.ts'],
    setupFiles: ['e2e/setup.ts'],
    // Each file starts the playground in a terminal. One file at a time keeps the timing
    // independent of CPU load.
    fileParallelism: false,
    testTimeout: 120_000,
    hookTimeout: 60_000,
    reporters: ['default'],
  },
});
