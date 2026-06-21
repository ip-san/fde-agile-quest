// ───────────────────────────────────────────────────────────
// プロダクト/スプリント バックログのロジック（純粋関数）。
// daily ルーレットとは独立した“別レイヤー”。localStorage/zustand/乱数に非依存。
// ProgressCore は型のみ import（progression.ts との実行時循環を避ける）。
// 現在ビートの判定は SPRINTS を chapter-01 から直接読む。
// ───────────────────────────────────────────────────────────
import { DISCOVERABLE_BACKLOG, PRODUCT_BACKLOG, SPRINTS } from '../data/chapters/chapter-01'
import type { BacklogItem, BacklogReview, ExecTier, GameFlag, ReviewDepth } from '../types'
import { coverageDrag } from './game'
import type { ProgressCore } from './progression'

// 既知 PBI＝初期の PRODUCT_BACKLOG ＋ 発見可の DISCOVERABLE_BACKLOG（後者は掘り当てて backlogOrder に入るまで“可視”にならない）。
const PBI_BY_ID = new Map<string, BacklogItem>([...PRODUCT_BACKLOG, ...DISCOVERABLE_BACKLOG].map((p) => [p.id, p]))

// ── カンバン／レビューのバランス定数（暫定・調整可）──
/** 同時着手の上限（In Progress 列の WIP 制限。仕掛りを学ぶ）。レトロ改善で下げられる（下限1）。 */
export const WIP_LIMIT = 2
/** 1スプリントの人間レビュー容量（毎スプリントこの値にリセット＝ボトルネック資源）。レトロ改善で増やせる。 */
export const REVIEW_CAPACITY = 6

// ── レトロ改善（機構：Retro 昇格）──
// レトロでプレイヤーが選んだプロセス改善を retroImprovements に積む（'capacity'/'wip'）。
// 1レトロ1つ＝他は見送り（機会コスト）。次スプリント以降のパラメータに永続して効く。
/** レトロ改善を反映したレビュー容量（制約理論：ボトルネックを広げる投資。'capacity' 1つにつき +1）。 */
export function reviewCapacityFor(retroImprovements: readonly string[]): number {
  return REVIEW_CAPACITY + retroImprovements.filter((x) => x === 'capacity').length
}
/** レトロ改善を反映した WIP 上限（フロー改善：仕掛りを絞る。'wip' 1つにつき −1、下限1）。 */
export function wipLimitFor(retroImprovements: readonly string[]): number {
  return Math.max(1, WIP_LIMIT - retroImprovements.filter((x) => x === 'wip').length)
}
/** 着手1回（AIにドラフト生成させる）の生成トークンコスト（安い） */
export const GEN_TOKEN_COST = 80
/** レビュー深さごとの容量コスト */
const REVIEW_COST: Record<ReviewDepth, number> = { quick: 1, thorough: 2 }
/** レビュー深さごとの基礎進捗（見積りポイントに対して積む量） */
const REVIEW_GAIN: Record<ReviewDepth, number> = { quick: 1, thorough: 2 }
/** ミニゲームの出来による倍率 */
const TIER_MULT: Record<'great' | 'good' | 'poor', number> = { great: 1.5, good: 1, poor: 0.5 }
/** 深いレビューで積むテストカバレッジ(%)／浅いレビューで増える技術的負債 */
const COVERAGE_PER_THOROUGH = 4
const DEBT_PER_QUICK = 1
const REPO_COVERAGE_CAP = 100

/** 現在ビートが“作業中（デイリー）”か。着手/レビューはこの間だけ可能。 */
function isWorkBeat(core: Pick<ProgressCore, 'sprintIndex' | 'beatIndex'>): boolean {
  return SPRINTS[core.sprintIndex]?.beats[core.beatIndex] === 'daily'
}

/** PBI の元データ（表示用）。未知 id は undefined。 */
export function backlogItem(id: string): BacklogItem | undefined {
  return PBI_BY_ID.get(id)
}

/** PBI の見積りポイント（未知 id は 0）。 */
export function estimateOf(id: string): number {
  return PBI_BY_ID.get(id)?.estimate ?? 0
}

