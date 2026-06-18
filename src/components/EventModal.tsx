import { ACTION_LABELS, SEGMENT_COLORS, SEGMENT_LABELS } from '../data/chapters/chapter-01'
import { eventImage, imageUrl } from '../data/images'
import { canAfford } from '../engine/progression'
import { useFocusTrap } from '../hooks/useFocusTrap'
import type { Choice, GameEvent } from '../types'
import { RichText } from './RichText'

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
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:px-safe sm:pt-safe sm:pb-safe">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        // 止まったセグメント名をアクセシブルネームに含め、フォーカス移動時に必ず読み上げる。
        // ルーレットの結果通知は背景の aria-live にあり aria-modal 下で取りこぼれ得るため
        aria-labelledby={`${segId} ${titleId}`}
        // スマホ＝下から立ち上がるボトムシート（親指の届く下部に内容を寄せる）／デスクトップ＝中央ダイアログ
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-slate-700 bg-slate-900 shadow-2xl sm:max-h-[90vh] sm:rounded-2xl"
      >
        <header
          className="flex flex-wrap items-center gap-2 rounded-t-2xl px-5 py-3"
          style={{ backgroundColor: `${SEGMENT_COLORS[event.segment]}22` }}
        >
          <span className="rounded-full bg-slate-950/60 px-2.5 py-0.5 text-xs font-bold text-slate-200">
            {ACTION_LABELS[event.ceremony]}
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
            className="h-32 w-full object-cover sm:h-44"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
        )}

        <div className="space-y-4 px-5 pt-4 pb-safe">
          {unexpected && (
            <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
              ⚡ 想定外の展開——現場は狙い通りには動かない。
            </p>
          )}
          <p className="text-sm leading-relaxed text-slate-200">
            <RichText text={event.narrative} />
          </p>

          <div className="space-y-2">
            {/* 注記は選択肢の“上”に置き、選択肢を親指の届く最下段に配置（HIG: 主操作を下部に） */}
            <div className="flex flex-wrap items-baseline justify-between gap-x-2">
              <p className="text-xs font-semibold text-slate-400">あなたの判断は？</p>
              <p className="text-xs text-slate-500">※ 正解はない。結果は決めてから分かる</p>
            </div>
            {event.choices.map((c) => {
              const cost = c.tokenCost ?? 0
              // 生成AIに頼る選択は、残量が足りなければ封印（engine の canAfford と同一述語）
              const locked = !canAfford(aiTokens, c)
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onChoose(c)}
                  disabled={locked}
                  aria-label={
                    locked
                      ? `${c.label}（AIトークン残量不足のため選べません。必要 ${cost} / 残り ${aiTokens}）`
                      : undefined
                  }
                  className={`group block w-full rounded-xl border px-4 py-3 text-left transition ${
                    locked
                      ? 'cursor-not-allowed border-slate-800 bg-slate-900/40 opacity-50'
                      : 'border-slate-700 bg-slate-800/40 hover:border-sky-400 hover:bg-slate-800'
                  }`}
                >
                  <span className="block text-sm font-medium text-slate-100">
                    {/* メーター増減と⚠は選択前は伏せ、結果画面で初めて見せる（判断＝賭けにする）。
                        選択肢ラベルは外側が button なので、用語チップ(button)を入れ子にしない */}
                    <RichText text={c.label} interactive={false} />
                  </span>
                  {/* AIトークンの“価格”だけは残す（残量不足の封印を成立させる資源コスト） */}
                  {cost > 0 && (
                    <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs font-semibold tabular-nums ${
                          locked ? 'bg-rose-500/15 text-rose-300' : 'bg-cyan-500/15 text-cyan-300'
                        }`}
                      >
                        🔋 AI −{cost}
                        {locked && '（残量不足）'}
                      </span>
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
