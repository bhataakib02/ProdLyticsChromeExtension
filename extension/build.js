// build.js - Custom build script for Chrome Extension
// Uses Vite CLI for popup and esbuild CLI for background + content

import { execSync } from 'child_process'
import { copyFileSync, mkdirSync, existsSync, cpSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const run = (cmd) => execSync(cmd, { stdio: 'inherit', cwd: __dirname })

// 1. Build React popup with Vite CLI
console.log('📦 Building React popup...')
run('npx vite build --config vite.config.jsx')

// 2. Bundle background.jsx with esbuild CLI
console.log('⚙️  Bundling background.js...')
run('npx esbuild src/background.jsx --bundle --format=esm --platform=browser --target=chrome120 --outfile=dist/background.js')

// 3. Bundle content.jsx with esbuild CLI
console.log('⚙️  Bundling content.js...')
run('npx esbuild src/content.jsx --bundle --format=esm --platform=browser --target=chrome120 --outfile=dist/content.js')

// 4. Copy manifest.json to dist/
console.log('📋 Copying manifest.json...')
copyFileSync(resolve(__dirname, 'manifest.json'), resolve(__dirname, 'dist/manifest.json'))

// 5. Copy icons/ to dist/icons/
console.log('🎨 Copying icons...')
const iconsOut = resolve(__dirname, 'dist/icons')
if (!existsSync(iconsOut)) mkdirSync(iconsOut, { recursive: true })
cpSync(resolve(__dirname, 'icons'), iconsOut, { recursive: true })

// 6. Copy blocked page assets (blocked.html references blocked.css + blocked.js)
const blockedHtml = resolve(__dirname, 'blocked.html')
const blockedCss = resolve(__dirname, 'blocked.css')
const blockedJs = resolve(__dirname, 'blocked.js')
if (existsSync(blockedHtml)) copyFileSync(blockedHtml, resolve(__dirname, 'dist/blocked.html'))
if (existsSync(blockedCss)) copyFileSync(blockedCss, resolve(__dirname, 'dist/blocked.css'))
if (existsSync(blockedJs)) copyFileSync(blockedJs, resolve(__dirname, 'dist/blocked.js'))

console.log('✅ Extension built! Load the dist/ folder in Chrome.')
