import { lazy, Suspense, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { CEREMONY_LABELS, CEREMONY_SHORT, PRODUCT_GOAL, SPRINTS } from '../data/chapters/chapter-01'
import { PRECEPTS } from '../data/precepts'
import { openThreads } from '../data/threads'
import { GEN_TOKEN_COST } from '../engine/backlog'
import { METER_CRITICAL, miniGameKindFor } from '../engine/game'
import { customerValueBreakdown, getEventPool, isRouletteCeremony, repoStats } from '../engine/progression'
import { isMuted, toggleMuted } from '../engine/sfx'
import { hearingThemeFor } from '../lib/hearingTheme'
import { readBool, writeBool } from '../lib/persist'
import { seedFor } from '../lib/seed'
import { useEngagement } from '../store/engagementStore'
import type { Ceremony, Choice, GameEvent, GameFlag, Meters } from '../types'

// バックログ操作パネル・遊び方・都度教示は"開いた時だけ"要るモーダル＝コード分割で初期バンドルから外す。
// MiniGame（hearingミニゲーム系 + review系データ含む）も選択後にのみ表示されるため lazy 化して初期バンドルを軽量化。
const BacklogPanel = lazy(() => import('./BacklogPanel').then((m) => ({ default: m.BacklogPanel })))
const HowToPlay = lazy(() => import('./HowToPlay').then((m) => ({ default: m.HowToPlay })))
const Coachmark = lazy(() => import('./Coachmark').then((m) => ({ default: m.Coachmark })))
const MiniGame = lazy(() => import('./minigame/MiniGame').then((m) => ({ default: m.MiniGame })))

import { COACHMARK_KEYS } from '../data/coachmarks'
import { CustomerValueBar } from './CustomerValueBar'
import { DeductionModal } from './DeductionModal'
import { EventLog } from './EventLog'
import { EventModal } from './EventModal'
import { MeterHUD } from './MeterHUD'
import { PreceptBook } from './PreceptBook'
import { Prologue } from './Prologue'
import { RepoPanel } from './RepoPanel'
import { pickHeadline, ResultModal } from './ResultModal'
import { RichText } from './RichText'
import { Roulette } from './Roulette'
import { SecondaryStats } from './SecondaryStats'
import { SprintIntermission } from './SprintIntermission'
import { Travel } from './Travel'

/** 物語主軸フラグ：S3 の結末を左右する選択（「戻れない分岐点」演出を発火する対象）。
 *  小さなデイリー選択（wrongKpi / borrowedDebt / aiOverreliance 等）は含めない。 */
const PIVOTAL_FLAGS = new Set<GameFlag>([
  'chasedPromise',
  'groundedGoal',
  'topDown',
  'genbaTrust',
  'fraudClue',
  'fraudCase',
])

const PROLOGUE_SEEN_KEY = 'fde-agile-quest:prologue-seen'
const prologueSeen = (): boolean => readBool(PROLOGUE_SEEN_KEY)

// 都度教示（コーチマーク）の既読管理。キーはセレモニー名 or 'intro'。
const coachKeyOf = (k: string): string => `fde-agile-quest:coach:${k}`
const coachSeen = (k: string): boolean => readBool(coachKeyOf(k))
const markCoachSeen = (k: string): void => writeBool(coachKeyOf(k), true)

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
  // 物語主軸フラグを立てる選択かどうか（true なら ResultModal で indigo フラッシュを追加発火）。
  // dismissResult と同時にリセットするため、state として独立管理する。
  const [isPivotalChoice, setIsPivotalChoice] = useState(false)
  // スプリント境界幕間（retro 完了 → 次 planning 突入の間に1枚）。
  // 完了したスプリント番号（1 or 2）を保持。null = 非表示。
  const [pendingIntermission, setPendingIntermission] = useState<number | null>(null)
  // normal 連続カウント（great/poor/precept/valueGain/danger 以外が続く場合）。
  // result が null になった瞬間（= dismissResult が呼ばれた後）に前回 result で判定して更新する。
  const [normalStreak, setNormalStreak] = useState(0)
  // result が null になった時に"前回の result"を参照するため ref で保持する。
  const prevResultRef = useRef<typeof result | null>(null)
  // meters を ref でミラー: pickHeadline 計算に必要だが meters 単独変化で streak が走らないよう dep から外す。
  const metersRef = useRef(meters)
  metersRef.current = meters

  // generation 変化（= reset()）でカウントと ref をクリア。greatStreak は store 側でリセット済み。
  useEffect(() => {
    setNormalStreak(0)
    prevResultRef.current = null
  }, [generation])

  // result が null になった = 結果モーダルが閉じられた瞬間に normalStreak を更新する。
  // 前回の result を prevResultRef から取り出し、headlineKind が normal だったかを判定する。
  useEffect(() => {
    if (result !== null) {
      // result が存在する間は ref を最新に保つ（次の null 化タイミングで使うため）。
      prevResultRef.current = result
      return
    }
    // result が null になった = 直前の result を判定してカウントを更新する。
    const prev = prevResultRef.current
    if (prev === null) return
    // dangerMeters を再現（ResultModal と同じロジック）して pickHeadline に渡す。
    const meterKeys = ['trust', 'insight', 'culture'] as (keyof Meters)[]
    const dangerMeters = meterKeys.filter((k) => (prev.effects[k] ?? 0) < 0 && metersRef.current[k] <= METER_CRITICAL)
    const kind = pickHeadline(prev, dangerMeters, metersRef.current)
    setNormalStreak((prev_) => (kind === 'normal' ? prev_ + 1 : 0))
  }, [result])

  // 「本音を見抜く」推理の解決状態（イベントIDで管理＝イベントが変われば自動リセット）。
  // 当てると reveal ヒントを選択画面に渡す＝核心が"開く"。
  const [deduction, setDeduction] = useState<{ id: string; correct: boolean } | null>(null)
  // 初回（generation===0）かつ未既読のときだけ自動表示。2周目以降は「あらすじ」からのみ開ける
  const [prologueOpen, setPrologueOpen] = useState(generation === 0 && prologueSeen() === false)
  const closePrologue = () => {
    writeBool(PROLOGUE_SEEN_KEY, true)
    setPrologueOpen(false)
  }
  // 「遊び方」リファレンスの開閉。
  const [howToOpen, setHowToOpen] = useState(false)
  // 都度教示の再評価トリガ（既読は localStorage が真実源。閉じたら再レンダーして次の有無を評価）。
  // coachVersion はカウンタ値として useMemo の依存に入れ、dismiss 後の再評価を確実にトリガする。
  // useReducer の dispatch でインクリメントすることで「再評価のトリガ専用」の意図を名前で示す。
  const [coachVersion, forceCoachReeval] = useReducer((v: number) => v + 1, 0)

  const sprint = SPRINTS[Math.min(sprintIndex, SPRINTS.length - 1)]
  const ceremony: Ceremony = sprint.beats[Math.min(beatIndex, sprint.beats.length - 1)]
  const useRoulette = isRouletteCeremony(ceremony)

  // 通算デイリー番号（0始まり）。Travel.tsx の型崩し判定用（描画レイヤー専用・engine 不変）。
  // 各スプリントのビート列から daily の総数を前スプリント分合計し、現スプリント内の daily 番号を加算。
  // ceremony が daily でない状態では Travel は表示されないが型安全のため 0 にフォールバック。
  const dailySeq = (() => {
    const prevDailies = SPRINTS.slice(0, sprintIndex).reduce(
      (acc, sp) => acc + sp.beats.filter((b) => b === 'daily').length,
      0
    )
    if (ceremony !== 'daily') return prevDailies
    const inSprintDailyNo = sprint.beats.slice(0, beatIndex + 1).filter((b) => b === 'daily').length - 1
    return prevDailies + inSprintDailyNo
  })()

  // プランニングの進行ゲート：ゴールを決めたら、スプリントバックログ（予測）を1件以上組むまで開始できない。
  // ＝スプリント計画の成果物（選択した PBI）を必ず作らせる。ゴール選択イベント自体は妨げない。
  const planningGoalSet = ceremony === 'planning' && !!sprintGoals[sprintIndex]
  const sprintBacklogEmpty = sprintForecast.length === 0
  const planningBlocked = planningGoalSet && sprintBacklogEmpty
  const proceedLabel = planningGoalSet ? '▶ スプリントを始める' : '▶ 進める'

  // デイリー未着手リマインダーの条件
  // 「To Do が残っている」= sprintForecast に未 done の id がある
  // 「まだ着手していない」= inProgress が空
  // 「打つ手がある」= aiTokens >= GEN_TOKEN_COST（着手できるトークンがある）または inProgress に着手済みがある
  const doneSet = useMemo(() => new Set(backlogDone), [backlogDone])
  const hasTodo = sprintForecast.some((id) => !doneSet.has(id))
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

  // 都度教示：プロローグ後、その場面で”未読”のコーチマークを1つ出す（intro を最優先、次に現セレモニー）。
  // イベント/移動/結果/他モーダル中は出さない。localStorage が真実源で、coachVersion は閉じた後の再評価用。
  // useMemo で依存を明示し、localStorage.getItem の呼び出しを関係ない state 更新時に省く。
  // 出すコーチマークの”キー”だけを決める（本文は遅延の Coachmark 側が引く＝初期バンドルを軽く）。
  const pendingCoachKey = useMemo(() => {
    // coachVersion は forceCoachReeval() で更新→ localStorage の再評価を強制するトリガ（値は捨てる）
    void coachVersion
    if (prologueOpen || howToOpen || bookOpen || repoOpen || backlogOpen) return null
    if (status !== 'playing' || result || currentEvent) return null
    if (!coachSeen('intro')) return 'intro'
    return COACHMARK_KEYS.includes(ceremony) && !coachSeen(ceremony) ? ceremony : null
  }, [prologueOpen, howToOpen, bookOpen, repoOpen, backlogOpen, status, result, currentEvent, ceremony, coachVersion])

  // 初回の“実行ミニゲーム”だけ、判断→実行の関係を1度説明してから本体を出す（選択直後の「？」を解消）。
  const minigameCoachKey =
    pendingChoice && status === 'event' && currentEvent && !result && !coachSeen('minigame') ? 'minigame' : null
  // いま出すコーチマークのキー（プレイ中のセレモニー教示 or 初回ミニゲーム教示。両者は排他）。
  const activeCoachKey = minigameCoachKey ?? pendingCoachKey

  // モーダル表示中は背後を支援技術ツリー/操作から外す（aria-modal 任せにしない）
  const modalOpen =
    (status === 'event' && !!currentEvent && !result) ||
    !!result ||
    !!pendingIntermission ||
    bookOpen ||
    prologueOpen ||
    repoOpen ||
    backlogOpen ||
    howToOpen ||
    !!activeCoachKey

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
              className={`flex h-9 w-9 items-center justify-center rounded-lg text-base transition hover:bg-[var(--panel)] active:scale-95 ${
                timed ? 'text-amber-300' : 'text-[var(--text-sub)]'
              }`}
            >
              <span aria-hidden="true">⏱</span>
            </button>
            <button
              type="button"
              onClick={() => setMuted(toggleMuted())}
              aria-pressed={muted}
              aria-label={muted ? '効果音をオンにする' : '効果音をオフにする'}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-base text-[var(--text-sub)] transition hover:bg-[var(--panel)] hover:text-[var(--text-body)] active:scale-95"
            >
              <span aria-hidden="true">{muted ? '🔇' : '🔊'}</span>
            </button>
          </div>
          <p className="text-xs text-[var(--text-sub)]">{chapterTitle}</p>
          <h1 className="mt-0.5 pr-20 text-lg font-bold text-[var(--text)]">{sprint.title}</h1>
          {/* プロダクトゴール＝章全体の到達点（PO所有・不変）。各スプリントゴールはこれに連なる。
              スプリントゴールの上に置いて「ゴールの階層（Product→Sprint）」を見せる。 */}
          <p className="mt-1 text-xs text-[var(--text-sub)]">
            <RichText text="{{プロダクトゴール}}" />：<span className="text-violet-300">{PRODUCT_GOAL}</span>
          </p>
          {/* スプリントゴールはプランニングの"成果"。プレイヤーがプランニングで選んだ狙いを表示する。
            未決定（プランニング中）は伏せ、選んだら現す（Scrum: ゴールはプランニングで決まる）。 */}
          <p className="mt-0.5 text-xs text-[var(--text-sub)]">
            ↳ スプリントゴール：
            {(() => {
              const chosen = sprintGoals[sprintIndex]
              if (chosen) return <span className="text-amber-300">{chosen}</span>
              if (ceremony === 'planning') return <span className="text-[var(--text-sub)]">プランニングで決める…</span>
              return <span className="text-amber-300">{sprint.goal}</span>
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
        {/* 着実な連続（normal が3回以上続いている）を可視化。会心の連鎖中は非表示（greatStreak 優先）。 */}
        {greatStreak < 2 && normalStreak >= 3 && (
          <p
            className="-mt-1 text-center text-xs text-slate-400"
            role="status"
            aria-label={`着実な積み上げ ${normalStreak} 回継続中`}
          >
            着実 {normalStreak} 回継続 — 無難でも積み上がっている
          </p>
        )}
        <p className="-mt-2 text-center text-xs leading-snug text-[var(--text-sub)]">
          どれか1つでも <span className="text-rose-400">0</span> になると案件は終了。削りすぎは命取り。
        </p>

        {/* スプリント進捗ドット */}
        <div className="flex items-center gap-2 text-xs text-[var(--text-sub)]">
          <span>Sprint</span>
          {SPRINTS.map((sp, i) => (
            <span
              key={sp.n}
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                i < sprintIndex
                  ? 'bg-[var(--accent)] text-[var(--bg)]'
                  : i === sprintIndex
                    ? 'bg-[var(--accent)]/30 text-amber-200 ring-2 ring-[var(--accent)]'
                    : 'bg-[var(--panel)] text-[var(--text-sub)]'
              }`}
            >
              {sp.n}
            </span>
          ))}
          <span className="text-[var(--text-sub)]">/ 全{SPRINTS.length}</span>
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
                    ? 'bg-[var(--border)]/60 text-[var(--text-sub)]'
                    : state === 'current'
                      ? 'bg-[var(--accent)]/20 text-amber-200 ring-1 ring-[var(--accent)]'
                      : 'bg-[var(--panel)]/40 text-[var(--text-sub)]'
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
                .map((id) => getEventPool().find((e) => e.id === id))
                .filter((e): e is GameEvent => !!e)}
              peekLocation={peekLocation}
              onTravel={arrive}
              dailySeq={dailySeq}
            />
          ) : (
            <>
              <p className="text-sm text-[var(--text-body)]">
                いまは <span className="font-bold text-amber-300">{CEREMONY_LABELS[ceremony]}</span>
                <span className="ml-1 text-xs text-[var(--text-sub)]">
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
                  disabled={status !== 'playing' || !!result || planningBlocked}
                  aria-describedby={planningBlocked ? 'planning-gate-hint' : undefined}
                  data-focus-return
                  className="rounded-xl bg-[var(--accent)] px-10 py-3 text-lg font-bold text-[var(--bg)] shadow-lg shadow-[var(--accent)]/30 transition hover:bg-[var(--accent-hover)] active:scale-95 disabled:cursor-not-allowed disabled:bg-[var(--border-strong)] disabled:text-[var(--text-disabled)] disabled:shadow-none"
                >
                  {proceedLabel}
                </button>
              )}
              {/* プランニングのゲート：ゴールを決めたのに予測が空なら、開始できない理由を示す（ブロッキング誘導）。 */}
              {planningBlocked && (
                <p
                  id="planning-gate-hint"
                  role="note"
                  className="max-w-xs text-center text-xs leading-relaxed text-amber-300"
                >
                  スプリントバックログが空です。スプリントの成果物は「ゴール＋選んだ項目」。下の「プロダクトバックログから予測を選ぶ」で1件以上入れてから開始します。
                </p>
              )}
              {/* プランニングでは"予測（スプリントバックログ）"を組み立てる。空のままでは開始できない（上のゲート）。 */}
              {ceremony === 'planning' && (
                <button
                  type="button"
                  onClick={() => setBacklogOpen(true)}
                  className="rounded-lg border border-amber-400/40 bg-[var(--accent)]/10 px-4 py-2 text-sm font-semibold text-amber-200 transition hover:bg-[var(--accent)]/20 active:scale-95"
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
                      ? 'rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-[var(--bg)] transition hover:bg-emerald-500 active:scale-95'
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
          const open = openThreads(flags, (f) =>
            getEventPool().some((e) => e.requiresFlag === f && resolvedIds.has(e.id))
          )
          if (open.length === 0) return null
          return (
            <section className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3">
              <h2 className="mb-1.5 px-1 text-xs font-semibold text-amber-300">未回収の伏線（{open.length}）</h2>
              <ul className="space-y-1 px-1">
                {open.map((t) => (
                  <li key={t.flag} className="text-xs leading-snug text-[var(--text-body)]">
                    ・{t.teaser}
                  </li>
                ))}
              </ul>
            </section>
          )
        })()}

        {/* イベントログ */}
        <section className="rounded-2xl bg-[var(--card)]/40 p-3">
          <h2 className="mb-2 px-1 text-xs font-semibold text-[var(--text-sub)]">イベントログ</h2>
          <div className="max-h-40 overflow-y-auto">
            <EventLog log={log} />
          </div>
        </section>

        {/* 下部タブバー：ユーティリティをヘッダから移してヘッダの過密を解消。Safe Area 対応。
          モーダル表示中は親が inert になるため無効化される（z は modal=40 の下）。 */}
        <nav
          aria-label="ツール"
          className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border)] bg-[var(--card)]/95 px-safe pb-safe pt-1.5 backdrop-blur"
        >
          <div className="mx-auto flex max-w-2xl items-stretch gap-1">
            <button
              type="button"
              onClick={() => setRepoOpen(true)}
              className="flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-1 text-[10px] font-medium text-cyan-200 transition hover:bg-[var(--panel)] active:scale-95"
            >
              <span className="text-base" aria-hidden="true">
                🗂️
              </span>
              リポジトリ
            </button>
            <button
              type="button"
              onClick={() => setBacklogOpen(true)}
              className="flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-1 text-[10px] font-medium text-emerald-200 transition hover:bg-[var(--panel)] active:scale-95"
            >
              <span className="text-base" aria-hidden="true">
                📋
              </span>
              バックログ
            </button>
            <button
              type="button"
              onClick={() => setHowToOpen(true)}
              className="flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-1 text-[10px] font-medium text-sky-200 transition hover:bg-[var(--panel)] active:scale-95"
            >
              <span className="text-base" aria-hidden="true">
                💡
              </span>
              遊び方
            </button>
            <button
              type="button"
              onClick={() => setBookOpen(true)}
              className="flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-1 text-[10px] font-medium text-amber-200 transition hover:bg-[var(--panel)] active:scale-95"
            >
              <span className="text-base" aria-hidden="true">
                📖
              </span>
              心得 {seenPrecepts.size}/{PRECEPTS.length}
            </button>
            <button
              type="button"
              onClick={() => setPrologueOpen(true)}
              className="flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-1 text-[10px] font-medium text-[var(--text-body)] transition hover:bg-[var(--panel)] active:scale-95"
            >
              <span className="text-base" aria-hidden="true">
                📜
              </span>
              あらすじ
            </button>
            <button
              type="button"
              onClick={reset}
              className="flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-1 text-[10px] font-medium text-[var(--text-body)] transition hover:bg-[var(--panel)] active:scale-95"
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

      {/* イベント＝判断モーダル（選択するとミニゲームへ。deduction イベントは即・結果へ差し替え） */}
      {status === 'event' && currentEvent && !result && !pendingChoice && !needsDeduction && (
        <EventModal
          // イベント毎に新規マウントし、時限選択の remaining/firedRef とフォーカストラップを確実にリセット
          key={currentEvent.id}
          event={currentEvent}
          unexpected={unexpected}
          aiTokens={aiTokens}
          revealHint={revealHint}
          timed={timed}
          onChoose={(choice) => {
            // 物語主軸フラグを立てる選択かどうかを判定してフラッシュ演出フラグを立てる。
            // deduction / 非 deduction どちらにも共通して適用する。
            setIsPivotalChoice(!!choice.setsFlag && PIVOTAL_FLAGS.has(choice.setsFlag))
            if (currentEvent.deduction) {
              // deduction イベント：推理の出来を実行 tier に変換して即・結果へ（ミニゲームを差し替え）。
              // 当てた(great) / 外した(good)。外しても poor にはしない（reveal 喪失が既に代償）。
              // deductionBonus は渡さない（0）＝ tier 昇格と二重取りを避ける。
              choose(choice, deducedCorrect ? 'great' : 'good', 0)
            } else {
              // 非 deduction イベント：従来どおりミニゲームへ
              setPendingChoice(choice)
            }
          }}
        />
      )}

      {/* 実行ミニゲーム（選択後・結果前）。出来=tier で主正メーターを倍率調整。初回は説明コーチマークを先に出す */}
      {/* deduction イベントはここに到達しない（onChoose 内で即 choose 済み） */}
      {status === 'event' && currentEvent && !result && pendingChoice && !minigameCoachKey && (
        <Suspense fallback={null}>
          <MiniGame
            kind={miniGameKindFor(currentEvent)}
            // 周回（generation）をシードに混ぜる＝2周目以降は同じイベントでもヒアリングの問い/dev の並びが変わる
            // （レビュー側の周回多様化と一貫。1周内はイベントが一度しか出ないので体験は安定）。
            seed={seedFor(`${currentEvent.id}:${generation}`)}
            theme={currentEvent.hearingTheme ?? hearingThemeFor(currentEvent.segment)}
            hearingOptions={currentEvent.hearingOptions}
            persuadeContext={currentEvent.persuadeContext}
            onDone={(tier) => {
              choose(pendingChoice, tier, deductionBonus)
              setPendingChoice(null)
            }}
            onSkip={() => {
              choose(pendingChoice, 'good', deductionBonus)
              setPendingChoice(null)
            }}
          />
        </Suspense>
      )}

      {/* 結果オーバーレイ（判断直後に一度ちゃんと見せる） */}
      {result && (
        <ResultModal
          result={result}
          meters={meters}
          isPivotalChoice={isPivotalChoice}
          normalStreak={normalStreak}
          onContinue={() => {
            // 結果を閉じたら isPivotalChoice をリセット（次のイベントに引き継がない）。
            setIsPivotalChoice(false)
            // retro 完了（S1→S2 / S2→S3 の境界）なら幕間を挟む。
            // eventId が "s{N}-retro" の形（S1/S2 のみ。S3 retro はキャンペーン完走→エンディングへ）。
            if (result.ceremony === 'retro') {
              const m = /^s(\d+)-retro/.exec(result.eventId)
              const sprintNo = m ? Number(m[1]) : null
              if (sprintNo !== null && sprintNo < 3) {
                dismissResult()
                setPendingIntermission(sprintNo)
                return
              }
            }
            dismissResult()
          }}
        />
      )}

      {/* スプリント境界幕間（S1→S2 / S2→S3）: retro 完了 → 次スプリントの planning の間に1枚 */}
      {pendingIntermission !== null && (
        <SprintIntermission
          completedSprintNo={pendingIntermission}
          onContinue={() => setPendingIntermission(null)}
          generation={generation}
          flags={flags}
        />
      )}

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

      {/* プロローグ（初回自動・以降は「あらすじ」から。2周目以降は登場人物ページに直行） */}
      {prologueOpen && <Prologue onClose={closePrologue} generation={generation} />}

      {/* 遊び方リファレンス（下部メニュー「遊び方」から・いつでも。オンデマンド読込） */}
      {howToOpen && (
        <Suspense fallback={null}>
          <HowToPlay onClose={() => setHowToOpen(false)} />
        </Suspense>
      )}

      {/* 都度教示：その場面/初回ミニゲームに初めて来たとき1度だけ。閉じたら既読化し再評価。オンデマンド読込。 */}
      {activeCoachKey && (
        <Suspense fallback={null}>
          <Coachmark
            coachKey={activeCoachKey}
            onClose={() => {
              markCoachSeen(activeCoachKey)
              forceCoachReeval()
            }}
          />
        </Suspense>
      )}
    </>
  )
}
