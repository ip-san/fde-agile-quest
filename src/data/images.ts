// ───────────────────────────────────────────────────────────
// 画像マニフェスト（実写ドキュメンタリー風 / nano-banana 生成）。
// public/img/{key}.jpg を置き、key を AVAILABLE_IMAGES に足すと表示される
//（未登録は描画しない＝404を出さない）。
//
// 画像は2系統（問題と結果で別の絵にする）:
//   ・イベント＝状況の画像: 個別 `${eventId}` / テーマ `theme__${segment}`
//   ・結果＝顛末の画像     : 個別 `${eventId}__${choiceId}__r` / テーマ `theme__${segment}__r`
// 個別があればそれを、無ければセグメント共通のテーマ画像を使う（使い回し）。
// ───────────────────────────────────────────────────────────
import type { GameEvent, Segment } from '../types'

export const AVAILABLE_IMAGES = new Set<string>([
  // 問題（状況）のテーマ画像。public/img/theme__{segment}.jpg
  'theme__genba',
  // 'theme__kokyaku', 'theme__team', 'theme__trouble', 'theme__chance', ← 画像が入り次第ここに追加
  // 結果（顛末）の個別画像。public/img/{eventId}__{choiceId}__r.jpg
  's1-daily-warehouse__b__r',
])

export function imageUrl(key: string): string {
  return `${import.meta.env.BASE_URL}img/${key}.jpg`
}

/** 利用可能な最初のキーを返す（個別 > テーマ）。無ければ null */
function pick(keys: string[]): string | null {
  for (const k of keys) if (AVAILABLE_IMAGES.has(k)) return k
  return null
}

/** イベント（問題）の状況画像キー */
export function eventImage(event: GameEvent): string | null {
  return pick([event.id, `theme__${event.segment}`])
}

/** 結果（選択後）の顛末画像キー。問題の状況画像とは別物にするため、専用の個別画像のみ
 *  （無ければ結果には画像を出さない＝問題画像と必ず異なる）。segment は将来のテーマ結果画像用に保持 */
export function resultImage(eventId: string, choiceId: string, _segment: Segment): string | null {
  return pick([`${eventId}__${choiceId}__r`])
}
