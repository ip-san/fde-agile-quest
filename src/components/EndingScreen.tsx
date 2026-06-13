import { MeterHUD } from './MeterHUD'
import type { Epilogue, LogEntry, Meters } from '../types'

interface Props {
  ending: Epilogue
  meters: Meters
  log: LogEntry[]
  onReset: () => void
}

export function EndingScreen({ ending, meters, log, onReset }: Props) {
  const failed = ending.id.startsWith('fail-')

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-6 px-4 py-10">
      <div className="text-center">
        <p
          className={`text-xs font-semibold uppercase tracking-widest ${
            failed ? 'text-rose-400' : 'text-slate-400'
          }`}
        >
          {failed ? 'BAD END — 案件終了' : 'Ending'}
        </p>
        <h1
          className={`mt-2 text-3xl font-bold ${failed ? 'text-rose-300' : 'text-sky-300'}`}
        >
          {failed ? '💀 ' : ''}
          {ending.title}
        </h1>
      </div>

      {failed && (
        <p className="text-center text-xs text-rose-300/80">
          ゲージが1つでも0になると、案件はここで終わる。
        </p>
      )}

      <p
        className={`rounded-2xl border p-5 text-sm leading-relaxed ${
          failed
            ? 'border-rose-500/40 bg-rose-950/30 text-rose-100'
            : 'border-slate-700 bg-slate-900/60 text-slate-200'
        }`}
      >
        {ending.reflection}
      </p>

      <div>
        <p className="mb-2 text-xs font-semibold text-slate-400">最終状態</p>
        <MeterHUD meters={meters} />
      </div>

      <p className="text-center text-xs text-slate-400">
        この案件であなたは {log.length} の判断を下した。
        <br />
        別の判断は、別の結末へ続く。
      </p>

      <button
        type="button"
        onClick={onReset}
        className={`mx-auto rounded-xl px-8 py-3 font-bold text-slate-950 transition active:scale-95 ${
          failed ? 'bg-rose-400 hover:bg-rose-300' : 'bg-sky-500 hover:bg-sky-400'
        }`}
      >
        もう一度、別の判断で挑む
      </button>
    </div>
  )
}
