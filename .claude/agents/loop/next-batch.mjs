#!/usr/bin/env node
// next-batch.mjs: キューから最大 batchSize 件を返す（FIFO・完全自走バージョン）。
//
// next-auto.mjs と同じキューを使い、1件でなく複数件返すだけの違い。
// 並列バッチ実装（loop-autonomous-playtest.md の C フェーズ）向け。
//
// 使い方: node .claude/agents/loop/next-batch.mjs [上限件数]
//   → {"hasTask":true, tasks:[...], queued:N}
//   → {"hasTask":false}
//   → {"hasTask":false,"error":...}
//
// [上限件数] 省略時は config.json の limits.batchSize（既定3）を使う。

import { actionableTasks, fetchBoard, loadConfig } from './lib.mjs'

try {
  const cfg = loadConfig()
  const argLimit = Number(process.argv[2])
  const limit = Number.isFinite(argLimit) && argLimit > 0 ? argLimit : (cfg.limits?.batchSize ?? 3)
  const project = fetchBoard(cfg)
  const tasks = actionableTasks(project, cfg)
  if (tasks.length === 0) {
    console.log(JSON.stringify({ hasTask: false }))
    process.exit(0)
  }
  const batch = tasks.slice(0, limit)
  console.log(JSON.stringify({ hasTask: true, tasks: batch, queued: tasks.length }))
} catch (e) {
  console.log(JSON.stringify({ hasTask: false, error: String(e.message || e) }))
  process.exit(0)
}
