// ───────────────────────────────────────────────────────────
// プロダクト/スプリント バックログのロジック（純粋関数）。
// daily ルーレットとは独立した“別レイヤー”。localStorage/zustand/乱数に非依存。
// ProgressCore は型のみ import（progression.ts との実行時循環を避ける）。
// 現在ビートの判定は SPRINTS を chapter-01 から直接読む。
// ───────────────────────────────────────────────────────────
import { BASE_CAPACITY, PRODUCT_BACKLOG, SPRINTS } from '../data/chapters/chapter-01'
import type { BacklogItem, BacklogReview } from '../types'
import type { ProgressCore } from './progression'

const PBI_BY_ID = new Map<string, BacklogItem>(PRODUCT_BACKLOG.map((p) => [p.id, p]))

/** PBI の元データ（表示用）。未知 id は undefined。 */
export function backlogItem(id: string): BacklogItem | undefined {
  return PBI_BY_ID.get(id)
}

/** PBI の見積りポイント（未知 id は 0）。 */
export function estimateOf(id: string): number {
  return PBI_BY_ID.get(id)?.estimate ?? 0
}

/** PBI として既知の id か。 */
export function isKnownPbi(id: string): boolean {
  return PBI_BY_ID.has(id)
}

/** 現在ビートがプランニングか（予測の編集はプランニング中のみ許可する）。 */
function isPlanningBeat(core: Pick<ProgressCore, 'sprintIndex' | 'beatIndex'>): boolean {
  return SPRINTS[core.sprintIndex]?.beats[core.beatIndex] === 'planning'
}

/** 今スプリントのキャパシティ（容量）。“昨日の天気”＝前スプリントのベロシティ。
 *  初回（または前回が0）は基準値 BASE_CAPACITY。決定的・UIに表示する。 */
export function sprintCapacity(core: Pick<ProgressCore, 'sprintIndex' | 'velocity'>): number {
  const prev = core.velocity[core.sprintIndex - 1]
  return core.sprintIndex > 0 && Number.isFinite(prev) && prev > 0 ? prev : BASE_CAPACITY
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

/** スプリント末（レビュー）のバックログ精算。
 *  予測項目を backlogOrder の優先順に走査し、累積見積り ≤ 容量の間だけ done（DoD は二値）。
 *  超過分はキャリーオーバー。ベロシティを記録し、予測の健全さで culture を ±1 ナッジ。純粋。 */
export function resolveSprintBacklog(core: ProgressCore): { core: ProgressCore; review: BacklogReview } {
  const capacity = sprintCapacity(core)
  const orderIndex = new Map(core.backlogOrder.map((id, i) => [id, i]))
  const forecast = core.sprintForecast
    .filter((id) => PBI_BY_ID.has(id) && !core.backlogDone.includes(id))
    .slice()
    .sort((a, b) => (orderIndex.get(a) ?? Number.MAX_SAFE_INTEGER) - (orderIndex.get(b) ?? Number.MAX_SAFE_INTEGER))

  const doneIds: string[] = []
  const carryIds: string[] = []
  let acc = 0
  for (const id of forecast) {
    const pts = estimateOf(id)
    if (acc + pts <= capacity) {
      acc += pts
      doneIds.push(id)
    } else {
      carryIds.push(id)
    }
  }

  const velocityPts = doneIds.reduce((s, id) => s + estimateOf(id), 0)
  const velocity = [...core.velocity]
  velocity[core.sprintIndex] = velocityPts
  const backlogDone = [...core.backlogDone, ...doneIds]

  // culture ナッジ: 予測ありで全部 done（健全・持続可能ペース）→ +1 / 過剰予測で持ち越し → −1 / 予測ゼロ → 0
  let cultureDelta = 0
  if (forecast.length > 0) cultureDelta = carryIds.length === 0 ? 1 : -1
  const culture = Math.max(0, Math.min(10, core.meters.culture + cultureDelta))
  const meters = cultureDelta ? { ...core.meters, culture } : core.meters
  // 実際に動いた量（クランプで頭打ちなら0になりうる。表示はこの実差分で）
  const appliedCultureDelta = meters.culture - core.meters.culture

  const toView = (id: string) => {
    const p = PBI_BY_ID.get(id)!
    return { id, title: p.title, estimate: p.estimate }
  }
  const review: BacklogReview = {
    done: doneIds.map(toView),
    carryover: carryIds.map(toView),
    velocity: velocityPts,
    capacity,
    cultureDelta: appliedCultureDelta,
  }
  const next: ProgressCore = { ...core, meters, velocity, backlogDone, sprintForecast: [] }
  return { core: next, review }
}
