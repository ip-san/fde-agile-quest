import { type HearingTheme, hearingTitleFor } from '../../data/minigames'
import { useFocusTrap } from '../../hooks/useFocusTrap'
import type { ExecTier, MiniGameKind } from '../../types'
import { MiniGameDev } from './MiniGameDev'
import { MiniGameHearing } from './MiniGameHearing'
import { MiniGameReview } from './MiniGameReview'

interface Props {
  kind: MiniGameKind
  seed: number
  /** ヒアリングの問いを相手・場面で変えるテーマ（hearing のみ使用） */
  theme?: HearingTheme
  /** イベント固有のヒアリング問い（hearing のみ使用。あればシャッフルして優先提示） */
  hearingOptions?: { text: string; good: boolean }[]
  onDone: (tier: ExecTier) => void
  onSkip: () => void
}

const HEADING: Record<MiniGameKind, { tag: string; title: string }> = {
  dev: { tag: '実行：開発', title: '手を動かす' },
  // title は hearingTitleFor(theme) で必ず上書きされるため空文字（デフォルト値は使われない）
  hearing: { tag: '実行：ヒアリング', title: '' },
  review: { tag: '実行：レビュー', title: 'AIの差分を点検する' },
}

/** 選択後に挟む「実行」ミニゲーム。出来が選択の主正メーターを倍率調整する。Esc/スキップで標準(good)。 */
export function MiniGame({ kind, seed, theme, hearingOptions, onDone, onSkip }: Props) {
  const ref = useFocusTrap<HTMLDivElement>(onSkip)
  // ヒアリングは相手・場面（テーマ）で見出しを出し分ける（“現場”固定を回避）。
  const h = kind === 'hearing' ? { ...HEADING.hearing, title: hearingTitleFor(theme) } : HEADING[kind]

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:px-safe sm:pt-safe sm:pb-safe">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={`${h.tag}：${h.title}`}
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-slate-700 bg-slate-900 shadow-2xl sm:max-h-[90vh] sm:rounded-2xl"
      >
        <header className="flex items-center justify-between gap-2 border-b border-slate-800 px-5 py-3">
          <div>
            <p className="text-[11px] font-semibold tracking-wide text-sky-400">{h.tag}</p>
            <h2 className="text-base font-bold text-slate-100">{h.title}</h2>
          </div>
          <button
            type="button"
            onClick={onSkip}
            className="inline-flex min-h-[44px] shrink-0 items-center rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-400 transition hover:bg-slate-800"
          >
            スキップ
          </button>
        </header>

        <div className="px-5 pt-4 pb-safe">
          {kind === 'dev' ? (
            <MiniGameDev seed={seed} onResolve={onDone} />
          ) : kind === 'review' ? (
            <MiniGameReview seed={seed} onResolve={onDone} />
          ) : (
            <MiniGameHearing seed={seed} theme={theme} hearingOptions={hearingOptions} onResolve={onDone} />
          )}
          <p className="mt-3 text-center text-xs text-slate-400">
            ※ 出来が、選んだ判断の伸びを上下させる（スキップ＝標準）
          </p>
        </div>
      </div>
    </div>
  )
}
