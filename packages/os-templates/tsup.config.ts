import { defineConfig } from 'tsup'

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/types.ts',
    'src/registry.ts',
    'src/templates/pr-review.ts',
    'src/templates/marketing-3way.ts',
    'src/templates/research-summary.ts',
    'src/templates/support-triage.ts',
    'src/templates/clinical-consensus.ts',
    'src/eval-packs/index.ts',
    'src/eval-packs/dev.ts',
    'src/eval-packs/agency.ts',
    'src/eval-packs/clinical.ts',
    'src/eval-packs/non-tech.ts',
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
