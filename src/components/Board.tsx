import { CEREMONY_LABELS, CEREMONY_SHORT, SPRINTS } from '../data/chapters/chapter-01'
import { useEngagement } from '../store/engagementStore'
import type { Ceremony } from '../types'
import { EventLog } from './EventLog'
import { EventModal } from './EventModal'
import { MeterHUD } from './MeterHUD'
import { ResultModal } from './ResultModal'
import { Roulette } from './Roulette'

export function Board() {
  const {
    chapterTitle,
    meters,
    sprintIndex,
    beatIndex,
    log,
    status,
    currentEvent,
    unexpected,
    result,
    generation,
    spin,
    choose,
    dismissResult,
    reset,
  } = useEngagement()

  const sprint = SPRINTS[Math.min(sprintIndex, SPRINTS.length - 1)]
  const ceremony: Ceremony = sprint.beats[Math.min(beatIndex, sprint.beats.length - 1)]

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-4 px-4 py-4">
      {/* ヘッダー：スプリント */}
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-slate-500">{chapterTitle}</p>
          <h1 className="mt-0.5 text-lg font-bold text-slate-100">{sprint.title}</h1>
          <p className="mt-0.5 text-xs text-slate-400">
            🎯 スプリントゴール：<span className="text-sky-300">{sprint.goal}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={reset}
          className="shrink-0 rounded-lg border border-slate-700 px-2.5 py-1 text-xs text-slate-400 transition hover:bg-slate-800"
        >
          最初から
        </button>
      </header>

      {/* メーターHUD */}
      <MeterHUD meters={meters} />
      <p className="-mt-2 text-center text-[11px] text-slate-500">
        ⚠ 3つのゲージは、どれか1つでも <span className="text-rose-400">0</span> になると案件は終了。
        差し引きプラスでも、削りすぎは命取り。
      </p>

      {/* スプリント進捗ドット */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <span>Sprint</span>
        {SPRINTS.map((sp, i) => (
          <span
            key={sp.n}
            className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
              i < sprintIndex
                ? 'bg-sky-500 text-slate-950'
                : i === sprintIndex
                  ? 'bg-sky-400/30 text-sky-200 ring-2 ring-sky-400'
                  : 'bg-slate-800 text-slate-500'
            }`}
          >
            {sp.n}
          </span>
        ))}
        <span className="text-slate-500">/ 全{SPRINTS.length}</span>
      </div>

      {/* セレモニー・トラック（現スプリント内の進行） */}
      <div className="flex gap-1 overflow-x-auto">
        {sprint.beats.map((b, i) => {
          const state = i < beatIndex ? 'done' : i === beatIndex ? 'current' : 'todo'
          // デイリーは Day1..Day5 と通し番号を振る
          const dailyNo =
            b === 'daily' ? sprint.beats.slice(0, i + 1).filter((x) => x === 'daily').length : 0
          const label = b === 'daily' ? `D${dailyNo}` : CEREMONY_SHORT[b]
          return (
            <div
              key={`${b}-${i}`}
              className={`min-w-0 flex-1 rounded-lg px-1.5 py-1.5 text-center text-[11px] font-semibold ${
                state === 'done'
                  ? 'bg-slate-700/60 text-slate-400'
                  : state === 'current'
                    ? 'bg-sky-500/20 text-sky-200 ring-1 ring-sky-400'
                    : 'bg-slate-800/40 text-slate-500'
              }`}
              title={b === 'daily' ? `${CEREMONY_LABELS[b]} ${dailyNo}日目` : CEREMONY_LABELS[b]}
            >
              {state === 'done' ? '✓' : ''}
              {label}
            </div>
          )
        })}
      </div>

      {/* 現在のセレモニー + ルーレット */}
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-2">
        <p className="text-sm text-slate-300">
          いまは <span className="font-bold text-sky-300">{CEREMONY_LABELS[ceremony]}</span>
          <span className="ml-1 text-xs text-slate-500">— 回して始める</span>
        </p>
        <Roulette key={generation} disabled={status !== 'playing' || !!result} onResult={spin} />
      </div>

      {/* イベントログ */}
      <section className="rounded-2xl bg-slate-900/40 p-3">
        <h2 className="mb-2 px-1 text-xs font-semibold text-slate-400">イベントログ</h2>
        <div className="max-h-40 overflow-y-auto">
          <EventLog log={log} />
        </div>
      </section>

      {/* イベント＝判断モーダル */}
      {status === 'event' && currentEvent && !result && (
        <EventModal event={currentEvent} unexpected={unexpected} onChoose={choose} />
      )}

      {/* 結果オーバーレイ（判断直後に一度ちゃんと見せる） */}
      {result && <ResultModal result={result} onContinue={dismissResult} />}
    </div>
  )
}
