import type {
  Ceremony,
  Choice,
  Effects,
  Ending,
  ExecTier,
  GameEvent,
  GameFlag,
  MeterKey,
  Meters,
  MiniGameKind,
  Segment,
} from '../types'

const METER_MIN = 0
export const METER_MAX = 10
/** 致命圏のしきい値。この値以下で「残りわずか」表示／結果画面の危険水域警告（HUDとResultModalで共有）。 */
export const METER_CRITICAL = 2

/** メーターを 0..10 に丸める */
export function clampMeters(m: Meters): Meters {
  const c = (v: number) => Math.max(METER_MIN, Math.min(METER_MAX, v))
  return { trust: c(m.trust), insight: c(m.insight), culture: c(m.culture) }
}

/** 技術的負債が高いほど“良いコードが積み上がりにくい”ドラッグ係数（0.3..1.0）。
 *  負債スコア(repoDebt + 過信/誤KPI 加点) が大きいほどカバレッジ/レビューの伸びが鈍る。
 *  リポジトリ品質を扱う複数層（chooseCore のカバレッジ・backlog のレビュー）で共用する純粋関数。 */
export function coverageDrag(repoDebt: number, flags: Set<GameFlag>): number {
  const score = Math.max(0, repoDebt) + (flags.has('aiOverreliance') ? 4 : 0) + (flags.has('wrongKpi') ? 2 : 0)
  return Math.max(0.3, 1 - score * 0.1)
}

/** 効果をメーターへ適用（clamp込み） */
export function applyEffects(m: Meters, e: Effects): Meters {
  return clampMeters({
    trust: m.trust + (e.trust ?? 0),
    insight: m.insight + (e.insight ?? 0),
    culture: m.culture + (e.culture ?? 0),
  })
}

// 主正メーター探索順（同値は trust→insight→culture 優先）
const POSITIVE_ORDER: MeterKey[] = ['trust', 'insight', 'culture']

/** 選択の「主正メーター」＝最も大きい正の効果を持つ軸。正が無ければ null */
export function primaryPositive(e: Effects): MeterKey | null {
  let best: MeterKey | null = null
  let bestV = 0
  for (const k of POSITIVE_ORDER) {
    const v = e[k] ?? 0
    if (v > bestV) {
      bestV = v
      best = k
    }
  }
  return best
}

/**
 * 実行ミニゲームの出来で、選択の「意図した正の効果」だけを倍率調整する（純粋関数）。
 * great=主正+1 / good=±0 / poor=主正-1（0未満にしない＝伸びしろを取り逃すだけ）。
 * 負の効果・非主正の正効果は不変＝トレードオフの代償と 0ルールを壊さない。
 */
export function amplifyEffects(
  e: Effects,
  tier: ExecTier
): { effects: Effects; primary: MeterKey | null; delta: number } {
  const primary = primaryPositive(e)
  const raw = tier === 'great' ? 1 : tier === 'poor' ? -1 : 0
  if (!primary || raw === 0) return { effects: e, primary, delta: 0 }
  const v = e[primary] ?? 0
  const nv = Math.max(0, v + raw) // poor でも 0 未満にはしない（負を新たに足さない）
  return { effects: { ...e, [primary]: nv }, primary, delta: nv - v }
}

// 既定のミニゲーム種別。event.minigame があれば優先。
//  team   … チーム/ふりかえりは「議論＝問いを選ぶ」が自然 → hearing（team テーマ）
//  trouble… 障害・コード起因の“直す”が大半 → dev（調査/対人の回は event.minigame で hearing/review に上書き）
//  人と現場（genba/kokyaku/chance）… hearing
const KIND_BY_SEGMENT: Record<Segment, MiniGameKind> = {
  team: 'hearing',
  trouble: 'dev',
  genba: 'hearing',
  kokyaku: 'hearing',
  chance: 'hearing',
}

/** イベントの実行ミニゲーム種別（UIと結果表示の単一の真実源） */
export function miniGameKindFor(event: GameEvent): MiniGameKind {
  return event.minigame ?? KIND_BY_SEGMENT[event.segment]
}

/** 選択を解決し、新メーターと新フラグ集合を返す（純粋関数） */
export function resolveChoice(
  meters: Meters,
  flags: Set<GameFlag>,
  choice: Choice
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
  flags: Set<GameFlag>
): GameEvent[] {
  return allEvents.filter(
    (ev) =>
      ev.sprint === sprint &&
      ev.ceremony === ceremony &&
      !resolvedIds.has(ev.id) &&
      (ev.requiresFlag === undefined || flags.has(ev.requiresFlag))
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
  pickRandom: number
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
