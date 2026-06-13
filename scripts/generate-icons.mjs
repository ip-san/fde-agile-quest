// public/icon.svg から PWA 用 PNG アイコンを生成する。
// 使い方: npm run generate-icons
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const here = dirname(fileURLToPath(import.meta.url))
const pub = resolve(here, '../public')
const svg = readFileSync(resolve(pub, 'icon.svg'))

const square = [
  { file: 'pwa-192.png', size: 192 },
  { file: 'pwa-512.png', size: 512 },
  { file: 'apple-touch-icon.png', size: 180 },
]

for (const { file, size } of square) {
  await sharp(svg, { density: 512 }).resize(size, size).png().toFile(resolve(pub, file))
  console.log(`✓ ${file} (${size}x${size})`)
}

// maskable: 安全領域(中央80%)に収まるよう、図柄を80%に縮小して #0f172a 背景に合成
const M = 512
const inner = Math.round(M * 0.8)
const innerPng = await sharp(svg, { density: 512 }).resize(inner, inner).png().toBuffer()
await sharp({ create: { width: M, height: M, channels: 4, background: '#0f172a' } })
  .composite([{ input: innerPng, gravity: 'center' }])
  .png()
  .toFile(resolve(pub, 'pwa-maskable-512.png'))
console.log('✓ pwa-maskable-512.png (512x512, maskable)')
