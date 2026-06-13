import { Board } from './components/Board'
import { EndingScreen } from './components/EndingScreen'
import { Finale } from './components/Finale'
import { PwaUpdater } from './components/PwaUpdater'
import { useEngagement } from './store/engagementStore'

export default function App() {
  const { status, ending, meters, log, result, reset, finalePending, resolveFinale } = useEngagement()

  // 結果オーバーレイ表示中は、最後の判断の結果を見せ切ってから次へ。
  // 完走後、不正の手がかりを掴んでいれば「暴露の決断」(Finale) → 専用エンディング。
  let screen
  if (status === 'ended' && !result && finalePending) {
    screen = <Finale onResolve={resolveFinale} />
  } else if (status === 'ended' && ending && !result) {
    screen = <EndingScreen ending={ending} meters={meters} log={log} onReset={reset} />
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
