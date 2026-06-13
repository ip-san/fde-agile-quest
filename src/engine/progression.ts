// ───────────────────────────────────────────────────────────
// 進行ロジック（純粋関数）。localStorage / zustand / 乱数源に依存しない。
// store はこれらを呼ぶ薄いラッパに徹し、ここを game.test と同様に単体テストする。
// ───────────────────────────────────────────────────────────
import { ENDINGS, EVENTS, FAILURE_EPILOGUES, FINALE_EPILOGUES, SPRINTS } from '../data/chapters/chapter-01'
import { preceptsForEvent } from '../data/precepts'
import { amplifyEffects, availableEvents, drawEvent, evaluateEnding, miniGameKindFor, resolveChoice } from './game'
import type {
  Ceremony,
  Choice,
  Epilogue,
  ExecTier,
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
  /** 完走したが、不正暴露アークの「暴露の決断」待ち（fraudClue 有りで未決断）。App が Finale を出す */
  finalePending: boolean
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
    finalePending: false,
  }
}

/** キャンペーン完走時のエンディング決定（純粋）。advanceCore と restoreCore で共用。
 *  - 暴露の決断済み(exposed/complicit/coopted) → 対応するフィナーレED
 *  - 未決断だが手がかり(fraudClue)あり → ending=null・finalePending=true（決断待ち）
 *  - それ以外 → 従来のメーター駆動エンディング */
export function finalEndingFor(
  meters: Meters,
  flags: Set<GameFlag>,
): { ending: Epilogue | null; finalePending: boolean } {
  if (flags.has('exposed')) return { ending: FINALE_EPILOGUES.expose, finalePending: false }
  if (flags.has('complicit')) return { ending: FINALE_EPILOGUES.complicit, finalePending: false }
  if (flags.has('coopted')) return { ending: FINALE_EPILOGUES.coopted, finalePending: false }
  if (flags.has('fraudClue')) return { ending: null, finalePending: true }
  return { ending: evaluateEnding(ENDINGS, meters), finalePending: false }
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
    const fin = finalEndingFor(core.meters, core.flags)
    return { ...base, status: 'ended', ending: fin.ending, finalePending: fin.finalePending }
  }
  return { ...base, status: 'playing', ending: null, finalePending: false }
}

/** ルーレットを回すセレモニーか（デイリーのみ＝開発中の不確実性）。
 *  単発の Planning/Review/Retro はルーレットを回さず「進める」で直接イベントを出す */
export function isRouletteCeremony(ceremony: Ceremony): boolean {
  return ceremony === 'daily'
}

/** 「進める」: セグメント不問で、現セレモニーの最初の出せるイベントを引く（重要分岐を必ず出す） */
export function proceedCore(core: ProgressCore): ProgressCore {
  if (core.status !== 'playing') return core
  const ceremony = ceremonyAt(core.sprintIndex, core.beatIndex)
  if (!ceremony) return core
  const sprintNo = SPRINTS[core.sprintIndex].n
  const avail = availableEvents(EVENTS, sprintNo, ceremony, core.resolvedIds, core.flags)
  const event = avail[0] ?? null
  if (!event) return advanceCore(core)
  return { ...core, currentEvent: event, unexpected: false, status: 'event' }
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

/** 進行中イベントの選択を解決し、結果ビューを添えて次状態を返す。
 *  tier＝実行ミニゲームの出来。選択の主正メーターだけを great:+1 / good:±0 / poor:-1 する */
export function chooseCore(core: ProgressCore, choice: Choice, tier: ExecTier = 'good'): ProgressCore {
  const event = core.currentEvent
  if (!event || core.status !== 'event') return core

  // ミニゲームの出来で「意図した正の効果」だけ倍率調整（負効果は不変＝代償と0ルールを守る）
  const amp = amplifyEffects(choice.effects, tier)
  const { meters, flags } = resolveChoice(core.meters, core.flags, { ...choice, effects: amp.effects })
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
    eventId: event.id,
    choiceId: choice.id,
    eventTitle: event.title,
    ceremony: event.ceremony,
    segment: event.segment,
    choiceLabel: choice.label,
    resultText: choice.resultText,
    effects: amp.effects, // 実際に適用された増減（倍率込み）
    warn: choice.warn,
    precepts: preceptsForEvent(event.id),
    newPreceptIds: [], // 新規判定は store が seenPrecepts と突き合わせて埋める
    execTier: tier,
    execPrimary: amp.primary,
    execDelta: amp.delta,
    minigameKind: miniGameKindFor(event),
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
  // 0ルール失敗 > 完走（フィナーレ含む）> 進行中
  const fin = zeroed
    ? { ending: FAILURE_EPILOGUES[zeroed], finalePending: false }
    : campaignDone
      ? finalEndingFor(p.meters, flags)
      : { ending: null, finalePending: false }
  const isEnded = zeroed !== undefined || campaignDone
  return {
    meters: p.meters,
    flags,
    resolvedIds,
    log: p.log,
    sprintIndex: p.sprintIndex,
    beatIndex: p.beatIndex,
    status: isEnded ? 'ended' : 'playing',
    ending: fin.ending,
    currentEvent: null,
    unexpected: false,
    result: null,
    finalePending: fin.finalePending,
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
