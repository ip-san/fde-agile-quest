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
  dismissResultCore,
  drawCandidates,
  finalEndingFor,
  freshCore,
  isRouletteCeremony,
  type Persisted,
  type ProgressCore,
  proceedCore,
  repoStats,
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
  it('第1章: 手がかり(fraudClue)/証拠(fraudCase)があっても告発に進まず、メーター駆動ED・finalePending=false（伏線は次章へ）', () => {
    const clue = finalEndingFor(m({ trust: 8, insight: 7, culture: 7 }), flags('fraudClue'))
    expect(clue.finalePending).toBe(false)
    expect(clue.ending?.id).toBe('trueFde')
    const cased = finalEndingFor(m({ trust: 8, insight: 7, culture: 7 }), flags('fraudClue', 'fraudCase'))
    expect(cased.finalePending).toBe(false)
    expect(cased.ending?.id).toBe('trueFde')
  })
  it('手がかり無し → 従来のメーター駆動エンディング', () => {
    expect(finalEndingFor(m({ trust: 8, insight: 7, culture: 7 }), flags()).ending?.id).toBe('trueFde')
    expect(finalEndingFor(m({ trust: 8, insight: 7, culture: 7 }), flags()).finalePending).toBe(false)
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
    const quiet = (['warehouse', 'serverroom', 'client', 'soumu', 'jinji', 'keiri', 'repo', 'devroom'] as const).find(
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
      resolvedIds: new Set(['s2-daily-repo-aicode']), // segment team / location repo＝技術
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
  it('開始時（信頼5/理解4/巻込4・カバレッジ0・負債0）は中庸の低め', () => {
    // (13/30)*70 + 0 - 0 = 30.33 → 30
    expect(customerValue({ trust: 5, insight: 4, culture: 4 }, 0, 0)).toBe(30)
  })

  it('全メーター満点・カバレッジ満タン・負債ゼロで 100（理論上限）', () => {
    expect(customerValue({ trust: 10, insight: 10, culture: 10 }, 100, 0)).toBe(100)
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
    expect(high - low).toBe(30) // カバレッジ満タンで +30
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
