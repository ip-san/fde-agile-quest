import { AI_TOKENS_MAX } from '../engine/progression'

/** 生成AIの残りトークン（消費型リソース）のバー。3ゲージとは別枠＝0でも即失敗ではないが、
 *  尽きるとAIショートカットが封印される（EventModal が tokenCost 不足の選択を無効化）。 */
export function AiTokenBar({ aiTokens }: { aiTokens: number }) {
  const ratio = aiTokens / AI_TOKENS_MAX
  const depleted = aiTokens <= 0
  const low = ratio <= 0.25
  const barColor = depleted ? 'bg-rose-500' : low ? 'bg-amber-400' : 'bg-cyan-400'
  return (
    <div
      className={`rounded-lg px-3 py-2 ${
        depleted ? 'bg-rose-900/30 ring-1 ring-rose-500/50' : low ? 'bg-amber-900/15 ring-1 ring-amber-500/30' : 'bg-slate-800/40'
      }`}
    >
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-slate-300">
          <span aria-hidden="true">🔋</span> 生成AIトークン
          {depleted && <span className="ml-1 font-semibold text-rose-300">（枯渇＝AI封印）</span>}
        </span>
        <span className={`tabular-nums ${depleted ? 'font-bold text-rose-300' : low ? 'text-amber-300' : 'text-slate-400'}`}>
          {aiTokens}/{AI_TOKENS_MAX}
        </span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-slate-700"
        role="progressbar"
        aria-label="生成AIの残りトークン"
        aria-valuenow={aiTokens}
        aria-valuemin={0}
        aria-valuemax={AI_TOKENS_MAX}
        aria-valuetext={`${aiTokens}/${AI_TOKENS_MAX}（${depleted ? '枯渇・AI封印' : low ? '残りわずか' : '十分'}）`}
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${Math.max(0, ratio) * 100}%` }}
        />
      </div>
    </div>
  )
}
