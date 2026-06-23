import { useEffect, useRef, useState } from 'react'
import { dealDrill, scoreDrill } from '../../data/minigames'
import { sfxDecide, sfxReveal, sfxTick } from '../../engine/sfx'
import type { ExecTier, HearingTheme } from '../../types'

interface Props {
  seed: number
  theme?: HearingTheme
  onResolve: (tier: ExecTier) => void
}

type Phase = 'question' | 'followup' | 'reaction'

/**
 * 深掘りラリー・ミニゲーム（改訂版）。
 *
 * フロー：①問いを選ぶ → 相手の返答が即アニメで流れ込む → ③切り返しを選ぶ
 *       → 相手の最終リアクションが一拍出る（逆転裁判の崩れる/墓穴の一言）→ onResolve。
 *
 * 各問いが自分の response・followUps・finalReactions を持つ（①②③が連動）。
 * 良問ヒット＝drill-open フラッシュ＋sfxReveal('good')。
 * 悪問ヒット＝drill-close-strong フラッシュ（グレーアウト強化）＋sfxReveal('bad')。
 * 良切り返し後の最終リアクション：核心を認める/崩れる一言。
 * 悪切り返し後の最終リアクション：黙り込む/はぐらかす一言。
 * aria-live="polite" で返答・最終リアクションをスクリーンリーダーに読み上げ。
 * prefers-reduced-motion 尊重（CSS で animation:none に落ちる）。
 * reaction 中はクリックでスキップ可能（テンポを殺さない）。
 */
