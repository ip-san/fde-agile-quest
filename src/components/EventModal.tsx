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
  if (entries.length === 0) return <span className="text-xs text-slate-400">変化なし</span>
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
  /** 生成AIの残りトークン。tokenCost を超える選択は「残量不足」で選べない＝AIショートカット封印 */
  aiTokens: number
  onChoose: (choice: Choice) => void
}

export function EventModal({ event, unexpected, aiTokens, onChoose }: Props) {
  const ref = useFocusTrap<HTMLDivElement>()
  const titleId = `event-title-${event.id}`
  const segId = `event-seg-${event.id}`
  const eventImgKey = eventImage(event)
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        // 止まったセグメント名をアクセシブルネームに含め、フォーカス移動時に必ず読み上げる。
        // ルーレットの結果通知は背景の aria-live にあり aria-modal 下で取りこぼれ得るため
        aria-labelledby={`${segId} ${titleId}`}
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
            id={segId}
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
            {event.choices.map((c) => {
              const cost = c.tokenCost ?? 0
              // 生成AIに頼る選択は、残量が足りなければ封印（手で作るしかない）
              const locked = cost > 0 && aiTokens < cost
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onChoose(c)}
                  disabled={locked}
                  aria-label={
                    locked ? `${c.label}（AIトークン残量不足のため選べません。必要 ${cost} / 残り ${aiTokens}）` : undefined
                  }
                  className={`group block w-full rounded-xl border px-4 py-3 text-left transition ${
                    locked
                      ? 'cursor-not-allowed border-slate-800 bg-slate-900/40 opacity-50'
                      : c.warn
                        ? 'border-rose-500/40 bg-rose-950/20 hover:border-sky-400 hover:bg-slate-800'
                        : 'border-slate-700 bg-slate-800/40 hover:border-sky-400 hover:bg-slate-800'
                  }`}
                >
                  <span className="block text-sm font-medium text-slate-100">
                    {c.warn && <span className="mr-1">⚠</span>}
                    {/* 選択肢ラベルは外側が button なので、用語チップ(button)を入れ子にしない */}
                    <RichText text={c.label} interactive={false} />
                  </span>
                  <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <EffectBadge effects={c.effects} />
                    {cost > 0 && (
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs font-semibold tabular-nums ${
                          locked ? 'bg-rose-500/15 text-rose-300' : 'bg-cyan-500/15 text-cyan-300'
                        }`}
                      >
                        🔋 AI −{cost}
                        {locked && '（残量不足）'}
                      </span>
                    )}
                  </span>
                </button>
              )
            })}
          </div>
          <p className="text-center text-[11px] text-slate-400">
            ※ 正解はない。すべてはトレードオフ。
          </p>
        </div>
      </div>
    </div>
  )
}
