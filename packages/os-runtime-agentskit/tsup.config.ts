import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/llm-adapter.ts', 'src/tool-executor.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  splitting: false,
  target: 'es2022',
  external: ['zod', '@agentskit/os-core', '@agentskit/os-runtime'],
})
