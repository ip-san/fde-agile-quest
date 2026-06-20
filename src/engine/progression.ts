// ───────────────────────────────────────────────────────────
// 進行ロジック（純粋関数）。localStorage / zustand / 乱数源に依存しない。
// store はこれらを呼ぶ薄いラッパに徹し、ここを game.test と同様に単体テストする。
// ───────────────────────────────────────────────────────────
import {
  ENDINGS,
  EVENTS,
  FAILURE_EPILOGUES,
  FINALE_EPILOGUES,
  PRODUCT_BACKLOG,
  SPRINTS,
  STARTING_METERS,
} from '../data/chapters/chapter-01'
import { LOCATION_ORDER, locationOf } from '../data/locations'
import { preceptsForEvent } from '../data/precepts'
import type {
  BacklogReview,
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
import { isKnownPbi, REVIEW_CAPACITY, resolveSprintBacklog, revealPbi, WIP_LIMIT } from './backlog'
import {
  amplifyEffects,
  availableEvents,
  coverageDrag,
  drawEvent,
  evaluateEnding,
  miniGameKindFor,
  resolveChoice,
} from './game'

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
  /** スプリントごとに“プランニングで決めた”ゴール（index=sprintIndex）。未決定の枠は undefined。
   *  プランニングの選択肢が choice.sprintGoal を持つと、その周回で選んだ狙いが表示ゴールになる。 */
  sprintGoals: string[]
  // ── バックログ（daily ルーレットとは独立した別レイヤー）──
  /** プロダクトバックログの現在の優先順位（PBI id 列。初期＝シード順、プレイヤーが提案で並べ替え） */
  backlogOrder: string[]
  /** 今スプリントの予測（フォーキャスト）＝スプリントバックログに引いた PBI id 群 */
  sprintForecast: string[]
  /** DoD 達成済み PBI id（キャンペーン通算） */
  backlogDone: string[]
  /** スプリントごとの完了ポイント（ベロシティ。index=sprintIndex）。推移表示に使う */
  velocity: number[]
  /** スプリント末（レビュー精算後）に記録した顧客価値（北極星。index=sprintIndex）。
   *  「案件を通じて顧客価値がどう伸びたか」の成長曲線に使う。未到達スプリントの枠は undefined。 */
  valueHistory: number[]
  /** キャンペーン開始時の顧客価値（baseline）。第1スプリントの“伸び”をここからの差分で測る。 */
  valueBaseline: number
  /** 連続して会心(great)実行した回数（“実装の波”）。great で +1、good/poor で 0 にリセット。
   *  連鎖が伸びるほど会心のコード品質ボーナスが増す＝上手い実行を続けるほど成果が複利で伸びる。 */
  greatStreak: number
  /** カンバンの In Progress 列（着手済み・未Done の PBI id。WIP=2 上限） */
  inProgress: string[]
  /** In Progress 各項目の累積レビュー点（id→点）。見積りに達すると Done */
  reviewProgress: Record<string, number>
  /** 今スプリントの残レビュー容量（人の希少資源。毎スプリント REVIEW_CAPACITY にリセット） */
  reviewCapacity: number
  /** 直前スプリントのレビューで終わらせきれず持ち越した PBI id 群（次プランニングで「↪前回持ち越し」表示に使う）。
   *  レビュー精算で carryIds を書き、次レビューで上書きされる。初期＝[]。 */
  lastCarryover: string[]
}

export const REPO_COVERAGE_MAX = 100

/** 会心(great)実行が“腕前”としてコードの質(coverage)に還元される基礎量(%)。
 *  実際の付与は負債ドラッグで鈍る。会心を「被害軽減」でなく「純増の成果」に変えるための報酬。 */
export const GREAT_SKILL_COVERAGE = 4

