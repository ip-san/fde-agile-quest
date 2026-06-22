import type { ReactNode } from 'react'

interface Props {
  /** glyphKey の安定した一意識別子（例: "opt-0", "opt-1"）。HTML id 属性とは無関係。 */
  itemKey: string
  /** 現在選択状態 */
  on: boolean
  /** 一度でも触れたか（初回ロード時の全OFF unpop を防ぐ） */
  wasTouched: boolean
  /** ON→OFF を経るたびにインクリメントするシーケンス番号（unpop アニメ再マウント制御） */
  unpopSeq: number
  /** トグル時のコールバック */
  onToggle: () => void
  /** true のとき data-initial-focus を付与 */
  initialFocus?: boolean
  /** ボタン内に描画する項目本文 */
  children: ReactNode
}

/** チェックグリフ付き選択ボタン。
 *  pop/unpop アニメーション・aria-pressed・ON/OFF スタイルを担う共通コンポーネント。
 *  簿記（sfxTick / touched / unpopKey）は呼び出し側の useGlyphSelection で管理する。 */
export function SelectableCheckItem({ itemKey, on, wasTouched, unpopSeq, onToggle, initialFocus, children }: Props) {
  // unpop は「触れたことがある AND 現在OFF」の場合だけ当てる。キーで再マウントを制御。
  const glyphKey = on ? `on-${itemKey}` : wasTouched ? `off-${itemKey}-${unpopSeq}` : `init-${itemKey}`
  const glyphClass = on
    ? 'check-pop text-[var(--link)]'
    : wasTouched
      ? 'check-unpop text-[var(--text-sub)]'
      : 'text-[var(--text-sub)]'

  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onToggle}
      data-initial-focus={initialFocus ? true : undefined}
      className={`block w-full rounded-xl border px-4 py-3 text-left text-sm transition active:scale-[0.98] ${
        on
          ? 'border-[var(--link)] bg-[var(--accent)]/20 text-[var(--text)] ring-1 ring-[var(--link)]/60'
          : 'border-[var(--border)] bg-[var(--panel)]/40 text-[var(--text-body)] hover:border-amber-500/50 hover:bg-[var(--panel)]'
      }`}
    >
      <span key={glyphKey} className={`mr-1.5 text-base ${glyphClass}`} aria-hidden="true">
        {on ? '☑' : '☐'}
      </span>
      {children}
    </button>
  )
}
