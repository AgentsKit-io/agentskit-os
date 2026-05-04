import { defineConfig } from 'tsup'

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/types.ts',
    'src/importers/n8n.ts',
    'src/importers/langflow.ts',
    'src/importers/dify.ts',
    'src/importers/langgraph.ts',
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
