import { defineConfig } from 'tsup'

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/schema/workspace.ts',
    'src/schema/agent.ts',
    'src/schema/trigger.ts',
    'src/schema/flow.ts',
    'src/schema/plugin.ts',
    'src/schema/vault.ts',
  ],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  splitting: false,
  target: 'es2022',
  external: ['zod'],
})
