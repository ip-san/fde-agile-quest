import { ACTION_SHORT } from '../data/chapters/chapter-01'
import type { LogEntry } from '../types'
import { RichText } from './RichText'

export function EventLog({ log }: { log: LogEntry[] }) {
  if (log.length === 0) {
    return (
      <p className="px-1 text-xs text-[var(--text-sub)]">
        💬 セレモニーでルーレットを回すと、起きた出来事がここに残ります。
      </p>
    )
  }
  const recent = [...log].reverse()
  return (
    <ul className="space-y-2">
      {recent.map((e, i) => (
        <li key={log.length - i} className="rounded-lg bg-[var(--panel)]/40 px-3 py-2 text-xs">
          <div className="font-semibold text-[var(--text-body)]">
            <span className="mr-1.5 rounded bg-[var(--border)]/70 px-1.5 py-0.5 text-[10px] text-[var(--text-sub)]">
              S{e.sprint}·{ACTION_SHORT[e.ceremony]}
            </span>
            {e.eventTitle}{' '}
            <span className="text-[var(--text-sub)]">
              → <RichText text={e.choiceLabel} />
            </span>
          </div>
          <div className="mt-0.5 text-[var(--text-sub)]">
            <RichText text={e.resultText} />
          </div>
        </li>
      ))}
    </ul>
  )
}
