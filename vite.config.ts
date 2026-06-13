/// <reference types="vitest/config" />
import { copyFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { type Plugin, defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages のサブパス配信用。リポジトリ名に合わせる。
const BASE = '/fde-agile-quest/'

/** GitHub Pages の SPA フォールバック: dist/index.html を 404.html へコピー */
function spaFallback(): Plugin {
  return {
    name: 'spa-404-fallback',
    apply: 'build',
    closeBundle() {
      const index = resolve(__dirname, 'dist/index.html')
      if (existsSync(index)) copyFileSync(index, resolve(__dirname, 'dist/404.html'))
    },
  }
}

export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    VitePWA({
      // prompt: 新バージョンを自動適用せず、ユーザーが「更新」ボタンを押したら反映する
      registerType: 'prompt',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,jpeg,ico,webmanifest}'],
        cleanupOutdatedCaches: true,
        // skipWaiting はしない（待機させ、更新ボタンの押下で skipWaiting → リロード）
      },
      manifest: {
        name: 'FDE Agile Quest',
        short_name: 'FDE Quest',
        description: 'プログラマーをFDEへリスキリングする、ルーレット駆動の判断キャンペーン',
        lang: 'ja',
        dir: 'ltr',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        scope: BASE,
        start_url: BASE,
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
    }),
    spaFallback(),
  ],
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
  test: {
    // 既定は node（純粋エンジン用）。DOM が要るテストはファイル先頭の
    // `// @vitest-environment jsdom` で個別に上書きする
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
