import { CustomerValueBar } from './CustomerValueBar'
import { MeterHUD } from './MeterHUD'
import type { Epilogue, LogEntry, Meters } from '../types'

interface Props {
  ending: Epilogue
  meters: Meters
  customerValue: number
  /** 第1章で掴んだ不正の“伏線”の深さ（次章への引き）。none=気づかず / clue=違和感 / case=輪郭 */
  fraudHint?: 'none' | 'clue' | 'case'
  log: LogEntry[]
  onReset: () => void
}

/** 第1章で掴んだ不正の伏線に応じた“次章への引き”。告発の決着は次章へ繰り延べる。 */
const FRAUD_TEASER: Record<'clue' | 'case', string> = {
  clue: '——本物の仕事を進めるほどに、グループの数字の裏に、説明のつかない違和感が一つ、残った。それが何なのか、今はまだ分からない。だが、見なかったことには、できない。',
  case: '——あなたは見てしまった。同じ機材が書類の上だけを巡る、架空の循環取引の輪郭を。一介のFDEが今この場で動かせる話ではない。だがその記録は、静かに胸に刻まれた。いつか、決着をつける日のために。',
}

/** 顧客価値（北極星）の最終ランク。案件の“スコア”として結果に意味を与える。 */
function valueRank(v: number): { grade: string; label: string; cls: string } {
  if (v >= 90) return { grade: 'S', label: '圧倒的な価値を届けた', cls: 'text-amber-300 border-amber-400/50 bg-amber-400/10' }
  if (v >= 75) return { grade: 'A', label: '確かな価値を届けた', cls: 'text-emerald-300 border-emerald-400/40 bg-emerald-400/10' }
  if (v >= 60) return { grade: 'B', label: '価値は届いた', cls: 'text-sky-300 border-sky-400/40 bg-sky-400/10' }
  if (v >= 40) return { grade: 'C', label: '価値は道半ば', cls: 'text-slate-300 border-slate-500/40 bg-slate-500/10' }
  return { grade: 'D', label: '価値を残せなかった', cls: 'text-rose-300 border-rose-400/40 bg-rose-400/10' }
}

export function EndingScreen({ ending, meters, customerValue, fraudHint = 'none', log, onReset }: Props) {
  const failed = ending.id.startsWith('fail-')
  const rank = valueRank(customerValue)
  const teaser = fraudHint === 'none' ? null : FRAUD_TEASER[fraudHint]

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-6 px-safe py-10">
      <div className="text-center">
        <p
          className={`text-xs font-semibold uppercase tracking-widest ${
            failed ? 'text-rose-400' : 'text-slate-400'
          }`}
        >
          {failed ? 'BAD END — 案件終了' : 'Ending'}
        </p>
        <h1
          className={`mt-2 text-3xl font-bold ${failed ? 'text-rose-300' : 'text-sky-300'}`}
        >
          {failed ? '💀 ' : ''}
          {ending.title}
        </h1>
      </div>

      {failed && (
        <p className="text-center text-xs text-rose-300/80">
          ゲージが1つでも0になると、案件はここで終わる。
        </p>
      )}

      <p
        className={`rounded-2xl border p-5 text-sm leading-relaxed ${
          failed
            ? 'border-rose-500/40 bg-rose-950/30 text-rose-100'
            : 'border-slate-700 bg-slate-900/60 text-slate-200'
        }`}
      >
        {ending.reflection}
      </p>

      {/* 不正の伏線を掴んだ周回だけ出す“次章への引き”（告発の決着は第1章ではつけない） */}
      {teaser && !failed && (
        <div className="rounded-2xl border border-amber-600/40 bg-amber-950/20 p-5">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-amber-400/80">
            To be continued — 次章へ
          </p>
          <p className="text-sm leading-relaxed text-amber-100/90">{teaser}</p>
        </div>
      )}

      <div className="space-y-2">
        <p className="mb-2 text-xs font-semibold text-slate-400">最終評価</p>
        {/* 顧客価値ランク＝この案件で届けた価値の総合スコア（北極星の結実） */}
        <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${rank.cls}`}>
          <span className="text-3xl font-black tabular-nums">{rank.grade}</span>
          <div className="min-w-0">
            <p className="text-sm font-bold">🎯 顧客価値ランク：{rank.label}</p>
            <p className="text-xs opacity-80">最終顧客価値 {customerValue} / 100</p>
          </div>
        </div>
        <CustomerValueBar value={customerValue} />
        <MeterHUD meters={meters} />
      </div>

      <p className="text-center text-xs text-slate-400">
        この案件であなたは {log.length} の判断を下した。
        <br />
        別の判断は、別の結末へ続く。
      </p>

      <button
        type="button"
        onClick={onReset}
        className={`mx-auto rounded-xl px-8 py-3 font-bold text-slate-950 transition active:scale-95 ${
          failed ? 'bg-rose-400 hover:bg-rose-300' : 'bg-sky-500 hover:bg-sky-400'
        }`}
      >
        もう一度、別の判断で挑む
      </button>
    </div>
  )
}
