import { useEffect, useState } from 'react'
import { ACTION_LABELS, SEGMENT_COLORS, SEGMENT_LABELS } from '../data/chapters/chapter-01'
import { sfxReveal } from '../engine/sfx'
import { useFocusTrap } from '../hooks/useFocusTrap'
import type { DeductionOption, GameEvent } from '../types'
import { DecisiveFlash } from './DecisiveFlash'
import { RichText } from './RichText'

interface Props {
  event: GameEvent
  /** 推理を解決して選択へ進む。correct＝本音を見抜けたか */
  onResolve: (correct: boolean) => void
}

/**
 * 選択の前の「現場の本音を見抜く」推理ステップ。
 * 建前・ノイズに紛れた本音（真の制約）を1つ当てる＝逆転裁判の“見抜く/突きつける”快感の移植。
 * 当てると決定的瞬間の演出＋本音ヒント開示、外すとミス演出。どちらも選択へは進める（行き止まりにしない）。
 */
export function DeductionModal({ event, onResolve }: Props) {
  const d = event.deduction
  const [picked, setPicked] = useState<DeductionOption | null>(null)
  const ref = useFocusTrap<HTMLDivElement>()
  const correct = !!picked?.truth

  // 推理が無いイベントに誤って表示された場合は素通り（防御的）。
  useEffect(() => {
    if (!d) onResolve(false)
  }, [d, onResolve])

  // 解答した瞬間に決定的瞬間の音（当たり＝突き上げる一撃／外し＝下降）。
  // biome-ignore lint/correctness/useExhaustiveDependencies: 解答（picked）が確定した一度だけ鳴らす
  useEffect(() => {
    if (picked) sfxReveal(correct ? 'impact' : 'bad')
  }, [picked])

  if (!d) return null

  const titleId = `deduction-title-${event.id}`
  const flashColor = picked ? (correct ? '#fbbf24' : '#fb7185') : null

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:px-safe sm:pt-safe sm:pb-safe">
      {/* 見抜いた瞬間の閃光。key を解答ごとに変えてアニメを再生させる。 */}
      <DecisiveFlash key={picked?.id ?? 'none'} color={flashColor} />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-slate-700 bg-slate-900 shadow-2xl sm:max-h-[90vh] sm:rounded-2xl"
      >
        <header
          className="flex flex-wrap items-center gap-2 rounded-t-2xl px-5 py-3"
          style={{ backgroundColor: `${SEGMENT_COLORS[event.segment]}22` }}
        >
          <span className="rounded-full bg-slate-950/60 px-2.5 py-0.5 text-xs font-bold text-slate-200">
            {ACTION_LABELS[event.ceremony]}
          </span>
          <span
            className="rounded-full px-2.5 py-0.5 text-xs font-bold text-slate-950"
            style={{ backgroundColor: SEGMENT_COLORS[event.segment] }}
          >
            {SEGMENT_LABELS[event.segment]}
          </span>
          <span className="rounded-full bg-amber-400/20 px-2.5 py-0.5 text-xs font-bold text-amber-200">
            <span aria-hidden="true">🔍</span> 推理
          </span>
          <h2 id={titleId} className="w-full text-base font-bold text-slate-100">
            {event.title}
          </h2>
        </header>

        <div className="space-y-4 px-5 pt-4 pb-safe">
          <p className="text-sm leading-relaxed text-slate-200">
            <RichText text={event.narrative} />
          </p>

          <div className="rounded-lg bg-amber-500/10 px-3 py-2">
            <p className="text-sm font-semibold text-amber-200">
              <RichText text={d.prompt} />
            </p>
          </div>

          {!picked ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-400">どれが現場の本音だ？</p>
              {d.options.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setPicked(o)}
                  className="group block w-full rounded-xl border border-slate-700 bg-slate-800/40 px-4 py-3 text-left transition hover:border-amber-400 hover:bg-slate-800"
                >
                  <span className="block text-sm font-medium text-slate-100">
                    <RichText text={o.text} interactive={false} />
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {/* 当たり＝見抜いた！／外し＝読み違い。どちらも選択へは進む。 */}
              <div
                className={`rounded-xl border px-4 py-3 ${
                  correct ? 'border-amber-500/60 bg-amber-500/10' : 'border-rose-500/50 bg-rose-500/10'
                }`}
              >
                <p className={`text-sm font-bold ${correct ? 'text-amber-200' : 'text-rose-200'}`}>
                  {correct ? (
                    <>
                      <span aria-hidden="true">🔍</span> 見抜いた！
                    </>
                  ) : (
                    '— 読み違えた'
                  )}
                </p>
                <p className="mt-1 text-sm text-slate-200">
                  {correct ? (
                    <RichText text={d.reveal} />
                  ) : (
                    <RichText text={picked.miss ?? '本音は別にあった。手探りのまま判断するしかない。'} />
                  )}
                </p>
                {!correct && (
                  <p className="mt-1.5 text-xs text-slate-400">
                    （本音を外すと、現場の核心が見えないまま選ぶことになる）
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => onResolve(correct)}
                data-initial-focus
                className="w-full rounded-xl bg-sky-500 py-3 font-bold text-slate-950 transition hover:bg-sky-400 active:scale-95"
              >
                判断へ進む（Enter）
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
