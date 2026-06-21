import { useMemo, useState } from 'react'
import { SPRINTS } from '../data/chapters/chapter-01'
import {
  backlogItem,
  canAddToForecast,
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
  reviewCapacityFor,
  WIP_LIMIT,
  wipLimitFor,
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
  | 'sprintIndex'
  | 'beatIndex'
  | 'sprintForecast'
  | 'backlogDone'
  | 'inProgress'
  | 'reviewCapacity'
  | 'aiTokens'
  | 'retroImprovements'
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
    pullIntoSprint,
    refinePbi,
    startItem,
    reviewItem,
  } = useEngagement()

  const ceremony = SPRINTS[sprintIndex]?.beats[beatIndex]
  const isPlanning = ceremony === 'planning'
  const isWork = ceremony === 'daily'

  const doneSet = useMemo(() => new Set(backlogDone), [backlogDone])
  const inProgSet = useMemo(() => new Set(inProgress), [inProgress])
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
              refinePbi={refinePbi}
            />
          ) : (
            <KanbanView
              isWork={isWork}
              sprintForecast={sprintForecast}
              backlogOrder={backlogOrder}
              doneSet={doneSet}
              undoneSet={undoneSet}
              inProgSet={inProgSet}
              inProgress={inProgress}
              reviewProgress={reviewProgress}
              reviewCapacity={reviewCapacity}
              aiTokens={aiTokens}
              unrefinedPbis={unrefinedPbis}
              retroImprovements={retroImprovements}
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

// ───────────────────────── プランニング：PBL 並べ替え提案＋フォーキャスト ─────────────────────────

interface PlanningProps {
  sprintIndex: number
  backlogOrder: string[]
  sprintForecast: string[]
  backlogDone: string[]
  velocity: number[]
  lastCarryover: string[]
  retroImprovements: string[]
  unrefinedPbis: string[]
  commitBacklogOrder: (ids: string[]) => void
  toggleForecast: (id: string) => void
  refinePbi: (id: string) => void
}

function PlanningView({
  sprintIndex,
  backlogOrder,
  sprintForecast,
  backlogDone,
  velocity,
  lastCarryover,
  retroImprovements,
  unrefinedPbis,
  commitBacklogOrder,
  toggleForecast,
  refinePbi,
}: PlanningProps) {
  const unrefinedSet = useMemo(() => new Set(unrefinedPbis), [unrefinedPbis])
  // 予測の"目安"＝今スプリントで実際に終わらせられる量。律速は人のレビュー容量なので
  // それを基準にする（前回ベロシティではなく、真のボトルネックに合わせる）。レトロ改善(capacity)を反映。
  const capacity = reviewCapacityFor(retroImprovements)
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
  // 上位優先（飛ばし入れ禁止）では"次に入れられる1件"だけが addable。毎行 canAddToForecast を呼ぶと O(n²) なので、
  // PO 確定順(backlogOrder)上で最初に入れられる id を一度だけ求めて使い回す（その1件＝addable、他は不可）。
  const nextAddableId = useMemo(() => {
    const coreForSelect = { sprintForecast, backlogDone, unrefinedPbis, backlogOrder }
    return backlogOrder.find((id) => canAddToForecast(coreForSelect, id)) ?? null
  }, [sprintForecast, backlogDone, unrefinedPbis, backlogOrder])
  // PO 説得ミニゲームの表示フラグ。
  const [proposing, setProposing] = useState(false)
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
  // 「PO に提案」＝説得ミニゲームへ。優先順位は PO の所有なので、価値の論拠で説得して初めて動く。
  const submitProposal = () => setProposing(true)
  const resolveProposal = (tier: ExecTier) => {
    const v = reviewBacklogProposal({ sprintIndex, backlogDone, backlogOrder }, [...draft, ...doneList], tier)
    commitBacklogOrder(v.order)
    // PO が確定した順を draft に同期（採用/補正/却下のいずれでも"今の公式順"を映す）。verdict は残して結果を見せる。
    setEditState({ draft: v.order.filter((id) => !doneSet.has(id)), verdict: v })
    setProposing(false)
  }

  const rows = [...draft, ...doneList]

  // 🎯 スプリントへ入れた予測（＝スプリントバックログ）。表示は価値順、完了済みは除く。
  const selected = backlogOrder.filter((id) => forecastSet.has(id) && !doneSet.has(id))

  return (
    <>
      <p className="text-xs leading-relaxed text-slate-400">
        <RichText text="{{プロダクトバックログ}}（価値順）の上位から「＋ スプリントへ」で今スプリントの{{スプリントバックログ}}に入れる＝{{フォーキャスト}}（予測）。下位を上げたいときは、並びをPOに提案（説得）。" />
      </p>

      {/* 入れた予測の即時フィードバック：長いリストを下までスクロールしなくても件数/容量が常に見える。 */}
      <div
        className={`flex items-center justify-between rounded-lg border px-3 py-1.5 text-xs ${
          selected.length === 0
            ? 'border-amber-500/30 bg-amber-500/5 text-amber-300'
            : over
              ? 'border-amber-500/40 bg-amber-500/10 text-amber-200'
              : 'border-sky-500/30 bg-sky-500/10 text-sky-200'
        }`}
      >
        <span className="font-semibold">
          {selected.length === 0
            ? 'スプリントバックログは空（1件以上で開始）'
            : `スプリントバックログ：${selected.length}件`}
        </span>
        <span className="tabular-nums">
          {fpts} / {capacity} pt
        </span>
      </div>

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
            // 上位優先：この項目が"次に入れられる1件"か（飛ばし入れ禁止）。
            const addable = id === nextAddableId
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
                    {/* 機構：Refinement。発見直後の暫定見積り（Ready 化前）を明示 */}
                    {unrefinedSet.has(id) && !isDone && (
                      <span
                        aria-label="暫定見積り（要リファインメント）"
                        className="ml-1.5 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300"
                      >
                        暫定
                      </span>
                    )}
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

                  {!isDone &&
                    (unrefinedSet.has(id) ? (
                      // 機構：Refinement。発見直後の暫定見積りは Ready 化するまで予測に積めない。
                      <button
                        type="button"
                        aria-label={`${item.title} をリファインメントして Ready にする`}
                        title="発見した項目は暫定見積り。リファインメントで見積りを確かめて Ready にすると予測に積める。"
                        onClick={() => refinePbi(id)}
                        className="shrink-0 self-center rounded-lg bg-amber-500/90 px-2.5 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-amber-400 active:scale-95"
                      >
                        🔍 <RichText text="{{リファインメント}}" interactive={false} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        aria-label={
                          isForecast ? `${item.title} をスプリントから外す` : `${item.title} をスプリントへ入れる`
                        }
                        onClick={() => toggleForecast(id)}
                        disabled={!isForecast && !addable}
                        title={
                          !isForecast && !addable
                            ? '上位の項目を先に入れます（価値の高い順）。下位を上げたいなら、下で並べ替えをPOに提案。'
                            : undefined
                        }
                        className={`shrink-0 self-center rounded-lg px-2.5 py-1.5 text-xs font-semibold transition active:scale-95 ${
                          isForecast
                            ? 'bg-sky-500 text-slate-950 hover:bg-sky-400'
                            : addable
                              ? 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                              : 'cursor-not-allowed bg-slate-800 text-slate-500'
                        }`}
                      >
                        {isForecast ? '✓ 入れた' : addable ? '＋ スプリントへ' : '上位が先'}
                      </button>
                    ))}
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
              className={`text-xs leading-relaxed ${
                verdict.rejected ? 'text-rose-300' : verdict.accepted ? 'text-emerald-300' : 'text-amber-300'
              }`}
            >
              <span className="font-semibold">プロダクトオーナー：</span>
              {verdict.rejected ? (
                '今の優先順位には根拠がある。価値で説得しきれていない——並べ替えは見送りだ。現状の順で行こう。'
              ) : verdict.accepted ? (
                'いい並びだ。価値の順に届く。これで行こう。'
              ) : (
                <>
                  筋は通っている。ただし
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
          {dirty && (
            <p className="text-xs leading-relaxed text-amber-300/90">
              並べ替えは"提案"の下書き中。「＋
              スプリントへ」はPOが確定した順から選べます——先にこの並びをPOに提案して通すと、その順で選べるようになります。
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

      {/* PO 説得ミニゲーム（並べ替え提案時）。価値の論拠を2つ選んで PO を動かす。スキップ＝標準(good)。 */}
      {proposing && (
        <MiniGame
          kind="persuade"
          // 提案の中身でシードを変える＝説得の論拠カードの並びが毎回固定にならない（位置の暗記化を防ぐ）。
          seed={seedFor(`po-proposal-${sprintIndex}-${draft.join(',')}`)}
          onDone={resolveProposal}
          onSkip={() => resolveProposal('good')}
        />
      )}
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
  /** うち「DoD を妥協して（浅い quick レビューで）Ship した」PBI id。Done バッジの出し分けに使う。 */
  undoneSet: Set<string>
  inProgSet: Set<string>
  inProgress: string[]
  reviewProgress: Record<string, number>
  reviewCapacity: number
  aiTokens: number
  /** 未リファインメント（暫定見積り）の PBI id。途中引き込みは Ready のみ対象にするため除外に使う。 */
  unrefinedPbis: string[]
  retroImprovements: string[]
  startItem: (id: string) => void
  reviewItem: (id: string, depth: ReviewDepth, tier: ExecTier) => void
  /** スプリント途中で Ready な PBI を予測に引き込む（スコープ再交渉） */
  pullIntoSprint: (id: string) => void
  core: KanbanCore
}

function KanbanView({
  isWork,
  sprintForecast,
  backlogOrder,
  doneSet,
  undoneSet,
  inProgSet,
  inProgress,
  reviewProgress,
  reviewCapacity,
  aiTokens,
  unrefinedPbis,
  retroImprovements,
  startItem,
  reviewItem,
  pullIntoSprint,
  core,
}: KanbanProps) {
  // レビューの2段：深さ選択 → ミニゲーム → 確定
  const [depthFor, setDepthFor] = useState<string | null>(null)
  const [pending, setPending] = useState<{ id: string; depth: ReviewDepth } | null>(null)

  const todo = sprintForecast.filter((id) => !doneSet.has(id) && !inProgSet.has(id))
  const done = sprintForecast.filter((id) => doneSet.has(id))
  // レトロ改善（機構：Retro 昇格）を反映した上限。capacity 投資で容量↑／wip 改善で仕掛り上限↓。
  const maxReview = reviewCapacityFor(core.retroImprovements)
  const wipMax = wipLimitFor(core.retroImprovements)

  // 容量の目安＝人のレビュー容量。予測がこれを超えると、終わらない分は持ち越しになる（補助実践の目安・ガイドの規定ではない）。
  const capacity = reviewCapacityFor(retroImprovements)
  const fpts = forecastPoints({ sprintForecast })
  const over = fpts > capacity
  // 途中で引き込める候補も"上位優先"に揃える＝canAddToForecast（上位を全部入れてからでないと下位は引けない）。
  // プランニングの選択と同じ規律にすることで、途中追加でも飛ばし入れを許さない（engine 側のガードと UI を一致させる）。
  const pullable = useMemo(() => {
    const coreForPull = { sprintForecast, backlogDone: core.backlogDone, unrefinedPbis, backlogOrder }
    return backlogOrder.filter((id) => canAddToForecast(coreForPull, id))
  }, [backlogOrder, sprintForecast, core.backlogDone, unrefinedPbis])

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
      {/* ── 広い画面（lg+）：メーター類をコンパクトなツールバーに圧縮し、ボードをファーストビューへ ── */}
      <div className="hidden lg:flex lg:items-center lg:gap-3 lg:rounded-xl lg:border lg:border-slate-700/60 lg:bg-slate-800/30 lg:px-3 lg:py-2">
        {/* 説明 */}
        <p className="min-w-0 flex-1 text-[11px] leading-relaxed text-slate-400">
          <RichText text="着手＝AI生成。価値は人の{{レビュー}}にある。{{制約理論}}どおりレビューがボトルネック。" />
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
          <span className="text-slate-400">レビュー</span>
          <div className="h-2 w-14 overflow-hidden rounded-full bg-slate-700">
            <div
              className="h-full rounded-full bg-emerald-400"
              style={{ width: `${(Math.max(0, reviewCapacity) / maxReview) * 100}%` }}
            />
          </div>
          <span className="tabular-nums text-slate-300">
            {reviewCapacity}/{maxReview}
            {maxReview > REVIEW_CAPACITY && <span className="ml-0.5 text-emerald-400">🔧</span>}
          </span>
        </div>
        {/* WIP */}
        <div className="flex shrink-0 items-center gap-1 text-[11px]">
          <span className="text-slate-400">
            <RichText text="{{仕掛り}}" />
          </span>
          <span className="tabular-nums font-bold text-slate-200">
            {inProgress.length}/{wipMax}
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
          <RichText text="開発そのものは AI が担う（着手＝生成）。価値は人の{{レビュー}}にある。In Progress は WIP=2 で詰まり、{{制約理論}}どおりレビューがボトルネックになる。" />
        </p>

        {/* 予測量 vs 容量（オーバーフォーキャストの可視化）。超過分は終わらず持ち越しになる。 */}
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
              容量（人の{<RichText text="{{レビュー}}" />}・{capacity}pt）を超えて積んでいます。これは"悪手"ではなく
              <span className="font-semibold">賭け</span>
              ——多く積んでゴールに挑むのも一手。ただし終わらなかった分はスプリント末に
              {<RichText text="{{キャリーオーバー}}" />}（次へ持ち越し）。commitment
              はスプリントゴールであって全部終える約束ではない。
            </p>
          ) : (
            <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">
              容量の目安＝人の{<RichText text="{{レビュー}}" />}（{capacity}
              pt/スプリント）。余裕があれば下で追加を引き込めます。
            </p>
          )}
        </section>

        {/* レビュー容量＋WIP メーター */}
        <div className="mt-3 flex gap-2">
          <div className="flex-1 rounded-xl bg-slate-800/40 px-3 py-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300">レビュー容量</span>
              <span className="tabular-nums text-slate-300">
                {reviewCapacity} / {maxReview}
                {maxReview > REVIEW_CAPACITY && <span className="ml-1 text-emerald-400">🔧</span>}
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-700">
              <div
                className="h-full rounded-full bg-emerald-400"
                style={{ width: `${(Math.max(0, reviewCapacity) / maxReview) * 100}%` }}
              />
            </div>
          </div>
          <div className="rounded-xl bg-slate-800/40 px-3 py-2 text-center">
            <div className="text-xs text-slate-300">
              <RichText text="{{仕掛り}}" />
            </div>
            <div className="tabular-nums text-sm text-slate-200">
              {inProgress.length}/{wipMax}
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
        <Column
          title="In Progress（着手中）"
          tone="text-amber-200"
          headerBg="bg-amber-500/10"
          count={inProgress.length}
        >
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
                          <RichText text="浅い：DoDを妥協（速いが負債）" interactive={false} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPending({ id, depth: 'thorough' })
                            setDepthFor(null)
                          }}
                          className="flex-1 rounded-lg bg-emerald-600 px-2 py-1.5 text-xs font-semibold text-slate-100 transition hover:bg-emerald-500 active:scale-95"
                        >
                          <RichText text="深い：{{完成の定義}}を満たす（テスト/品質）" interactive={false} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDepthFor(id)}
                        disabled={!reviewable}
                        title={
                          !reviewable && reviewCapacity <= 0 ? 'レビュー容量切れ（次スプリントで回復）' : undefined
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
          {inProgress.length === 0 && <Empty />}
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
                    title="浅いレビューで通した＝完成の定義(DoD)を妥協した Ship。後で負債の取り立てが来る。"
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
            <RichText text="{{スコープ再交渉}}" interactive={false} />）
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
  return (
    <p className="flex flex-1 items-center justify-center px-1 py-4 text-xs text-slate-500 lg:min-h-[80px]">— なし —</p>
  )
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
              <span>{item ? <RichText text={item.title} interactive={false} /> : id}</span>
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
