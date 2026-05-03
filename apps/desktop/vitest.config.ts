import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      // Point to the os-ui source so tests can resolve the package without
      // requiring a pre-built dist/ directory.
      '@agentskit/os-ui': resolve(__dirname, '../../packages/os-ui/src/index.ts'),
    },
  },
})
