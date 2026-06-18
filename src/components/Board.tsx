import { useState } from 'react'
import { CEREMONY_LABELS, CEREMONY_SHORT, EVENTS, SPRINTS } from '../data/chapters/chapter-01'
import { PRECEPTS } from '../data/precepts'
import { hearingThemeFor } from '../data/minigames'
import { miniGameKindFor } from '../engine/game'
import { customerValue, isRouletteCeremony, repoStats } from '../engine/progression'
import { useEngagement } from '../store/engagementStore'
import type { Choice, Ceremony } from '../types'
import { BacklogPanel } from './BacklogPanel'
import { CustomerValueBar } from './CustomerValueBar'
import { SecondaryStats } from './SecondaryStats'
import { EventLog } from './EventLog'
import { EventModal } from './EventModal'
import { MeterHUD } from './MeterHUD'
import { MiniGame } from './minigame/MiniGame'
import { PreceptBook } from './PreceptBook'
import { Prologue } from './Prologue'
import { RepoPanel } from './RepoPanel'
import { ResultModal } from './ResultModal'
import { Roulette } from './Roulette'
import { Travel } from './Travel'

/** イベントIDから決定的なシード（ミニゲームの内容選択用） */
function seedFor(id: string): number {
  let s = 0
  for (let i = 0; i < id.length; i++) s = (s * 31 + id.charCodeAt(i)) >>> 0
  return s
}

