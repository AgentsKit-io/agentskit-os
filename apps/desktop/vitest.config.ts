import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

// apps/desktop hosts only the Vite/Tauri shell + entry (main.tsx). Application
// tests live in @agentskit/os-desktop. This config exists so future shell-only
// tests (Tauri command bridges, Rust/JS interop fakes) have a place to land.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    passWithNoTests: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@agentskit/os-ui': resolve(__dirname, '../../packages/os-ui/src/index.ts'),
      '@agentskit/os-desktop': resolve(__dirname, '../../packages/os-desktop/src/index.ts'),
    },
  },
})
