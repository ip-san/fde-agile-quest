// ───────────────────────────────────────────────────────────
// 生成済み画像のマニフェスト。
// nano-banana (Gemini) で生成した画像を public/img/{key}.png に置き、
// その key をここに足すと UI に表示される（未登録なら表示しない＝404を出さない）。
//
// key の規約:
//   選択肢の画像（選択前・EventModal）: `${eventId}__${choiceId}`
//   結果の画像（選択後・ResultModal）  : `${eventId}__${choiceId}__r`
// ───────────────────────────────────────────────────────────

export const AVAILABLE_IMAGES = new Set<string>([
  's1-daily-warehouse__b__r',
])

export function hasImage(key: string): boolean {
  return AVAILABLE_IMAGES.has(key)
}

/** GitHub Pages のサブパスでも壊れないよう BASE_URL 起点で解決（実写は JPEG） */
export function imageUrl(key: string): string {
  return `${import.meta.env.BASE_URL}img/${key}.jpg`
}

export const choiceImageKey = (eventId: string, choiceId: string) => `${eventId}__${choiceId}`
export const resultImageKey = (eventId: string, choiceId: string) => `${eventId}__${choiceId}__r`
