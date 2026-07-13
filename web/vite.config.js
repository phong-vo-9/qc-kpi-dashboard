import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Proxy API calls to the Express backend so the browser never hits Jira directly.
    proxy: { '/api': 'http://localhost:3001' },
  },
})
