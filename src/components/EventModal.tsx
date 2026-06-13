import { CEREMONY_LABELS, SEGMENT_COLORS, SEGMENT_LABELS } from '../data/chapters/chapter-01'
import { eventImage, imageUrl } from '../data/images'
import { useFocusTrap } from '../hooks/useFocusTrap'
import type { Choice, Effects, GameEvent } from '../types'
import { RichText } from './RichText'

const EFFECT_LABEL: Record<keyof Effects, string> = {
  trust: '信頼',
  insight: '理解',
  culture: '巻込',
}

function EffectBadge({ effects }: { effects: Effects }) {
  const entries = (Object.keys(effects) as (keyof Effects)[]).filter((k) => effects[k] !== 0)
  if (entries.length === 0) return <span className="text-xs text-slate-500">変化なし</span>
  return (
    <span className="flex flex-wrap gap-1.5">
      {entries.map((k) => {
        const v = effects[k] as number
        const positive = v > 0
        return (
          <span
            key={k}
            className={`rounded px-1.5 py-0.5 text-xs font-semibold tabular-nums ${
              positive ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'
            }`}
          >
            {EFFECT_LABEL[k]} {positive ? '+' : ''}
            {v}
          </span>
        )
      })}
    </span>
  )
}

interface Props {
  event: GameEvent
  unexpected: boolean
  onChoose: (choice: Choice) => void
}

export function EventModal({ event, unexpected, onChoose }: Props) {
  const ref = useFocusTrap<HTMLDivElement>()
  const titleId = `event-title-${event.id}`
  const eventImgKey = eventImage(event)
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"
      >
        <header
          className="flex flex-wrap items-center gap-2 rounded-t-2xl px-5 py-3"
          style={{ backgroundColor: `${SEGMENT_COLORS[event.segment]}22` }}
        >
          <span className="rounded-full bg-slate-950/60 px-2.5 py-0.5 text-xs font-bold text-slate-200">
            {CEREMONY_LABELS[event.ceremony]}
          </span>
          <span
            className="rounded-full px-2.5 py-0.5 text-xs font-bold text-slate-950"
            style={{ backgroundColor: SEGMENT_COLORS[event.segment] }}
          >
            {SEGMENT_LABELS[event.segment]}
          </span>
          <h2 id={titleId} className="w-full text-base font-bold text-slate-100">
            {event.title}
          </h2>
        </header>

        {/* 状況の実写ドキュメンタリー風画像（問題に1枚・あれば） */}
        {eventImgKey && (
          <img
            src={imageUrl(eventImgKey)}
            alt=""
            className="h-44 w-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
        )}

        <div className="space-y-4 px-5 py-4">
          {unexpected && (
            <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
              ⚡ 想定外の展開——現場は狙い通りには動かない。
            </p>
          )}
          <p className="text-sm leading-relaxed text-slate-200">
            <RichText text={event.narrative} />
          </p>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-400">あなたの判断は？</p>
            {event.choices.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onChoose(c)}
                className={`group block w-full rounded-xl border px-4 py-3 text-left transition hover:border-sky-400 hover:bg-slate-800 ${
                  c.warn ? 'border-rose-500/40 bg-rose-950/20' : 'border-slate-700 bg-slate-800/40'
                }`}
              >
                <span className="block text-sm font-medium text-slate-100">
                  {c.warn && <span className="mr-1">⚠</span>}
                  <RichText text={c.label} />
                </span>
                <span className="mt-1.5 block">
                  <EffectBadge effects={c.effects} />
                </span>
              </button>
            ))}
          </div>
          <p className="text-center text-[11px] text-slate-500">
            ※ 正解はない。すべてはトレードオフ。
          </p>
        </div>
      </div>
    </div>
  )
}
