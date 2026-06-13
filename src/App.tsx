import { Board } from './components/Board'
import { EndingScreen } from './components/EndingScreen'
import { PwaUpdater } from './components/PwaUpdater'
import { useEngagement } from './store/engagementStore'

export default function App() {
  const { status, ending, meters, log, result, reset } = useEngagement()

  // 結果オーバーレイ表示中は、最後の判断の結果を見せ切ってからエンディングへ
  const screen =
    status === 'ended' && ending && !result ? (
      <EndingScreen ending={ending} meters={meters} log={log} onReset={reset} />
    ) : (
      <Board />
    )

  return (
    <>
      {screen}
      <PwaUpdater />
    </>
  )
}
