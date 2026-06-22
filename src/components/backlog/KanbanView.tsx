/** KanbanView.tsx
 *  スプリント中のカンバンボード（To Do / In Progress / Done）。
 *  KanbanView・ProductBacklogReadOnly・Column・Card・Empty をここに集約。
 */

import { useMemo, useState } from 'react'
import {
  backlogItem,
  canAddToForecast,
  canReview,
  canStart,
  forecastPoints,
  GEN_TOKEN_COST,
  isDiscoverablePbi,
  REVIEW_CAPACITY_PER_DAY,
  reviewCapacityFor,
  WIP_LIMIT,
  wipLimitFor,
} from '../../engine/backlog'
import type { ProgressCore } from '../../engine/progression'
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
  startItem: (id: string) => void
  reviewItem: (id: string, depth: ReviewDepth, tier: ExecTier) => void
  /** スプリント途中で Ready な PBI を予測に引き込む（スコープ再交渉） */
  pullIntoSprint: (id: string) => void
  core: KanbanCore
}

// ───────────────────────── KanbanView ─────────────────────────

export function KanbanView({
  isWork,
  backlogOrder,
  doneSet,
  undoneSet,
  reviewProgress,
  unrefinedPbis,
  startItem,
  reviewItem,
  pullIntoSprint,
  core,
}: KanbanProps) {
  // レビューの2段：深さ選択 → ミニゲーム → 確定
  const [depthFor, setDepthFor] = useState<string | null>(null)
  const [pending, setPending] = useState<{ id: string; depth: ReviewDepth } | null>(null)

  // core.inProgress は配列なので Set に変換して O(1) 検索を実現する（BacklogPanel からの二重管理を解消）
  const inProgSet = useMemo(() => new Set(core.inProgress), [core.inProgress])
  const todo = core.sprintForecast.filter((id) => !doneSet.has(id) && !inProgSet.has(id))
  const done = core.sprintForecast.filter((id) => doneSet.has(id))
  // レトロ改善（機構：Retro 昇格）を反映した上限。capacity 投資で容量↑／wip 改善で仕掛り上限↓。
  const maxReview = reviewCapacityFor(core.retroImprovements)
  const wipMax = wipLimitFor(core.retroImprovements)

  // 容量の目安＝1日あたりのレビュー容量。予測がこれを超えると、終わらない分は持ち越しになる（補助実践の目安・ガイドの規定ではない）。
  // maxReview と同一値（どちらも1日のレビュー容量）。派生にして二重算出・将来の乖離を防ぐ。
  const capacity = maxReview
  const fpts = forecastPoints({ sprintForecast: core.sprintForecast })
  const over = fpts > capacity
  // 途中で引き込める候補も"上位優先"に揃える＝canAddToForecast（上位を全部入れてからでないと下位は引けない）。
  // プランニングの選択と同じ規律にすることで、途中追加でも飛ばし入れを許さない（engine 側のガードと UI を一致させる）。
  const pullable = useMemo(() => {
    const coreForPull = {
      sprintForecast: core.sprintForecast,
      backlogDone: core.backlogDone,
      unrefinedPbis,
      backlogOrder,
    }
    return backlogOrder.filter((id) => canAddToForecast(coreForPull, id))
  }, [backlogOrder, core.sprintForecast, core.backlogDone, unrefinedPbis])

  if (core.sprintForecast.length === 0) {
    return (
      <p className="rounded-xl bg-slate-800/40 px-3 py-4 text-center text-sm text-slate-400">
        このスプリントの予測（To Do）がありません。プランニングで{<RichText text="{{スプリント予測}}" />}
        しておきましょう。
      </p>
    )
  }

  return (
    <>
      {/* ── 広い画面（lg+）：メーター類をコンパクトなツールバーに圧縮し、ボードをファーストビューへ ── */}
      <div className="hidden lg:flex lg:items-center lg:gap-3 lg:rounded-xl lg:border lg:border-slate-700/60 lg:bg-slate-800/30 lg:px-3 lg:py-2">
        {/* 説明 */}
        <p className="min-w-0 flex-1 text-[11px] leading-relaxed text-slate-400">
          <RichText text="着手＝AI生成。AIにどこまでレビューさせ、人がどれぐらい確かめるか——{{制約理論}}どおり1日のレビュー容量がボトルネック。" />
        </p>
        {/* 予測量バー */}
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-[11px] font-semibold text-sky-300">予測</span>
          <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-700">
            <div
              className={`h-full rounded-full transition-all ${over ? 'bg-amber-500' : 'bg-sky-400'}`}
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
              className={`h-full rounded-full transition-all ${over ? 'bg-amber-500' : 'bg-sky-400'}`}
              style={{ width: `${Math.min(100, capacity ? (fpts / capacity) * 100 : 0)}%` }}
            />
          </div>
          {over ? (
            <p role="note" className="mt-1.5 text-[11px] leading-relaxed text-amber-300">
              1日のレビュー容量（{capacity}pt）を超えて積んでいます。これは"悪手"ではなく
              <span className="font-semibold">賭け</span>
              ——多く積んでゴールに挑むのも一手。ただし終わらなかった分はスプリント末に
              {<RichText text="{{キャリーオーバー}}" />}（次へ持ち越し）。commitment
              はスプリントゴールであって全部終える約束ではない。
            </p>
          ) : (
            <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">
              1日のレビュー容量（{capacity}
              pt）。余裕があれば下で追加を引き込めます。毎デイリー開始時に回復・使い切りです。
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
            const item = backlogItem(id)
            if (!item) return null
            const startable = canStart(core, id)
            return (
              <Card
                key={id}
                title={item.title}
                estimate={item.estimate}
                badges={<PbiBadges id={id} stakeholder={item.stakeholder} />}
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
            const item = backlogItem(id)
            if (!item) return null
            const prog = Math.min(item.estimate, reviewProgress[id] ?? 0)
            const reviewable = canReview(core, id)
            return (
              <Card
                key={id}
                title={item.title}
                estimate={item.estimate}
                badges={<PbiBadges id={id} stakeholder={item.stakeholder} />}
                below={
                  <div className="mt-2 flex flex-col gap-1.5">
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-700">
                      <div
                        className="h-full rounded-full bg-amber-400"
                        style={{ width: `${item.estimate ? (prog / item.estimate) * 100 : 0}%` }}
                      />
                    </div>
                    {depthFor === id ? (
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setPending({ id, depth: 'quick' })
                            setDepthFor(null)
                          }}
                          className="flex-1 rounded-lg bg-slate-700 px-2 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-600 active:scale-95"
                        >
                          <RichText text="浅い：AIに任せて速く通す（{{完成の定義}}妥協・負債）" interactive={false} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPending({ id, depth: 'thorough' })
                            setDepthFor(null)
                          }}
                          className="flex-1 rounded-lg bg-emerald-600 px-2 py-1.5 text-xs font-semibold text-slate-100 transition hover:bg-emerald-500 active:scale-95"
                        >
                          <RichText text="深い：人が確かめる（{{完成の定義}}達成・品質）" interactive={false} />
                        </button>
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
            const item = backlogItem(id)
            if (!item) return null
            return (
              <Card
                key={id}
                title={item.title}
                estimate={item.estimate}
                dimmed
                badges={<PbiBadges id={id} stakeholder={item.stakeholder} />}
              >
                {undoneSet.has(id) ? (
                  <span
                    title="AIに任せて速く通した（浅い）＝完成の定義(DoD)を妥協した Ship。後で負債の取り立てが来る。"
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

      {/* スプリント途中の追加引き込み（スコープ再交渉）。早く終わって容量に余裕が出たら Ready 項目を足せる。 */}
      {isWork && pullable.length > 0 && (
        <section className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
          <h3 className="mb-1 px-0.5 text-xs font-bold text-emerald-300">
            スプリントに追加（
            {/* 見出し内だがボタンの入れ子ではないので interactive（用語チップ）にして解説を出す */}
            <RichText text="{{スコープ再交渉}}" />）
          </h3>
          <p className="mb-2 text-[11px] leading-relaxed text-slate-400">
            予測より早く片づき、容量に余裕が出たら Ready な項目を追加で引き込めます。
            <RichText text="{{スプリントバックログ}}" />
            は学びに応じてスプリント中も更新され続ける——ただし PO と再交渉し、
            <RichText text="{{スプリントゴール}}" />
            を危うくしない範囲で。
          </p>
          <ul className="space-y-1.5">
            {pullable.map((id) => {
              const item = backlogItem(id)
              if (!item) return null
              return (
                <li
                  key={id}
                  className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/40 px-2.5 py-1.5"
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
                    onClick={() => pullIntoSprint(id)}
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

      {/* プロダクトバックログ全体の参照（read-only）。スプリント中でも全体像を把握できる。 */}
      <ProductBacklogReadOnly backlogOrder={backlogOrder} doneSet={doneSet} />

      {/* レビュー・ミニゲーム（深さ確定後） */}
      {pending && (
        <MiniGame
          kind="review"
          seed={seedFor(pending.id)}
          onDone={(tier) => {
            reviewItem(pending.id, pending.depth, tier)
            setPending(null)
          }}
          onSkip={() => {
            reviewItem(pending.id, pending.depth, 'good')
            setPending(null)
          }}
        />
      )}
    </>
  )
}

// ───────────────────────── ProductBacklogReadOnly ─────────────────────────

/** スプリント中にプロダクトバックログ全体を read-only で参照するセクション（折りたたみ式）。
 *  発見可PBI（ヒアリングで掘り当てた項目）には「🔎 現場で発見」バッジを付ける。 */
function ProductBacklogReadOnly({ backlogOrder, doneSet }: { backlogOrder: string[]; doneSet: Set<string> }) {
  const [open, setOpen] = useState(false)
  const hasDisc = backlogOrder.some(isDiscoverablePbi)
  return (
    <section className="rounded-xl border border-slate-700 bg-slate-900/40">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-[44px] w-full items-center justify-between gap-2 px-3 py-2 transition hover:bg-slate-800 active:scale-95 rounded-xl"
      >
        <span className="text-xs font-bold text-slate-300">
          <RichText text="{{プロダクトバックログ}}" />
          <span className="ml-1 font-normal text-slate-400">全体を参照（読取専用）</span>
          {hasDisc && (
            <span className="ml-2 rounded bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-rose-300">
              発見あり
            </span>
          )}
        </span>
        <span className="text-xs text-slate-500" aria-hidden="true">
          {open ? '▲' : '▼'}
        </span>
      </button>
      {open && (
        <ul className="space-y-1.5 border-t border-slate-800 px-3 py-2">
          {backlogOrder.map((id) => {
            const item = backlogItem(id)
            if (!item) return null
            const done = doneSet.has(id)
            const disc = isDiscoverablePbi(id)
            return (
              <li
                key={id}
                className={`flex items-start gap-2 rounded-lg border px-2.5 py-1.5 ${done ? 'border-slate-800 bg-slate-800/20 opacity-70' : 'border-slate-700 bg-slate-800/40'}`}
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
                  </div>
                </div>
              </li>
            )
          })}
          {backlogOrder.length === 0 && <li className="px-1 py-1 text-xs text-slate-400">— なし —</li>}
        </ul>
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
  children,
  below,
  badges,
}: {
  title: string
  estimate: number
  dimmed?: boolean
  /** タイトル行の右に置く小さな操作（着手ボタン・DoD バッジ等）。幅を奪うと崩れるので軽量な要素のみ。 */
  children?: React.ReactNode
  /** タイトル行の"下"に全幅で敷くブロック（進捗バー＋レビュー操作など）。 */
  below?: React.ReactNode
  /** pt バッジの右に並ぶ小バッジ（ステークホルダー・レガシー等）。 */
  badges?: React.ReactNode
}) {
  return (
    <div className={`rounded-lg border border-slate-700 bg-slate-800/40 px-3 py-2 ${dimmed ? 'opacity-70' : ''}`}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
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
