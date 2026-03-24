import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Popup-only Vite config.
// background.js and content.js are compiled separately by build.js using esbuild.
export default defineConfig({
  plugins: [react()],
  base: '',  // Use relative paths so Chrome extension can load assets
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
