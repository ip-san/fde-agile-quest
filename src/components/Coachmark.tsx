import { COACHMARKS } from '../data/coachmarkContent'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { RichText } from './RichText'

interface Props {
  /** 表示するコーチマークのキー（本文 COACHMARKS はこの遅延チャンク側で引く＝初期バンドルを軽く保つ） */
  coachKey: string
  onClose: () => void
}

/** 都度教示：初めてそのセレモニー/場面に来た時に1度だけ出す短いコーチング。
 *  「今この場面で何をするか」を一拍で伝え、「分かった」で閉じて既読化する（Board が localStorage 管理）。 */
export function Coachmark({ coachKey, onClose }: Props) {
  const ref = useFocusTrap<HTMLDivElement>(onClose)
  const coach = COACHMARKS[coachKey]
  if (!coach) return null
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 px-safe pt-safe pb-safe backdrop-blur-sm sm:items-center">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="coach-title"
        className="w-full max-w-md rounded-t-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-2xl sm:rounded-2xl"
      >
        <div className="mb-2 flex items-center gap-2">
          <span aria-hidden="true" className="text-lg">
            💡
          </span>
          <h2 id="coach-title" className="text-base font-bold text-[var(--text)]">
            {coach.title}
          </h2>
          <span className="ml-auto rounded bg-[var(--panel)] px-2 py-0.5 text-[10px] text-[var(--text-sub)]">
            遊び方
          </span>
        </div>
        <p className="text-sm leading-relaxed text-[var(--text-body)]">
          <RichText text={coach.body} />
        </p>
        <button
          type="button"
          onClick={onClose}
          data-focus-return
          className="mt-4 min-h-[44px] w-full rounded-xl bg-[var(--accent)] py-3 font-bold text-[var(--bg-deep)] transition hover:bg-[var(--accent-hover)] active:scale-95"
        >
          分かった
        </button>
        <p className="mt-2 text-center text-[10px] text-[var(--text-sub)]">
          あとで下部メニュー「遊び方」からいつでも見返せます
        </p>
      </div>
    </div>
  )
}
