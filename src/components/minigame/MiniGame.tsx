import { type HearingOption, type HearingTheme, hearingTitleFor, PERSUADE_DECK } from '../../data/minigames'
import { useFocusTrap } from '../../hooks/useFocusTrap'
import type { ExecTier, MiniGameKind } from '../../types'
import { MiniGameDev } from './MiniGameDev'
import { MiniGameHearing } from './MiniGameHearing'
import { MiniGameReview } from './MiniGameReview'

interface Props {
  kind: MiniGameKind
  seed: number
  /** レビュー対象 PBI の id（review のみ使用）。あればタスク内容に一致する作問を出す。 */
  pbiId?: string
  /** 再レビュー／同じ親PBIの別作業項目など“2回目以降”か（review のみ）。true なら題材一致を避けて別の作問を出す。 */
  reviewVariety?: boolean
  /** ヒアリングの問いを相手・場面で変えるテーマ（hearing のみ使用） */
  theme?: HearingTheme
  /** イベント固有のヒアリング問い（hearing のみ使用。あればシャッフルして優先提示） */
  hearingOptions?: HearingOption[]
  onDone: (tier: ExecTier) => void
  onSkip: () => void
}

const HEADING: Record<'dev' | 'review', { tag: string; title: string }> = {
  dev: { tag: '実行：開発', title: '手を動かす' },
  review: { tag: '実行：レビュー', title: 'AIの差分を点検する' },
}

function buildHeading(kind: MiniGameKind, theme?: HearingTheme): { tag: string; title: string } {
  if (kind === 'hearing') {
    return { tag: '実行：ヒアリング', title: hearingTitleFor(theme) }
  }
  if (kind === 'persuade') {
    return { tag: '実行：交渉', title: hearingTitleFor('persuade') }
  }
  return HEADING[kind]
}

/** 選択後に挟む「実行」ミニゲーム。出来が選択の主正メーターを倍率調整する。Esc/スキップで標準(good)。 */
export function MiniGame({ kind, seed, pbiId, reviewVariety, theme, hearingOptions, onDone, onSkip }: Props) {
  const ref = useFocusTrap<HTMLDivElement>(onSkip)
  const h = buildHeading(kind, theme)

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:px-safe sm:pt-safe sm:pb-safe">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={`${h.tag}：${h.title}`}
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl sm:max-h-[90vh] sm:rounded-2xl"
      >
        <header className="flex items-center justify-between gap-2 border-b border-[var(--panel)] px-5 py-3">
          <div>
            <p className="text-[11px] font-semibold tracking-wide text-amber-400">{h.tag}</p>
            <h2 className="text-base font-bold text-[var(--text)]">{h.title}</h2>
          </div>
          <button
            type="button"
            onClick={onSkip}
            className="inline-flex min-h-[44px] shrink-0 items-center rounded-lg border border-[var(--border)] px-3 py-2 text-xs text-[var(--text-sub)] transition hover:bg-[var(--panel)]"
          >
            スキップ
          </button>
        </header>

        <div className="px-5 pt-4 pb-safe">
          {kind === 'dev' ? (
            <MiniGameDev seed={seed} onResolve={onDone} />
          ) : kind === 'review' ? (
            <MiniGameReview seed={seed} pbiId={pbiId} variety={reviewVariety} onResolve={onDone} />
          ) : kind === 'persuade' ? (
            // PO 説得＝ヒアリングの選択機構を流用し、価値の論拠デッキ(PERSUADE_DECK)を出す
            <MiniGameHearing seed={seed} theme="persuade" hearingOptions={PERSUADE_DECK} onResolve={onDone} />
          ) : (
            <MiniGameHearing seed={seed} theme={theme} hearingOptions={hearingOptions} onResolve={onDone} />
          )}
          <p className="mt-3 text-center text-xs text-[var(--text-sub)]">
            ※ 出来が、選んだ判断の伸びを上下させる（スキップ＝標準）
          </p>
        </div>
      </div>
    </div>
  )
}
