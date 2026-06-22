import { useMemo } from 'react'
import { SPRINTS } from '../data/chapters/chapter-01'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { useEngagement } from '../store/engagementStore'
import { KanbanView } from './backlog/KanbanView'
import { PlanningView } from './backlog/PlanningView'
import { RichText } from './RichText'

interface Props {
  onClose: () => void
}

/** スプリントバックログのカンバン操作パネル。
 *  - プランニング中：プロダクトバックログを並べ替え提案（PO承認）し、スプリント予測で To Do を組む。
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
    shippedUndoneIds,
    inProgress,
    reviewProgress,
    reviewCapacity,
    velocity,
    aiTokens,
    lastCarryover,
    sprintGoals,
    retroImprovements,
    unrefinedPbis,
    commitBacklogOrder,
    toggleForecast,
    splitItem,
    pullIntoSprint,
    refinePbi,
    startItem,
    reviewItem,
  } = useEngagement()

  const ceremony = SPRINTS[sprintIndex]?.beats[beatIndex]
  const isPlanning = ceremony === 'planning'
  const isWork = ceremony === 'daily'

  const doneSet = useMemo(() => new Set(backlogDone), [backlogDone])
  const undoneSet = useMemo(() => new Set(shippedUndoneIds), [shippedUndoneIds])

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-safe pt-safe pb-safe backdrop-blur-sm">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="backlog-panel-title"
        className={`flex max-h-[90vh] w-full flex-col rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl ${
          // カンバン（スプリント中）は広い画面で横長ボードにするため幅を広げる。プランニングは従来の縦長(md)。
          isPlanning ? 'max-w-md' : 'max-w-md lg:max-w-5xl xl:max-w-6xl'
        }`}
      >
        <header className="flex items-center justify-between gap-3 border-b border-slate-800 px-5 py-3">
          <h2 id="backlog-panel-title" className="text-base font-bold text-slate-100">
            {isPlanning ? 'スプリント計画' : 'スプリントバックログ'}
          </h2>
          <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
            Sprint {SPRINTS[Math.min(sprintIndex, SPRINTS.length - 1)]?.n}
          </span>
        </header>

        {/* スプリントゴール：計画・カンバンどちらでも forecast の判断軸として常時表示 */}
        <SprintGoalBanner sprintIndex={sprintIndex} ceremony={ceremony} sprintGoals={sprintGoals} />

        <div className="space-y-3 overflow-y-auto px-5 py-4">
          {isPlanning ? (
            <PlanningView
              sprintIndex={sprintIndex}
              backlogOrder={backlogOrder}
              sprintForecast={sprintForecast}
              backlogDone={backlogDone}
              velocity={velocity}
              lastCarryover={lastCarryover}
              retroImprovements={retroImprovements}
              unrefinedPbis={unrefinedPbis}
              commitBacklogOrder={commitBacklogOrder}
              toggleForecast={toggleForecast}
              splitItem={splitItem}
              refinePbi={refinePbi}
            />
          ) : (
            <KanbanView
              isWork={isWork}
              backlogOrder={backlogOrder}
              doneSet={doneSet}
              undoneSet={undoneSet}
              reviewProgress={reviewProgress}
              unrefinedPbis={unrefinedPbis}
              startItem={startItem}
              reviewItem={reviewItem}
              pullIntoSprint={pullIntoSprint}
              core={{
                sprintIndex,
                beatIndex,
                sprintForecast,
                backlogDone,
                inProgress,
                reviewCapacity,
                aiTokens,
                retroImprovements,
              }}
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

// ───────────────────────── スプリントゴール：計画/カンバン共通バナー ─────────────────────────

/** Board.tsx HUD と同じ導出ロジックでスプリントゴールを表示する。
 *  プレイヤーが forecast を組む際・カンバン操作中のどちらでも、ゴールが判断軸として常時見える。 */
function SprintGoalBanner({
  sprintIndex,
  ceremony,
  sprintGoals,
}: {
  sprintIndex: number
  ceremony: string | undefined
  sprintGoals: string[]
}) {
  const sprint = SPRINTS[Math.min(sprintIndex, SPRINTS.length - 1)]
  if (!sprint) return null

  const chosen = sprintGoals[sprintIndex]
  const isPlanning = ceremony === 'planning'

  return (
    <div
      role="note"
      aria-label="このスプリントのゴール"
      className="border-b border-sky-500/20 bg-sky-500/5 px-5 py-2.5"
    >
      <p className="text-[11px] leading-relaxed text-slate-400">
        <RichText text="{{スプリントゴール}}" />
        <span className="ml-1 text-slate-400">—</span>
        <span className="ml-1">
          {chosen ? (
            <span className="font-semibold text-sky-300">{chosen}</span>
          ) : isPlanning ? (
            <span className="text-slate-400">プランニングで決める…</span>
          ) : (
            <span className="font-semibold text-sky-300">{sprint.goal}</span>
          )}
        </span>
      </p>
      {!isPlanning && <p className="mt-0.5 text-[10px] text-slate-400">予測はこれに資するか？</p>}
    </div>
  )
}
