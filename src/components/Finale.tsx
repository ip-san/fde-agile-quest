import { FINALE } from '../data/chapters/chapter-01'
import { endingImage, imageUrl } from '../data/images'
import type { GameFlag } from '../types'
import { RichText } from './RichText'

interface Props {
  /** 選んだ選択肢のフラグで結末を確定する */
  onResolve: (flag: GameFlag) => void
}

/** 不正暴露アークのフィナーレ「暴露の決断」。手がかり(fraudClue)を掴んで完走した周回でのみ、
 *  通常エンディングの前に提示される。3択がそれぞれ専用エンディングへ分岐する。 */
export function Finale({ onResolve }: Props) {
  const imgKey = endingImage('finale')
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-6 px-4 py-10">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">FINALE — 暴露の決断</p>
        <h1 className="mt-2 text-2xl font-bold text-amber-200">不正の証拠が、手の中にある</h1>
      </div>

      {/* 決断の情景画像（実写ドキュメンタリー風・あれば）。未登録なら枠ごと出さない。 */}
      {imgKey && (
        <img
          src={imageUrl(imgKey)}
          alt=""
          className="h-40 w-full rounded-2xl object-cover sm:h-56"
          onError={(e) => {
            e.currentTarget.style.display = 'none'
          }}
        />
      )}

      <p className="rounded-2xl border border-amber-500/40 bg-amber-950/20 p-5 text-sm leading-relaxed text-[var(--text-body)]">
        <RichText text={FINALE.prompt} />
      </p>

      <div className="space-y-2.5">
        {FINALE.choices.map((c, i) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onResolve(c.flag)}
            autoFocus={i === 0}
            className={`block w-full rounded-xl border px-4 py-3 text-left text-sm font-medium transition active:scale-95 ${
              c.warn
                ? 'border-rose-500/40 bg-rose-950/20 text-[var(--text-body)] hover:border-rose-400 hover:bg-rose-950/40'
                : 'border-amber-500/50 bg-amber-950/20 text-[var(--text-body)] hover:border-amber-400 hover:bg-amber-900/40'
            }`}
          >
            {c.warn && <span className="mr-1">⚠</span>}
            {c.label}
          </button>
        ))}
      </div>

      <p className="text-center text-[11px] text-[var(--text-sub)]">※ ここでの選択が、この物語の結末になる。</p>
    </div>
  )
}
