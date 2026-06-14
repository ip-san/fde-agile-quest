import { AI_TOKENS_MAX, REPO_COVERAGE_MAX } from '../engine/progression'

interface Props {
  aiTokens: number
  coverage: number
  debt: 'low' | 'mid' | 'high'
  /** タップで詳細（リポジトリ状態パネル）を開く */
  onOpenDetail: () => void
}

const DEBT_LABEL = { low: '低', mid: '中', high: '高' } as const
const DEBT_TONE = { low: 'text-slate-300', mid: 'text-amber-300', high: 'text-rose-300' } as const

/** “手段”ゲージのうち、0ルール対象でない従ゲージ（AIトークン／コード／負債）を1行に圧縮表示。
 *  常時フル展開はやめ、タップで詳細パネルへ（HUDの過密を解消・北極星と3メーターを主役に）。 */
export function SecondaryStats({ aiTokens, coverage, debt, onOpenDetail }: Props) {
  const tokenRatio = aiTokens / AI_TOKENS_MAX
  const tokenTone = tokenRatio <= 0 ? 'text-rose-300' : tokenRatio <= 0.25 ? 'text-amber-300' : 'text-cyan-300'
  return (
    <button
      type="button"
      onClick={onOpenDetail}
      aria-label="リポジトリの詳細（AIトークン・カバレッジ・技術的負債）を開く"
      className="flex min-h-[40px] w-full items-center gap-1 rounded-lg bg-slate-800/40 px-3 py-1.5 text-xs transition hover:bg-slate-800/70"
    >
      <span className={`flex items-center gap-1 tabular-nums ${tokenTone}`}>
        <span aria-hidden="true">🔋</span>
        {aiTokens}
      </span>
      <span className="text-slate-600" aria-hidden="true">
        ·
      </span>
      <span className="flex items-center gap-1 tabular-nums text-slate-300">
        <span aria-hidden="true">🗂️</span>
        {coverage}
        <span className="text-slate-500">/{REPO_COVERAGE_MAX}</span>
      </span>
      <span className="text-slate-600" aria-hidden="true">
        ·
      </span>
      <span className={`flex items-center gap-1 ${DEBT_TONE[debt]}`}>
        <span aria-hidden="true">▲</span>
        負債{DEBT_LABEL[debt]}
      </span>
      <span className="ml-auto text-slate-500">詳細 ›</span>
    </button>
  )
}
