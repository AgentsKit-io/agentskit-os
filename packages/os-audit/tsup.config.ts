import { defineConfig } from 'tsup'

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/emitter.ts',
    'src/batch-store.ts',
    'src/file-batch-store.ts',
    'src/event-hash.ts',
    'src/fs.ts',
    'src/sqlite-batch-store.ts',
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