// ── レガシー（「太く残す」）＝去り際にシステムが自分なしで回る状態を残せたか ──
/** 「太く残す」PBI 群＝仕組みを人から人へ渡し、運用として根付かせる項目。
 *  ここを Ship したかが、エンディングの“去り際の実体”を決める（出力カウントではなく成果の質で読む）。
 *  UI でこれらを「太く残す（結末に効く）」として強調表示するため公開する。 */
export const LEGACY_PBI_IDS = ['pbi-handoff-doc', 'pbi-onboarding', 'pbi-monitoring'] as const

/** この PBI が「太く残す」レガシー項目か（UI 強調用）。 */
export function isLegacyPbi(id: string): boolean {
  return (LEGACY_PBI_IDS as readonly string[]).includes(id)
}
/** レガシー成立に必要な Ship 数（3項目中）。レビュー容量律速を踏まえ「過半＝2」を閾に置く（調整可）。 */
const LEGACY_SHIP_THRESHOLD = 2

/** 「太く残す」PBI のうち Ship（DoD達成）した数。 */
function legacyShippedCount(backlogDone: readonly string[]): number {
  const done = new Set(backlogDone)
  return LEGACY_PBI_IDS.filter((id) => done.has(id)).length
}

/** レガシーが“定着”したか。
 *  ＝太く残すPBIを過半 Ship し、かつ属人化させなかった（soloHero でない＝自分が窓口を抱えていない）。
 *  Ship しただけ（手順書を書いただけ）では定着とみなさない＝「Ship≠定着」を機構に落とす。 */
export function isLegacyEmbedded(backlogDone: readonly string[], flags: ReadonlySet<GameFlag>): boolean {
  return legacyShippedCount(backlogDone) >= LEGACY_SHIP_THRESHOLD && !flags.has('soloHero')
}

/** PBI として既知の id か。 */
export function isKnownPbi(id: string): boolean {
  return PBI_BY_ID.has(id)
}

/** 発見可（初期は伏せ）の PBI か。 */
export function isDiscoverablePbi(id: string): boolean {
  return PBI_BY_ID.get(id)?.discoverable === true
}

/** 発見可 PBI を“掘り当てて”プロダクトバックログ（backlogOrder）の末尾に加える。
 *  既知かつ未掲載のときだけ追加し、新しく現れた id を返す（既出/未知なら null）。
 *  PO の優先順位付けは後でプレイヤーが提案できるので、ここでは素直に末尾へ。 */
export function revealPbi(core: ProgressCore, id: string): { core: ProgressCore; revealed: BacklogItem | null } {
  const item = PBI_BY_ID.get(id)
  if (!item || core.backlogOrder.includes(id)) return { core, revealed: null }
  return { core: { ...core, backlogOrder: [...core.backlogOrder, id] }, revealed: item }
}

/** 現在ビートがプランニングか（予測の編集はプランニング中のみ許可する）。 */
function isPlanningBeat(core: Pick<ProgressCore, 'sprintIndex' | 'beatIndex'>): boolean {
  return SPRINTS[core.sprintIndex]?.beats[core.beatIndex] === 'planning'
}

/** 予測（スプリントバックログ）の見積り合計。容量メーター/警告表示用。 */
export function forecastPoints(core: Pick<ProgressCore, 'sprintForecast'>): number {
  return core.sprintForecast.reduce((s, id) => s + estimateOf(id), 0)
}

/** PBI をスプリント予測に出し入れ（プランニング中・未done のみ）。容量超過はブロックしない＝過剰予測は可能。 */
export function toggleForecast(core: ProgressCore, pbiId: string): ProgressCore {
  if (!isPlanningBeat(core)) return core
  if (!PBI_BY_ID.has(pbiId)) return core
  if (core.backlogDone.includes(pbiId)) return core
  const has = core.sprintForecast.includes(pbiId)
  const sprintForecast = has ? core.sprintForecast.filter((id) => id !== pbiId) : [...core.sprintForecast, pbiId]
  return { ...core, sprintForecast }
}

/** プロダクトバックログの並べ替え（正規化）。指定に漏れた既知 id は元順で末尾に補完し、
 *  未知 id は捨てる（消失・混入に強く正規化）。PO 承認後の確定に使う低レベル関数。 */
