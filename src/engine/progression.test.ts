import { describe, expect, it } from 'vitest'
import { EVENTS, SPRINTS, STARTING_METERS } from '../data/chapters/chapter-01'
import { locationOf } from '../data/locations'
import type { Choice, Effects, GameEvent, GameFlag, Meters, Status } from '../types'
import { availableEvents } from './game'
import {
  AI_TOKENS_MAX,
  advanceCore,
  arriveCore,
  canAfford,
  chooseCore,
  coverageDrag,
  customerValue,
  customerValueBreakdown,
  DELIVERY_TARGET,
  dismissResultCore,
  drawCandidates,
  finalEndingFor,
  freshCore,
  GREAT_SKILL_COVERAGE,
  greatSkillBase,
  isRouletteCeremony,
  type Persisted,
  type ProgressCore,
  proceedCore,
  repoStats,
  restoreCore,
  STREAK_BONUS_CAP,
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
    expect(chooseCore(base, choice({ insight: 1, culture: 1 }), 'good').meters).toEqual(m({ insight: 4, culture: 4 }))
    // great=主正(insight)+1
    expect(chooseCore(base, choice({ insight: 1, culture: 1 }), 'great').meters).toEqual(m({ insight: 5, culture: 4 }))
    // poor=主正(insight)-1（伸びしろを取り逃すだけ）
    expect(chooseCore(base, choice({ insight: 1, culture: 1 }), 'poor').meters).toEqual(m({ insight: 3, culture: 4 }))
    // 引数省略時は good 相当
    expect(chooseCore(base, choice({ insight: 1, culture: 1 })).meters).toEqual(m({ insight: 4, culture: 4 }))
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
    const next = chooseCore(eventCore({ meters: m({ trust: 1, insight: 1 }) }), choice({ trust: -1, insight: -1 }))
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

describe('S1プランニング分岐の対称化（chasedPromise / groundedGoal）', () => {
  const s1plan = EVENTS.find((e) => e.id === 's1-plan-goal')
  const availIds = (sprint: number, flags: GameFlag[]) =>
    availableEvents(EVENTS, sprint, 'daily', new Set<string>(), new Set(flags)).map((e) => e.id)

  it('s1-plan-goal の2択がそれぞれ chasedPromise / groundedGoal を立てる（対称）', () => {
    if (!s1plan) throw new Error('s1-plan-goal not found')
    const build = chooseCore(eventCore({ currentEvent: s1plan }), s1plan.choices[0])
    expect(build.flags.has('chasedPromise')).toBe(true)
    expect(build.flags.has('groundedGoal')).toBe(false)
    const grounded = chooseCore(eventCore({ currentEvent: s1plan }), s1plan.choices[1])
    expect(grounded.flags.has('groundedGoal')).toBe(true)
    expect(grounded.flags.has('chasedPromise')).toBe(false)
  })

  it('把握パスのバリアントは groundedGoal が立つ時だけ出る（S1途中／S2回収）', () => {
    expect(availIds(1, []).includes('s1-daily-refine-grounded')).toBe(false)
    expect(availIds(1, ['groundedGoal']).includes('s1-daily-refine-grounded')).toBe(true)
    expect(availIds(2, []).includes('s2-daily-grounded-core')).toBe(false)
    expect(availIds(2, ['groundedGoal']).includes('s2-daily-grounded-core')).toBe(true)
  })

  it('作るパスの回収は chasedPromise が立つ時だけ出る（対称）', () => {
    expect(availIds(2, []).includes('s2-daily-promise-gap')).toBe(false)
    expect(availIds(2, ['chasedPromise']).includes('s2-daily-promise-gap')).toBe(true)
  })
})

describe('不正暴露アーク：フィナーレ（finalEndingFor / circular ゲート）', () => {
  const flags = (...f: GameFlag[]) => new Set<GameFlag>(f)
  // 「太く残す」PBI を過半 Ship 済み＝レガシー定着（trueFde の AND 関門を通すための backlogDone）
  const legacyDone = ['pbi-handoff-doc', 'pbi-onboarding']
  it('暴露の決断済みフラグ → 専用フィナーレED・finalePending=false', () => {
    expect(finalEndingFor(m(), flags('complicit')).ending?.id).toBe('finale-complicit')
    expect(finalEndingFor(m(), flags('coopted')).ending?.id).toBe('finale-coopted')
    expect(finalEndingFor(m(), flags('complicit')).finalePending).toBe(false)
  })
  it('暴く(exposed)は、動かぬ証拠(fraudCase)を固めていれば成立、無ければ握り潰される', () => {
    expect(finalEndingFor(m(), flags('exposed', 'fraudCase')).ending?.id).toBe('finale-expose')
    expect(finalEndingFor(m(), flags('exposed')).ending?.id).toBe('finale-expose-weak')
  })
  it('第1章: 手がかり(fraudClue)/証拠(fraudCase)があっても告発に進まず、メーター駆動ED・finalePending=false（伏線は次章へ）', () => {
    const clue = finalEndingFor(m({ trust: 8, insight: 7, culture: 7 }), flags('fraudClue'), legacyDone)
    expect(clue.finalePending).toBe(false)
    expect(clue.ending?.id).toBe('trueFde')
    const cased = finalEndingFor(m({ trust: 8, insight: 7, culture: 7 }), flags('fraudClue', 'fraudCase'), legacyDone)
    expect(cased.finalePending).toBe(false)
    expect(cased.ending?.id).toBe('trueFde')
  })
  it('手がかり無し → 従来のメーター駆動エンディング（レガシー定着済みで trueFde）', () => {
    expect(finalEndingFor(m({ trust: 8, insight: 7, culture: 7 }), flags(), legacyDone).ending?.id).toBe('trueFde')
    expect(finalEndingFor(m({ trust: 8, insight: 7, culture: 7 }), flags(), legacyDone).finalePending).toBe(false)
  })
  it('機構④: メーター満点でもレガシー未定着なら trueFde に届かず及第点（バックログ層が結末に効く）', () => {
    expect(finalEndingFor(m({ trust: 8, insight: 7, culture: 7 }), flags()).ending?.id).toBe('decent')
    // soloHero（属人化）を抱えていると、Ship していても定着扱いにならない＝Ship≠定着
    expect(finalEndingFor(m({ trust: 8, insight: 7, culture: 7 }), flags('soloHero'), legacyDone).ending?.id).toBe(
      'decent'
    )
  })
  it('完走: 第1章は fraudClue/fraudCase でも決着させず通常ED。暴露フラグはドーマント機構として復元で専用ED', () => {
    const lastBeat = SPRINTS[SPRINTS.length - 1].beats.length - 1
    const core: ProgressCore = {
      ...freshCore(STARTING_METERS),
      sprintIndex: SPRINTS.length - 1,
      beatIndex: lastBeat,
      flags: flags('fraudClue', 'fraudCase'),
    }
    const ended = advanceCore(core)
    expect(ended.status).toBe('ended')
    expect(ended.finalePending).toBe(false) // 第1章は告発の決断を出さない
    expect(ended.ending).not.toBeNull() // 通常メーターED
    // ドーマント機構: 将来章で exposed が立てば告発成立ED（永続往復で保たれる）
    const restored = restoreCore(toPersisted({ ...ended, flags: flags('fraudClue', 'fraudCase', 'exposed') }))
    expect(restored.finalePending).toBe(false)
    expect(restored.ending?.id).toBe('finale-expose')
  })
  it('循環取引イベントは fraudClue がある時だけ Sprint3 daily プールに入る', () => {
    const pool = (f: GameFlag[]) => availableEvents(EVENTS, 3, 'daily', new Set<string>(), new Set(f)).map((e) => e.id)
    expect(pool(['fraudClue'])).toContain('s3-daily-circular')
    expect(pool([])).not.toContain('s3-daily-circular')
  })
})

describe('drawCandidates / spinCore — 朝会の“競合する候補”', () => {
  const sprint1DailyAll = availableEvents(EVENTS, 1, 'daily', new Set<string>(), new Set<GameFlag>())

  it('デイリーは travel になり、別々の場所の候補を最大3立てる', () => {
    const next = spinCore({ ...freshCore(STARTING_METERS), beatIndex: 1 }, 'genba', 0.3)
    expect(next.status).toBe('travel')
    expect(next.currentEvent).toBeNull() // 着くまで currentEvent は未確定
    expect(next.dailyCandidates.length).toBeGreaterThanOrEqual(1)
    expect(next.dailyCandidates.length).toBeLessThanOrEqual(3)
    // 候補の場所は互いに重複しない
    const locs = next.dailyCandidates.map((id) => locationOf(EVENTS.find((e) => e.id === id)!))
    expect(new Set(locs).size).toBe(locs.length)
  })

  it('drawCandidates はセグメント一致を含め、距離（別場所）を保つ', () => {
    const cands = drawCandidates(sprint1DailyAll, 'genba', 0.1)
    expect(cands.length).toBeGreaterThan(0)
    const locs = cands.map(locationOf)
    expect(new Set(locs).size).toBe(locs.length) // 別々の場所
  })

  it('デイリー以外（プランニング）は travel を挟まず直接 event', () => {
    const next = spinCore(freshCore(STARTING_METERS), 'genba', 0)
    expect(next.status).toBe('event')
    expect(next.currentEvent?.id).toBe('s1-plan-goal')
    expect(next.dailyCandidates).toEqual([])
  })

  it('フラグで解放された回収イベントは seed によらず候補に必ず含まれる（機会損失が響く）', () => {
    // wrongKpi を立てた周回では、その帰結 s3-daily-rework が確実に提示される
    const avail = availableEvents(EVENTS, 3, 'daily', new Set<string>(), new Set<GameFlag>(['wrongKpi']))
    const gated = avail.filter((e) => e.requiresFlag === 'wrongKpi')
    expect(gated.length).toBeGreaterThan(0)
    for (const seed of [0, 0.25, 0.5, 0.75, 0.99]) {
      const cands = drawCandidates(avail, 'genba', seed)
      expect(cands.some((c) => c.requiresFlag === 'wrongKpi')).toBe(true)
    }
  })
})

describe('arriveCore — 競合する候補から1つ選ぶ（見送り＝機会損失）', () => {
  const travelCore = (): ProgressCore => spinCore({ ...freshCore(STARTING_METERS), beatIndex: 1 }, 'genba', 0.3)

  it('候補の場所へ着くと、その案件が始まる（event）', () => {
    const t = travelCore()
    const chosen = EVENTS.find((e) => e.id === t.dailyCandidates[0])!
    const arrived = arriveCore(t, locationOf(chosen))
    expect(arrived.status).toBe('event')
    expect(arrived.currentEvent?.id).toBe(chosen.id)
    expect(arrived.dailyCandidates).toEqual([]) // 候補は消費
  })

  it('候補でない場所＝今日は静か（peekLocation のみ・候補は維持）', () => {
    const t = travelCore()
    const candLocs = new Set(t.dailyCandidates.map((id) => locationOf(EVENTS.find((e) => e.id === id)!)))
    const quiet = (['warehouse', 'serverroom', 'client', 'soumu', 'jinji', 'keiri', 'devroom'] as const).find(
      (l) => !candLocs.has(l)
    )!
    const peeked = arriveCore(t, quiet)
    expect(peeked.status).toBe('travel')
    expect(peeked.peekLocation).toBe(quiet)
    expect(peeked.dailyCandidates).toEqual(t.dailyCandidates)
  })

  it('missedFlag 付き候補を見送ると機会損失フラグが立ち、その候補は resolved になる', () => {
    // 実データから missedFlag 付きイベントを1つ拾い、別場所の候補と並べて arrive で見送る
    const missed = EVENTS.find((e) => e.missedFlag && e.ceremony === 'daily')
    expect(missed, 'missedFlag 付きデイリーイベントが存在する').toBeDefined()
    if (!missed) return
    const other = EVENTS.find(
      (e) => e.ceremony === 'daily' && locationOf(e) !== locationOf(missed) && e.id !== missed.id
    )!
    const core: ProgressCore = {
      ...freshCore(STARTING_METERS),
      beatIndex: 1,
      status: 'travel',
      dailyCandidates: [missed.id, other.id],
    }
    const arrived = arriveCore(core, locationOf(other)) // 別の候補を選ぶ＝missed を見送る
    expect(arrived.status).toBe('event')
    expect(arrived.currentEvent?.id).toBe(other.id)
    expect(arrived.flags.has(missed.missedFlag as GameFlag)).toBe(true) // 機会損失フラグ
    expect(arrived.resolvedIds.has(missed.id)).toBe(true) // 見送りはもう出さない
  })

  it('travel 以外では arriveCore は何もしない', () => {
    const core = freshCore(STARTING_METERS)
    expect(arriveCore(core, 'warehouse')).toBe(core)
  })
})

describe('生成AIトークン（消費型リソース）', () => {
  it('tokenCost のある選択はトークンを消費し、結果に tokenSpent が乗る', () => {
    const core = eventCore()
    expect(core.aiTokens).toBe(AI_TOKENS_MAX)
    const next = chooseCore(core, choice({ insight: 1 }, { tokenCost: 700 }))
    expect(next.aiTokens).toBe(AI_TOKENS_MAX - 700)
    expect(next.result?.tokenSpent).toBe(700)
  })

  it('残量不足の tokenCost 選択は engine が拒否（no-op＝効果も消費も無し。UI封印と同じ述語）', () => {
    const core = eventCore({ aiTokens: 300 })
    const next = chooseCore(core, choice({ insight: 1 }, { tokenCost: 700 }))
    expect(next).toBe(core) // 何も起きない（view層の封印を素通りした呼び出しも安全）
    expect(canAfford(300, choice({ insight: 1 }, { tokenCost: 700 }))).toBe(false)
    expect(canAfford(700, choice({ insight: 1 }, { tokenCost: 700 }))).toBe(true) // ちょうどは選べる
    expect(canAfford(0, choice({ insight: 1 }))).toBe(true) // 無コストは常に可
  })

  it('tokenCost が無い選択はトークンを消費しない', () => {
    const next = chooseCore(eventCore(), choice({ trust: 1 }))
    expect(next.aiTokens).toBe(AI_TOKENS_MAX)
    expect(next.result?.tokenSpent).toBeUndefined()
  })

  it('旧セーブ（aiTokens 無し）は満タンで復元・往復で保たれる', () => {
    const p: Persisted = {
      meters: STARTING_METERS,
      sprintIndex: 0,
      beatIndex: 0,
      resolvedIds: [],
      flags: [],
      log: [],
    }
    expect(restoreCore(p).aiTokens).toBe(AI_TOKENS_MAX)
    const core = { ...freshCore(STARTING_METERS), aiTokens: 800 }
    expect(restoreCore(toPersisted(core)).aiTokens).toBe(800)
    // 上限超過セーブは破棄でなく clamp して復元（検証層と救済層の整合）
    expect(restoreCore({ ...p, aiTokens: 999999 }).aiTokens).toBe(AI_TOKENS_MAX)
  })
})

describe('repoStats（リポジトリ＝開発の量と質を映す）', () => {
  it('技術イベント数(PR)・トークン・カバレッジ・負債を導出する', () => {
    const stats = repoStats({
      resolvedIds: new Set(['s2-daily-repo-aicode']), // segment team / location devroom＝技術
      flags: new Set(['aiOverreliance']),
      aiTokens: 800,
      repoCoverage: 45,
      repoDebt: 2,
    })
    expect(stats.mergedPrs).toBe(1)
    expect(stats.tokensLeft).toBe(800)
    expect(stats.tokensUsed).toBe(AI_TOKENS_MAX - 800)
    expect(stats.coverage).toBe(45)
    expect(stats.debtScore).toBe(6) // 累積2 + 過信4 ＝ 表示ptと判定の算出元が一致
    expect(stats.debt).toBe('high') // 6 >= 5
  })

  it('良い開発（過信なし・負債0）は low、カバレッジ0', () => {
    const stats = repoStats({
      resolvedIds: new Set(),
      flags: new Set(),
      aiTokens: AI_TOKENS_MAX,
      repoCoverage: 0,
      repoDebt: 0,
    })
    expect(stats.debt).toBe('low')
    expect(stats.mergedPrs).toBe(0)
    expect(stats.coverage).toBe(0)
  })

  it('累積した雑さ(repoDebt)だけでも負債レベルが上がる（フラグ非依存）', () => {
    const mk = (repoDebt: number) =>
      repoStats({ resolvedIds: new Set(), flags: new Set(), aiTokens: AI_TOKENS_MAX, repoCoverage: 0, repoDebt }).debt
    expect(mk(1)).toBe('low')
    expect(mk(2)).toBe('mid')
    expect(mk(5)).toBe('high')
  })

  it('chooseCore で choice.repo がカバレッジ/負債に積み上がる（0..100 / 0..でクランプ）', () => {
    const good = chooseCore(eventCore(), choice({ insight: 1 }, { repo: { coverage: 30 } }))
    expect(good.repoCoverage).toBe(30)
    expect(good.repoDebt).toBe(0)
    const messy = chooseCore(
      eventCore({ repoCoverage: 10 }),
      choice({ trust: 1 }, { repo: { coverage: -20, debt: 2 } })
    )
    expect(messy.repoCoverage).toBe(0) // 10-20 を 0 で下げ止まり
    expect(messy.repoDebt).toBe(2)
  })
})

describe('技術的負債のドラッグ（負債が高いほどコードが積み上がりにくい）', () => {
  it('coverageDrag は負債/フラグでカバレッジの伸びを鈍らせる（0.3 で下げ止まり）', () => {
    const none = new Set<GameFlag>()
    expect(coverageDrag(0, none)).toBe(1)
    expect(coverageDrag(3, none)).toBeCloseTo(0.7)
    expect(coverageDrag(5, none)).toBeCloseTo(0.5)
    expect(coverageDrag(100, none)).toBe(0.3)
    expect(coverageDrag(0, new Set(['aiOverreliance']))).toBeCloseTo(0.6) // フラグも負債として効く
  })

  it('chooseCore: 負債が高いほど repo.coverage の正の伸びが鈍る（負の補正は不変）', () => {
    const cov = (debt: number) =>
      chooseCore(eventCore({ repoDebt: debt }), choice({ insight: 1 }, { repo: { coverage: 30 } }))
    expect(cov(0).repoCoverage).toBe(30)
    expect(cov(5).repoCoverage).toBe(15) // 30 * 0.5
    expect(cov(0).result?.coverageDelta).toBe(30)
    expect(cov(5).result?.coverageDelta).toBe(15)
    // 負のカバレッジ（負債のダメージ）はドラッグ対象外
    const neg = chooseCore(
      eventCore({ repoCoverage: 20, repoDebt: 5 }),
      choice({ trust: 1 }, { repo: { coverage: -10, debt: 1 } })
    )
    expect(neg.repoCoverage).toBe(10)
    expect(neg.result?.coverageDelta).toBe(-10)
    expect(neg.result?.debtDelta).toBe(1)
  })
})

describe('customerValue — 北極星（手段の結晶として導出）', () => {
  it('開始時（信頼5/理解4/巻込4・カバレッジ0・負債0・未デリバリ）は中庸の低め', () => {
    // (13/30)*60 + 0 + 0 - 0 = 26 → 26
    expect(customerValue({ trust: 5, insight: 4, culture: 4 }, 0, 0)).toBe(26)
  })

  it('全メーター満点・カバレッジ満タン・負債ゼロ・目安まで届けて 100（理論上限）', () => {
    expect(customerValue({ trust: 10, insight: 10, culture: 10 }, 100, 0, DELIVERY_TARGET)).toBe(100)
  })

  it('届けただけでは満点に届かない（メーター/カバレッジを欠くと天井に当たらない）', () => {
    // 満点デリバリでも means/coverage が0なら 0+20+0 = 20
    expect(customerValue({ trust: 0, insight: 0, culture: 0 }, 0, 0, DELIVERY_TARGET)).toBe(20)
  })

  it('インクリメントを届けると顧客価値が直接伸びる（シップの手応え）', () => {
    const none = customerValue({ trust: 5, insight: 5, culture: 5 }, 0, 0, 0)
    const half = customerValue({ trust: 5, insight: 5, culture: 5 }, 0, 0, DELIVERY_TARGET / 2)
    const full = customerValue({ trust: 5, insight: 5, culture: 5 }, 0, 0, DELIVERY_TARGET)
    expect(half).toBeGreaterThan(none)
    expect(full).toBeGreaterThan(half)
    expect(full - none).toBe(20) // 目安到達で +20
  })

  it('デリバリ項は目安(DELIVERY_TARGET)で頭打ち（過剰デリバリで青天井にしない）', () => {
    const atTarget = customerValue({ trust: 5, insight: 5, culture: 5 }, 0, 0, DELIVERY_TARGET)
    const over = customerValue({ trust: 5, insight: 5, culture: 5 }, 0, 0, DELIVERY_TARGET + 10)
    expect(over).toBe(atTarget)
  })

  it('技術的負債が顧客価値を引き下げる（-2/pt）', () => {
    const base = customerValue({ trust: 10, insight: 10, culture: 10 }, 100, 0)
    const debted = customerValue({ trust: 10, insight: 10, culture: 10 }, 100, 5)
    expect(base - debted).toBe(10) // 5pt * 2
  })

  it('0..100 にクランプされる（負債過多でも下限0）', () => {
    expect(customerValue({ trust: 0, insight: 0, culture: 0 }, 0, 100)).toBe(0)
    expect(customerValue({ trust: 10, insight: 10, culture: 10 }, 100, 100)).toBe(0)
  })

  it('カバレッジが上がると顧客価値も上がる（手段が効く）', () => {
    const low = customerValue({ trust: 5, insight: 5, culture: 5 }, 0, 0)
    const high = customerValue({ trust: 5, insight: 5, culture: 5 }, 100, 0)
    expect(high).toBeGreaterThan(low)
    expect(high - low).toBe(20) // カバレッジ満タンで +20
  })
})

describe('chooseCore — 会心(great)の腕前をコード品質に還元（会心＝純増）', () => {
  it('great は伸ばせる主正メーターが無くても coverage を積む（被害軽減でなく成長）', () => {
    // 効果が負だけ＝主正メーター無し（amplify は何もしない）。それでも great は coverage を積む。
    const next = chooseCore(eventCore({ repoCoverage: 0, repoDebt: 0 }), choice({ insight: -1 }), 'great')
    expect(next.repoCoverage).toBe(GREAT_SKILL_COVERAGE) // 4 * drag(1) = 4
    expect(next.result?.skillCoverageBonus).toBe(GREAT_SKILL_COVERAGE)
    expect(next.result?.coverageDelta).toBe(GREAT_SKILL_COVERAGE)
  })

  it('good / poor では腕前ボーナスは付かない', () => {
    const good = chooseCore(eventCore({ repoCoverage: 0 }), choice({ insight: 1 }), 'good')
    const poor = chooseCore(eventCore({ repoCoverage: 0 }), choice({ insight: 1 }), 'poor')
    expect(good.result?.skillCoverageBonus).toBeUndefined()
    expect(poor.result?.skillCoverageBonus).toBeUndefined()
    expect(good.repoCoverage).toBe(0)
    expect(poor.repoCoverage).toBe(0)
  })

  it('選択自身の coverage に腕前ボーナスが上乗せされる（合算）', () => {
    const next = chooseCore(
      eventCore({ repoCoverage: 0, repoDebt: 0 }),
      choice({ insight: 1 }, { repo: { coverage: 10 } }),
      'great'
    )
    expect(next.repoCoverage).toBe(10 + GREAT_SKILL_COVERAGE) // 14
    expect(next.result?.skillCoverageBonus).toBe(GREAT_SKILL_COVERAGE)
  })

  it('腕前ボーナスも負債ドラッグで鈍る（雑なコードベースでは効きにくい）', () => {
    const next = chooseCore(eventCore({ repoCoverage: 0, repoDebt: 5 }), choice({ insight: -1 }), 'great')
    expect(next.repoCoverage).toBe(Math.round(GREAT_SKILL_COVERAGE * 0.5)) // 4 * 0.5 = 2
  })
})

describe('会心の連鎖（greatStreak＝実装の波）', () => {
  it('greatSkillBase: 初回(1)は基礎のまま、連鎖で +1/回、上限で頭打ち（後方互換）', () => {
    expect(greatSkillBase(0)).toBe(GREAT_SKILL_COVERAGE) // 念のため（0でも基礎）
    expect(greatSkillBase(1)).toBe(GREAT_SKILL_COVERAGE) // 初回会心は従来どおり
    expect(greatSkillBase(2)).toBe(GREAT_SKILL_COVERAGE + 1)
    expect(greatSkillBase(3)).toBe(GREAT_SKILL_COVERAGE + 2)
    expect(greatSkillBase(100)).toBe(GREAT_SKILL_COVERAGE + STREAK_BONUS_CAP) // 上限で頭打ち
  })

  it('great で連鎖+1、good/poor で 0 にリセット', () => {
    expect(chooseCore(eventCore({ greatStreak: 2 }), choice({ insight: 1 }), 'great').greatStreak).toBe(3)
    expect(chooseCore(eventCore({ greatStreak: 5 }), choice({ insight: 1 }), 'good').greatStreak).toBe(0)
    expect(chooseCore(eventCore({ greatStreak: 5 }), choice({ insight: 1 }), 'poor').greatStreak).toBe(0)
  })

  it('連鎖が伸びるほど会心のコード品質ボーナスが増える（負債0）', () => {
    // greatStreak=1 の状態で会心 → newStreak=2 → 基礎 5 を coverage に積む
    const s2 = chooseCore(eventCore({ greatStreak: 1, repoCoverage: 0, repoDebt: 0 }), choice({ insight: 1 }), 'great')
    expect(s2.repoCoverage).toBe(greatSkillBase(2)) // 5
    expect(s2.result?.skillCoverageBonus).toBe(greatSkillBase(2))
    expect(s2.result?.greatStreak).toBe(2)
  })

  it('result.greatStreak は great のときだけ載る（good/poor は undefined）', () => {
    expect(chooseCore(eventCore(), choice({ insight: 1 }), 'great').result?.greatStreak).toBe(1)
    expect(chooseCore(eventCore(), choice({ insight: 1 }), 'good').result?.greatStreak).toBeUndefined()
    expect(chooseCore(eventCore(), choice({ insight: 1 }), 'poor').result?.greatStreak).toBeUndefined()
  })

  it('greatStreak は永続化のラウンドトリップで保たれ、欠落セーブは 0 補完', () => {
    const core = { ...freshCore(STARTING_METERS), greatStreak: 4 }
    expect(restoreCore(toPersisted(core)).greatStreak).toBe(4)
    expect(restoreCore(toPersisted(freshCore(STARTING_METERS))).greatStreak).toBe(0)
  })
})

describe('customerValueBreakdown — 内訳（判断×実装の合流）', () => {
  it('total は customerValue と一致する（単一の真実源）', () => {
    const meters = { trust: 7, insight: 6, culture: 5 }
    const bd = customerValueBreakdown(meters, 40, 3, 4)
    expect(bd.total).toBe(customerValue(meters, 40, 3, 4))
  })

  it('各レイヤーが満タンなら means=60 / delivery=20 / coverage=20', () => {
    const bd = customerValueBreakdown({ trust: 10, insight: 10, culture: 10 }, 100, 0, DELIVERY_TARGET)
    expect(bd.means).toBeCloseTo(60)
    expect(bd.delivery).toBeCloseTo(20)
    expect(bd.coverage).toBeCloseTo(20)
    expect(bd.penalty).toBe(0)
    expect(bd.total).toBe(100)
  })

  it('技術的負債は penalty（=debtScore×2）として出る', () => {
    const bd = customerValueBreakdown({ trust: 5, insight: 5, culture: 5 }, 0, 4, 0)
    expect(bd.penalty).toBe(8)
  })

  it('未デリバリ・カバレッジ0なら delivery と coverage は 0', () => {
    const bd = customerValueBreakdown({ trust: 5, insight: 5, culture: 5 }, 0, 0, 0)
    expect(bd.delivery).toBe(0)
    expect(bd.coverage).toBe(0)
    expect(bd.means).toBeGreaterThan(0)
  })
})

describe('chooseCore — 顧客価値の記録（valueHistory / valueGain）', () => {
  it('レビューを解決するとスプリント末の顧客価値を valueHistory[sprintIndex] に記録する', () => {
    const core = eventCore({
      currentEvent: synthEvent({ ceremony: 'review' }),
      backlogDone: ['pbi-floor-observe', 'pbi-as-is-flow'], // 2件届けた状態
    })
    const next = chooseCore(core, choice({ insight: 1 }))
    expect(next.valueHistory[0]).toBeGreaterThan(0)
  })

  it('前スプリント（初回は baseline）からの伸びを backlogReview.valueGain に載せる', () => {
    const core = eventCore({
      currentEvent: synthEvent({ ceremony: 'review' }),
      backlogDone: ['pbi-floor-observe', 'pbi-as-is-flow'],
    })
    const next = chooseCore(core, choice({ insight: 1 }))
    // 届けた分＋理解の伸びで baseline を上回る＝正の valueGain
    expect(next.result?.backlogReview?.valueGain).toBeGreaterThan(0)
  })

  it('レビュー以外のイベントでは valueHistory を書かない', () => {
    const core = eventCore({ currentEvent: synthEvent({ ceremony: 'daily' }) })
    const next = chooseCore(core, choice({ insight: 1 }))
    expect(next.valueHistory).toEqual([])
    expect(next.result?.backlogReview).toBeUndefined()
  })
})

describe('機構①: 発見の信頼ゲート＋掘り損ねの顕在化（discoversPbi / requiresTrust / missedFlag）', () => {
  // pbi-disc-night-shift: requiresTrust=6, missedFlag='missedNightShift'
  const NIGHT = 'pbi-disc-night-shift'
  const dig = (over: Partial<Choice> = {}): Choice => choice({ insight: 1 }, { discoversPbi: NIGHT, ...over })

  it('信頼が足りていれば(trust≥6)良い実行で掘り当てる＝発見され、機会損失フラグは立たない', () => {
    const next = chooseCore(eventCore({ meters: m({ trust: 6 }) }), dig(), 'good')
    expect(next.result?.discoveredPbi?.id).toBe(NIGHT)
    expect(next.backlogOrder).toContain(NIGHT)
    expect(next.flags.has('missedNightShift')).toBe(false)
  })
  it('信頼ゲート未達(trust<6)では、深く聞こうとしても掘り当てられず＝missedFlag が立つ（沈黙させない）', () => {
    const next = chooseCore(eventCore({ meters: m({ trust: 5 }) }), dig(), 'good')
    expect(next.result?.discoveredPbi).toBeUndefined()
    expect(next.backlogOrder).not.toContain(NIGHT)
    expect(next.flags.has('missedNightShift')).toBe(true) // S3 で回収される
  })
  it('実行が poor なら（信頼が足りていても）掘り当てられず missedFlag が立つ', () => {
    const next = chooseCore(eventCore({ meters: m({ trust: 8 }) }), dig(), 'poor')
    expect(next.result?.discoveredPbi).toBeUndefined()
    expect(next.flags.has('missedNightShift')).toBe(true)
  })
})

describe('機構：Retro 昇格（choice.retroLever でプロセス改善を積む）', () => {
  it('レトロの選択で retroLever があれば retroImprovements に積まれる', () => {
    const core = eventCore({ currentEvent: synthEvent({ ceremony: 'retro' }) })
    const next = chooseCore(core, choice({}, { retroLever: 'capacity' }))
    expect(next.retroImprovements).toEqual(['capacity'])
  })
  it('retroLever 無しの選択では retroImprovements は変わらない', () => {
    const core = eventCore({ currentEvent: synthEvent({ ceremony: 'retro' }), retroImprovements: ['wip'] })
    const next = chooseCore(core, choice({ insight: 1 }))
    expect(next.retroImprovements).toEqual(['wip'])
  })
  it('レトロ以外のイベントの retroLever は積まれない（engine 側のセレモニーガード）', () => {
    const core = eventCore({ currentEvent: synthEvent({ ceremony: 'daily' }) })
    const next = chooseCore(core, choice({}, { retroLever: 'capacity' }))
    expect(next.retroImprovements).toEqual([]) // daily の retroLever は無視される
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
  it('キャンペーン完了状態は通常エンディングを復元（レガシー定着済みで trueFde）', () => {
    const c = restoreCore({
      ...base,
      sprintIndex: SPRINTS.length,
      beatIndex: 0,
      meters: m({ trust: 8, insight: 7, culture: 7 }),
      // 「太く残す」PBI を過半 Ship 済み＝レガシー定着（機構④の AND 関門を通す）
      backlogDone: ['pbi-handoff-doc', 'pbi-onboarding'],
    })
    expect(c.status).toBe('ended')
    expect(c.ending?.id).toBe('trueFde')
  })
  it('valueBaseline 欠落時は開始メーターから再計算して補完する', () => {
    const c = restoreCore(base) // base に valueBaseline 無し
    expect(c.valueBaseline).toBe(customerValue(STARTING_METERS, 0, 0, 0))
  })
  it('sparse な valueHistory（JSON往復で穴が null 化）も全消しせず 0 に正規化して復元', () => {
    // [null, null, 50] は穴のある配列を JSON.stringify した形（index=sprintIndex を保つ）
    const c = restoreCore({ ...base, valueHistory: [null as unknown as number, null as unknown as number, 50] })
    expect(c.valueHistory).toEqual([0, 0, 50]) // null→0 に正規化、index 整合を保持
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

describe('スプリントゴールをプランニングで決める（sprintGoal）', () => {
  it('choice.sprintGoal があると、その周回(sprintIndex)の表示ゴールに採用される', () => {
    const next = chooseCore(eventCore({ sprintIndex: 1 }), choice({ trust: 1 }, { sprintGoal: '誤出荷率を下げる' }))
    expect(next.sprintGoals[1]).toBe('誤出荷率を下げる')
    expect(next.sprintGoals[0]).toBeUndefined() // 他スプリント枠は触らない
  })
  it('sprintGoal の無い選択ではゴールは変わらない', () => {
    const next = chooseCore(eventCore({ sprintIndex: 0, sprintGoals: ['既存ゴール'] }), choice({ insight: 1 }))
    expect(next.sprintGoals[0]).toBe('既存ゴール')
  })
  it('永続化のラウンドトリップで保たれる', () => {
    const core = eventCore({ sprintIndex: 1, sprintGoals: ['A', 'B'] })
    expect(restoreCore(toPersisted(core)).sprintGoals).toEqual(['A', 'B'])
  })
})

describe('dismissResultCore', () => {
  it('結果ビューを消す', () => {
    const core = chooseCore(eventCore(), choice({ trust: 1 }))
    expect(core.result).not.toBeNull()
    expect(dismissResultCore(core).result).toBeNull()
  })
})

describe('spinCore — 縦糸の入口(pinned)の強制提示', () => {
  // S1 beats: [planning, daily×5, review, retro] → 最後のデイリーは beatIndex 5。
  // pinned: s1-daily-hideknowhow（S1）。未遭遇のまま最後のデイリーに来たら必ず候補に出す。
  const lastDailyS1: ProgressCore = { ...freshCore(STARTING_METERS), sprintIndex: 0, beatIndex: 5, status: 'playing' }

  it('最後のデイリーで未遭遇なら pinned を必ず提示する', () => {
    const next = spinCore(lastDailyS1, 'kokyaku', 0)
    expect(next.status).toBe('travel')
    expect(next.dailyCandidates).toEqual(['s1-daily-hideknowhow'])
  })

  it('pinned が解決済みなら強制せず通常の候補を引く', () => {
    const core: ProgressCore = { ...lastDailyS1, resolvedIds: new Set(['s1-daily-hideknowhow']) }
    const next = spinCore(core, 'kokyaku', 0)
    expect(next.dailyCandidates).not.toContain('s1-daily-hideknowhow')
  })

  it('最後でないデイリーでは強制しない（pinnedは最優先候補だが単独固定ではない）', () => {
    const midDaily: ProgressCore = { ...freshCore(STARTING_METERS), sprintIndex: 0, beatIndex: 1, status: 'playing' }
    const next = spinCore(midDaily, 'kokyaku', 0)
    expect(next.status).toBe('travel')
    // 単独固定（[pinned]だけ）ではない＝複数候補が立つ
    expect(next.dailyCandidates.length).toBeGreaterThan(1)
  })
})
