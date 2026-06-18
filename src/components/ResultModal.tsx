import { ACTION_LABELS, SEGMENT_COLORS, SEGMENT_LABELS } from '../data/chapters/chapter-01'
import { imageUrl, resultImage } from '../data/images'
import { PRECEPT_BY_ID } from '../data/precepts'
import { useFocusTrap } from '../hooks/useFocusTrap'
import type { BacklogReview, Effects, ResultView } from '../types'
import { RichText } from './RichText'

const EFFECT_LABEL: Record<keyof Effects, string> = {
  trust: '信頼',
  insight: '理解',
  culture: '巻込',
}

function EffectDeltas({ effects }: { effects: Effects }) {
  const entries = (Object.keys(effects) as (keyof Effects)[]).filter((k) => effects[k] !== 0)
  if (entries.length === 0) {
    return <span className="text-sm text-slate-400">メーターの変化はなかった</span>
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

const KIND_LABEL = { dev: '開発', hearing: 'ヒアリング' } as const

/** 選択後ミニゲームの出来バッジ。great=主正+1上乗せ / good=標準 / poor=伸びしろ取り逃し */
function ExecBadge({ result }: { result: ResultView }) {
  const tier = result.execTier
  if (!tier) return null
  const kind = result.minigameKind ? KIND_LABEL[result.minigameKind] : '実行'
  const primary = result.execPrimary ? EFFECT_LABEL[result.execPrimary] : null
  const delta = result.execDelta ?? 0
  const conf =
    tier === 'great'
      ? {
          cls: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
          icon: '◎',
          text: primary && delta > 0 ? `会心の${kind}！ ${primary}の伸びを ＋${delta} 上乗せ` : `会心の${kind}！`,
        }
      : tier === 'poor'
        ? {
            cls: 'border-rose-500/40 bg-rose-500/10 text-rose-300',
            icon: '△',
            text:
              primary && delta < 0
                ? `${kind}の詰めが甘く、${primary}の伸びを ${delta} 取り逃した`
                : `${kind}の詰めが甘かった`,
          }
        : {
            cls: 'border-slate-700 bg-slate-800/40 text-slate-300',
            icon: '○',
            text: `無難に${kind}をやり切った`,
          }
  return (
    <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${conf.cls}`}>
      <span aria-hidden="true">{conf.icon}</span>
      <span className="font-medium">{conf.text}</span>
    </div>
  )
}

/** スプリントレビューの“成果”＝スプリントバックログの精算。DoD は二値（部分点なし）。
 *  容量を超えて予測した分はキャリーオーバーになり、健全な予測は culture を後押しする。 */
function BacklogReviewBlock({ review }: { review: BacklogReview }) {
  const cd = review.cultureDelta
  return (
    <div className="space-y-2 rounded-xl border border-slate-700 bg-slate-800/40 px-4 py-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold text-slate-400">📋 スプリントバックログの精算</p>
        <span className="tabular-nums text-xs text-emerald-300">
          📈 ベロシティ {review.velocity} / 容量 {review.capacity}pt
        </span>
      </div>

      {review.done.length > 0 ? (
        <div>
          <p className="mb-1 text-xs text-emerald-300">✓ 完成（DoD達成）</p>
          <ul className="space-y-0.5">
            {review.done.map((d) => (
              <li key={d.id} className="flex items-start gap-1.5 text-sm text-slate-200">
                <span className="shrink-0 tabular-nums text-[11px] text-slate-500">{d.estimate}pt</span>
                <RichText text={d.title} />
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-xs text-slate-500">この予測では、完成（DoD達成）した項目はなかった。</p>
      )}

      {review.carryover.length > 0 && (
        <div>
          <p className="mb-1 text-xs text-rose-300">↪ キャリーオーバー（次へ持ち越し）</p>
          <ul className="space-y-0.5">
            {review.carryover.map((d) => (
              <li key={d.id} className="flex items-start gap-1.5 text-sm text-slate-300">
                <span className="shrink-0 tabular-nums text-[11px] text-slate-500">{d.estimate}pt</span>
                <RichText text={d.title} />
              </li>
            ))}
          </ul>
          <p className="mt-1 text-xs text-slate-500">
            完成しなかった分は部分点なしでプロダクトバックログに戻り、改めて並べ替えられる。
          </p>
        </div>
      )}

      {cd !== 0 && (
        <p className={`text-xs ${cd > 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
          {cd > 0
            ? '巻込 ▲ +1：容量に見合う予測を守り切った（持続可能なペース）。'
            : '巻込 ▼ −1：容量を超えて欲張り、終わらなかった。'}
        </p>
      )}
    </div>
  )
}

interface Props {
  result: ResultView
  onContinue: () => void
}

export function ResultModal({ result, onContinue }: Props) {
  // フォーカストラップ＋Escで次へ。Enter/Space は data-initial-focus を当てた
  // 「次へ」ボタンへ初期フォーカスが乗るので native に処理される
  const ref = useFocusTrap<HTMLDivElement>(onContinue)
  const titleId = 'result-title'
  const imgKey = resultImage(result.eventId, result.choiceId, result.segment)

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:px-safe sm:pt-safe sm:pb-safe">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-slate-700 bg-slate-900 shadow-2xl sm:max-h-[90vh] sm:rounded-2xl"
      >
        <header
          className="flex flex-wrap items-center gap-2 px-5 py-3"
          style={{ backgroundColor: `${SEGMENT_COLORS[result.segment]}22` }}
        >
          <span className="rounded-full bg-slate-950/60 px-2.5 py-0.5 text-xs font-bold text-slate-200">
            {ACTION_LABELS[result.ceremony]}
          </span>
          <span
            className="rounded-full px-2.5 py-0.5 text-xs font-bold text-slate-950"
            style={{ backgroundColor: SEGMENT_COLORS[result.segment] }}
          >
            {SEGMENT_LABELS[result.segment]}
          </span>
          <h2 id={titleId} className="w-full text-base font-bold text-slate-100">
            {result.eventTitle}
          </h2>
        </header>

        {/* 結果の実写ドキュメンタリー風画像（選択後・あれば） */}
        {imgKey && (
          <img
            src={imageUrl(imgKey)}
            alt=""
            className="h-32 w-full object-cover sm:h-48"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
        )}

        <div className="space-y-4 px-5 py-4">
          {/* 選んだ判断 */}
          <div className="rounded-xl border border-slate-700 bg-slate-800/40 px-4 py-2.5">
            <p className="text-[11px] font-semibold text-slate-400">あなたの判断</p>
            <p className="text-sm font-medium text-slate-100">
              {result.warn && <span className="mr-1">⚠</span>}
              <RichText text={result.choiceLabel} />
            </p>
          </div>

          {/* 何が起きたか（結果文を一度ちゃんと見せる） */}
          <div>
            <p className="mb-1 text-[11px] font-semibold text-slate-400">結果</p>
            <p className="text-[15px] leading-relaxed text-slate-100">
              <RichText text={result.resultText} />
            </p>
          </div>

          {/* 実行ミニゲームの出来 */}
          <ExecBadge result={result} />

          {/* メーター増減 */}
          <div className="flex items-center gap-2 border-t border-slate-800 pt-3">
            <span className="text-[11px] font-semibold text-slate-400">メーター</span>
            <EffectDeltas effects={result.effects} />
          </div>

          {/* 生成AIトークンの消費（AIに頼った選択のみ） */}
          {result.tokenSpent ? (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-400">AIトークン</span>
              <span className="rounded-lg bg-cyan-500/15 px-2.5 py-1 text-sm font-bold tabular-nums text-cyan-300">
                🔋 ▼ −{result.tokenSpent}
              </span>
            </div>
          ) : null}

          {/* リポジトリ：コード（カバレッジ）／技術的負債の増減 */}
          {result.coverageDelta || result.debtDelta ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-400">リポジトリ</span>
              {result.coverageDelta ? (
                <span
                  className={`rounded-lg px-2.5 py-1 text-sm font-bold tabular-nums ${result.coverageDelta > 0 ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'}`}
                >
                  🗂️ コード {result.coverageDelta > 0 ? '▲ +' : '▼ '}
                  {result.coverageDelta}%
                </span>
              ) : null}
              {result.debtDelta ? (
                <span
                  className={`rounded-lg px-2.5 py-1 text-sm font-bold tabular-nums ${result.debtDelta > 0 ? 'bg-rose-500/15 text-rose-300' : 'bg-emerald-500/15 text-emerald-300'}`}
                >
                  ▲ 負債 {result.debtDelta > 0 ? '+' : ''}
                  {result.debtDelta}
                </span>
              ) : null}
            </div>
          ) : null}

          {/* スプリントレビュー：スプリントバックログの精算（done/キャリーオーバー/ベロシティ） */}
          {result.backlogReview && <BacklogReviewBlock review={result.backlogReview} />}

          {/* この場面のFDE心得（手帳に集まる）。新規だけ全文で“獲得”を演出し、
              既出は手帳に集約済みなので小さなチップに畳む（説教の二重化を避ける）。 */}
          {result.precepts.length > 0 &&
            (() => {
              const newIds = result.precepts.filter((id) => result.newPreceptIds.includes(id))
              const seenIds = result.precepts.filter((id) => !result.newPreceptIds.includes(id))
              return (
                <div className="space-y-2 border-t border-slate-800 pt-3">
                  {newIds.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-semibold text-amber-300">✨ 心得を獲得</span>
                      {newIds.map((id) => {
                        const p = PRECEPT_BY_ID[id]
                        if (!p) return null
                        return (
                          <div
                            key={id}
                            className="flex items-start gap-2 rounded-lg bg-amber-400/10 px-2.5 py-1.5 text-sm ring-1 ring-amber-400/30"
                          >
                            <span className="mt-0.5 shrink-0 tabular-nums text-[11px] text-amber-300/80">
                              <span aria-hidden="true">🧭</span> #{id}
                            </span>
                            <span className="text-slate-100">{p.text}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {seenIds.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] text-slate-500">この場面の心得</span>
                      {seenIds.map((id) => (
                        <span
                          key={id}
                          title={PRECEPT_BY_ID[id]?.text}
                          className="rounded bg-slate-800/60 px-1.5 py-0.5 text-[11px] tabular-nums text-slate-400"
                        >
                          🧭 #{id}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })()}

          {/* 主CTAはスクロール内容の最下部に sticky 固定し、常に親指の届く位置に置く（HIG） */}
          <div className="sticky bottom-0 -mx-5 -mb-4 border-t border-slate-800 bg-slate-900/95 px-5 py-3 pb-safe backdrop-blur">
            <button
              type="button"
              onClick={onContinue}
              data-initial-focus
              className="w-full rounded-xl bg-sky-500 py-3 font-bold text-slate-950 transition hover:bg-sky-400 active:scale-95"
            >
              次へ（Enter）
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
