import { create } from 'zustand'
import {
  CHAPTER_TITLE,
  ENDINGS,
  EVENTS,
  FAILURE_EPILOGUES,
  SPRINTS,
  STARTING_METERS,
} from '../data/chapters/chapter-01'
import { availableEvents, drawEvent, evaluateEnding, resolveChoice } from '../engine/game'
import type {
  Ceremony,
  Choice,
  Epilogue,
  GameEvent,
  LogEntry,
  MeterKey,
  Meters,
  ResultView,
  Segment,
} from '../types'

/** 0以下になったメーターがあれば、その最初のキーを返す（無ければ undefined） */
function zeroedMeter(m: Meters): MeterKey | undefined {
  return (['trust', 'insight', 'culture'] as MeterKey[]).find((k) => m[k] <= 0)
}

const STORAGE_KEY = 'fde-agile-quest:chapter-01-v2'

type Status = 'playing' | 'event' | 'ended'

interface Persisted {
  meters: Meters
  sprintIndex: number
  beatIndex: number
  resolvedIds: string[]
  flags: string[]
  log: LogEntry[]
}

interface EngagementState {
  chapterTitle: string
  status: Status
  meters: Meters
  /** SPRINTS の index（0始まり） */
  sprintIndex: number
  /** 現在スプリント内の beats（セレモニー列）の index */
  beatIndex: number
  resolvedIds: Set<string>
  flags: Set<string>
  log: LogEntry[]

  currentEvent: GameEvent | null
  unexpected: boolean
  ending: Epilogue | null
  /** 判断直後の結果ビュー（「次へ」で消す）。null の間は結果オーバーレイ非表示 */
  result: ResultView | null

  /** 現在のセレモニー（位置から導出）。終了後は null */
  currentCeremony: () => Ceremony | null
  /** ルーレット結果セグメントを受け取り、現セレモニーのイベントを引く */
  spin: (segment: Segment, pickRandom: number) => void
  /** 進行中イベントの選択を解決し、結果ビューを出す（盤面の状態は内部で確定） */
  choose: (choice: Choice) => void
  /** 結果ビューを閉じて次へ進む */
  dismissResult: () => void
  reset: () => void
}

function ceremonyAt(sprintIndex: number, beatIndex: number): Ceremony | null {
  const sprint = SPRINTS[sprintIndex]
  if (!sprint) return null
  return sprint.beats[beatIndex] ?? null
}

function loadPersisted(): Persisted | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Persisted) : null
  } catch {
    return null
  }
}

