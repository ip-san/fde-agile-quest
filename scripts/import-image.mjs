// ~/Downloads にある最新の Gemini_Generated_Image_*.png を取り込み、
// public/img/{key}.jpg へ最適化（幅900・JPEG q82）して保存する。
// 使い方: node scripts/import-image.mjs <key>
//   例: node scripts/import-image.mjs s1-daily-warehouse__b__r
import { mkdirSync, readdirSync, renameSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const key = process.argv[2]
if (!key) {
  console.error('usage: node scripts/import-image.mjs <key>')
  process.exit(1)
}

// 取り込み元: 既定は ~/Downloads。IMPORT_SRC があればそこを優先
// （フルディスクアクセス未許可ターミナルで ~/Downloads が読めない場合の回避用）。
const dl = process.env.IMPORT_SRC || join(homedir(), 'Downloads')
const candidates = readdirSync(dl)
  .filter((f) => /^Gemini_Generated_Image_.*\.(png|jpe?g|webp)$/i.test(f))
  .map((f) => ({ f, t: statSync(join(dl, f)).mtimeMs }))
  .sort((a, b) => b.t - a.t)

if (candidates.length === 0) {
  console.error(`Gemini_Generated_Image_* が ${dl} にありません`)
  process.exit(1)
}

const src = join(dl, candidates[0].f)
const here = dirname(fileURLToPath(import.meta.url))
const outDir = resolve(here, '../public/img')
mkdirSync(outDir, { recursive: true })
const out = join(outDir, `${key}.jpg`)

await sharp(src).resize({ width: 900, withoutEnlargement: true }).jpeg({ quality: 82 }).toFile(out)

// 取り込み済みは退避（再取り込み防止・非破壊）
const used = join(dl, '.fde-imported')
mkdirSync(used, { recursive: true })
renameSync(src, join(used, candidates[0].f))

console.log(`✓ ${key}.jpg ← ${candidates[0].f}`)
