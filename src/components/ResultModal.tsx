import { useEffect, useState } from 'react'
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
    return <span className="text-sm text-[var(--text-sub)]">メーターの変化はなかった</span>
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

const KIND_LABEL = {
  dev: '開発',
  hearing: 'ヒアリング',
  review: 'レビュー',
  persuade: '交渉',
  drill: '深掘り',
} as const

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
  // 2連鎖以上は"実装の波"を頭に出して、続けて会心するほど効くことを体感させる。
  const streakLabel = streak >= 2 ? `${streak}連鎖！ ` : ''
  const conf =
    tier === 'great'
      ? {
          cls:
            streak >= 2
              ? 'border-amber-500/50 bg-amber-500/10 text-amber-200'
              : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
          icon: '◎',
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
            cls: 'border-[var(--border)] bg-[var(--panel)]/40 text-[var(--text-body)]',
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

/** スプリントレビューの"成果"＝スプリントバックログの精算。DoD は二値（部分点なし）。
 *  容量を超えて予測した分はキャリーオーバーになり、健全な予測は culture を後押しする。 */
function BacklogReviewBlock({ review }: { review: BacklogReview }) {
  const cd = review.cultureDelta
  const vg = review.valueGain
  return (
    <div className="space-y-2 rounded-xl border border-[var(--border)] bg-[var(--panel)]/40 px-4 py-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold text-[var(--text-sub)]">スプリントバックログの精算</p>
        <span className="tabular-nums text-xs text-emerald-300">
          ベロシティ {review.velocity}pt（完了 {review.done.length}件）
        </span>
      </div>

      {/* このスプリントで北極星（顧客価値）をどれだけ伸ばしたか＝"成果の前進"を主役級に見せる。 */}
      {vg !== undefined && (
        <div
          className={`flex items-center justify-between rounded-lg px-3 py-2 ${
            vg > 0 ? 'bg-[var(--accent)]/10 ring-1 ring-[var(--accent)]/40' : 'bg-[var(--panel)]/60'
          }`}
        >
          <span className="text-xs font-semibold text-amber-100">このスプリントで伸ばした顧客価値</span>
          <span
            className={`text-base font-extrabold tabular-nums ${
              vg > 0 ? 'text-amber-300' : vg < 0 ? 'text-rose-300' : 'text-[var(--text-sub)]'
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
              <li key={d.id} className="flex items-start gap-1.5 text-sm text-[var(--text-body)]">
                <span className="shrink-0 tabular-nums text-[11px] text-[var(--text-sub)]">{d.estimate}pt</span>
                <RichText text={d.title} />
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-xs text-[var(--text-sub)]">この予測では、完成（DoD達成）した項目はなかった。</p>
      )}

      {review.carryover.length > 0 && (
        <div>
          <p className="mb-1 text-xs text-rose-300">↪ キャリーオーバー（次へ持ち越し）</p>
          <ul className="space-y-0.5">
            {review.carryover.map((d) => (
              <li key={d.id} className="flex items-start gap-1.5 text-sm text-[var(--text-body)]">
                <span className="shrink-0 tabular-nums text-[11px] text-[var(--text-sub)]">{d.estimate}pt</span>
                <RichText text={d.title} />
              </li>
            ))}
          </ul>
          <p className="mt-1 text-xs text-[var(--text-sub)]">
            完成しなかった分は部分点なしでプロダクトバックログに戻り、改めて並べ替えられる。
          </p>
        </div>
      )}

      {cd !== 0 && (
        <p className={`text-xs ${cd > 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
          {cd > 0
            ? '巻込 ▲ +1：着手したものを終わらせてから次へ（仕掛りを絞る＝持続可能なペース）。'
            : '巻込 ▼ −1：着手した仕掛りを終わらせきれず持ち越した（フロー停滞＝未完の積み残し）。'}
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
      トレードオフ：{gained.map((k) => METER_FULL_LABEL[k]).join('・')}
      を得る代わりに、
      {lost.map((k) => METER_FULL_LABEL[k]).join('・')}を手放した。
    </p>
  )
}

/** 心得ブロック（precept主役ケースと通常ケースで表示内容を切り替える）。
 *  precept主役：上部ヘッドラインで新規全文を表示済みなので、ここは全IDをチップのみに集約。
 *  その他：新規全文カード＋既出IDチップ。 */
function PreceptsBlock({
  precepts,
  newPreceptIds,
  headlineKind,
}: {
  precepts: number[]
  newPreceptIds: number[]
  headlineKind: HeadlineKind
}) {
  const newIds = precepts.filter((id) => newPreceptIds.includes(id))
  const seenIds = precepts.filter((id) => !newPreceptIds.includes(id))
  // precept が主役ブロック表示済みのとき新規全文は省略し既出チップのみ
  const showNewFull = headlineKind !== 'precept' && newIds.length > 0
  // precept 主役時: 全precepts をチップ表示（新規も含む）／それ以外: seenIds のみ
  const chipIds = headlineKind === 'precept' ? precepts : seenIds

  return (
    <div className="space-y-2 border-t border-[var(--panel)] pt-3">
      {showNewFull && (
        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold text-amber-300">心得を獲得</span>
          {newIds.map((id) => {
            const p = PRECEPT_BY_ID[id]
            if (!p) return null
            return (
              <div
                key={id}
                className="flex items-start gap-2 rounded-lg bg-[var(--accent)]/10 px-2.5 py-1.5 text-sm ring-1 ring-[var(--accent)]/40"
              >
                <span className="mt-0.5 shrink-0 tabular-nums text-[11px] text-amber-300/80">#{id}</span>
                <span className="text-[var(--text)]">{p.text}</span>
              </div>
            )
          })}
        </div>
      )}
      {/* 既出チップ（precept主役時の新規IDも含め小さく集約） */}
      {chipIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-[var(--text-sub)]">この場面の心得</span>
          {chipIds.map((id) => (
            <span
              key={id}
              title={PRECEPT_BY_ID[id]?.text}
              className="rounded bg-[var(--panel)]/60 px-1.5 py-0.5 text-[11px] tabular-nums text-[var(--text-sub)]"
            >
              #{id}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

/** 次の機能の種の発見＝自社SaaS「StockPilot」への還元（FDEの本懐）。 */
function SeedReveal({ seedId, seedNew }: { seedId?: string; seedNew?: boolean }) {
  const seed = seedId ? SEED_BY_ID[seedId] : undefined
  if (!seed) return null
  return (
    <div className="space-y-1 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5">
      <p className="text-[11px] font-semibold text-emerald-300">
        次の機能の種を{seedNew ? '発見' : '再確認'}（StockPilotへ還元）
      </p>
      <p className="text-sm font-medium text-[var(--text)]">{seed.title}</p>
      <p className="text-[11px] text-[var(--text-sub)]">現場から：{seed.from}</p>
    </div>
  )
}

// ─── Headline（主役）選定 ────────────────────────────────────────────────

/** 主役ブロックの種別。7段階の優先度で一意に決まる。 */
export type HeadlineKind = 'danger' | 'greatExit' | 'poorExit' | 'precept' | 'valueGain' | 'cultureLand' | 'normal'

/**
 * resultText を「冒頭1文（head）」と「残り（rest）」に分割する純関数。
 * 句点「。」で最初の文を切り出す。句点がなければ全文を head、rest は空文字。
 * normal ケースのヘッドライン主役化に使う。
 */
export function splitHeadlineSentence(text: string): { head: string; rest: string } {
  const idx = text.indexOf('。')
  if (idx === -1) return { head: text, rest: '' }
  return { head: text.slice(0, idx + 1), rest: text.slice(idx + 1).trimStart() }
}

/**
 * 毎ターンの「主役」を1つだけ選ぶ純関数（優先度順）。
 * 新しい state/計算/乱数は使わず、既存フラグの派生値のみで決定する。
 * sfxKind の danger>precept 優先度と整合している（greatExit は sfx に無いが flash に対応）。
 *
 * 優先度:
 * 1) 致命圏 — dangerMeters.length>0 / onBrink
 * 2) 会心の山場出口 — execTier==='great' && tierResultText
 * 3) 詰め甘の山場出口 — execTier==='poor' && tierResultText
 * 4) 心得の新規獲得 — newPreceptIds.length>0
 * 5) 顧客価値の伸び — backlogReview?.valueGain>0
 * 6) 文化の着地 — effects.culture>0 && meters.culture>=6
 * 7) それ以外（通常: メーター差分が主役）
 */
export function pickHeadline(
  result: Pick<ResultView, 'execTier' | 'tierResultText' | 'newPreceptIds' | 'backlogReview' | 'effects'>,
  dangerMeters: (keyof Meters)[],
  meters: Meters
): HeadlineKind {
  if (dangerMeters.length > 0) return 'danger'
  if (result.execTier === 'great' && result.tierResultText) return 'greatExit'
  if (result.execTier === 'poor' && result.tierResultText) return 'poorExit'
  if (result.newPreceptIds.length > 0) return 'precept'
  if ((result.backlogReview?.valueGain ?? 0) > 0) return 'valueGain'
  // 6) 文化の着地 — culture+ の選択 かつ cultureメーターが一定以上（定着フェーズ実感）
  if ((result.effects.culture ?? 0) > 0 && meters.culture >= 6) return 'cultureLand'
  return 'normal'
}

interface Props {
  result: ResultView
  /** 判断適用後のメーター（致命圏入りの検知に使う） */
  meters: Meters
  onContinue: () => void
}

/** 開示演出のフラッシュ色。閃光は"決定的瞬間"だけに絞る（impact のみ／danger は別途 rose）。
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
  // 差し引きプラスでも、削りすぎは命取り——というトレードオフを"追い詰められる緊張"として見せる。
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
  // 致命圏ならフラッシュも警告色（rose）で上書きする。
  // great + tierResultText がある場合（山場の出口）は amber で格上げする（危険圏には勝てない）。
  // poor + tierResultText がある場合（詰め甘の山場出口）は rose で閃光を放つ（amber とは別のシグナル）。
  const greatExit = result.execTier === 'great' && !!result.tierResultText
  const poorExit = result.execTier === 'poor' && !!result.tierResultText
  const flashColor =
    dangerMeters.length > 0 ? '#fb7185' : greatExit ? '#fbbf24' : poorExit ? '#fb7185' : FLASH_COLOR[kind]
  // sfx 選択ロジックを effect 外で確定させ、union 型の値を deps に入れる。
  // これにより effect 内の参照が常に最新値となり biome-ignore が不要になる。
  // 優先度（headlineKind と整合）: danger > greatExit(sfxReveal) > precept > kind
  // greatExit のとき kind をそのまま使う＝音は変動量に従う（warn か magnitude>=3 で impact、小変動は good 等）。
  // 視覚(amber)とは独立し、聴覚は revealKindFor の振れ幅で決まる（常に impact とは限らない）。
  // gotSeed も precept と同順（発見もご褒美音）。
  const sfxKind: 'danger' | 'precept' | RevealKind =
    dangerMeters.length > 0 ? 'danger' : greatExit ? kind : gotPrecept || gotSeed ? 'precept' : kind
  useEffect(() => {
    if (sfxKind === 'danger') sfxDanger()
    else if (sfxKind === 'precept') sfxPrecept()
    else sfxReveal(sfxKind)
  }, [sfxKind])

  // 主役選定（純関数で決定）
  const headlineKind = pickHeadline(result, dangerMeters, meters)
  // 副次情報パネルの開閉（details/summary の代替: aria-expanded + aria-controls で同等の a11y）
  const [detailsOpen, setDetailsOpen] = useState(false)

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:px-safe sm:pt-safe sm:pb-safe">
      {/* 決定的瞬間の閃光。key を結果ごとに変えてアニメを再生させる。 */}
      <DecisiveFlash key={`${result.eventId}-${result.choiceId}`} color={flashColor} />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl sm:max-h-[90vh] sm:rounded-2xl"
      >
        {/* ceremony === 'review' / 'retro' は節目のため帯色とバッジ色で差別化する。
            'review'=amber 系（スプリントゴール達成の確認）、'retro'=violet 系（内省・改善）。
            色だけで情報を伝えない：バッジのテキスト（ACTION_LABELS）が常に読める前提。 */}
        <header
          className={`flex flex-wrap items-center gap-2 px-5 py-3 ${result.ceremony === 'review' ? 'bg-amber-500/10' : result.ceremony === 'retro' ? 'bg-violet-500/10' : ''}`}
          style={
            result.ceremony === 'daily' || result.ceremony === 'planning'
              ? { backgroundColor: `${SEGMENT_COLORS[result.segment]}22` }
              : undefined
          }
        >
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${result.ceremony === 'review' ? 'bg-amber-500/25 text-amber-200' : result.ceremony === 'retro' ? 'bg-violet-500/25 text-violet-200' : 'bg-[var(--bg-deep)]/60 text-[var(--text-body)]'}`}
          >
            {ACTION_LABELS[result.ceremony]}
          </span>
          <span
            className="rounded-full px-2.5 py-0.5 text-xs font-bold text-[var(--bg)]"
            style={{ backgroundColor: SEGMENT_COLORS[result.segment] }}
          >
            {SEGMENT_LABELS[result.segment]}
          </span>
          <h2 id={titleId} className="w-full text-base font-bold text-[var(--text)]">
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

        <div className="space-y-3 px-5 py-4">
          {/* ═══ 主役ブロック（HeadlineKind ごとに1つだけ前面に大きく） ═══
              優先度: danger > greatExit > poorExit > precept > valueGain > cultureLand > normal
              normal のみメーター差分がそのまま主役になる（専用ブロックなし） */}

          {/* 1) 致命圏警告 ── 最優先。0 で案件終了する緊張感を前面に。
              ダイアログ開封と同時に存在する静的内容なので role="status"(polite)。
              assertive な alert はタイトル読み上げと競合するため使わない（WCAG 4.1.3）。 */}
          {headlineKind === 'danger' && dangerMeters.length > 0 && (
            <div
              role="status"
              aria-live="polite"
              aria-atomic="true"
              className={`rounded-xl border px-4 py-3 ${
                onBrink
                  ? 'border-rose-500/50 bg-rose-500/15 motion-safe:animate-pulse'
                  : 'border-amber-500/50 bg-amber-500/10'
              }`}
            >
              <p className={`text-base font-bold ${onBrink ? 'text-rose-200' : 'text-amber-200'}`}>
                <span aria-hidden="true">⚠</span> {onBrink ? '危険水域——あと一歩で案件終了' : '危険水域'}
              </p>
              <p className="mt-1 text-sm text-[var(--text-body)]">
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

          {/* 2) 会心の山場出口 ── great + tierResultText を主役に前面表示。 */}
          {headlineKind === 'greatExit' && result.tierResultText && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 ring-1 ring-amber-500/40">
              <p className="mb-1 text-[11px] font-semibold text-amber-300">
                <span aria-hidden="true">◎</span> 会心の手応え
              </p>
              <p className="text-base font-bold leading-relaxed text-amber-200">
                <RichText text={result.tierResultText} />
              </p>
            </div>
          )}

          {/* 3) 詰め甘の山場出口 ── poor + tierResultText を rose 系主役ブロックに格上げ表示。 */}
          {headlineKind === 'poorExit' && result.tierResultText && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3">
              <p className="mb-1 text-[11px] font-semibold text-rose-300">
                <span aria-hidden="true">△</span> 詰めが甘く取り逃した
              </p>
              <p className="text-base font-bold leading-relaxed text-rose-200 motion-safe:animate-[fadeSlideIn_0.25s_ease-out]">
                <RichText text={result.tierResultText} />
              </p>
            </div>
          )}

          {/* 3) 心得の新規獲得 ── 新たに獲得した心得を前面に大きく表示。 */}
          {headlineKind === 'precept' && result.newPreceptIds.length > 0 && (
            <div className="space-y-2 rounded-xl border border-[var(--accent)]/40 bg-[var(--accent)]/10 px-4 py-3 ring-1 ring-[var(--accent)]/40">
              <p className="text-[11px] font-semibold text-amber-300">心得を獲得</p>
              {result.precepts
                .filter((id) => result.newPreceptIds.includes(id))
                .map((id) => {
                  const p = PRECEPT_BY_ID[id]
                  if (!p) return null
                  return (
                    <div key={id} className="flex items-start gap-2">
                      <span className="mt-0.5 shrink-0 tabular-nums text-[11px] text-amber-300/80">#{id}</span>
                      <span className="text-base font-bold leading-relaxed text-[var(--text)]">{p.text}</span>
                    </div>
                  )
                })}
            </div>
          )}

          {/* 4) 顧客価値の伸び ── バックログレビューの valueGain を主役に。 */}
          {headlineKind === 'valueGain' && (result.backlogReview?.valueGain ?? 0) > 0 && (
            <div className="flex items-center justify-between rounded-xl border border-[var(--accent)]/40 bg-[var(--accent)]/10 px-4 py-3 ring-1 ring-[var(--accent)]/40">
              <p className="text-sm font-semibold text-amber-100">このスプリントで伸ばした顧客価値</p>
              <span className="text-2xl font-bold tabular-nums text-amber-300">
                ▲ +{result.backlogReview?.valueGain}
              </span>
            </div>
          )}

          {/* 5) 文化の着地 ── culture+ の選択かつ cultureメーターが定着域（≥6）に達した瞬間を祝う。 */}
          {headlineKind === 'cultureLand' && (
            <p role="status" aria-live="polite" className="text-center text-lg font-bold text-emerald-300">
              <span aria-hidden="true">🌱</span> 文化が、根付いた
            </p>
          )}

          {/* 6) normal ── resultText の冒頭1文を主役に据えてレイアウトを逆転させる。
              メーター差分バッジは小型右寄せに縮小し、「何が起きたか」を前面に出す。
              他の headlineKind では従来どおり「結果」ラベルつきの通常サイズ表示を維持する。 */}
          {headlineKind === 'normal' &&
            (() => {
              const { head, rest } = splitHeadlineSentence(result.resultText)
              return (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)]/30 px-4 py-3">
                  {/* 冒頭1文：主役として大きく */}
                  <p className="text-[17px] font-bold leading-snug text-[var(--text)] motion-safe:animate-[fadeSlideIn_0.25s_ease-out]">
                    <RichText text={head} />
                  </p>
                  {/* 残り文：補足として続ける */}
                  {rest && (
                    <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--text-body)]">
                      <RichText text={rest} />
                    </p>
                  )}
                  {/* メーター差分バッジ：small・右寄せで常に可視 */}
                  <div className="mt-2.5 flex items-center justify-end gap-1.5">
                    <EffectDeltas effects={result.effects} />
                  </div>
                </div>
              )
            })()}

          {/* ─── 選んだ判断 ─── */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)]/40 px-4 py-2.5">
            <p className="text-[11px] font-semibold text-[var(--text-sub)]">あなたの判断</p>
            <p className="text-sm font-medium text-[var(--text)]">
              {result.warn && (
                <span className="mr-1" aria-hidden="true">
                  ⚠
                </span>
              )}
              <RichText text={result.choiceLabel} />
            </p>
          </div>

          {/* 何が起きたか（normal 以外のケースで表示）。
              normal のときは上記のヘッドラインブロックで表示済みなので重複しない。 */}
          {headlineKind !== 'normal' && (
            <div>
              <p className="mb-1 text-[11px] font-semibold text-[var(--text-sub)]">結果</p>
              <p className="text-[15px] leading-relaxed text-[var(--text)]">
                <RichText text={result.resultText} />
              </p>
            </div>
          )}

          {/* tier 依存の「跳ね返りの一文」（greatExit / poorExit 以外のケース）。
              greatExit / poorExit は主役ブロックで表示済みなので重複しない。
              追加情報なので role 付与は不要（見出し構造は破らない）。interactive=false 固定。 */}
          {result.tierResultText && headlineKind !== 'greatExit' && headlineKind !== 'poorExit' && (
            <p className="rounded-lg bg-[var(--panel)]/40 px-3 py-2.5 text-sm leading-relaxed text-[var(--text-body)]">
              <RichText text={result.tierResultText} />
            </p>
          )}

          {/* 実行ミニゲームの出来 */}
          <ExecBadge result={result} />

          {/* メーター増減（normal 時はヘッドラインブロック内に統合済みなのでここでは表示しない） */}
          {headlineKind !== 'normal' && (
            <div className="flex items-center gap-2 border-t border-[var(--panel)] pt-3">
              <span className="text-[11px] font-semibold text-[var(--text-sub)]">メーター</span>
              <EffectDeltas effects={result.effects} />
            </div>
          )}

          {/* トレードオフの明示（機会コストの言語化）。 */}
          <TradeoffNote effects={result.effects} />

          {/* 見抜きボーナス（推理で本音を当てた報酬。その選択の主正メーターに別枠で +）。 */}
          {result.deductionBonus && result.execPrimary ? (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-amber-300">見抜きボーナス</span>
              <span className="rounded-lg bg-amber-500/15 px-2.5 py-1 text-sm font-bold tabular-nums text-amber-200">
                {EFFECT_LABEL[result.execPrimary]} ▲ +{result.deductionBonus}
              </span>
            </div>
          ) : null}

          {/* 心得ブロック（precept が主役の場合は新規獲得済みなので既出チップのみ。
              その他のケースでは新規＋既出チップ両方を通常サイズで表示）。 */}
          {result.precepts.length > 0 && (
            <PreceptsBlock
              precepts={result.precepts}
              newPreceptIds={result.newPreceptIds}
              headlineKind={headlineKind}
            />
          )}

          {/* ─── 副次情報（折りたたみ）────────────────────────────────────
              seed / discoveredPbi / addedPbi / tokenSpent / coverage・debt / backlogReview
              いずれも「あれば展開」の追加情報。aria-expanded+aria-controls でキーボード・SR 対応。
              フォーカス順=DOM順=視覚順を一致させるため、主コンテンツの後に配置。 */}
          {(result.seedId ||
            result.discoveredPbi ||
            result.addedPbi ||
            result.tokenSpent ||
            result.coverageDelta ||
            result.debtDelta ||
            result.backlogReview) && (
            <div className="rounded-xl border border-[var(--border)]">
              <button
                type="button"
                aria-expanded={detailsOpen}
                aria-controls="result-details"
                onClick={() => setDetailsOpen((v) => !v)}
                className="flex w-full cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-[11px] font-semibold text-[var(--text-sub)] hover:text-[var(--text-body)]"
              >
                <span aria-hidden="true">{detailsOpen ? '▼' : '▶'}</span>
                詳細を見る
              </button>
              <div
                id="result-details"
                hidden={!detailsOpen}
                className="space-y-3 border-t border-[var(--border)] px-4 pb-3 pt-3"
              >
                {/* 次の機能の種：現場で掴んだプロダクトの種を発見＝自社SaaSへ還元できる（FDEの本懐）。 */}
                <SeedReveal seedId={result.seedId} seedNew={result.seedNew} />

                {/* ヒアリングで掘り当てた発見可PBI：プロダクトバックログに新たな項目が加わった。 */}
                {result.discoveredPbi && (
                  <div className="space-y-1 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2.5">
                    <p className="text-[11px] font-semibold text-rose-300">
                      現場の声から、新しいバックログ項目が見つかった
                    </p>
                    <p className="text-sm font-medium text-[var(--text)]">『{result.discoveredPbi.title}』</p>
                    <p className="text-[11px] text-[var(--text-sub)]">
                      プロダクトバックログに追加。次のプランニングで優先順位を検討しましょう。
                    </p>
                  </div>
                )}

                {/* イベントで受けた要望PBI：今スプリントへ割り込み（toSprint）か、次のために積んだか で出し分ける。 */}
                {result.addedPbi && (
                  <div
                    className={`space-y-1 rounded-xl border px-4 py-2.5 ${
                      result.addedPbi.toSprint
                        ? 'border-amber-500/50 bg-amber-500/10'
                        : 'border-sky-500/40 bg-sky-500/10'
                    }`}
                  >
                    <p
                      className={`text-[11px] font-semibold ${result.addedPbi.toSprint ? 'text-amber-300' : 'text-sky-300'}`}
                    >
                      {result.addedPbi.toSprint
                        ? '⚠ 割り込みを受けた：今スプリントに要望を差し込んだ'
                        : '要望をプロダクトバックログに積んだ'}
                    </p>
                    <p className="text-sm font-medium text-[var(--text)]">『{result.addedPbi.title}』</p>
                    <p className="text-[11px] text-[var(--text-sub)]">
                      {result.addedPbi.toSprint
                        ? '今スプリントの予測が増えた。1日のレビュー容量を超えれば、その分は終わらず持ち越しに——スプリントゴールを危うくしうる。PO と再交渉し、ゴールを守れる範囲か見極めを。'
                        : '次のプランニングで Ready 化し、優先順位を検討しましょう。今の焦点は守られた。'}
                    </p>
                  </div>
                )}

                {/* 生成AIトークンの消費（AIに頼った選択のみ） */}
                {result.tokenSpent ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-[var(--text-sub)]">AIトークン</span>
                    <span className="rounded-lg bg-cyan-500/15 px-2.5 py-1 text-sm font-bold tabular-nums text-cyan-300">
                      ▼ −{result.tokenSpent}
                    </span>
                  </div>
                ) : null}

                {/* リポジトリ：コード（カバレッジ）／技術的負債の増減 */}
                {result.coverageDelta || result.debtDelta ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-semibold text-[var(--text-sub)]">リポジトリ</span>
                    {result.coverageDelta ? (
                      <span
                        className={`rounded-lg px-2.5 py-1 text-sm font-bold tabular-nums ${result.coverageDelta > 0 ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'}`}
                      >
                        コード {result.coverageDelta > 0 ? '▲ +' : '▼ '}
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
              </div>
            </div>
          )}

          {/* 主CTAはスクロール内容の最下部に sticky 固定し、常に親指の届く位置に置く（HIG） */}
          <div className="sticky bottom-0 -mx-5 -mb-4 border-t border-[var(--border)] bg-[var(--card)]/95 px-5 py-3 pb-safe backdrop-blur">
            <button
              type="button"
              onClick={onContinue}
              data-initial-focus
              className="w-full rounded-xl bg-[var(--accent)] py-3 font-bold text-[var(--bg)] transition hover:bg-[var(--accent-hover)] active:scale-95"
            >
              次へ（Enter）
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
