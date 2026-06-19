/**
 * 決定的瞬間の全画面フラッシュ（逆転裁判の「異議あり！」の一瞬の閃光に相当）。
 * アニメ再生のやり直しは親側で key を変えて再マウントする。reduced-motion 時は CSS で無効化。
 * 装飾なので支援技術からは隠す。color が null なら何も描画しない。
 */
export function DecisiveFlash({ color }: { color: string | null }) {
  if (!color) return null
  return (
    <div
      aria-hidden="true"
      className="decisive-flash pointer-events-none fixed inset-0 z-50"
      style={{ backgroundColor: color }}
    />
  )
}
