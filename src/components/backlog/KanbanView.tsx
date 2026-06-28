/** KanbanView.tsx
 *  スプリント中のカンバンボード（To Do / In Progress / Done）。
 *  KanbanView・ProductBacklogReadOnly・Column・Card・Empty をここに集約。
 */

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import {
  backlogItem,
  canAddToForecast,
  canReview,
  canStart,
  dailyBeatsInSprint,
  deliveredPbiIds,
  estimateOf,
  forecastPoints,
  GEN_TOKEN_COST,
  isDiscoverablePbi,
  isEventPbi,
  isSbi,
  parentPbiOf,
  REVIEW_CAPACITY_PER_DAY,
  reviewBudgetForSprint,
  reviewCapacityFor,
  titleOf,
  WIP_LIMIT,
  wipLimitFor,
} from '../../engine/backlog'
import type { ProgressCore } from '../../engine/progression'
import { sfxPrecept, sfxReveal } from '../../engine/sfx'
import { seedFor } from '../../lib/seed'
import type { ExecTier, ReviewDepth } from '../../types'
import { MiniGame } from '../minigame/MiniGame'
import { RichText } from '../RichText'
import { PbiBadges } from './BacklogShared'

// ───────────────────────── 型 ─────────────────────────

/** canStart/canReview に渡す最小コア（カンバンのゲート判定に必要な欄だけ） */
type KanbanCore = Pick<
  ProgressCore,
  | 'sprintIndex'
  | 'beatIndex'
  | 'sprintForecast'
  | 'backlogDone'
  | 'inProgress'
  | 'reviewCapacity'
  | 'aiTokens'
  | 'retroImprovements'
>

export interface KanbanProps {
  isWork: boolean
  /** 見えているプロダクトバックログ全体（read-only 参照用） */
  backlogOrder: string[]
  doneSet: Set<string>
  /** うち「DoD を妥協して（浅い quick レビューで）Ship した」PBI id。Done バッジの出し分けに使う。 */
  undoneSet: Set<string>
  reviewProgress: Record<string, number>
  /** 未リファインメント（暫定見積り）の PBI id。途中引き込みは Ready のみ対象にするため除外に使う。 */
  unrefinedPbis: string[]
  /** 周回カウンタ（リセットで+1）。レビュー作問のシードに混ぜ、周回ごとに"振れ/出題"を変える＝周回勢のメタ暗記を防ぐ。 */
  generation: number
  startItem: (id: string) => void
  reviewItem: (id: string, depth: ReviewDepth, tier: ExecTier) => void
  /** スプリント途中で Ready な PBI を予測に引き込む（スコープ再交渉） */
  pullIntoSprint: (id: string) => void
  core: KanbanCore
  /** このスプリントのゴール文（プレイヤーが決定済みなら選択ゴール、未決ならデフォルトゴール）。
   *  引き込み動機コピーの「ゴールに資するか」軸として表示する。 */
  sprintGoal?: string
}

// ───────────────────────── KanbanView ─────────────────────────

