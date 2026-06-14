// ───────────────────────────────────────────────────────────
// 進行ロジック（純粋関数）。localStorage / zustand / 乱数源に依存しない。
// store はこれらを呼ぶ薄いラッパに徹し、ここを game.test と同様に単体テストする。
// ───────────────────────────────────────────────────────────
import { ENDINGS, EVENTS, FAILURE_EPILOGUES, FINALE_EPILOGUES, SPRINTS } from '../data/chapters/chapter-01'
import { LOCATION_ORDER, locationOf } from '../data/locations'
import { preceptsForEvent } from '../data/precepts'
import { amplifyEffects, availableEvents, drawEvent, evaluateEnding, miniGameKindFor, resolveChoice } from './game'
import type {
  Ceremony,
  Choice,
  Epilogue,
  ExecTier,
  GameEvent,
  GameFlag,
  LocationId,
  LogEntry,
  MeterKey,
  Meters,
  ResultView,
  Segment,
  Status,
} from '../types'

/** 進行の中核状態（永続化対象＋導出フィールド）。UIアクション関数は含まない */
export interface ProgressCore {
  meters: Meters
  flags: Set<GameFlag>
  resolvedIds: Set<string>
  log: LogEntry[]
  sprintIndex: number
  beatIndex: number
  status: Status
  ending: Epilogue | null
  currentEvent: GameEvent | null
  unexpected: boolean
  result: ResultView | null
  /** 完走したが、不正暴露アークの「暴露の決断」待ち（fraudClue 有りで未決断）。App が Finale を出す */
  finalePending: boolean
  /** travel 中：今日のイベントが起きる場所（マップでここへ着くと話が始まる） */
  pendingLocation: LocationId | null
  /** travel 中：直前に「外した」場所（＝今日は静か。小景を出すだけでペナルティ無し） */
  peekLocation: LocationId | null
  /** travel 中：朝会で“競合する”今日の候補イベント（別々の場所・最大3）。1つ選ぶと他は見送り */
  dailyCandidates: string[]
  /** 生成AIの残りトークン（消費型リソース。0でも即失敗ではないが、AIショートカットが封印される） */
  aiTokens: number
  /** リポジトリのテストカバレッジ(0..100)。良い開発の選択で上がる＝健全な拡充の指標 */
  repoCoverage: number
  /** リポジトリの技術的負債（0..）。雑な開発で積もり、リファクタ/検証で減る */
  repoDebt: number
}

export const REPO_COVERAGE_MAX = 100

/** 生成AIトークンの初期予算（キャンペーンを通じた有限資源・自然回復なし）。
 *  消費源: 丸投げ s2-ai-handoff(700)/s2-repo-aicode(500)＝過信フラグ付き、賢い協働＝フラグ無しで小さく消費。
 *  終盤 s3-ai-regression の“AIで素早く立て直す”はトークンゲート＝使い切っていると選べない（過信のツケ）。 */
export const AI_TOKENS_MAX = 1200

/** localStorage に保存する最小形 */
export interface Persisted {
  meters: Meters
  sprintIndex: number
  beatIndex: number
  resolvedIds: string[]
  flags: GameFlag[]
  log: LogEntry[]
  /** 生成AIの残りトークン（旧セーブには無いので復元時は AI_TOKENS_MAX で補完） */
  aiTokens?: number
  /** リポジトリのテストカバレッジ/技術的負債（旧セーブには無いので 0 で補完） */
  repoCoverage?: number
  repoDebt?: number
}

const METER_KEYS: MeterKey[] = ['trust', 'insight', 'culture']

/** 0以下になったメーターがあれば最初のキーを返す（探索順 trust→insight→culture） */
export function zeroedMeter(m: Meters): MeterKey | undefined {
  return METER_KEYS.find((k) => m[k] <= 0)
}

export function ceremonyAt(sprintIndex: number, beatIndex: number): Ceremony | null {
  const sprint = SPRINTS[sprintIndex]
  if (!sprint) return null
  return sprint.beats[beatIndex] ?? null
}

