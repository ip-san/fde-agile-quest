import { describe, expect, it } from 'vitest'
import {
  CHAPTER_TITLE,
  ENDINGS,
  EVENTS,
  FAILURE_EPILOGUES,
  SPRINTS,
  STARTING_METERS,
} from '../data/chapters/chapter-01'
import { GLOSSARY } from '../data/glossary'
import type { MeterKey } from '../types'
import type { Ceremony, Choice, GameEvent, Meters } from '../types'
import {
  applyEffects,
  availableEvents,
  clampMeters,
  drawEvent,
  evaluateEnding,
  resolveChoice,
} from './game'

const meters = (p: Partial<Meters> = {}): Meters => ({ trust: 5, insight: 2, culture: 2, ...p })

describe('clampMeters', () => {
  it('各メーターを 0..10 に丸める', () => {
    expect(clampMeters(meters({ trust: 99, insight: -3 }))).toEqual({
      trust: 10,
      insight: 0,
      culture: 2,
    })
  })
})

describe('applyEffects', () => {
  it('指定キーのみ加算する', () => {
    expect(applyEffects(meters(), { insight: 2, culture: -1 })).toEqual(
      meters({ insight: 4, culture: 1 }),
    )
  })
})

describe('resolveChoice', () => {
  it('setsFlag があるとフラグが立ち、元の集合を破壊しない', () => {
    const base = new Set<string>()
    const choice: Choice = {
      id: 'x',
      label: 'l',
      effects: { trust: 1 },
      resultText: 'r',
      setsFlag: 'wrongKpi',
    }
    const r = resolveChoice(meters(), base, choice)
    expect(r.flags.has('wrongKpi')).toBe(true)
    expect(r.meters.trust).toBe(6)
    expect(base.has('wrongKpi')).toBe(false)
  })
})

describe('availableEvents（スプリント×セレモニーで絞る）', () => {
  it('sprint と ceremony が一致するものだけ返す', () => {
    const evs = availableEvents(EVENTS, 1, 'planning', new Set(), new Set())
    expect(evs.length).toBeGreaterThan(0)
    expect(evs.every((e) => e.sprint === 1 && e.ceremony === 'planning')).toBe(true)
  })
  it('requiresFlag のイベントはフラグ無しでは出ない（s3 daily の手戻り）', () => {
    const without = availableEvents(EVENTS, 3, 'daily', new Set(), new Set())
    expect(without.some((e) => e.id === 's3-daily-rework')).toBe(false)
    const withFlag = availableEvents(EVENTS, 3, 'daily', new Set(), new Set(['wrongKpi']))
    expect(withFlag.some((e) => e.id === 's3-daily-rework')).toBe(true)
  })
  it('解決済みイベントは除外される', () => {
    const all = availableEvents(EVENTS, 1, 'daily', new Set(), new Set())
    const after = availableEvents(EVENTS, 1, 'daily', new Set([all[0].id]), new Set())
    expect(after.some((e) => e.id === all[0].id)).toBe(false)
  })
})

describe('drawEvent', () => {
  const evs: GameEvent[] = [
    { id: 'g', sprint: 1, ceremony: 'daily', segment: 'genba', title: '', narrative: '', choices: [] },
    { id: 'k', sprint: 1, ceremony: 'daily', segment: 'kokyaku', title: '', narrative: '', choices: [] },
  ]
  it('一致セグメントを優先', () => {
    expect(drawEvent(evs, 'kokyaku', 0).event?.id).toBe('k')
    expect(drawEvent(evs, 'kokyaku', 0).unexpected).toBe(false)
  })
  it('一致なしは任意イベント + unexpected=true', () => {
    const r = drawEvent(evs, 'trouble', 0)
    expect(r.event).not.toBeNull()
    expect(r.unexpected).toBe(true)
  })
  it('空なら null', () => {
    expect(drawEvent([], 'genba', 0).event).toBeNull()
  })
})

describe('evaluateEnding', () => {
  it('全メーター高なら 真のFDE', () => {
    expect(evaluateEnding(ENDINGS, meters({ trust: 8, insight: 7, culture: 7 })).id).toBe('trueFde')
  })
  it('insight 低は 言われた通り作る人', () => {
    expect(evaluateEnding(ENDINGS, meters({ insight: 3 })).id).toBe('orderTaker')
  })
  it('trust 低は 現場に嫌われた', () => {
    expect(evaluateEnding(ENDINGS, meters({ trust: 1, insight: 8 })).id).toBe('disliked')
  })
  it('文化が低くて信頼ありは ヒーロー止まり', () => {
    expect(evaluateEnding(ENDINGS, meters({ trust: 6, insight: 7, culture: 2 })).id).toBe('hero')
  })
  it('どれにも該当しなければ 及第点', () => {
    expect(evaluateEnding(ENDINGS, meters({ trust: 6, insight: 5, culture: 5 })).id).toBe('decent')
  })
})

