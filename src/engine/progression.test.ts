import { describe, expect, it } from 'vitest'
import { EVENTS, SPRINTS, STARTING_METERS } from '../data/chapters/chapter-01'
import type { Choice, Effects, GameEvent, GameFlag, Meters, Status } from '../types'
import { availableEvents } from './game'
import { locationOf } from '../data/locations'
import {
  type Persisted,
  type ProgressCore,
  advanceCore,
  arriveCore,
  chooseCore,
  dismissResultCore,
  finalEndingFor,
  freshCore,
  isRouletteCeremony,
  proceedCore,
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
      resolvedIds: new Set(['s1-plan-goal']),
    }
    const next = spinCore(core, 'kokyaku', 0)
    expect(next.status).toBe('playing')
    expect(next.beatIndex).toBe(1)
    expect(next.currentEvent).toBeNull()
  })
})

describe('proceedCore / isRouletteCeremony（単発セレモニーの「進める」）', () => {
  it('デイリーだけルーレットを回す', () => {
    expect(isRouletteCeremony('daily')).toBe(true)
    expect(isRouletteCeremony('planning')).toBe(false)
    expect(isRouletteCeremony('review')).toBe(false)
    expect(isRouletteCeremony('retro')).toBe(false)
  })
  it('プランニングで進めると最初の出せるイベント（KPI/ゴール）が必ず出る', () => {
    const next = proceedCore(freshCore(STARTING_METERS))
    expect(next.status).toBe('event')
    expect(next.currentEvent?.id).toBe('s1-plan-goal')
    expect(next.unexpected).toBe(false)
  })
  it('playing 以外では何もしない', () => {
    const core = eventCore()
    expect(proceedCore(core)).toBe(core)
  })
  it('出せるイベントが尽きていれば素通りで次へ', () => {
    const next = proceedCore({
      ...freshCore(STARTING_METERS),
      resolvedIds: new Set(['s1-plan-goal']),
    })
    expect(next.status).toBe('playing')
    expect(next.beatIndex).toBe(1)
  })
})

