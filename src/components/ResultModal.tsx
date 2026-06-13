import { useEffect } from 'react'
import { CEREMONY_LABELS, SEGMENT_COLORS, SEGMENT_LABELS } from '../data/chapters/chapter-01'
import type { Effects, ResultView } from '../types'
import { RichText } from './RichText'

const EFFECT_LABEL: Record<keyof Effects, string> = {
  trust: '信頼',
  insight: '理解',
  culture: '巻込',
}

function EffectDeltas({ effects }: { effects: Effects }) {
  const entries = (Object.keys(effects) as (keyof Effects)[]).filter((k) => effects[k] !== 0)
  if (entries.length === 0) {
    return <span className="text-sm text-slate-500">メーターの変化はなかった</span>
  }
  return (
    <span className="flex flex-wrap items-center gap-2">
      {entries.map((k) => {
        const v = effects[k] as number
        const up = v > 0
        return (
          <span
            key={k}
            className={`rounded-lg px-2.5 py-1 text-sm font-bold tabular-nums ${
              up ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'
            }`}
          >
            {EFFECT_LABEL[k]} {up ? '▲ +' : '▼ '}
            {v}
          </span>
        )
      })}
    </span>
  )
}

interface Props {
  result: ResultView
  onContinue: () => void
}

export function ResultModal({ result, onContinue }: Props) {
  // Enter / Space で次へ
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault()
        onContinue()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onContinue])

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        <header
          className="flex flex-wrap items-center gap-2 px-5 py-3"
          style={{ backgroundColor: `${SEGMENT_COLORS[result.segment]}22` }}
        >
          <span className="rounded-full bg-slate-950/60 px-2.5 py-0.5 text-xs font-bold text-slate-200">
            {CEREMONY_LABELS[result.ceremony]}
          </span>
          <span
            className="rounded-full px-2.5 py-0.5 text-xs font-bold text-slate-950"
            style={{ backgroundColor: SEGMENT_COLORS[result.segment] }}
          >
            {SEGMENT_LABELS[result.segment]}
          </span>
          <h2 className="w-full text-base font-bold text-slate-100">{result.eventTitle}</h2>
        </header>

        <div className="space-y-4 px-5 py-4">
          {/* 選んだ判断 */}
          <div className="rounded-xl border border-slate-700 bg-slate-800/40 px-4 py-2.5">
            <p className="text-[11px] font-semibold text-slate-500">あなたの判断</p>
            <p className="text-sm font-medium text-slate-100">
              {result.warn && <span className="mr-1">⚠</span>}
              <RichText text={result.choiceLabel} />
            </p>
          </div>

          {/* 何が起きたか（結果文を一度ちゃんと見せる） */}
          <div>
            <p className="mb-1 text-[11px] font-semibold text-slate-500">結果</p>
            <p className="text-[15px] leading-relaxed text-slate-100">
              <RichText text={result.resultText} />
            </p>
          </div>

          {/* メーター増減 */}
          <div className="flex items-center gap-2 border-t border-slate-800 pt-3">
            <span className="text-[11px] font-semibold text-slate-500">メーター</span>
            <EffectDeltas effects={result.effects} />
          </div>

          <button
            type="button"
            onClick={onContinue}
            autoFocus
            className="w-full rounded-xl bg-sky-500 py-3 font-bold text-slate-950 transition hover:bg-sky-400 active:scale-95"
          >
            次へ（Enter）
          </button>
        </div>
      </div>
    </div>
  )
}