/** 会心の連鎖（greatStreak）が会心コードボーナスに上乗せする1連鎖あたりの量(%)と、その上限。
 *  連鎖2回目から効き始め(streak-1)、上限で頭打ち。複利で青天井にせず“波に乗る手応え”だけ与える。 */
export const STREAK_BONUS_PER = 1
export const STREAK_BONUS_CAP = 4

/** 会心連鎖を踏まえた、会心コードボーナスの基礎量(%)（ドラッグ適用前）。
 *  greatStreak=1（初回会心）は GREAT_SKILL_COVERAGE のまま＝従来挙動と後方互換。 */
export function greatSkillBase(greatStreak: number): number {
  const bonus = Math.min(Math.max(0, greatStreak - 1) * STREAK_BONUS_PER, STREAK_BONUS_CAP)
  return GREAT_SKILL_COVERAGE + bonus
}

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
  /** プランニングで決めたスプリントゴール（旧セーブには無いので [] で補完） */
  sprintGoals?: string[]
  /** バックログ状態（旧セーブには無いので restore 時に補完） */
  backlogOrder?: string[]
  sprintForecast?: string[]
  backlogDone?: string[]
  velocity?: number[]
  /** スプリント末に記録した顧客価値（旧セーブには無いので [] で補完） */
  valueHistory?: number[]
  /** 開始時の顧客価値 baseline（旧セーブには無いので開始メーターから再計算して補完） */
  valueBaseline?: number
  /** 会心の連鎖（旧セーブには無いので 0 で補完） */
  greatStreak?: number
  inProgress?: string[]
  reviewProgress?: Record<string, number>
  reviewCapacity?: number
  /** 直前スプリントの持ち越し（旧セーブには無いので [] で補完） */
  lastCarryover?: string[]
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
    sprintGoals: [],
    backlogOrder: PRODUCT_BACKLOG.map((p) => p.id),
    sprintForecast: [],
    backlogDone: [],
    velocity: [],
    valueHistory: [],
    // 開始時の顧客価値（カバレッジ0・負債0・未デリバリ）。第1スプリントの伸びをここから測る。
    valueBaseline: customerValue(starting, 0, 0, 0),
    greatStreak: 0,
    inProgress: [],
    reviewProgress: {},
    reviewCapacity: REVIEW_CAPACITY,
    lastCarryover: [],
  }
}

/** リポジトリ・パネル用の派生状態（純粋）。「拡充＝開発が進む」を“量”と“質”の両面で映す。
 *  - mergedPrs: 解決済みの“技術イベント”の数＝開発の活動量（拡充の量）
 *  - coverage: テストカバレッジ(0..100)＝良い開発で積み上がる健全度（拡充の質）
 *  - debt: 技術的負債のレベル＝累積負債(repoDebt)＋過信/誤KPIフラグから判定（質の負の側）
 *  - tokensUsed/Left: 生成AIトークン */
export function repoStats(
  core: Pick<ProgressCore, 'resolvedIds' | 'flags' | 'aiTokens' | 'repoCoverage' | 'repoDebt'> & {
    backlogDone?: string[]
  }
): {
  mergedPrs: number
  coverage: number
  debtScore: number
  tokensUsed: number
  tokensLeft: number
  debt: 'low' | 'mid' | 'high'
  deliveredItems: number
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
    // 届けたインクリメント＝DoD 達成のバックログ項目（カンバンの Done 通算）
    deliveredItems: core.backlogDone?.length ?? 0,
  }
}

/** キャンペーン完走時のエンディング決定（純粋）。advanceCore と restoreCore で共用。
 *  ■ 第1章は不正の“伏線”を撒くだけ。告発の決断（暴く/黙認/取り込まれる）は次章へ繰り延べる
 *    ＝ fraudClue/fraudCase を掴んでも finalePending にはせず、通常のメーター駆動EDで終える
 *    （掴んだ伏線は EndingScreen の“次章への引き”で示し、フラグは永続化されて次章が受け取る）。
 *  ■ exposed/complicit/coopted の分岐は将来章のためのドーマント（第1章では立たない）。 */
