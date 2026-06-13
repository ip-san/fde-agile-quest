import { FINALE } from '../data/chapters/chapter-01'
import type { GameFlag } from '../types'

interface Props {
  /** 選んだ選択肢のフラグで結末を確定する */
  onResolve: (flag: GameFlag) => void
}

/** 不正暴露アークのフィナーレ「暴露の決断」。手がかり(fraudClue)を掴んで完走した周回でのみ、
 *  通常エンディングの前に提示される。3択がそれぞれ専用エンディングへ分岐する。 */
export function Finale({ onResolve }: Props) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-6 px-4 py-10">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">
          FINALE — 暴露の決断
        </p>
        <h1 className="mt-2 text-2xl font-bold text-amber-200">不正の証拠が、手の中にある</h1>
      </div>

      <p className="rounded-2xl border border-amber-500/40 bg-amber-950/20 p-5 text-sm leading-relaxed text-slate-100">
        {FINALE.prompt}
      </p>

      <div className="space-y-2.5">
        {FINALE.choices.map((c, i) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onResolve(c.flag)}
            // biome-ignore lint/a11y/noAutofocus: フィナーレ単独画面の初期フォーカス
            autoFocus={i === 0}
            className={`block w-full rounded-xl border px-4 py-3 text-left text-sm font-medium transition active:scale-95 ${
              c.warn
                ? 'border-rose-500/40 bg-rose-950/20 text-slate-100 hover:border-rose-400 hover:bg-rose-950/40'
                : 'border-sky-500/50 bg-sky-950/20 text-slate-100 hover:border-sky-400 hover:bg-sky-900/40'
            }`}
          >
            {c.warn && <span className="mr-1">⚠</span>}
            {c.label}
          </button>
        ))}
      </div>

      <p className="text-center text-[11px] text-slate-400">
        ※ ここでの選択が、この物語の結末になる。
      </p>
    </div>
  )
}