export function freshCore(starting: Meters): ProgressCore {
  return {
    meters: { ...starting },
    flags: new Set<GameFlag>(),
    resolvedIds: new Set<string>(),
    log: [],
    sprintIndex: 0,
    beatIndex: 0,
    status: 'playing',
    ending: null,
    currentEvent: null,
    unexpected: false,
    result: null,
    finalePending: false,
    pendingLocation: null,
    peekLocation: null,
    dailyCandidates: [],
    aiTokens: AI_TOKENS_MAX,
    repoCoverage: 0,
    repoDebt: 0,
  }
}

/** リポジトリ・パネル用の派生状態（純粋）。「拡充＝開発が進む」を“量”と“質”の両面で映す。
 *  - mergedPrs: 解決済みの“技術イベント”の数＝開発の活動量（拡充の量）
 *  - coverage: テストカバレッジ(0..100)＝良い開発で積み上がる健全度（拡充の質）
 *  - debt: 技術的負債のレベル＝累積負債(repoDebt)＋過信/誤KPIフラグから判定（質の負の側）
 *  - tokensUsed/Left: 生成AIトークン */
export function repoStats(
  core: Pick<ProgressCore, 'resolvedIds' | 'flags' | 'aiTokens' | 'repoCoverage' | 'repoDebt'>,
): {
  mergedPrs: number
  coverage: number
  debtScore: number
  tokensUsed: number
  tokensLeft: number
  debt: 'low' | 'mid' | 'high'
} {
  let mergedPrs = 0
  for (const ev of EVENTS) {
    if (!core.resolvedIds.has(ev.id)) continue
    // 技術イベント＝team/trouble、または repo/devroom ロケーション（ただし“チャンス”は開発PRに数えない）
    const tech =
      ev.segment === 'team' ||
      ev.segment === 'trouble' ||
      ((ev.location === 'repo' || ev.location === 'devroom') && ev.segment !== 'chance')
    if (tech) mergedPrs++
  }
  // 負債は「累積した雑さ(repoDebt)」＋「過信/誤KPIのフラグ」を合算して質的レベルへ
  const flagWeight = (core.flags.has('aiOverreliance') ? 4 : 0) + (core.flags.has('wrongKpi') ? 2 : 0)
  const score = core.repoDebt + flagWeight
  const debt: 'low' | 'mid' | 'high' = score >= 5 ? 'high' : score >= 2 ? 'mid' : 'low'
  return {
    mergedPrs,
    coverage: core.repoCoverage,
    debtScore: score, // ラベル(debt)と同じ算出元＝表示ptと判定レベルが一致する
    tokensUsed: AI_TOKENS_MAX - core.aiTokens,
    tokensLeft: core.aiTokens,
    debt,
  }
}

/** キャンペーン完走時のエンディング決定（純粋）。advanceCore と restoreCore で共用。
 *  - 暴露の決断済み(exposed/complicit/coopted) → 対応するフィナーレED
 *  - 未決断だが手がかり(fraudClue)あり → ending=null・finalePending=true（決断待ち）
 *  - それ以外 → 従来のメーター駆動エンディング */
export function finalEndingFor(
  meters: Meters,
  flags: Set<GameFlag>,
): { ending: Epilogue | null; finalePending: boolean } {
  // 暴くを選んだ場合、動かぬ証拠(fraudCase)を固めていれば告発が通り、無ければ握り潰される
  if (flags.has('exposed')) {
    const ending = flags.has('fraudCase') ? FINALE_EPILOGUES.expose : FINALE_EPILOGUES.exposeWeak
    return { ending, finalePending: false }
  }
  if (flags.has('complicit')) return { ending: FINALE_EPILOGUES.complicit, finalePending: false }
  if (flags.has('coopted')) return { ending: FINALE_EPILOGUES.coopted, finalePending: false }
  if (flags.has('fraudClue')) return { ending: null, finalePending: true }
  return { ending: evaluateEnding(ENDINGS, meters), finalePending: false }
}

