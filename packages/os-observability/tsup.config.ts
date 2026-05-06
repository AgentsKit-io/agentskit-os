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
    'src/cost-bridge.ts',
    'src/coding-task-report-exports.ts',
  ],
  format: ['esm', 'cjs'],
  // resolve types for cross-workspace re-exports (coding-task-report-exports.ts
  // re-exports from @agentskit/os-dev-orchestrator). Without resolve:[...]
  // the DTS pass races against the dependency's build under parallel pnpm.
  dts: { resolve: ['@agentskit/os-dev-orchestrator'] },
  sourcemap: true,
  clean: true,
  treeshake: true,
  splitting: false,
  target: 'es2022',
  external: ['zod', '@agentskit/os-core', '@agentskit/os-dev-orchestrator'],
})