export function reorderBacklog(core: ProgressCore, ids: string[]): ProgressCore {
  const known = ids.filter((id) => PBI_BY_ID.has(id))
  const seen = new Set(known)
  const rest = core.backlogOrder.filter((id) => !seen.has(id) && PBI_BY_ID.has(id))
  return { ...core, backlogOrder: [...known, ...rest] }
}

/** PO（プロダクトオーナー）の並べ替え提案レビューの結果。 */
export interface ProposalVerdict {
  /** PO が確定した公式の優先順位（これを backlogOrder に確定する） */
  order: string[]
  /** 提案がそのまま通ったか（既にゴール優先を満たしていた） */
  accepted: boolean
  /** PO が「今スプリントのゴールに直結する」として上に戻した項目の id（補正の説明用） */
  floated: string[]
}

/** プレイヤーの並べ替え“提案”を PO がレビューする（純粋）。
 *  優先順位の所有は PO にある＝原則「今スプリントのゴールに直結する未完了項目（sprintHint＝今sprint）を最優先」。
 *  それ以外の相対順は提案を尊重する。完了済みは末尾へ寄せる。
 *  - 既にゴール優先なら accepted=true（提案を全面採用）
 *  - ゴール項目が非ゴール項目より下に埋もれていたら、その項目を上に戻し floated に記録（部分採用） */
export function reviewBacklogProposal(
  core: Pick<ProgressCore, 'sprintIndex' | 'backlogDone' | 'backlogOrder'>,
  proposedIds: string[]
): ProposalVerdict {
  // 提案を既知 id に正規化し、漏れた既知 id は現行順で末尾補完
  const known = proposedIds.filter((id) => PBI_BY_ID.has(id))
  const seen = new Set(known)
  const full = [...known, ...core.backlogOrder.filter((id) => !seen.has(id) && PBI_BY_ID.has(id))]

  const done = new Set(core.backlogDone)
  const sprintNo = SPRINTS[core.sprintIndex]?.n
  const isGoal = (id: string) => PBI_BY_ID.get(id)?.sprintHint === sprintNo

  const active = full.filter((id) => !done.has(id))
  const doneItems = full.filter((id) => done.has(id))
  const goal = active.filter(isGoal)
  const others = active.filter((id) => !isGoal(id))
  const correctedActive = [...goal, ...others]

  // 提案のアクティブ順が既にゴール優先か（補正不要＝全面採用）
  const accepted = active.every((id, i) => id === correctedActive[i])

  // 上に戻した（非ゴール項目より下に埋もれていた）ゴール項目を記録
  const floated: string[] = []
  let sawOther = false
  for (const id of active) {
    if (isGoal(id)) {
      if (sawOther) floated.push(id)
    } else {
      sawOther = true
    }
  }

  return { order: [...correctedActive, ...doneItems], accepted, floated }
}

/** 1項目を上(-1)/下(+1)へ動かす（UIの並べ替えボタン用）。端なら no-op。 */
export function moveBacklogItem(core: ProgressCore, id: string, dir: -1 | 1): ProgressCore {
  const order = [...core.backlogOrder]
  const i = order.indexOf(id)
  if (i < 0) return core
  const j = i + dir
  if (j < 0 || j >= order.length) return core
  ;[order[i], order[j]] = [order[j], order[i]]
  return { ...core, backlogOrder: order }
}

/** 着手できるか（To Do→In Progress）。作業中ビート・予測内・未done・未着手・WIP余裕・生成トークンあり。 */
export function canStart(
  core: Pick<
    ProgressCore,
    'sprintIndex' | 'beatIndex' | 'sprintForecast' | 'backlogDone' | 'inProgress' | 'aiTokens' | 'retroImprovements'
  >,
  pbiId: string
): boolean {
  return (
    isWorkBeat(core) &&
    PBI_BY_ID.has(pbiId) &&
    core.sprintForecast.includes(pbiId) &&
    !core.backlogDone.includes(pbiId) &&
    !core.inProgress.includes(pbiId) &&
    core.inProgress.length < wipLimitFor(core.retroImprovements) &&
    core.aiTokens >= GEN_TOKEN_COST
  )
}