describe('キャンペーン構造の健全性', () => {
  it('3スプリントで、各スプリントにセレモニー列がある', () => {
    expect(CHAPTER_TITLE).toContain('第1章')
    expect(SPRINTS).toHaveLength(3)
    for (const sp of SPRINTS) expect(sp.beats.length).toBeGreaterThan(0)
  })
  it('各スプリント×各セレモニービートに、フラグ無しイベントが最低1つある（進行が詰まらない）', () => {
    for (const sp of SPRINTS) {
      const ceremonies = new Set<Ceremony>(sp.beats)
      for (const c of ceremonies) {
        const base = EVENTS.filter(
          (e) => e.sprint === sp.n && e.ceremony === c && !e.requiresFlag,
        )
        expect(base.length, `sprint ${sp.n} / ${c}`).toBeGreaterThan(0)
      }
    }
  })
  it('同一セレモニーのビート数 ≤ そのプールのフラグ無しイベント数（毎ビート引ける）', () => {
    for (const sp of SPRINTS) {
      const counts: Record<string, number> = {}
      for (const b of sp.beats) counts[b] = (counts[b] ?? 0) + 1
      for (const [c, beatCount] of Object.entries(counts)) {
        const pool = EVENTS.filter(
          (e) => e.sprint === sp.n && e.ceremony === c && !e.requiresFlag,
        ).length
        expect(pool, `sprint ${sp.n} / ${c}`).toBeGreaterThanOrEqual(beatCount)
      }
    }
  })
  it('全イベントの選択肢が1つ以上、各選択に結果テキストがある', () => {
    for (const e of EVENTS) {
      expect(e.choices.length, e.id).toBeGreaterThan(0)
      for (const c of e.choices) expect(c.resultText.length, `${e.id}/${c.id}`).toBeGreaterThan(0)
    }
  })
})

describe('0ルール（失敗エピローグ）', () => {
  it('3つのメーターすべてに失敗エピローグが定義されている', () => {
    for (const k of ['trust', 'insight', 'culture'] as MeterKey[]) {
      const ep = FAILURE_EPILOGUES[k]
      expect(ep, k).toBeDefined()
      expect(ep.id.startsWith('fail-'), k).toBe(true)
      expect(ep.title.length, k).toBeGreaterThan(0)
      expect(ep.reflection.length, k).toBeGreaterThan(0)
    }
  })
  it('開始メーターはどれも0より大きい（即終了しない）', () => {
    for (const k of ['trust', 'insight', 'culture'] as MeterKey[]) {
      expect(STARTING_METERS[k], k).toBeGreaterThan(0)
    }
  })
})

describe('用語マーカーの健全性', () => {
  const extractTerms = (text: string): string[] =>
    [...text.matchAll(/\{\{(.+?)\}\}/g)].map((m) => m[1])

  it('本文中の全 {{用語}} が GLOSSARY に存在する（ホバー解説が必ず出る）', () => {
    const texts: string[] = []
    for (const e of EVENTS) {
      texts.push(e.narrative)
      for (const c of e.choices) texts.push(c.label, c.resultText)
    }
    for (const ep of ENDINGS) texts.push(ep.reflection)
    for (const k of ['trust', 'insight', 'culture'] as MeterKey[]) {
      texts.push(FAILURE_EPILOGUES[k].reflection)
    }
    const missing = new Set<string>()
    for (const t of texts) {
      for (const term of extractTerms(t)) {
        if (!GLOSSARY[term]) missing.add(term)
      }
    }
    expect([...missing], `未定義の用語マーカー: ${[...missing].join(', ')}`).toEqual([])
  })

  it('warn 選択肢は「即時の負効果」か「将来の手戻り(setsFlag)」のどちらかの下振れを持つ', () => {
    for (const e of EVENTS) {
      for (const c of e.choices) {
        if (!c.warn) continue
        const hasNegative = Object.values(c.effects).some((v) => (v ?? 0) < 0)
        const hasDeferredDownside = c.setsFlag !== undefined
        expect(
          hasNegative || hasDeferredDownside,
          `${e.id}/${c.id} は warn なのに即時の負効果も将来の手戻りも無い`,
        ).toBe(true)
      }
    }
  })
})
