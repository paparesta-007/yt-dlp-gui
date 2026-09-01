import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err, _req, _res) => {
            // Silently suppress ECONNREFUSED when backend is booting up
            if ((err as any).code !== 'ECONNREFUSED') {
              console.warn('[vite-proxy] API error:', err.message)
            }
          })
        },
      },
      '/ws': {
        target: 'ws://127.0.0.1:8080',
        ws: true,
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err, _req, _res) => {
            // Silently suppress ECONNREFUSED when backend is booting up
            if ((err as any).code !== 'ECONNREFUSED') {
              console.warn('[vite-proxy] WS error:', err.message)
            }
          })
        },
      },
    },
  },
})