/** ビートを1つ進め、スプリント／キャンペーンの終端を判定する */
export function advanceCore(core: ProgressCore, result: ResultView | null = null): ProgressCore {
  let sprintIndex = core.sprintIndex
  let beatIndex = core.beatIndex + 1

  if (beatIndex >= SPRINTS[sprintIndex].beats.length) {
    sprintIndex += 1
    beatIndex = 0
  }

  const base = {
    ...core,
    sprintIndex,
    beatIndex,
    currentEvent: null,
    unexpected: false,
    result,
    pendingLocation: null,
    peekLocation: null,
    dailyCandidates: [],
  }

  if (sprintIndex >= SPRINTS.length) {
    const fin = finalEndingFor(core.meters, core.flags)
    return { ...base, status: 'ended', ending: fin.ending, finalePending: fin.finalePending }
  }
  return { ...base, status: 'playing', ending: null, finalePending: false }
}

/** ルーレットを回すセレモニーか（デイリーのみ＝開発中の不確実性）。
 *  単発の Planning/Review/Retro はルーレットを回さず「進める」で直接イベントを出す */
export function isRouletteCeremony(ceremony: Ceremony): boolean {
  return ceremony === 'daily'
}

/** 「進める」: セグメント不問で、現セレモニーの最初の出せるイベントを引く（重要分岐を必ず出す）。
 *  単発セレモニー（Planning/Review/Retro＝会議）はマップ移動を挟まず直接イベントへ */
export function proceedCore(core: ProgressCore): ProgressCore {
  if (core.status !== 'playing') return core
  const ceremony = ceremonyAt(core.sprintIndex, core.beatIndex)
  if (!ceremony) return core
  const sprintNo = SPRINTS[core.sprintIndex].n
  const avail = availableEvents(EVENTS, sprintNo, ceremony, core.resolvedIds, core.flags)
  const event = avail[0] ?? null
  if (!event) return advanceCore(core)
  return {
    ...core,
    currentEvent: event,
    unexpected: false,
    status: 'event',
    pendingLocation: null,
    peekLocation: null,
    dailyCandidates: [],
  }
}

/** 朝会の“競合する今日の候補”を引く（別々の場所・最大3）。セグメント一致を必ず1つ含め、
 *  残りは他の場所から1つずつ（場所順を seed で回す）。1場所につき代表1つ。 */
export function drawCandidates(available: GameEvent[], segment: Segment, pickRandom: number): GameEvent[] {
  if (available.length === 0) return []
  const repByLoc = new Map<LocationId, GameEvent>()
  for (const e of available) {
    const l = locationOf(e)
    if (!repByLoc.has(l)) repByLoc.set(l, e)
  }
  // セグメント一致イベント（あればその場所を先頭に据える）
  const matchIdx = Math.max(0, Math.floor(pickRandom * available.length))
  const matching =
    available.filter((e) => e.segment === segment)[0] ?? available[Math.min(available.length - 1, matchIdx)]
  const order: LocationId[] = [locationOf(matching)]
  const others = LOCATION_ORDER.filter((l) => repByLoc.has(l) && !order.includes(l))
  const start = others.length ? Math.floor(pickRandom * others.length) % others.length : 0
  for (let k = 0; k < others.length; k++) order.push(others[(start + k) % others.length])

  const out: GameEvent[] = []
  for (const l of order) {
    if (out.length >= 3) break
    const e = locationOf(matching) === l ? matching : (repByLoc.get(l) as GameEvent)
    if (e && !out.some((x) => x.id === e.id)) out.push(e)
  }
  return out
}

/** ルーレット結果から現セレモニーのイベントを引く。
 *  デイリー＝“競合する3候補”を立てて travel（朝会＋マップ）へ。単発＝従来どおり直接 event。 */
