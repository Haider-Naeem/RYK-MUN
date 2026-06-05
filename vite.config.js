import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],

  define: {
    global: 'globalThis',
  },

  server: {
    host: true,
    port: 5173,

    allowedHosts: [
      '6600-2407-1b40-76-41d1-19c3-3277-f7be-bbd9.ngrok-free.app'
    ]
  }
})