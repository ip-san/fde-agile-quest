import { beforeAll, describe, expect, it } from 'vitest'
import type { GameEvent, LocationId, Segment } from '../types'
import { loadLateEvents } from './chapters/chapter-01'
import {
  LOCATION_BY_SEGMENT,
  LOCATION_ORDER,
  LOCATIONS,
  locationOf,
  QUIET_BY_LOCATION,
  SENSITIVE_FORBIDDEN,
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

let EVENTS: GameEvent[] = []
beforeAll(async () => {
  EVENTS = await loadLateEvents()
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

describe('standupFor（朝会＝競合する主張）', () => {
  it('複数候補に distinct な役割を割り当て、各声が自分の候補の場所を推す', () => {
    const cs: GameEvent[] = [
      synth({ id: 'a', segment: 'kokyaku', location: 'client' }),
      synth({ id: 'b', segment: 'trouble', location: 'serverroom' }),
      synth({ id: 'c', segment: 'team', location: 'devroom' }),
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

  it('イベント固有の hints がテンプレより優先して朝会に出る（人間味のある上書き／配線の固定）', () => {
    // advocacy 無し・hints 有り → その役割の hints がそのまま口上になる（hintsFor 廃止後の配線を固定）
    const v = standupFor([
      synth({ id: 'h', segment: 'kokyaku', location: 'client', hints: { po: '会議室で結城さんの本音を聞いてきて。' } }),
    ])
    expect(v[0].role).toBe('po')
    expect(v[0].line).toBe('会議室で結城さんの本音を聞いてきて。')
  })

  it('鉤括弧入りtitleでも二重カギ括弧にならない（bareTitle）', () => {
    const v = standupFor([
      synth({ id: 'q', segment: 'kokyaku', location: 'client', title: '「で、いくらで売れる？」' }),
    ])
    expect(v[0].line).not.toContain('「「')
    expect(v[0].line).not.toContain('」」')
    expect(v[0].line).toContain('で、いくらで売れる？')
  })

  it('全イベントの朝会口上が鉤括弧の入れ子（「「 / 」」）にならない', () => {
    const bad = EVENTS.map((e) => ({ id: e.id, line: standupFor([e])[0]?.line ?? '' }))
      .filter(({ line }) => line.includes('「「') || line.includes('」」'))
      .map(({ id, line }) => `${id}: ${line}`)
    expect(bad, bad.join('\n')).toEqual([])
  })

  it('題の"途中"に「」を含む題がテンプレに落ちても、外側「」と入れ子にせず内部を『』へ自然化する', () => {
    // 上書き(advocacy/hints)の無い合成イベント＝テンプレ経路。内部「」が外側「」と入れ子になる退行を防ぐ。
    const v = standupFor([
      synth({ id: 'z', segment: 'kokyaku', location: 'client', title: '親会社からの「実証デモ」要求' }),
    ])
    expect(v[0].line).not.toContain('「「')
    expect(v[0].line).not.toContain('実証デモ」') // 内部「」が残っていない
    expect(v[0].line).toContain('『実証デモ』')
  })

  it('人事/総務/経理/不正の題材は"価値/障害/コード"の語彙で称揚・矮小化しない（中立バンク）', () => {
    // 実イベントのうち sensitive（人事/総務/経理 ロケーション or 不正フラグ）を単独候補で朝会化し、
    // 不適切な持ち上げ・タスク化の語が出ないことを保証する（禁止語は実装と同じ単一の真実源）
    const sensitive = EVENTS.filter((e) => {
      const loc = locationOf(e)
      const fraud = (f?: string) => f === 'fraudClue' || f === 'fraudCase'
      return (
        e.sensitive ||
        loc === 'soumu' ||
        loc === 'jinji' ||
        loc === 'keiri' ||
        fraud(e.requiresFlag) ||
        e.choices.some((c) => fraud(c.setsFlag))
      )
    })
    expect(sensitive.length).toBeGreaterThan(0)
    for (const e of sensitive) {
      const line = standupFor([e])[0].line
      for (const bad of SENSITIVE_FORBIDDEN) expect(line, `${e.id}: ${line}`).not.toContain(bad)
    }
  })

  it('sensitive:true は場所に依らず中立ルーティングを起動する（コスト圧力・本社通達・下請け値下げ等）', () => {
    // 人事/総務/経理でも不正フラグでもない（場所=client既定）が、明示マークで中立に回る。
    // 禁止語入りの hints を与えても採用されず、SENSITIVE_LINES へ差し戻る。
    const v = standupFor([
      synth({ id: 'cc', segment: 'kokyaku', sensitive: true, hints: { po: 'コストを片付けて価値に直結させる。' } }),
    ])
    expect(v[0].line).not.toBe('コストを片付けて価値に直結させる。')
    for (const bad of SENSITIVE_FORBIDDEN) expect(v[0].line).not.toContain(bad)
  })

  it('sensitive 事案で上書き(hints/advocacy)が禁止語を含んでも、実行時に中立テンプレへ差し戻す', () => {
    // 経理(sensitive)に禁止語入りの hints を与える → 採用されず中立 SENSITIVE_LINES に戻る
    const v = standupFor([
      synth({ id: 'sx', segment: 'kokyaku', location: 'keiri', hints: { po: '経理部で売上を立てるのを進めて。' } }),
    ])
    expect(v[0].line).not.toBe('経理部で売上を立てるのを進めて。')
    for (const bad of SENSITIVE_FORBIDDEN) expect(v[0].line).not.toContain(bad)
  })
})
