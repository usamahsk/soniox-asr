import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/soniox-asr/',
  plugins: [tailwindcss()],
  build: {
    outDir: 'docs',
    emptyOutDir: true,
  },
  publicDir: 'public',
})
