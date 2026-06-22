// ───────────────────────────────────────────────────────────
// プロダクト/スプリント バックログのロジック（純粋関数）。
// daily ルーレットとは独立した“別レイヤー”。localStorage/zustand/乱数に非依存。
// ProgressCore は型のみ import（progression.ts との実行時循環を避ける）。
// 現在ビートの判定は SPRINTS を chapter-01 から直接読む。
// ───────────────────────────────────────────────────────────
import { DISCOVERABLE_BACKLOG, EVENT_BACKLOG, PRODUCT_BACKLOG, SPRINTS } from '../data/chapters/chapter-01'
import type { BacklogItem, BacklogReview, ExecTier, GameFlag, ReviewDepth } from '../types'
import { coverageDrag } from './game'
import type { ProgressCore } from './progression'

// 既知 PBI＝初期の PRODUCT_BACKLOG ＋ 発見可の DISCOVERABLE_BACKLOG ＋ イベント発の EVENT_BACKLOG
// （後ろ2つは掘り当て／要望受け入れで backlogOrder に入るまで“可視”にならない）。
const PBI_BY_ID = new Map<string, BacklogItem>(
  [...PRODUCT_BACKLOG, ...DISCOVERABLE_BACKLOG, ...EVENT_BACKLOG].map((p) => [p.id, p])
)

// ── カンバン／レビューのバランス定数（暫定・調整可）──
/** 同時着手の上限（In Progress 列の WIP 制限。仕掛りを学ぶ）。レトロ改善で下げられる（下限1）。 */
export const WIP_LIMIT = 2
/** 1日（デイリービート）あたりの人間レビュー容量（＝AIの生成を人がどれだけ確かめられるかの日次スループット制約）。
 *  毎 daily ビート開始時にこの値へリセットし、繰り越さない（使い切り）＝「1日で全部投入」はできず日次ペースで流す。
 *  カンバン/制約理論（ToC）由来の概念で、スクラムのセレモニーではない。レトロ改善(capacity)で恒久的に増やせる。 */
export const REVIEW_CAPACITY_PER_DAY = 4

