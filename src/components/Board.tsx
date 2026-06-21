import { lazy, Suspense, useMemo, useState } from 'react'
import { CEREMONY_LABELS, CEREMONY_SHORT, EVENTS, PRODUCT_GOAL, SPRINTS } from '../data/chapters/chapter-01'
import { hearingThemeFor } from '../data/minigames'
import { PRECEPTS } from '../data/precepts'
import { openThreads } from '../data/threads'
import { GEN_TOKEN_COST } from '../engine/backlog'
import { miniGameKindFor } from '../engine/game'
import { customerValueBreakdown, isRouletteCeremony, repoStats } from '../engine/progression'
import { isMuted, toggleMuted } from '../engine/sfx'
import { readBool, writeBool } from '../lib/persist'
import { seedFor } from '../lib/seed'
import { useEngagement } from '../store/engagementStore'
import type { Ceremony, Choice } from '../types'

// バックログ操作パネルは“開いた時だけ”要るモーダル＝コード分割で初期バンドルから外す（オンデマンド読込）。
const BacklogPanel = lazy(() => import('./BacklogPanel').then((m) => ({ default: m.BacklogPanel })))

import { CustomerValueBar } from './CustomerValueBar'
import { DeductionModal } from './DeductionModal'
import { EventLog } from './EventLog'
import { EventModal } from './EventModal'
import { MeterHUD } from './MeterHUD'
import { MiniGame } from './minigame/MiniGame'
import { PreceptBook } from './PreceptBook'
import { Prologue } from './Prologue'
import { RepoPanel } from './RepoPanel'
import { ResultModal } from './ResultModal'
import { RichText } from './RichText'
import { Roulette } from './Roulette'
import { SecondaryStats } from './SecondaryStats'
import { Travel } from './Travel'

const PROLOGUE_SEEN_KEY = 'fde-agile-quest:prologue-seen'
const prologueSeen = (): boolean => readBool(PROLOGUE_SEEN_KEY)