export function KanbanView({
  isWork,
  backlogOrder,
  doneSet,
  undoneSet,
  reviewProgress,
  unrefinedPbis,
  generation,
  startItem,
  reviewItem,
  pullIntoSprint,
  core,
  sprintGoal,
}: KanbanProps) {
  // レビューの2段：深さ選択 → ミニゲーム → 確定
  const [depthFor, setDepthFor] = useState<string | null>(null)
  const [pending, setPending] = useState<{ id: string; depth: ReviewDepth } | null>(null)
  // タブ: 'kanban' | 'backlog'
  const [activeTab, setActiveTab] = useState<'kanban' | 'backlog'>('kanban')
  // 引き込み確定演出：トースト（+○pt）と To Do ハイライト対象
  const [pullToast, setPullToast] = useState<{ pts: number; key: number } | null>(null)
  const [justPulledId, setJustPulledId] = useState<string | null>(null)
  const pullToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pullHighlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Ship 演出：Done 遷移トースト・カードハイライト・インクリメント完成フラグ
  const [shipToast, setShipToast] = useState<{ label: string; key: number; isIncrement: boolean } | null>(null)
  const [justShippedId, setJustShippedId] = useState<string | null>(null)
  const shipToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const shipHighlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Done 遷移を検知するために直前の backlogDone を記憶する
  const prevBacklogDoneRef = useRef<readonly string[]>(core.backlogDone)
  const tabsId = useId()
  const tabKanbanRef = useRef<HTMLButtonElement>(null)
  const tabBacklogRef = useRef<HTMLButtonElement>(null)

  // core.inProgress は配列なので Set に変換して O(1) 検索を実現する（BacklogPanel からの二重管理を解消）
  const inProgSet = useMemo(() => new Set(core.inProgress), [core.inProgress])
  const todo = core.sprintForecast.filter((id) => !doneSet.has(id) && !inProgSet.has(id))
  const done = core.sprintForecast.filter((id) => doneSet.has(id))
  // レトロ改善（機構：Retro 昇格）を反映した上限。capacity 投資で容量↑／wip 改善で仕掛り上限↓。
  const maxReview = reviewCapacityFor(core.retroImprovements)
  const wipMax = wipLimitFor(core.retroImprovements)

  // 予測量の目安＝スプリント全体のレビュー容量（1日の容量 × そのスプリントのデイリー日数）。
  // 日次上限(maxReview)はそのまま日々の律速だが、予測超過の判定はスプリント全体の容量で見る
  // （早々に片付いて空デイリーにならないよう、予測はスプリントサイズで組む設計）。
  const capacity = reviewBudgetForSprint(core.retroImprovements, core.sprintIndex)
  const days = Math.max(1, dailyBeatsInSprint(core.sprintIndex))
  const fpts = forecastPoints({ sprintForecast: core.sprintForecast })
  const over = fpts > capacity
  // 途中で引き込める候補も"上位優先"に揃える＝canAddToForecast（上位を全部入れてからでないと下位は引けない）。
  // 上位優先では「次に引ける1件」だけが該当する（canAddToForecast は先頭の適格1件のみ true）。
  // 毎行 canAddToForecast を呼ぶと O(n²) なので、PlanningView の nextAddableId と同じく find で1件だけ求める。
  const pullable = useMemo(() => {
    const coreForPull = {
      sprintForecast: core.sprintForecast,
      backlogDone: core.backlogDone,
      unrefinedPbis,
      backlogOrder,
    }
    const next = backlogOrder.find((id) => canAddToForecast(coreForPull, id))
    return next ? [next] : []
  }, [backlogOrder, core.sprintForecast, core.backlogDone, unrefinedPbis])

  // プロダクトバックログタブの件数バッジ（未完了数）
  const pblPendingCount = backlogOrder.filter((id) => !doneSet.has(id)).length
  // 途中引き込み可能数（現在は最大1件の上位優先）
  const pullableCount = pullable.length
  // プロダクトバックログに「新規あり」フラグ
  const pblHasNew = backlogOrder.some((id) => isDiscoverablePbi(id) || isEventPbi(id))

  // タブのキーボード操作（Arrow Left/Right）
  const handleTabKeyDown = useCallback((e: React.KeyboardEvent, current: 'kanban' | 'backlog') => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault()
      const next = current === 'kanban' ? 'backlog' : 'kanban'
      setActiveTab(next)
      if (next === 'kanban') tabKanbanRef.current?.focus()
      else tabBacklogRef.current?.focus()
    }
  }, [])

  // タイマークリーンアップ（アンマウント時）
  useEffect(() => {
    return () => {
      if (pullToastTimerRef.current) clearTimeout(pullToastTimerRef.current)
      if (pullHighlightTimerRef.current) clearTimeout(pullHighlightTimerRef.current)
      if (shipToastTimerRef.current) clearTimeout(shipToastTimerRef.current)
      if (shipHighlightTimerRef.current) clearTimeout(shipHighlightTimerRef.current)
    }
  }, [])

  // Done 遷移の検知：core.backlogDone が増えたとき演出を起動する
  useEffect(() => {
    const prev = prevBacklogDoneRef.current
    const prevSet = new Set(prev)
    const newDoneIds = core.backlogDone.filter((id) => !prevSet.has(id))
    prevBacklogDoneRef.current = core.backlogDone

    if (newDoneIds.length === 0) return

    // 新たに Done になった id のうち最初の1件で演出する（通常は1件ずつ）
    const shippedId = newDoneIds[0]

    // インクリメント完成判定：親 PBI が新たに納品済みになったか
    const prevDelivered = new Set(deliveredPbiIds(prev))
    const nextDelivered = new Set(deliveredPbiIds(core.backlogDone))
    const incrementCompleted = [...nextDelivered].some((id) => !prevDelivered.has(id))

    // 効果音（インクリメント完成＝sfxPrecept、単品 Done＝sfxReveal('good')）
    if (incrementCompleted) {
      sfxPrecept()
    } else {
      sfxReveal('good')
    }

    // トースト
    if (shipToastTimerRef.current) clearTimeout(shipToastTimerRef.current)
    const label = incrementCompleted ? '価値を1つ届けた' : 'Shipped！顧客に届いた'
    setShipToast({ label, key: Date.now(), isIncrement: incrementCompleted })
    shipToastTimerRef.current = setTimeout(() => setShipToast(null), 2000)

    // カードハイライト（Done カードを一瞬光らせる）
    if (shipHighlightTimerRef.current) clearTimeout(shipHighlightTimerRef.current)
    setJustShippedId(shippedId)
    shipHighlightTimerRef.current = setTimeout(() => setJustShippedId(null), 1400)
  }, [core.backlogDone])

  // 引き込みボタンのラッパー：演出を起動してから実際のアクションを呼ぶ
  const handlePullIntoSprint = useCallback(
    (id: string) => {
      const pts = estimateOf(id)
      // トーストを出す（既存タイマーを先にクリア）
      if (pullToastTimerRef.current) clearTimeout(pullToastTimerRef.current)
      setPullToast({ pts, key: Date.now() })
      pullToastTimerRef.current = setTimeout(() => setPullToast(null), 1800)
      // ハイライト対象を記録（To Do 列で光らせる）
      if (pullHighlightTimerRef.current) clearTimeout(pullHighlightTimerRef.current)
      setJustPulledId(id)
      pullHighlightTimerRef.current = setTimeout(() => setJustPulledId(null), 1400)
      // 実機構を呼ぶ
      pullIntoSprint(id)
      // 引き込み確定後はカンバンに自動切替（トースト＋予測バー＋To Do着地が同一視界に揃う）
      setActiveTab('kanban')
    },
    [pullIntoSprint]
  )

  if (core.sprintForecast.length === 0) {
    return (
      <p className="rounded-xl bg-slate-800/40 px-3 py-4 text-center text-sm text-slate-400">
        このスプリントの予測（To Do）がありません。プランニングで{<RichText text="{{スプリント予測}}" />}
        しておきましょう。
      </p>
    )
  }

  const tabKanbanId = `${tabsId}-tab-kanban`
  const tabBacklogId = `${tabsId}-tab-backlog`
  const panelKanbanId = `${tabsId}-panel-kanban`
  const panelBacklogId = `${tabsId}-panel-backlog`

  return (
    <>
      {/* ── タブ切替：カンバン ⇆ プロダクトバックログ ──
          両タブを最初から見せることで「下に全体バックログあり」が伝わる。
          件数バッジ・引き込み可能バッジで情報密度を補う。 */}
      <div
        role="tablist"
        aria-label="表示切替"
        className="flex gap-0 rounded-xl border border-slate-700/60 bg-slate-800/50 p-0.5"
      >
        {/* カンバンタブ */}
        <button
          ref={tabKanbanRef}
          id={tabKanbanId}
          type="button"
          role="tab"
          aria-selected={activeTab === 'kanban'}
          aria-controls={panelKanbanId}
          tabIndex={activeTab === 'kanban' ? 0 : -1}
          onClick={() => setActiveTab('kanban')}
          onKeyDown={(e) => handleTabKeyDown(e, 'kanban')}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-all min-h-[44px] ${
            activeTab === 'kanban' ? 'bg-slate-700 text-slate-100 shadow-sm' : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          カンバン
          {/* スプリント予測の件数バッジ */}
          <span
            className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
              activeTab === 'kanban' ? 'bg-slate-600 text-slate-300' : 'bg-slate-700 text-slate-500'
            }`}
            aria-label={`${core.sprintForecast.length}件`}
          >
            {core.sprintForecast.length}
          </span>
        </button>
        {/* プロダクトバックログタブ */}
        <button
          ref={tabBacklogRef}
          id={tabBacklogId}
          type="button"
          role="tab"
          aria-selected={activeTab === 'backlog'}
          aria-controls={panelBacklogId}
          tabIndex={activeTab === 'backlog' ? 0 : -1}
          onClick={() => setActiveTab('backlog')}
          onKeyDown={(e) => handleTabKeyDown(e, 'backlog')}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-all min-h-[44px] ${
            activeTab === 'backlog' ? 'bg-slate-700 text-slate-100 shadow-sm' : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          <span className="truncate">プロダクトバックログ</span>
          {/* 未完了件数バッジ */}
          <span
            className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
              activeTab === 'backlog' ? 'bg-slate-600 text-slate-300' : 'bg-slate-700 text-slate-500'
            }`}
            aria-label={`未完了${pblPendingCount}件`}
          >
            {pblPendingCount}
          </span>
          {/* 引き込み可能バッジ（ここから引き込める！の示唆） */}
          {isWork && pullableCount > 0 && (
            <span
              className="rounded-full bg-emerald-500/30 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300"
              aria-label="引き込み可能あり"
            >
              ＋引き込み可
            </span>
          )}
          {/* 新規PBIバッジ */}
          {pblHasNew && activeTab !== 'backlog' && (
            <span
              className="rounded-full bg-rose-500/30 px-1.5 py-0.5 text-[10px] font-semibold text-rose-300"
              aria-label="新規PBIあり"
            >
              新規
            </span>
          )}
        </button>
      </div>

      {/* ── カンバンパネル ── */}
      <div
        id={panelKanbanId}
        role="tabpanel"
        aria-labelledby={tabKanbanId}
        hidden={activeTab !== 'kanban'}
        className="space-y-3"
      >
        {/* ── 広い画面（lg+）：メーター類をコンパクトなツールバーに圧縮し、ボードをファーストビューへ ── */}
        <div className="hidden lg:flex lg:items-center lg:gap-3 lg:rounded-xl lg:border lg:border-slate-700/60 lg:bg-slate-800/30 lg:px-3 lg:py-2">
          {/* 説明 */}
          <p className="min-w-0 flex-1 text-[11px] leading-relaxed text-slate-400">
            <RichText text="着手＝AI生成。AIにどこまでレビューさせ、人がどれぐらい確かめるか——{{制約理論}}どおり1日のレビュー容量がボトルネック。" />
          </p>
          {/* 予測量バー（スプリント全体の容量に対する積み具合。隣の「1日のレビュー」とはスコープが違う） */}
          <div className="flex shrink-0 items-center gap-2">
            <span
              className="text-[11px] font-semibold text-sky-300"
              title="スプリント全体の予測量／スプリント全体のレビュー容量"
            >
              予測<span className="font-normal text-sky-400/70">(全体)</span>
            </span>
            <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-700">
              <div
                className={`h-full rounded-full transition-[width] duration-500 ease-out ${over ? 'bg-amber-500' : 'bg-sky-400'}`}
                style={{ width: `${Math.min(100, capacity ? (fpts / capacity) * 100 : 0)}%` }}
              />
            </div>
            <span className={`tabular-nums text-[11px] font-bold ${over ? 'text-amber-300' : 'text-sky-200'}`}>
              {fpts}/{capacity}pt
              {over && (
                <span className="ml-1 text-amber-300" aria-label="超過">
                  !
                </span>
              )}
            </span>
          </div>
          {/* レビュー容量 */}
          <div className="flex shrink-0 items-center gap-1.5 text-[11px]">
            <span className="text-slate-400">1日のレビュー</span>
            <div className="h-2 w-14 overflow-hidden rounded-full bg-slate-700">
              <div
                className="h-full rounded-full bg-emerald-400"
                style={{ width: `${(Math.max(0, core.reviewCapacity) / maxReview) * 100}%` }}
              />
            </div>
            <span className="tabular-nums text-slate-300">
              {core.reviewCapacity}/{maxReview}
              {maxReview > REVIEW_CAPACITY_PER_DAY && <span className="ml-0.5 text-emerald-400">🔧</span>}
            </span>
          </div>
          {/* WIP */}
          <div className="flex shrink-0 items-center gap-1 text-[11px]">
            <span className="text-slate-400">
              <RichText text="{{仕掛り}}" />
            </span>
            <span className="tabular-nums font-bold text-slate-200">
              {core.inProgress.length}/{wipMax}
              {wipMax < WIP_LIMIT && <span className="ml-0.5 text-emerald-400">🔧</span>}
            </span>
          </div>
          {/* 業務外メッセージ */}
          {!isWork && (
            <span className="shrink-0 rounded bg-slate-700 px-2 py-0.5 text-[10px] text-slate-400">
              デイリーのみ操作可
            </span>
          )}
        </div>

        {/* ── 狭い画面（lg未満）：従来の縦積みメーター表示 ── */}
        <div className="lg:hidden">
          <p className="text-xs leading-relaxed text-slate-400">
            <RichText text="開発そのものは AI が担う（着手＝生成）。AIにどこまで任せ、人がどれぐらい確かめるか——この配分が勝負。In Progress は{{仕掛り}}上限で詰まり、{{制約理論}}どおり1日のレビュー容量がボトルネックになる。" />
          </p>

          {/* 予測量 vs 容量（予測の超過（オーバー）の可視化）。超過分は終わらず持ち越しになる。 */}
          <section
            className={`mt-3 rounded-xl border p-3 ${over ? 'border-amber-500/40 bg-amber-500/5' : 'border-sky-500/30 bg-sky-500/5'}`}
          >
            <div className="mb-1.5 flex items-center justify-between">
              <h3 className="px-0.5 text-xs font-bold text-sky-300">
                <RichText text="{{スプリントバックログ}}" />
                <span className="ml-1 font-normal text-sky-400/70">予測量</span>
              </h3>
              <span className={`text-xs font-bold tabular-nums ${over ? 'text-amber-300' : 'text-sky-200'}`}>
                {fpts} / {capacity} pt
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-700">
              <div
                className={`h-full rounded-full transition-[width] duration-500 ease-out ${over ? 'bg-amber-500' : 'bg-sky-400'}`}
                style={{ width: `${Math.min(100, capacity ? (fpts / capacity) * 100 : 0)}%` }}
              />
            </div>
            {over ? (
              <p role="note" className="mt-1.5 text-[11px] leading-relaxed text-amber-300">
                スプリント全体のレビュー容量（{capacity}pt＝1日{maxReview}pt×{days}日）を超えて積んでいます。これは
                "悪手"ではなく<span className="font-semibold">賭け</span>
                ——多く積んでゴールに挑むのも一手。ただし日々のレビューは1日{maxReview}ptに絞られ、終わらなかった分は
                スプリント末に{<RichText text="{{キャリーオーバー}}" />}（次へ持ち越し）。commitment
                はスプリントゴールであって全部終える約束ではない。
              </p>
            ) : (
              <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">
                スプリント全体のレビュー容量（{capacity}pt＝1日{maxReview}pt×{days}日）。日々は1日
                {maxReview}pt
                に絞られ、余裕があれば「プロダクトバックログ」タブから追加を引き込めます。毎デイリー回復・使い切りです。
              </p>
            )}
          </section>

          {/* レビュー容量＋WIP メーター */}
          <div className="mt-3 flex gap-2">
            <div className="flex-1 rounded-xl bg-slate-800/40 px-3 py-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">1日のレビュー容量</span>
                <span className="tabular-nums text-slate-300">
                  {core.reviewCapacity} / {maxReview}
                  {maxReview > REVIEW_CAPACITY_PER_DAY && <span className="ml-1 text-emerald-400">🔧</span>}
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-700">
                <div
                  className="h-full rounded-full bg-emerald-400"
                  style={{ width: `${(Math.max(0, core.reviewCapacity) / maxReview) * 100}%` }}
                />
              </div>
              {core.reviewCapacity <= 0 && (
                <p className="mt-1 text-[10px] leading-tight text-emerald-400/80">
                  明日のデイリーで回復します（使い切り・繰り越しなし）
                </p>
              )}
            </div>
            <div className="rounded-xl bg-slate-800/40 px-3 py-2 text-center">
              <div className="text-xs text-slate-300">
                <RichText text="{{仕掛り}}" />
              </div>
              <div className="tabular-nums text-sm text-slate-200">
                {core.inProgress.length}/{wipMax}
                {wipMax < WIP_LIMIT && <span className="ml-1 text-emerald-400">🔧</span>}
              </div>
            </div>
          </div>

          {!isWork && (
            <p className="mt-3 rounded-lg bg-slate-800/40 px-3 py-1.5 text-xs text-slate-400">
              着手・レビューはデイリー（業務中）に行えます。
            </p>
          )}
        </div>

        {/* カンバン3列：広い画面(lg〜)では横並びにして"ボード感"を出す。狭い画面は縦積み。
            列は上端揃え(items-start)で、各列が中身の高さに収まる（空列が無駄に伸びない）。 */}
        <div className="grid gap-3 lg:grid-cols-3 lg:items-start">
          {/* To Do */}
          <Column title="To Do" tone="text-slate-300" headerBg="bg-slate-700/40" count={todo.length}>
            {todo.map((id) => {
              const parent = backlogItem(parentPbiOf(id))
              if (!parent) return null
              const startable = canStart(core, id)
              // 引き込み直後のカードは emerald ハイライト（1.4 秒間）
              const isJustPulled = id === justPulledId
              return (
                <Card
                  key={id}
                  title={titleOf(id)}
                  estimate={estimateOf(id)}
                  parentLabel={isSbi(id) ? parent.title : undefined}
                  badges={<PbiBadges id={parentPbiOf(id)} stakeholder={parent.stakeholder} />}
                  highlight={isJustPulled}
                >
                  <button
                    type="button"
                    onClick={() => startItem(id)}
                    disabled={!startable}
                    title={!startable && core.aiTokens < GEN_TOKEN_COST ? 'AIトークンが足りません' : undefined}
                    className="shrink-0 self-center rounded-lg bg-sky-600 px-2.5 py-1.5 text-xs font-semibold text-slate-100 transition hover:bg-sky-500 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500"
                  >
                    着手（AI生成）
                  </button>
                </Card>
              )
            })}
            {todo.length === 0 && <Empty />}
          </Column>

          {/* In Progress */}
          <Column
            title="In Progress（着手中）"
            tone="text-amber-200"
            headerBg="bg-amber-500/10"
            count={core.inProgress.length}
          >
            {core.inProgress.map((id) => {
              const parent = backlogItem(parentPbiOf(id))
              if (!parent) return null
              const est = estimateOf(id)
              const prog = Math.min(est, reviewProgress[id] ?? 0)
              const reviewable = canReview(core, id)
              return (
                <Card
                  key={id}
                  title={titleOf(id)}
                  estimate={est}
                  parentLabel={isSbi(id) ? parent.title : undefined}
                  badges={<PbiBadges id={parentPbiOf(id)} stakeholder={parent.stakeholder} />}
                  below={
                    <div className="mt-2 flex flex-col gap-1.5">
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-700">
                        <div
                          className="h-full rounded-full bg-amber-400"
                          style={{ width: `${est ? (prog / est) * 100 : 0}%` }}
                        />
                      </div>
                      {depthFor === id ? (
                        <div className="flex flex-col gap-1.5">
                          <p className="text-[10px] leading-tight text-slate-400">
                            このあとのレビューの<span className="font-semibold text-emerald-300">出来</span>
                            で進みが変わる—— 会心なら多く（1.5倍）、空振りだと半分。丁寧に確かめるほど前に進む。
                          </p>
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setPending({ id, depth: 'quick' })
                                setDepthFor(null)
                              }}
                              className="flex-1 rounded-lg bg-slate-700 px-2 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-600 active:scale-95"
                            >
                              <RichText
                                text="浅い：広く速く通す（{{完成の定義}}は妥協・負債は残る）"
                                interactive={false}
                              />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setPending({ id, depth: 'thorough' })
                                setDepthFor(null)
                              }}
                              className="flex-1 rounded-lg bg-emerald-600 px-2 py-1.5 text-xs font-semibold text-slate-100 transition hover:bg-emerald-500 active:scale-95"
                            >
                              <RichText text="深い：一点を深く固める（{{完成の定義}}達成・品質）" interactive={false} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDepthFor(id)}
                          disabled={!reviewable}
                          title={
                            !reviewable && core.reviewCapacity <= 0
                              ? '今日のレビュー容量切れ（明日のデイリーで回復）'
                              : undefined
                          }
                          className="self-start rounded-lg bg-emerald-700 px-2.5 py-1.5 text-xs font-semibold text-slate-100 transition hover:bg-emerald-600 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500"
                        >
                          レビューする
                        </button>
                      )}
                    </div>
                  }
                />
              )
            })}
            {core.inProgress.length === 0 && <Empty />}
          </Column>

          {/* Done */}
          <Column title="Done（完了）" tone="text-emerald-300" headerBg="bg-emerald-500/10" count={done.length}>
            {done.map((id) => {
              const parent = backlogItem(parentPbiOf(id))
              if (!parent) return null
              const isJustShipped = id === justShippedId
              return (
                <Card
                  key={id}
                  title={titleOf(id)}
                  estimate={estimateOf(id)}
                  dimmed
                  parentLabel={isSbi(id) ? parent.title : undefined}
                  badges={<PbiBadges id={parentPbiOf(id)} stakeholder={parent.stakeholder} />}
                  highlight={isJustShipped}
                >
                  {undoneSet.has(id) ? (
                    <span
                      title="広く速く通した（浅い）＝完成の定義(DoD)を妥協した Ship。量で前に進むが、後で負債の取り立てが来る。"
                      className="shrink-0 self-center rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300"
                    >
                      ⚠ 浅い
                    </span>
                  ) : (
                    <span className="shrink-0 self-center rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                      ✓ DoD
                    </span>
                  )}
                </Card>
              )
            })}
            {done.length === 0 && <Empty />}
          </Column>
        </div>
      </div>

      {/* +○pt トースト — タブパネル外の共有位置に置くことで、引き込み後のカンバン自動切替後も
          activeTab に関わらず表示される。pull-toast-up キーフレームを既存のまま流用（新規CSS追加なし）。
          aria-hidden で視覚装飾のみ扱い。スクリーンリーダー向け読み上げは直下の aria-live 側。
          position: relative の親を持たない KanbanView 直下に置き、tablist の直後に固定レイアウトで表示。 */}
      {pullToast && (
        <div aria-hidden="true" className="relative h-0">
          <span
            key={pullToast.key}
            className="pull-toast pointer-events-none absolute left-1/2 top-2 z-10 whitespace-nowrap rounded-full bg-emerald-500 px-3 py-1 text-[12px] font-bold text-white shadow-lg"
          >
            +{pullToast.pts}pt 積んだ！
          </span>
        </div>
      )}

      {/* スクリーンリーダー向け：引き込み確定の読み上げ（aria-live=polite） */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {pullToast ? `${pullToast.pts}ポイントをスプリントに積みました` : ''}
      </div>

      {/* Ship トースト — Done 遷移の瞬間に「届けた」を知らせる。
          pull-toast アニメーションを流用（CSS追加なし）。
          インクリメント完成（全SBI Done＝顧客価値を一つ納品）はより明るい amber で区別。
          aria-hidden で視覚装飾専用。スクリーンリーダー向けは下の aria-live 側。 */}
      {shipToast && (
        <div aria-hidden="true" className="relative h-0">
          <span
            key={shipToast.key}
            className={`pull-toast pointer-events-none absolute left-1/2 top-2 z-10 whitespace-nowrap rounded-full px-3 py-1 text-[12px] font-bold text-white shadow-lg ${
              shipToast.isIncrement ? 'bg-amber-500' : 'bg-emerald-600'
            }`}
          >
            {shipToast.label}
          </span>
        </div>
      )}

      {/* スクリーンリーダー向け：Ship 確定の読み上げ（aria-live=assertive で確実に読み上げる） */}
      <div aria-live="assertive" aria-atomic="true" className="sr-only">
        {shipToast ? shipToast.label : ''}
      </div>

      {/* ── プロダクトバックログパネル ──
          スプリント外のバックログ全体・途中引き込みがここから。
          発見性の核心：タブに件数バッジ＋「＋引き込み可」が常時見えるので存在に気づく。 */}
      <div
        id={panelBacklogId}
        role="tabpanel"
        aria-labelledby={tabBacklogId}
        hidden={activeTab !== 'backlog'}
        className="space-y-3"
      >
        {/* セクション説明：簡潔なラベルに留め、詳細は動機コピーに集約 */}
        <p className="text-xs leading-relaxed text-slate-400">
          <RichText text="{{プロダクトバックログ}}（参照・引き込み）" />
        </p>

        {/* スプリント途中の追加引き込み（スコープ再交渉）。早く終わって容量に余裕が出たら Ready 項目を足せる。
            プロダクトバックログタブ内の最上部に置き、「ここから引き込める」導線を明確にする。 */}
        {isWork && pullable.length > 0 && (
          <section className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3">
            <h3 className="mb-1 flex items-center gap-1.5 px-0.5 text-xs font-bold text-emerald-300">
              <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] text-emerald-200">引き込み可能</span>
              スプリントに追加（
              <RichText text="{{スコープ再交渉}}" />）
            </h3>
            {/* 動機コピー：容量状態で出し分ける（over=再交渉の覚悟 / 余裕あり=機会とコスト）。
                balanced な描写＝スコープクリープを肯定せず、機会コストと判断軸を honest に出す。 */}
            <PullInMotivation over={over} fpts={fpts} capacity={capacity} sprintGoal={sprintGoal} />
            <ul className="space-y-1.5">
              {pullable.map((id) => {
                const item = backlogItem(id)
                if (!item) return null
                return (
                  <li
                    key={id}
                    className="flex items-center gap-2 rounded-lg border border-emerald-600/30 bg-emerald-900/20 px-2.5 py-1.5"
                  >
                    <span className="rounded bg-slate-700 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-slate-300">
                      {item.estimate}pt
                    </span>
                    <PbiBadges id={id} stakeholder={item.stakeholder} />
                    <span className="min-w-0 flex-1 truncate text-sm text-slate-100">
                      <RichText text={item.title} interactive={false} />
                    </span>
                    <button
                      type="button"
                      aria-label={`${item.title} をスプリントに引き込む`}
                      onClick={() => handlePullIntoSprint(id)}
                      className="shrink-0 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-slate-100 transition hover:bg-emerald-500 active:scale-95"
                    >
                      ＋ 引き込む
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        )}
        {/* デイリー以外は引き込み操作不可の案内 */}
        {!isWork && (
          <p className="rounded-lg bg-slate-800/40 px-3 py-1.5 text-xs text-slate-400">
            引き込みはデイリー（業務中）に行えます。
          </p>
        )}

        {/* プロダクトバックログ全体リスト（read-only）。スプリント中でも全体像を把握できる。 */}
        <ProductBacklogList backlogOrder={backlogOrder} doneSet={doneSet} />
      </div>

      {/* レビュー・ミニゲーム（深さ確定後） */}
      {pending &&
        (() => {
          // 連続レビューで同じミニゲームが続かないようにする。
          // ・初回レビュー（まだ進捗0）かつ親PBIの先頭作業項目 → 題材一致の作問（タスクに合った出題）。
          // ・再レビュー（進捗>0）や、同じ親PBIの2件目以降の作業項目(SBI) → 題材一致を避けて別の作問へ。
          const hash = pending.id.indexOf('#')
          const sbiOffset = hash >= 0 ? Math.max(0, (Number(pending.id.slice(hash + 1)) || 1) - 1) : 0
          const prog = reviewProgress[pending.id] ?? 0
          const variety = prog > 0 || sbiOffset > 0
          // シードは「項目 × これまでの進捗 × 作業項目位置 × 周回」で変える＝再レビューごとに別の作問・別の並び、
          // かつ周回（generation）ごとに"初回の振れ/出題"も変わる＝周回勢が「このPBIは初回でも罠」と暗記するのを防ぐ。
          const seed = seedFor(`${pending.id}:${Math.round(prog * 100)}:${sbiOffset}:${generation}`)
          return (
            <MiniGame
              // seed が変われば作問を作り直す＝再レビューで確実に別インスタンスにする（lazy init の取り違え防止）。
              key={seed}
              kind="review"
              seed={seed}
              // レビュー教材の選定は親PBI基準（教材は PBI に紐づく）なので pbiId は親へ射影。
              pbiId={parentPbiOf(pending.id)}
              reviewVariety={variety}
              onDone={(tier) => {
                reviewItem(pending.id, pending.depth, tier)
                setPending(null)
              }}
              onSkip={() => {
                reviewItem(pending.id, pending.depth, 'good')
                setPending(null)
              }}
            />
          )
        })()}
    </>
  )
}

// ───────────────────────── ProductBacklogList ─────────────────────────

/** プロダクトバックログ全体リスト（タブ内常時展開・read-only）。
 *  発見可PBI（ヒアリングで掘り当てた項目）には「現場で発見」バッジを付ける。
 *  タブ切替で表示されるため、折りたたみなしで全件を最初から見せる。 */
function ProductBacklogList({ backlogOrder, doneSet }: { backlogOrder: string[]; doneSet: Set<string> }) {
  const pendingIds = backlogOrder.filter((id) => !doneSet.has(id))
  const doneIds = backlogOrder.filter((id) => doneSet.has(id))

  const renderItem = (id: string) => {
    const item = backlogItem(id)
    if (!item) return null
    const done = doneSet.has(id)
    // 発見可（現場で掘り当て）とイベント要望は別系統（EVENT_BACKLOG は discoverable を持たない）＝排他。
    const disc = isDiscoverablePbi(id)
    const evt = isEventPbi(id)
    return (
      <li
        key={id}
        className={`flex items-start gap-2 rounded-lg border px-2.5 py-1.5 ${done ? 'border-slate-800 bg-slate-800/20 opacity-60' : 'border-slate-700 bg-slate-800/40'}`}
      >
        <span className="shrink-0 rounded bg-slate-700 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-slate-300">
          {item.estimate}pt
        </span>
        <div className="min-w-0 flex-1">
          <span className={`text-sm ${done ? 'text-slate-400 line-through' : 'text-slate-100'}`}>
            <RichText text={item.title} />
          </span>
          <div className="mt-0.5 flex flex-wrap gap-1">
            <PbiBadges id={id} stakeholder={item.stakeholder} />
            {disc && !done && (
              <span className="rounded bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-rose-300">
                現場で発見
              </span>
            )}
            {evt && !done && (
              <span
                title="イベントでステークホルダーが持ち込んだ要望。スプリントに割り込ませるか、次のために積むかは交渉次第。"
                className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300"
              >
                イベント要望
              </span>
            )}
          </div>
        </div>
        {done && (
          <span className="shrink-0 self-start rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
            完了
          </span>
        )}
      </li>
    )
  }

  if (backlogOrder.length === 0) {
    return <p className="px-1 py-2 text-xs text-slate-400">— バックログなし —</p>
  }

  return (
    <section className="rounded-xl border border-slate-700/60 bg-slate-800/20">
      <h3 className="border-b border-slate-700/60 px-3 py-2 text-xs font-bold text-slate-300">
        <RichText text="{{プロダクトバックログ}}" />
        <span className="ml-1 font-normal text-slate-400">全体（読取専用）</span>
        <span className="ml-2 rounded bg-slate-700 px-1.5 py-0.5 text-[10px] tabular-nums text-slate-400">
          {pendingIds.length}件残
        </span>
      </h3>
      <ul className="space-y-1.5 px-3 py-2">{pendingIds.map(renderItem)}</ul>
      {doneIds.length > 0 && (
        <>
          <div className="mx-3 border-t border-slate-700/60" />
          <ul className="space-y-1.5 px-3 py-2">{doneIds.map(renderItem)}</ul>
        </>
      )}
    </section>
  )
}

// ───────────────────────── Column ─────────────────────────

function Column({
  title,
  tone,
  headerBg,
  count,
  children,
}: {
  title: string
  tone: string
  /** 広い画面のカラムヘッダ背景（レーン識別色）。例: "bg-slate-700/50" */
  headerBg: string
  count: number
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col rounded-xl border border-slate-700/60 bg-slate-800/30 overflow-hidden">
      {/* カラムヘッダ：狭い画面は従来の軽量表示、広い画面はレーンヘッダとして背景で区別 */}
      <h3 className={`flex items-center justify-between gap-2 px-3 py-2 text-xs font-bold ${tone} ${headerBg}`}>
        <span>{title}</span>
        <span
          className="rounded-full bg-slate-900/40 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-slate-400"
          aria-label={`${count}件`}
        >
          {count}
        </span>
      </h3>
      {/* カード領域：最小高さを確保して空でもレーンの高さが保たれる（lg以上） */}
      <div className="flex flex-col gap-1.5 p-2 lg:min-h-[120px]">{children}</div>
    </section>
  )
}

// ───────────────────────── Card ─────────────────────────

function Card({
  title,
  estimate,
  dimmed,
  parentLabel,
  children,
  below,
  badges,
  highlight,
}: {
  title: string
  estimate: number
  dimmed?: boolean
  /** 作業項目(SBI)カードのとき、親PBIの見出し（どの大きな項目を割った一片か）を上に小さく示す。 */
  parentLabel?: string
  /** タイトル行の右に置く小さな操作（着手ボタン・DoD バッジ等）。幅を奪うと崩れるので軽量な要素のみ。 */
  children?: React.ReactNode
  /** タイトル行の"下"に全幅で敷くブロック（進捗バー＋レビュー操作など）。 */
  below?: React.ReactNode
  /** pt バッジの右に並ぶ小バッジ（ステークホルダー・レガシー等）。 */
  badges?: React.ReactNode
  /** 引き込み直後の着地ハイライト（emerald リング＋フェード）。 */
  highlight?: boolean
}) {
  return (
    <div
      className={`rounded-lg border bg-slate-800/40 px-3 py-2 ${dimmed ? 'opacity-70' : ''} ${highlight ? 'pull-land border-emerald-500/70' : 'border-slate-700'}`}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          {parentLabel && (
            <p className="mb-0.5 flex items-center gap-1 truncate text-[10px] font-semibold text-violet-300/80">
              <span
                title="この一片だけ Done でも納品ではない。親 PBI の作業項目が全部そろって初めて顧客に届く（＝インクリメント）。"
                className="rounded bg-violet-500/15 px-1 py-px text-[9px] text-violet-300"
              >
                作業項目
              </span>
              <RichText text={parentLabel} interactive={false} />
            </p>
          )}
          <span className="rounded bg-slate-700 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-slate-300">
            {estimate}pt
          </span>
          {badges}
          <p className={`mt-1 text-sm ${dimmed ? 'text-slate-400 line-through' : 'text-slate-100'}`}>
            <RichText text={title} />
          </p>
        </div>
        {children}
      </div>
      {below}
    </div>
  )
}

// ───────────────────────── Empty ─────────────────────────

function Empty() {
  return (
    <p className="flex flex-1 items-center justify-center px-1 py-4 text-xs text-slate-500 lg:min-h-[80px]">— なし —</p>
  )
}

// ───────────────────────── PullInMotivation ─────────────────────────

/** 引き込み候補カードの「動機の一言」。容量状態（over / 余裕あり）で出し分け。
 *  - 余裕あり（大）：まだ十分入る・攻めどきのニュアンス。PO再交渉・ゴール不変の注記を一行で。
 *  - 余裕あり（小）：機会と機会コストを honest に提示。
 *  - 超過：安易な追加を戒める（何かを持ち越す覚悟＝スコープ再交渉）。
 *  - スプリントゴール参照：渡された文字列があれば具体名、なければ glossary 語 {{スプリントゴール}} で表示。
 *  - agile考証の要点（PO再交渉・ゴール不変）はこのコピー内に一度だけ置く。
 *  balanced な描写＝スコープクリープを肯定せず、機会コストと判断軸を honestly に出す。 */
function PullInMotivation({
  over,
  fpts,
  capacity,
  sprintGoal,
}: {
  over: boolean
  fpts: number
  capacity: number
  sprintGoal?: string
}) {
  const slack = capacity - fpts // 余裕 pt（マイナスなら超過）
  // 余裕が容量の30%超＝まだ十分入る「攻めどき」、以下は「余裕はあるが慎重に」
  const isGenerous = !over && slack > capacity * 0.3

  if (over) {
    // 容量超過：追加は再交渉の覚悟を問う
    return (
      <p
        role="note"
        aria-label="引き込みに関する判断軸（容量超過）"
        className="mb-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-[11px] leading-relaxed text-amber-200"
      >
        予測はすでに容量いっぱい（{fpts}/{capacity}pt）。引き込むなら、何かを持ち越しと引き換えにする覚悟が要る——それが
        <RichText text="{{スコープ再交渉}}" interactive={false} />
        だ。
        {sprintGoal ? (
          <>
            {' '}
            <span className="font-semibold text-amber-100">「{sprintGoal}」</span>
            に直結するか。そうでなければ、今じゃない。
          </>
        ) : (
          <>
            {' '}
            <RichText text="{{スプリントゴール}}" interactive={false} />
            に直結するか。そうでなければ、今じゃない。
          </>
        )}{' '}
        追加は PO と再交渉し、ゴールを危うくしない範囲で。
      </p>
    )
  }

  if (isGenerous) {
    // 余裕が大きい：まだ十分入る、攻めどきのニュアンス
    return (
      <p
        role="note"
        aria-label="引き込みに関する判断軸（容量に余裕あり・攻めどき）"
        className="mb-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] leading-relaxed text-emerald-200"
      >
        まだ{slack}pt 入る——攻めどきだ。
        {sprintGoal ? (
          <>
            {' '}
            <span className="font-semibold text-emerald-100">「{sprintGoal}」</span>
            に資するなら今が入れどき。このスプリントで成果を一つ前に出せる。
          </>
        ) : (
          <>
            {' '}
            <RichText text="{{スプリントゴール}}" interactive={false} />
            に資するなら今が入れどき。このスプリントで成果を一つ前に出せる。
          </>
        )}{' '}
        見送れば次スプリント以降の順番待ちに戻る。PO と合意の上で、ゴールを守りながら入れよう。
      </p>
    )
  }

  // 余裕あり（小）：機会と機会コストを提示
  return (
    <p
      role="note"
      aria-label="引き込みに関する判断軸（容量に余裕あり）"
      className="mb-2 rounded-lg border border-sky-500/30 bg-sky-500/10 px-2.5 py-1.5 text-[11px] leading-relaxed text-sky-200"
    >
      余裕は{slack}pt と少ない。入れるなら一つに絞って——
      {sprintGoal ? (
        <>
          <span className="font-semibold text-sky-100">「{sprintGoal}」</span>
          に直結する一手かどうか、よく見極めたい。
        </>
      ) : (
        <>
          <RichText text="{{スプリントゴール}}" interactive={false} />
          に直結する一手かどうか、よく見極めたい。
        </>
      )}{' '}
      迷うなら見送って次スプリントへ回すのも一手。PO と再交渉し、ゴールを危うくしない範囲で。
    </p>
  )
}
