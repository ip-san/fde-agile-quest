import { useMemo, useState } from 'react'
import { SPRINTS } from '../data/chapters/chapter-01'
import {
  backlogItem,
  canReview,
  canStart,
  forecastPoints,
  GEN_TOKEN_COST,
  isDiscoverablePbi,
  isLegacyPbi,
  LEGACY_PBI_IDS,
  type ProposalVerdict,
  REVIEW_CAPACITY,
  reviewBacklogProposal,
  WIP_LIMIT,
} from '../engine/backlog'
import type { ProgressCore } from '../engine/progression'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { seedFor } from '../lib/seed'
import { useEngagement } from '../store/engagementStore'
import type { ExecTier, ReviewDepth } from '../types'
import { MiniGame } from './minigame/MiniGame'
import { RichText } from './RichText'

/** canStart/canReview に渡す最小コア（カンバンのゲート判定に必要な欄だけ） */
type KanbanCore = Pick<
  ProgressCore,
  'sprintIndex' | 'beatIndex' | 'sprintForecast' | 'backlogDone' | 'inProgress' | 'reviewCapacity' | 'aiTokens'
>

interface Props {
  onClose: () => void
}

const sameOrder = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i])

/** スプリントバックログのカンバン操作パネル。
 *  - プランニング中：プロダクトバックログを並べ替え提案（PO承認）し、予測（フォーキャスト）で To Do を組む。
 *  - スプリント中（デイリー）：To Do→In Progress（着手＝AI生成・トークン消費・WIP=2）、
 *    In Progress→Done（レビュー＝人のレビュー容量を消費。深さ×ミニゲーム出来で品質）。 */
export function BacklogPanel({ onClose }: Props) {
  const ref = useFocusTrap<HTMLDivElement>(onClose)
  const {
    sprintIndex,
    beatIndex,
    backlogOrder,
    sprintForecast,
    backlogDone,
    inProgress,
    reviewProgress,
    reviewCapacity,
    velocity,
    aiTokens,
    lastCarryover,
    commitBacklogOrder,
    toggleForecast,
    startItem,
    reviewItem,
  } = useEngagement()

  const ceremony = SPRINTS[sprintIndex]?.beats[beatIndex]
  const isPlanning = ceremony === 'planning'
  const isWork = ceremony === 'daily'

  const doneSet = new Set(backlogDone)
  const inProgSet = new Set(inProgress)

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-safe pt-safe pb-safe backdrop-blur-sm">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="backlog-panel-title"
        className="flex max-h-[90vh] w-full max-w-md flex-col rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"
      >
        <header className="flex items-center justify-between gap-3 border-b border-slate-800 px-5 py-3">
          <h2 id="backlog-panel-title" className="text-base font-bold text-slate-100">
            {isPlanning ? 'スプリント計画' : 'スプリントバックログ'}
          </h2>
          <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
            Sprint {SPRINTS[Math.min(sprintIndex, SPRINTS.length - 1)]?.n}
          </span>
        </header>

        <div className="space-y-3 overflow-y-auto px-5 py-4">
          {isPlanning ? (
            <PlanningView
              key={backlogOrder.filter((id) => !doneSet.has(id)).join(',')}
              sprintIndex={sprintIndex}
              backlogOrder={backlogOrder}
              sprintForecast={sprintForecast}
              backlogDone={backlogDone}
              velocity={velocity}
              lastCarryover={lastCarryover}
              commitBacklogOrder={commitBacklogOrder}
              toggleForecast={toggleForecast}
            />
          ) : (
            <KanbanView
              isWork={isWork}
              sprintForecast={sprintForecast}
              backlogOrder={backlogOrder}
              doneSet={doneSet}
              inProgSet={inProgSet}
              inProgress={inProgress}
              reviewProgress={reviewProgress}
              reviewCapacity={reviewCapacity}
              aiTokens={aiTokens}
              startItem={startItem}
              reviewItem={reviewItem}
              core={{ sprintIndex, beatIndex, sprintForecast, backlogDone, inProgress, reviewCapacity, aiTokens }}
            />
          )}
        </div>

        <footer className="border-t border-slate-800 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] w-full rounded-xl bg-slate-700 py-3 font-bold text-slate-100 transition hover:bg-slate-600 active:scale-95"
          >
            閉じる
          </button>
        </footer>
      </div>
    </div>
  )
}

