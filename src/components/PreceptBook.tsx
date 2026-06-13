import { PRECEPTS, PRECEPT_CLUSTERS } from '../data/precepts'
import { useFocusTrap } from '../hooks/useFocusTrap'

interface Props {
  seen: Set<number>
  onClose: () => void
}

export function PreceptBook({ seen, onClose }: Props) {
  const ref = useFocusTrap<HTMLDivElement>(onClose)
  const total = PRECEPTS.length
  const got = PRECEPTS.filter((p) => seen.has(p.id)).length

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="precept-book-title"
        className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"
      >
        <header className="flex items-center justify-between gap-3 border-b border-slate-800 px-5 py-3">
          <h2 id="precept-book-title" className="text-base font-bold text-slate-100">
            <span aria-hidden="true">📖</span> FDE心得手帳
          </h2>
          <span className="text-sm font-bold tabular-nums text-sky-300">
            {got}
            <span className="text-slate-400"> / {total}</span>
          </span>
        </header>

        <p className="px-5 pt-3 text-xs text-slate-400">
          判断の場面で出会った心得が集まります（周回をまたいで記録）。
        </p>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-3">
          {PRECEPT_CLUSTERS.map((cluster) => {
            const items = PRECEPTS.filter((p) => p.cluster === cluster.key)
            const clusterGot = items.filter((p) => seen.has(p.id)).length
            return (
              <section key={cluster.key}>
                <h3 className="mb-1.5 flex items-center justify-between text-xs font-bold text-slate-300">
                  <span>{cluster.label}</span>
                  <span className="tabular-nums text-slate-400">
                    {clusterGot}/{items.length}
                  </span>
                </h3>
                <ul className="space-y-1">
                  {items.map((p) => {
                    const has = seen.has(p.id)
                    return (
                      <li
                        key={p.id}
                        className={`flex items-start gap-2 rounded px-2 py-1 text-xs ${
                          has ? 'bg-slate-800/40 text-slate-100' : 'text-slate-600'
                        }`}
                      >
                        <span className="mt-px shrink-0 tabular-nums text-[10px] text-slate-400">
                          #{p.id}
                        </span>
                        <span>{has ? p.text : '？？？（まだ出会っていない）'}</span>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )
          })}
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
