import { useEffect, useRef, useState } from 'react'
import { type DiffLine, dealReview, type ReviewRound, scoreReview } from '../../data/minigames'
import { sfxTick } from '../../engine/sfx'
import type { ExecTier } from '../../types'

interface Props {
  seed: number
  onResolve: (tier: ExecTier) => void
}

/** レビュー・ミニゲーム：AI が書いた差分を点検し、人が拾うべき指摘を選ぶ（AI時代の人間レビュー）。
 *  選択 → 答え合わせ（拾えた/見逃し/空振り＋気づき）→ 確定、の2段。LGTM（0件）も“出せる”。 */
export function MiniGameReview({ seed, onResolve }: Props) {
  const [round] = useState<ReviewRound>(() => dealReview(seed))
  const [picked, setPicked] = useState<number[]>([])
  const [tier, setTier] = useState<ExecTier | null>(null) // null＝選択中、確定後は答え合わせ表示

  // 各インデックスが「一度でも触られたか」を追跡するref（初回ロード時の全OFF unpop を防ぐ）
  const touchedRef = useRef<Set<number>>(new Set())
  // 「直前の選択状態」を追跡して OFF になった項目だけ unpop を当てる
  const [unpopKey, setUnpopKey] = useState<Record<number, number>>({})

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
    sfxTick(!has)
    // タッチ済みとして記録
    touchedRef.current.add(i)
    if (has) {
      // ON → OFF: unpop を当てるためにキーを更新
      setUnpopKey((prev) => ({ ...prev, [i]: (prev[i] ?? 0) + 1 }))
    }
    setPicked((p) => (has ? p.filter((x) => x !== i) : [...p, i]))
  }
  const submit = () => setTier(scoreReview(picked.map((i) => round.options[i])))

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-300">
        AIが書いた差分を点検する。{' '}
        <span className="text-slate-400">人が拾うべき指摘を選ぶ（複数可・無ければLGTM）</span>
      </p>

      {/* AI に頼んだこと */}
      <div className="rounded-lg border border-slate-700 bg-slate-800/40 px-3 py-2 text-xs">
        <span className="font-semibold text-slate-400">頼んだこと：</span>
        <span className="text-slate-200">{round.task}</span>
      </div>

      {/* AI が書いた差分 */}
      <DiffView diff={round.diff} />

      {/* AI の自己申告（過信を誘うメモ） */}
      <p className="rounded-lg bg-slate-800/40 px-3 py-1.5 text-xs text-slate-400">
        <span className="font-semibold text-sky-400">🤖 AI：</span> {round.aiNote}
      </p>

      {/* 点検項目 */}
      <ul className="space-y-2">
        {round.options.map((o, i) => {
          const on = picked.includes(i)
          if (revealed) {
            const mark = o.issue ? (on ? '✓ 的確' : '! 見逃し') : on ? '✗ 空振り' : '— 不要'
            const cellStyle = o.issue
              ? on
                ? 'border-emerald-400/60 bg-emerald-500/10 text-slate-100'
                : 'border-amber-400/60 bg-amber-500/10 text-slate-100'
              : on
                ? 'border-rose-400/50 bg-rose-500/10 text-slate-300'
                : 'border-slate-800 bg-slate-800/20 text-slate-500'
            return (
              <li key={o.text} className={`rounded-xl border px-4 py-2.5 text-sm ${cellStyle}`}>
                <span className="mr-2 text-[11px] font-bold">{mark}</span>
                {o.text}
              </li>
            )
          }
          const wasTouched = touchedRef.current.has(i)
          // unpop は「触れたことがある AND 現在OFF」の場合だけ当てる。キーで再マウントを制御。
          const glyphKey = on ? `on-${i}` : wasTouched ? `off-${i}-${unpopKey[i] ?? 0}` : `init-${i}`
          const glyphClass = on
            ? 'check-pop text-sky-300'
            : wasTouched
              ? 'check-unpop text-slate-400'
              : 'text-slate-400'
          return (
            <li key={o.text}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => toggle(i)}
                data-initial-focus={i === 0 ? true : undefined}
                className={`block w-full rounded-xl border px-4 py-3 text-left text-sm transition active:scale-[0.98] ${
                  on
                    ? 'border-sky-400 bg-sky-500/20 text-slate-100 ring-1 ring-sky-400/60'
                    : 'border-slate-700 bg-slate-800/40 text-slate-200 hover:border-sky-500/50 hover:bg-slate-800'
                }`}
              >
                <span key={glyphKey} className={`mr-1.5 text-base ${glyphClass}`} aria-hidden="true">
                  {on ? '☑' : '☐'}
                </span>
                {o.text}
              </button>
            </li>
          )
        })}
      </ul>

      {revealed ? (
        <>
          <p className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs leading-relaxed text-slate-200">
            <span className="font-semibold text-sky-300">気づき：</span> {round.takeaway}
          </p>
          <button
            ref={confirmRef}
            type="button"
            onClick={() => onResolve(tier)}
            data-initial-focus
            className="min-h-[44px] w-full rounded-xl bg-sky-500 py-3 font-bold text-slate-950 transition hover:bg-sky-400 active:scale-95"
          >
            確定する
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={submit}
          className="min-h-[44px] w-full rounded-xl bg-sky-500 py-3 font-bold text-slate-950 transition hover:bg-sky-400 active:scale-95"
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
    <div className="overflow-x-auto rounded-lg border border-slate-700 bg-slate-950/60 p-2.5 font-mono text-[11px] leading-relaxed">
      {diff.map((l, i) => {
        const sign = l.tag === 'add' ? '+' : l.tag === 'del' ? '-' : ' '
        const tone =
          l.tag === 'add'
            ? 'text-emerald-300'
            : l.tag === 'del'
              ? 'text-rose-300 line-through decoration-rose-400/40'
              : 'text-slate-500'
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
