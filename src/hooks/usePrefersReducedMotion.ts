import { useState } from 'react'

/**
 * prefers-reduced-motion のマウント時スナップショット。
 * マウント時点の値を1回だけ読む（動的変化は追わない）。
 * SSR 環境では false を返す。
 */
export function usePrefersReducedMotion(): boolean {
  const [value] = useState(
    () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  )
  return value
}
