import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { rmSync } from 'node:fs'

export default defineConfig({
  base: './',
  plugins: [
    react(),
    {
      name: 'strip-local-ds-uploads',
      closeBundle() {
        rmSync('dist/ds/uploads', { recursive: true, force: true })
        rmSync('dist/.DS_Store', { force: true })
      },
    },
  ],
})
