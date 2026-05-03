import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isTauriDev = process.env['TAURI_ENV_DEBUG'] === 'true' || mode === 'development'

  return {
    plugins: [react()],
    base: './',
    clearScreen: false,
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
    server: {
      port: 1420,
      strictPort: true,
      // Only bind to all interfaces when running inside Tauri dev mode.
      host: isTauriDev ? '0.0.0.0' : 'localhost',
      ...(isTauriDev
        ? {
            hmr: {
              protocol: 'ws',
              host: 'localhost',
              port: 1421,
            },
          }
        : {}),
    },
    build: {
      // Tauri uses Chromium on macOS/Windows, WebKit on Linux — safe to target ES2022.
      target: ['es2022', 'chrome105', 'safari15'],
      minify: !process.env['TAURI_ENV_DEBUG'] ? 'esbuild' : false,
      sourcemap: !!process.env['TAURI_ENV_DEBUG'],
    },
  }
})
