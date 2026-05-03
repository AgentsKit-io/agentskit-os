import { defineConfig } from 'tsup'

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/checkpoint-store-suite.ts',
    'src/batch-store-suite.ts',
    'src/event-bus-suite.ts',
  ],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  splitting: false,
  target: 'es2022',
  external: [
    'vitest',
    'zod',
    '@agentskit/os-core',
    '@agentskit/os-flow',
    '@agentskit/os-audit',
  ],
})