export function spinCore(core: ProgressCore, segment: Segment, pickRandom: number): ProgressCore {
  if (core.status !== 'playing') return core
  const ceremony = ceremonyAt(core.sprintIndex, core.beatIndex)
  if (!ceremony) return core
  const sprintNo = SPRINTS[core.sprintIndex].n
  const avail = availableEvents(EVENTS, sprintNo, ceremony, core.resolvedIds, core.flags)

  if (ceremony === 'daily') {
    const cands = drawCandidates(avail, segment, pickRandom)
    if (cands.length === 0) return advanceCore(core)
    return {
      ...core,
      currentEvent: null,
      unexpected: false,
      status: 'travel',
      pendingLocation: null,
      peekLocation: null,
      dailyCandidates: cands.map((c) => c.id),
    }
  }
  // 単発セレモニー（テスト等で spin される場合）＝1つ引いて直接 event
  const { event } = drawEvent(avail, segment, pickRandom)
  if (!event) return advanceCore(core)
  return {
    ...core,
    currentEvent: event,
    unexpected: false,
    status: 'event',
    pendingLocation: null,
    peekLocation: null,
    dailyCandidates: [],
  }
}

/** マップで行き先を選ぶ。候補（競合する優先）の場所なら、その案件が始まる。
 *  選ばなかった候補は“見送り”——missedFlag を持つ重要事を見送ると機会損失フラグが立ち、後で響く。
 *  候補でない場所＝「今日は静か」（peekLocation を立てるだけ）。 */
export function arriveCore(core: ProgressCore, location: LocationId): ProgressCore {
  if (core.status !== 'travel') return core
  const cands = core.dailyCandidates
    .map((id) => EVENTS.find((e) => e.id === id))
    .filter((e): e is GameEvent => !!e)
  const chosen = cands.find((e) => locationOf(e) === location)
  if (!chosen) return { ...core, peekLocation: location } // 今日は静か（候補でない場所）

  const flags = new Set(core.flags)
  const resolvedIds = new Set(core.resolvedIds)
  for (const e of cands) {
    if (e.id === chosen.id) continue
    // 見送り：missedFlag 付きは機会損失（フラグを立て、もう出さない）。無印は pool に残す（後日また候補に）
    if (e.missedFlag) {
      flags.add(e.missedFlag)
      resolvedIds.add(e.id)
    }
  }
  return {
    ...core,
    flags,
    resolvedIds,
    currentEvent: chosen,
    status: 'event',
    peekLocation: null,
    dailyCandidates: [],
  }
}

/** 進行中イベントの選択を解決し、結果ビューを添えて次状態を返す。
 *  tier＝実行ミニゲームの出来。選択の主正メーターだけを great:+1 / good:±0 / poor:-1 する */
export function chooseCore(core: ProgressCore, choice: Choice, tier: ExecTier = 'good'): ProgressCore {
  const event = core.currentEvent
  if (!event || core.status !== 'event') return core
  // 残量不足のAIショートカットは engine 層でも拒否（UI封印と同じ述語）。効果を満額付与する取りこぼしを防ぐ
  if (!canAfford(core.aiTokens, choice)) return core

  // ミニゲームの出来で「意図した正の効果」だけ倍率調整（負効果は不変＝代償と0ルールを守る）
  const amp = amplifyEffects(choice.effects, tier)
  const { meters, flags } = resolveChoice(core.meters, core.flags, { ...choice, effects: amp.effects })
  // 生成AIトークンを消費（残量を超えては減らない＝0で下げ止まり。0でも即失敗にはしない）
  const tokenSpent = choice.tokenCost && choice.tokenCost > 0 ? Math.min(choice.tokenCost, core.aiTokens) : 0
  const aiTokens = core.aiTokens - tokenSpent
  // リポジトリの健全度（開発の質）を選択で更新。coverage は 0..100、debt は 0..へ丸める
  const repoCoverage = clamp01(core.repoCoverage + (choice.repo?.coverage ?? 0), REPO_COVERAGE_MAX)
  const repoDebt = Math.max(0, core.repoDebt + (choice.repo?.debt ?? 0))
  const resolvedIds = new Set(core.resolvedIds).add(event.id)
  const log: LogEntry[] = [
    ...core.log,
    {
      sprint: event.sprint,
      ceremony: event.ceremony,
      eventTitle: event.title,
      choiceLabel: choice.label,
      resultText: choice.resultText,
    },
  ]
  const result: ResultView = {
    eventId: event.id,
    choiceId: choice.id,
    eventTitle: event.title,
    ceremony: event.ceremony,
    segment: event.segment,
    choiceLabel: choice.label,
    resultText: choice.resultText,
    effects: amp.effects, // 実際に適用された増減（倍率込み）
    warn: choice.warn,
    precepts: preceptsForEvent(event.id),
    newPreceptIds: [], // 新規判定は store が seenPrecepts と突き合わせて埋める
    execTier: tier,
    execPrimary: amp.primary,
    execDelta: amp.delta,
    minigameKind: miniGameKindFor(event),
    tokenSpent: tokenSpent || undefined,
  }

  const base = { ...core, meters, flags, resolvedIds, log, aiTokens, repoCoverage, repoDebt }

  // ★0ルール: どれか1つでもゲージが0になったら、その場で失敗エピローグ
  const zeroed = zeroedMeter(meters)
  if (zeroed) {
    return {
      ...base,
      currentEvent: null,
      unexpected: false,
      status: 'ended',
      ending: FAILURE_EPILOGUES[zeroed],
      result,
      pendingLocation: null,
      peekLocation: null,
      dailyCandidates: [],
    }
  }

  return advanceCore(base, result)
}

