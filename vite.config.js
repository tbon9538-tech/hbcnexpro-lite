import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 仓库根目录放的是构建产物（GitHub Pages 从 main 根目录发布），源码入口在 src/
export default defineConfig({
  root: 'src',
  plugins: [vue()],
  base: './',
  build: { outDir: '../dist', emptyOutDir: true },
})
