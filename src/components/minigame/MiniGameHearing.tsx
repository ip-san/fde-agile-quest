import { useEffect, useRef, useState } from 'react'
import {
  DEMO_HEADING_CTA,
  DEMO_HEADING_PROMPT,
  dealHearing,
  type HearingOption,
  type HearingTheme,
  hearingCtaFor,
  hearingPromptFor,
  scoreHearing,
  shuffle,
} from '../../data/minigames'
import type { ExecTier, PersuadeContext } from '../../types'
import { SelectableOptionList } from './SelectableCheckItem'
import { useGlyphSelection } from './useGlyphSelection'

interface Props {
  seed: number
  theme?: HearingTheme
  /** イベント固有の問い（指定時は良問2以上＋悪問1以上を満たす場合に優先使用） */
  hearingOptions?: HearingOption[]
  /** 説得(persuade)の文脈。'demo' のときリード文・CTA を山場専用に差し替える。 */
  persuadeContext?: PersuadeContext
  onResolve: (tier: ExecTier) => void
}

/** ヒアリング・ミニゲーム：5つの問いから「深掘りになる質問」を2つ選ぶ（現場主義）。
 *  hearingOptions がある場合はイベント固有の問いを（良問2+悪問1以上を満たすとき）シードでシャッフルして使用。
 *  条件を満たさなければ従来の dealHearing(seed, theme) にフォールバック。
 *  persuadeContext='demo' のときはリード文・CTA をスプリントレビューのお披露目専用に差し替える。 */
export function MiniGameHearing({ seed, theme, hearingOptions, persuadeContext, onResolve }: Props) {
  const [options] = useState<HearingOption[]>(() => {
    // イベント固有の問いが十分（良問2以上かつ悪問1以上）なら優先使用
    if (
      hearingOptions &&
      hearingOptions.filter((o) => o.good).length >= 2 &&
      hearingOptions.filter((o) => !o.good).length >= 1
    ) {
      // 共通の shuffle（minigames.ts）でシードを揃え、dealHearing と同一分布にする
      return shuffle(hearingOptions, seed)
    }
    return dealHearing(seed, theme)
  })
  const [picked, setPicked] = useState<number[]>([])
  const ready = picked.length === 2

  const { touchedRef, unpopKey, registerToggle } = useGlyphSelection()

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
    registerToggle(i, has)
    setPicked((p) => {
      if (!has && p.length >= 2) return p // 二重ガード: 連打でも上限を超えない
      return has ? p.filter((x) => x !== i) : [...p, i]
    })
  }

  const isDemo = persuadeContext === 'demo'
  const promptText = isDemo ? DEMO_HEADING_PROMPT : hearingPromptFor(theme)
  const ctaText = isDemo ? DEMO_HEADING_CTA : hearingCtaFor(theme)

  return (
    <div className="space-y-3">
      <p className="text-sm text-[var(--text-body)]">
        {isDemo ? (
          promptText
        ) : (
          <>
            {hearingPromptFor(theme)}{' '}
            <span className="text-[var(--text-sub)]">
              {theme === 'persuade' ? '効く論拠を2つ選ぶ' : '深掘りになる質問を2つ選ぶ'}
            </span>
          </>
        )}
      </p>
      <SelectableOptionList
        items={options}
        picked={picked}
        glyphPrefix="h-"
        touchedSet={touchedRef.current}
        unpopKey={unpopKey}
        onToggle={toggle}
      />

      {/* 上限到達の aria-live アナウンス（上限超過タップ時のみ表示） */}
      <p role="status" aria-live="polite" aria-atomic="true" className="text-xs text-amber-400 min-h-[1.25rem]">
        {limitHit ? 'すでに2つ選択中。どれかを外してから選んでください。' : ''}
      </p>

      <button
        type="button"
        disabled={!ready}
        onClick={() => onResolve(scoreHearing(picked.map((i) => options[i])))}
        className={`min-h-[44px] w-full rounded-xl bg-[var(--accent)] py-3 font-bold text-[var(--bg)] transition hover:bg-[var(--accent-hover)] active:scale-95 disabled:cursor-not-allowed disabled:bg-[var(--border-strong)] disabled:text-[var(--text-disabled)] ${limitHit ? 'shake' : ''}`}
      >
        {ready ? ctaText : `あと ${2 - picked.length} つ選ぶ`}
      </button>
    </div>
  )
}
