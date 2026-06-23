#!/usr/bin/env node
// 出口の背圧（完全自走で GO ゲートの代わりに暴走を防ぐ要）。
//
// inReview 列にある open Issue（＝マージ待ち PR）の数を数え、上限に達していたら blocked:true。
// 自己給餌ループの指揮者は、blocked:true の間は新規実装を止めてアイドルする
// ＝人間のマージが滞れば自動で生産が止まり、寝ている間に PR が溢れない。
//
// 上限は config.json の limits.openPrBackpressure（既定 3）。第1引数で上書き可。
//
// 使い方: node .claude/agents/loop/backpressure.mjs [上限]
//   → {"ok":true, count, limit, blocked} | {"ok":false, error}

import { fetchBoard, inReviewCount, loadConfig } from './lib.mjs'

try {
  const cfg = loadConfig()
  const argLimit = Number(process.argv[2])
  const limit = Number.isFinite(argLimit) && argLimit > 0 ? argLimit : (cfg.limits?.openPrBackpressure ?? 3)
  const project = fetchBoard(cfg)
  const count = inReviewCount(project, cfg)
  console.log(JSON.stringify({ ok: true, count, limit, blocked: count >= limit }))
} catch (e) {
  console.log(JSON.stringify({ ok: false, error: String(e.message || e) }))
  process.exit(2)
}
