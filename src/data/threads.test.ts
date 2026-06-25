import { beforeAll, describe, expect, it } from 'vitest'
import type { GameEvent, GameFlag } from '../types'
import { DISCOVERABLE_BACKLOG, EVENT_BACKLOG, loadLateEvents, PRODUCT_BACKLOG, SPRINTS } from './chapters/chapter-01'
import { openThreads, THREADS } from './threads'

// 伏線レジストリ（threads.ts）の宣言と、章データ（setsFlag/missedFlag/requiresFlag）の整合を検証する。
// 目的: 増築で「立てたが回収しない／回収するが立てられない」伏線（張りっぱなし・宙づり）を防ぐ。

const flags = Object.keys(THREADS) as GameFlag[]

let EVENTS: GameEvent[] = []
// データから実際の仕掛け／回収経路を収集
let choiceSet = new Set<GameFlag>() // setsFlag で立つ
let missedSet = new Set<GameFlag>() // missedFlag（見送り）で立つ
let eventPayoff = new Set<GameFlag>() // requiresFlag で回収（イベント出現）

beforeAll(async () => {
  EVENTS = await loadLateEvents()
  choiceSet = new Set<GameFlag>()
  missedSet = new Set<GameFlag>()
  eventPayoff = new Set<GameFlag>()
  for (const e of EVENTS) {
    if (e.missedFlag) missedSet.add(e.missedFlag)
    if (e.requiresFlag) eventPayoff.add(e.requiresFlag)
    for (const c of e.choices) if (c.setsFlag) choiceSet.add(c.setsFlag)
  }
  // PBI の missedFlag（発見の信頼ゲート未達/poor で engine が立てる"掘り損ね"）も missed 経路として収集する。
  // ＝EVENTS だけ走査していると DISCOVERABLE_BACKLOG 由来の missedFlag を取りこぼし、宣言ドリフトを見逃すため。
  for (const p of [...PRODUCT_BACKLOG, ...DISCOVERABLE_BACKLOG]) {
    if (p.missedFlag) missedSet.add(p.missedFlag)
  }
})