/** 着手：AI にドラフトを生成させて In Progress へ。生成トークンを消費（安い）。 */
export function startItem(core: ProgressCore, pbiId: string): ProgressCore {
  if (!canStart(core, pbiId)) return core
  return {
    ...core,
    inProgress: [...core.inProgress, pbiId],
    reviewProgress: { ...core.reviewProgress, [pbiId]: 0 },
    aiTokens: Math.max(0, core.aiTokens - GEN_TOKEN_COST),
  }
}

/** レビューできるか（In Progress→Done へ進める）。作業中ビート・着手中・レビュー容量あり。 */
export function canReview(
  core: Pick<ProgressCore, 'sprintIndex' | 'beatIndex' | 'inProgress' | 'reviewCapacity'>,
  pbiId: string
): boolean {
  return isWorkBeat(core) && core.inProgress.includes(pbiId) && core.reviewCapacity > 0
}

/** レビュー：人間のレビュー容量を消費して In Progress 項目の進捗を積む。
 *  深さ×ミニゲーム出来×負債ドラッグで進む。深い→coverage+、浅い→debt+。見積り到達で Done。 */
export function reviewItem(core: ProgressCore, pbiId: string, depth: ReviewDepth, tier: ExecTier): ProgressCore {
  if (!isWorkBeat(core) || !core.inProgress.includes(pbiId) || core.reviewCapacity <= 0) return core
  const reviewCapacity = Math.max(0, core.reviewCapacity - REVIEW_COST[depth])
  const drag = coverageDrag(core.repoDebt, core.flags)
  const gain = REVIEW_GAIN[depth] * TIER_MULT[tier] * drag
  const prog = (core.reviewProgress[pbiId] ?? 0) + gain

  // リポジトリ品質：深いレビュー＝テストで coverage を積む（負債ドラッグ込み）／浅い＝負債が増える
  let repoCoverage = core.repoCoverage
  let repoDebt = core.repoDebt
  if (depth === 'thorough')
    repoCoverage = Math.min(REPO_COVERAGE_CAP, repoCoverage + Math.round(COVERAGE_PER_THOROUGH * drag))
  else repoDebt = repoDebt + DEBT_PER_QUICK

  const reviewProgress: Record<string, number> = { ...core.reviewProgress, [pbiId]: prog }
  let inProgress = core.inProgress
  let backlogDone = core.backlogDone
  let shippedUndoneIds = core.shippedUndoneIds
  let flags = core.flags
  if (prog >= estimateOf(pbiId)) {
    // DoD 達成＝Done。In Progress から外し、通算 Done（インクリメント）へ
    delete reviewProgress[pbiId]
    inProgress = core.inProgress.filter((x) => x !== pbiId)
    backlogDone = [...core.backlogDone, pbiId]
    // ★完了させたレビューが浅い(quick)＝DoD を妥協して Ship した（undone work）。
    //   物語へ「負債の取り立て」を呼ぶ橋として shippedUndone を立て（後段の demofail/debt 回）、
    //   どの項目を妥協 Ship したかを id でも記録（Done カードの「✓ DoD / ⚠ 浅い」出し分け用）。
    if (depth === 'quick') {
      if (!flags.has('shippedUndone')) flags = new Set(flags).add('shippedUndone')
      shippedUndoneIds = [...core.shippedUndoneIds, pbiId]
    }
  }
  return {
    ...core,
    flags,
    reviewCapacity,
    reviewProgress,
    inProgress,
    backlogDone,
    shippedUndoneIds,
    repoCoverage,
    repoDebt,
  }
}

/** スプリント末（レビュー）の精算。スプリント中に Done した分を確定し、未Done（To Do+In Progress）を
 *  キャリーオーバー。ベロシティを記録し、WIP規律＝着手を終わらせたかで culture を ±1 ナッジ。
 *  次スプリントに向けレビュー容量・In Progress・進捗をリセット。純粋。 */