export function finalEndingFor(
  meters: Meters,
  flags: Set<GameFlag>
): { ending: Epilogue | null; finalePending: boolean } {
  // ── 将来章用のドーマント分岐（第1章ではこれらのフラグは立たない）──
  // 暴くを選んだ場合、動かぬ証拠(fraudCase)を固めていれば告発が通り、無ければ握り潰される
  if (flags.has('exposed')) {
    const ending = flags.has('fraudCase') ? FINALE_EPILOGUES.expose : FINALE_EPILOGUES.exposeWeak
    return { ending, finalePending: false }
  }
  if (flags.has('complicit')) return { ending: FINALE_EPILOGUES.complicit, finalePending: false }
  if (flags.has('coopted')) return { ending: FINALE_EPILOGUES.coopted, finalePending: false }
  // 第1章: 手がかり/証拠の有無に関わらず、決着させず通常EDで締める（伏線は次章へ）
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

/** 朝会の“競合する今日の候補”を引く（別々の場所・最大3。1場所につき代表1つ）。
 *  優先順位: ①フラグで解放された“回収/不正暴露”イベント（苦労して立てたフラグの帰結は必ず出す）
 *  → ②セグメント一致 → ③残りは場所順を seed で回す。これで「見送り」の機会損失や不正暴露アークが
 *  確実に響く（available は requiresFlag を満たした物だけなので、requiresFlag 付き＝“掴んだ報酬”）。 */
export function drawCandidates(available: GameEvent[], segment: Segment, pickRandom: number): GameEvent[] {
  if (available.length === 0) return []
  // 場所ごとの代表。フラグ解放イベントを最優先で代表に据える（同じ場所に通常イベントがあっても勝つ）。
  const repByLoc = new Map<LocationId, GameEvent>()
  // 回収（requiresFlag）／縦糸の入口（pinned）を場所の代表として最優先で据える
  for (const e of available) {
    if (!e.requiresFlag && !e.pinned) continue
    const l = locationOf(e)
    if (!repByLoc.has(l)) repByLoc.set(l, e)
  }
  for (const e of available) {
    const l = locationOf(e)
    if (!repByLoc.has(l)) repByLoc.set(l, e)
  }

  const order: LocationId[] = []
  // ① フラグ解放／縦糸の入口イベントの場所を先頭に（複数あれば全部、最大3で頭打ち）
  for (const [l, e] of repByLoc) if ((e.requiresFlag || e.pinned) && !order.includes(l)) order.push(l)
  // ② セグメント一致の場所
  const matching = available.find((e) => e.segment === segment)
  const matchLoc = matching ? locationOf(matching) : null
  if (matchLoc && repByLoc.has(matchLoc) && !order.includes(matchLoc)) order.push(matchLoc)
  // ③ 残りの場所を seed で回して追加
  const rest = LOCATION_ORDER.filter((l) => repByLoc.has(l) && !order.includes(l))
  const start = rest.length ? Math.floor(pickRandom * rest.length) % rest.length : 0
  for (let k = 0; k < rest.length; k++) order.push(rest[(start + k) % rest.length])

  const out: GameEvent[] = []
  for (const l of order) {
    if (out.length >= 3) break
    const e = repByLoc.get(l)
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
    // 縦糸の入口(pinned)を見逃したまま終わらせない：そのスプリントの最後のデイリーで未遭遇なら必ず提示する
    // （それまでのデイリーは drawCandidates が pinned を最優先候補に据えるので自然に出やすい）。
    const beats = SPRINTS[core.sprintIndex]?.beats ?? []
    const isLastDaily = !beats.slice(core.beatIndex + 1).includes('daily')
    const pinned = avail.filter((e) => e.pinned)
    const cands = isLastDaily && pinned.length > 0 ? [pinned[0]] : drawCandidates(avail, segment, pickRandom)
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
  const cands = core.dailyCandidates.map((id) => EVENTS.find((e) => e.id === id)).filter((e): e is GameEvent => !!e)
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
  // リポジトリの健全度（開発の質）を選択で更新。
  // ★負債が高いほど“良いコードが積み上がりにくい”＝coverage の正の伸びをドラッグで鈍らせる（負の補正は不変）
  const drag = coverageDrag(core.repoDebt, core.flags)
  const rawCov = choice.repo?.coverage ?? 0
  const eventCov = rawCov > 0 ? Math.round(rawCov * drag) : rawCov
  // ★会心(great)実行は、伸ばせる主正メーターの有無に関わらず“腕前”をコードの質(coverage)に還元する。
  //   上手い実行が必ず北極星に効く成果（coverage）として積む＝「会心＝純増」。代償(メーター負)も0ルールも不変。
  //   負債が高いと腕前の伸びも鈍る（drag 適用＝雑なコードベースでは良い実装も効きにくい）。
  // ★さらに会心を“連鎖”させるほどボーナスが増す（実装の波）。great で連鎖+1、good/poor で 0 にリセット。
  //   初回会心(streak=1)は GREAT_SKILL_COVERAGE のままで従来挙動と後方互換。
  const greatStreak = tier === 'great' ? core.greatStreak + 1 : 0
  const skillCov = tier === 'great' ? Math.round(greatSkillBase(greatStreak) * drag) : 0
  const covDelta = eventCov + skillCov
  const repoCoverage = clamp01(core.repoCoverage + covDelta, REPO_COVERAGE_MAX)
  const debtRaw = choice.repo?.debt ?? 0
  const repoDebt = Math.max(0, core.repoDebt + debtRaw)
  // プランニングでゴールを“決める”: choice.sprintGoal があれば、その周回の表示ゴールに採用する
  let sprintGoals = core.sprintGoals
  if (choice.sprintGoal) {
    sprintGoals = [...core.sprintGoals]
    sprintGoals[core.sprintIndex] = choice.sprintGoal
  }
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

  const choiceBase = {
    ...core,
    meters,
    flags,
    resolvedIds,
    log,
    aiTokens,
    repoCoverage,
    repoDebt,
    sprintGoals,
    greatStreak,
  }

  // スプリントレビューを解決した瞬間に、スプリントバックログ（別レイヤー）を精算する：
  // 予測を優先順に容量まで done、超過は持ち越し、ベロシティ記録、予測の健全さで culture を ±1 ナッジ。
  // ナッジ後のメーターで 0ルールを判定する（既存設計と一貫）。
  let base = choiceBase
  let backlogReview: BacklogReview | undefined
  if (event.ceremony === 'review') {
    const res = resolveSprintBacklog(choiceBase)
    base = res.core
    // スプリント末の顧客価値（北極星）を記録し、前スプリント（無ければ baseline）からの“伸び”を測る。
    // ＝「このスプリントで顧客価値をどれだけ伸ばしたか」をレビューで可視化する（成長の手応え）。
    // 記録 index は精算前の現スプリントで固定（resolveSprintBacklog は sprintIndex を変えないが、明示する）。
    const reviewSprint = choiceBase.sprintIndex
    const rs = repoStats(base)
    const value = customerValue(base.meters, rs.coverage, rs.debtScore, rs.deliveredItems)
    const prevValue = lastValue(base.valueHistory, reviewSprint, base.valueBaseline)
    const valueHistory = [...base.valueHistory]
    valueHistory[reviewSprint] = value
    base = { ...base, valueHistory }
    backlogReview = { ...res.review, valueGain: value - prevValue }
  }

  // 発見：ヒアリングで現場の声を良く掘り当てた選択は、伏せられた発見可PBIをプロダクトバックログに加える。
  // 出来が poor（聞けていない）だと掘り当てられない＝丁寧に聞くほど発見がある。
  let discoveredPbi: { id: string; title: string } | undefined
  if (choice.discoversPbi && tier !== 'poor') {
    const rev = revealPbi(base, choice.discoversPbi)
    if (rev.revealed) {
      base = rev.core
      discoveredPbi = { id: rev.revealed.id, title: rev.revealed.title }
    }
  }

  const result: ResultView = {
    eventId: event.id,
    choiceId: choice.id,
    eventTitle: event.title,
    ceremony: event.ceremony,
    segment: event.segment,
    choiceLabel: choice.label,
    resultText: choice.resultText,
    effects: amp.effects, // 実際に適用された増減（倍率込み・選択の効果のみ。バックログのナッジは backlogReview で別表示）
    warn: choice.warn,
    precepts: preceptsForEvent(event.id),
    newPreceptIds: [], // 新規判定は store が seenPrecepts と突き合わせて埋める
    execTier: tier,
    execPrimary: amp.primary,
    execDelta: amp.delta,
    minigameKind: miniGameKindFor(event),
    tokenSpent: tokenSpent || undefined,
    coverageDelta: covDelta || undefined,
    skillCoverageBonus: skillCov || undefined, // 会心実行が腕前としてコード品質に上乗せした分（表示用）
    greatStreak: tier === 'great' ? greatStreak : undefined, // 会心の連鎖数（2以上で“波”演出。great時のみ）
    debtDelta: debtRaw || undefined,
    backlogReview,
    discoveredPbi, // ヒアリングで掘り当てた発見可PBI（あれば）。プロダクトバックログに新規追加された
    seedId: choice.seedId, // 「次の機能の種」（発見の新旧判定は store が foundSeeds と突き合わせて埋める）
  }

  // ★0ルール: どれか1つでもゲージが0になったら、その場で失敗エピローグ（バックログのナッジ込みのメーターで判定）
  const zeroed = zeroedMeter(base.meters)
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
    // 会心連鎖は非負整数。旧セーブ/破損は 0 で補完
    greatStreak: Number.isFinite(p.greatStreak) ? Math.max(0, Math.floor(p.greatStreak as number)) : 0,
    // index=sprintIndex を保つため filter で詰めず、各枠を文字列か空文字に正規化（空＝未決定）
    sprintGoals: Array.isArray(p.sprintGoals) ? p.sprintGoals.map((g) => (typeof g === 'string' ? g : '')) : [],
    ...restoreBacklog(p),
  }
}

/** バックログ状態を旧セーブ/破損に強く復元する。
 *  - backlogOrder: 既知 PBI だけに filter し、欠けている既知 id を“正本の順”で末尾補完（後で PBI 追加しても消えない）
 *  - sprintForecast: 既知かつ未done のみ
 *  - backlogDone: 既知のみ（重複排除）
 *  - velocity: 各枠を有限・非負の数へ正規化（index 整合のため詰めない） */
function restoreBacklog(
  p: Persisted
): Pick<
  ProgressCore,
  | 'backlogOrder'
  | 'sprintForecast'
  | 'backlogDone'
  | 'velocity'
  | 'valueHistory'
  | 'valueBaseline'
  | 'inProgress'
  | 'reviewProgress'
  | 'reviewCapacity'
  | 'lastCarryover'
> {
  const seedOrder = PRODUCT_BACKLOG.map((q) => q.id)
  const savedOrder = (Array.isArray(p.backlogOrder) ? p.backlogOrder : []).filter(
    (id): id is string => typeof id === 'string' && isKnownPbi(id)
  )
  const seen = new Set(savedOrder)
  const backlogOrder = [...savedOrder, ...seedOrder.filter((id) => !seen.has(id))]
  const done = new Set(
    (Array.isArray(p.backlogDone) ? p.backlogDone : []).filter(
      (id): id is string => typeof id === 'string' && isKnownPbi(id)
    )
  )
  const sprintForecast = (Array.isArray(p.sprintForecast) ? p.sprintForecast : []).filter(
    (id): id is string => typeof id === 'string' && isKnownPbi(id) && !done.has(id)
  )
  const velocity = (Array.isArray(p.velocity) ? p.velocity : []).map((v) =>
    typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0
  )
  // 顧客価値の推移は index=sprintIndex を保つため詰めない。各枠を 0..100 の整数へ正規化（未記録は0）
  const valueHistory = (Array.isArray(p.valueHistory) ? p.valueHistory : []).map((v) =>
    typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(100, Math.round(v))) : 0
  )
  // baseline は 0..100 の数。旧セーブ/破損なら開始メーターから再計算して補完
  const valueBaseline =
    typeof p.valueBaseline === 'number' && Number.isFinite(p.valueBaseline)
      ? Math.max(0, Math.min(100, Math.round(p.valueBaseline)))
      : customerValue(STARTING_METERS, 0, 0, 0)
  // In Progress は「既知∧今スプリント対象∧未done」のみ。WIP 上限超過は先頭から詰める
  const forecastSet = new Set(sprintForecast)
  const inProgress = (Array.isArray(p.inProgress) ? p.inProgress : [])
    .filter((id): id is string => typeof id === 'string' && isKnownPbi(id) && forecastSet.has(id) && !done.has(id))
    .slice(0, WIP_LIMIT)
  const rawProg = p.reviewProgress && typeof p.reviewProgress === 'object' ? p.reviewProgress : {}
  const reviewProgress: Record<string, number> = {}
  for (const id of inProgress) {
    const v = (rawProg as Record<string, unknown>)[id]
    reviewProgress[id] = typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0
  }
  const reviewCapacity =
    typeof p.reviewCapacity === 'number' && Number.isFinite(p.reviewCapacity)
      ? Math.max(0, Math.min(REVIEW_CAPACITY, p.reviewCapacity))
      : REVIEW_CAPACITY
  // 持ち越しは既知 PBI のみ（表示用ヒント。done でも保持＝「前回終わらせた」とは別概念なので絞らない）
  const lastCarryover = (Array.isArray(p.lastCarryover) ? p.lastCarryover : []).filter(
    (id): id is string => typeof id === 'string' && isKnownPbi(id)
  )
  return {
    backlogOrder,
    sprintForecast,
    backlogDone: [...done],
    velocity,
    valueHistory,
    valueBaseline,
    inProgress,
    reviewProgress,
    reviewCapacity,
    lastCarryover,
  }
}

