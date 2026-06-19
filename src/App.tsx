import { Board } from './components/Board'
import { EndingScreen } from './components/EndingScreen'
import { Finale } from './components/Finale'
import { PwaUpdater } from './components/PwaUpdater'
import { customerValue, repoStats } from './engine/progression'
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
  } = useEngagement()

  // 結果オーバーレイ表示中は、最後の判断の結果を見せ切ってから次へ。
  // 完走後、不正の手がかりを掴んでいれば「暴露の決断」(Finale) → 専用エンディング。
  let screen
  if (status === 'ended' && !result && finalePending) {
    screen = <Finale onResolve={resolveFinale} />
  } else if (status === 'ended' && ending && !result) {
    const rs = repoStats({ resolvedIds, flags, aiTokens, repoCoverage, repoDebt, backlogDone })
    // 第1章は不正を“伏線”として残す。掴んだ深さに応じて次章への引きを出す
    const fraudHint = flags.has('fraudCase') ? 'case' : flags.has('fraudClue') ? 'clue' : 'none'
    screen = (
      <EndingScreen
        ending={ending}
        meters={meters}
        customerValue={customerValue(meters, rs.coverage, rs.debtScore)}
        deliveredItems={rs.deliveredItems}
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
