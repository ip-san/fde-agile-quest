import { describe, expect, it } from 'vitest'
import { SPRINTS, STARTING_METERS } from '../data/chapters/chapter-01'
import type { Choice, Effects, GameEvent, GameFlag, Meters, Status } from '../types'
import {
  type Persisted,
  type ProgressCore,
  advanceCore,
  chooseCore,
  dismissResultCore,
  freshCore,
  restoreCore,
  spinCore,
  toPersisted,
  zeroedMeter,
} from './progression'

const synthEvent = (over: Partial<GameEvent> = {}): GameEvent => ({
  id: 'syn',
  sprint: 1,
  ceremony: 'daily',
  segment: 'genba',
  title: 'T',
  narrative: 'N',
  choices: [],
  ...over,
})

const choice = (effects: Effects, over: Partial<Choice> = {}): Choice => ({
  id: 'c',
  label: 'L',
  effects,
  resultText: 'R',
  ...over,
})

const eventCore = (over: Partial<ProgressCore> = {}): ProgressCore => ({
  ...freshCore(STARTING_METERS),
  status: 'event' as Status,
  currentEvent: synthEvent(),
  ...over,
})

const m = (over: Partial<Meters> = {}): Meters => ({ trust: 5, insight: 3, culture: 3, ...over })

describe('zeroedMeter', () => {
  it('0以下のメーターがあれば探索順(trust→insight→culture)で返す', () => {
    expect(zeroedMeter(m())).toBeUndefined()
    expect(zeroedMeter(m({ insight: 0 }))).toBe('insight')
    expect(zeroedMeter(m({ trust: 0, insight: 0 }))).toBe('trust') // 複数同時は trust 優先
  })
})

describe('spinCore', () => {
  it('プランニングで回すと該当イベントを引いて status=event', () => {
    const next = spinCore(freshCore(STARTING_METERS), 'kokyaku', 0)
    expect(next.status).toBe('event')
    expect(next.currentEvent?.id).toBe('s1-plan-goal')
  })
  it('playing 以外では何もしない', () => {
    const core = eventCore()
    expect(spinCore(core, 'genba', 0)).toBe(core)
  })
  it('出せるイベントが尽きたビートは素通りで次へ進む', () => {
    const core: ProgressCore = {
      ...freshCore(STARTING_METERS),
      resolvedIds: new Set(['s1-plan-goal', 's1-plan-invite']),
    }
    const next = spinCore(core, 'kokyaku', 0)
    expect(next.status).toBe('playing')
    expect(next.beatIndex).toBe(1)
    expect(next.currentEvent).toBeNull()
  })
})

describe('chooseCore — 効果適用と結果ビュー', () => {
  it('効果が反映され、結果ビューが付き、次ビートへ進む', () => {
    const next = chooseCore(eventCore(), choice({ trust: 1, culture: -1 }))
    expect(next.meters).toEqual(m({ trust: 6, culture: 2 }))
    expect(next.result?.resultText).toBe('R')
    expect(next.beatIndex).toBe(1)
    expect(next.status).toBe('playing')
  })
  it('setsFlag でフラグが立つ', () => {
    const next = chooseCore(eventCore(), choice({}, { setsFlag: 'wrongKpi' }))
    expect(next.flags.has('wrongKpi')).toBe(true)
  })
  it('status!==event / currentEvent無し では何もしない', () => {
    const core = freshCore(STARTING_METERS)
    expect(chooseCore(core, choice({ trust: 1 }))).toBe(core)
  })
})

describe('chooseCore — 0ルール（即バッドエンド）', () => {
  it('trust が0で fail-trust', () => {
    const next = chooseCore(eventCore({ meters: m({ trust: 1 }) }), choice({ trust: -1 }))
    expect(next.status).toBe('ended')
    expect(next.ending?.id).toBe('fail-trust')
    expect(next.result).not.toBeNull() // 結果ビューは出してからエンディングへ
  })
  it('insight が0で fail-insight', () => {
    const next = chooseCore(eventCore({ meters: m({ insight: 1 }) }), choice({ insight: -1 }))
    expect(next.ending?.id).toBe('fail-insight')
  })
  it('culture が0で fail-culture', () => {
    const next = chooseCore(eventCore({ meters: m({ culture: 1 }) }), choice({ culture: -1 }))
    expect(next.ending?.id).toBe('fail-culture')
  })
  it('複数同時0は trust 優先', () => {
    const next = chooseCore(
      eventCore({ meters: m({ trust: 1, insight: 1 }) }),
      choice({ trust: -1, insight: -1 }),
    )
    expect(next.ending?.id).toBe('fail-trust')
  })
})