const PROLOGUE_SEEN_KEY = 'fde-agile-quest:prologue-seen'
function prologueSeen(): boolean {
  try {
    return !!localStorage.getItem(PROLOGUE_SEEN_KEY)
  } catch {
    return false
  }
}

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
    seenPrecepts,
    peekLocation,
    dailyCandidates,
    aiTokens,
    resolvedIds,
    flags,
    repoCoverage,
    repoDebt,
    sprintGoals,
    spin,
    arrive,
    proceed,
    choose,
    dismissResult,
    reset,
  } = useEngagement()
  const [bookOpen, setBookOpen] = useState(false)
  const [repoOpen, setRepoOpen] = useState(false)
  const [backlogOpen, setBacklogOpen] = useState(false)
  // 選択 → 実行ミニゲーム → 結果。選んだ choice を保持し、ミニゲームの出来を tier として渡す
  const [pendingChoice, setPendingChoice] = useState<Choice | null>(null)
  // 初回はプロローグを自動表示。以降は「あらすじ」から再生できる
  const [prologueOpen, setPrologueOpen] = useState(prologueSeen() === false)
  const closePrologue = () => {
    try {
      localStorage.setItem(PROLOGUE_SEEN_KEY, '1')
    } catch {
      /* noop */
    }
    setPrologueOpen(false)
  }

  const sprint = SPRINTS[Math.min(sprintIndex, SPRINTS.length - 1)]
  const ceremony: Ceremony = sprint.beats[Math.min(beatIndex, sprint.beats.length - 1)]
  const useRoulette = isRouletteCeremony(ceremony)

  // モーダル表示中は背後を支援技術ツリー/操作から外す（aria-modal 任せにしない）
  const modalOpen =
    (status === 'event' && !!currentEvent && !result) ||
    !!result ||
    bookOpen ||
    prologueOpen ||
    repoOpen ||
    backlogOpen

  return (
    <>
      <div
        className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-4 px-safe pt-safe pb-[calc(5rem+env(safe-area-inset-bottom))]"
        inert={modalOpen || undefined}
      >
      {/* ヘッダー：スプリント（見出しだけの1カラム。ユーティリティは下部タブバーへ移動） */}
      <header>
        <p className="text-xs text-slate-400">{chapterTitle}</p>
        <h1 className="mt-0.5 text-lg font-bold text-slate-100">{sprint.title}</h1>
        {/* スプリントゴールはプランニングの“成果”。プレイヤーがプランニングで選んだ狙いを表示する。
            未決定（プランニング中）は伏せ、選んだら現す（Scrum: ゴールはプランニングで決まる）。 */}
        <p className="mt-0.5 text-xs text-slate-400">
          🎯 スプリントゴール：
          {(() => {
            const chosen = sprintGoals[sprintIndex]
            if (chosen) return <span className="text-sky-300">{chosen}</span>
            if (ceremony === 'planning')
              return <span className="text-slate-500">プランニングで決める…</span>
            return <span className="text-sky-300">{sprint.goal}</span>
          })()}
        </p>
      </header>

      {/* HUD：北極星＝顧客価値（目標・大）→ 3メーター（手段・0ルール対象）→ 従ゲージは1行に圧縮 */}
      {(() => {
        const rs = repoStats({ resolvedIds, flags, aiTokens, repoCoverage, repoDebt })
        return (
          <>
            <CustomerValueBar value={customerValue(meters, rs.coverage, rs.debtScore)} />
            <MeterHUD meters={meters} />
            <SecondaryStats
              aiTokens={aiTokens}
              coverage={rs.coverage}
              debt={rs.debt}
              onOpenDetail={() => setRepoOpen(true)}
            />
          </>
        )
      })()}
      <p className="-mt-2 text-center text-xs leading-snug text-slate-400">
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
                  : 'bg-slate-800 text-slate-400'
            }`}
          >
            {sp.n}
          </span>
        ))}
        <span className="text-slate-400">/ 全{SPRINTS.length}</span>
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
              className={`flex-1 shrink-0 whitespace-nowrap rounded-lg px-1.5 py-1.5 text-center text-[11px] font-semibold min-w-[2.75rem] ${
                state === 'done'
                  ? 'bg-slate-700/60 text-slate-400'
                  : state === 'current'
                    ? 'bg-sky-500/20 text-sky-200 ring-1 ring-sky-400'
                    : 'bg-slate-800/40 text-slate-400'
              }`}
              title={b === 'daily' ? `${CEREMONY_LABELS[b]} ${dailyNo}日目` : CEREMONY_LABELS[b]}
            >
              {state === 'done' ? '✓' : ''}
              {label}
            </div>
          )
        })}
      </div>

      {/* 現在のセレモニー + ルーレット/マップ/進める */}
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-2">
        {status === 'travel' ? (
          <Travel
            candidates={dailyCandidates
              .map((id) => EVENTS.find((e) => e.id === id))
              .filter((e): e is (typeof EVENTS)[number] => !!e)}
            peekLocation={peekLocation}
            onTravel={arrive}
          />
        ) : (
          <>
            <p className="text-sm text-slate-300">
              いまは <span className="font-bold text-sky-300">{CEREMONY_LABELS[ceremony]}</span>
              <span className="ml-1 text-xs text-slate-400">
                {useRoulette ? '— 回して、その日の出来事を見る' : '— 進めて始める'}
              </span>
            </p>
            {useRoulette ? (
              <Roulette key={generation} disabled={status !== 'playing' || !!result} onResult={spin} />
            ) : (
              <button
                type="button"
                onClick={proceed}
                disabled={status !== 'playing' || !!result}
                data-focus-return
                className="rounded-xl bg-sky-500 px-10 py-3 text-lg font-bold text-slate-950 shadow-lg shadow-sky-500/30 transition hover:bg-sky-400 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-400 disabled:shadow-none"
              >
                ▶ 進める
              </button>
            )}
            {/* プランニングでは“予測（スプリントバックログ）”を組み立てられる。非ブロッキングの誘導。 */}
            {ceremony === 'planning' && (
              <button
                type="button"
                onClick={() => setBacklogOpen(true)}
                className="rounded-lg border border-sky-500/40 bg-sky-500/10 px-4 py-2 text-sm font-semibold text-sky-200 transition hover:bg-sky-500/20 active:scale-95"
              >
                📋 スプリントバックログに予測を入れる
              </button>
            )}
          </>
        )}
      </div>

      {/* イベントログ */}
      <section className="rounded-2xl bg-slate-900/40 p-3">
        <h2 className="mb-2 px-1 text-xs font-semibold text-slate-400">イベントログ</h2>
        <div className="max-h-40 overflow-y-auto">
          <EventLog log={log} />
        </div>
      </section>

      {/* 下部タブバー：ユーティリティをヘッダから移してヘッダの過密を解消。Safe Area 対応。
          モーダル表示中は親が inert になるため無効化される（z は modal=40 の下）。 */}
      <nav
        aria-label="ツール"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-800 bg-slate-900/95 px-safe pb-safe pt-1.5 backdrop-blur"
      >
        <div className="mx-auto flex max-w-2xl items-stretch gap-1">
          <button
            type="button"
            onClick={() => setRepoOpen(true)}
            className="flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-1 text-[10px] font-medium text-cyan-200 transition hover:bg-slate-800 active:scale-95"
          >
            <span className="text-base" aria-hidden="true">🗂️</span>
            リポジトリ
          </button>
          <button
            type="button"
            onClick={() => setBacklogOpen(true)}
            className="flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-1 text-[10px] font-medium text-emerald-200 transition hover:bg-slate-800 active:scale-95"
          >
            <span className="text-base" aria-hidden="true">📋</span>
            バックログ
          </button>
          <button
            type="button"
            onClick={() => setBookOpen(true)}
            className="flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-1 text-[10px] font-medium text-sky-200 transition hover:bg-slate-800 active:scale-95"
          >
            <span className="text-base" aria-hidden="true">📖</span>
            心得 {seenPrecepts.size}/{PRECEPTS.length}
          </button>
          <button
            type="button"
            onClick={() => setPrologueOpen(true)}
            className="flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-1 text-[10px] font-medium text-slate-300 transition hover:bg-slate-800 active:scale-95"
          >
            <span className="text-base" aria-hidden="true">📜</span>
            あらすじ
          </button>
          <button
            type="button"
            onClick={reset}
            className="flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-1 text-[10px] font-medium text-slate-300 transition hover:bg-slate-800 active:scale-95"
          >
            <span className="text-base" aria-hidden="true">↻</span>
            最初から
          </button>
        </div>
      </nav>
      </div>

      {/* イベント＝判断モーダル（選択するとミニゲームへ） */}
      {status === 'event' && currentEvent && !result && !pendingChoice && (
        <EventModal
          event={currentEvent}
          unexpected={unexpected}
          aiTokens={aiTokens}
          onChoose={setPendingChoice}
        />
      )}

      {/* 実行ミニゲーム（選択後・結果前）。出来=tier で主正メーターを倍率調整 */}
      {status === 'event' && currentEvent && !result && pendingChoice && (
        <MiniGame
          kind={miniGameKindFor(currentEvent)}
          seed={seedFor(currentEvent.id)}
          theme={hearingThemeFor(currentEvent.segment)}
          onDone={(tier) => {
            choose(pendingChoice, tier)
            setPendingChoice(null)
          }}
          onSkip={() => {
            choose(pendingChoice, 'good')
            setPendingChoice(null)
          }}
        />
      )}

      {/* 結果オーバーレイ（判断直後に一度ちゃんと見せる） */}
      {result && <ResultModal result={result} onContinue={dismissResult} />}

      {/* 心得手帳 */}
      {bookOpen && <PreceptBook seen={seenPrecepts} onClose={() => setBookOpen(false)} />}

      {/* コードリポジトリ状態パネル */}
      {repoOpen && (
        <RepoPanel
          stats={repoStats({ resolvedIds, flags, aiTokens, repoCoverage, repoDebt })}
          onClose={() => setRepoOpen(false)}
        />
      )}

      {/* バックログ（プロダクト/スプリント）パネル */}
      {backlogOpen && <BacklogPanel onClose={() => setBacklogOpen(false)} />}

      {/* プロローグ（初回自動・以降は「あらすじ」から） */}
      {prologueOpen && <Prologue onClose={closePrologue} />}
    </>
  )
}