describe('chooseCore — 効果適用と結果ビュー', () => {
  it('効果が反映され、結果ビューが付き、次ビートへ進む', () => {
    const next = chooseCore(eventCore({ meters: m() }), choice({ trust: 1, culture: -1 }))
    expect(next.meters).toEqual(m({ trust: 6, culture: 2 }))
    expect(next.result?.resultText).toBe('R')
    expect(next.beatIndex).toBe(1)
    expect(next.status).toBe('playing')
  })
  it('選択ごとに log エントリが1件追記され、選んだ event/choice の内容を保持する', () => {
    const before = eventCore({ meters: m() })
    const next = chooseCore(before, choice({ trust: 1 }))
    expect(next.log).toHaveLength(before.log.length + 1)
    expect(next.log.at(-1)).toEqual({
      sprint: 1,
      ceremony: 'daily',
      eventTitle: 'T',
      choiceLabel: 'L',
      resultText: 'R',
    })
  })
  it('setsFlag でフラグが立つ', () => {
    const next = chooseCore(eventCore(), choice({}, { setsFlag: 'wrongKpi' }))
    expect(next.flags.has('wrongKpi')).toBe(true)
  })
  it('実行ティアで主正メーターだけ倍率調整される（great/good/poor）', () => {
    const base = eventCore({ meters: m() }) // trust5 insight3 culture3
    // good=既存挙動。insight が主正
    expect(chooseCore(base, choice({ insight: 1, culture: 1 }), 'good').meters).toEqual(
      m({ insight: 4, culture: 4 }),
    )
    // great=主正(insight)+1
    expect(chooseCore(base, choice({ insight: 1, culture: 1 }), 'great').meters).toEqual(
      m({ insight: 5, culture: 4 }),
    )
    // poor=主正(insight)-1（伸びしろを取り逃すだけ）
    expect(chooseCore(base, choice({ insight: 1, culture: 1 }), 'poor').meters).toEqual(
      m({ insight: 3, culture: 4 }),
    )
    // 引数省略時は good 相当
    expect(chooseCore(base, choice({ insight: 1, culture: 1 })).meters).toEqual(
      m({ insight: 4, culture: 4 }),
    )
  })
  it('poor は負効果を増やさず、0ルール敗北を新たに生まない', () => {
    // warn 選択 {trust:1, culture:-1} を poor 実行: trust の伸びを取り逃すが culture-1 は不変
    const next = chooseCore(eventCore({ meters: m({ culture: 1 }) }), choice({ trust: 1, culture: -1 }), 'poor')
    expect(next.meters).toEqual(m({ culture: 0, trust: 5 }))
    // culture が 0 ちょうど → 0ルール発火（poor がさらに負を足したからではなく、選択本来の代償）
    expect(next.ending?.id).toBe('fail-culture')
  })
  it('結果ビューに実行ティアと主正の増減が載る', () => {
    const next = chooseCore(eventCore({ meters: m() }), choice({ insight: 1 }), 'great')
    expect(next.result?.execTier).toBe('great')
    expect(next.result?.execPrimary).toBe('insight')
    expect(next.result?.execDelta).toBe(1)
    expect(next.result?.effects).toEqual({ insight: 2 })
    expect(next.result?.minigameKind).toBe('hearing') // synthEvent は segment 'genba' → hearing
    // poor 実行は結果ビューに負の execDelta を載せる（結果バッジの「取り逃した」表示の根拠）
    const poor = chooseCore(eventCore({ meters: m() }), choice({ insight: 1 }), 'poor')
    expect(poor.result?.execDelta).toBe(-1)
    expect(poor.result?.execPrimary).toBe('insight')
  })
  it('in-game 経路でも 0..10 にクランプされる（上限）', () => {
    const next = chooseCore(eventCore({ meters: m({ trust: 9 }) }), choice({ trust: 5 }))
    expect(next.meters.trust).toBe(10)
  })
  it('in-game 経路でも 0..10 にクランプされる（下限・負値にしない）', () => {
    const next = chooseCore(eventCore({ meters: m({ trust: 1 }) }), choice({ trust: -5 }))
    expect(next.meters.trust).toBe(0) // -4 でなく 0。0ルールで fail-trust になる
    expect(next.ending?.id).toBe('fail-trust')
  })
  it('status!==event / currentEvent無し では何もしない', () => {
    const core = freshCore(STARTING_METERS)
    expect(chooseCore(core, choice({ trust: 1 }))).toBe(core)
  })
  it('currentEvent はあるが status!==event なら何もしない（status ガード単独の固定）', () => {
    // currentEvent 非null かつ status='playing'。!event 側では短絡しないので status ガードを独立検証
    const core = eventCore({ status: 'playing' })
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
    expect(next.ending?.id).toBe('decent') // 開始5/4/4 のまま終わると及第点
  })
})

describe('フラグ→Sprint3 手戻りイベントの結合', () => {
  // 配列順に依存せず「フラグで手戻りがプールに出入りする」不変条件そのものを検証する
  const sprint3DailyPoolIds = (flags: GameFlag[]) =>
    availableEvents(EVENTS, 3, 'daily', new Set<string>(), new Set(flags)).map((e) => e.id)

  it('wrongKpi 立ちのときだけ手戻りイベントが抽選プールに含まれる', () => {
    expect(sprint3DailyPoolIds(['wrongKpi'])).toContain('s3-daily-rework')
  })
  it('wrongKpi 無しなら手戻りイベントはプールから除外される', () => {
    expect(sprint3DailyPoolIds([])).not.toContain('s3-daily-rework')
  })
  it('aiOverreliance 立ちのときだけ AI退化イベントが抽選プールに含まれる', () => {
    expect(sprint3DailyPoolIds(['aiOverreliance'])).toContain('s3-daily-ai-regression')
  })
  it('aiOverreliance 無しなら AI退化イベントはプールから除外される', () => {
    expect(sprint3DailyPoolIds([])).not.toContain('s3-daily-ai-regression')
  })
})

