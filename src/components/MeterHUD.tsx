import { METER_MAX } from '../engine/game'
import type { Meters } from '../types'

interface MeterDef {
  key: keyof Meters
  label: string
  icon: string
  color: string
}

const METER_DEFS: MeterDef[] = [
  { key: 'trust', label: '顧客の信頼', icon: '🤝', color: 'bg-violet-400' },
  { key: 'insight', label: '現場理解', icon: '🔍', color: 'bg-sky-400' },
  { key: 'culture', label: '巻き込み', icon: '🌱', color: 'bg-emerald-400' },
]

export function MeterHUD({ meters }: { meters: Meters }) {
  return (
    <div className="grid grid-cols-3 gap-2" role="group" aria-label="3つのメーター">
      {METER_DEFS.map((d) => (
        <Pips key={d.key} icon={d.icon} label={d.label} value={meters[d.key]} color={d.color} />
      ))}
    </div>
  )
}

function Pips({
  icon,
  label,
  value,
  color,
}: {
  icon: string
  label: string
  value: number
  color: string
}) {
  const critical = value <= 2 // 残りわずか
  const low = value <= 3
  return (
    <div
      className={`rounded-lg px-3 py-2 ${
        critical
          ? 'bg-rose-900/40 ring-1 ring-rose-500/70 motion-safe:animate-pulse'
          : low
            ? 'bg-amber-900/20 ring-1 ring-amber-500/40'
            : 'bg-slate-800/60'
      }`}
    >
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="truncate text-slate-300">
          <span aria-hidden="true">{icon}</span> {label}
        </span>
        <span
          className={`tabular-nums ${critical ? 'font-bold text-rose-300' : 'text-slate-400'}`}
        >
          {critical ? <span aria-hidden="true">⚠</span> : null}
          {value}/{METER_MAX}
        </span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-slate-700"
        role="progressbar"
        aria-label={`${label}${critical ? '（残りわずか）' : ''}`}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={METER_MAX}
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ${critical ? 'bg-rose-400' : color}`}
          style={{ width: `${(value / METER_MAX) * 100}%` }}
        />
      </div>
    </div>
  )
}
