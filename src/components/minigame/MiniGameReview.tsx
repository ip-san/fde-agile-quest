import { useEffect, useRef, useState } from 'react'
import { type DiffLine, dealReview, type ReviewFlag, type ReviewRound, scoreReview } from '../../data/minigames'
import type { ExecTier } from '../../types'
import { RichText } from '../RichText'
import { SelectableOptionList } from './SelectableCheckItem'
import { useGlyphSelection } from './useGlyphSelection'

interface Props {
  seed: number
  /** レビュー対象 PBI の id。あればそのタスク内容に一致する作問を出す（無ければ seed で巡回）。 */
  pbiId?: string
  /** 2回目以降のレビュー（再レビュー／同じ親PBIの別作業項目）。true なら題材一致を避けて別の作問を出す。 */
  variety?: boolean
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
      <RichText text={option.text} interactive={false} />
    </li>
  )
}

/** レビュー・ミニゲーム：AI が書いた差分を点検し、人が拾うべき指摘を選ぶ（AI時代の人間レビュー）。
 *  選択 → 答え合わせ（拾えた/見逃し/空振り＋気づき）→ 確定、の2段。LGTM（0件）も"出せる"。 */
export function MiniGameReview({ seed, pbiId, variety, onResolve }: Props) {
  const [round] = useState<ReviewRound>(() => dealReview(seed, pbiId, variety))
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
  // この作問に実在する本物の指摘数を渡す＝LGTM(指摘0)が正解の"健全コード"回も正しく採点できる。
  const realCount = round.options.filter((o) => o.issue).length
  const submit = () =>
    setTier(
      scoreReview(
        picked.map((i) => round.options[i]),
        realCount,
        round.options // 方向性重み付けのために全選択肢を渡す
      )
    )

  return (
    <div className="space-y-3">
      <p className="text-sm text-[var(--text-body)]">
        AIが書いた差分を点検する。{' '}
        <span className="text-[var(--text-sub)]">人が拾うべき指摘を選ぶ（複数可・無ければLGTM）</span>
      </p>

      {/* このPBIの狙い（intent）と受入条件（acceptance）パネル — ある時だけ表示 */}
      {(round.intent || (round.acceptance && round.acceptance.length > 0)) && (
        <section
          aria-label="このPBIの狙いと受入条件"
          className="rounded-lg border border-[var(--border)] bg-[var(--panel)]/60 px-3 py-2.5 text-xs"
        >
          {round.intent && (
            <div className="mb-2">
              <h3 className="mb-0.5 text-[11px] font-bold uppercase tracking-wider text-[var(--text-sub)]">
                狙い（Why）
              </h3>
              <p className="leading-relaxed text-[var(--text-body)]">
                <RichText text={round.intent} interactive={false} />
              </p>
            </div>
          )}
          {round.acceptance && round.acceptance.length > 0 && (
            <div>
              <h3 className="mb-1 text-[11px] font-bold uppercase tracking-wider text-[var(--text-sub)]">
                受入条件（Done の定義）
              </h3>
              <ul className="space-y-0.5 text-[var(--text-body)]">
                {round.acceptance.map((cond, i) => (
                  <li key={`ac-${i}-${cond.slice(0, 20)}`} className="flex gap-1.5 leading-relaxed">
                    <span className="mt-px shrink-0 text-[var(--text-disabled)]" aria-hidden="true">
                      ・
                    </span>
                    <RichText text={cond} interactive={false} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* AI に頼んだこと */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)]/40 px-3 py-2 text-xs">
        <span className="font-semibold text-[var(--text-sub)]">頼んだこと（How）：</span>
        <span className="text-[var(--text-body)]">
          <RichText text={round.task} interactive={false} />
        </span>
      </div>

      {/* AI が書いた差分 */}
      <DiffView diff={round.diff} />

      {/* AI の自己申告（過信を誘うメモ）— text-sky-400 は意味色（AIを示す色）として保持 */}
      <p className="rounded-lg bg-[var(--panel)]/40 px-3 py-1.5 text-xs text-[var(--text-sub)]">
        <span className="font-semibold text-sky-400">🤖 AI：</span> <RichText text={round.aiNote} interactive={false} />
      </p>

      {/* 点検項目：選択フェーズ（SelectableOptionList）と答え合わせフェーズ（RevealedRow）で切り替え */}
      {revealed ? (
        <ul className="space-y-2">
          {round.options.map((o, i) => (
            <RevealedRow key={`${i}-${o.text}`} option={o} picked={picked.includes(i)} />
          ))}
        </ul>
      ) : (
        <SelectableOptionList
          items={round.options}
          picked={picked}
          glyphPrefix="r-"
          touchedSet={touchedRef.current}
          unpopKey={unpopKey}
          onToggle={toggle}
        />
      )}

      {revealed ? (
        <>
          {/* 気づきは学習ポイント（意味色なし・情報色）なので amber-500/sky はそのまま amber に統一 */}
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-[var(--text-body)]">
            <span className="font-semibold text-amber-300">気づき：</span>{' '}
            <RichText text={round.takeaway} interactive={false} />
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
