import {
  DEMO_HEADING_SUB,
  DEMO_HEADING_TAG,
  DEMO_HEADING_TAG_PLAIN,
  DEMO_HEADING_TITLE,
  type HearingOption,
  type HearingTheme,
  hearingTitleFor,
  persuadeDeckFor,
} from '../../data/minigames'
import { useFocusTrap } from '../../hooks/useFocusTrap'
import type { ExecTier, MiniGameKind, PersuadeContext } from '../../types'
import { RichText } from '../RichText'
import { MiniGameDev } from './MiniGameDev'
import { MiniGameDrill } from './MiniGameDrill'
import { MiniGameHearing } from './MiniGameHearing'
import { MiniGameReview } from './MiniGameReview'

interface Props {
  kind: MiniGameKind
  seed: number
  /** レビュー対象 PBI の id（review のみ使用）。あればタスク内容に一致する作問を出す。 */
  pbiId?: string
  /** 再レビュー／同じ親PBIの別作業項目など"2回目以降"か（review のみ）。true なら題材一致を避けて別の作問を出す。 */
  reviewVariety?: boolean
  /** ヒアリングの問いを相手・場面で変えるテーマ（hearing のみ使用） */
  theme?: HearingTheme
  /** 説得(persuade)の文脈別デッキ（persuade のみ使用）。'demo'＝お披露目。未指定は汎用デッキ。 */
  persuadeContext?: PersuadeContext
  /** イベント固有のヒアリング問い（hearing のみ使用。あればシャッフルして優先提示） */
  hearingOptions?: HearingOption[]
  onDone: (tier: ExecTier) => void
  onSkip: () => void
}

const HEADING: Record<'dev' | 'review' | 'drill', { tag: string; tagPlain: string; title: string; sub?: string }> = {
  dev: { tag: '実行：開発', tagPlain: '実行：開発', title: '手を動かす' },
  review: { tag: '実行：レビュー', tagPlain: '実行：レビュー', title: 'AIの差分を点検する' },
  drill: { tag: '実行：深掘りラリー', tagPlain: '実行：深掘りラリー', title: '返ってきた言葉を捌く' },
}

function buildHeading(
  kind: MiniGameKind,
  theme?: HearingTheme,
  persuadeContext?: PersuadeContext
): { tag: string; tagPlain: string; title: string; sub?: string } {
  if (kind === 'hearing') {
    return { tag: '実行：ヒアリング', tagPlain: '実行：ヒアリング', title: hearingTitleFor(theme) }
  }
  if (kind === 'persuade') {
    if (persuadeContext === 'demo') {
      return {
        tag: DEMO_HEADING_TAG,
        tagPlain: DEMO_HEADING_TAG_PLAIN,
        title: DEMO_HEADING_TITLE,
        sub: DEMO_HEADING_SUB,
      }
    }
    return { tag: '実行：交渉', tagPlain: '実行：交渉', title: hearingTitleFor('persuade') }
  }
  return HEADING[kind]
}

/** 選択後に挟む「実行」ミニゲーム。出来が選択の主正メーターを倍率調整する。Esc/スキップで標準(good)。 */
export function MiniGame({
  kind,
  seed,
  pbiId,
  reviewVariety,
  theme,
  hearingOptions,
  persuadeContext,
  onDone,
  onSkip,
}: Props) {
  const ref = useFocusTrap<HTMLDivElement>(onSkip)
  const h = buildHeading(kind, theme, persuadeContext)
  const isDemo = kind === 'persuade' && persuadeContext === 'demo'

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:px-safe sm:pt-safe sm:pb-safe">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={`${h.tagPlain}：${h.title}`}
        className={`max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border bg-[var(--card)] shadow-2xl sm:max-h-[90vh] sm:rounded-2xl ${isDemo ? 'border-[var(--link)]/40' : 'border-[var(--border)]'}`}
      >
        <header
          className={`flex items-center justify-between gap-2 border-b px-5 py-3 ${isDemo ? 'border-[var(--link)]/20 bg-[var(--link)]/5' : 'border-[var(--panel)]'}`}
        >
          <div>
            <p className="text-[11px] font-semibold tracking-wide text-amber-400">
              <RichText text={h.tag} interactive={false} />
            </p>
            <h2 className="text-base font-bold text-[var(--text)]">{h.title}</h2>
            {h.sub && (
              <p className="mt-0.5 text-[11px] text-[var(--link)]/80" aria-label={h.sub}>
                {h.sub}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onSkip}
            className="inline-flex min-h-[44px] shrink-0 items-center rounded-lg border border-[var(--border)] px-3 py-2 text-xs text-[var(--text-sub)] transition hover:bg-[var(--panel)]"
          >
            スキップ
          </button>
        </header>

        <div className="px-5 pt-4 pb-safe">
          {kind === 'dev' ? (
            <MiniGameDev seed={seed} onResolve={onDone} />
          ) : kind === 'review' ? (
            <MiniGameReview seed={seed} pbiId={pbiId} variety={reviewVariety} onResolve={onDone} />
          ) : kind === 'persuade' ? (
            // 説得＝ヒアリングの選択機構を流用し、価値の論拠デッキを出す。文脈別（'demo'＝お披露目）は
            // 専用デッキへ差し替え、未指定は汎用 PERSUADE_DECK（PO 説得など）のまま。
            // persuadeContext を通すことで MiniGameHearing がリード文・CTA も文脈別に出し分ける。
            <MiniGameHearing
              seed={seed}
              theme="persuade"
              hearingOptions={persuadeDeckFor(persuadeContext)}
              persuadeContext={persuadeContext}
              onResolve={onDone}
            />
          ) : kind === 'drill' ? (
            // 深掘りラリー＝①問い→②返答（即時）→③切り返しの2段。theme でセット選択
            <MiniGameDrill seed={seed} theme={theme} onResolve={onDone} />
          ) : (
            <MiniGameHearing seed={seed} theme={theme} hearingOptions={hearingOptions} onResolve={onDone} />
          )}
          <p className="mt-3 text-center text-xs text-[var(--text-sub)]">
            ※ 出来が、選んだ判断の伸びを上下させる（スキップ＝標準）
          </p>
        </div>
      </div>
    </div>
  )
}
