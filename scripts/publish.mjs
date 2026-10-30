// 把 dist/ 的构建结果放到仓库根目录：GitHub Pages 从 main 分支根目录发布，App 加载的就是根目录的 index.html
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')

if (!existsSync(join(dist, 'index.html'))) {
  console.error('dist/ 里没有构建结果，先运行 pnpm build')
  process.exit(1)
}

// assets/ 只放构建出来的带哈希文件，整体替换，避免旧文件越积越多。
// 逐个文件复制：Windows 上 Node 的 cpSync 复制目录遇到中文路径会报 EIO
rmSync(join(root, 'assets'), { recursive: true, force: true })
mkdirSync(join(root, 'assets'))
for (const name of readdirSync(join(dist, 'assets'))) {
  copyFileSync(join(dist, 'assets', name), join(root, 'assets', name))
}
copyFileSync(join(dist, 'index.html'), join(root, 'index.html'))
console.log('已更新根目录的 index.html 和 assets/，提交并推送 main 后 GitHub Pages 会自动发布')
