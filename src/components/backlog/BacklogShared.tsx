/** BacklogShared.tsx
 *  PlanningView・KanbanView の両方から使われる共有コンポーネント。
 *  ここだけ export し、BacklogPanel 側の外部公開 API は変えない。
 */

import { SPRINTS } from '../../data/chapters/chapter-01'
import { backlogItem, deliveredPbiIds, isLegacyPbi, LEGACY_PBI_IDS } from '../../engine/backlog'
import { RichText } from '../RichText'

// ───────────────────────── PBI 共通バッジ群（ステークホルダー＋レガシー） ─────────────────────────

/** PBI 1件分のステークホルダー・レガシーバッジをまとめたヘルパー。
 *  Card/li 各所で同じフラグメントを繰り返さないための集約コンポーネント。 */
export function PbiBadges({ id, stakeholder }: { id: string; stakeholder?: 'joushi' | 'genba' }) {
  return (
    <>
      <StakeholderBadge stakeholder={stakeholder} />
      <LegacyBadge id={id} />
    </>
  )
}

// ───────────────────────── ステークホルダーバッジ ─────────────────────────

/** PBI を"推す"ステークホルダーの識別バッジ。
 *  joushi＝情シス(結城)：紫系。genba＝現場(田淵)：空色系。未設定は何も出さない。 */
function StakeholderBadge({ stakeholder }: { stakeholder?: 'joushi' | 'genba' }) {
  if (!stakeholder) return null
  if (stakeholder === 'joushi') {
    return (
      <span
        aria-label="情シス（結城）推奨"
        title="情シス（結城）が重視する項目。進捗を見せたい発注側の関心。"
        className="ml-1 rounded bg-violet-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-violet-300"
      >
        情シス
      </span>
    )
  }
  return (
    <span
      aria-label="現場（田淵）推奨"
      title="現場（田淵）が重視する項目。使える物が欲しい現場側の関心。"
      className="ml-1 rounded bg-sky-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-sky-300"
    >
      現場
    </span>
  )
}

// ───────────────────────── レガシーバッジ ─────────────────────────

/** 「太く残す」PBI の識別バッジ。エンディングに影響する旨を短く伝える。 */
function LegacyBadge({ id }: { id: string }) {
  if (!isLegacyPbi(id)) return null
  return (
    <span
      aria-label="太く残す：Shipすると結末に効く"
      title="この項目をShipして定着させると、エンディング（真のFDE到達）に影響します。"
      className="ml-1 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300"
    >
      🌱 太く残す
    </span>
  )
}

// ───────────────────────── ステークホルダー綱引き内訳（PlanningView 専用だが shared に置く） ─────────────────────────

/** スプリントバックログ内の情シス/現場ポイント内訳。
 *  選んだ予測が「どちらに偏っているか」を軽量表示する（綱引きのトレードオフ可視化）。 */
export function StakeholderBalance({ forecastIds }: { forecastIds: string[] }) {
  let joushiPt = 0
  let genbaPt = 0
  for (const id of forecastIds) {
    const item = backlogItem(id)
    if (!item) continue
    if (item.stakeholder === 'joushi') joushiPt += item.estimate
    else if (item.stakeholder === 'genba') genbaPt += item.estimate
  }
  if (joushiPt === 0 && genbaPt === 0) return null
  return (
    <div
      role="note"
      aria-label={`ステークホルダー内訳 情シス${joushiPt}pt 現場${genbaPt}pt`}
      className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-slate-800/50 px-2.5 py-1.5"
    >
      <span className="text-[10px] text-slate-400">綱引き：</span>
      {joushiPt > 0 && (
        <span className="flex items-center gap-1 text-[10px] font-semibold text-violet-300">
          <span className="rounded bg-violet-500/20 px-1 py-0.5">情シス</span>
          {joushiPt}pt
        </span>
      )}
      {joushiPt > 0 && genbaPt > 0 && <span className="text-[10px] text-slate-400">vs</span>}
      {genbaPt > 0 && (
        <span className="flex items-center gap-1 text-[10px] font-semibold text-sky-300">
          <span className="rounded bg-sky-500/20 px-1 py-0.5">現場</span>
          {genbaPt}pt
        </span>
      )}
    </div>
  )
}

// ───────────────────────── レガシーサマリ（PlanningView 専用） ─────────────────────────

/** 「太く残す」PBI のサマリ（計画画面に表示）。何件 Ship できたかを一覧する。 */
export function LegacySummary({ backlogDone }: { backlogDone: readonly string[] }) {
  // 納品判定は PBI 単位（分割した PBI は全作業項目完了で納品）＝エンジンの legacyShippedCount と同じ基準。
  const doneSet = new Set(deliveredPbiIds(backlogDone))
  const shippedCount = LEGACY_PBI_IDS.filter((id) => doneSet.has(id)).length
  const total = LEGACY_PBI_IDS.length
  return (
    <div
      role="note"
      aria-label={`太く残す ${shippedCount}/${total} Ship`}
      className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-emerald-300">🌱 太く残す PBI</span>
        <span className="tabular-nums text-xs text-emerald-200">
          {shippedCount} / {total} Ship
        </span>
      </div>
      <p className="mt-0.5 text-[10px] leading-relaxed text-slate-400">
        文化を人に渡す3項目。Ship＆定着でエンディングが変わります。
      </p>
      <ul className="mt-1.5 space-y-0.5">
        {LEGACY_PBI_IDS.map((id) => {
          const item = backlogItem(id)
          const shipped = doneSet.has(id)
          return (
            <li
              key={id}
              className={`flex items-center gap-1.5 text-[10px] ${shipped ? 'text-emerald-300' : 'text-slate-400'}`}
            >
              <span aria-hidden="true">{shipped ? '✓' : '○'}</span>
              <span>{item ? <RichText text={item.title} interactive={false} /> : id}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// ───────────────────────── ベロシティチャート（PlanningView 専用） ─────────────────────────

export function VelocityChart({ velocity }: { velocity: number[] }) {
  if (!velocity.some((v) => v > 0)) return null
  const max = Math.max(1, ...velocity)
  return (
    <div className="rounded-xl bg-slate-800/40 px-3 py-2.5">
      <div className="mb-1 text-xs text-slate-300">
        <RichText text="{{ベロシティ}}" />
        （完了pt）
      </div>
      <div className="flex items-end gap-2">
        {SPRINTS.map((sp, i) => {
          const v = velocity[i] ?? 0
          return (
            <div key={sp.n} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex h-12 w-full items-end justify-center">
                <div
                  className="w-5 rounded-t bg-emerald-400/70"
                  style={{ height: `${v ? Math.max(8, (v / max) * 100) : 0}%` }}
                />
              </div>
              <span className="tabular-nums text-[10px] text-slate-400">S{sp.n}</span>
              <span className="tabular-nums text-[10px] text-slate-400">{v || '—'}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
