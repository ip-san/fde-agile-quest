// loop の Projects ボード操作 共通ライブラリ（gh CLI を薄くラップ）
//
// 設計意図: GraphQL の煩雑さをここに閉じ込め、loop の指揮者（モデル）は
// next-task.mjs / move-card.mjs を「コマンド1発」で叩くだけにする。
// これによりボード読み取り・カード移動でモデルのトークンをほぼ使わない。
//
// 前提: `gh auth refresh -s project -s read:project` 済み（書き込みに project 必須）。

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))

export function loadConfig() {
  const cfg = JSON.parse(readFileSync(join(here, 'config.json'), 'utf8'))
  if (cfg.projectNumber == null) {
    throw new Error(
      'config.json の projectNumber が未設定です。先に `node .claude/agents/loop/setup-board.mjs` を実行してください。'
    )
  }
  return cfg
}

// gh api graphql を実行して data を返す。失敗時は stderr を載せて throw。
export function gql(query, variables = {}) {
  const args = ['api', 'graphql', '-f', `query=${query}`]
  for (const [k, v] of Object.entries(variables)) {
    // 数値は -F（型付き）、文字列は -f（raw）
    if (typeof v === 'number') args.push('-F', `${k}=${v}`)
    else args.push('-f', `${k}=${v}`)
  }
  const out = execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 })
  const json = JSON.parse(out)
  if (json.errors) {
    throw new Error(`GraphQL error: ${JSON.stringify(json.errors)}`)
  }
  return json.data
}

// プロジェクトの id / Stage フィールド(id, options) / 全アイテムを1クエリで取得。
export function fetchBoard(cfg) {
  const ownerSel = cfg.ownerType === 'org' ? 'organization' : 'user'
  const query = `
    query($login:String!, $number:Int!){
      ${ownerSel}(login:$login){
        projectV2(number:$number){
          id
          title
          field(name:"${cfg.stageField}"){
            ... on ProjectV2SingleSelectField { id name options { id name } }
          }
          items(first:100){
            nodes{
              id
              fieldValueByName(name:"${cfg.stageField}"){
                ... on ProjectV2ItemFieldSingleSelectValue { name }
              }
              content{
                ... on Issue { number title url state body }
              }
            }
          }
        }
      }
    }`
  const data = gql(query, { login: cfg.owner, number: cfg.projectNumber })
  const project = data[ownerSel].projectV2
  if (!project) throw new Error(`プロジェクト #${cfg.projectNumber} が見つかりません。`)
  if (!project.field) {
    throw new Error(`Stage フィールド "${cfg.stageField}" が見つかりません。setup-board.mjs を実行してください。`)
  }
  return project
}

// Approved 列 かつ open な Issue を、issue 番号の昇順（＝FIFO）で返す。
export function approvedTasks(project, cfg) {
  const wanted = cfg.stages.approved
  return project.items.nodes
    .filter((n) => n.content && n.content.number != null)
    .filter((n) => n.content.state === 'OPEN')
    .filter((n) => (n.fieldValueByName?.name || '') === wanted)
    .map((n) => ({
      itemId: n.id,
      number: n.content.number,
      title: n.content.title,
      url: n.content.url,
      body: n.content.body || '',
    }))
    .sort((a, b) => a.number - b.number)
}

// Issue 番号 → その Issue の GraphQL ノード ID を取る（ボードへの追加に必要）。
export function getIssueNodeId(cfg, issueNumber) {
  const query = `
    query($owner:String!, $repo:String!, $number:Int!){
      repository(owner:$owner, name:$repo){ issue(number:$number){ id } }
    }`
  const data = gql(query, { owner: cfg.owner, repo: cfg.repo, number: issueNumber })
  const id = data.repository?.issue?.id
  if (!id) throw new Error(`Issue #${issueNumber} が見つかりません（owner/repo を確認）。`)
  return id
}

// Issue 番号 → そのカードをボードに追加し、stage 列へ置く（既に載っていれば列だけ設定）。
// 新規起票した Issue は gh issue create だけではボードに載らないため、起票直後にこれで Backlog へ。
export function addCard(cfg, issueNumber, stageName = cfg.stages.backlog) {
  const project = fetchBoard(cfg)
  const option = project.field.options.find((o) => o.name === stageName)
  if (!option) {
    const names = project.field.options.map((o) => o.name).join(', ')
    throw new Error(`列 "${stageName}" が Stage に存在しません。存在する列: ${names}`)
  }
  let itemId = project.items.nodes.find((n) => n.content?.number === issueNumber)?.id
  if (!itemId) {
    const contentId = getIssueNodeId(cfg, issueNumber)
    const add = gql(
      `mutation($project:ID!, $content:ID!){
        addProjectV2ItemById(input:{ projectId:$project, contentId:$content }){ item { id } }
      }`,
      { project: project.id, content: contentId }
    )
    itemId = add.addProjectV2ItemById.item.id
  }
  gql(
    `mutation($project:ID!, $item:ID!, $field:ID!, $option:String!){
      updateProjectV2ItemFieldValue(input:{
        projectId:$project, itemId:$item, fieldId:$field,
        value:{ singleSelectOptionId:$option }
      }){ projectV2Item { id } }
    }`,
    { project: project.id, item: itemId, field: project.field.id, option: option.id }
  )
  return { number: issueNumber, stage: stageName }
}

// Issue 番号 → そのカードを stage 列へ移動する。
export function moveCard(cfg, issueNumber, stageName) {
  const project = fetchBoard(cfg)
  const option = project.field.options.find((o) => o.name === stageName)
  if (!option) {
    const names = project.field.options.map((o) => o.name).join(', ')
    throw new Error(`列 "${stageName}" が Stage に存在しません。存在する列: ${names}`)
  }
  const item = project.items.nodes.find((n) => n.content?.number === issueNumber)
  if (!item) {
    throw new Error(`Issue #${issueNumber} がボードに登録されていません。`)
  }
  const mutation = `
    mutation($project:ID!, $item:ID!, $field:ID!, $option:String!){
      updateProjectV2ItemFieldValue(input:{
        projectId:$project, itemId:$item, fieldId:$field,
        value:{ singleSelectOptionId:$option }
      }){ projectV2Item { id } }
    }`
  gql(mutation, {
    project: project.id,
    item: item.id,
    field: project.field.id,
    option: option.id,
  })
  return { number: issueNumber, stage: stageName }
}
