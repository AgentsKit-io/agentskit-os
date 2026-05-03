import { defineConfig } from 'tsup'

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/topo.ts',
    'src/runner.ts',
    'src/handlers.ts',
    'src/durable.ts',
    'src/bus-bridge.ts',
    'src/cost-estimator.ts',
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
