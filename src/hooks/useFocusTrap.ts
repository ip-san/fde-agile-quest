import { useEffect, useRef } from 'react'

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])'

/** いま実際にフォーカスできる要素か（接続済み・disabled でない・body そのものでない） */
function canFocus(el: Element | null): el is HTMLElement {
  return (
    !!el &&
    el !== document.body &&
    document.contains(el) &&
    !(el as HTMLButtonElement).disabled &&
    typeof (el as HTMLElement).focus === 'function'
  )
}

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
    // 初期フォーカスを明示指定した要素（[data-initial-focus]）があればそれを優先する。
    // 例: ResultModal の「次へ（Enter）」。React の autoFocus 属性は DOM に出ず
    //（React が imperative に focus を当てるだけ）querySelector で拾えないため data 属性で示す。
    // この effect の node.focus() が後勝ちで奪うのを防ぎ、Enter/Space を native に効かせる。
    // 無ければダイアログ本体にフォーカス（SR がタイトルを読み上げる。本文中の用語チップに
    // 直接フォーカスしてツールチップが勝手に開くのを避ける）
    if (node.tabIndex < 0) node.tabIndex = -1
    const want = node.querySelector<HTMLElement>('[data-initial-focus]')
    if (canFocus(want)) want.focus()
    else node.focus()

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
        node.focus()
        return
      }
      const firstEl = list[0]
      const lastEl = list[list.length - 1]
      const active = document.activeElement as HTMLElement | null
      // active がダイアログ本体(node)やリスト外のとき、最初の Tab で背後へ抜けるのを防ぐ。
      // 端からのラップだけでなく「リスト外→端へ」も捕捉する（初期フォーカスが node のケース）
      const inList = !!active && list.includes(active)
      if (e.shiftKey) {
        if (!inList || active === firstEl) {
          e.preventDefault()
          lastEl.focus()
        }
      } else {
        if (!inList || active === lastEl) {
          e.preventDefault()
          firstEl.focus()
        }
      }
    }

    // backdrop（余白）クリックでフォーカスが body へ落ちると、node 限定の keydown が
    // 効かずトラップを突破される。外側の mousedown を preventDefault してフォーカスを
    // ダイアログ内に保ち、突破経路を塞ぐ（aria-modal はキーボード移動を止めないため）
    const onMouseDown = (e: MouseEvent) => {
      if (!node.contains(e.target as Node)) e.preventDefault()
    }
    document.addEventListener('mousedown', onMouseDown)

    node.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      node.removeEventListener('keydown', onKey)
      // APG: 閉じたらトリガーへフォーカスを戻す。トリガーがモーダル表示中に disabled 化
      // または消滅して body に落ちる場合は、盤面の主操作（[data-focus-return]）へ戻す
      if (canFocus(prevFocus)) {
        prevFocus.focus()
      } else {
        const home = document.querySelector<HTMLElement>('[data-focus-return]')
        if (canFocus(home)) home.focus()
      }
    }
  }, [])

  return ref
}
