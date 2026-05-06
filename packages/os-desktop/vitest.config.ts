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
      // Resolve os-ui from its source so tests don't require a pre-built dist.
      '@agentskit/os-ui': resolve(__dirname, '../os-ui/src/index.ts'),
    },
  },
})