describe('主軸の分岐：背骨バリアント（topDown / genbaTrust）', () => {
  // proceedCore は単発セレモニーで availableEvents の先頭(配列順)を出す。
  // フラグ一致のバリアントを既定の前に置いているので、先頭IDが経路で変わる。
  const firstOf = (ceremony: 'review' | 'retro', flags: GameFlag[]) =>
    availableEvents(EVENTS, 3, ceremony, new Set<string>(), new Set(flags))[0]?.id

  it('Sprint3 レビューは topDown→topdown版 / genbaTrust→trust版 / 無フラグ→既定', () => {
    expect(firstOf('review', ['topDown'])).toBe('s3-review-topdown')
    expect(firstOf('review', ['genbaTrust'])).toBe('s3-review-trust')
    expect(firstOf('review', [])).toBe('s3-review')
  })
  it('Sprint3 レトロも経路で分岐する', () => {
    expect(firstOf('retro', ['topDown'])).toBe('s3-retro-topdown')
    expect(firstOf('retro', ['genbaTrust'])).toBe('s3-retro-trust')
    expect(firstOf('retro', [])).toBe('s3-retro')
  })
  it('分岐点 s2-retro の選択で genbaTrust / topDown が立つ', () => {
    const s2retro = EVENTS.find((e) => e.id === 's2-retro')
    if (!s2retro) throw new Error('s2-retro not found')
    const top = chooseCore(eventCore({ currentEvent: s2retro }), s2retro.choices[0])
    expect(top.flags.has('topDown')).toBe(true)
    const trust = chooseCore(eventCore({ currentEvent: s2retro }), s2retro.choices[1])
    expect(trust.flags.has('genbaTrust')).toBe(true)
  })
})

describe('不正暴露アーク：フィナーレ（finalEndingFor / circular ゲート）', () => {
  const flags = (...f: GameFlag[]) => new Set<GameFlag>(f)
  it('暴露の決断済みフラグ → 専用フィナーレED・finalePending=false', () => {
    expect(finalEndingFor(m(), flags('complicit')).ending?.id).toBe('finale-complicit')
    expect(finalEndingFor(m(), flags('coopted')).ending?.id).toBe('finale-coopted')
    expect(finalEndingFor(m(), flags('complicit')).finalePending).toBe(false)
  })
  it('暴く(exposed)は、動かぬ証拠(fraudCase)を固めていれば成立、無ければ握り潰される', () => {
    expect(finalEndingFor(m(), flags('exposed', 'fraudCase')).ending?.id).toBe('finale-expose')
    expect(finalEndingFor(m(), flags('exposed')).ending?.id).toBe('finale-expose-weak')
  })
  it('未決断だが手がかり(fraudClue)あり → ending=null・finalePending=true', () => {
    const fin = finalEndingFor(m(), flags('fraudClue'))
    expect(fin.ending).toBeNull()
    expect(fin.finalePending).toBe(true)
  })
  it('手がかり無し → 従来のメーター駆動エンディング', () => {
    expect(finalEndingFor(m({ trust: 8, insight: 7, culture: 7 }), flags()).ending?.id).toBe('trueFde')
    expect(finalEndingFor(m({ trust: 8, insight: 7, culture: 7 }), flags()).finalePending).toBe(false)
  })
  it('完走を advanceCore で迎えると、fraudClue で finalePending、決断後は専用ED（往復で保たれる）', () => {
    const lastBeat = SPRINTS[SPRINTS.length - 1].beats.length - 1
    const core: ProgressCore = {
      ...freshCore(STARTING_METERS),
      sprintIndex: SPRINTS.length - 1,
      beatIndex: lastBeat,
      flags: flags('fraudClue'),
    }
    const ended = advanceCore(core)
    expect(ended.status).toBe('ended')
    expect(ended.finalePending).toBe(true)
    expect(ended.ending).toBeNull()
    // 決断（exposed＋fraudCase）を永続相当で復元 → 告発成立ED（往復で保たれる）
    const restored = restoreCore(toPersisted({ ...ended, flags: flags('fraudClue', 'fraudCase', 'exposed') }))
    expect(restored.finalePending).toBe(false)
    expect(restored.ending?.id).toBe('finale-expose')
  })
  it('循環取引イベントは fraudClue がある時だけ Sprint3 daily プールに入る', () => {
    const pool = (f: GameFlag[]) =>
      availableEvents(EVENTS, 3, 'daily', new Set<string>(), new Set(f)).map((e) => e.id)
    expect(pool(['fraudClue'])).toContain('s3-daily-circular')
    expect(pool([])).not.toContain('s3-daily-circular')
  })
})