describe('advanceCore — ビート/スプリント進行', () => {
  it('スプリント内はビートが進む', () => {
    const next = advanceCore(freshCore(STARTING_METERS))
    expect(next.sprintIndex).toBe(0)
    expect(next.beatIndex).toBe(1)
  })
  it('スプリント末で次スプリントへ繰り上がる', () => {
    const last = SPRINTS[0].beats.length - 1
    const next = advanceCore({ ...freshCore(STARTING_METERS), beatIndex: last })
    expect(next.sprintIndex).toBe(1)
    expect(next.beatIndex).toBe(0)
    expect(next.status).toBe('playing')
  })
  it('最終スプリント末でキャンペーン終了＋エンディング評価', () => {
    const lastSprint = SPRINTS.length - 1
    const lastBeat = SPRINTS[lastSprint].beats.length - 1
    const next = advanceCore({
      ...freshCore(STARTING_METERS),
      sprintIndex: lastSprint,
      beatIndex: lastBeat,
    })
    expect(next.status).toBe('ended')
    expect(next.ending?.id).toBe('orderTaker') // 開始3/3のまま終わると insight<=3
  })
})

describe('フラグ→Sprint3 手戻りイベントの結合', () => {
  const sprint3DailyCore = (flags: GameFlag[]): ProgressCore => ({
    ...freshCore(STARTING_METERS),
    sprintIndex: 2, // Sprint 3
    beatIndex: 1, // 最初の daily
    flags: new Set(flags),
  })
  it('wrongKpi 立ちなら trouble セグメントで手戻りが引ける', () => {
    const next = spinCore(sprint3DailyCore(['wrongKpi']), 'trouble', 0)
    expect(next.currentEvent?.id).toBe('s3-daily-rework')
  })
  it('wrongKpi 無しなら手戻りは出ない', () => {
    const next = spinCore(sprint3DailyCore([]), 'trouble', 0)
    expect(next.currentEvent?.id).not.toBe('s3-daily-rework')
  })
})

describe('restoreCore — 永続データからの復元', () => {
  const base: Persisted = {
    meters: m(),
    sprintIndex: 1,
    beatIndex: 2,
    resolvedIds: ['x'],
    flags: ['wrongKpi'],
    log: [],
  }
  it('進行中はそのまま playing', () => {
    const c = restoreCore(base)
    expect(c.status).toBe('playing')
    expect(c.ending).toBeNull()
    expect(c.flags.has('wrongKpi')).toBe(true)
    expect(c.sprintIndex).toBe(1)
  })
  it('保存メーターが0なら失敗エンディングを復元', () => {
    const c = restoreCore({ ...base, meters: m({ trust: 0 }) })
    expect(c.status).toBe('ended')
    expect(c.ending?.id).toBe('fail-trust')
  })
  it('キャンペーン完了状態は通常エンディングを復元', () => {
    const c = restoreCore({
      ...base,
      sprintIndex: SPRINTS.length,
      beatIndex: 0,
      meters: m({ trust: 8, insight: 7, culture: 7 }),
    })
    expect(c.status).toBe('ended')
    expect(c.ending?.id).toBe('trueFde')
  })
})

describe('toPersisted / restoreCore のラウンドトリップ', () => {
  it('進行中の中核状態が往復で保たれる', () => {
    const core: ProgressCore = {
      ...freshCore(STARTING_METERS),
      meters: m({ trust: 7 }),
      flags: new Set<GameFlag>(['wrongKpi']),
      resolvedIds: new Set(['a', 'b']),
      sprintIndex: 1,
      beatIndex: 3,
    }
    const restored = restoreCore(toPersisted(core))
    expect(restored.meters).toEqual(core.meters)
    expect([...restored.flags]).toEqual(['wrongKpi'])
    expect([...restored.resolvedIds]).toEqual(['a', 'b'])
    expect(restored.sprintIndex).toBe(1)
    expect(restored.beatIndex).toBe(3)
  })
})

describe('dismissResultCore', () => {
  it('結果ビューを消す', () => {
    const core = chooseCore(eventCore(), choice({ trust: 1 }))
    expect(core.result).not.toBeNull()
    expect(dismissResultCore(core).result).toBeNull()
  })
})
