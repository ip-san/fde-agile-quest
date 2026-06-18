import { useEffect, useState } from 'react'
import { SPRINTS } from '../data/chapters/chapter-01'
import {
  backlogItem,
  forecastPoints,
  type ProposalVerdict,
  reviewBacklogProposal,
  sprintCapacity,
} from '../engine/backlog'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { useEngagement } from '../store/engagementStore'
import { RichText } from './RichText'

interface Props {
  onClose: () => void
}

type ItemState = 'done' | 'forecast' | 'todo'

const sameOrder = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i])

/** プロダクト/スプリント バックログの操作パネル。
 *  - 優先順位の所有は PO（プロダクトオーナー）。プレイヤーは“提案”を組み立て、プランニングで PO に諮る。
 *    PO は「今スプリントのゴールに直結する項目を最優先」に審査し、承認 or 補正する。
 *  - プランニング中のみ、上位から今スプリントの「予測（フォーキャスト）」に出し入れできる。
 *  - 容量超過はブロックせず警告（レビューのキャリーオーバーで学ぶ）。 */
export function BacklogPanel({ onClose }: Props) {
  const ref = useFocusTrap<HTMLDivElement>(onClose)
  const {
    sprintIndex,
    beatIndex,
    backlogOrder,
    sprintForecast,
    backlogDone,
    velocity,
    commitBacklogOrder,
    toggleForecast,
  } = useEngagement()

  const isPlanning = SPRINTS[sprintIndex]?.beats[beatIndex] === 'planning'
  const capacity = sprintCapacity({ sprintIndex, velocity })
  const fpts = forecastPoints({ sprintForecast })
  const over = fpts > capacity

  const doneSet = new Set(backlogDone)
  const forecastSet = new Set(sprintForecast)
  const stateOf = (id: string): ItemState => (doneSet.has(id) ? 'done' : forecastSet.has(id) ? 'forecast' : 'todo')

  // PO が確定した公式順のうち、未完了（並べ替え対象）と完了済み（末尾固定表示）に分ける
  const officialActive = backlogOrder.filter((id) => !doneSet.has(id))
  const doneList = backlogOrder.filter((id) => doneSet.has(id))

  // 編集中の“提案”ドラフト（未完了のみ）。公式順が変わったら同期する
  const [draft, setDraft] = useState<string[]>(officialActive)
  const [verdict, setVerdict] = useState<ProposalVerdict | null>(null)
  useEffect(() => {
    setDraft(officialActive)
    // backlogOrder 同一性で同期（確定・周回更新時）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backlogOrder])

  const dirty = !sameOrder(draft, officialActive)

  const move = (id: string, dir: -1 | 1) => {
    setVerdict(null) // 編集したら直前の PO 回答は消す
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
    commitBacklogOrder(v.order) // PO が確定した順を公式に
    setVerdict(v)
  }

  // 表示は「提案ドラフト（未完了）→ 完了済み」の順
  const rows = [...draft, ...doneList]

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
            <span aria-hidden="true">📋</span> バックログ
          </h2>
          <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
            Sprint {SPRINTS[Math.min(sprintIndex, SPRINTS.length - 1)]?.n}
          </span>
        </header>

        <div className="space-y-3 overflow-y-auto px-5 py-4">
          <p className="text-xs leading-relaxed text-slate-400">
            <RichText text="{{プロダクトバックログ}}は価値順に並んだ“やりたいこと”の唯一のリスト。並べ替え（優先順位）の最終責任はPOにある。あなたは並びを“提案”し、プランニングでPOに諮る。POは{{スプリントゴール}}に直結する項目を最優先に審査する。上位から容量の範囲で{{フォーキャスト}}しよう。" />
          </p>

          {/* 容量メーター（プランニング中のみ操作の文脈になる） */}
          <div
            className={`rounded-xl px-3 py-2.5 ${over ? 'bg-rose-500/10 ring-1 ring-rose-500/40' : 'bg-slate-800/40'}`}
          >
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-slate-300">
                🧮 今スプリントの予測 / <RichText text="{{キャパシティ}}" />
              </span>
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
            <p className="mt-1 text-xs text-slate-500">
              {over ? (
                <span className="text-rose-300">
                  容量オーバー。欲張ると終わらず、レビューで持ち越し（キャリーオーバー）になる。
                </span>
              ) : isPlanning ? (
                '上から順に、ゴールに効くものを容量の範囲で選ぶ。'
              ) : (
                'プランニングのときに予測を組み立てられる。'
              )}
            </p>
          </div>

          {/* ベロシティ推移（ノルマではなく見通しの物差し） */}
          {velocity.some((v) => v > 0) && (
            <div className="rounded-xl bg-slate-800/40 px-3 py-2.5">
              <div className="mb-1 text-xs text-slate-300">
                📈 <RichText text="{{ベロシティ}}" />
                （完了pt）
              </div>
              <div className="flex items-end gap-2">
                {SPRINTS.map((sp, i) => {
                  const v = velocity[i] ?? 0
                  const max = Math.max(1, ...velocity)
                  return (
                    <div key={sp.n} className="flex flex-1 flex-col items-center gap-1">
                      <div className="flex h-12 w-full items-end justify-center">
                        <div
                          className="w-5 rounded-t bg-emerald-400/70"
                          style={{ height: `${v ? Math.max(8, (v / max) * 100) : 0}%` }}
                        />
                      </div>
                      <span className="tabular-nums text-[10px] text-slate-400">S{sp.n}</span>
                      <span className="tabular-nums text-[10px] text-slate-500">{v || '—'}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* プロダクトバックログ（提案ドラフトの順） */}
          <ul className="space-y-1.5">
            {rows.map((id, idx) => {
              const item = backlogItem(id)
              if (!item) return null
              const st = stateOf(id)
              const draftPos = draft.indexOf(id) // 完了済みは -1（並べ替え対象外）
              return (
                <li
                  key={id}
                  className={`rounded-xl border px-3 py-2 ${
                    st === 'done'
                      ? 'border-slate-800 bg-slate-800/20 opacity-70'
                      : st === 'forecast'
                        ? 'border-sky-500/40 bg-sky-500/10'
                        : 'border-slate-700 bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {/* 並べ替え＝“提案”の編集（プランニング中・未完了のみ） */}
                    {isPlanning && st !== 'done' ? (
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
                      <span className="w-5 shrink-0 pt-0.5 text-center text-xs tabular-nums text-slate-600">
                        {idx + 1}
                      </span>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="shrink-0 rounded bg-slate-700 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-slate-300">
                          {item.estimate}pt
                        </span>
                        <StateBadge state={st} />
                      </div>
                      <p className={`mt-1 text-sm ${st === 'done' ? 'text-slate-400 line-through' : 'text-slate-100'}`}>
                        <RichText text={item.title} />
                      </p>
                      {item.detail && (
                        <p className="mt-0.5 text-xs leading-snug text-slate-500">
                          <RichText text={item.detail} />
                        </p>
                      )}
                    </div>

                    {/* 予測への出し入れ（プランニング中・未done のみ） */}
                    {isPlanning && st !== 'done' && (
                      <button
                        type="button"
                        onClick={() => toggleForecast(id)}
                        className={`shrink-0 self-center rounded-lg px-2.5 py-1.5 text-xs font-semibold transition active:scale-95 ${
                          st === 'forecast'
                            ? 'bg-sky-500 text-slate-950 hover:bg-sky-400'
                            : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                        }`}
                      >
                        {st === 'forecast' ? '✓ 予測' : '＋ 入れる'}
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>

          {/* PO への提案（プランニング中のみ）。所有は PO ＝ 承認/補正で確定する */}
          {isPlanning && (
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
                  className="flex-1 rounded-lg bg-amber-500/90 py-2 text-sm font-bold text-slate-950 transition hover:bg-amber-400 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500"
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
              <p className="text-[11px] leading-snug text-slate-500">
                ↑↓で並びを提案し、POに諮る。POはゴールに直結する項目を最優先に審査し、承認または補正する。
              </p>
            </div>
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

function StateBadge({ state }: { state: ItemState }) {
  if (state === 'done')
    return (
      <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">✓ 完了</span>
    )
  if (state === 'forecast')
    return <span className="rounded bg-sky-500/20 px-1.5 py-0.5 text-[10px] font-bold text-sky-300">今スプリント</span>
  return <span className="rounded bg-slate-700/60 px-1.5 py-0.5 text-[10px] text-slate-400">未着手</span>
}