export function dismissResultCore(core: ProgressCore): ProgressCore {
  return { ...core, result: null }
}

/** 永続データから中核状態を再構成（status/ending を再評価。失敗/完了/進行中を復元） */
export function restoreCore(p: Persisted): ProgressCore {
  const flags = new Set<GameFlag>(p.flags)
  const resolvedIds = new Set<string>(p.resolvedIds)
  const zeroed = zeroedMeter(p.meters)
  const campaignDone = p.sprintIndex >= SPRINTS.length
  // 0ルール失敗 > 完走（フィナーレ含む）> 進行中
  const fin = zeroed
    ? { ending: FAILURE_EPILOGUES[zeroed], finalePending: false }
    : campaignDone
      ? finalEndingFor(p.meters, flags)
      : { ending: null, finalePending: false }
  const isEnded = zeroed !== undefined || campaignDone
  return {
    meters: p.meters,
    flags,
    resolvedIds,
    log: p.log,
    sprintIndex: p.sprintIndex,
    beatIndex: p.beatIndex,
    status: isEnded ? 'ended' : 'playing',
    ending: fin.ending,
    currentEvent: null,
    unexpected: false,
    result: null,
    finalePending: fin.finalePending,
    pendingLocation: null,
    peekLocation: null,
    dailyCandidates: [],
    // 旧セーブは aiTokens を持たない → 満タンで補完。範囲外は丸める
    aiTokens: clampTokens(p.aiTokens ?? AI_TOKENS_MAX),
    repoCoverage: clamp01(p.repoCoverage ?? 0, REPO_COVERAGE_MAX),
    repoDebt: Math.max(0, Math.floor(p.repoDebt ?? 0)),
  }
}

/** その選択が生成AIトークン残量で「選べる」か（tokenCost が残量以下）。
 *  view(EventModal の封印) と engine(chooseCore の拒否) が同じ述語を参照し、層をまたいで一致させる */
export function canAfford(aiTokens: number, choice: Choice): boolean {
  return !choice.tokenCost || choice.tokenCost <= 0 || aiTokens >= choice.tokenCost
}

/** AIトークンを 0..MAX の整数に丸める */
export function clampTokens(v: number): number {
  if (!Number.isFinite(v)) return AI_TOKENS_MAX
  return Math.max(0, Math.min(AI_TOKENS_MAX, Math.floor(v)))
}

/** 0..max に丸める（カバレッジ用） */
function clamp01(v: number, max: number): number {
  if (!Number.isFinite(v)) return 0
  return Math.max(0, Math.min(max, Math.round(v)))
}

/** 永続データを書き出し用の最小形へ */
export function toPersisted(core: ProgressCore): Persisted {
  return {
    meters: core.meters,
    sprintIndex: core.sprintIndex,
    beatIndex: core.beatIndex,
    resolvedIds: [...core.resolvedIds],
    flags: [...core.flags],
    log: core.log,
    aiTokens: core.aiTokens,
    repoCoverage: core.repoCoverage,
    repoDebt: core.repoDebt,
  }
}
