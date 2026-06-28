import { useEffect } from 'react'
import { sfxReveal } from '../engine/sfx'
import { useFocusTrap } from '../hooks/useFocusTrap'
import type { GameFlag } from '../types'

/** スプリント境界幕間の定義（S1→S2, S2→S3）。
 *  演出専用テキスト——events-sprint*.ts の本文は変えない。正本(STORY.md)の設定の範囲内。 */
const INTERMISSION: Record<
  number,
  {
    completedTitle: string
    /** 初回（generation===0 かつフラグなし）の hook */
    hook: string
    /** 周回時（generation>0）の hook。sprintNo===1 のみ使用 */
    hookRepeat?: string
    nextLabel: string
  }
> = {
  1: {
    completedTitle: 'Sprint 1 完了 — 現場を知った',
    hook: '視察の日付が決まった。次は形にする番だ。',
    hookRepeat: '前回とは違う答えが出るかもしれない——走ってみよう。',
    nextLabel: 'Sprint 2 へ',
  },
  2: {
    completedTitle: 'Sprint 2 完了 — 仮説を形にした',
    hook: '仕組みの種は蒔いた。次は届けられるか。',
    nextLabel: 'Sprint 3 へ',
  },
}

/** S2→S3 幕間のフラグ別 hook テキスト。
 *  topDown / genbaTrust の2フラグを優先確認し、どちらもなければ周回用フォールバックを返す。 */
function resolveS2Hook(generation: number, flags: ReadonlySet<GameFlag>): string {
  if (flags.has('topDown')) {
    return '上から動かした2スプリント。今度は現場の声で証明できるか。'
  }
  if (flags.has('genbaTrust')) {
    return '現場に賭けた2スプリント。3つ目は、積み上げた信頼を試す番。'
  }
  if (generation > 0) {
    return '仕組みの手応えを知っている。あとは届け切るだけ。'
  }
  return INTERMISSION[2].hook
}

interface Props {
  /** 完了したスプリント番号（1 or 2）*/
  completedSprintNo: number
  onContinue: () => void
  /** 周回数。0=初回、1以上=周回プレイ */
  generation?: number
  /** topDown / genbaTrust 等の主軸フラグ */
  flags?: ReadonlySet<GameFlag>
}

/**
 * スプリント境界幕間モーダル。
 * retro 結果を閉じた直後、次スプリントの planning に突入する前に1枚挟む。
 * 「Sprint N 完了」の達成感 + retro の引きを受け止め + 次スプリントへの問いを提示する。
 * タップ or Enter 1発で通過（スキップ不要・ワンタップ即通過）。
 * generation / flags を受け取り、2周目以降・フラグ状態に応じた hook を出し分ける。
 */
export function SprintIntermission({ completedSprintNo, onContinue, generation = 0, flags = new Set() }: Props) {
  const data = INTERMISSION[completedSprintNo]
  const ref = useFocusTrap<HTMLDivElement>(onContinue)

  // 達成の区切り音（明るい上昇アルペジオ = sfxReveal の good）
  useEffect(() => {
    sfxReveal('good')
  }, [])

  if (!data) return null

  // hook テキストを generation・フラグに応じて決定する
  const hook: string = (() => {
    if (completedSprintNo === 1) {
      return generation > 0 && data.hookRepeat ? data.hookRepeat : data.hook
    }
    if (completedSprintNo === 2) {
      return resolveS2Hook(generation, flags)
    }
    return data.hook
  })()

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={data.completedTitle}
        className="w-full max-w-sm rounded-2xl border border-[var(--accent)]/40 bg-[var(--card)] shadow-2xl motion-safe:animate-[fadeSlideIn_0.3s_ease-out]"
      >
        {/* 帯：達成の区切り感 */}
        <div className="rounded-t-2xl bg-[var(--accent)]/10 px-6 py-4 text-center">
          {/* Sprint 番号ドット */}
          <p className="mb-2 text-[11px] font-semibold tracking-widest text-amber-400 uppercase">Sprint Complete</p>
          <h2 className="text-xl font-extrabold leading-snug text-[var(--text)]">{data.completedTitle}</h2>
        </div>

        {/* retro の引きを受け止める "問い" */}
        <div className="border-t border-[var(--border)] px-6 py-5 text-center">
          <p className="text-base leading-relaxed text-[var(--text-body)]">{hook}</p>
        </div>

        {/* CTA */}
        <div className="border-t border-[var(--border)] px-6 pb-6 pt-4">
          <button
            type="button"
            onClick={onContinue}
            data-initial-focus
            aria-label={`${data.nextLabel}へ進む`}
            className="w-full rounded-xl bg-[var(--accent)] py-3 font-bold text-[var(--bg)] shadow-lg shadow-[var(--accent)]/30 transition hover:bg-[var(--accent-hover)] active:scale-95"
          >
            {data.nextLabel} →
          </button>
        </div>
      </div>
    </div>
  )
}