export function MiniGameDrill({ seed, theme, onResolve }: Props) {
  const [drillSet] = useState(() => dealDrill(seed, theme))
  const [phase, setPhase] = useState<Phase>('question')
  const [pickedQuestionIdx, setPickedQuestionIdx] = useState<number | null>(null)
  /** 返答エリアに当てる演出クラス（良問/悪問で切り替え） */
  const [responseClass, setResponseClass] = useState<'drill-open' | 'drill-close-strong' | ''>('')
  /** 採点済みのティア（reaction フェーズでの onResolve 呼び出し用＋演出分岐） */
  const [pendingTier, setPendingTier] = useState<ExecTier | null>(null)
  /** reaction エリアに当てる演出クラス（tier で切り替え） */
  const [reactionClass, setReactionClass] = useState<'reaction-open' | 'reaction-mid' | 'reaction-tomb' | ''>('')

  const firstFollowUpRef = useRef<HTMLButtonElement>(null)
  const firstQuestionRef = useRef<HTMLButtonElement>(null)
  const reactionRef = useRef<HTMLButtonElement>(null)

  // followup フェーズへ切り替わったら最初の切り返し選択肢へフォーカス移動
  useEffect(() => {
    if (phase === 'followup') {
      firstFollowUpRef.current?.focus()
    }
  }, [phase])

  // reaction フェーズへ切り替わったらリアクションエリアへフォーカス移動
  useEffect(() => {
    if (phase === 'reaction') {
      reactionRef.current?.focus()
    }
  }, [phase])

  const selectQuestion = (idx: number) => {
    if (phase !== 'question') return
    const q = drillSet.questions[idx]
    sfxTick(true)
    setPickedQuestionIdx(idx)

    // 良問か悪問かで即座に音・色フィードバック
    const cls = q.good ? 'drill-open' : 'drill-close-strong'
    setResponseClass(cls)
    sfxReveal(q.good ? 'good' : 'bad')

    // 返答を即表示してフェーズ移行（中間ボタン廃止・人工遅延廃止）
    setPhase('followup')
  }

  const selectFollowUp = (idx: number) => {
    if (pickedQuestionIdx === null) return
    const q = drillSet.questions[pickedQuestionIdx]
    const f = q.followUps[idx]
    const tier = scoreDrill(q.good, f.good)

    // tier に応じた音・演出クラスを決定
    if (tier === 'great') {
      sfxReveal('good')
      setReactionClass('reaction-open')
    } else if (tier === 'poor') {
      sfxReveal('bad')
      setReactionClass('reaction-tomb')
    } else {
      sfxDecide()
      setReactionClass('reaction-mid')
    }

    setPendingTier(tier)
    setPhase('reaction')
  }

  /** reaction エリアのクリック・Enter/Space でスキップして onResolve */
  const resolveNow = () => {
    if (pendingTier !== null) {
      onResolve(pendingTier)
    }
  }

  const pickedQuestion = pickedQuestionIdx !== null ? drillSet.questions[pickedQuestionIdx] : null

  return (
    <div className="space-y-4">
      {/* ─── フェーズ 1：問いを選ぶ ─── */}
      <div>
        <p className="text-sm text-[var(--text-body)]">
          <span className="font-semibold text-amber-400" aria-hidden="true">
            ①
          </span>{' '}
          まず、どの問いを投げる？
        </p>
        <ul className="mt-2 space-y-2">
          {drillSet.questions.map((q, i) => {
            const isPicked = pickedQuestionIdx === i
            const isDimmed = phase !== 'question' && !isPicked
            return (
              <li key={`q-${i}-${q.text.slice(0, 10)}`}>
                <button
                  ref={i === 0 ? firstQuestionRef : undefined}
                  type="button"
                  disabled={phase !== 'question'}
                  onClick={() => selectQuestion(i)}
                  aria-pressed={isPicked}
                  className={[
                    'block w-full rounded-xl border px-4 py-3 text-left text-sm transition active:scale-[0.98] min-h-[44px]',
                    isPicked
                      ? 'border-[var(--link)] bg-[var(--accent)]/20 text-[var(--text)] ring-1 ring-[var(--link)]/60'
                      : isDimmed
                        ? 'border-[var(--border)] bg-[var(--panel)]/20 text-[var(--text-disabled)] opacity-40'
                        : 'border-[var(--border)] bg-[var(--panel)]/40 text-[var(--text-body)] hover:border-amber-500/50 hover:bg-[var(--panel)]',
                    'disabled:cursor-not-allowed',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <span
                    className={`mr-1.5 text-base ${isPicked ? 'check-pop text-[var(--link)]' : 'text-[var(--text-sub)]'}`}
                    aria-hidden="true"
                  >
                    {isPicked ? '◉' : '○'}
                  </span>
                  {q.text}
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      {/* ─── 返答の即時表示（問いを選んだ瞬間に流れ込む） ─── */}
      {(phase === 'followup' || phase === 'reaction') && pickedQuestion && (
        <div
          className={`rounded-xl border px-4 py-3 space-y-1 ${responseClass} ${
            pickedQuestion.good ? 'border-amber-500/40 bg-amber-500/5' : 'border-slate-600/40 bg-slate-700/10'
          }`}
        >
          <p
            className={`text-[11px] font-semibold tracking-wide ${pickedQuestion.good ? 'text-amber-400' : 'text-slate-400'}`}
          >
            <span aria-hidden="true">②</span>
            <span className="sr-only">ステップ2：</span>
            {pickedQuestion.good ? '相手が口を開いた' : '相手が口を閉じた'}
          </p>
          {/* aria-live で即座にスクリーンリーダーに読み上げさせる */}
          <p
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="text-sm text-[var(--text-body)] leading-relaxed response-slide"
          >
            {pickedQuestion.response}
          </p>
        </div>
      )}

      {/* ─── フェーズ 2（3段目）：切り返しを選ぶ ─── */}
      {phase === 'followup' && pickedQuestion && (
        <div className="space-y-2">
          <p className="text-sm text-[var(--text-body)]">
            <span className="font-semibold text-amber-400" aria-hidden="true">
              ③
            </span>{' '}
            この返答を受けて、どう切り返す？
          </p>
          <ul className="space-y-2">
            {pickedQuestion.followUps.map((f, i) => (
              <li key={`f-${i}-${f.text.slice(0, 10)}`}>
                <button
                  ref={i === 0 ? firstFollowUpRef : undefined}
                  type="button"
                  onClick={() => selectFollowUp(i)}
                  className="block w-full rounded-xl border border-[var(--border)] bg-[var(--panel)]/40 px-4 py-3 text-left text-sm text-[var(--text-body)] transition active:scale-[0.98] hover:border-amber-500/50 hover:bg-[var(--panel)] min-h-[44px]"
                >
                  <span className="mr-1.5 text-base text-[var(--text-sub)]" aria-hidden="true">
                    ▷
                  </span>
                  {f.text}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ─── フェーズ 3（最終リアクション）：切り返し後の相手の一言 ─── */}
      {phase === 'reaction' && pickedQuestion && pendingTier !== null && (
        <button
          ref={reactionRef}
          type="button"
          aria-label="続ける（クリックまたは Enter/Space で次へ）"
          onClick={resolveNow}
          className={[
            'w-full rounded-xl border px-4 py-3 space-y-1 text-left cursor-pointer transition-opacity hover:opacity-80 active:opacity-60',
            reactionClass,
            pendingTier === 'great'
              ? 'border-amber-400/50 bg-amber-500/8'
              : pendingTier === 'good'
                ? 'border-amber-700/30 bg-amber-900/8'
                : 'border-slate-600/50 bg-slate-700/15',
          ].join(' ')}
        >
          <p
            className={`text-[11px] font-semibold tracking-wide ${
              pendingTier === 'great' ? 'text-amber-300' : pendingTier === 'good' ? 'text-amber-600' : 'text-slate-500'
            }`}
          >
            {pendingTier === 'great'
              ? '── 核心を突かれ、相手が動いた'
              : pendingTier === 'good'
                ? '── 相手が少しだけ動いた'
                : '── 相手は黙り込んだ'}
          </p>
          <p
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="text-sm text-[var(--text-body)] leading-relaxed"
          >
            {pendingTier === 'great'
              ? pickedQuestion.finalReactions.onGreat
              : pendingTier === 'good'
                ? pickedQuestion.finalReactions.onMid
                : pickedQuestion.finalReactions.onPoor}
          </p>
          <p className="text-[10px] text-[var(--text-sub)] text-right mt-1">クリックして続ける</p>
        </button>
      )}

      {/* 初期案内 */}
      {phase === 'question' && (
        <p className="text-xs text-[var(--text-sub)] text-center">
          問いを選ぶと相手が即座に返す。その言葉を受けて切り返す。
        </p>
      )}
    </div>
  )
}
