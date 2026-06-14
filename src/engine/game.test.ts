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
import { EVENT_PRECEPTS, PRECEPTS } from '../data/precepts'
import type { GameFlag, MeterKey } from '../types'
import type { Ceremony, Choice, GameEvent, Meters } from '../types'
import {
  amplifyEffects,
  applyEffects,
  availableEvents,
  clampMeters,
  drawEvent,
  evaluateEnding,
  miniGameKindFor,
  primaryPositive,
  resolveChoice,
} from './game'
import { AI_TOKENS_MAX } from './progression'

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
  // in-game の唯一のメーター変更経路。境界を跨いで 0..10 にクランプされることを固定
  // （clampMeters ラッパーを外す回帰を検出する）
  it('上限 10 を超える加算は 10 に丸める', () => {
    expect(applyEffects(meters({ trust: 9 }), { trust: 5 }).trust).toBe(10)
  })
  it('下限 0 を下回る減算は 0 に丸める', () => {
    expect(applyEffects(meters({ trust: 1 }), { trust: -5 }).trust).toBe(0)
  })
})

describe('primaryPositive / amplifyEffects（実行ミニゲームの倍率）', () => {
  it('主正メーターは最大の正効果。同値は trust→insight→culture 優先', () => {
    expect(primaryPositive({ trust: 2, culture: -1 })).toBe('trust')
    expect(primaryPositive({ insight: 1, culture: 1 })).toBe('insight') // 同値は順序で
    expect(primaryPositive({ culture: 1 })).toBe('culture')
    expect(primaryPositive({})).toBeNull()
    expect(primaryPositive({ trust: -1 })).toBeNull() // 正が無ければ null
  })
  it('great は主正+1、負効果・非主正は不変', () => {
    const r = amplifyEffects({ insight: 1, culture: 1 }, 'great')
    expect(r.effects).toEqual({ insight: 2, culture: 1 })
    expect(r.primary).toBe('insight')
    expect(r.delta).toBe(1)
    // warn 選択でも主正(trust)だけ増え、代償(culture-1)は不変
    expect(amplifyEffects({ trust: 1, culture: -1 }, 'great').effects).toEqual({ trust: 2, culture: -1 })
  })
  it('good は原文どおり（±0）', () => {
    const r = amplifyEffects({ insight: 1, culture: 1 }, 'good')
    expect(r.effects).toEqual({ insight: 1, culture: 1 })
    expect(r.delta).toBe(0)
  })
  it('poor は主正-1。0未満にはしない＝新たな負を足さない', () => {
    const r = amplifyEffects({ insight: 1, culture: 1 }, 'poor')
    expect(r.effects).toEqual({ insight: 0, culture: 1 })
    expect(r.delta).toBe(-1) // 結果バッジ「伸びを -1 取り逃した」表示に使う負の delta を固定
    expect(amplifyEffects({ trust: 2 }, 'poor').effects).toEqual({ trust: 1 })
    // 負効果は poor でも不変（0ルールを壊さない）
    expect(amplifyEffects({ trust: 1, culture: -1 }, 'poor').effects).toEqual({ trust: 0, culture: -1 })
  })
  it('主正が無い選択はどのティアでも無変化', () => {
    expect(amplifyEffects({}, 'great').effects).toEqual({})
    expect(amplifyEffects({ trust: -1 }, 'poor')).toEqual({ effects: { trust: -1 }, primary: null, delta: 0 })
  })
})

describe('miniGameKindFor', () => {
  const ev = (segment: GameEvent['segment'], minigame?: GameEvent['minigame']): GameEvent => ({
    id: 'x',
    sprint: 1,
    ceremony: 'daily',
    segment,
    title: '',
    narrative: '',
    choices: [],
    minigame,
  })
  it('作る/直す系(team,trouble)は dev、人と現場系は hearing', () => {
    expect(miniGameKindFor(ev('team'))).toBe('dev')
    expect(miniGameKindFor(ev('trouble'))).toBe('dev')
    expect(miniGameKindFor(ev('genba'))).toBe('hearing')
    expect(miniGameKindFor(ev('kokyaku'))).toBe('hearing')
    expect(miniGameKindFor(ev('chance'))).toBe('hearing')
  })
  it('event.minigame があればセグメント既定より優先', () => {
    expect(miniGameKindFor(ev('team', 'hearing'))).toBe('hearing')
  })
})