// 時限選択（LIPS）の設定。既定OFF（学習を妨げないため opt-in）。localStorage 永続。
const TIMED_CHOICE_KEY = 'fde-agile-quest:timed-choice'
const timedChoicePref = (): boolean => readBool(TIMED_CHOICE_KEY)
const setTimedChoicePref = (on: boolean): void => writeBool(TIMED_CHOICE_KEY, on)

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
    foundSeeds,
    peekLocation,
    dailyCandidates,
    aiTokens,
    resolvedIds,
    flags,
    repoCoverage,
    repoDebt,
    backlogDone,
    sprintForecast,
    sprintGoals,
    inProgress,
    greatStreak,
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
  // 効果音のミュート（決定的瞬間の演出音。localStorage に永続化）
  const [muted, setMuted] = useState(isMuted)
  // 時限選択（LIPS）の ON/OFF。既定OFF・opt-in。
  const [timed, setTimed] = useState(timedChoicePref)
  // 選択 → 実行ミニゲーム → 結果。選んだ choice を保持し、ミニゲームの出来を tier として渡す
  const [pendingChoice, setPendingChoice] = useState<Choice | null>(null)
  // 「本音を見抜く」推理の解決状態（イベントIDで管理＝イベントが変われば自動リセット）。
  // 当てると reveal ヒントを選択画面に渡す＝核心が"開く"。
  const [deduction, setDeduction] = useState<{ id: string; correct: boolean } | null>(null)
  // 初回はプロローグを自動表示。以降は「あらすじ」から再生できる
  const [prologueOpen, setPrologueOpen] = useState(prologueSeen() === false)
  const closePrologue = () => {
    writeBool(PROLOGUE_SEEN_KEY, true)
    setPrologueOpen(false)
  }

  const sprint = SPRINTS[Math.min(sprintIndex, SPRINTS.length - 1)]
  const ceremony: Ceremony = sprint.beats[Math.min(beatIndex, sprint.beats.length - 1)]
  const useRoulette = isRouletteCeremony(ceremony)

  // デイリー未着手リマインダーの条件
  // 「To Do が残っている」= sprintForecast に未 done の id がある
  // 「まだ着手していない」= inProgress が空
  // 「打つ手がある」= aiTokens >= GEN_TOKEN_COST（着手できるトークンがある）または inProgress に着手済みがある
  const hasTodo = sprintForecast.some((id) => !backlogDone.includes(id))
  const canStart = aiTokens >= GEN_TOKEN_COST
  const showDevReminder = ceremony === 'daily' && hasTodo && inProgress.length === 0 && canStart

  // イベントに推理があり、まだこのイベントで解いていなければ、選択の前に推理ステップを挟む
  const needsDeduction =
    status === 'event' &&
    !!currentEvent &&
    !result &&
    !pendingChoice &&
    !!currentEvent.deduction &&
    deduction?.id !== currentEvent.id
  // 推理を当てて選択へ来た場合、本音ヒント（reveal）を選択画面に渡す＝核心が"開く"
  const deducedCorrect = !!currentEvent?.deduction && deduction?.id === currentEvent.id && deduction.correct
  const revealHint = deducedCorrect ? currentEvent?.deduction?.reveal : undefined
  // 本音を見抜けた判断には「見抜きボーナス」として理解 +1（store 側で別枠加算・表示）
  const deductionBonus = deducedCorrect ? 1 : 0

  // repoStats / customerValueBreakdown はメモ化して関係ない state 更新での再計算を避ける
  const rs = useMemo(
    () => repoStats({ resolvedIds, flags, aiTokens, repoCoverage, repoDebt, backlogDone }),
    [resolvedIds, flags, aiTokens, repoCoverage, repoDebt, backlogDone]
  )
  const bd = useMemo(
    () => customerValueBreakdown(meters, rs.coverage, rs.debtScore, rs.deliveredItems),
    [meters, rs.coverage, rs.debtScore, rs.deliveredItems]
  )

  // モーダル表示中は背後を支援技術ツリー/操作から外す（aria-modal 任せにしない）
  const modalOpen =
    (status === 'event' && !!currentEvent && !result) || !!result || bookOpen || prologueOpen || repoOpen || backlogOpen

  return (
    <>
      <div
        className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-4 px-safe pt-safe pb-[calc(5rem+env(safe-area-inset-bottom))]"
        inert={modalOpen || undefined}
      >
        {/* ヘッダー：スプリント（見出しだけの1カラム。ユーティリティは下部タブバーへ移動） */}
        <header className="relative">
          {/* 右上のユーティリティ：時限選択トグル＋効果音ミュート。オフィス利用でも調整できるよう常設。 */}
          <div className="absolute right-0 top-0 flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                const next = !timed
                setTimed(next)
                setTimedChoicePref(next)
              }}
              aria-pressed={timed}
              aria-label={timed ? '時限選択をオフにする' : '時限選択をオンにする（時間切れは静観）'}
              title={timed ? '時限選択：ON（時間切れ＝静観）' : '時限選択：OFF'}
              className={`flex h-9 w-9 items-center justify-center rounded-lg text-base transition hover:bg-slate-800 active:scale-95 ${
                timed ? 'text-amber-300' : 'text-slate-500'
              }`}
            >
              <span aria-hidden="true">⏱</span>
            </button>
            <button
              type="button"
              onClick={() => setMuted(toggleMuted())}
              aria-pressed={muted}
              aria-label={muted ? '効果音をオンにする' : '効果音をオフにする'}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-base text-slate-400 transition hover:bg-slate-800 hover:text-slate-200 active:scale-95"
            >
              <span aria-hidden="true">{muted ? '🔇' : '🔊'}</span>
            </button>
          </div>
          <p className="text-xs text-slate-400">{chapterTitle}</p>
          <h1 className="mt-0.5 pr-20 text-lg font-bold text-slate-100">{sprint.title}</h1>
          {/* プロダクトゴール＝章全体の到達点（PO所有・不変）。各スプリントゴールはこれに連なる。
              スプリントゴールの上に置いて「ゴールの階層（Product→Sprint）」を見せる。 */}
          <p className="mt-1 text-xs text-slate-400">
            <RichText text="{{プロダクトゴール}}" />：<span className="text-violet-300">{PRODUCT_GOAL}</span>
          </p>
          {/* スプリントゴールはプランニングの"成果"。プレイヤーがプランニングで選んだ狙いを表示する。
            未決定（プランニング中）は伏せ、選んだら現す（Scrum: ゴールはプランニングで決まる）。 */}
          <p className="mt-0.5 text-xs text-slate-400">
            ↳ スプリントゴール：
            {(() => {
              const chosen = sprintGoals[sprintIndex]
              if (chosen) return <span className="text-sky-300">{chosen}</span>
              if (ceremony === 'planning') return <span className="text-slate-400">プランニングで決める…</span>
              return <span className="text-sky-300">{sprint.goal}</span>
            })()}
          </p>
        </header>

        {/* HUD：北極星＝顧客価値（目標・大）→ 3メーター（手段・0ルール対象）→ 従ゲージは1行に圧縮 */}
        <CustomerValueBar value={bd.total} breakdown={bd} />
        <MeterHUD meters={meters} />
        <SecondaryStats
          aiTokens={aiTokens}
          coverage={rs.coverage}
          debt={rs.debt}
          onOpenDetail={() => setRepoOpen(true)}
        />
        {/* 会心の連鎖中（2以上）だけ"実装の波"を持続表示。続けて会心するほどコード品質ボーナスが増す。 */}
        {greatStreak >= 2 && (
          <p
            className="-mt-1 text-center text-xs font-semibold text-amber-300"
            role="status"
            aria-label={`会心の連鎖 ${greatStreak} 回。次の会心でコード品質ボーナスが増える`}
          >
            会心 {greatStreak} 連鎖中 — 次も会心ならコード品質ボーナス増
          </p>
        )}
        <p className="-mt-2 text-center text-xs leading-snug text-slate-400">
          どれか1つでも <span className="text-rose-400">0</span> になると案件は終了。削りすぎは命取り。
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
            const dailyNo = b === 'daily' ? sprint.beats.slice(0, i + 1).filter((x) => x === 'daily').length : 0
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
              {/* デイリー未着手リマインダー: ルーレットの直上に表示（非ブロッキング・情報提供のみ） */}
              {showDevReminder && (
                <div
                  role="note"
                  aria-label="開発未着手の注意"
                  className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-sm text-amber-300"
                >
                  <span>今日はまだ開発に手をつけていない。回すと今日が終わる。</span>
                </div>
              )}
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
              {/* プランニングでは"予測（スプリントバックログ）"を組み立てられる。非ブロッキングの誘導。 */}
              {ceremony === 'planning' && (
                <button
                  type="button"
                  onClick={() => setBacklogOpen(true)}
                  className="rounded-lg border border-sky-500/40 bg-sky-500/10 px-4 py-2 text-sm font-semibold text-sky-200 transition hover:bg-sky-500/20 active:scale-95"
                >
                  プロダクトバックログから予測を選ぶ
                </button>
              )}
              {/* デイリーでは、回す前にバックログ（着手・レビュー）を進められる。
                  未着手（showDevReminder）のときは"推奨アクション"として塗りボタン＋パルスで格上げ。
                  既に着手中のときは控えめなアウトライン表示のまま（しつこくしない）。 */}
              {ceremony === 'daily' && hasTodo && (
                <button
                  type="button"
                  onClick={() => setBacklogOpen(true)}
                  className={
                    showDevReminder
                      ? 'rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-slate-100 transition hover:bg-emerald-500 active:scale-95'
                      : 'rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/20 active:scale-95'
                  }
                >
                  バックログを進める（着手 / レビュー）
                </button>
              )}
            </>
          )}
        </div>

        {/* 未回収の伏線（フラグが立ったが回収イベント未解決のもの）。回収先はぼかして緊張だけ可視化。 */}
        {(() => {
          const open = openThreads(flags, (f) => EVENTS.some((e) => e.requiresFlag === f && resolvedIds.has(e.id)))
          if (open.length === 0) return null
          return (
            <section className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3">
              <h2 className="mb-1.5 px-1 text-xs font-semibold text-amber-300">未回収の伏線（{open.length}）</h2>
              <ul className="space-y-1 px-1">
                {open.map((t) => (
                  <li key={t.flag} className="text-xs leading-snug text-slate-300">
                    ・{t.teaser}
                  </li>
                ))}
              </ul>
            </section>
          )
        })()}

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
              リポジトリ
            </button>
            <button
              type="button"
              onClick={() => setBacklogOpen(true)}
              className="flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-1 text-[10px] font-medium text-emerald-200 transition hover:bg-slate-800 active:scale-95"
            >
              バックログ
            </button>
            <button
              type="button"
              onClick={() => setBookOpen(true)}
              className="flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-1 text-[10px] font-medium text-sky-200 transition hover:bg-slate-800 active:scale-95"
            >
              心得 {seenPrecepts.size}/{PRECEPTS.length}
            </button>
            <button
              type="button"
              onClick={() => setPrologueOpen(true)}
              className="flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-1 text-[10px] font-medium text-slate-300 transition hover:bg-slate-800 active:scale-95"
            >
              あらすじ
            </button>
            <button
              type="button"
              onClick={reset}
              className="flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-1 text-[10px] font-medium text-slate-300 transition hover:bg-slate-800 active:scale-95"
            >
              <span className="text-base" aria-hidden="true">
                ↻
              </span>
              最初から
            </button>
          </div>
        </nav>
      </div>

      {/* 本音を見抜く推理（選択の前。当てると本音ヒントを得て選択へ＝核心が開く） */}
      {needsDeduction && currentEvent && (
        <DeductionModal event={currentEvent} onResolve={(correct) => setDeduction({ id: currentEvent.id, correct })} />
      )}

      {/* イベント＝判断モーダル（選択するとミニゲームへ） */}
      {status === 'event' && currentEvent && !result && !pendingChoice && !needsDeduction && (
        <EventModal
          // イベント毎に新規マウントし、時限選択の remaining/firedRef とフォーカストラップを確実にリセット
          key={currentEvent.id}
          event={currentEvent}
          unexpected={unexpected}
          aiTokens={aiTokens}
          revealHint={revealHint}
          timed={timed}
          onChoose={setPendingChoice}
        />
      )}

      {/* 実行ミニゲーム（選択後・結果前）。出来=tier で主正メーターを倍率調整 */}
      {status === 'event' && currentEvent && !result && pendingChoice && (
        <MiniGame
          kind={miniGameKindFor(currentEvent)}
          seed={seedFor(currentEvent.id)}
          theme={currentEvent.hearingTheme ?? hearingThemeFor(currentEvent.segment)}
          hearingOptions={currentEvent.hearingOptions}
          onDone={(tier) => {
            choose(pendingChoice, tier, deductionBonus)
            setPendingChoice(null)
          }}
          onSkip={() => {
            choose(pendingChoice, 'good', deductionBonus)
            setPendingChoice(null)
          }}
        />
      )}

      {/* 結果オーバーレイ（判断直後に一度ちゃんと見せる） */}
      {result && <ResultModal result={result} meters={meters} onContinue={dismissResult} />}

      {/* 心得手帳 */}
      {bookOpen && <PreceptBook seen={seenPrecepts} onClose={() => setBookOpen(false)} />}

      {/* コードリポジトリ状態パネル */}
      {repoOpen && <RepoPanel stats={rs} foundSeeds={foundSeeds} onClose={() => setRepoOpen(false)} />}

      {/* バックログ（プロダクト/スプリント）パネル */}
      {backlogOpen && (
        <Suspense fallback={null}>
          <BacklogPanel onClose={() => setBacklogOpen(false)} />
        </Suspense>
      )}

      {/* プロローグ（初回自動・以降は「あらすじ」から） */}
      {prologueOpen && <Prologue onClose={closePrologue} />}
    </>
  )
}
