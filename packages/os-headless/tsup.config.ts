import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/runner.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  splitting: false,
  target: 'es2022',
  external: [
    'zod',
    '@agentskit/os-core',
    '@agentskit/os-flow',
    '@agentskit/os-runtime',
    '@agentskit/os-storage',
    '@agentskit/os-audit',
    '@agentskit/os-sandbox',
  ],
})
