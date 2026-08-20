import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// base is /couch-legend/ for GitHub Pages project hosting; override with
// VITE_BASE=/ for a root deployment.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/couch-legend/',
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