describe('伏線レジストリ（threads）の整合性', () => {
  it('全スレッドが仕掛け(setVia)と回収(payoffVia)を1つ以上持つ（孤立なし）', () => {
    const bad = flags.filter((f) => THREADS[f].setVia.length === 0 || THREADS[f].payoffVia.length === 0)
    expect(bad, `仕掛け/回収が空のスレッド: ${bad.join(', ')}`).toEqual([])
  })

  it('全スレッドに note と teaser が設定されている', () => {
    const bad = flags.filter((f) => !THREADS[f].note.trim() || !THREADS[f].teaser.trim())
    expect(bad, `note/teaser 未設定: ${bad.join(', ')}`).toEqual([])
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

  // finale/kanban は resolveFinale／カンバンの reviewItem で立つ"データ外の経路"（threads.ts 参照）。
  // event データに setsFlag/missedFlag として現れないため、これらを仕掛けに持つ伏線は宙づり判定から除く。
  const hasDataExternalSetter = (f: GameFlag) => THREADS[f].setVia.some((v) => v === 'finale' || v === 'kanban')

  it('イベントで回収する伏線は、それを立てる手段（choice/missed/データ外経路）が必ず存在する（宙づり防止）', () => {
    const orphan = flags.filter(
      (f) =>
        THREADS[f].payoffVia.includes('event') && !choiceSet.has(f) && !missedSet.has(f) && !hasDataExternalSetter(f)
    )
    expect(orphan, `回収イベントはあるが立てる手段が無い: ${orphan.join(', ')}`).toEqual([])
  })

  it('データに現れる setsFlag/missedFlag/requiresFlag はすべてレジストリに登録済み', () => {
    const known = new Set(flags)
    const unknown = [...choiceSet, ...missedSet, ...eventPayoff].filter((f) => !known.has(f))
    expect([...new Set(unknown)], `レジストリ未登録のフラグ: ${unknown.join(', ')}`).toEqual([])
  })

  // Phase 2（回収保証・作問レベル）: requiresFlag イベントは「フラグが立った後」しか出ない。
  // スプリント番号だけでなく beat 順まで見て、各回収イベントが「最も早く立つ仕掛け」より後の
  // 同種 beat 枠に出られるかを検証する（同一スプリント内で回収が仕掛けより前にある作問ミスも弾く）。
  // ord = sprint*1000 + beatIndex。仕掛けは最速で"その種の最初の beat"で立つと仮定（最適手＝到達可能性の上限）。
  it('イベントで回収する伏線は、最も早い仕掛けより後の beat 枠に回収イベントが出られる（構造的到達可能）', () => {
    const beatsOf = (sprint: number) => SPRINTS.find((s) => s.n === sprint)?.beats ?? []
    const fireOrd = (e: GameEvent) => {
      const idx = beatsOf(e.sprint).indexOf(e.ceremony)
      return e.sprint * 1000 + (idx < 0 ? 999 : idx)
    }
    const unreachable: string[] = []
    for (const f of flags) {
      if (!THREADS[f].payoffVia.includes('event')) continue
      // データ外経路（finale/kanban）で立つ伏線は beat 枠を持たない＝この beat順検査の対象外（宙づり防止は上の it で担保）。
      if (hasDataExternalSetter(f)) continue
      const setters = EVENTS.filter((e) => e.missedFlag === f || e.choices.some((c) => c.setsFlag === f))
      const payoffs = EVENTS.filter((e) => e.requiresFlag === f)
      if (payoffs.length === 0) continue
      if (setters.length === 0) {
        unreachable.push(`${f}(仕掛け無し)`)
        continue
      }
      const minFire = Math.min(...setters.map(fireOrd))
      for (const pe of payoffs) {
        // pe.ceremony の beat 枠が pe.sprint 内に、minFire より後（ord 大）で存在するか
        const ok = beatsOf(pe.sprint).some((b, j) => b === pe.ceremony && pe.sprint * 1000 + j > minFire)
        if (!ok) unreachable.push(`${f}:${pe.id}`)
      }
    }
    expect(unreachable, `beat順で到達不能な回収イベント: ${unreachable.join(', ')}`).toEqual([])
  })
})

describe('openThreads（盤面の未回収伏線）', () => {
  it('立っていて未回収の event 伏線だけを返す（ending/score は除外）', () => {
    // missedHearing=event回収・未回収→出る／exposed=ending専用回収→出ない
    const open = openThreads(['missedHearing', 'exposed'], () => false)
    expect(open.map((t) => t.flag)).toEqual(['missedHearing'])
    expect(open[0].teaser).toBe(THREADS.missedHearing.teaser)
  })

  it('回収済み（payoff解決）になったら返さない', () => {
    expect(openThreads(['missedHearing'], () => true)).toEqual([])
  })

  it('立っていないフラグは返さない', () => {
    expect(openThreads([], () => false)).toEqual([])
  })
})

describe('PBI 分割定義（split）の整合性', () => {
  it('split を持つ PBI は、作業項目の見積り合計が親 PBI の見積りと一致する', () => {
    const bad = [...PRODUCT_BACKLOG, ...DISCOVERABLE_BACKLOG]
      .filter((p) => p.split && p.split.length > 0)
      .filter((p) => (p.split ?? []).reduce((s, w) => s + w.estimate, 0) !== p.estimate)
      .map((p) => p.id)
    expect(bad, `分割見積りの合計が親と不一致: ${bad.join(', ')}`).toEqual([])
  })
  it('split は2件以上（1件だけの分割は意味がない）', () => {
    const bad = [...PRODUCT_BACKLOG, ...DISCOVERABLE_BACKLOG]
      .filter((p) => p.split && p.split.length === 1)
      .map((p) => p.id)
    expect(bad, `分割が1件のみのPBI: ${bad.join(', ')}`).toEqual([])
  })
})

describe('イベント発PBI（addsPbi / EVENT_BACKLOG）の整合性', () => {
  it('Choice.addsPbi が参照する id はすべて EVENT_BACKLOG に存在する（タイポ・未定義の検知）', () => {
    const addsRefs = EVENTS.flatMap((e) => e.choices.flatMap((c) => (c.addsPbi ? [c.addsPbi.id] : [])))
    const eventIds = new Set(EVENT_BACKLOG.map((p) => p.id))
    const unknown = [...new Set(addsRefs)].filter((id) => !eventIds.has(id))
    expect(unknown, `EVENT_BACKLOG に無い addsPbi 参照: ${unknown.join(', ')}`).toEqual([])
  })

  it('EVENT_BACKLOG の各項目は origin:"event"（発見可 discoverable とは別系統＝重複フラグを持たない）', () => {
    const bad = EVENT_BACKLOG.filter((p) => p.origin !== 'event' || p.discoverable === true).map((p) => p.id)
    expect(bad, `origin 不整合 or discoverable と重複: ${bad.join(', ')}`).toEqual([])
  })

  it('EVENT_BACKLOG の id は PRODUCT_BACKLOG/DISCOVERABLE_BACKLOG と衝突しない（単一ソース）', () => {
    const others = new Set([...PRODUCT_BACKLOG, ...DISCOVERABLE_BACKLOG].map((p) => p.id))
    const collide = EVENT_BACKLOG.filter((p) => others.has(p.id)).map((p) => p.id)
    expect(collide, `id 衝突: ${collide.join(', ')}`).toEqual([])
  })

  it('各 EVENT_BACKLOG 項目は、少なくとも1つのイベント選択から受け入れ可能（孤立要望なし）', () => {
    const addsRefs = EVENTS.flatMap((e) => e.choices.flatMap((c) => (c.addsPbi ? [c.addsPbi.id] : [])))
    const referenced = new Set(addsRefs)
    const orphan = EVENT_BACKLOG.filter((p) => !referenced.has(p.id)).map((p) => p.id)
    expect(orphan, `どの選択からも受け入れられない要望: ${orphan.join(', ')}`).toEqual([])
  })
})
