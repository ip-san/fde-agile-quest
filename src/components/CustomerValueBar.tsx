import { useState } from 'react'
import type { ValueBreakdown } from '../engine/progression'

interface Props {
  /** 顧客価値(0..100)＝信頼/理解/巻込・届けたインクリメント・良いコードの結晶、技術的負債が引く */
  value: number
  /** 内訳（あれば積み上げ表示）。判断（ルーレット層）と実装（バックログ層）が一本に合流するのを見せる。 */
  breakdown?: ValueBreakdown
}

/** 積み上げに使う“正の寄与”キー（penalty/total は積み上げない）。SEGMENTS をこれに縛り、
 *  penalty を誤って積み上げる／ breakdown[key] が number 以外に解決される事故を型で防ぐ。 */
type ValueSegKey = Exclude<keyof ValueBreakdown, 'penalty' | 'total'>

/** 顧客価値を構成する各レイヤーの“見せ方”定義。色＝出どころ（どの働きが積んだか）。
 *  means＝ルーレットの判断（イベント層）／delivery・coverage＝バックログの実装（カンバン層）。 */
const SEGMENTS: { key: ValueSegKey; color: string; dot: string; label: string }[] = [
  { key: 'means', color: 'bg-amber-400', dot: 'bg-amber-400', label: '判断' },
  { key: 'delivery', color: 'bg-emerald-400', dot: 'bg-emerald-400', label: 'デリバリ' },
  { key: 'coverage', color: 'bg-cyan-400', dot: 'bg-cyan-400', label: 'コード' },
]

/** 北極星ゲージ：顧客価値。3メーターやリポジトリは"手段"で、これを高めることが基本目標。
 *  HUDの最上段に大きく出す（手段ゲージとは別格の見せ方）。
 *  ★直近の判断で"どれだけ伸びたか"を ▲+N / ▼−N で出し、北極星が判断に反応する手応えを作る。
 *  ★内訳(breakdown)があれば積み上げ表示にし、「判断（ルーレット）」と「実装（バックログ）」の
 *    両レイヤーが一本の北極星に合流していることを可視化する。 */
export function CustomerValueBar({ value, breakdown }: Props) {
  // 前回値からの変化量を「次の変化まで」表示し続ける（一度出た ▲+N は次に値が動くまで据え置き）。
  // レンダー中に直前値と比較して state を更新する React 公式パターン（useEffect 不使用＝StrictMode の
  // 二重 Effect やマウント時スプリアス発火が無く、value 変化に対し追加の描画フレームも生まない）。
  const [prevValue, setPrevValue] = useState(value)
  const [delta, setDelta] = useState(0)
  if (prevValue !== value) {
    setPrevValue(value)
    setDelta(value - prevValue)
  }

  const ratio = Math.max(0, Math.min(100, value)) / 100
  const tone =
    value >= 70
      ? { bar: 'from-amber-300 to-amber-500', text: 'text-amber-200', ring: 'ring-amber-500/40' }
      : value >= 40
        ? { bar: 'from-amber-400 to-yellow-600', text: 'text-amber-200', ring: 'ring-amber-500/40' }
        : { bar: 'from-slate-400 to-slate-600', text: 'text-slate-300', ring: 'ring-slate-600/40' }
  return (
    <div className={`rounded-xl border border-amber-500/30 bg-slate-900/40 px-4 py-3 ring-1 ${tone.ring}`}>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-bold text-amber-100">
          顧客価値
          <span className="ml-1 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
            北極星
          </span>
        </span>
        <span className="flex items-center gap-1.5">
          {delta !== 0 && (
            <span
              key={value}
              aria-hidden="true"
              className={`motion-safe:animate-[value-pop_0.3s_ease-out_both] rounded px-1.5 py-0.5 text-xs font-bold tabular-nums ${
                delta > 0 ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'
              }`}
            >
              {delta > 0 ? `▲+${delta}` : `▼${delta}`}
            </span>
          )}
          <span className={`text-lg font-extrabold tabular-nums ${tone.text}`}>{value}</span>
        </span>
      </div>
      {breakdown ? (
        <StackedBar value={value} breakdown={breakdown} />
      ) : (
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
      )}

      {breakdown ? (
        <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-300">
          {SEGMENTS.map((s) => (
            <span key={s.key} className="flex items-center gap-1">
              <span aria-hidden="true" className={`inline-block h-2 w-2 rounded ${s.dot}`} />
              {s.label}
              <span className="tabular-nums text-slate-400">{Math.round(breakdown[s.key])}</span>
            </span>
          ))}
          {breakdown.penalty > 0 && (
            <span className="flex items-center gap-1 text-rose-300">
              <span aria-hidden="true" className="inline-block h-2 w-2 rounded bg-rose-400" />
              負債 <span className="tabular-nums">−{Math.round(breakdown.penalty)}</span>
            </span>
          )}
        </div>
      ) : null}

      <p className="mt-1.5 text-xs leading-snug text-amber-200/70">
        {breakdown ? (
          <>判断と実装、両方の成果がここに集まる。</>
        ) : (
          <>信頼を築き・現場を理解し・文化を残し・良いコードを積むほど高まる。</>
        )}
      </p>
    </div>
  )
}

/** 内訳を積み上げで描く北極星バー。各セグメント幅＝そのレイヤーの“gross寄与”を total に按分（合計=total）。
 *  ＝判断（amber）・デリバリ（emerald）・コード（cyan）が一本に積み上がり、負債はそれを縮める。 */
function StackedBar({ value, breakdown }: { value: number; breakdown: ValueBreakdown }) {
  const gross = breakdown.means + breakdown.delivery + breakdown.coverage
  // 負債で total<gross になる分、各セグメントを按分して縮める（負債が全体を削る、の表現）。
  // 合計幅は value(=total) に一致。万一 gross が将来 100 を超える重みに変わっても 0..100% に収める。
  const widthOf = (seg: number) => (gross > 0 ? Math.max(0, Math.min(100, (seg / gross) * value)) : 0)
  const label = `顧客価値 ${value}（判断${Math.round(breakdown.means)}・デリバリ${Math.round(
    breakdown.delivery
  )}・コード${Math.round(breakdown.coverage)}・負債−${Math.round(breakdown.penalty)}）`
  return (
    <div
      className="flex h-3 overflow-hidden rounded-full bg-slate-800"
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {SEGMENTS.map((s) => (
        <div
          key={s.key}
          className={`h-full ${s.color} transition-all duration-700`}
          style={{ width: `${widthOf(breakdown[s.key])}%` }}
        />
      ))}
    </div>
  )
}
