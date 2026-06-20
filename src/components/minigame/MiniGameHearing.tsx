import { useEffect, useRef, useState } from 'react'
import {
  dealHearing,
  type HearingOption,
  type HearingTheme,
  hearingCtaFor,
  hearingPromptFor,
  scoreHearing,
} from '../../data/minigames'
import { sfxTick } from '../../engine/sfx'
import type { ExecTier } from '../../types'

interface Props {
  seed: number
  theme?: HearingTheme
  /** イベント固有の問い（指定時は良問2以上＋悪問1以上を満たす場合に優先使用） */
  hearingOptions?: { text: string; good: boolean }[]
  onResolve: (tier: ExecTier) => void
}

/** ヒアリング・ミニゲーム：5つの問いから「深掘りになる質問」を2つ選ぶ（現場主義）。
 *  hearingOptions がある場合はイベント固有の問いを（良問2+悪問1以上を満たすとき）シードでシャッフルして使用。
 *  条件を満たさなければ従来の dealHearing(seed, theme) にフォールバック。 */
export function MiniGameHearing({ seed, theme, hearingOptions, onResolve }: Props) {
  const [options] = useState<HearingOption[]>(() => {
    // イベント固有の問いが十分（良問2以上かつ悪問1以上）なら優先使用
    if (
      hearingOptions &&
      hearingOptions.filter((o) => o.good).length >= 2 &&
      hearingOptions.filter((o) => !o.good).length >= 1
    ) {
      // シード付きFisher-Yates（minigames.tsのshuffleと同アルゴリズム・インライン化してimport増加を避ける）
      const a = [...hearingOptions]
      let s = seed >>> 0 || 1
      for (let i = a.length - 1; i > 0; i--) {
        s = (s * 1664525 + 1013904223) >>> 0
        const j = s % (i + 1)
        ;[a[i], a[j]] = [a[j], a[i]]
      }
      return a
    }
    return dealHearing(seed, theme)
  })
  const [picked, setPicked] = useState<number[]>([])
  const ready = picked.length === 2

  // 各インデックスが「一度でも触られたか」を追跡するref（初回ロード時の全OFF unpop を防ぐ）
  const touchedRef = useRef<Set<number>>(new Set())
  // 「直前の選択状態」を追跡して OFF になった項目だけ unpop を当てる
  const [unpopKey, setUnpopKey] = useState<Record<number, number>>({})

  // 上限到達後の3つ目タップ演出トリガ（権威ガードには触れない）
  const [limitHit, setLimitHit] = useState(false)
  const limitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // アンマウント時のクリーンアップのみ useEffect で担う
  useEffect(() => {
    return () => {
      if (limitTimerRef.current) clearTimeout(limitTimerRef.current)
    }
  }, [])

  const toggle = (i: number) => {
    const has = picked.includes(i)
    if (!has && picked.length >= 2) {
      // 上限到達: 権威ガードの早期returnの前に演出トリガだけ立てる。
      // toggle 内で直接タイマーをリセットすることで、連続タップのたびに3秒が振り出しに戻る。
      setLimitHit(true)
      if (limitTimerRef.current) clearTimeout(limitTimerRef.current)
      limitTimerRef.current = setTimeout(() => setLimitHit(false), 3000)
      return // 早期: 確実な上限到達時は音も鳴らさない
    }
    sfxTick(!has)
    // タッチ済みとして記録
    touchedRef.current.add(i)
    if (has) {
      // ON → OFF: unpop を当てるためにキーを更新
      setUnpopKey((prev) => ({ ...prev, [i]: (prev[i] ?? 0) + 1 }))
    }
    setPicked((p) => {
      if (!has && p.length >= 2) return p // 二重ガード: 連打でも上限を超えない
      return has ? p.filter((x) => x !== i) : [...p, i]
    })
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-300">
        {hearingPromptFor(theme)} <span className="text-slate-400">深掘りになる質問を2つ選ぶ</span>
      </p>
      <ul className="space-y-2">
        {options.map((o, i) => {
          const on = picked.includes(i)
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

      {/* 上限到達の aria-live アナウンス（上限超過タップ時のみ表示） */}
      <p role="status" aria-live="polite" aria-atomic="true" className="text-xs text-amber-400 min-h-[1.25rem]">
        {limitHit ? 'すでに2つ選択中。どれかを外してから選んでください。' : ''}
      </p>

      <button
        type="button"
        disabled={!ready}
        onClick={() => onResolve(scoreHearing(picked.map((i) => options[i])))}
        className={`min-h-[44px] w-full rounded-xl bg-sky-500 py-3 font-bold text-slate-950 transition hover:bg-sky-400 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-400 ${limitHit ? 'shake' : ''}`}
      >
        {ready ? hearingCtaFor(theme) : `あと ${2 - picked.length} つ選ぶ`}
      </button>
    </div>
  )
}
