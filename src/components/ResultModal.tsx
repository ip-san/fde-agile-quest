import { useEffect } from 'react'
import { ACTION_LABELS, SEGMENT_COLORS, SEGMENT_LABELS } from '../data/chapters/chapter-01'
import { imageUrl, resultImage } from '../data/images'
import { METER_META } from '../data/meters'
import { PRECEPT_BY_ID } from '../data/precepts'
import { SEED_BY_ID } from '../data/seeds'
import { METER_CRITICAL } from '../engine/game'
import { type RevealKind, revealKindFor, sfxDanger, sfxPrecept, sfxReveal } from '../engine/sfx'
import { useFocusTrap } from '../hooks/useFocusTrap'
import type { BacklogReview, Effects, Meters, ResultView } from '../types'
import { DecisiveFlash } from './DecisiveFlash'
import { RichText } from './RichText'

// メーターのラベルは data/meters.ts に一元化（短＝差分表示、正式＝文中）。
const EFFECT_LABEL: Record<keyof Effects, string> = {
  trust: METER_META.trust.short,
  insight: METER_META.insight.short,
  culture: METER_META.culture.short,
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

const KIND_LABEL = { dev: '開発', hearing: 'ヒアリング', review: 'レビュー' } as const

/** 選択後ミニゲームの出来バッジ。great=主正+1上乗せ / good=標準 / poor=伸びしろ取り逃し */
function ExecBadge({ result }: { result: ResultView }) {
  const tier = result.execTier
  if (!tier) return null
  const kind = result.minigameKind ? KIND_LABEL[result.minigameKind] : '実行'
  const primary = result.execPrimary ? EFFECT_LABEL[result.execPrimary] : null
  const delta = result.execDelta ?? 0
  const skillCov = result.skillCoverageBonus ?? 0
  const streak = result.greatStreak ?? 0
  // 会心の文言: 主正メーターの上乗せ＋会心の腕前がコード品質へ還元された分を、あるものだけ繋いで見せる。
  const greatGains = [
    primary && delta > 0 ? `${primary}の伸びを ＋${delta}` : null,
    skillCov > 0 ? `コード品質を ＋${skillCov}%` : null,
  ].filter(Boolean)
  // 2連鎖以上は“実装の波”を頭に出して、続けて会心するほど効くことを体感させる。
  const streakLabel = streak >= 2 ? `🔥${streak}連鎖！ ` : ''
  const conf =
    tier === 'great'
      ? {
          cls:
            streak >= 2
              ? 'border-amber-500/50 bg-amber-500/10 text-amber-200'
              : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
          icon: streak >= 2 ? '🔥' : '◎',
          text:
            greatGains.length > 0
              ? `${streakLabel}会心の${kind}！ ${greatGains.join('、')} 上乗せ`
              : `${streakLabel}会心の${kind}！`,
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
  const vg = review.valueGain
  return (
    <div className="space-y-2 rounded-xl border border-slate-700 bg-slate-800/40 px-4 py-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold text-slate-400">📋 スプリントバックログの精算</p>
        <span className="tabular-nums text-xs text-emerald-300">
          📈 ベロシティ {review.velocity}pt（完了 {review.done.length}件）
        </span>
      </div>

      {/* このスプリントで北極星（顧客価値）をどれだけ伸ばしたか＝“成果の前進”を主役級に見せる。 */}
      {vg !== undefined && (
        <div
          className={`flex items-center justify-between rounded-lg px-3 py-2 ${
            vg > 0 ? 'bg-amber-400/10 ring-1 ring-amber-400/30' : 'bg-slate-800/60'
          }`}
        >
          <span className="text-xs font-semibold text-amber-100">
            <span aria-hidden="true">🎯</span> このスプリントで伸ばした顧客価値
          </span>
          <span
            className={`text-base font-extrabold tabular-nums ${
              vg > 0 ? 'text-amber-300' : vg < 0 ? 'text-rose-300' : 'text-slate-400'
            }`}
          >
            {vg > 0 ? `▲ +${vg}` : vg < 0 ? `▼ ${vg}` : '±0'}
          </span>
        </div>
      )}

      {review.done.length > 0 ? (
        <div>
          <p className="mb-1 text-xs text-emerald-300">✓ 完成（DoD達成）</p>
          <ul className="space-y-0.5">
            {review.done.map((d) => (
              <li key={d.id} className="flex items-start gap-1.5 text-sm text-slate-200">
                <span className="shrink-0 tabular-nums text-[11px] text-slate-400">{d.estimate}pt</span>
                <RichText text={d.title} />
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-xs text-slate-400">この予測では、完成（DoD達成）した項目はなかった。</p>
      )}

      {review.carryover.length > 0 && (
        <div>
          <p className="mb-1 text-xs text-rose-300">↪ キャリーオーバー（次へ持ち越し）</p>
          <ul className="space-y-0.5">
            {review.carryover.map((d) => (
              <li key={d.id} className="flex items-start gap-1.5 text-sm text-slate-300">
                <span className="shrink-0 tabular-nums text-[11px] text-slate-400">{d.estimate}pt</span>
                <RichText text={d.title} />
              </li>
            ))}
          </ul>
          <p className="mt-1 text-xs text-slate-400">
            完成しなかった分は部分点なしでプロダクトバックログに戻り、改めて並べ替えられる。
          </p>
        </div>
      )}

      {cd !== 0 && (
        <p className={`text-xs ${cd > 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
          {cd > 0
            ? '巻込 ▲ +1：着手したものを WIP を守って終わらせた（持続可能なペース）。'
            : '巻込 ▼ −1：着手したものを終わらせきれず、持ち越した。'}
        </p>
      )}
    </div>
  )
}

const METER_FULL_LABEL: Record<keyof Meters, string> = {
  trust: METER_META.trust.full,
  insight: METER_META.insight.full,
  culture: METER_META.culture.full,
}

/** トレードオフの明示：同じ判断で上げ下げが同時に起きた時だけ、機会コストを一行で言語化する。
 *  「全部を上げる単一最適解はない」という本作の核を結果の瞬間に体得させる（出典: Reigns の構造的トレードオフ）。 */
function TradeoffNote({ effects }: { effects: Effects }) {
  const keys = Object.keys(METER_FULL_LABEL) as (keyof Meters)[]
  const gained = keys.filter((k) => (effects[k] ?? 0) > 0)
  const lost = keys.filter((k) => (effects[k] ?? 0) < 0)
  if (gained.length === 0 || lost.length === 0) return null
  return (
    <p className="rounded-lg bg-violet-500/10 px-3 py-2 text-xs text-violet-200">
      <span aria-hidden="true">🔁</span> トレードオフ：{gained.map((k) => METER_FULL_LABEL[k]).join('・')}
      を得る代わりに、
      {lost.map((k) => METER_FULL_LABEL[k]).join('・')}を手放した。
    </p>
  )
}

/** 次の機能の種の発見＝自社SaaS「StockPilot」への還元（FDEの本懐）。 */
function SeedReveal({ seedId, seedNew }: { seedId?: string; seedNew?: boolean }) {
  const seed = seedId ? SEED_BY_ID[seedId] : undefined
  if (!seed) return null
  return (
    <div className="space-y-1 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5">
      <p className="text-[11px] font-semibold text-emerald-300">
        <span aria-hidden="true">🌱</span> 次の機能の種を{seedNew ? '発見' : '再確認'}（StockPilotへ還元）
      </p>
      <p className="text-sm font-medium text-slate-100">{seed.title}</p>
      <p className="text-[11px] text-slate-400">現場から：{seed.from}</p>
    </div>
  )
}

interface Props {
  result: ResultView
  /** 判断適用後のメーター（致命圏入りの検知に使う） */
  meters: Meters
  onContinue: () => void
}

/** 開示演出のフラッシュ色。閃光は“決定的瞬間”だけに絞る（impact のみ／danger は別途 rose）。
 *  good/bad/normal は音のみ＝結果画面の閃光過多と認知負荷を避ける。 */
const FLASH_COLOR: Record<RevealKind, string | null> = {
  impact: '#fbbf24', // amber-400 ＝「異議あり！」の閃光に相当
  good: null,
  bad: null,
  normal: null,
}

export function ResultModal({ result, meters, onContinue }: Props) {
  // フォーカストラップ＋Escで次へ。Enter/Space は data-initial-focus を当てた
  // 「次へ」ボタンへ初期フォーカスが乗るので native に処理される
  const ref = useFocusTrap<HTMLDivElement>(onContinue)
  const titleId = 'result-title'
  const imgKey = resultImage(result.eventId, result.choiceId, result.segment)

  // この判断で「致命圏」へ削られたメーター（効果が負、かつ適用後の値が DANGER_AT 以下）。
  // 差し引きプラスでも、削りすぎは命取り——というトレードオフを“追い詰められる緊張”として見せる。
  const dangerMeters = (Object.keys(METER_FULL_LABEL) as (keyof Meters)[]).filter(
    (k) => (result.effects[k] ?? 0) < 0 && meters[k] <= METER_CRITICAL
  )
  const onBrink = dangerMeters.some((k) => meters[k] <= 1) // あと一歩で 0＝案件終了

  // 結果開示＝本作の「決定的瞬間」。メーターの振れ幅から演出強度を決め、
  // 一拍おいた一撃（音）＋一瞬の閃光（CSS）で印象づける（出典: 逆転裁判の音演出）。
  // 音の優先度: 致命圏（追い詰められる警告）＞ 心得の新規獲得（学習のご褒美）＞ 通常の開示。
  const kind = revealKindFor(result.effects, result.warn)
  const gotPrecept = result.newPreceptIds.length > 0
  const gotSeed = !!result.seedNew
  // biome-ignore lint/correctness/useExhaustiveDependencies: 結果（eventId/choiceId）が変わるたびに一度だけ鳴らす
  useEffect(() => {
    if (dangerMeters.length > 0) sfxDanger()
    else if (gotPrecept || gotSeed) sfxPrecept()
    else sfxReveal(kind)
  }, [result.eventId, result.choiceId])
  // 致命圏ならフラッシュも警告色（rose）で上書きする
  const flashColor = dangerMeters.length > 0 ? '#fb7185' : FLASH_COLOR[kind]

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:px-safe sm:pt-safe sm:pb-safe">
      {/* 決定的瞬間の閃光。key を結果ごとに変えてアニメを再生させる。 */}
      <DecisiveFlash key={`${result.eventId}-${result.choiceId}`} color={flashColor} />
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

          {/* 致命圏に踏み込んだ瞬間の警告（追い詰められる緊張）。0 で案件終了。
              ダイアログ開封と同時に存在する静的内容なので role="status"(polite)。
              assertive な alert はタイトル読み上げと競合するため使わない（WCAG 4.1.3）。 */}
          {dangerMeters.length > 0 && (
            <div
              role="status"
              className={`rounded-xl border px-4 py-2.5 ${
                onBrink
                  ? 'border-rose-500/50 bg-rose-500/15 motion-safe:animate-pulse'
                  : 'border-amber-500/50 bg-amber-500/10'
              }`}
            >
              <p className={`text-sm font-bold ${onBrink ? 'text-rose-200' : 'text-amber-200'}`}>
                <span aria-hidden="true">⚠</span> {onBrink ? '危険水域——あと一歩で案件終了' : '危険水域'}
              </p>
              <p className="mt-0.5 text-xs text-slate-300">
                {dangerMeters.map((k, i) => (
                  <span key={k}>
                    {i > 0 && '／'}
                    {METER_FULL_LABEL[k]} <span className="font-bold tabular-nums">残り{meters[k]}</span>
                  </span>
                ))}
                。
                {onBrink
                  ? '0 になると案件は終了する。差し引きプラスでも、削りすぎは命取り。'
                  : 'このまま削ると危ない。'}
              </p>
            </div>
          )}

          {/* 実行ミニゲームの出来 */}
          <ExecBadge result={result} />

          {/* メーター増減 */}
          <div className="flex items-center gap-2 border-t border-slate-800 pt-3">
            <span className="text-[11px] font-semibold text-slate-400">メーター</span>
            <EffectDeltas effects={result.effects} />
          </div>

          {/* トレードオフの明示（機会コストの言語化）。 */}
          <TradeoffNote effects={result.effects} />

          {/* 見抜きボーナス（推理で本音を当てた報酬。その選択の主正メーターに別枠で +）。 */}
          {result.deductionBonus && result.execPrimary ? (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-amber-300">
                <span aria-hidden="true">🔍</span> 見抜きボーナス
              </span>
              <span className="rounded-lg bg-amber-500/15 px-2.5 py-1 text-sm font-bold tabular-nums text-amber-200">
                {EFFECT_LABEL[result.execPrimary]} ▲ +{result.deductionBonus}
              </span>
            </div>
          ) : null}

          {/* 次の機能の種：現場で掴んだプロダクトの種を発見＝自社SaaSへ還元できる（FDEの本懐）。 */}
          <SeedReveal seedId={result.seedId} seedNew={result.seedNew} />

          {/* ヒアリングで掘り当てた発見可PBI：プロダクトバックログに新たな項目が加わった。 */}
          {result.discoveredPbi && (
            <div className="space-y-1 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2.5">
              <p className="text-[11px] font-semibold text-rose-300">
                <span aria-hidden="true">🔎</span> 現場の声から、新しいバックログ項目が見つかった
              </p>
              <p className="text-sm font-medium text-slate-100">『{result.discoveredPbi.title}』</p>
              <p className="text-[11px] text-slate-400">
                プロダクトバックログに追加。次のプランニングで優先順位を検討しましょう。
              </p>
            </div>
          )}

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
                      <span className="text-[11px] text-slate-400">この場面の心得</span>
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
