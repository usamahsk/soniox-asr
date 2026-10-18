import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [tailwindcss()],
  build: {
    outDir: 'docs',
    emptyOutDir: true,
  },
  publicDir: 'public',
})
