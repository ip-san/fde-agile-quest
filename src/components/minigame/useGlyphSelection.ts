import type { RefObject } from 'react'
import { useCallback, useRef, useState } from 'react'
import { sfxTick } from '../../engine/sfx'

export interface GlyphSelectionState {
  touchedRef: RefObject<Set<number>>
  unpopKey: Record<number, number>
  /** 選択状態の簿記を更新する。sfxTick・touched・unpopKey を一括処理する。
   *  Hearing 側は「上限ガードの早期 return より後」で呼ぶこと（上限到達時は呼ばない）。 */
  registerToggle: (i: number, has: boolean) => void
}

/** 選択ボタン共通の簿記フック:
 *  - touchedRef: 「一度でも触れたか」を追跡（初回ロード時の全OFF unpop を防ぐ）
 *  - unpopKey: ON→OFF 時に unpop アニメをトリガーするシーケンス番号
 *  - registerToggle: sfxTick + touched.add + (OFF 時) unpopKey++ を一括で行う */
export function useGlyphSelection(): GlyphSelectionState {
  const touchedRef = useRef<Set<number>>(new Set())
  const [unpopKey, setUnpopKey] = useState<Record<number, number>>({})

  const registerToggle = useCallback((i: number, has: boolean) => {
    sfxTick(!has)
    touchedRef.current.add(i)
    if (has) {
      // ON → OFF: unpop を当てるためにキーを更新
      setUnpopKey((prev) => ({ ...prev, [i]: (prev[i] ?? 0) + 1 }))
    }
  }, [])

  return { touchedRef, unpopKey, registerToggle }
}
