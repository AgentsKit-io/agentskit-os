import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/cli.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  splitting: false,
  target: 'es2022',
  esbuildOptions(options) {
    options.jsx = 'automatic'
  },
  external: [
    'zod',
    '@agentskit/os-core',
    '@agentskit/os-coding-agents',
    '@agentskit/os-dev-orchestrator',
    '@agentskit/os-flow',
    '@agentskit/os-import',
    '@agentskit/os-marketplace-sdk',
    '@agentskit/os-mcp-bridge',
    '@agentskit/os-storage',
    '@agentskit/os-templates',
    'yaml',
    'commander',
    'ink',
    'react',
  ],
})
