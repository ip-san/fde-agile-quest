/** イベントID文字列から決定的なシード値（ミニゲームの内容選択用）を生成する純粋関数。
 *  Board / BacklogPanel から共通利用する。アルゴリズムを一箇所に集約し片側更新忘れを防ぐ。 */
export function seedFor(id: string): number {
  let s = 0
  for (let i = 0; i < id.length; i++) s = (s * 31 + id.charCodeAt(i)) >>> 0
  return s
}
