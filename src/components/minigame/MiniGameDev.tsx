import { useEffect, useRef, useState } from 'react'
import { type DevStep, dealDevSteps, scoreTiming } from '../../data/minigames'
import type { ExecTier } from '../../types'

interface Props {
  seed: number
  onResolve: (tier: ExecTier) => void
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** 開発ミニゲーム：タイミング型（マーカーを的で止める）。reduced-motion 時は選択型へ。 */
export function MiniGameDev({ seed, onResolve }: Props) {
  const [reduced] = useState(prefersReducedMotion)
  return reduced ? (
    <DevFallback seed={seed} onResolve={onResolve} />
  ) : (
    <DevTiming onResolve={onResolve} />
  )
}

/** マーカーが帯を往復。的（中央）に近いほど great。Space/タップで止める。 */
function DevTiming({ onResolve }: { onResolve: (tier: ExecTier) => void }) {
  const [pos, setPos] = useState(0)
  const [stopped, setStopped] = useState(false)
  const posRef = useRef(0)
  const dirRef = useRef(1)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const speed = 1.4 // %/frame ≈ 往復1.2秒程度
    const tick = () => {
      let p = posRef.current + dirRef.current * speed
      if (p >= 100) {
        p = 100
        dirRef.current = -1
      } else if (p <= 0) {
        p = 0
        dirRef.current = 1
      }
      posRef.current = p
      setPos(p)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  const stop = () => {
    if (stopped) return
    setStopped(true)
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    const tier = scoreTiming(posRef.current)
    // 結果を一瞬見せてから解決（バーが止まったのを視認できるように）
    window.setTimeout(() => onResolve(tier), 420)
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-300">
        実装のキメどころ。 <span className="text-slate-400">中央の的でタイミングよく止める</span>
      </p>
      <div className="relative h-9 overflow-hidden rounded-lg border border-slate-700 bg-slate-800">
        {/* 的（中央のグリーンゾーン） */}
        <div className="absolute inset-y-0 left-1/2 w-[16%] -translate-x-1/2 bg-emerald-500/25" />
        <div className="absolute inset-y-0 left-1/2 w-[44%] -translate-x-1/2 border-x border-emerald-400/20" />
        {/* マーカー */}
        <div
          className="absolute inset-y-0 w-1.5 -translate-x-1/2 rounded bg-sky-300 shadow shadow-sky-500/50"
          style={{ left: `${pos}%` }}
          aria-hidden="true"
        />
      </div>
      <button
        type="button"
        onClick={stop}
        disabled={stopped}
        data-initial-focus
        className="w-full rounded-xl bg-sky-500 py-2.5 font-bold text-slate-950 transition hover:bg-sky-400 active:scale-95 disabled:bg-slate-600 disabled:text-slate-400"
      >
        {stopped ? '——' : '止める（SPACE）'}
      </button>
      <span className="sr-only" role="status" aria-live="assertive">
        {stopped ? '実装のタイミングを確定しました' : ''}
      </span>
    </div>
  )
}

/** reduced-motion 用：実装の進め方を1つ選ぶ（tier で採点）。 */
function DevFallback({ seed, onResolve }: { seed: number; onResolve: (tier: ExecTier) => void }) {
  const [steps] = useState<DevStep[]>(() => dealDevSteps(seed))
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-300">
        どう実装を進める？ <span className="text-slate-400">FDEらしい進め方を選ぶ</span>
      </p>
      <ul className="space-y-2">
        {steps.map((s, i) => (
          <li key={s.text}>
            <button
              type="button"
              onClick={() => onResolve(s.tier)}
              data-initial-focus={i === 0 ? true : undefined}
              className="block w-full rounded-xl border border-slate-700 bg-slate-800/40 px-4 py-2.5 text-left text-sm text-slate-200 transition hover:border-sky-500/50 hover:bg-slate-800"
            >
              {s.text}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
