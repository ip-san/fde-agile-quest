#!/usr/bin/env node
// Issue カードを Stage 列へ移動する（loop のステート遷移）。
//
// 使い方:
//   node .claude/agents/loop/move-card.mjs <issue番号> <列キー>
//   列キー = backlog | approved | inProgress | inReview | blocked | done
//
// 例（着手時）: node .claude/agents/loop/move-card.mjs 12 inProgress
//   PR 提出時 : node .claude/agents/loop/move-card.mjs 12 inReview
//   要承認    : node .claude/agents/loop/move-card.mjs 12 blocked

import { loadConfig, moveCard } from './lib.mjs'

const [numArg, keyArg] = process.argv.slice(2)
const cfg = loadConfig()

if (!numArg || !keyArg) {
  console.error('usage: move-card.mjs <issue番号> <backlog|approved|inProgress|inReview|blocked|done>')
  process.exit(1)
}
const issueNumber = Number(numArg)
const stageName = cfg.stages[keyArg]
if (!stageName) {
  console.error(`不明な列キー: ${keyArg}（有効: ${Object.keys(cfg.stages).join(', ')}）`)
  process.exit(1)
}

try {
  const r = moveCard(cfg, issueNumber, stageName)
  console.log(JSON.stringify({ ok: true, ...r }))
} catch (e) {
  console.log(JSON.stringify({ ok: false, error: String(e.message || e) }))
  process.exit(2)
}
