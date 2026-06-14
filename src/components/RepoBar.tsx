import { REPO_COVERAGE_MAX } from '../engine/progression'

interface Props {
  /** テストカバレッジ(0..100)＝コードの健全な積み上げ */
  coverage: number
  /** 技術的負債のレベルとスコア（repoStats 由来） */
  debt: 'low' | 'mid' | 'high'
  debtScore: number
}

const DEBT_LABEL = { low: '低', mid: '中', high: '高' } as const

/** リポジトリの“量と質”をHUDに出すゲージ（3ゲージとは別枠）。
 *  コード（カバレッジ）は良い開発で伸び、技術的負債が高いほど伸びにくい（engine の coverageDrag）。 */
export function RepoBar({ coverage, debt, debtScore }: Props) {
  const covRatio = coverage / REPO_COVERAGE_MAX
  // 負債は score をおおよそ 0..8 の幅で見せる（高=満杯寄り）
  const debtRatio = Math.min(1, debtScore / 8)
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="rounded-lg bg-slate-800/40 px-3 py-2">
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="text-slate-300">
            <span aria-hidden="true">🗂️</span> コード（カバレッジ）
          </span>
          <span className="tabular-nums text-slate-400">{coverage}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-700">
          <div
            className={`h-full rounded-full transition-all duration-500 ${covRatio >= 0.6 ? 'bg-emerald-400' : covRatio >= 0.3 ? 'bg-amber-400' : 'bg-slate-500'}`}
            style={{ width: `${covRatio * 100}%` }}
            role="progressbar"
            aria-label="テストカバレッジ"
            aria-valuenow={coverage}
            aria-valuemin={0}
            aria-valuemax={REPO_COVERAGE_MAX}
          />
        </div>
      </div>

      <div
        className={`rounded-lg px-3 py-2 ${debt === 'high' ? 'bg-rose-900/25 ring-1 ring-rose-500/40' : 'bg-slate-800/40'}`}
      >
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="text-slate-300">
            <span aria-hidden="true">▲</span> 技術的負債
          </span>
          <span className={`font-semibold ${debt === 'high' ? 'text-rose-300' : debt === 'mid' ? 'text-amber-300' : 'text-slate-400'}`}>
            {DEBT_LABEL[debt]}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-700">
          <div
            className={`h-full rounded-full transition-all duration-500 ${debt === 'high' ? 'bg-rose-500' : debt === 'mid' ? 'bg-amber-400' : 'bg-slate-600'}`}
            style={{ width: `${debtRatio * 100}%` }}
            role="progressbar"
            aria-label="技術的負債"
            aria-valuenow={debtScore}
            aria-valuemin={0}
            aria-valuemax={8}
          />
        </div>
        <p className="mt-1 text-[10px] text-slate-500">高いほどコードが積み上がりにくい</p>
      </div>
    </div>
  )
}
