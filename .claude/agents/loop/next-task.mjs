#!/usr/bin/env node
// loop の「今夜の一手」を Projects ボードの Approved(GO) 列から1件だけ取得する。
//
// これが loop のトークン節約の要。指揮者は起動直後にこれを1回叩き、
//   - {"hasTask":false} なら エージェントを1体も起動せず即スリープ（空回りゼロ）。
//   - {"hasTask":true,...} のときだけ全パイプラインを回す。
//
// 出力は1行 JSON（成功時 exit 0）。本文(body)はそのまま「作業指示書」の素になる。
// 使い方: node .claude/agents/loop/next-task.mjs

import { approvedTasks, fetchBoard, loadConfig } from './lib.mjs'

try {
  const cfg = loadConfig()
  const project = fetchBoard(cfg)
  const tasks = approvedTasks(project, cfg)
  if (tasks.length === 0) {
    process.stdout.write(JSON.stringify({ hasTask: false }) + '\n')
    process.exit(0)
  }
  const t = tasks[0]
  process.stdout.write(
    JSON.stringify({
      hasTask: true,
      number: t.number,
      title: t.title,
      url: t.url,
      body: t.body,
      remaining: tasks.length,
    }) + '\n'
  )
} catch (e) {
  process.stdout.write(JSON.stringify({ hasTask: false, error: String(e.message || e) }) + '\n')
  process.exit(2)
}
