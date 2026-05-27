import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: './', // Important for GitHub Pages relative paths
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        a1: resolve(__dirname, 'a1/index.html'),
        a2: resolve(__dirname, 'a2/index.html'),
      },
    },
  },
})
