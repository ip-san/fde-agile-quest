import { useFocusTrap } from '../../hooks/useFocusTrap'
import type { ExecTier, MiniGameKind } from '../../types'
import { MiniGameDev } from './MiniGameDev'
import { MiniGameHearing } from './MiniGameHearing'

interface Props {
  kind: MiniGameKind
  seed: number
  onDone: (tier: ExecTier) => void
  onSkip: () => void
}

const HEADING: Record<MiniGameKind, { tag: string; title: string }> = {
  dev: { tag: '実行：開発', title: '手を動かす' },
  hearing: { tag: '実行：ヒアリング', title: '現場の声を掘る' },
}

/** 選択後に挟む「実行」ミニゲーム。出来が選択の主正メーターを倍率調整する。Esc/スキップで標準(good)。 */
export function MiniGame({ kind, seed, onDone, onSkip }: Props) {
  const ref = useFocusTrap<HTMLDivElement>(onSkip)
  const h = HEADING[kind]

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={`${h.tag}：${h.title}`}
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"
      >
        <header className="flex items-center justify-between gap-2 border-b border-slate-800 px-5 py-3">
          <div>
            <p className="text-[11px] font-semibold tracking-wide text-sky-400">{h.tag}</p>
            <h2 className="text-base font-bold text-slate-100">{h.title}</h2>
          </div>
          <button
            type="button"
            onClick={onSkip}
            className="shrink-0 rounded-lg border border-slate-700 px-2.5 py-1 text-xs text-slate-400 transition hover:bg-slate-800"
          >
            スキップ
          </button>
        </header>

        <div className="px-5 py-4">
          {kind === 'dev' ? (
            <MiniGameDev seed={seed} onResolve={onDone} />
          ) : (
            <MiniGameHearing seed={seed} onResolve={onDone} />
          )}
          <p className="mt-3 text-center text-[11px] text-slate-400">
            ※ 出来が、選んだ判断の伸びを上下させる（スキップ＝標準）
          </p>
        </div>
      </div>
    </div>
  )
}
