import { Board } from './components/Board'
import { EndingScreen } from './components/EndingScreen'
import { useEngagement } from './store/engagementStore'

export default function App() {
  const { status, ending, meters, log, result, reset } = useEngagement()

  // 結果オーバーレイ表示中は、最後の判断の結果を見せ切ってからエンディングへ
  if (status === 'ended' && ending && !result) {
    return <EndingScreen ending={ending} meters={meters} log={log} onReset={reset} />
  }
  return <Board />
}
