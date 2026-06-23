#!/usr/bin/env node
// 起票済みの Issue をボードに追加して指定の列に置く（既定は Backlog）。
//
// 新規 Issue は `gh issue create` だけではプロジェクトボードに載らない。
// playtest-triage など「発見 → 起票」系が、起票直後にこれで Backlog へ積むためのヘルパー。
// GO（Approved への移動）は人間が出すので、ここでは Backlog 止まりが既定。
//
// 使い方:
//   node .claude/agents/loop/add-card.mjs <issue番号> [列キー=backlog]
//   列キー = backlog | approved | inProgress | inReview | blocked | done
//
// 例: node .claude/agents/loop/add-card.mjs 42          # Backlog に積む
//     node .claude/agents/loop/add-card.mjs 42 backlog  # 明示

import { addCard, loadConfig } from './lib.mjs'

const [numArg, keyArg = 'backlog'] = process.argv.slice(2)
const cfg = loadConfig()

if (!numArg) {
  console.error('usage: add-card.mjs <issue番号> [backlog|approved|inProgress|inReview|blocked|done]')
  process.exit(1)
}
const issueNumber = Number(numArg)
const stageName = cfg.stages[keyArg]
if (!stageName) {
  console.error(`不明な列キー: ${keyArg}（有効: ${Object.keys(cfg.stages).join(', ')}）`)
  process.exit(1)
}

try {
  const r = addCard(cfg, issueNumber, stageName)
  console.log(JSON.stringify({ ok: true, ...r }))
} catch (e) {
  console.log(JSON.stringify({ ok: false, error: String(e.message || e) }))
  process.exit(2)
}
