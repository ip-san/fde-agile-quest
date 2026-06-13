// ───────────────────────────────────────────────────────────
// 進行ロジック（純粋関数）。localStorage / zustand / 乱数源に依存しない。
// store はこれらを呼ぶ薄いラッパに徹し、ここを game.test と同様に単体テストする。
// ───────────────────────────────────────────────────────────
import { ENDINGS, EVENTS, FAILURE_EPILOGUES, SPRINTS } from '../data/chapters/chapter-01'
import { availableEvents, drawEvent, evaluateEnding, resolveChoice } from './game'
import type {
  Ceremony,
  Choice,
  Epilogue,
  GameEvent,
  GameFlag,
  LogEntry,
  MeterKey,
  Meters,
  ResultView,
  Segment,
  Status,
} from '../types'

/** 進行の中核状態（永続化対象＋導出フィールド）。UIアクション関数は含まない */
export interface ProgressCore {
  meters: Meters
  flags: Set<GameFlag>
  resolvedIds: Set<string>
  log: LogEntry[]
  sprintIndex: number
  beatIndex: number
  status: Status
  ending: Epilogue | null
  currentEvent: GameEvent | null
  unexpected: boolean
  result: ResultView | null
}

/** localStorage に保存する最小形 */
export interface Persisted {
  meters: Meters
  sprintIndex: number
  beatIndex: number
  resolvedIds: string[]
  flags: GameFlag[]
  log: LogEntry[]
}

const METER_KEYS: MeterKey[] = ['trust', 'insight', 'culture']

/** 0以下になったメーターがあれば最初のキーを返す（探索順 trust→insight→culture） */
export function zeroedMeter(m: Meters): MeterKey | undefined {
  return METER_KEYS.find((k) => m[k] <= 0)
}

export function ceremonyAt(sprintIndex: number, beatIndex: number): Ceremony | null {
  const sprint = SPRINTS[sprintIndex]
  if (!sprint) return null
  return sprint.beats[beatIndex] ?? null
}

export function freshCore(starting: Meters): ProgressCore {
  return {
    meters: { ...starting },
    flags: new Set<GameFlag>(),
    resolvedIds: new Set<string>(),
    log: [],
    sprintIndex: 0,
    beatIndex: 0,
    status: 'playing',
    ending: null,
    currentEvent: null,
    unexpected: false,
    result: null,
  }
}

/** ビートを1つ進め、スプリント／キャンペーンの終端を判定する */
export function advanceCore(core: ProgressCore, result: ResultView | null = null): ProgressCore {
  let sprintIndex = core.sprintIndex
  let beatIndex = core.beatIndex + 1

  if (beatIndex >= SPRINTS[sprintIndex].beats.length) {
    sprintIndex += 1
    beatIndex = 0
  }

  const base = { ...core, sprintIndex, beatIndex, currentEvent: null, unexpected: false, result }

  if (sprintIndex >= SPRINTS.length) {
    return { ...base, status: 'ended', ending: evaluateEnding(ENDINGS, core.meters) }
  }
  return { ...base, status: 'playing', ending: null }
}

/** ルーレット結果セグメントから現セレモニーのイベントを引く */
export function spinCore(core: ProgressCore, segment: Segment, pickRandom: number): ProgressCore {
  if (core.status !== 'playing') return core
  const ceremony = ceremonyAt(core.sprintIndex, core.beatIndex)
  if (!ceremony) return core
  const sprintNo = SPRINTS[core.sprintIndex].n
  const avail = availableEvents(EVENTS, sprintNo, ceremony, core.resolvedIds, core.flags)
  const { event, unexpected } = drawEvent(avail, segment, pickRandom)
  if (!event) {
    // このビートに出せるイベントが無い → 何事もなく次へ
    return advanceCore(core)
  }
  // 想定外バナーはデイリー（不確実な開発中）でのみ意味を持たせる
  return { ...core, currentEvent: event, unexpected: unexpected && ceremony === 'daily', status: 'event' }
}

/** 進行中イベントの選択を解決し、結果ビューを添えて次状態を返す */
export function chooseCore(core: ProgressCore, choice: Choice): ProgressCore {
  const event = core.currentEvent
  if (!event || core.status !== 'event') return core

  const { meters, flags } = resolveChoice(core.meters, core.flags, choice)
  const resolvedIds = new Set(core.resolvedIds).add(event.id)
  const log: LogEntry[] = [
    ...core.log,
    {
      sprint: event.sprint,
      ceremony: event.ceremony,
      eventTitle: event.title,
      choiceLabel: choice.label,
      resultText: choice.resultText,
    },
  ]
  const result: ResultView = {
    eventTitle: event.title,
    ceremony: event.ceremony,
    segment: event.segment,
    choiceLabel: choice.label,
    resultText: choice.resultText,
    effects: choice.effects,
    warn: choice.warn,
  }

  const base = { ...core, meters, flags, resolvedIds, log }

  // ★0ルール: どれか1つでもゲージが0になったら、その場で失敗エピローグ
  const zeroed = zeroedMeter(meters)
  if (zeroed) {
    return {
      ...base,
      currentEvent: null,
      unexpected: false,
      status: 'ended',
      ending: FAILURE_EPILOGUES[zeroed],
      result,
    }
  }

  return advanceCore(base, result)
}

export function dismissResultCore(core: ProgressCore): ProgressCore {
  return { ...core, result: null }
}

/** 永続データから中核状態を再構成（status/ending を再評価。失敗/完了/進行中を復元） */
export function restoreCore(p: Persisted): ProgressCore {
  const flags = new Set<GameFlag>(p.flags)
  const resolvedIds = new Set<string>(p.resolvedIds)
  const zeroed = zeroedMeter(p.meters)
  const campaignDone = p.sprintIndex >= SPRINTS.length
  const ending: Epilogue | null = zeroed
    ? FAILURE_EPILOGUES[zeroed]
    : campaignDone
      ? evaluateEnding(ENDINGS, p.meters)
      : null
  return {
    meters: p.meters,
    flags,
    resolvedIds,
    log: p.log,
    sprintIndex: p.sprintIndex,
    beatIndex: p.beatIndex,
    status: ending ? 'ended' : 'playing',
    ending,
    currentEvent: null,
    unexpected: false,
    result: null,
  }
}

/** 永続データを書き出し用の最小形へ */
export function toPersisted(core: ProgressCore): Persisted {
  return {
    meters: core.meters,
    sprintIndex: core.sprintIndex,
    beatIndex: core.beatIndex,
    resolvedIds: [...core.resolvedIds],
    flags: [...core.flags],
    log: core.log,
  }
}
