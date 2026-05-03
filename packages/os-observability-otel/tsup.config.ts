import { defineConfig } from 'tsup'

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/span-exporter.ts',
    'src/log-writer.ts',
    'src/metric-sink.ts',
  ],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  splitting: false,
  target: 'es2022',
  external: ['zod', '@agentskit/os-core', '@agentskit/os-observability'],
})
