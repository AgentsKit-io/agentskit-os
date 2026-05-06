import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  // Per ADR-0018 §3.5 the React app lives in @agentskit/os-desktop. The
  // package is workspace-resolved via package.json `exports`; no Vite alias
  // is needed.
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
