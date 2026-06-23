#!/usr/bin/env node
// 完全自走（GO 廃止）版のキュー取得。
//
// Approved ゲートを使わず、open な Issue のうち blocked / inReview / done 以外を
// FIFO（issue 番号昇順）で先頭1件返す。ボードに仕事が無ければ {hasTask:false}。
// 自己給餌ループの指揮者は、これが false のとき発見フェーズ（playtest-triage）へ回す。
//
// 使い方: node .claude/agents/loop/next-auto.mjs
//   → {"hasTask":true, number, title, url, stage, body, queued} | {"hasTask":false} | {"hasTask":false,"error":...}

import { actionableTasks, fetchBoard, loadConfig } from './lib.mjs'

try {
  const cfg = loadConfig()
  const project = fetchBoard(cfg)
  const tasks = actionableTasks(project, cfg)
  if (tasks.length === 0) {
    console.log(JSON.stringify({ hasTask: false }))
    process.exit(0)
  }
  const [head] = tasks
  console.log(JSON.stringify({ hasTask: true, queued: tasks.length, ...head }))
} catch (e) {
  console.log(JSON.stringify({ hasTask: false, error: String(e.message || e) }))
  process.exit(0)
}