/** その選択が生成AIトークン残量で「選べる」か（tokenCost が残量以下）。
 *  view(EventModal の封印) と engine(chooseCore の拒否) が同じ述語を参照し、層をまたいで一致させる */
export function canAfford(aiTokens: number, choice: Choice): boolean {
  return !choice.tokenCost || choice.tokenCost <= 0 || aiTokens >= choice.tokenCost
}

/** AIトークンを 0..MAX の整数に丸める */
function clampTokens(v: number): number {
  if (!Number.isFinite(v)) return AI_TOKENS_MAX
  return Math.max(0, Math.min(AI_TOKENS_MAX, Math.floor(v)))
}

/** 0..max に丸める（カバレッジ用） */
function clamp01(v: number, max: number): number {
  if (!Number.isFinite(v)) return 0
  return Math.max(0, Math.min(max, Math.round(v)))
}

/** 「顧客価値」で“届けきった”とみなすインクリメント数の目安（delivery 項の満点基準）。
 *  3スプリント×レビュー容量(REVIEW_CAPACITY)から現実的に到達しうる本数に置く。
 *  大きすぎると delivery 項が常に低空飛行で死に、小さすぎるとすぐ天井に張り付くため、
 *  「強いプレイで届けきれる」ラインに調整する。 */
export const DELIVERY_TARGET = 6