// ───────────────────────── プランニング：PBL 並べ替え提案＋フォーキャスト ─────────────────────────

interface PlanningProps {
  sprintIndex: number
  backlogOrder: string[]
  sprintForecast: string[]
  backlogDone: string[]
  velocity: number[]
  lastCarryover: string[]
  commitBacklogOrder: (ids: string[]) => void
  toggleForecast: (id: string) => void
}

function PlanningView({
  sprintIndex,
  backlogOrder,
  sprintForecast,
  backlogDone,
  velocity,
  lastCarryover,
  commitBacklogOrder,
  toggleForecast,
}: PlanningProps) {
  // 予測の"目安"＝今スプリントで実際に終わらせられる量。律速は人のレビュー容量なので
  // それを基準にする（前回ベロシティではなく、真のボトルネックに合わせる）。
  const capacity = REVIEW_CAPACITY
  // 前回スプリントから持ち越された PBI のうち、まだ未 done のもの
  const carryoverSet = useMemo(() => new Set(lastCarryover), [lastCarryover])
  const fpts = forecastPoints({ sprintForecast })
  const over = fpts > capacity
  const doneSet = useMemo(() => new Set(backlogDone), [backlogDone])
  const forecastSet = useMemo(() => new Set(sprintForecast), [sprintForecast])

  const officialActive = useMemo(() => backlogOrder.filter((id) => !doneSet.has(id)), [backlogOrder, doneSet])
  const doneList = useMemo(() => backlogOrder.filter((id) => doneSet.has(id)), [backlogOrder, doneSet])

  const [editState, setEditState] = useState<{ draft: string[]; verdict: ProposalVerdict | null }>({
    draft: officialActive,
    verdict: null,
  })

  const { draft, verdict } = editState
  const dirty = !sameOrder(draft, officialActive)
  const move = (id: string, dir: -1 | 1) => {
    setEditState((cur) => {
      const arr = [...cur.draft]
      const i = arr.indexOf(id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= arr.length) return cur
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
      return { draft: arr, verdict: null }
    })
  }
  const submitProposal = () => {
    const v = reviewBacklogProposal({ sprintIndex, backlogDone, backlogOrder }, [...draft, ...doneList])
    commitBacklogOrder(v.order)
    setEditState((cur) => ({ ...cur, verdict: v }))
  }

  const rows = [...draft, ...doneList]

  // 🎯 スプリントへ入れた予測（＝スプリントバックログ）。表示は価値順、完了済みは除く。
  const selected = backlogOrder.filter((id) => forecastSet.has(id) && !doneSet.has(id))

  return (
    <>
      <p className="text-xs leading-relaxed text-slate-400">
        <RichText text="{{プロダクトバックログ}}（やりたいこと全部・価値順）から、上位を選んで「＋ スプリントへ」で今スプリントの{{スプリントバックログ}}に入れる＝{{フォーキャスト}}（予測）。並び（優先順位）の最終責任はPOにあるので、並べ替えは「提案」する。" />
      </p>

      {/* 🗂 元：プロダクトバックログ（選ぶ側） */}
      <section className="rounded-xl bg-slate-900/40 p-2">
        <h3 className="mb-1 px-1 text-xs font-bold text-slate-300">
          <RichText text="{{プロダクトバックログ}}" />
          <span className="ml-1 font-normal text-slate-400">価値順・上位から選ぶ</span>
        </h3>

        {/* 持ち越しがある場合だけ注意書きを出す */}
        {carryoverSet.size > 0 && (
          <p
            role="note"
            className="mb-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs leading-relaxed text-rose-300"
          >
            ↪ 前回終わらなかった項目がバックログに戻っています。今回の予測に組み直しましょう。
          </p>
        )}

        <ul className="space-y-1.5">
          {rows.map((id) => {
            const item = backlogItem(id)
            if (!item) return null
            const isDone = doneSet.has(id)
            const isForecast = forecastSet.has(id)
            const draftPos = draft.indexOf(id)
            return (
              <li
                key={id}
                className={`rounded-xl border px-3 py-2 ${
                  isDone
                    ? 'border-slate-800 bg-slate-800/20 opacity-70'
                    : isForecast
                      ? 'border-sky-500/40 bg-sky-500/10'
                      : 'border-slate-700 bg-slate-800/40'
                }`}
              >
                <div className="flex items-start gap-2">
                  {!isDone ? (
                    <div className="flex flex-col gap-0.5 pt-0.5">
                      <button
                        type="button"
                        aria-label={`${item.title} を上へ`}
                        disabled={draftPos <= 0}
                        onClick={() => move(id, -1)}
                        className="rounded px-1 text-xs text-slate-400 hover:bg-slate-700 disabled:opacity-30"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        aria-label={`${item.title} を下へ`}
                        disabled={draftPos < 0 || draftPos >= draft.length - 1}
                        onClick={() => move(id, 1)}
                        className="rounded px-1 text-xs text-slate-400 hover:bg-slate-700 disabled:opacity-30"
                      >
                        ▼
                      </button>
                    </div>
                  ) : (
                    <span className="w-5 shrink-0 pt-0.5 text-center text-xs text-emerald-300">✓</span>
                  )}

                  <div className="min-w-0 flex-1">
                    <span className="rounded bg-slate-700 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-slate-300">
                      {item.estimate}pt
                    </span>
                    {/* 前回持ち越し・未done の項目にバッジ表示 */}
                    {carryoverSet.has(id) && !isDone && (
                      <span
                        aria-label="前回持ち越し"
                        className="ml-1.5 rounded bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-rose-300"
                      >
                        ↪ 前回持ち越し
                      </span>
                    )}
                    <PbiBadges id={id} stakeholder={item.stakeholder} />
                    <p className={`mt-1 text-sm ${isDone ? 'text-slate-400 line-through' : 'text-slate-100'}`}>
                      <RichText text={item.title} />
                    </p>
                  </div>

                  {!isDone && (
                    <button
                      type="button"
                      aria-label={
                        isForecast ? `${item.title} をスプリントから外す` : `${item.title} をスプリントへ入れる`
                      }
                      onClick={() => toggleForecast(id)}
                      className={`shrink-0 self-center rounded-lg px-2.5 py-1.5 text-xs font-semibold transition active:scale-95 ${
                        isForecast
                          ? 'bg-sky-500 text-slate-950 hover:bg-sky-400'
                          : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                      }`}
                    >
                      {isForecast ? '✓ 入れた' : '＋ スプリントへ'}
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>

        <div className="mt-2 space-y-2 rounded-xl border border-slate-700 bg-slate-800/30 px-3 py-2.5">
          {verdict && (
            <p
              role="status"
              aria-live="polite"
              className={`text-xs leading-relaxed ${verdict.accepted ? 'text-emerald-300' : 'text-amber-300'}`}
            >
              <span className="font-semibold">プロダクトオーナー：</span>
              {verdict.accepted ? (
                'いい並びだ。今のゴールに効く順になっている。これで行こう。'
              ) : (
                <>
                  提案はほぼ採る。ただし
                  {verdict.floated.map((fid) => `「${backlogItem(fid)?.title ?? fid}」`).join('')}
                  は今スプリントのゴールに直結する。優先順位の最終責任は私にある——上に戻した。
                </>
              )}
            </p>
          )}
          {!dirty && !verdict && (
            <p id="propose-hint" className="text-xs text-slate-500">
              ▲▼で並び替えると提案できます
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={submitProposal}
              disabled={!dirty}
              aria-describedby={!dirty && !verdict ? 'propose-hint' : undefined}
              className="flex-1 rounded-lg bg-amber-500/90 py-2 text-sm font-bold text-slate-950 transition hover:bg-amber-400 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
            >
              並びをPOに提案する
            </button>
            {dirty && (
              <button
                type="button"
                onClick={() => {
                  setEditState({ draft: officialActive, verdict: null })
                }}
                className="rounded-lg bg-slate-700 px-3 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-600 active:scale-95"
              >
                取消
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ⬇ 入れる方向の明示 */}
      <p className="text-center text-xs text-sky-400/80" aria-hidden="true">
        ⬇ 選んだものが入る
      </p>

      {/* 🎯 先：スプリントバックログ（入れた予測） */}
      <section className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-3">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="px-0.5 text-xs font-bold text-sky-300">
            <RichText text="{{スプリントバックログ}}" />
            <span className="ml-1 font-normal text-sky-400/70">今スプリントに入れた予測</span>
          </h3>
          <span className={`text-xs font-bold tabular-nums ${over ? 'text-rose-300' : 'text-sky-200'}`}>
            {fpts} / {capacity} pt
          </span>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-slate-700">
          <div
            className={`h-full rounded-full transition-all ${over ? 'bg-rose-500' : 'bg-sky-400'}`}
            style={{ width: `${Math.min(100, capacity ? (fpts / capacity) * 100 : 0)}%` }}
          />
        </div>
        <p className="mt-1 mb-2 text-xs text-slate-400">
          容量の目安＝人の{<RichText text="{{レビュー}}" />}（{capacity}
          pt/スプリント）。超えて入れても終わるのはレビューできた分だけ＝残りは
          {<RichText text="{{キャリーオーバー}}" />}。
        </p>

        {/* ② ステークホルダー内訳（情シス/現場の綱引き） */}
        <StakeholderBalance forecastIds={selected} />

        {selected.length === 0 ? (
          <p className="rounded-lg bg-slate-900/40 px-3 py-3 text-center text-xs text-slate-400">
            まだ何も入れていません。上のリストから「＋ スプリントへ」で選びます。
          </p>
        ) : (
          <ul className="space-y-1">
            {selected.map((id) => {
              const item = backlogItem(id)
              if (!item) return null
              return (
                <li
                  key={id}
                  className="flex items-center gap-2 rounded-lg border border-sky-500/30 bg-sky-500/10 px-2.5 py-1.5"
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
                    aria-label={`${item.title} をスプリントから外す`}
                    onClick={() => toggleForecast(id)}
                    className="shrink-0 rounded px-1.5 py-0.5 text-xs text-slate-400 transition hover:bg-slate-700 hover:text-rose-300"
                  >
                    外す
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* ④ 太く残す PBI のサマリ */}
      <LegacySummary backlogDone={backlogDone} />

      <VelocityChart velocity={velocity} />
    </>
  )
}

// ───────────────────────── スプリント中：カンバン（To Do/In Progress/Done） ─────────────────────────

interface KanbanProps {
  isWork: boolean
  sprintForecast: string[]
  /** 見えているプロダクトバックログ全体（read-only 参照用） */
  backlogOrder: string[]
  doneSet: Set<string>
  inProgSet: Set<string>
  inProgress: string[]
  reviewProgress: Record<string, number>
  reviewCapacity: number
  aiTokens: number
  startItem: (id: string) => void
  reviewItem: (id: string, depth: ReviewDepth, tier: ExecTier) => void
  core: KanbanCore
}

function KanbanView({
  isWork,
  sprintForecast,
  backlogOrder,
  doneSet,
  inProgSet,
  inProgress,
  reviewProgress,
  reviewCapacity,
  aiTokens,
  startItem,
  reviewItem,
  core,
}: KanbanProps) {
  // レビューの2段：深さ選択 → ミニゲーム → 確定
  const [depthFor, setDepthFor] = useState<string | null>(null)
  const [pending, setPending] = useState<{ id: string; depth: ReviewDepth } | null>(null)

  const todo = sprintForecast.filter((id) => !doneSet.has(id) && !inProgSet.has(id))
  const done = sprintForecast.filter((id) => doneSet.has(id))

  if (sprintForecast.length === 0) {
    return (
      <p className="rounded-xl bg-slate-800/40 px-3 py-4 text-center text-sm text-slate-400">
        このスプリントの予測（To Do）がありません。プランニングで{<RichText text="{{フォーキャスト}}" />}
        しておきましょう。
      </p>
    )
  }

  return (
    <>
      <p className="text-xs leading-relaxed text-slate-400">
        <RichText text="開発そのものは AI が担う（着手＝生成）。価値は人の{{レビュー}}にある。In Progress は WIP=2 で詰まり、{{制約理論}}どおりレビューがボトルネックになる。" />
      </p>

      {/* レビュー容量＋WIP メーター */}
      <div className="flex gap-2">
        <div className="flex-1 rounded-xl bg-slate-800/40 px-3 py-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300">レビュー容量</span>
            <span className="tabular-nums text-slate-300">
              {reviewCapacity} / {REVIEW_CAPACITY}
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-700">
            <div
              className="h-full rounded-full bg-emerald-400"
              style={{ width: `${(Math.max(0, reviewCapacity) / REVIEW_CAPACITY) * 100}%` }}
            />
          </div>
        </div>
        <div className="rounded-xl bg-slate-800/40 px-3 py-2 text-center">
          <div className="text-xs text-slate-300">
            <RichText text="{{仕掛り}}" />
          </div>
          <div className="tabular-nums text-sm text-slate-200">
            {inProgress.length}/{WIP_LIMIT}
          </div>
        </div>
      </div>

      {!isWork && (
        <p className="rounded-lg bg-slate-800/40 px-3 py-1.5 text-xs text-slate-400">
          着手・レビューはデイリー（業務中）に行えます。
        </p>
      )}

      {/* To Do */}
      <Column title="To Do" tone="text-slate-300" count={todo.length}>
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
                title={!startable && aiTokens < GEN_TOKEN_COST ? 'AIトークンが足りません' : undefined}
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
      <Column title="In Progress（着手中）" tone="text-amber-200" count={inProgress.length}>
        {inProgress.map((id) => {
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
                        浅い（速い/負債）
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPending({ id, depth: 'thorough' })
                          setDepthFor(null)
                        }}
                        className="flex-1 rounded-lg bg-emerald-600 px-2 py-1.5 text-xs font-semibold text-slate-100 transition hover:bg-emerald-500 active:scale-95"
                      >
                        深い（テスト/品質）
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDepthFor(id)}
                      disabled={!reviewable}
                      title={!reviewable && reviewCapacity <= 0 ? 'レビュー容量切れ（次スプリントで回復）' : undefined}
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
        {inProgress.length === 0 && <Empty />}
      </Column>

      {/* Done */}
      <Column title="Done（完了）" tone="text-emerald-300" count={done.length}>
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
              <span className="shrink-0 self-center rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                ✓ DoD
              </span>
            </Card>
          )
        })}
        {done.length === 0 && <Empty />}
      </Column>

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

function Column({
  title,
  tone,
  count,
  children,
}: {
  title: string
  tone: string
  count: number
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl bg-slate-900/40 p-2">
      <h3 className={`mb-1.5 px-1 text-xs font-bold ${tone}`}>
        {title} <span className="text-slate-400">({count})</span>
      </h3>
      <div className="space-y-1.5">{children}</div>
    </section>
  )
}

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

function Empty() {
  return <p className="px-1 py-1 text-xs text-slate-400">— なし —</p>
}

// ───────────────────────── PBI 共通バッジ群（ステークホルダー＋レガシー） ─────────────────────────

/** PBI 1件分のステークホルダー・レガシーバッジをまとめたヘルパー。
 *  Card/li 各所で同じフラグメントを繰り返さないための集約コンポーネント。 */
function PbiBadges({ id, stakeholder }: { id: string; stakeholder?: 'joushi' | 'genba' }) {
  return (
    <>
      <StakeholderBadge stakeholder={stakeholder} />
      <LegacyBadge id={id} />
    </>
  )
}

// ───────────────────────── ② ステークホルダーバッジ ─────────────────────────

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

/** スプリントバックログ内の情シス/現場ポイント内訳。
 *  選んだ予測が「どちらに偏っているか」を軽量表示する（綱引きのトレードオフ可視化）。 */
function StakeholderBalance({ forecastIds }: { forecastIds: string[] }) {
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
      className="mb-2 flex items-center gap-2 rounded-lg bg-slate-800/50 px-2.5 py-1.5"
    >
      <span className="text-[10px] text-slate-400">綱引き：</span>
      {joushiPt > 0 && (
        <span className="flex items-center gap-1 text-[10px] font-semibold text-violet-300">
          <span className="rounded bg-violet-500/20 px-1 py-0.5">情シス</span>
          {joushiPt}pt
        </span>
      )}
      {joushiPt > 0 && genbaPt > 0 && <span className="text-[10px] text-slate-500">vs</span>}
      {genbaPt > 0 && (
        <span className="flex items-center gap-1 text-[10px] font-semibold text-sky-300">
          <span className="rounded bg-sky-500/20 px-1 py-0.5">現場</span>
          {genbaPt}pt
        </span>
      )}
    </div>
  )
}

// ───────────────────────── ④ 太く残す（レガシー）バッジ ─────────────────────────

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

/** 「太く残す」PBI のサマリ（計画画面に表示）。何件 Ship できたかを一覧する。 */
function LegacySummary({ backlogDone }: { backlogDone: readonly string[] }) {
  const doneSet = new Set(backlogDone)
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
              <span className={shipped ? '' : ''}>{item?.title ?? id}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function VelocityChart({ velocity }: { velocity: number[] }) {
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
