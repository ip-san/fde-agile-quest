import { METER_META } from '../data/meters'
import { METER_CRITICAL, METER_MAX } from '../engine/game'
import type { MeterKey, Meters } from '../types'

const METER_ORDER: MeterKey[] = ['trust', 'insight', 'culture']

export function MeterHUD({ meters }: { meters: Meters }) {
  return (
    <div className="grid grid-cols-3 gap-2" role="group" aria-label="3つのメーター">
      {METER_ORDER.map((k) => (
        <Pips
          key={k}
          icon={METER_META[k].icon}
          label={METER_META[k].short}
          value={meters[k]}
          color={METER_META[k].bar}
        />
      ))}
    </div>
  )
}

function Pips({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  const critical = value <= METER_CRITICAL // 残りわずか
  const low = value <= METER_CRITICAL + 1
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
        <span className={`tabular-nums ${critical ? 'font-bold text-rose-300' : 'text-slate-400'}`}>
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
