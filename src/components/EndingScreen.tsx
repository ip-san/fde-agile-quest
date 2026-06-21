import { useState } from 'react'
import type { ValueBreakdown } from '../engine/progression'
import type { Epilogue, LogEntry, Meters } from '../types'
import { CustomerValueBar } from './CustomerValueBar'
import { MeterHUD } from './MeterHUD'

interface Props {
  ending: Epilogue
  meters: Meters
  customerValue: number
  /** 顧客価値の内訳（積み上げバー用。判断×実装の合流を見せる） */
  valueBreakdown: ValueBreakdown
  /** 届けたインクリメント＝DoD 達成のバックログ項目（カンバンの Done 通算） */
  deliveredItems: number
  /** 開始時の顧客価値（成長曲線の起点） */
  valueBaseline: number
  /** スプリント末ごとに記録した顧客価値（index=sprintIndex。成長曲線に使う） */
  valueHistory: number[]
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

/** 「決断の一歩手前」（不正を掴んだ周回のみ）。告発の決着は次章へ繰り延べる（§6.5）ので、
 *  ここでは“決着”ではなく主人公の「姿勢」を一つ選ばせ、繰り延べを“自分で選んだ焦らし”に変える。
 *  フレーバー（結びの一文を彩る）に留め、メーターや永続フラグには影響しない。 */
const FRAUD_STANCE: Record<
  'clue' | 'case',
  { prompt: string; options: { key: string; label: string; after: string }[] }
> = {
  case: {
    prompt: 'この記録を、どう抱える？',
    options: [
      { key: 'pursue', label: 'いつか、必ず暴く', after: '——胸の奥で、静かに刃を研ぐと決めた。次章で、必ず。' },
      {
        key: 'hold',
        label: '今は、記録だけを抱いて',
        after: '——今は動かない。だが消さない。時が満ちるまで、抱えていく。',
      },
    ],
  },
  clue: {
    prompt: 'この違和感を、どうする？',
    options: [
      {
        key: 'pursue',
        label: '忘れない。必ず確かめる',
        after: '——小さな棘が刺さったまま。次章で、その正体を確かめる。',
      },
      { key: 'letgo', label: '気のせいだと、流す', after: '——見なかったことにした。だが、本当にそうだろうか。' },
    ],
  },
}

function FraudStanceBeat({ hint }: { hint: 'clue' | 'case' }) {
  const [picked, setPicked] = useState<string | null>(null)
  const s = FRAUD_STANCE[hint]
  const chosen = picked ? s.options.find((o) => o.key === picked) : null
  if (chosen) return <p className="mt-3 text-sm leading-relaxed text-amber-100">{chosen.after}</p>
  return (
    <div className="mt-3">
      <p className="mb-1.5 text-xs font-semibold text-amber-200/90">{s.prompt}</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        {s.options.map((o) => (
          <button
            type="button"
            key={o.key}
            onClick={() => setPicked(o.key)}
            className="flex-1 rounded-lg border border-amber-500/40 px-3 py-2 text-sm text-amber-100 transition hover:bg-amber-500/10 active:scale-95"
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

/** 顧客価値（北極星）の最終ランク。案件の“スコア”として結果に意味を与える。 */
function valueRank(v: number): { grade: string; label: string; cls: string } {
  if (v >= 90)
    return { grade: 'S', label: '圧倒的な価値を届けた', cls: 'text-amber-300 border-amber-400/50 bg-amber-400/10' }
  if (v >= 75)
    return { grade: 'A', label: '確かな価値を届けた', cls: 'text-emerald-300 border-emerald-400/40 bg-emerald-400/10' }
  if (v >= 60) return { grade: 'B', label: '価値は届いた', cls: 'text-sky-300 border-sky-400/40 bg-sky-400/10' }
  if (v >= 40) return { grade: 'C', label: '価値は道半ば', cls: 'text-slate-300 border-slate-500/40 bg-slate-500/10' }
  return { grade: 'D', label: '価値を残せなかった', cls: 'text-rose-300 border-rose-400/40 bg-rose-400/10' }
}

/** 顧客価値の成長曲線（開始 → 各スプリント末）。「案件を通じてどれだけ価値を伸ばしたか」を
 *  右肩上がり（であってほしい）の一枚絵で見せる。北極星は手段の結実なので、ここが物語の総括になる。 */
function ValueTrend({ baseline, history }: { baseline: number; history: number[] }) {
  // 起点（開始時）＋スプリント末ごとの記録値。未記録（undefined）は曲線から落とす。
  const points: { label: string; v: number }[] = [{ label: '開始', v: baseline }]
  history.forEach((v, i) => {
    if (typeof v === 'number' && Number.isFinite(v)) points.push({ label: `S${i + 1}`, v })
  })
  if (points.length < 2) return null // スプリント末の記録が無ければ曲線にならない

  const W = 100
  const H = 34
  const pad = 3
  const n = points.length
  const x = (i: number) => pad + (i * (W - pad * 2)) / (n - 1)
  const y = (v: number) => pad + (1 - Math.max(0, Math.min(100, v)) / 100) * (H - pad * 2)
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(p.v).toFixed(1)}`).join(' ')
  const net = points[n - 1].v - points[0].v

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3">
      <div className="mb-1.5 flex items-center justify-between">
        <p className="text-xs font-semibold text-amber-200">顧客価値の歩み</p>
        <span
          className={`text-xs font-bold tabular-nums ${net > 0 ? 'text-emerald-300' : net < 0 ? 'text-rose-300' : 'text-slate-400'}`}
        >
          通算 {net > 0 ? `▲ +${net}` : net < 0 ? `▼ ${net}` : '±0'}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-16 w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label={`顧客価値の推移：${points.map((p) => `${p.label} ${p.v}`).join('、')}`}
      >
        <path d={line} fill="none" stroke="#fbbf24" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <circle key={p.label} cx={x(i)} cy={y(p.v)} r={1.6} fill="#fbbf24" />
        ))}
      </svg>
      <div className="mt-0.5 flex justify-between text-[10px] tabular-nums text-slate-400">
        {points.map((p) => (
          <span key={p.label}>
            {p.label}
            <span className="ml-0.5 text-slate-300">{p.v}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

export function EndingScreen({
  ending,
  meters,
  customerValue,
  valueBreakdown,
  deliveredItems,
  valueBaseline,
  valueHistory,
  fraudHint = 'none',
  log,
  onReset,
}: Props) {
  const failed = ending.id.startsWith('fail-')
  const rank = valueRank(customerValue)
  const teaser = fraudHint === 'none' ? null : FRAUD_TEASER[fraudHint]

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-6 px-safe py-10">
      <div className="text-center">
        <p className={`text-xs font-semibold uppercase tracking-widest ${failed ? 'text-rose-400' : 'text-slate-400'}`}>
          {failed ? 'BAD END — 案件終了' : 'Ending'}
        </p>
        <h1 className={`mt-2 text-3xl font-bold ${failed ? 'text-rose-300' : 'text-sky-300'}`}>{ending.title}</h1>
      </div>

      {failed && <p className="text-center text-xs text-rose-300/80">ゲージが1つでも0になると、案件はここで終わる。</p>}

      <p
        className={`rounded-2xl border p-5 text-sm leading-relaxed ${
          failed ? 'border-rose-500/40 bg-rose-950/30 text-rose-100' : 'border-slate-700 bg-slate-900/60 text-slate-200'
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
          {/* 決着はつけず（§6.5）、主人公の“姿勢”だけを選ばせて繰り延べを焦らしに変える */}
          <FraudStanceBeat hint={fraudHint as 'clue' | 'case'} />
        </div>
      )}

      <div className="space-y-2">
        <p className="mb-2 text-xs font-semibold text-slate-400">最終評価</p>
        {/* 顧客価値ランク＝この案件で届けた価値の総合スコア（北極星の結実） */}
        <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${rank.cls}`}>
          <span className="text-3xl font-black tabular-nums">{rank.grade}</span>
          <div className="min-w-0">
            <p className="text-sm font-bold">顧客価値ランク：{rank.label}</p>
            <p className="text-xs opacity-80">最終顧客価値 {customerValue} / 100</p>
          </div>
        </div>
        <CustomerValueBar value={customerValue} breakdown={valueBreakdown} />
        {/* 開始 → 各スプリント末の顧客価値の歩み（成長曲線）。案件の総括として右肩上がりを見せる。 */}
        <ValueTrend baseline={valueBaseline} history={valueHistory} />
        <MeterHUD meters={meters} />
        {/* 届けたインクリメント＝スプリントバックログを Done にした成果。0 は“使わなかった機会損失”として可視化 */}
        <div className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-2.5 text-sm">
          <span className="text-slate-300">届けたインクリメント</span>
          {deliveredItems > 0 ? (
            <span className="font-bold tabular-nums text-emerald-300">{deliveredItems} 件</span>
          ) : (
            <span className="text-xs text-slate-400">0 件 — バックログを Done にできなかった</span>
          )}
        </div>
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
