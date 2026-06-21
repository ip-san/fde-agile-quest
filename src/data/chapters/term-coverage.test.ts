import { describe, expect, it } from 'vitest'
import { GLOSSARY } from '../glossary'
import { SEED_BY_ID, SEEDS } from '../seeds'
import { EVENTS, SPRINTS } from './chapter-01'

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
    if (e.deduction) {
      for (const k of termsIn(e.deduction.prompt)) uses.push({ where: `${e.id}.deduction.prompt`, key: k })
      for (const k of termsIn(e.deduction.reveal)) uses.push({ where: `${e.id}.deduction.reveal`, key: k })
      for (const o of e.deduction.options) {
        for (const k of termsIn(o.text)) uses.push({ where: `${e.id}.deduction/${o.id}.text`, key: k })
        for (const k of termsIn(o.miss)) uses.push({ where: `${e.id}.deduction/${o.id}.miss`, key: k })
      }
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

describe('推理（見抜く）データの整合性', () => {
  const withDeduction = EVENTS.filter((e) => e.deduction)

  it('各推理はちょうど1つの本音（truth）を持つ', () => {
    const bad = withDeduction
      .map((e) => ({ id: e.id, truths: e.deduction?.options.filter((o) => o.truth).length ?? 0 }))
      .filter((x) => x.truths !== 1)
    expect(bad, `本音が1つでない推理: ${bad.map((x) => `${x.id}(${x.truths})`).join(', ')}`).toEqual([])
  })

  it('各推理は2つ以上の候補を持ち、本音以外には外し時の miss がある', () => {
    const bad: string[] = []
    for (const e of withDeduction) {
      const opts = e.deduction?.options ?? []
      if (opts.length < 2) bad.push(`${e.id}: 候補${opts.length}件`)
      for (const o of opts) {
        if (!o.truth && !o.miss) bad.push(`${e.id}/${o.id}: miss 未設定`)
      }
    }
    expect(bad, bad.join(', ')).toEqual([])
  })

  it('候補IDは推理内で一意', () => {
    const bad: string[] = []
    for (const e of withDeduction) {
      const ids = (e.deduction?.options ?? []).map((o) => o.id)
      if (new Set(ids).size !== ids.length) bad.push(e.id)
    }
    expect(bad, `候補IDが重複: ${bad.join(', ')}`).toEqual([])
  })
})

describe('機能の種（seeds）の整合性', () => {
  const choices = EVENTS.flatMap((e) => e.choices)

  it('choice.seedId はすべて SEEDS に定義されている', () => {
    const unknown = choices.filter((c) => c.seedId && !SEED_BY_ID[c.seedId]).map((c) => c.seedId)
    expect(unknown, `未定義の seedId: ${unknown.join(', ')}`).toEqual([])
  })

  it('すべての種は、いずれかの選択肢から発見できる（孤立した種が無い）', () => {
    const referenced = new Set(choices.map((c) => c.seedId).filter(Boolean))
    const orphan = SEEDS.filter((s) => !referenced.has(s.id)).map((s) => s.id)
    expect(orphan, `どの選択からも発見できない種: ${orphan.join(', ')}`).toEqual([])
  })
})

describe('縦糸の入口（pinned）の整合性', () => {
  const pinned = EVENTS.filter((e) => e.pinned)

  it('pinned はデイリーイベント（最後のデイリーで強制提示する仕組みのため）', () => {
    const bad = pinned.filter((e) => e.ceremony !== 'daily').map((e) => e.id)
    expect(bad, `daily 以外の pinned: ${bad.join(', ')}`).toEqual([])
  })

  it('1スプリントの pinned 数 ≤ そのスプリントのデイリー数（末尾から1日1件ずつ全部強制できる）', () => {
    // spinCore は「未遭遇 pinned ≤ 残りデイリー数」になった時点で末尾デイリーから1件ずつ強制する。
    // 総数がデイリー数を超えなければ、全 pinned を必ず通せる（取りこぼさない）。
    const dailyCountOf = (sprintNo: number) =>
      SPRINTS.find((s) => s.n === sprintNo)?.beats.filter((b) => b === 'daily').length ?? 0
    const bySprint = new Map<number, number>()
    for (const e of pinned) bySprint.set(e.sprint, (bySprint.get(e.sprint) ?? 0) + 1)
    const over = [...bySprint]
      .filter(([sprintNo, n]) => n > dailyCountOf(sprintNo))
      .map(([s, n]) => `S${s}(${n}>${dailyCountOf(s)})`)
    expect(over, `pinned がデイリー数を超えるスプリント: ${over.join(', ')}`).toEqual([])
  })

  it('requiresFlag 付き pinned は、そのフラグを確実に立てる“保証役”の pinned が先行する', () => {
    // pinned は原則「無条件に出る入口」。ただし requiresFlag 付きでも、そのフラグを全選択で立てる
    // 無条件 pinned（保証役）が同一以前のスプリントにあれば、フラグは必ず立つので入口として成立する。
    // 例: s2-physical-ai-showcase(要 showcasePressure) は s1-daily-showcase-order(無条件 pinned・
    //     全選択で showcasePressure を立てる) が S1 で必ず通るため、S2 で確実に出る。
    const guarantees = (flag: string) =>
      pinned.some((g) => !g.requiresFlag && g.choices.length > 0 && g.choices.every((c) => c.setsFlag === flag))
    const bad = pinned
      .filter((e) => e.requiresFlag && !guarantees(e.requiresFlag))
      .map((e) => `${e.id}(要${e.requiresFlag})`)
    expect(bad, `フラグの保証役が無い pinned: ${bad.join(', ')}`).toEqual([])
  })
})

describe('悪手（warn）の常設 — ラチェット', () => {
  // サクラ大戦の「言ってはいけない一手」に倣い、デイリーの判断にはほぼ必ず
  // “誘惑的だがFDE原則を裏切る悪手”（warn）を1つ置く。warn 無しは意図的な例外のみ許可リストで認める。
  // 例外＝『意図的な技術的負債』のように悪手とは言えない正当な判断（件数だけでなくIDで縛り、別イベントの後退を捕捉）。
  const WARN_EXEMPT = new Set(['s2-daily-debt'])

  it('複数選択肢のデイリーで warn が無いのは許可リストのイベントだけ', () => {
    const noWarn = EVENTS.filter(
      (e) => e.ceremony === 'daily' && e.choices.length >= 2 && !e.choices.some((c) => c.warn)
    ).map((e) => e.id)
    const unexpected = noWarn.filter((id) => !WARN_EXEMPT.has(id))
    expect(unexpected, `許可外で warn 無しのデイリー: ${unexpected.join(', ')}`).toEqual([])
  })
})

describe('静観（restraint）の整合性', () => {
  it('1イベントに静観の選択肢は高々1つ（自動選択は最初の1件を採るため）', () => {
    const bad = EVENTS.filter((e) => e.choices.filter((c) => c.restraint).length > 1).map((e) => e.id)
    expect(bad, `静観が2つ以上のイベント: ${bad.join(', ')}`).toEqual([])
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
