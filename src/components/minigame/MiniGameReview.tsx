import { useEffect, useRef, useState } from 'react'
import { type DiffLine, dealReview, type ReviewFlag, type ReviewRound, scoreReview } from '../../data/minigames'
import type { ExecTier } from '../../types'
import { SelectableCheckItem } from './SelectableCheckItem'
import { useGlyphSelection } from './useGlyphSelection'

interface Props {
  seed: number
  onResolve: (tier: ExecTier) => void
}

interface RevealedRowProps {
  option: ReviewFlag
  picked: boolean
}

/** 答え合わせフェーズの1行。選択フェーズとは完全に別の表示ロジックを持つため分離する。 */
function RevealedRow({ option, picked }: RevealedRowProps) {
  const mark = option.issue ? (picked ? '✓ 的確' : '! 見逃し') : picked ? '✗ 空振り' : '— 不要'
  const cellStyle = option.issue
    ? picked
      ? 'border-emerald-400/60 bg-emerald-500/10 text-[var(--text)]'
      : 'border-amber-400/60 bg-amber-500/10 text-[var(--text)]'
    : picked
      ? 'border-rose-400/50 bg-rose-500/10 text-[var(--text-body)]'
      : 'border-[var(--panel)] bg-[var(--panel)]/20 text-[var(--text-disabled)]'
  return (
    <li className={`rounded-xl border px-4 py-2.5 text-sm ${cellStyle}`}>
      <span className="mr-2 text-[11px] font-bold">{mark}</span>
      {option.text}
    </li>
  )
}

/** レビュー・ミニゲーム：AI が書いた差分を点検し、人が拾うべき指摘を選ぶ（AI時代の人間レビュー）。
 *  選択 → 答え合わせ（拾えた/見逃し/空振り＋気づき）→ 確定、の2段。LGTM（0件）も"出せる"。 */
export function MiniGameReview({ seed, onResolve }: Props) {
  const [round] = useState<ReviewRound>(() => dealReview(seed))
  const [picked, setPicked] = useState<number[]>([])
  const [tier, setTier] = useState<ExecTier | null>(null) // null＝選択中、確定後は答え合わせ表示

  const { touchedRef, unpopKey, registerToggle } = useGlyphSelection()

  const revealed = tier !== null
  const n = picked.length

  // 答え合わせ表示に切り替わった際、「確定する」ボタンへフォーカスを移す
  const confirmRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (revealed) confirmRef.current?.focus()
  }, [revealed])

  const toggle = (i: number) => {
    // 上限なし：0件(LGTM)含む任意件数を選べる
    const has = picked.includes(i)
    registerToggle(i, has)
    setPicked((p) => (has ? p.filter((x) => x !== i) : [...p, i]))
  }
  const submit = () => setTier(scoreReview(picked.map((i) => round.options[i])))

  return (
    <div className="space-y-3">
      <p className="text-sm text-[var(--text-body)]">
        AIが書いた差分を点検する。{' '}
        <span className="text-[var(--text-sub)]">人が拾うべき指摘を選ぶ（複数可・無ければLGTM）</span>
      </p>

      {/* AI に頼んだこと */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)]/40 px-3 py-2 text-xs">
        <span className="font-semibold text-[var(--text-sub)]">頼んだこと：</span>
        <span className="text-[var(--text-body)]">{round.task}</span>
      </div>

      {/* AI が書いた差分 */}
      <DiffView diff={round.diff} />

      {/* AI の自己申告（過信を誘うメモ）— text-sky-400 は意味色（AIを示す色）として保持 */}
      <p className="rounded-lg bg-[var(--panel)]/40 px-3 py-1.5 text-xs text-[var(--text-sub)]">
        <span className="font-semibold text-sky-400">🤖 AI：</span> {round.aiNote}
      </p>

      {/* 点検項目 */}
      <ul className="space-y-2">
        {round.options.map((o, i) => {
          const on = picked.includes(i)
          if (revealed) {
            return <RevealedRow key={o.text} option={o} picked={on} />
          }
          return (
            <li key={o.text}>
              <SelectableCheckItem
                itemKey={`r-${i}`}
                on={on}
                wasTouched={touchedRef.current.has(i)}
                unpopSeq={unpopKey[i] ?? 0}
                onToggle={() => toggle(i)}
                initialFocus={i === 0}
              >
                {o.text}
              </SelectableCheckItem>
            </li>
          )
        })}
      </ul>

      {revealed ? (
        <>
          {/* 気づきは学習ポイント（意味色なし・情報色）なので amber-500/sky はそのまま amber に統一 */}
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-[var(--text-body)]">
            <span className="font-semibold text-amber-300">気づき：</span> {round.takeaway}
          </p>
          <button
            ref={confirmRef}
            type="button"
            onClick={() => onResolve(tier)}
            data-initial-focus
            className="min-h-[44px] w-full rounded-xl bg-[var(--accent)] py-3 font-bold text-[var(--bg)] transition hover:bg-[var(--accent-hover)] active:scale-95"
          >
            確定する
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={submit}
          className="min-h-[44px] w-full rounded-xl bg-[var(--accent)] py-3 font-bold text-[var(--bg)] transition hover:bg-[var(--accent-hover)] active:scale-95"
        >
          {n === 0 ? '問題なし（LGTM）として出す' : `${n}件 指摘してレビューを出す`}
        </button>
      )}
    </div>
  )
}

/** AI が書いた差分の表示（add=緑/del=赤取り消し/ctx=灰）。等幅で読みやすく。 */
function DiffView({ diff }: { diff: DiffLine[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--bg-deep)]/60 p-2.5 font-mono text-[11px] leading-relaxed">
      {diff.map((l, i) => {
        const sign = l.tag === 'add' ? '+' : l.tag === 'del' ? '-' : ' '
        const tone =
          l.tag === 'add'
            ? 'text-emerald-300'
            : l.tag === 'del'
              ? 'text-rose-300 line-through decoration-rose-400/40'
              : 'text-[var(--border-strong)]'
        return (
          <div key={`${i}-${l.text}`} className={`whitespace-pre ${tone}`}>
            <span className="mr-2 select-none opacity-70" aria-hidden="true">
              {sign}
            </span>
            {l.text}
          </div>
        )
      })}
    </div>
  )
}
