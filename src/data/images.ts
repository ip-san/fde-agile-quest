// ───────────────────────────────────────────────────────────
// 画像マニフェスト（実写ドキュメンタリー風 / nano-banana 生成）。
// public/img/{key}.jpg を置き、key を AVAILABLE_IMAGES に足すと表示される
//（未登録は描画しない＝404を出さない）。
//
// 画像の出し方は2段階:
//   1. 個別画像（特別なイベント用）: `${eventId}__${choiceId}` / `${eventId}__${choiceId}__r`
//   2. テーマ画像（使い回し）       : `theme__${segment}`（genba/kokyaku/team/trouble/chance）
// 個別があればそれを、無ければセグメントのテーマ画像を使う。
// ───────────────────────────────────────────────────────────
import type { GameEvent, Segment } from '../types'

export const AVAILABLE_IMAGES = new Set<string>([
  's1-daily-warehouse__b__r',
  'theme__genba',
])

export function imageUrl(key: string): string {
  return `${import.meta.env.BASE_URL}img/${key}.jpg`
}

const themeKey = (segment: Segment) => `theme__${segment}`

/** 利用可能な最初のキーを返す（個別 > テーマ）。無ければ null */
function pick(keys: string[]): string | null {
  for (const k of keys) if (AVAILABLE_IMAGES.has(k)) return k
  return null
}

/** 選択肢（選択前）の画像キー */
export function choiceImage(event: GameEvent, choiceId: string): string | null {
  return pick([`${event.id}__${choiceId}`, themeKey(event.segment)])
}

/** 結果（選択後）の画像キー */
export function resultImage(eventId: string, choiceId: string, segment: Segment): string | null {
  return pick([`${eventId}__${choiceId}__r`, themeKey(segment)])
}