describe('resolveChoice', () => {
  it('setsFlag があるとフラグが立ち、元の集合を破壊しない', () => {
    const base = new Set<GameFlag>()
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
  it('一致が複数あるとき pickRandom に応じて要素が選ばれ、上限は最後の要素にクランプされる', () => {
    const ev = (id: string): GameEvent => ({
      id,
      sprint: 1,
      ceremony: 'daily',
      segment: 'genba',
      title: '',
      narrative: '',
      choices: [],
    })
    const pool = [ev('g0'), ev('g1'), ev('g2')] // genba が3件
    expect(drawEvent(pool, 'genba', 0).event?.id).toBe('g0') // 下端
    expect(drawEvent(pool, 'genba', 0.5).event?.id).toBe('g1') // 中間（index0固定デグレを検出）
    expect(drawEvent(pool, 'genba', 0.99).event?.id).toBe('g2') // 上端近傍
    expect(drawEvent(pool, 'genba', 1).event?.id).toBe('g2') // 契約上限1でも範囲外参照しない（Math.min クランプ）
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

  // しきい値の「ちょうど境界」を踏み、>= を > 等にずらす off-by-one を検出できるようにする
  describe('エンディング閾値の境界値', () => {
    it('trueFde はちょうど 7/6/6 で成立する', () => {
      expect(evaluateEnding(ENDINGS, meters({ trust: 7, insight: 6, culture: 6 })).id).toBe('trueFde')
    })
    it('trueFde は各次元を1下回ると成立しない（→及第点）', () => {
      expect(evaluateEnding(ENDINGS, meters({ trust: 6, insight: 6, culture: 6 })).id).toBe('decent')
      expect(evaluateEnding(ENDINGS, meters({ trust: 7, insight: 5, culture: 6 })).id).toBe('decent')
      expect(evaluateEnding(ENDINGS, meters({ trust: 7, insight: 6, culture: 5 })).id).toBe('decent')
    })
    it('disliked はちょうど trust=2 で成立する', () => {
      expect(evaluateEnding(ENDINGS, meters({ trust: 2, insight: 8 })).id).toBe('disliked')
    })
    it('orderTaker はちょうど insight=3 で成立し、insight=4 では成立しない', () => {
      expect(evaluateEnding(ENDINGS, meters({ trust: 6, insight: 3, culture: 5 })).id).toBe('orderTaker')
      expect(evaluateEnding(ENDINGS, meters({ trust: 6, insight: 4, culture: 5 })).id).toBe('decent')
    })
    it('hero はちょうど trust=4・culture=2 で成立し、trust=3 では成立しない', () => {
      expect(evaluateEnding(ENDINGS, meters({ trust: 4, insight: 7, culture: 2 })).id).toBe('hero')
      expect(evaluateEnding(ENDINGS, meters({ trust: 3, insight: 7, culture: 2 })).id).toBe('decent')
    })
    it('disliked と orderTaker が同時成立なら、配列順で先の disliked を優先する', () => {
      // trust<=2 かつ insight<=3 の複合失敗。順序不変条件（disliked が先）を固定する
      expect(evaluateEnding(ENDINGS, meters({ trust: 1, insight: 1 })).id).toBe('disliked')
    })
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

describe('FDE心得デッキの健全性', () => {
  it('心得は100箇条で、IDは1..100で重複なし', () => {
    expect(PRECEPTS).toHaveLength(100)
    const ids = PRECEPTS.map((p) => p.id)
    expect(new Set(ids).size).toBe(100)
    expect(Math.min(...ids)).toBe(1)
    expect(Math.max(...ids)).toBe(100)
  })
  it('EVENT_PRECEPTS のキーは実在イベント、値は 1..100 の有効な心得ID', () => {
    const eventIds = new Set(EVENTS.map((e) => e.id))
    const preceptIds = new Set(PRECEPTS.map((p) => p.id))
    for (const [eventId, ids] of Object.entries(EVENT_PRECEPTS)) {
      expect(eventIds.has(eventId), `未知のイベントID: ${eventId}`).toBe(true)
      for (const id of ids) {
        expect(preceptIds.has(id), `${eventId} が未定義の心得 #${id} を参照`).toBe(true)
      }
    }
  })
  it('全イベントが最低1つの心得を体現している', () => {
    for (const e of EVENTS) {
      expect((EVENT_PRECEPTS[e.id] ?? []).length, `${e.id} に心得タグが無い`).toBeGreaterThan(0)
    }
  })
  it('100箇条すべてが最低1つのイベントで体現されている（全網羅）', () => {
    const covered = new Set(Object.values(EVENT_PRECEPTS).flat())
    const missing = PRECEPTS.map((p) => p.id).filter((id) => !covered.has(id))
    expect(missing, `未カバーの心得: ${missing.join(', ')}`).toEqual([])
  })
})

describe('生成AIトークン経済のバランス（資源として意味を持つ）', () => {
  const tokenChoices = EVENTS.flatMap((e) =>
    e.choices.filter((c) => (c.tokenCost ?? 0) > 0).map((c) => ({ e, c })),
  )

  it('tokenCost は正の整数で、単発でも予算内（必ず最初は選べる）', () => {
    for (const { e, c } of tokenChoices) {
      const cost = c.tokenCost as number
      expect(Number.isInteger(cost) && cost > 0, `${e.id}/${c.id}`).toBe(true)
      expect(cost, `${e.id}/${c.id} が単発で予算超過`).toBeLessThanOrEqual(AI_TOKENS_MAX)
    }
  })

  it('AI消費の総量 > 予算 ＝「全部はAIに頼れない」配分ゲームになっている', () => {
    const total = tokenChoices.reduce((s, { c }) => s + (c.tokenCost as number), 0)
    expect(total, `総消費 ${total} は予算 ${AI_TOKENS_MAX} を超えるべき`).toBeGreaterThan(AI_TOKENS_MAX)
  })

  it('終盤 s3-daily-ai-regression に“トークンゲートの良い選択”がある（過信＝枯渇のツケ）', () => {
    const reg = EVENTS.find((e) => e.id === 's3-daily-ai-regression')
    expect(reg, 'ai-regression が見つからない').toBeDefined()
    const gated = reg?.choices.find((c) => (c.tokenCost ?? 0) > 0)
    expect(gated, 'トークン消費の選択が無い').toBeDefined()
    // 良い選択（warn でなく、負メーターを持たない）であること＝枯渇すると“良い手”を失う
    expect(gated?.warn ?? false).toBe(false)
    for (const v of Object.values(gated?.effects ?? {})) expect(v).toBeGreaterThanOrEqual(0)
  })

  it('丸投げ（aiOverreliance を立てる選択）は必ずトークンを消費する', () => {
    for (const e of EVENTS) {
      for (const c of e.choices) {
        if (c.setsFlag === 'aiOverreliance') {
          expect((c.tokenCost ?? 0) > 0, `${e.id}/${c.id} 丸投げなのに無消費`).toBe(true)
        }
      }
    }
  })
})
