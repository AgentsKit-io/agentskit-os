import { defineConfig } from 'tsup'

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/none-runtime.ts',
    'src/process-runtime.ts',
    'src/spawner.ts',
    'src/registry.ts',
  ],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  splitting: false,
  target: 'es2022',
  external: ['zod', '@agentskit/os-core'],
})
