import { useCallback, useEffect, useRef, useState } from 'react'
import { SEGMENT_COLORS, SEGMENT_LABELS } from '../data/chapters/chapter-01'
import { sfxSpin, sfxStop } from '../engine/sfx'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
import type { Segment } from '../types'

const SEGMENTS: Segment[] = ['genba', 'kokyaku', 'team', 'trouble', 'chance']
const N = SEGMENTS.length
const SLICE = 360 / N
const CX = 100
const CY = 100
const R = 80

/** 中心からの「上基準・時計回り角度」を画面座標へ */
function polar(angleDeg: number, radius: number) {
  const rad = (angleDeg * Math.PI) / 180
  return { x: CX + radius * Math.sin(rad), y: CY - radius * Math.cos(rad) }
}

/** hex(#rrggbb) を明暗調整。amt>0 で明るく(白寄せ)、amt<0 で暗く */
function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16)
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) =>
    Math.max(0, Math.min(255, Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt)))
  )
  return `#${((1 << 24) + (ch[0] << 16) + (ch[1] << 8) + ch[2]).toString(16).slice(1)}`
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
  const reduceMotion = usePrefersReducedMotion()
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
      sfxStop() // 止まった瞬間の合図（お題が確定する区切り）
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
    sfxSpin() // 回り出した合図
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
  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    },
    []
  )

  // 回転(transform)の遷移完了のみを拾う。他プロパティの transitionend で多重発火しない
  const handleTransitionEnd = (e: { propertyName: string }) => {
    if (e.propertyName !== 'transform') return
    finishSpin()
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* 盤面そのものもクリックで回せる（初見ユーザーは盤面を押しがち）。アクセシブルな導線は下の「回す」ボタン＋SPACE が担うので、
          この盤面ボタンは aria-hidden・非フォーカスにして二重読み上げ/二重タブ停止を避ける（マウス操作の利便だけ足す）。 */}
      <button
        type="button"
        onClick={spin}
        disabled={disabled || spinning}
        aria-hidden="true"
        tabIndex={-1}
        className="relative h-56 w-56 rounded-full border-0 bg-transparent p-0 min-[400px]:h-64 min-[400px]:w-64 sm:h-72 sm:w-72 disabled:cursor-default [&:not(:disabled)]:cursor-pointer"
      >
        {/* 盤面の落ち影（回転しても向きが変わらないよう静止レイヤに） */}
        <div
          className="absolute inset-[6px] rounded-full"
          style={{ boxShadow: '0 14px 34px rgba(2,6,23,0.55), inset 0 0 0 1px rgba(255,255,255,0.04)' }}
          aria-hidden="true"
        />

        {/* 回転する盤面：スライス・区切り・ラベル */}
        <svg
          viewBox="-8 -8 216 216"
          className="absolute inset-0 h-full w-full"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: spinning && !reduceMotion ? 'transform 3.6s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
          }}
          onTransitionEnd={handleTransitionEnd}
          aria-hidden="true"
        >
          <defs>
            {SEGMENTS.map((seg) => {
              const base = SEGMENT_COLORS[seg]
              return (
                <radialGradient key={seg} id={`seg-${seg}`} cx="50%" cy="50%" r="62%">
                  <stop offset="0%" stopColor={shade(base, 0.4)} />
                  <stop offset="58%" stopColor={base} />
                  <stop offset="100%" stopColor={shade(base, -0.22)} />
                </radialGradient>
              )
            })}
          </defs>

          {SEGMENTS.map((seg, i) => {
            const mid = i * SLICE + SLICE / 2
            const lp = polar(mid, R * 0.64)
            return (
              <g key={seg}>
                <path
                  d={slicePath(i)}
                  fill={`url(#seg-${seg})`}
                  stroke="rgba(255,255,255,0.55)"
                  strokeWidth={1.25}
                  strokeLinejoin="round"
                />
                <text
                  x={lp.x}
                  y={lp.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(${mid}, ${lp.x.toFixed(2)}, ${lp.y.toFixed(2)})`}
                  fontSize="12"
                  fontWeight="800"
                  fill="#0f172a"
                  style={{ letterSpacing: '0.04em', paintOrder: 'stroke' }}
                  stroke="rgba(255,255,255,0.35)"
                  strokeWidth={0.6}
                >
                  {SEGMENT_LABELS[seg]}
                </text>
              </g>
            )
          })}
        </svg>

        {/* 静止オーバーレイ：金ベゼル・ガラス光沢・中央ハブ（回転しない枠と艶） */}
        <svg viewBox="-8 -8 216 216" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
          <defs>
            {/* 金のベゼル（光沢のあるゴールド） */}
            <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fff7d6" />
              <stop offset="28%" stopColor="#fcd34d" />
              <stop offset="60%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#7c2d12" />
            </linearGradient>
            <radialGradient id="gloss" cx="34%" cy="24%" r="74%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.42)" />
              <stop offset="32%" stopColor="rgba(255,255,255,0.12)" />
              <stop offset="60%" stopColor="rgba(255,255,255,0)" />
            </radialGradient>
            <radialGradient id="hub" cx="38%" cy="30%" r="72%">
              <stop offset="0%" stopColor="#fff7d6" />
              <stop offset="50%" stopColor="#fcd34d" />
              <stop offset="100%" stopColor="#b45309" />
            </radialGradient>
          </defs>

          {/* 金のベゼル：太い金枠＋内外の締め＋内側ハイライト */}
          <circle cx={CX} cy={CY} r={R + 5} fill="none" stroke="url(#gold)" strokeWidth={10} />
          <circle cx={CX} cy={CY} r={R + 10} fill="none" stroke="rgba(120,53,15,0.9)" strokeWidth={1.5} />
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(255,247,214,0.85)" strokeWidth={1.25} />

          {/* ガラス光沢（上部から差す反射） */}
          <circle cx={CX} cy={CY} r={R - 1} fill="url(#gloss)" />

          {/* 中央ハブ（ゴールド） */}
          <circle cx={CX} cy={CY} r={18} fill="url(#hub)" stroke="#7c2d12" strokeWidth={1.5} />
          <circle cx={CX} cy={CY} r={8} fill="#7c2d12" />
          <circle cx={CX - 2.2} cy={CY - 2.2} r={2.6} fill="rgba(255,247,214,0.9)" />
        </svg>

        {/* ポインタ（上から差し込む宝石風の指針・回転しない） */}
        <svg
          viewBox="0 0 32 30"
          className="absolute left-1/2 top-0 z-10 h-8 w-8 -translate-x-1/2 -translate-y-[42%] drop-shadow-[0_3px_4px_rgba(2,6,23,0.5)]"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="needle" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fde68a" />
              <stop offset="55%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
          </defs>
          <path
            d="M16 29 L4 6 Q16 0 28 6 Z"
            fill="url(#needle)"
            stroke="#78350f"
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
          <path d="M16 26 L9 8 Q16 5 23 8 Z" fill="rgba(255,255,255,0.35)" />
        </svg>
      </button>

      <button
        type="button"
        onClick={spin}
        disabled={disabled || spinning}
        data-focus-return
        aria-label="ルーレットを回して、その日の出来事を引く"
        className="rounded-xl bg-[var(--accent)] px-8 py-3 text-lg font-bold text-[var(--bg)] shadow-lg shadow-[var(--accent)]/30 transition hover:bg-[var(--accent-hover)] active:scale-95 disabled:cursor-not-allowed disabled:bg-[var(--border-strong)] disabled:text-[var(--text-disabled)] disabled:shadow-none"
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