function persist(s: EngagementState) {
  try {
    const p: Persisted = {
      meters: s.meters,
      sprintIndex: s.sprintIndex,
      beatIndex: s.beatIndex,
      resolvedIds: [...s.resolvedIds],
      flags: [...s.flags],
      log: s.log,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
  } catch {
    /* localStorage 不可環境は無視 */
  }
}

const FRESH = {
  status: 'playing' as Status,
  meters: { ...STARTING_METERS },
  sprintIndex: 0,
  beatIndex: 0,
  resolvedIds: new Set<string>(),
  flags: new Set<string>(),
  log: [] as LogEntry[],
  currentEvent: null,
  unexpected: false,
  ending: null,
  result: null,
}

const saved = loadPersisted()

export const useEngagement = create<EngagementState>((set, get) => ({
  chapterTitle: CHAPTER_TITLE,
  ...FRESH,
  ...(saved
    ? (() => {
        const zeroed = zeroedMeter(saved.meters)
        const campaignDone = saved.sprintIndex >= SPRINTS.length
        const ending: Epilogue | null = zeroed
          ? FAILURE_EPILOGUES[zeroed]
          : campaignDone
            ? evaluateEnding(ENDINGS, saved.meters)
            : null
        return {
          meters: saved.meters,
          sprintIndex: saved.sprintIndex,
          beatIndex: saved.beatIndex,
          resolvedIds: new Set(saved.resolvedIds),
          flags: new Set(saved.flags),
          log: saved.log,
          status: (ending ? 'ended' : 'playing') as Status,
          ending,
        }
      })()
    : {}),

  currentCeremony: () => ceremonyAt(get().sprintIndex, get().beatIndex),

  spin: (segment, pickRandom) => {
    const s = get()
    if (s.status !== 'playing') return
    const ceremony = ceremonyAt(s.sprintIndex, s.beatIndex)
    if (!ceremony) return
    const sprintNo = SPRINTS[s.sprintIndex].n
    const avail = availableEvents(EVENTS, sprintNo, ceremony, s.resolvedIds, s.flags)
    const { event, unexpected } = drawEvent(avail, segment, pickRandom)
    if (!event) {
      // このビートに出せるイベントが無い → 何事もなく次へ
      advance(set, get, s.meters, s.flags, s.resolvedIds, s.log)
      return
    }
    // 想定外バナーはデイリー（不確実な開発中）でのみ意味を持たせる
    set({ currentEvent: event, unexpected: unexpected && ceremony === 'daily', status: 'event' })
  },

  choose: (choice) => {
    const s = get()
    const event = s.currentEvent
    if (!event || s.status !== 'event') return
    const { meters, flags } = resolveChoice(s.meters, s.flags, choice)
    const resolvedIds = new Set(s.resolvedIds).add(event.id)
    const log: LogEntry[] = [
      ...s.log,
      {
        sprint: event.sprint,
        ceremony: event.ceremony,
        eventTitle: event.title,
        choiceLabel: choice.label,
        resultText: choice.resultText,
      },
    ]

    // 判断直後に一度ちゃんと見せる結果ビュー（盤面の状態は裏で確定し、オーバーレイで覆う）
    const result: ResultView = {
      eventTitle: event.title,
      ceremony: event.ceremony,
      segment: event.segment,
      choiceLabel: choice.label,
      resultText: choice.resultText,
      effects: choice.effects,
      warn: choice.warn,
    }

    // ★0ルール: どれか1つでもゲージが0になったら、その場で失敗エピローグ
    const zeroed = zeroedMeter(meters)
    if (zeroed) {
      set({
        meters,
        flags,
        resolvedIds,
        log,
        currentEvent: null,
        unexpected: false,
        status: 'ended',
        ending: FAILURE_EPILOGUES[zeroed],
        result,
      })
      persist(get())
      return
    }

    advance(set, get, meters, flags, resolvedIds, log, result)
  },

  dismissResult: () => set({ result: null }),

  reset: () => {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* noop */
    }
    set({
      ...FRESH,
      meters: { ...STARTING_METERS },
      resolvedIds: new Set<string>(),
      flags: new Set<string>(),
      log: [],
    })
  },
}))

/** ビートを1つ進め、スプリント／キャンペーンの終端を判定して状態を確定する */
function advance(
  set: (partial: Partial<EngagementState>) => void,
  get: () => EngagementState,
  meters: Meters,
  flags: Set<string>,
  resolvedIds: Set<string>,
  log: LogEntry[],
  result: ResultView | null = null,
) {
  const s = get()
  let sprintIndex = s.sprintIndex
  let beatIndex = s.beatIndex + 1

  if (beatIndex >= SPRINTS[sprintIndex].beats.length) {
    sprintIndex += 1
    beatIndex = 0
  }

  if (sprintIndex >= SPRINTS.length) {
    const ending = evaluateEnding(ENDINGS, meters)
    set({
      meters,
      flags,
      resolvedIds,
      log,
      sprintIndex,
      beatIndex,
      currentEvent: null,
      unexpected: false,
      status: 'ended',
      ending,
      result,
    })
    persist(get())
    return
  }

  set({
    meters,
    flags,
    resolvedIds,
    log,
    sprintIndex,
    beatIndex,
    currentEvent: null,
    unexpected: false,
    status: 'playing',
    result,
  })
  persist(get())
}
