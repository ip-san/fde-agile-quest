import { useEffect, useState } from 'react'
import { Board } from './components/Board'
import { EndingScreen } from './components/EndingScreen'
import { Finale } from './components/Finale'
import { PwaUpdater } from './components/PwaUpdater'
import { loadLateEvents } from './data/chapters/chapter-01'
import { customerValueBreakdown, repoStats, setEventPool } from './engine/progression'
import { primeAudio } from './engine/sfx'
import { useEngagement } from './store/engagementStore'

export default function App() {
  const {
    status,
    ending,
    meters,
    log,
    result,
    reset,
    finalePending,
    resolveFinale,
    resolvedIds,
    flags,
    aiTokens,
    repoCoverage,
    repoDebt,
    backlogDone,
    valueBaseline,
    valueHistory,
  } = useEngagement()

  // Sprint2/3 のイベントデータを動的チャンクとしてロードし、エンジンに注入する。
  // ゲーム開始直後（Sprint1）はまだ不要だが、進行前に必ず完了させるため即座にロードを開始する。
  const [eventsReady, setEventsReady] = useState(false)
  useEffect(() => {
    let cancelled = false
    loadLateEvents().then((events) => {
      if (!cancelled) {
        setEventPool(events)
        setEventsReady(true)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  // mobile Safari 等の初回無音対策: 最初のユーザー操作で AudioContext を先に生成＋resume する。
  // （primeAudio は冪等。once 相当のリスナ除去で React19/StrictMode の二重実行でも無害）
  useEffect(() => {
    if (typeof window === 'undefined') return
    const unlock = () => {
      primeAudio()
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  // イベントデータのロード待ち（Sprint2/3 は動的チャンク）。通常は初期レンダー直後に完了するが、
  // 完了まではゲーム画面を見せないことで、未ロードのイベントプールへのアクセスを防ぐ。
  if (!eventsReady) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-900" aria-live="polite" aria-busy="true">
        <p className="animate-pulse text-slate-400 text-sm">読み込み中...</p>
      </div>
    )
  }

  // 結果オーバーレイ表示中は、最後の判断の結果を見せ切ってから次へ。
  // 完走後、不正の手がかりを掴んでいれば「暴露の決断」(Finale) → 専用エンディング。
  let screen
  if (status === 'ended' && !result && finalePending) {
    screen = <Finale onResolve={resolveFinale} />
  } else if (status === 'ended' && ending && !result) {
    const rs = repoStats({ resolvedIds, flags, aiTokens, repoCoverage, repoDebt, backlogDone })
    // 顧客価値は内訳から導出（customerValue は breakdown.total と同値＝単一の真実源を呼び側でも守る）
    const bd = customerValueBreakdown(meters, rs.coverage, rs.debtScore, rs.deliveredItems)
    // 第1章は不正を“伏線”として残す。掴んだ深さに応じて次章への引きを出す
    const fraudHint = flags.has('fraudCase') ? 'case' : flags.has('fraudClue') ? 'clue' : 'none'
    screen = (
      <EndingScreen
        ending={ending}
        meters={meters}
        customerValue={bd.total}
        valueBreakdown={bd}
        deliveredItems={rs.deliveredItems}
        valueBaseline={valueBaseline}
        valueHistory={valueHistory}
        fraudHint={fraudHint}
        flags={flags}
        log={log}
        onReset={reset}
      />
    )
  } else {
    screen = <Board />
  }

  return (
    <>
      {screen}
      <PwaUpdater />
    </>
  )
}
