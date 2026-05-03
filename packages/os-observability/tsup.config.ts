import { defineConfig } from 'tsup'

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/log-sink.ts',
    'src/console-writer.ts',
    'src/replay.ts',
    'src/trace-collector.ts',
    'src/in-memory-span-exporter.ts',
    'src/metrics-registry.ts',
    'src/in-memory-metric-sink.ts',
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