// ── レトロ改善（機構：Retro 昇格）──
// レトロでプレイヤーが選んだプロセス改善を retroImprovements に積む（'capacity'/'wip'）。
// 1レトロ1つ＝他は見送り（機会コスト）。次スプリント以降のパラメータに永続して効く。
/** レトロ改善を反映した「1日あたり」レビュー容量（制約理論：ボトルネックを elevate する投資。'capacity' 1つにつき +1/日）。 */
export function reviewCapacityFor(retroImprovements: readonly string[]): number {
  return REVIEW_CAPACITY_PER_DAY + retroImprovements.filter((x) => x === 'capacity').length
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
/** フロー改善（レトロで WIP を下げた＝focus）中、深いレビューが追加で積む coverage(%)。
 *  ＝wip レバーの固有メリット（レビューの“質”）。capacity レバー（レビューの“量”）と等価で別ベクトル。 */
const FOCUS_COVERAGE_BONUS = 2
const REPO_COVERAGE_CAP = 100

/** 現在ビートが“作業中（デイリー）”か。着手/レビューはこの間だけ可能。 */
function isWorkBeat(core: Pick<ProgressCore, 'sprintIndex' | 'beatIndex'>): boolean {
  return SPRINTS[core.sprintIndex]?.beats[core.beatIndex] === 'daily'
}

// ── PBI→作業項目（SBI）分割の基盤ヘルパ ──
// 分割した作業項目の id は `${pbiId}#${n}`（n は1始まり）。'#' は既存 PBI id に出現しないので衝突しない。
// SBI が一つも存在しない（誰も分割していない）状態では、下のヘルパ・派生はすべて従来挙動と恒等になる。

/** 分割された作業項目（SBI）の id か（'#' を含む）。 */
export function isSbi(id: string): boolean {
  return id.includes('#')
}
/** SBI id から親 PBI id を返す（素の PBI id はそのまま返す）。 */
export function parentPbiOf(id: string): string {
  const i = id.indexOf('#')
  return i < 0 ? id : id.slice(0, i)
}
/** SBI id の作業項目データ（親 PBI の split[n-1]）。SBI でない/未知なら undefined。 */
function sbiOf(id: string): { title: string; estimate: number } | undefined {
  const i = id.indexOf('#')
  if (i < 0) return undefined
  const n = Number(id.slice(i + 1))
  if (!Number.isInteger(n) || n < 1) return undefined
  return PBI_BY_ID.get(id.slice(0, i))?.split?.[n - 1]
}

/** PBI の元データ（表示用）。未知 id は undefined。 */
export function backlogItem(id: string): BacklogItem | undefined {
  return PBI_BY_ID.get(id)
}

/** id（PBI または SBI）の表示見出し。SBI は「親PBI名 — 作業項目名」。未知は id をそのまま。 */
export function titleOf(id: string): string {
  const sbi = sbiOf(id)
  if (sbi) return sbi.title
  return PBI_BY_ID.get(id)?.title ?? id
}

/** 見積りポイント。SBI なら親 PBI の split 配分、素の PBI なら自身の estimate（未知は 0）。 */
export function estimateOf(id: string): number {
  const sbi = sbiOf(id)
  if (sbi) return sbi.estimate
  return PBI_BY_ID.get(id)?.estimate ?? 0
}

/** backlogDone（PBI/SBI 混在）から「納品済みの親 PBI 集合」を導出する。
 *  ・素のまま done になった PBI（割らずに納品）はそのまま納品。
 *  ・split を持つ PBI は、全 SBI が done になって初めて納品（インクリメント＝PBI 単位）。
 *  ★SBI が一つも無い状態では「done の素 PBI 集合」と恒等＝既存の PBI 連動機構（顧客価値/legacy/
 *    deprioritized）を一切変えない。これが分割導入の安全弁。velocity だけは SBI 配分 pt で別途集計する。 */
export function deliveredPbiIds(backlogDone: readonly string[]): string[] {
  const done = new Set(backlogDone)
  const out: string[] = []
  for (const [id, item] of PBI_BY_ID) {
    if (done.has(id)) {
      out.push(id) // 割らずに素のまま納品
    } else if (item.split?.length && item.split.every((_, i) => done.has(`${id}#${i + 1}`))) {
      out.push(id) // 全作業項目が完了して納品
    }
  }
  return out
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

/** 「太く残す」PBI のうち Ship（DoD達成）＝納品済みの数。分割した PBI は全作業項目完了で納品とみなす
 *  （deliveredPbiIds 経由＝親 PBI 単位）。SBI 不在では done の素集合と恒等。 */
function legacyShippedCount(backlogDone: readonly string[]): number {
  const delivered = new Set(deliveredPbiIds(backlogDone))
  return LEGACY_PBI_IDS.filter((id) => delivered.has(id)).length
}

/** レガシーが“定着”したか。
 *  ＝太く残すPBIを過半 Ship し、かつ属人化させなかった（soloHero でない＝自分が窓口を抱えていない）。
 *  Ship しただけ（手順書を書いただけ）では定着とみなさない＝「Ship≠定着」を機構に落とす。 */
export function isLegacyEmbedded(backlogDone: readonly string[], flags: ReadonlySet<GameFlag>): boolean {
  return legacyShippedCount(backlogDone) >= LEGACY_SHIP_THRESHOLD && !flags.has('soloHero')
}

/** 既知の作業 id か（素の PBI、または有効な SBI＝親 PBI の split 範囲内）。
 *  ＝SBI を含むセーブを restore が破棄しない／canStart 等が SBI を未知として落とさないため。 */
export function isKnownPbi(id: string): boolean {
  return PBI_BY_ID.has(id) || sbiOf(id) !== undefined
}

/** 発見可（初期は伏せ）の PBI か。 */
export function isDiscoverablePbi(id: string): boolean {
  return PBI_BY_ID.get(id)?.discoverable === true
}

/** イベントでステークホルダーが持ち込んだ要望由来の PBI か（UIバッジの出し分け用）。 */
export function isEventPbi(id: string): boolean {
  return PBI_BY_ID.get(id)?.origin === 'event'
}

/** イベント発の“新しい要望”をプロダクトバックログへ受け入れる。
 *  ・既知かつ未掲載のときだけ追加する（既出/未知なら no-op で added:null）。
 *  ・toSprint=false：プロダクトバックログ末尾に積む（暫定見積り＝要リファインメント）。
 *    ＝「断れずに今やる」のではなく「次のために形に残す」——後のプランニングで並べ替え・Ready 化して扱う。
 *  ・toSprint=true：割り込みを“受けた”＝今スプリントの予測へ即足す。即着手できるよう Ready 扱い
 *    （unrefined にしない）。上位優先の規律を意図的に飛ばす＝ステークホルダーが名指しした割り込みの表現。
 *    ゴール圧迫の代償は容量超過→キャリーオーバーで顕在化する（精算ロジックがそのまま罰する）。 */
export function acceptRequestedPbi(
  core: ProgressCore,
  id: string,
  toSprint: boolean
): { core: ProgressCore; added: BacklogItem | null } {
  if (!toSprint) {
    // 次のために形に残す＝発見可PBIの掘り当てと同じ「末尾に積み、暫定見積り（要リファインメント）」。
    // revealPbi に委譲して二重実装を避ける（追加条件＝既知かつ未掲載、も revealPbi と共通）。
    const rev = revealPbi(core, id)
    return { core: rev.core, added: rev.revealed }
  }
  const item = PBI_BY_ID.get(id)
  // 割り込み：backlogOrder にも sprintForecast にも未掲載のときだけ受ける（二重追加防止）。
  if (!item || core.backlogOrder.includes(id) || core.sprintForecast.includes(id)) return { core, added: null }
  return {
    core: {
      ...core,
      backlogOrder: [...core.backlogOrder, id], // 全体像にも現れる（プロダクトバックログ参照で見える）
      sprintForecast: [...core.sprintForecast, id], // 今スプリントへ割り込み（スコープ変更を受けた）
      // unrefinedPbis には足さない＝割り込みは“合意済み”として即 Ready（着手・レビュー可能）
    },
    added: item,
  }
}

/** 発見可 PBI を“掘り当てて”プロダクトバックログ（backlogOrder）の末尾に加える。
 *  既知かつ未掲載のときだけ追加し、新しく現れた id を返す（既出/未知なら null）。
 *  PO の優先順位付けは後でプレイヤーが提案できるので、ここでは素直に末尾へ。 */
export function revealPbi(core: ProgressCore, id: string): { core: ProgressCore; revealed: BacklogItem | null } {
  const item = PBI_BY_ID.get(id)
  if (!item || core.backlogOrder.includes(id)) return { core, revealed: null }
  // 掘り当てた直後は“暫定見積り（未リファインメント）”＝Ready でない。プランニングで refinePbi するまで予測に積めない。
  return {
    core: { ...core, backlogOrder: [...core.backlogOrder, id], unrefinedPbis: [...core.unrefinedPbis, id] },
    revealed: item,
  }
}

/** この PBI が“未リファインメント（暫定見積り）”か。発見直後で Ready 化前。 */
export function isUnrefinedPbi(core: Pick<ProgressCore, 'unrefinedPbis'>, id: string): boolean {
  return core.unrefinedPbis.includes(id)
}

/** 発見した PBI を“リファインメント”して Ready にする（プランニング中・未リファインメントのみ）。
 *  ＝掘り当てた仕事は暫定のまま予測に積めず、見積りを確かめて Ready にして初めてスプリント予測に積める。 */
export function refinePbi(core: ProgressCore, pbiId: string): ProgressCore {
  if (!isPlanningBeat(core)) return core
  if (!core.unrefinedPbis.includes(pbiId)) return core
  return { ...core, unrefinedPbis: core.unrefinedPbis.filter((id) => id !== pbiId) }
}

/** 現在ビートがプランニングか（予測の編集はプランニング中のみ許可する）。 */
function isPlanningBeat(core: Pick<ProgressCore, 'sprintIndex' | 'beatIndex'>): boolean {
  return SPRINTS[core.sprintIndex]?.beats[core.beatIndex] === 'planning'
}

/** 予測（スプリントバックログ）の見積り合計。容量メーター/警告表示用。 */
export function forecastPoints(core: Pick<ProgressCore, 'sprintForecast'>): number {
  return core.sprintForecast.reduce((s, id) => s + estimateOf(id), 0)
}

/** その PBI を“今、新たに予測へ選べる”か（上位優先＝飛ばし入れ禁止の核）。
 *  Ready（未リファインメントでない）・未done・未予測で、かつ backlogOrder 上で自分より上位の
 *  「Ready かつ未done」項目がすべて予測済み（または done）であること。＝PO 順の上位から詰める。
 *  下位を先に入れたいなら、並べ替えを PO に提案して優先順位を上げる（自由な飛ばし入れはできない）。
 *  ＝「価値の高い順に届ける」を選択の段階で体現する（顧客価値ゲームの土台）。 */
export function canAddToForecast(
  core: Pick<ProgressCore, 'sprintForecast' | 'backlogDone' | 'unrefinedPbis' | 'backlogOrder'>,
  pbiId: string
): boolean {
  if (!PBI_BY_ID.has(pbiId)) return false
  if (core.backlogDone.includes(pbiId)) return false
  if (core.unrefinedPbis.includes(pbiId)) return false
  // forecast は分割後 SBI を含むので、親 PBI へ射影して「選択済みか」を判定する（SBI不在では id と恒等）。
  const forecastParents = new Set(core.sprintForecast.map(parentPbiOf))
  if (forecastParents.has(pbiId)) return false
  const done = new Set(core.backlogDone)
  const unrefined = new Set(core.unrefinedPbis)
  // 自分より上位（backlogOrder で前）に、未選択の「Ready かつ未done」項目が一つでもあれば飛ばし入れ＝不可。
  for (const other of core.backlogOrder) {
    if (other === pbiId) return true
    const readyActive = PBI_BY_ID.has(other) && !done.has(other) && !unrefined.has(other)
    if (readyActive && !forecastParents.has(other)) return false
  }
  return true // id が backlogOrder に無い等は素直に許可（通常は到達しない）
}

/** PBI をスプリント予測に出し入れ（プランニング中・未done のみ）。容量超過はブロックしない＝過剰予測は可能。
 *  - 入れる：上位優先の“次の1件”だけ（飛ばし入れ禁止＝canAddToForecast）。下位は PO に並べ替え提案を通す。
 *  - 外す：その1件だけ外す（下位は巻き込まない）。上位優先は“入れる”側だけで担保するので、
 *    途中を外して“穴”ができたら、その穴を埋めるまで下位を新規追加できない（自然に再び上から詰める）。 */
export function toggleForecast(core: ProgressCore, pbiId: string): ProgressCore {
  if (!isPlanningBeat(core)) return core
  if (!PBI_BY_ID.has(pbiId)) return core
  if (core.backlogDone.includes(pbiId)) return core
  // 外す：その PBI（分割済みなら配下の作業項目すべて）を外す。他の予測は巻き添えにしない。
  if (core.sprintForecast.some((id) => parentPbiOf(id) === pbiId)) {
    return { ...core, sprintForecast: core.sprintForecast.filter((id) => parentPbiOf(id) !== pbiId) }
  }
  // 入れる：上位優先の“次の1件”のみ（素のまま入れる。分割は splitIntoSbi で後から）
  if (!canAddToForecast(core, pbiId)) return core
  return { ...core, sprintForecast: [...core.sprintForecast, pbiId] }
}

/** プランニング中、forecast に引いた PBI を「How（実行計画）」へ分解する＝作業項目 #1/#2… に展開する
 *  （Scrum Guide 2020 スプリントプランニング Topic Three）。split 定義があり・forecast に素のまま入っていて
 *  ・未分割の PBI のみ対象。割るかはプレイヤー判断（大きいまま1枚で回すのも有効＝過剰分解＝WIP増の代償を学べる）。 */
export function splitIntoSbi(core: ProgressCore, pbiId: string): ProgressCore {
  if (!isPlanningBeat(core)) return core
  const item = PBI_BY_ID.get(pbiId)
  if (!item?.split?.length) return core
  const i = core.sprintForecast.indexOf(pbiId) // 素のまま入っている位置（分割済み＝SBIなら -1）
  if (i < 0) return core
  const sbiIds = item.split.map((_, n) => `${pbiId}#${n + 1}`)
  const next = [...core.sprintForecast]
  next.splice(i, 1, ...sbiIds)
  return { ...core, sprintForecast: next }
}

/** その PBI を今、分割できるか（プランニング・split 定義あり・forecast に素のまま入っている）。UI 用。 */
export function canSplit(
  core: Pick<ProgressCore, 'sprintIndex' | 'beatIndex' | 'sprintForecast'>,
  pbiId: string
): boolean {
  return isPlanningBeat(core) && !!PBI_BY_ID.get(pbiId)?.split?.length && core.sprintForecast.includes(pbiId)
}

/** スプリント途中で、その PBI を追加で引き込めるか（スコープ再交渉の可否）。
 *  作業中ビートで、かつ上位優先の“次の1件”（canAddToForecast）であること。途中追加も飛ばし入れはしない。 */
export function canPullIntoSprint(
  core: Pick<
    ProgressCore,
    'sprintIndex' | 'beatIndex' | 'sprintForecast' | 'backlogDone' | 'unrefinedPbis' | 'backlogOrder'
  >,
  pbiId: string
): boolean {
  return isWorkBeat(core) && canAddToForecast(core, pbiId)
}

/** スプリント途中での“追加引き込み”（スコープ再交渉）。
 *  スプリントバックログは「スプリント期間中、学びに応じて更新され続ける」(Scrum Guide 2020)。
 *  予測より早く終わって容量に余裕が出たときなどに、Ready な PBI をプロダクトバックログから今スプリントへ引き込む。
 *  ＝PO と再交渉し、スプリントゴールを危うくしない範囲で。末尾に足すだけ（着手済みを壊さない・削除はしない）。
 *  プランニング中の出し入れは toggleForecast が担うので、ここは作業中（デイリー）の“追加のみ”に限定する。 */
export function pullIntoSprint(core: ProgressCore, pbiId: string): ProgressCore {
  if (!canPullIntoSprint(core, pbiId)) return core
  return { ...core, sprintForecast: [...core.sprintForecast, pbiId] }
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
  /** 提案がそのまま通ったか（説得成功 or 既にゴール優先） */
  accepted: boolean
  /** 説得に失敗し、PO が現状順を維持した（提案を却下した） */
  rejected: boolean
  /** PO が「今スプリントのゴールに直結する」として上に戻した項目の id（補正の説明用） */
  floated: string[]
}

/** プレイヤーの並べ替え“提案”を PO がレビューする（純粋）。優先順位の所有は PO にある。
 *  説得ミニゲームの出来 tier で採否が変わる＝「優先順位を動かすには PO を価値で説得する」を機構化:
 *  - great（説得成功）: 提案どおり全面採用（ゴール補正もしない）。accepted。
 *  - good（標準）: 提案を尊重しつつ、今スプリントのゴール直結項目(sprintHint=今sprint)を上に補正（floated）。
 *  - poor（説得失敗）: PO は現状の公式順を維持＝却下（rejected）。優先順位は動かない。
 *  完了済みは末尾へ寄せる。漏れた既知 id は現行順で末尾補完。 */
export function reviewBacklogProposal(
  core: Pick<ProgressCore, 'sprintIndex' | 'backlogDone' | 'backlogOrder'>,
  proposedIds: string[],
  tier: ExecTier = 'good'
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

  // poor（説得失敗）＝PO は現状の公式順を維持して却下。優先順位は動かさない。
  if (tier === 'poor') {
    const current = core.backlogOrder.filter((id) => PBI_BY_ID.has(id))
    return { order: current, accepted: false, rejected: true, floated: [] }
  }

  // great（説得成功）＝提案どおり全面採用（ゴール補正もしない）。
  if (tier === 'great') {
    return { order: [...active, ...doneItems], accepted: true, rejected: false, floated: [] }
  }

  // good（標準）＝提案を尊重しつつ、ゴール直結を上に補正する。
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

  return { order: [...correctedActive, ...doneItems], accepted, rejected: false, floated }
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
    isKnownPbi(pbiId) && // 分割後の作業項目(SBI)も着手対象（PBI_BY_ID.has は SBI を落とすので isKnownPbi で判定）
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

  // リポジトリ品質：深いレビュー＝テストで coverage を積む（負債ドラッグ込み）／浅い＝負債が増える。
  // ★フロー改善（レトロで WIP を下げた＝focus）中は「一つに集中して仕上げる」ので深いレビューの質が上がる
  //   ＝coverage を多く積む（FOCUS_COVERAGE_BONUS）。これが capacity 投資（=レビュー回数の量）に対する
  //   wip 投資（=レビューの質）の固有メリット＝両レバーを等価で別ベクトルにし、単一正解化を避ける。
  const focused = wipLimitFor(core.retroImprovements) < WIP_LIMIT
  let repoCoverage = core.repoCoverage
  let repoDebt = core.repoDebt
  if (depth === 'thorough') {
    const perThorough = COVERAGE_PER_THOROUGH + (focused ? FOCUS_COVERAGE_BONUS : 0)
    repoCoverage = Math.min(REPO_COVERAGE_CAP, repoCoverage + Math.round(perThorough * drag))
  } else repoDebt = repoDebt + DEBT_PER_QUICK

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
  //   ・engaged かつ仕掛り無し（全て終わらせた）→ +1（WIP を守って終わらせた）
  //   ・engaged かつ仕掛り有り（着手済みを終わらせきれず持ち越し）→ −1
  //   ・未着手のまま（予測しただけ/そもそも触っていない）→ 0（”使わなかった”を罰しない）
  //   ＊判定は carryIds（予測ベース）ではなく inProgress（着手済みの残り）を使う。
  //     予測を多めに積んで未着手の下位項目が残っても”持ち越しペナルティ”にしない
  //     （Scrum Guide 2020：未完了PBIをバックログへ戻すのは正常運用。
  //      commitment はスプリントゴールであって全部終える約束ではない）。
  const engaged = doneThisSprint.length > 0 || core.inProgress.length > 0
  const cultureDelta = engaged ? (core.inProgress.length === 0 ? 1 : -1) : 0
  const culture = Math.max(0, Math.min(10, core.meters.culture + cultureDelta))
  const meters = cultureDelta ? { ...core.meters, culture } : core.meters
  const appliedCultureDelta = meters.culture - core.meters.culture

  // 表示は作業項目(SBI)単位もそのまま見せる（titleOf/estimateOf が SBI を親PBIの split から解決）。
  const toView = (id: string) => ({ id, title: titleOf(id), estimate: estimateOf(id) })
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
    // forecast の項目（分割後は SBI 混在）を親 PBI へ射影し、ゴール判定は親 PBI 単位で行う（SBI不在では恒等）。
    const forecastByParent = new Map<string, string[]>()
    for (const id of core.sprintForecast) {
      const par = parentPbiOf(id)
      forecastByParent.set(par, [...(forecastByParent.get(par) ?? []), id])
    }
    const goalForecastOf = (s: 'joushi' | 'genba') =>
      [...forecastByParent.keys()].filter((id) => {
        const p = PBI_BY_ID.get(id)
        return p?.sprintHint === sprintNo && p.stakeholder === s
      })
    // 親 PBI が“今スプリントで納品されたか”＝その親の forecast 構成要素（素のPBI or 全SBI）が全て今sprint Done。
    const doneThisSprintSet = new Set(doneThisSprint)
    const parentDelivered = (parentId: string) => {
      const items = forecastByParent.get(parentId) ?? []
      return items.length > 0 && items.every((id) => doneThisSprintSet.has(id))
    }
    const someDelivered = (parents: string[]) => parents.some((id) => parentDelivered(id))
    const someUndelivered = (parents: string[]) => parents.some((id) => !parentDelivered(id))
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
    // reviewCapacity はここでは触らない＝日次資源なので、次スプリント最初の daily ビート進入時に
    // advanceCore が reviewCapacityFor(retroImprovements) へリセットする（精算ビートで戻す意味はもう無い）。
    // 次プランニングで「↪前回持ち越し」を示すため、終わらせきれなかった分を記録（done なら []）
    lastCarryover: carryIds,
  }
  return { core: next, review }
}
