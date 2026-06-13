// 全イベントを source から抽出し docs/EVENT_INDEX.md を生成する。
// 物語の矛盾チェック・筋書き調整の“現状スナップショット”。再実行で最新化:
//   node scripts/gen-event-index.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const dataDir = join(root, 'src/data/chapters/chapter-01')

const CEREMONY_LABEL = { planning: 'プランニング', daily: 'デイリー', review: 'レビュー', retro: 'レトロ' }
const SEGMENT_LABEL = { genba: '現場', kokyaku: '顧客', team: 'チーム', trouble: 'トラブル', chance: 'チャンス' }

// EVENT_PRECEPTS（id -> [心得番号]）
const preceptsSrc = readFileSync(join(root, 'src/data/precepts.ts'), 'utf8')
const EVENT_PRECEPTS = {}
for (const m of preceptsSrc.matchAll(/'([^']+)':\s*\[([0-9,\s]+)\]/g)) {
  EVENT_PRECEPTS[m[1]] = m[2].split(',').map((s) => Number(s.trim()))
}

// 各 events-sprintN.ts をイベントブロックに分割（2スペースの { … } 境界）
function parseEvents(file) {
  const lines = readFileSync(file, 'utf8').split('\n')
  const events = []
  let cur = null
  for (const line of lines) {
    if (!cur && /^ {2}\{$/.test(line)) {
      cur = []
      continue
    }
    if (cur) {
      if (/^ {2}\},?$/.test(line)) {
        events.push(cur)
        cur = null
      } else cur.push(line)
    }
  }
  return events.map(parseBlock).filter(Boolean)
}

function parseBlock(block) {
  const text = block.join('\n')
  const id = /id:\s*'([^']+)'/.exec(text)?.[1]
  if (!id) return null
  const sprint = Number(/sprint:\s*(\d)/.exec(text)?.[1])
  const ceremony = /ceremony:\s*'(\w+)'/.exec(text)?.[1]
  const segment = /segment:\s*'(\w+)'/.exec(text)?.[1]
  const title = /title:\s*'([^']+)'/.exec(text)?.[1] ?? ''
  const requiresFlag = /requiresFlag:\s*'([^']+)'/.exec(text)?.[1]
  // 選択肢サブブロック（6スペースの { … }）
  const choices = []
  let cb = null
  for (const line of block) {
    if (!cb && /^ {6}\{$/.test(line)) {
      cb = []
      continue
    }
    if (cb) {
      if (/^ {6}\},?$/.test(line)) {
        const ct = cb.join('\n')
        choices.push({
          id: /id:\s*'([^']*)'/.exec(ct)?.[1] ?? '',
          label: /label:\s*'([^']*)'/.exec(ct)?.[1] ?? '',
          effects: /effects:\s*(\{[^}]*\})/.exec(ct)?.[1] ?? '{}',
          setsFlag: /setsFlag:\s*'([^']+)'/.exec(ct)?.[1],
          warn: /warn:\s*true/.test(ct),
        })
        cb = null
      } else cb.push(line)
    }
  }
  return { id, sprint, ceremony, segment, title, requiresFlag, choices }
}

const all = [1, 2, 3].flatMap((n) => parseEvents(join(dataDir, `events-sprint${n}.ts`)))

// 出力（Sprint→セレモニー順）
const order = { planning: 0, daily: 1, review: 2, retro: 3 }
let out = `# 全イベント索引（自動生成）

> \`node scripts/gen-event-index.mjs\` で再生成。**手で編集しない**（筋書きの調整は docs/STORY.md）。
> 物語の矛盾チェック用スナップショット。総イベント数: **${all.length}**。
> 記法: ⚠=warn / →flag=この選択でフラグが立つ / [要flag]=このフラグがある時だけ出現。

`
for (const sp of [1, 2, 3]) {
  out += `\n## Sprint ${sp}\n`
  const inSp = all.filter((e) => e.sprint === sp).sort((a, b) => order[a.ceremony] - order[b.ceremony])
  let lastCer = null
  for (const e of inSp) {
    if (e.ceremony !== lastCer) {
      out += `\n### ${CEREMONY_LABEL[e.ceremony]}\n`
      lastCer = e.ceremony
    }
    const gate = e.requiresFlag ? ` _[要 ${e.requiresFlag}]_` : ''
    const seg = SEGMENT_LABEL[e.segment] ?? e.segment
    const pre = (EVENT_PRECEPTS[e.id] ?? []).join(',')
    out += `\n- **${e.title}** \`${e.id}\`（${seg}${gate}）${pre ? ` 心得:${pre}` : ''}\n`
    for (const c of e.choices) {
      const flag = c.setsFlag ? ` →${c.setsFlag}` : ''
      out += `    - ${c.warn ? '⚠ ' : ''}${c.label} \`${c.effects}\`${flag}\n`
    }
  }
}

mkdirSync(join(root, 'docs'), { recursive: true })
writeFileSync(join(root, 'docs/EVENT_INDEX.md'), out, 'utf8')
console.log(`docs/EVENT_INDEX.md generated (${all.length} events)`)
