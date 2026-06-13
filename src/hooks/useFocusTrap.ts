import { useEffect, useRef } from 'react'

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])'

/**
 * モーダル用のフォーカストラップ。
 * - マウント時に最初のフォーカス可能要素へフォーカスを移す
 * - Tab / Shift+Tab をダイアログ内でループさせ、背後へ抜けさせない
 * - Escape で onEscape（あれば）を呼ぶ
 * - アンマウント時に元のフォーカスへ戻す
 */
export function useFocusTrap<T extends HTMLElement>(onEscape?: () => void) {
  const ref = useRef<T>(null)
  // onEscape を ref で持ち、毎回のレンダーで effect を貼り直さない
  const escapeRef = useRef(onEscape)
  escapeRef.current = onEscape

  useEffect(() => {
    const node = ref.current
    if (!node) return
    const prevFocus = document.activeElement as HTMLElement | null

    const items = () => Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE))
    // ダイアログ本体にフォーカス（SR がタイトルを読み上げる）。本文中の用語チップに
    // 直接フォーカスしてツールチップが勝手に開くのを避ける
    if (node.tabIndex < 0) node.tabIndex = -1
    node.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (escapeRef.current) {
          e.preventDefault()
          escapeRef.current()
        }
        return
      }
      if (e.key !== 'Tab') return
      const list = items()
      if (list.length === 0) {
        e.preventDefault()
        return
      }
      const firstEl = list[0]
      const lastEl = list[list.length - 1]
      const active = document.activeElement
      if (e.shiftKey && active === firstEl) {
        e.preventDefault()
        lastEl.focus()
      } else if (!e.shiftKey && active === lastEl) {
        e.preventDefault()
        firstEl.focus()
      }
    }

    node.addEventListener('keydown', onKey)
    return () => {
      node.removeEventListener('keydown', onKey)
      prevFocus?.focus?.()
    }
  }, [])

  return ref
}
