#!/usr/bin/env node
// Projects ボードを1回だけ作る初期化スクリプト（要 `project` スコープ）。
//   1. プロジェクトを作成
//   2. Stage 単一選択フィールド（Backlog/Approved/In progress/In review/Blocked/Done）を追加
//   3. リポジトリをリンク
//   4. config.json に projectNumber を書き戻す
//
// 使い方: node .claude/agents/loop/setup-board.mjs
// 冪等性は無い（作成のみ）。既にボードがある場合は config.json に番号を手書きすれば足りる。

import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const cfgPath = join(here, 'config.json')
const cfg = JSON.parse(readFileSync(cfgPath, 'utf8'))

function gh(args) {
  return execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 })
}

const title = 'FDE Agile Quest — loop'

console.log('1) プロジェクト作成…')
const created = JSON.parse(gh(['project', 'create', '--owner', cfg.owner, '--title', title, '--format', 'json']))
const number = created.number
console.log(`   #${number} ${created.url}`)

console.log('2) Stage フィールド作成…')
const stageOptions = Object.values(cfg.stages).join(',')
gh([
  'project',
  'field-create',
  String(number),
  '--owner',
  cfg.owner,
  '--name',
  cfg.stageField,
  '--data-type',
  'SINGLE_SELECT',
  '--single-select-options',
  stageOptions,
  '--format',
  'json',
])
console.log(`   ${cfg.stageField}: ${stageOptions}`)

console.log('3) リポジトリをリンク…')
try {
  gh(['project', 'link', String(number), '--owner', cfg.owner, '--repo', `${cfg.owner}/${cfg.repo}`])
  console.log(`   ${cfg.owner}/${cfg.repo} をリンク`)
} catch (e) {
  console.log(`   リンクは手動で（${String(e.message || e).split('\n')[0]}）`)
}

console.log('4) config.json を更新…')
cfg.projectNumber = number
writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + '\n')

console.log('\n完了。次の手順:')
console.log('  - ボードを Stage でグループ化したボードビューにする（UI、1回だけ）')
console.log(
  '  - 既存 Issue をボードに追加: gh project item-add ' + number + ' --owner ' + cfg.owner + ' --url <issue URL>'
)
console.log('  - 新規 Issue 自動追加: Project の Workflows で『Auto-add to project』を有効化（UI）')
console.log('  - 動作確認: node .claude/agents/loop/next-task.mjs')