export function resolveSprintBacklog(core: ProgressCore): { core: ProgressCore; review: BacklogReview } {
  const doneSet = new Set(core.backlogDone)
  const doneThisSprint = core.sprintForecast.filter((id) => doneSet.has(id))
  const carryIds = core.sprintForecast.filter((id) => !doneSet.has(id))

  const velocityPts = doneThisSprint.reduce((s, id) => s + estimateOf(id), 0)
  const velocity = [...core.velocity]
  velocity[core.sprintIndex] = velocityPts

  // culture ナッジは「実際にカンバンに手を付けた（engaged）」場合だけ働かせる。
  //   engaged＝今スプリントに Done したか、着手中(In Progress)を抱えている。
  //   ・engaged で全部完遂（持ち越し無し）→ +1（WIP を守って終わらせた）
  //   ・engaged だが未完を持ち越し → −1
  //   ・未着手のまま（予測しただけ/そもそも触っていない）→ 0（“使わなかった”を罰しない）
  const engaged = doneThisSprint.length > 0 || core.inProgress.length > 0
  const cultureDelta = engaged ? (carryIds.length === 0 ? 1 : -1) : 0
  const culture = Math.max(0, Math.min(10, core.meters.culture + cultureDelta))
  const meters = cultureDelta ? { ...core.meters, culture } : core.meters
  const appliedCultureDelta = meters.culture - core.meters.culture

  const toView = (id: string) => {
    const p = PBI_BY_ID.get(id)
    return { id, title: p?.title ?? id, estimate: p?.estimate ?? 0 }
  }
  const review: BacklogReview = {
    done: doneThisSprint.map(toView),
    carryover: carryIds.map(toView),
    velocity: velocityPts,
    cultureDelta: appliedCultureDelta,
  }

  // 機構②: ステークホルダー間の“非対称トレードオフ”を記録する。今スプリントのゴール直結項目
  // (sprintHint===sprintNo) をステークホルダー別に見て、「一方のゴールを届けた“のに”他方を未達にした」
  // ときだけ、後回しにされた側の反応フラグを立てる（後段で遅れて響く）。
  // ＝容量不足で両方未達／両方達成では発火しない＝明確に「どちらを選んだか」のときのみ。単一正解化を避ける
  //   機会コスト型：現場優先→情シスが不安(trust摩擦)／情シス優先→現場が後回し(insight機会損失)。
  const sprintNo = SPRINTS[core.sprintIndex]?.n
  let flags = core.flags
  if (sprintNo !== undefined) {
    // 判定は“今スプリントに予測（forecast）したゴール項目”に限る＝プレイヤーが実際に抱えた約束の範囲。
    //   これにより「容量の都合で最初から積まなかった項目」では発火せず、「両方積んだのに片方だけ終えた＝
    //   どちらを finish するか選んだ」明確なトレードオフのときだけ後回し側のフラグが立つ（過剰発火を防ぐ）。
    const goalForecastOf = (s: 'joushi' | 'genba') =>
      core.sprintForecast.filter((id) => {
        const p = PBI_BY_ID.get(id)
        return p?.sprintHint === sprintNo && p.stakeholder === s
      })
    const someDelivered = (ids: string[]) => ids.some((id) => doneThisSprint.includes(id))
    const someUndelivered = (ids: string[]) => ids.some((id) => !doneSet.has(id))
    const genbaGoal = goalForecastOf('genba')
    const joushiGoal = goalForecastOf('joushi')
    const addFlag = (f: GameFlag) => {
      if (!flags.has(f)) flags = new Set(flags).add(f)
    }
    // 現場のゴールを届け、情シスのゴールを未達 → 情シス(結城)を後回しにした
    if (someDelivered(genbaGoal) && someUndelivered(joushiGoal)) addFlag('deprioritizedJoushi')
    // 情シスのゴールを届け、現場のゴールを未達 → 現場(田淵)を後回しにした
    if (someDelivered(joushiGoal) && someUndelivered(genbaGoal)) addFlag('deprioritizedGenba')
  }

  // 精算後は次スプリントへ：予測/In Progress/進捗をクリア、レビュー容量を満タンに戻す
  const next: ProgressCore = {
    ...core,
    meters,
    flags,
    velocity,
    sprintForecast: [],
    inProgress: [],
    reviewProgress: {},
    // レビュー容量は満タンにリセット＝レトロ改善（capacity 投資）を反映した上限まで戻す
    reviewCapacity: reviewCapacityFor(core.retroImprovements),
    // 次プランニングで「↪前回持ち越し」を示すため、終わらせきれなかった分を記録（done なら []）
    lastCarryover: carryIds,
  }
  return { core: next, review }
}
