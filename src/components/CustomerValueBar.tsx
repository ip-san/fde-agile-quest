interface Props {
  /** 顧客価値(0..100)＝信頼/理解/巻込・良いコードの結晶、技術的負債が引く */
  value: number
}

/** 北極星ゲージ：顧客価値。3メーターやリポジトリは“手段”で、これを高めることが基本目標。
 *  HUDの最上段に大きく出す（手段ゲージとは別格の見せ方）。 */
export function CustomerValueBar({ value }: Props) {
  const ratio = Math.max(0, Math.min(100, value)) / 100
  const tone =
    value >= 70
      ? { bar: 'from-amber-300 to-amber-500', text: 'text-amber-200', ring: 'ring-amber-500/40' }
      : value >= 40
        ? { bar: 'from-amber-400 to-yellow-600', text: 'text-amber-200', ring: 'ring-amber-600/30' }
        : { bar: 'from-slate-400 to-slate-600', text: 'text-slate-300', ring: 'ring-slate-600/40' }
  return (
    <div
      className={`rounded-xl border border-amber-500/30 bg-gradient-to-b from-amber-950/30 to-slate-900/40 px-4 py-3 ring-1 ${tone.ring}`}
    >
      <div className="mb-1.5 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-bold text-amber-100">
          <span aria-hidden="true">🎯</span> 顧客価値
          <span className="ml-1 rounded bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300/90">
            北極星
          </span>
        </span>
        <span className={`text-lg font-extrabold tabular-nums ${tone.text}`}>{value}</span>
      </div>
      <div
        className="h-3 overflow-hidden rounded-full bg-slate-800"
        role="progressbar"
        aria-label="顧客価値"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`h-full rounded-full bg-gradient-to-r transition-all duration-700 ${tone.bar}`}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
      <p className="mt-1.5 text-[10px] text-amber-200/60">
        信頼を築き・現場を理解し・文化を残し・良いコードを積むほど高まる。これを上げるのが基本目標。
      </p>
    </div>
  )
}
