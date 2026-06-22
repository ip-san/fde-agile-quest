import { useEffect } from 'react'
import { Board } from './components/Board'
import { EndingScreen } from './components/EndingScreen'
import { Finale } from './components/Finale'
import { PwaUpdater } from './components/PwaUpdater'
import { customerValueBreakdown, repoStats } from './engine/progression'
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
