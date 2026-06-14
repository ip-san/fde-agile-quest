import { AI_TOKENS_MAX } from '../engine/progression'
import { useFocusTrap } from '../hooks/useFocusTrap'

interface RepoStats {
  mergedPrs: number
  tokensUsed: number
  tokensLeft: number
  debt: 'low' | 'mid' | 'high'
}

interface Props {
  stats: RepoStats
  onClose: () => void
}

const DEBT_VIEW: Record<RepoStats['debt'], { label: string; tone: string; note: string }> = {
  low: { label: '低（管理下）', tone: 'text-emerald-300', note: '今のところ、手の届く範囲。小さく作り、こまめに直せている。' },
  mid: { label: '中（要注意）', tone: 'text-amber-300', note: '誤ったKPIのツケが、コードの形をして見え始めた。早めに返したい。' },
  high: { label: '高（AI過信のツケ）', tone: 'text-rose-300', note: 'AIに頼り切ったコードが溜まり、中身を誰も把握しきれていない。退化に弱い。' },
}

/** コードリポジトリの“状態パネル”。心得手帳と同じく、積み上がった開発の健康度を見る画面。
 *  新規の永続フィールドを増やさず、既存状態（解決数・フラグ・AIトークン）から導出して表示する。 */
export function RepoPanel({ stats, onClose }: Props) {
  const ref = useFocusTrap<HTMLDivElement>(onClose)
  const debt = DEBT_VIEW[stats.debt]
  const tokenRatio = stats.tokensLeft / AI_TOKENS_MAX

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="repo-panel-title"
        className="flex max-h-[90vh] w-full max-w-md flex-col rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"
      >
        <header className="flex items-center justify-between gap-3 border-b border-slate-800 px-5 py-3">
          <h2 id="repo-panel-title" className="text-base font-bold text-slate-100">
            <span aria-hidden="true">🗂️</span> コードリポジトリ
          </h2>
          <span className="rounded bg-slate-800 px-2 py-0.5 text-xs font-mono text-slate-400">main</span>
        </header>

        <div className="space-y-3 overflow-y-auto px-5 py-4">
          <Row icon="✅" label="マージ済みPR（開発・トラブル対応）">
            <span className="tabular-nums text-slate-100">{stats.mergedPrs}</span>
          </Row>

          <div className="rounded-xl bg-slate-800/40 px-3 py-2.5">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-slate-300">🔋 生成AIトークン残量</span>
              <span className="tabular-nums text-slate-400">
                {stats.tokensLeft}/{AI_TOKENS_MAX}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-700">
              <div
                className={`h-full rounded-full ${tokenRatio <= 0 ? 'bg-rose-500' : tokenRatio <= 0.25 ? 'bg-amber-400' : 'bg-cyan-400'}`}
                style={{ width: `${Math.max(0, tokenRatio) * 100}%` }}
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              使用 {stats.tokensUsed}。尽きるとAIショートカットは選べなくなる（手で作るしかない）。
            </p>
          </div>

          <Row icon="▲" label="技術的負債">
            <span className={`font-semibold ${debt.tone}`}>{debt.label}</span>
          </Row>
          <p className="rounded-lg bg-slate-800/30 px-3 py-2 text-[11px] leading-relaxed text-slate-400">
            {debt.note}
          </p>
        </div>

        <footer className="border-t border-slate-800 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-slate-700 py-2.5 font-bold text-slate-100 transition hover:bg-slate-600 active:scale-95"
          >
            閉じる
          </button>
        </footer>
      </div>
    </div>
  )
}

function Row({ icon, label, children }: { icon: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-800/40 px-3 py-2 text-sm">
      <span className="text-slate-300">
        <span aria-hidden="true">{icon}</span> {label}
      </span>
      {children}
    </div>
  )
}
