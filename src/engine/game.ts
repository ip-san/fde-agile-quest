import type {
  Ceremony,
  Choice,
  Ending,
  Effects,
  GameEvent,
  GameFlag,
  Meters,
  Segment,
} from '../types'

export const METER_MIN = 0
export const METER_MAX = 10

/** メーターを 0..10 に丸める */
export function clampMeters(m: Meters): Meters {
  const c = (v: number) => Math.max(METER_MIN, Math.min(METER_MAX, v))
  return { trust: c(m.trust), insight: c(m.insight), culture: c(m.culture) }
}

/** 効果をメーターへ適用（clamp込み） */
export function applyEffects(m: Meters, e: Effects): Meters {
  return clampMeters({
    trust: m.trust + (e.trust ?? 0),
    insight: m.insight + (e.insight ?? 0),
    culture: m.culture + (e.culture ?? 0),
  })
}

/** 選択を解決し、新メーターと新フラグ集合を返す（純粋関数） */
export function resolveChoice(
  meters: Meters,
  flags: Set<GameFlag>,
  choice: Choice,
): { meters: Meters; flags: Set<GameFlag> } {
  const nextFlags = new Set(flags)
  if (choice.setsFlag) nextFlags.add(choice.setsFlag)
  return { meters: applyEffects(meters, choice.effects), flags: nextFlags }
}

/** 指定スプリント・セレモニーで「まだ出せる」イベント（未解決・フラグ条件OK） */
export function availableEvents(
  allEvents: GameEvent[],
  sprint: number,
  ceremony: Ceremony,
  resolvedIds: Set<string>,
  flags: Set<GameFlag>,
): GameEvent[] {
  return allEvents.filter(
    (ev) =>
      ev.sprint === sprint &&
      ev.ceremony === ceremony &&
      !resolvedIds.has(ev.id) &&
      (ev.requiresFlag === undefined || flags.has(ev.requiresFlag)),
  )
}

/**
 * ルーレットのセグメント結果から、引くイベントを1つ選ぶ。
 * そのセグメントに一致する未出イベントを優先し、無ければ任意の未出イベント
 *（=「想定外の展開」）を返す。pickRandom は乱数 0..1 を注入（テスト容易性）。
 */
export function drawEvent(
  available: GameEvent[],
  segment: Segment,
  pickRandom: number,
): { event: GameEvent | null; unexpected: boolean } {
  if (available.length === 0) return { event: null, unexpected: false }
  const matching = available.filter((ev) => ev.segment === segment)
  if (matching.length > 0) {
    const idx = Math.min(matching.length - 1, Math.floor(pickRandom * matching.length))
    return { event: matching[idx], unexpected: false }
  }
  const idx = Math.min(available.length - 1, Math.floor(pickRandom * available.length))
  return { event: available[idx], unexpected: true }
}

/** エンディングを評価（配列順に最初にマッチしたもの） */
export function evaluateEnding(endings: Ending[], meters: Meters): Ending {
  return endings.find((e) => e.match(meters)) ?? endings[endings.length - 1]
}
