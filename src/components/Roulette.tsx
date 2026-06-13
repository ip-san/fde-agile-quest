import { useCallback, useEffect, useRef, useState } from 'react'
import { SEGMENT_COLORS, SEGMENT_LABELS } from '../data/chapters/chapter-01'
import type { Segment } from '../types'

const SEGMENTS: Segment[] = ['genba', 'kokyaku', 'team', 'trouble', 'chance']
const N = SEGMENTS.length
const SLICE = 360 / N
const CX = 100
const CY = 100
const R = 92

/** 中心からの「上基準・時計回り角度」を画面座標へ */
function polar(angleDeg: number, radius: number) {
  const rad = (angleDeg * Math.PI) / 180
  return { x: CX + radius * Math.sin(rad), y: CY - radius * Math.cos(rad) }
}

function slicePath(i: number) {
  const a0 = i * SLICE
  const a1 = (i + 1) * SLICE
  const p0 = polar(a0, R)
  const p1 = polar(a1, R)
  return `M ${CX} ${CY} L ${p0.x.toFixed(2)} ${p0.y.toFixed(2)} A ${R} ${R} 0 0 1 ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} Z`
}

interface Props {
  disabled?: boolean
  /** 回転停止時に、止まったセグメントと、イベント抽選用の乱数(0..1)を返す */
  onResult: (segment: Segment, pickRandom: number) => void
}

const SPIN_MS = 3600

export function Roulette({ disabled, onResult }: Props) {
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  // スクリーンリーダー向けの結果アナウンス
  const [announce, setAnnounce] = useState('')
  // 前庭障害対策: prefers-reduced-motion なら回転アニメを省く
  const [reduceMotion] = useState(
    () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  )
  const pendingSegment = useRef<Segment | null>(null)
  const pendingPick = useRef(0)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // 1回の回転で onResult を二重発火させないためのガード（transitionend と保険タイマーの競合対策）
  const resolvedRef = useRef(true)

  // 回転の解決を1回だけ行う。transitionend が飛ばない環境でも保険タイマーから呼ばれる
  const finishSpin = useCallback(() => {
    if (resolvedRef.current) return
    resolvedRef.current = true
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setSpinning(false)
    const seg = pendingSegment.current
    if (seg) {
      setAnnounce(`ルーレットは「${SEGMENT_LABELS[seg]}」に止まりました`)
      onResult(seg, pendingPick.current)
    }
  }, [onResult])

  const spin = useCallback(() => {
    if (disabled || spinning) return
    const targetIndex = Math.floor(Math.random() * N)
    pendingSegment.current = SEGMENTS[targetIndex]
    pendingPick.current = Math.random()
    resolvedRef.current = false

    // セグメント中心(targetIndex*SLICE + SLICE/2)を上のポインタ下に持ってくる回転量
    const center = targetIndex * SLICE + SLICE / 2
    const landing = (360 - center) % 360
    const base = rotation - (rotation % 360)
    const spins = 5 + Math.floor(Math.random() * 3)
    setRotation(base + spins * 360 + landing)
    setSpinning(true)
    setAnnounce('ルーレットを回しています…')

    // transitionend 取りこぼし（タブ非アクティブ・reduced-motion 等）の保険。
    // reduced-motion 時はアニメ無しなので短時間で解決する
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(finishSpin, reduceMotion ? 80 : SPIN_MS + 300)
  }, [disabled, spinning, rotation, finishSpin, reduceMotion])

  // SPACE で回す。ただしボタン等のフォーカス可能な要素に居る間は native の挙動
  //（ボタン活性化・スクロール）を奪わない——「回す」ボタン自身も onClick が Space で発火する
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || disabled || spinning) return
      const el = e.target as HTMLElement | null
      if (el && el.closest('button, a, input, textarea, select, [tabindex], [contenteditable]')) return
      e.preventDefault()
      spin()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [spin, disabled, spinning])

  // アンマウント時に保険タイマーを破棄（reset による key 付け替え再マウントで stale 発火を断つ）
  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
  }, [])

  // 回転(transform)の遷移完了のみを拾う。他プロパティの transitionend で多重発火しない
  const handleTransitionEnd = (e: { propertyName: string }) => {
    if (e.propertyName !== 'transform') return
    finishSpin()
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        {/* ポインタ（上・下向き三角） */}
        <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1">
          <div className="h-0 w-0 border-x-[12px] border-t-[20px] border-x-transparent border-t-amber-300 drop-shadow" />
        </div>
        <svg
          viewBox="0 0 200 200"
          className="h-64 w-64 sm:h-72 sm:w-72"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition:
              spinning && !reduceMotion
                ? 'transform 3.6s cubic-bezier(0.17, 0.67, 0.12, 0.99)'
                : 'none',
          }}
          onTransitionEnd={handleTransitionEnd}
          aria-hidden="true"
        >
          {SEGMENTS.map((seg, i) => {
            const mid = i * SLICE + SLICE / 2
            const lp = polar(mid, R * 0.62)
            return (
              <g key={seg}>
                <path d={slicePath(i)} fill={SEGMENT_COLORS[seg]} stroke="#0f172a" strokeWidth={2} />
                <text
                  x={lp.x}
                  y={lp.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(${mid}, ${lp.x.toFixed(2)}, ${lp.y.toFixed(2)})`}
                  fontSize="11"
                  fontWeight="700"
                  fill="#0f172a"
                >
                  {SEGMENT_LABELS[seg]}
                </text>
              </g>
            )
          })}
          <circle cx={CX} cy={CY} r={14} fill="#f8fafc" stroke="#0f172a" strokeWidth={2} />
        </svg>
      </div>

      <button
        type="button"
        onClick={spin}
        disabled={disabled || spinning}
        aria-label="ルーレットを回して、その日の出来事を引く"
        className="rounded-xl bg-sky-500 px-8 py-3 text-lg font-bold text-slate-950 shadow-lg shadow-sky-500/30 transition hover:bg-sky-400 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-400 disabled:shadow-none"
      >
        {spinning ? '回転中…' : '回す（SPACE）'}
      </button>

      {/* スクリーンリーダー向けの状態通知 */}
      <span className="sr-only" role="status" aria-live="assertive">
        {announce}
      </span>
    </div>
  )
}