/** valueHistory のうち、指定スプリントより前で最後に記録された顧客価値を返す（無ければ baseline）。
 *  スプリントを飛ばして未記録の枠があっても、直近の実績値を辿って“伸び”の基準にする。 */
function lastValue(history: number[], sprintIndex: number, baseline: number): number {
  for (let i = sprintIndex - 1; i >= 0; i--) {
    const v = history[i]
    if (typeof v === 'number' && Number.isFinite(v)) return v
  }
  return baseline
}

/** 顧客価値の「内訳」（北極星が“どの働きで”構成されているか）。各値は顧客価値ポイント単位。
 *  - means: 3ゲージ＝ルーレットの判断（イベント層）が積む分（0..60）
 *  - delivery: 届けたインクリメント＝バックログの実装（カンバン層）が積む分（0..20）
 *  - coverage: テストカバレッジ＝開発の質（カンバン層）が積む分（0..20）
 *  - penalty: 技術的負債が削る分（>=0。表示は減算）
 *  - total: 上記を合算しクランプした最終値（0..100）＝ customerValue と一致
 *  ★「判断（ルーレット）」と「実装（バックログ）」の両レイヤーが一本の北極星に合流することを可視化する。 */
export interface ValueBreakdown {
  means: number
  delivery: number
  coverage: number
  penalty: number
  total: number
}

