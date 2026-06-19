import { describe, expect, it } from 'vitest'
import { GLOSSARY } from '../glossary'
import { EVENTS } from './chapter-01'

// ───────────────────────────────────────────────────────────
// 用語カバレッジ監査
//
// 設計の出典: 学習ゲームの学習効果は「動機づけの転移」ではなく、プレイヤーが
// ゲーム課題に必要な特徴へ向ける「注意（attention）」によって駆動される
// （Cutting & Iacovides, ACM PACMHCI 2022, 査読／確度: 高）。
// 本作の中核機構は「選択 → 結果（メーター増減）の開示」。学習させたい用語を
// この“結果の説明”に埋め込むほど、プレイヤーの注意が用語に向き定着が高まる。
//
// よってこのテストは:
//  (1) 正本性: 本文中の {{key}} がすべて GLOSSARY に存在する（タイポ／未定義の検知）
//  (2) 学習統合: 各イベントが最低1つの用語を文脈内で露出する
//  (3) ラチェット: 「結果文に用語を埋めた選択肢」の割合が現状を下回らない
// を検証する。
// ───────────────────────────────────────────────────────────

const TERM_RE = /\{\{(.+?)\}\}/g

/** 文字列から {{...}} のキーを列挙する */
function termsIn(text: string | undefined): string[] {
  if (!text) return []
  const keys: string[] = []
  for (const m of text.matchAll(TERM_RE)) keys.push(m[1])
  return keys
}

/** 全イベント・全フィールドの {{key}} を (場所ラベル, key) で列挙する */
function allTermUses(): { where: string; key: string }[] {
  const uses: { where: string; key: string }[] = []
  for (const e of EVENTS) {
    for (const k of termsIn(e.narrative)) uses.push({ where: `${e.id}.narrative`, key: k })
    for (const c of e.choices) {
      for (const k of termsIn(c.label)) uses.push({ where: `${e.id}/${c.id}.label`, key: k })
      for (const k of termsIn(c.resultText)) uses.push({ where: `${e.id}/${c.id}.resultText`, key: k })
    }
  }
  return uses
}

describe('用語カバレッジ — 正本性', () => {
  it('本文で使われる {{用語}} はすべて GLOSSARY に定義されている（タイポ・未定義の検知）', () => {
    const unknown = allTermUses().filter((u) => !GLOSSARY[u.key])
    expect(unknown, `未定義の用語キー: ${unknown.map((u) => `${u.key}@${u.where}`).join(', ')}`).toEqual([])
  })

  it('GLOSSARY の各エントリは key とプロパティ名が一致する', () => {
    const mismatched = Object.entries(GLOSSARY)
      .filter(([prop, term]) => prop !== term.key)
      .map(([prop, term]) => `${prop}!=${term.key}`)
    expect(mismatched, mismatched.join(', ')).toEqual([])
  })
})

describe('用語カバレッジ — 学習統合（注意機構）', () => {
  // 「用語が一切出ないイベント」の上限。ラチェット＝この値を増やす変更は失敗させ、
  // 減らせたら床を下げて固定する（最終目標は 0）。現状の達成値で固定している。
  const MAX_BARREN = 40
  // メーターが動く選択肢のうち、結果文に用語を含む割合の下限（ラチェット。最終目標は 1.0）。
  // 本作の中核機構は「結果（メーター増減）の開示」。ここに用語を埋めるほど注意が向き学習が進む。
  const MIN_MOVING_RATIO = 0.28

  it(`用語が一切出ないイベント数が ${MAX_BARREN} 以下（ラチェット：増やさない）`, () => {
    const barren = EVENTS.filter((e) => {
      const inNarrative = termsIn(e.narrative).length > 0
      const inChoices = e.choices.some((c) => termsIn(c.label).length > 0 || termsIn(c.resultText).length > 0)
      return !inNarrative && !inChoices
    }).map((e) => e.id)
    expect(barren.length, `用語が一切出ないイベント(${barren.length}件): ${barren.join(', ')}`).toBeLessThanOrEqual(
      MAX_BARREN
    )
  })

  it(`メーターが動く選択肢の結果文・用語カバレッジが ${(MIN_MOVING_RATIO * 100).toFixed(0)}% 以上（ラチェット：下げない）`, () => {
    const moving = EVENTS.flatMap((e) => e.choices).filter((c) => Object.values(c.effects).some((v) => v !== 0))
    const withTerm = moving.filter((c) => termsIn(c.resultText).length > 0)
    const ratio = moving.length === 0 ? 1 : withTerm.length / moving.length
    expect(
      ratio,
      `メーター変動を伴う選択肢 ${moving.length} 件中 ${withTerm.length} 件が結果文に用語を含む（${(ratio * 100).toFixed(1)}%）`
    ).toBeGreaterThanOrEqual(MIN_MOVING_RATIO)
  })
})
