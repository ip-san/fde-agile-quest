import { describe, expect, it } from 'vitest'
import type { GameFlag } from '../types'
import { EVENTS } from './chapters/chapter-01'
import { THREADS } from './threads'

// 伏線レジストリ（threads.ts）の宣言と、章データ（setsFlag/missedFlag/requiresFlag）の整合を検証する。
// 目的: 増築で「立てたが回収しない／回収するが立てられない」伏線（張りっぱなし・宙づり）を防ぐ。

const flags = Object.keys(THREADS) as GameFlag[]

// データから実際の仕掛け／回収経路を収集
const choiceSet = new Set<GameFlag>() // setsFlag で立つ
const missedSet = new Set<GameFlag>() // missedFlag（見送り）で立つ
const eventPayoff = new Set<GameFlag>() // requiresFlag で回収（イベント出現）
for (const e of EVENTS) {
  if (e.missedFlag) missedSet.add(e.missedFlag)
  if (e.requiresFlag) eventPayoff.add(e.requiresFlag)
  for (const c of e.choices) if (c.setsFlag) choiceSet.add(c.setsFlag)
}

describe('伏線レジストリ（threads）の整合性', () => {
  it('全スレッドが仕掛け(setVia)と回収(payoffVia)を1つ以上持つ（孤立なし）', () => {
    const bad = flags.filter((f) => THREADS[f].setVia.length === 0 || THREADS[f].payoffVia.length === 0)
    expect(bad, `仕掛け/回収が空のスレッド: ${bad.join(', ')}`).toEqual([])
  })

  it("setVia:'choice' の宣言とデータ（setsFlag）が一致する", () => {
    const drift = flags.filter((f) => THREADS[f].setVia.includes('choice') !== choiceSet.has(f))
    expect(drift, `choice 宣言とデータの不一致: ${drift.join(', ')}`).toEqual([])
  })

  it("setVia:'missed' の宣言とデータ（missedFlag）が一致する", () => {
    const drift = flags.filter((f) => THREADS[f].setVia.includes('missed') !== missedSet.has(f))
    expect(drift, `missed 宣言とデータの不一致: ${drift.join(', ')}`).toEqual([])
  })

  it("payoffVia:'event' の宣言とデータ（requiresFlag）が一致する", () => {
    const drift = flags.filter((f) => THREADS[f].payoffVia.includes('event') !== eventPayoff.has(f))
    expect(drift, `event payoff 宣言とデータの不一致: ${drift.join(', ')}`).toEqual([])
  })

  it('イベントで回収する伏線は、それを立てる手段（choice/missed）がデータに必ず存在する（宙づり防止）', () => {
    const orphan = flags.filter((f) => THREADS[f].payoffVia.includes('event') && !choiceSet.has(f) && !missedSet.has(f))
    expect(orphan, `回収イベントはあるが立てる手段が無い: ${orphan.join(', ')}`).toEqual([])
  })

  it('データに現れる setsFlag/missedFlag/requiresFlag はすべてレジストリに登録済み', () => {
    const known = new Set(flags)
    const unknown = [...choiceSet, ...missedSet, ...eventPayoff].filter((f) => !known.has(f))
    expect([...new Set(unknown)], `レジストリ未登録のフラグ: ${unknown.join(', ')}`).toEqual([])
  })

  // Phase 2（回収保証・作問レベル）: フラグはスプリントをまたいで保持され、requiresFlag イベントは
  // 「フラグが立った後」のスプリントでしか出ない。回収イベントが“仕掛けより前のスプリント”に置かれていると
  // 構造的に永久到達不能（宙づり）になる。これを作問時に弾く。
  it('イベントで回収する伏線は、回収イベントのスプリントが最初の仕掛けスプリント以降にある（構造的到達可能）', () => {
    const minSprintOf = (pred: (e: (typeof EVENTS)[number]) => boolean): number | null => {
      const ss = EVENTS.filter(pred).map((e) => e.sprint)
      return ss.length ? Math.min(...ss) : null
    }
    const unreachable: string[] = []
    for (const f of flags) {
      if (!THREADS[f].payoffVia.includes('event')) continue
      const minSetter = minSprintOf((e) => e.missedFlag === f || e.choices.some((c) => c.setsFlag === f))
      const minPayoff = minSprintOf((e) => e.requiresFlag === f)
      // event payoff があるのに setter が無い／回収が仕掛けより前 → 到達不能
      if (minPayoff !== null && (minSetter === null || minPayoff < minSetter)) {
        unreachable.push(`${f}(setter:S${minSetter ?? '∅'}/payoff:S${minPayoff})`)
      }
    }
    expect(unreachable, `回収イベントが構造的に到達不能: ${unreachable.join(', ')}`).toEqual([])
  })
})
