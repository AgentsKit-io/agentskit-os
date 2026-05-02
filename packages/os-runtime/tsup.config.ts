import { defineConfig } from 'tsup'

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/adapters.ts',
    'src/handlers/agent.ts',
    'src/handlers/tool.ts',
    'src/handlers/human.ts',
    'src/handlers/condition.ts',
    'src/handlers/parallel.ts',
    'src/registry.ts',
  ],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  splitting: false,
  target: 'es2022',
  external: ['zod', '@agentskit/os-core', '@agentskit/os-flow'],
})
