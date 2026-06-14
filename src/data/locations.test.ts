import { describe, expect, it } from 'vitest'
import type { GameEvent, LocationId, Segment } from '../types'
import { EVENTS } from './chapters/chapter-01'
import { GLOSSARY } from './glossary'
import {
  DAILY_ROLE_ORDER,
  hintsFor,
  LOCATION_BY_SEGMENT,
  LOCATION_ORDER,
  LOCATIONS,
  locationOf,
  QUIET_BY_LOCATION,
  standupFor,
} from './locations'

const ALL_LOCATIONS = Object.keys(LOCATIONS) as LocationId[]
const ALL_SEGMENTS: Segment[] = ['genba', 'kokyaku', 'team', 'trouble', 'chance']

const synth = (over: Partial<GameEvent> = {}): GameEvent => ({
  id: 'syn',
  sprint: 1,
  ceremony: 'daily',
  segment: 'genba',
  title: 'T',
  narrative: 'N',
  choices: [],
  ...over,
})

describe('ロケーション定義の健全性', () => {
  it('LOCATION_BY_SEGMENT は全セグメントを有効な場所へ写像する', () => {
    for (const s of ALL_SEGMENTS) {
      expect(LOCATIONS[LOCATION_BY_SEGMENT[s]], s).toBeDefined()
    }
  })

  it('LOCATION_ORDER / QUIET_BY_LOCATION は全4箇所を過不足なく持つ', () => {
    expect([...LOCATION_ORDER].sort()).toEqual([...ALL_LOCATIONS].sort())
    expect(new Set(LOCATION_ORDER).size).toBe(LOCATION_ORDER.length) // 重複なし
    for (const l of ALL_LOCATIONS) expect(QUIET_BY_LOCATION[l], l).toBeTruthy()
  })

  it('全イベントの locationOf が実在する場所に解決される', () => {
    for (const e of EVENTS) {
      expect(ALL_LOCATIONS, `${e.id}`).toContain(locationOf(e))
    }
  })

  it('location 明示はそれを、未指定は segment 既定を返す', () => {
    expect(locationOf(synth({ segment: 'trouble' }))).toBe('serverroom')
    expect(locationOf(synth({ segment: 'trouble', location: 'warehouse' }))).toBe('warehouse')
  })
})

describe('リモート朝会のヒント（hintsFor）', () => {
  it('どの場所のイベントでも po/sm/dev の3ヒントが順に出て、空でない', () => {
    for (const l of ALL_LOCATIONS) {
      const hints = hintsFor(synth({ location: l }), 1)
      expect(hints.map((h) => h.role)).toEqual(DAILY_ROLE_ORDER)
      for (const h of hints) expect(h.line.length, `${l}/${h.role}`).toBeGreaterThan(0)
    }
  })

  it('イベント側 hints はその役割のヒントを上書きする', () => {
    const hints = hintsFor(synth({ location: 'warehouse', hints: { po: '上書きされたヒント' } }), 1)
    expect(hints.find((h) => h.role === 'po')?.line).toBe('上書きされたヒント')
    expect(hints.find((h) => h.role === 'sm')?.line).not.toBe('上書きされたヒント')
  })

  it('同じ入力なら毎回同じヒント（決定的＝乱数源に依存しない）', () => {
    const a = hintsFor(synth({ location: 'serverroom' }), 42)
    const b = hintsFor(synth({ location: 'serverroom' }), 42)
    expect(a).toEqual(b)
  })

  it('ヒント文中の {{用語}} は全て GLOSSARY に存在する', () => {
    const missing = new Set<string>()
    for (const l of ALL_LOCATIONS) {
      for (const h of hintsFor(synth({ location: l }), 0)) {
        for (const m of h.line.matchAll(/\{\{(.+?)\}\}/g)) {
          if (!GLOSSARY[m[1]]) missing.add(m[1])
        }
      }
    }
    expect([...missing]).toEqual([])
  })
})

describe('standupFor（朝会＝競合する主張）', () => {
  it('複数候補に distinct な役割を割り当て、各声が自分の候補の場所を推す', () => {
    const cs: GameEvent[] = [
      synth({ id: 'a', segment: 'kokyaku', location: 'client' }),
      synth({ id: 'b', segment: 'trouble', location: 'serverroom' }),
      synth({ id: 'c', segment: 'team', location: 'repo' }),
    ]
    const voices = standupFor(cs)
    expect(voices).toHaveLength(3)
    expect(new Set(voices.map((v) => v.role)).size).toBe(3) // 役割は重複しない
    for (const v of voices) {
      const c = cs.find((e) => e.id === v.eventId)!
      expect(v.location).toBe(locationOf(c)) // 自分の候補の場所を推す
      expect(v.line.length).toBeGreaterThan(0)
    }
    // 推す場所も互いに異なる（別々の論点）
    expect(new Set(voices.map((v) => v.location)).size).toBe(3)
  })

  it('候補1つなら声も1つ。advocacy 上書きが効く', () => {
    expect(standupFor([synth({ id: 'x' })])).toHaveLength(1)
    const v = standupFor([synth({ id: 'y', segment: 'kokyaku', advocacy: { po: '上書きの主張' } })])
    expect(v[0].line).toBe('上書きの主張')
  })
})
