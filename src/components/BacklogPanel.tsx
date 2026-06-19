import { useEffect, useState } from 'react'
import { SPRINTS } from '../data/chapters/chapter-01'
import { hearingThemeFor } from '../data/minigames'
import {
  backlogItem,
  canReview,
  canStart,
  forecastPoints,
  GEN_TOKEN_COST,
  type ProposalVerdict,
  REVIEW_CAPACITY,
  reviewBacklogProposal,
  WIP_LIMIT,
} from '../engine/backlog'
import type { ProgressCore } from '../engine/progression'
import { useFocusTrap } from '../hooks/useFocusTrap'
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

/** イベントID風の決定的シード（レビュー・ミニゲームの内容選択用） */
function seedFor(id: string): number {
  let s = 0
  for (let i = 0; i < id.length; i++) s = (s * 31 + id.charCodeAt(i)) >>> 0
  return s
}

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
            <span aria-hidden="true">📋</span> スプリントバックログ
          </h2>
          <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
            Sprint {SPRINTS[Math.min(sprintIndex, SPRINTS.length - 1)]?.n}
          </span>
        </header>

        <div className="space-y-3 overflow-y-auto px-5 py-4">
          {isPlanning ? (
            <PlanningView
              sprintIndex={sprintIndex}
              backlogOrder={backlogOrder}
              sprintForecast={sprintForecast}
              backlogDone={backlogDone}
              velocity={velocity}
              commitBacklogOrder={commitBacklogOrder}
              toggleForecast={toggleForecast}
            />
          ) : (
            <KanbanView
              isWork={isWork}
              sprintForecast={sprintForecast}
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
  commitBacklogOrder: (ids: string[]) => void
  toggleForecast: (id: string) => void
}

function PlanningView({
  sprintIndex,
  backlogOrder,
  sprintForecast,
  backlogDone,
  velocity,
  commitBacklogOrder,
  toggleForecast,
}: PlanningProps) {
  // 予測の“目安”＝今スプリントで実際に終わらせられる量。律速は人のレビュー容量なので
  // それを基準にする（前回ベロシティではなく、真のボトルネックに合わせる）。
  const capacity = REVIEW_CAPACITY
  const fpts = forecastPoints({ sprintForecast })
  const over = fpts > capacity
  const doneSet = new Set(backlogDone)
  const forecastSet = new Set(sprintForecast)

  const officialActive = backlogOrder.filter((id) => !doneSet.has(id))
  const doneList = backlogOrder.filter((id) => doneSet.has(id))

  const [draft, setDraft] = useState<string[]>(officialActive)
  const [verdict, setVerdict] = useState<ProposalVerdict | null>(null)
  useEffect(() => {
    setDraft(officialActive)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backlogOrder])

  const dirty = !sameOrder(draft, officialActive)
  const move = (id: string, dir: -1 | 1) => {
    setVerdict(null)
    setDraft((cur) => {
      const arr = [...cur]
      const i = arr.indexOf(id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= arr.length) return cur
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
      return arr
    })
  }
  const submitProposal = () => {
    const v = reviewBacklogProposal({ sprintIndex, backlogDone, backlogOrder }, [...draft, ...doneList])
    commitBacklogOrder(v.order)
    setVerdict(v)
  }

  const rows = [...draft, ...doneList]

  return (
    <>
      <p className="text-xs leading-relaxed text-slate-400">
        <RichText text="{{プロダクトバックログ}}は{{プロダクトゴール}}へ向かう、価値順に並んだ唯一のリスト。並べ替え（優先順位）の最終責任はPOにある。あなたは並びを“提案”し、{{スプリントゴール}}に直結する上位から容量の範囲で{{フォーキャスト}}（予測）して To Do を組む。" />
      </p>

      <div className={`rounded-xl px-3 py-2.5 ${over ? 'bg-rose-500/10 ring-1 ring-rose-500/40' : 'bg-slate-800/40'}`}>
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="text-slate-300">🧮 予測 / 今スプリントで終わらせられる目安</span>
          <span className={`tabular-nums ${over ? 'text-rose-300' : 'text-slate-300'}`}>
            {fpts} / {capacity} pt
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-700">
          <div
            className={`h-full rounded-full transition-all ${over ? 'bg-rose-500' : 'bg-sky-400'}`}
            style={{ width: `${Math.min(100, capacity ? (fpts / capacity) * 100 : 0)}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-slate-400">
          目安＝人の{<RichText text="{{レビュー}}" />}容量（{capacity}pt/スプリント）。これを超えて予測しても、
          終わらせられるのはレビューできた分だけ＝残りは{<RichText text="{{キャリーオーバー}}" />}になる。
        </p>
      </div>

      <VelocityChart velocity={velocity} />

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
                  <p className={`mt-1 text-sm ${isDone ? 'text-slate-400 line-through' : 'text-slate-100'}`}>
                    <RichText text={item.title} />
                  </p>
                </div>

                {!isDone && (
                  <button
                    type="button"
                    onClick={() => toggleForecast(id)}
                    className={`shrink-0 self-center rounded-lg px-2.5 py-1.5 text-xs font-semibold transition active:scale-95 ${
                      isForecast
                        ? 'bg-sky-500 text-slate-950 hover:bg-sky-400'
                        : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                    }`}
                  >
                    {isForecast ? '✓ 予測' : '＋ 入れる'}
                  </button>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      <div className="space-y-2 rounded-xl border border-slate-700 bg-slate-800/30 px-3 py-2.5">
        {verdict && (
          <p className={`text-xs leading-relaxed ${verdict.accepted ? 'text-emerald-300' : 'text-amber-300'}`}>
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
        <div className="flex gap-2">
          <button
            type="button"
            onClick={submitProposal}
            disabled={!dirty}
            className="flex-1 rounded-lg bg-amber-500/90 py-2 text-sm font-bold text-slate-950 transition hover:bg-amber-400 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
          >
            並びをPOに提案する
          </button>
          {dirty && (
            <button
              type="button"
              onClick={() => {
                setDraft(officialActive)
                setVerdict(null)
              }}
              className="rounded-lg bg-slate-700 px-3 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-600 active:scale-95"
            >
              取消
            </button>
          )}
        </div>
      </div>
    </>
  )
}

// ───────────────────────── スプリント中：カンバン（To Do/In Progress/Done） ─────────────────────────

interface KanbanProps {
  isWork: boolean
  sprintForecast: string[]
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
            <span className="text-slate-300">🔎 レビュー容量</span>
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
            <Card key={id} title={item.title} estimate={item.estimate}>
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
            <Card key={id} title={item.title} estimate={item.estimate}>
              <div className="flex w-full flex-col gap-1.5">
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
                    🔎 レビューする
                  </button>
                )}
              </div>
            </Card>
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
            <Card key={id} title={item.title} estimate={item.estimate} dimmed>
              <span className="shrink-0 self-center rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                ✓ DoD
              </span>
            </Card>
          )
        })}
        {done.length === 0 && <Empty />}
      </Column>

      {/* レビュー・ミニゲーム（深さ確定後） */}
      {pending && (
        <MiniGame
          kind="dev"
          seed={seedFor(pending.id)}
          theme={hearingThemeFor('team')}
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
}: {
  title: string
  estimate: number
  dimmed?: boolean
  children: React.ReactNode
}) {
  return (
    <div className={`rounded-lg border border-slate-700 bg-slate-800/40 px-3 py-2 ${dimmed ? 'opacity-70' : ''}`}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <span className="rounded bg-slate-700 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-slate-300">
            {estimate}pt
          </span>
          <p className={`mt-1 text-sm ${dimmed ? 'text-slate-400 line-through' : 'text-slate-100'}`}>
            <RichText text={title} />
          </p>
        </div>
        {children}
      </div>
    </div>
  )
}

function Empty() {
  return <p className="px-1 py-1 text-xs text-slate-400">— なし —</p>
}

function VelocityChart({ velocity }: { velocity: number[] }) {
  if (!velocity.some((v) => v > 0)) return null
  const max = Math.max(1, ...velocity)
  return (
    <div className="rounded-xl bg-slate-800/40 px-3 py-2.5">
      <div className="mb-1 text-xs text-slate-300">
        📈 <RichText text="{{ベロシティ}}" />
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
