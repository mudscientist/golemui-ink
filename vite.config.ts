/// <reference types='vitest' />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig(() => ({
  plugins: [
    react(),
    dts({
      entryRoot: 'src',
      tsconfigPath: './tsconfig.lib.json',
      pathsToAliases: false,
    }),
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    reportCompressedSize: true,
    lib: {
      entry: 'src/index.ts',
      name: 'golemui-ink',
      fileName: 'index',
      // No terminal host loads UMD, and the UMD output would copy node builtins into the bundle.
      formats: ['es' as const],
    },
    rollupOptions: {
      // No "use client" banner: this bundle never runs in a React Server Components host.
      external: [
        'react',
        'react/jsx-runtime',
        'ink',
        '@golemui/core',
        '@golemui/react',
        '@golemui/gui-shared',
        '@golemui/gui-validators',
        /^@golemui\/gui-shared\/.+/,
        // Vite builds a library for a browser by default and would replace a node builtin with a
        // stub that throws at import time.
        /^node:/,
      ],
    },
  },
  test: {
    name: 'golemui-ink',
    // Ink asks chalk whether the terminal has colors. Some runners set FORCE_COLOR and others do
    // not, so it is set here to get the same frames under all of them.
    env: { FORCE_COLOR: '1' },
    watch: false,
    passWithNoTests: true,
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
  },
}));
