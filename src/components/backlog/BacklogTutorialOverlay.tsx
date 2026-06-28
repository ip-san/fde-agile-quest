/** BacklogTutorialOverlay.tsx
 *  プロダクトバックログ初回表示時のみ、操作ガイドを重ねるオーバーレイ。
 *  - 2回目以降は localStorage フラグで非表示。
 *  - タップ/クリック/Escape で閉じる。
 *  - SSR・テスト環境では typeof window ガードで安全に無効化。
 *  - motion-safe: で prefers-reduced-motion に自動対応（ブラウザ制御）。
 */

import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'backlog-tutorial-seen'

function hasSeenTutorial(): boolean {
  if (typeof window === 'undefined') return true
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return true
  }
}

function markTutorialSeen(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, '1')
  } catch {
    // localStorage が使えない環境では無視
  }
}

export function BacklogTutorialOverlay() {
  const [visible, setVisible] = useState(false)

  // マウント時にフラグを確認。まだ未視聴なら表示。
  useEffect(() => {
    if (!hasSeenTutorial()) {
      setVisible(true)
    }
  }, [])

  const close = useCallback(() => {
    markTutorialSeen()
    setVisible(false)
  }, [])

  // Escape キーで閉じる
  useEffect(() => {
    if (!visible) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [visible, close])

  if (!visible) return null

  return (
    /* バックグラウンド：バックログ周辺を暗くするスクリム。全面遮断ではなくバックログパネル内に収める。 */
    <div
      role="dialog"
      aria-modal="true"
      aria-label="プロダクトバックログ操作ガイド"
      className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-xl bg-black/70 py-4 px-4 backdrop-blur-sm"
      onClick={close}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') close()
      }}
    >
      {/* 指差しアイコン：先頭アイテムの上を指す */}
      <div aria-hidden="true" className="text-3xl motion-safe:animate-pulse">
        👆
      </div>

      {/* 吹き出し */}
      <div
        className="mt-3 max-w-xs rounded-2xl border border-slate-700 bg-slate-800 px-5 py-4 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <p className="text-sm font-bold leading-relaxed text-slate-100">上が優先度高め</p>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-400">前のスプリントが終わらなくても選べます</p>
        <button
          type="button"
          aria-label="閉じる"
          onClick={close}
          className="mt-4 min-h-[44px] w-full rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-bold text-slate-100 transition hover:bg-sky-500 active:scale-95"
        >
          わかった
        </button>
      </div>
    </div>
  )
}