describe('spinCore — 想定外(unexpected)の分岐', () => {
  // sprint1 daily で、要求セグメント以外の1セグメントだけ残るよう他を解決済みにする。
  // 実IDをデータから動的に取るので、イベントの並び替え・増減に影響されない。
  const sprint1DailyAll = availableEvents(EVENTS, 1, 'daily', new Set<string>(), new Set<GameFlag>())
  const keepSeg = 'team' as const
  const requestSeg = 'genba' as const
  const resolvedExceptTeam = new Set(
    sprint1DailyAll.filter((e) => e.segment !== keepSeg).map((e) => e.id),
  )

  it('デイリーで該当セグメントが尽きていれば、別イベントを unexpected=true で出す（travel へ）', () => {
    const core: ProgressCore = {
      ...freshCore(STARTING_METERS),
      beatIndex: 1, // 最初の daily
      resolvedIds: resolvedExceptTeam,
    }
    const next = spinCore(core, requestSeg, 0)
    expect(next.status).toBe('travel') // デイリーは朝会＋マップ移動を挟む
    expect(next.currentEvent?.segment).toBe(keepSeg) // 想定外＝別セグメントが出る
    expect(next.unexpected).toBe(true)
  })

  it('デイリー以外（プランニング）では travel を挟まず直接 event・unexpected 抑制', () => {
    // sprint1 planning はイベント1件のみ。非該当セグメントを要求すると drawEvent は
    // unexpected=true を返すが、spinCore はデイリー以外なので false へ抑制し、直接 event
    const next = spinCore(freshCore(STARTING_METERS), 'genba', 0)
    expect(next.status).toBe('event')
    expect(next.currentEvent?.id).toBe('s1-plan-goal')
    expect(next.unexpected).toBe(false)
    expect(next.pendingLocation).toBeNull()
  })
})

describe('arriveCore — デイリーのマップ移動（リモート朝会の後）', () => {
  // sprint1 daily を回して travel に入った core を作る
  const travelCore = (): ProgressCore => {
    const next = spinCore({ ...freshCore(STARTING_METERS), beatIndex: 1 }, 'genba', 0)
    expect(next.status).toBe('travel')
    return next
  }

  it('spinCore はデイリーで travel になり、pendingLocation がイベントの場所に一致', () => {
    const t = travelCore()
    expect(t.pendingLocation).not.toBeNull()
    expect(t.pendingLocation).toBe(locationOf(t.currentEvent!))
    expect(t.peekLocation).toBeNull()
  })

  it('正しい場所へ着くと event に進む（currentEvent は維持）', () => {
    const t = travelCore()
    const arrived = arriveCore(t, t.pendingLocation!)
    expect(arrived.status).toBe('event')
    expect(arrived.currentEvent).toBe(t.currentEvent)
    expect(arrived.peekLocation).toBeNull()
  })

  it('違う場所を選ぶと travel のまま peekLocation を立てるだけ（ペナルティ無し）', () => {
    const t = travelCore()
    const wrong = (['warehouse', 'serverroom', 'client', 'devroom'] as const).find(
      (l) => l !== t.pendingLocation,
    )!
    const peeked = arriveCore(t, wrong)
    expect(peeked.status).toBe('travel')
    expect(peeked.peekLocation).toBe(wrong)
    expect(peeked.meters).toEqual(t.meters) // メーターは動かない
    expect(peeked.currentEvent).toBe(t.currentEvent)
  })

  it('travel 以外では arriveCore は何もしない', () => {
    const core = freshCore(STARTING_METERS)
    expect(arriveCore(core, 'warehouse')).toBe(core)
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
      log: [
        { sprint: 1, ceremony: 'planning', eventTitle: 'ゴール', choiceLabel: '置く', resultText: '前進' },
        { sprint: 1, ceremony: 'daily', eventTitle: '現場', choiceLabel: '見る', resultText: '発見' },
      ],
      sprintIndex: 1,
      beatIndex: 3,
    }
    const restored = restoreCore(toPersisted(core))
    expect(restored.meters).toEqual(core.meters)
    expect([...restored.flags]).toEqual(['wrongKpi'])
    expect([...restored.resolvedIds]).toEqual(['a', 'b'])
    expect(restored.log).toEqual(core.log) // 非空 log が順序ごと往復で保たれる
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
