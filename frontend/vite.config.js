import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true, // Listen on all network interfaces
    proxy: {
      '/api': {
        target: 'http://localhost:5050',
        changeOrigin: true,
        secure: false
      },
      '/templates': {
        target: 'http://localhost:5050',
        changeOrigin: true,
        secure: false
      },
      '/media': {
        target: 'http://localhost:5050',
        changeOrigin: true,
        secure: false
      },
      '/ws': {
        target: 'ws://localhost:5050',
        ws: true,
        changeOrigin: true
      }
    }
  }
})