import { useState } from 'react'
import { CAST, PROLOGUE_PANELS } from '../data/chapters/chapter-01/cast'
import { useFocusTrap } from '../hooks/useFocusTrap'

interface Props {
  onClose: () => void
}

const SIDE_LABEL: Record<string, string> = {
  lumen: 'ルーメン（主人公の会社）',
  cargo: 'カルゴ物流（顧客）',
  mentor: '導き手',
}

/** オープニング。SaaSベンダーのエンジニアが“第一号のFDE”として物流現場へ潜入する導入。
 *  パネルを順に送り、最後に登場人物を見せてからゲーム本編へ。Esc でスキップ可能。 */
export function Prologue({ onClose }: Props) {
  // index 0..panels-1 がパネル、panels が登場人物ページ
  const [step, setStep] = useState(0)
  const ref = useFocusTrap<HTMLDivElement>(onClose)
  const lastPanel = PROLOGUE_PANELS.length - 1
  const onCast = step === PROLOGUE_PANELS.length

  const next = () => setStep((s) => Math.min(s + 1, PROLOGUE_PANELS.length))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 p-4 backdrop-blur-sm">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label="プロローグ"
        className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"
      >
        <div className="space-y-4 px-6 py-6">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold tracking-wide text-sky-400">
              PROLOGUE ── 第1章「沈黙する基幹システム」
            </p>
            {!onCast && (
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-lg border border-slate-700 px-2.5 py-1 text-xs text-slate-400 transition hover:bg-slate-800"
              >
                スキップ
              </button>
            )}
          </div>

          {!onCast ? (
            <article className="space-y-3">
              <h1 className="text-lg font-bold text-slate-100">{PROLOGUE_PANELS[step].heading}</h1>
              <p className="text-[15px] leading-relaxed text-slate-200">
                {PROLOGUE_PANELS[step].body}
              </p>
              <div className="flex items-center gap-1.5 pt-1" aria-hidden="true">
                {PROLOGUE_PANELS.map((p, i) => (
                  <span
                    key={p.heading}
                    className={`h-1.5 rounded-full transition-all ${
                      i === step ? 'w-6 bg-sky-400' : 'w-1.5 bg-slate-700'
                    }`}
                  />
                ))}
              </div>
            </article>
          ) : (
            <section className="space-y-3">
              <h1 className="text-lg font-bold text-slate-100">登場人物</h1>
              <p className="text-xs text-slate-400">
                この物語で何度も顔を合わせる相手。彼らとの距離が、3つのメーターになる。
              </p>
              <ul className="space-y-2">
                {CAST.map((c) => (
                  <li key={c.id} className="rounded-xl border border-slate-700 bg-slate-800/40 px-3 py-2">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="text-sm font-bold text-slate-100">{c.name}</span>
                      <span className="text-[11px] text-sky-300">{c.role}</span>
                      <span className="ml-auto rounded bg-slate-950/50 px-1.5 py-0.5 text-[10px] text-slate-400">
                        {SIDE_LABEL[c.side]}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-slate-300">{c.blurb}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            {onCast ? (
              <button
                type="button"
                onClick={onClose}
                data-initial-focus
                className="rounded-xl bg-sky-500 px-6 py-2.5 font-bold text-slate-950 transition hover:bg-sky-400 active:scale-95"
              >
                現場に立つ（はじめる）
              </button>
            ) : (
              <button
                type="button"
                onClick={next}
                data-initial-focus
                className="rounded-xl bg-sky-500 px-6 py-2.5 font-bold text-slate-950 transition hover:bg-sky-400 active:scale-95"
              >
                {step === lastPanel ? '登場人物を見る' : '次へ（Enter）'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