/** 顧客価値の内訳を算出（純粋）。customerValue はこの total を返す＝計算の単一の真実源。 */
export function customerValueBreakdown(
  meters: Meters,
  coverage: number,
  debtScore: number,
  deliveredItems = 0
): ValueBreakdown {
  const meansSum = meters.trust + meters.insight + meters.culture // 0..30
  const delivered = Math.max(0, Math.min(1, deliveredItems / DELIVERY_TARGET)) // 0..1（目安到達で満点）
  const means = (meansSum / 30) * 60
  const delivery = delivered * 20
  const cov = (Math.max(0, Math.min(100, coverage)) / 100) * 20
  const penalty = Math.max(0, debtScore) * 2
  const total = Math.max(0, Math.min(100, Math.round(means + delivery + cov - penalty)))
  return { means, delivery, coverage: cov, penalty, total }
}

/** 顧客価値（成果＝北極星指標・0..100）。FDEの働きの“結実”を導出する：
 *  3ゲージ(信頼/理解/巻き込み)の伸びを主軸(重み60)に、
 *  顧客に実際に「届けたインクリメント」(重み20)＋コードの健全度(カバレッジ・重み20)を足し、
 *  技術的負債が引く。＝信頼を築き・現場を理解し・文化を残し・良いコードを積み、
 *  かつ“動く成果を届ける”ほど、顧客価値が上がる。これを高めることがゲームの基本目標。
 *  ★届けたインクリメント(deliveredItems)を直接の加点にすることで、
 *    「シップ＝北極星が目に見えて伸びる」という核心の手応えを作る。
 *  内訳が要るときは customerValueBreakdown を使う（この関数はその total を返す）。 */
export function customerValue(meters: Meters, coverage: number, debtScore: number, deliveredItems = 0): number {
  return customerValueBreakdown(meters, coverage, debtScore, deliveredItems).total
}

// coverageDrag は game.ts に移設（chooseCore と backlog のレビューで共用・循環回避）。互換のため再エクスポート。
export { coverageDrag }

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
    sprintGoals: core.sprintGoals,
    backlogOrder: core.backlogOrder,
    sprintForecast: core.sprintForecast,
    backlogDone: core.backlogDone,
    velocity: core.velocity,
    valueHistory: core.valueHistory,
    valueBaseline: core.valueBaseline,
    greatStreak: core.greatStreak,
    inProgress: core.inProgress,
    reviewProgress: core.reviewProgress,
    reviewCapacity: core.reviewCapacity,
    lastCarryover: core.lastCarryover,
  }
}
