import { useState } from 'react'
import { type DevFlow, dealDevFlow, scoreSequence } from '../../data/minigames'
import type { ExecTier } from '../../types'

interface Props {
  seed: number
  onResolve: (tier: ExecTier) => void
}

/** 開発パズル：シャッフルされた"開発の手順"を、正しい順に組み直す（並べ替え）。 */
export function MiniGameDevPuzzle({ seed, onResolve }: Props) {
  const [flow] = useState<DevFlow>(() => dealDevFlow(seed))
  const [answer, setAnswer] = useState<string[]>([]) // 置いた順
  const remaining = flow.steps.filter((s) => !answer.includes(s))
  const full = answer.length === flow.steps.length

  const place = (s: string) => setAnswer((a) => (a.includes(s) ? a : [...a, s]))
  const remove = (s: string) => setAnswer((a) => a.filter((x) => x !== s))

  return (
    <div className="space-y-3">
      <p className="text-sm text-[var(--text-body)]">
        開発の手順を組み直す。 <span className="text-[var(--text-sub)]">正しい順にタップで並べる</span>
      </p>

      {/* 並べたスロット（タップで戻す） */}
      <ol className="space-y-1.5">
        {flow.steps.map((_, i) => {
          const s = answer[i]
          return (
            <li key={`slot-${i}`} className="flex items-center gap-2">
              <span className="w-5 shrink-0 text-right text-xs tabular-nums text-[var(--text-sub)]">{i + 1}.</span>
              {s ? (
                <button
                  type="button"
                  onClick={() => remove(s)}
                  className="min-h-[44px] flex-1 rounded-lg border border-[var(--link)]/60 bg-[var(--accent)]/15 px-3 py-2.5 text-left text-sm text-[var(--text)] transition hover:bg-[var(--accent)]/25"
                >
                  {s}
                  <span className="ml-1 text-[10px] text-[var(--text-sub)]" aria-hidden="true">
                    （戻す）
                  </span>
                </button>
              ) : (
                <span className="flex-1 rounded-lg border border-dashed border-[var(--border)] px-3 py-2 text-sm text-[var(--text-sub)]">
                  ——
                </span>
              )}
            </li>
          )
        })}
      </ol>

      {/* 未配置のタイル */}
      {remaining.length > 0 && (
        <div className="flex flex-wrap gap-2.5 border-t border-[var(--panel)] pt-3">
          {remaining.map((s, i) => (
            <button
              key={s}
              type="button"
              onClick={() => place(s)}
              data-initial-focus={i === 0 ? true : undefined}
              className="min-h-[44px] rounded-lg border border-[var(--border)] bg-[var(--panel)]/40 px-3.5 py-2.5 text-sm text-[var(--text-body)] transition hover:border-amber-500/50 hover:bg-[var(--panel)]"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        disabled={!full}
        onClick={() => onResolve(scoreSequence(answer, flow.correct))}
        data-initial-focus={full ? true : undefined}
        className="min-h-[44px] w-full rounded-xl bg-[var(--accent)] py-3 font-bold text-[var(--bg)] transition hover:bg-[var(--accent-hover)] active:scale-95 disabled:cursor-not-allowed disabled:bg-[var(--border-strong)] disabled:text-[var(--text-disabled)]"
      >
        {full ? 'この手順で組み上げる' : `あと ${flow.steps.length - answer.length} つ`}
      </button>
    </div>
  )
}
