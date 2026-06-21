import { create } from 'zustand'
import { CEREMONY_ORDER, CHAPTER_TITLE, SPRINTS, STARTING_METERS } from '../data/chapters/chapter-01'
import { PRECEPT_BY_ID } from '../data/precepts'
import { SEED_BY_ID } from '../data/seeds'
import { reorderBacklog, reviewItem, startItem, toggleForecast } from '../engine/backlog'
import { METER_MAX } from '../engine/game'
import {
  arriveCore,
  ceremonyAt,
  chooseCore,
  dismissResultCore,
  finalEndingFor,
  freshCore,
  type Persisted,
  type ProgressCore,
  proceedCore,
  restoreCore,
  spinCore,
  toPersisted,
} from '../engine/progression'
import type { Ceremony, Choice, ExecTier, GameFlag, LocationId, ReviewDepth, Segment } from '../types'

const STORAGE_KEY = 'fde-agile-quest:chapter-01-v2'
// 心得手帳は「周回をまたいで集める」コレクションなので別キーで保存し、reset では消さない
const PRECEPTS_KEY = 'fde-agile-quest:precepts-seen'
// 「次の機能の種」も周回をまたぐコレクション（reset では消さない）
const SEEDS_KEY = 'fde-agile-quest:feature-seeds'

interface EngagementState extends ProgressCore {
  chapterTitle: string
  /** reset のたびに +1。Roulette を key 付け替えで再マウントし、回転中の取りこぼし発火を断つ */
  generation: number
  /** これまでに出会った心得ID（周回をまたいで永続。reset では消えない） */
  seenPrecepts: Set<number>
  /** これまでに発見した「次の機能の種」ID（周回をまたいで永続。reset では消えない） */
  foundSeeds: Set<string>

  /** 現在のセレモニー（位置から導出）。終了後は null */
  currentCeremony: () => Ceremony | null
  spin: (segment: Segment, pickRandom: number) => void
  /** デイリーのマップで行き先を選ぶ。今日の場所なら event へ、外せば「静か」な小景 */
  arrive: (location: LocationId) => void
  /** 単発セレモニーで「進める」。ルーレットを介さず直接イベントを出す */
  proceed: () => void
  /** tier＝選択後の実行ミニゲームの出来（省略時は good＝標準） */
  choose: (choice: Choice, tier?: ExecTier, deductionBonus?: number) => void
  dismissResult: () => void
  /** 不正暴露アークの「暴露の決断」を解決（選んだフラグで結末を確定・永続化） */
  resolveFinale: (flag: GameFlag) => void
  // ── バックログ操作 ──
  /** PO が承認した優先順位を確定する（並べ替えの所有は PO。プレイヤーは提案し、PO審査後にここで確定） */
  commitBacklogOrder: (ids: string[]) => void
  /** PBI を今スプリントの予測に出し入れ（プランニング中・未done のみ有効） */
  toggleForecast: (pbiId: string) => void
  /** 着手：To Do→In Progress（AI生成・トークン消費・WIP上限） */
  startItem: (pbiId: string) => void
  /** レビュー：In Progress を進める（レビュー容量消費・深さ×ミニゲーム出来）。Done で完了 */
  reviewItem: (pbiId: string, depth: ReviewDepth, tier: ExecTier) => void
  reset: () => void
}

/** 永続化された seenPrecepts を、実在する心得ID（1..100）だけの集合に正規化する。
 *  破損/改竄で範囲外や非数値が混じっても「101/100」のような不整合表示にしない。テストのため export */
export function sanitizeSeenPrecepts(arr: unknown): Set<number> {
  if (!Array.isArray(arr)) return new Set()
  return new Set(arr.filter((n) => typeof n === 'number' && PRECEPT_BY_ID[n] !== undefined))
}

function loadSeenPrecepts(): Set<number> {
  try {
    const raw = localStorage.getItem(PRECEPTS_KEY)
    if (!raw) return new Set()
    return sanitizeSeenPrecepts(JSON.parse(raw))
  } catch {
    return new Set()
  }
}

function persistSeenPrecepts(seen: Set<number>) {
  try {
    localStorage.setItem(PRECEPTS_KEY, JSON.stringify([...seen]))
  } catch {
    /* noop */
  }
}

/** 永続化された foundSeeds を、実在する種IDだけの集合に正規化する（破損・改名で範囲外を除く）。 */
function sanitizeFoundSeeds(arr: unknown): Set<string> {
  if (!Array.isArray(arr)) return new Set()
  return new Set(arr.filter((s) => typeof s === 'string' && SEED_BY_ID[s] !== undefined))
}

function loadFoundSeeds(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEDS_KEY)
    if (!raw) return new Set()
    return sanitizeFoundSeeds(JSON.parse(raw))
  } catch {
    return new Set()
  }
}

function persistFoundSeeds(found: Set<string>) {
  try {
    localStorage.setItem(SEEDS_KEY, JSON.stringify([...found]))
  } catch {
    /* noop */
  }
}

/** ProgressCore 部分だけを抜き出す（純粋関数へ渡す用） */
function coreOf(s: EngagementState): ProgressCore {
  return {
    meters: s.meters,
    flags: s.flags,
    resolvedIds: s.resolvedIds,
    log: s.log,
    sprintIndex: s.sprintIndex,
    beatIndex: s.beatIndex,
    status: s.status,
    ending: s.ending,
    currentEvent: s.currentEvent,
    unexpected: s.unexpected,
    result: s.result,
    finalePending: s.finalePending,
    pendingLocation: s.pendingLocation,
    peekLocation: s.peekLocation,
    dailyCandidates: s.dailyCandidates,
    aiTokens: s.aiTokens,
    repoCoverage: s.repoCoverage,
    repoDebt: s.repoDebt,
    sprintGoals: s.sprintGoals,
    backlogOrder: s.backlogOrder,
    sprintForecast: s.sprintForecast,
    backlogDone: s.backlogDone,
    velocity: s.velocity,
    valueHistory: s.valueHistory,
    valueBaseline: s.valueBaseline,
    greatStreak: s.greatStreak,
    inProgress: s.inProgress,
    reviewProgress: s.reviewProgress,
    reviewCapacity: s.reviewCapacity,
    lastCarryover: s.lastCarryover,
  }
}

const CEREMONY_SET = new Set<string>(CEREMONY_ORDER)
// GameFlag を増やすと satisfies が未網羅をコンパイルエラーで知らせる（検証セットの取りこぼし防止）
const VALID_FLAGS = {
  wrongKpi: true,
  aiOverreliance: true,
  genbaTrust: true,
  topDown: true,
  fraudClue: true,
  fraudCase: true,
  exposed: true,
  complicit: true,
  coopted: true,
  missedHearing: true,
  missedUpgrade: true,
  missedNightShift: true,
  showcasePressure: true,
  chasedPromise: true,
  groundedGoal: true,
  soloHero: true,
  shippedUndone: true,
  deprioritizedJoushi: true,
  deprioritizedGenba: true,
} satisfies Record<GameFlag, true>
const FLAG_SET = new Set<string>(Object.keys(VALID_FLAGS))

/** log の各要素が LogEntry の形（描画が前提とする string/number フィールド）を満たすか。
 *  破損・旧スキーマで非文字列・union外の値が混ざると RichText の split で実行時クラッシュ／
 *  CEREMONY_SHORT 未定義キーでバッジが壊れるため弾く（型 LogEntry の宣言と実体を一致させる） */
function isValidLogEntry(e: unknown): boolean {
  if (!e || typeof e !== 'object') return false
  const r = e as Record<string, unknown>
  return (
    typeof r.sprint === 'number' &&
    typeof r.ceremony === 'string' &&
    CEREMONY_SET.has(r.ceremony) &&
    typeof r.eventTitle === 'string' &&
    typeof r.choiceLabel === 'string' &&
    typeof r.resultText === 'string'
  )
}

/** 永続データの妥当性検証（旧スキーマ・破損・章改訂で範囲外なら破棄して新規開始）。
 *  配列は要素の型まで検証する——LogEntry[] 等の型宣言と実体を一致させ、描画時クラッシュを防ぐ。
 *  テストのため export（ストア本体は loadPersisted 経由で利用） */
export function isValidPersisted(x: unknown): x is Persisted {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  const m = o.meters as Record<string, unknown> | undefined
  if (!m) return false
  // メーターは仕様上すべて 0..10 の整数。範囲外・非整数は破損とみなして破棄
  for (const k of ['trust', 'insight', 'culture']) {
    const v = m[k]
    if (typeof v !== 'number' || !Number.isInteger(v) || v < 0 || v > 10) return false
  }
  // 配列インデックスなので非負整数のみ許可（NaN/小数/負値は破損とみなして破棄。
  // 小数 beatIndex は範囲チェックをすり抜け sprint.beats[2.5]=undefined のソフトロックを生む）
  if (!Number.isInteger(o.sprintIndex) || (o.sprintIndex as number) < 0) return false
  if (!Number.isInteger(o.beatIndex) || (o.beatIndex as number) < 0) return false
  if (!Array.isArray(o.resolvedIds) || !Array.isArray(o.flags) || !Array.isArray(o.log)) return false
  if (!o.resolvedIds.every((id) => typeof id === 'string')) return false
  if (!o.flags.every((f) => typeof f === 'string' && FLAG_SET.has(f))) return false
  if (!o.log.every(isValidLogEntry)) return false
  // aiTokens は任意（旧セーブは無く restore 時に補完）。負値/非整数/NaN は破損として弾くが、
  // 上限超過は破棄せず restoreCore の clampTokens に委ねる（MAX 引き下げ等で旧セーブを全消ししない）
  if (o.aiTokens !== undefined) {
    if (typeof o.aiTokens !== 'number' || !Number.isInteger(o.aiTokens) || o.aiTokens < 0) return false
  }
  // repoCoverage/repoDebt も任意（旧セーブは欠落 → restore で0補完）。負値/非整数のみ破損として弾く
  for (const k of ['repoCoverage', 'repoDebt'] as const) {
    const v = o[k]
    if (v !== undefined && (typeof v !== 'number' || !Number.isInteger(v) || v < 0)) return false
  }
  // バックログ状態も任意（旧セーブは欠落 → restore で補完・正規化）。寛容に検証し、
  // 型が明確に壊れている時だけ弾く（未知 id・index ズレ等は restoreBacklog が吸収する）。
  for (const k of ['backlogOrder', 'sprintForecast', 'backlogDone', 'inProgress'] as const) {
    const v = o[k]
    if (v !== undefined && (!Array.isArray(v) || !v.every((id) => typeof id === 'string'))) return false
  }
  // velocity/valueHistory は index=sprintIndex を保つ sparse 配列になりうる（スプリントを飛ばすと穴が空く）。
  // JSON.stringify は穴を null にシリアライズするため、要素検証は null を許す（restore が 0 に正規化する）。
  // ここで null を弾くと、健全なセーブを「壊れている」と誤判定して全消ししてしまう。
  const isFiniteNonNegOrNull = (n: unknown) => n === null || (typeof n === 'number' && Number.isFinite(n) && n >= 0)
  if (o.velocity !== undefined) {
    if (!Array.isArray(o.velocity)) return false
    if (!o.velocity.every(isFiniteNonNegOrNull)) return false
  }
  // valueHistory/valueBaseline も任意（旧セーブは欠落 → restore で補完）。型が壊れている時だけ弾く
  if (o.valueHistory !== undefined) {
    if (!Array.isArray(o.valueHistory)) return false
    if (!o.valueHistory.every(isFiniteNonNegOrNull)) return false
  }
  if (o.valueBaseline !== undefined && (typeof o.valueBaseline !== 'number' || !Number.isFinite(o.valueBaseline))) {
    return false
  }
  // greatStreak は任意の非負整数（旧セーブは欠落 → 0 補完）。負・非整数・NaN は破損として弾く
  if (
    o.greatStreak !== undefined &&
    (typeof o.greatStreak !== 'number' || !Number.isInteger(o.greatStreak) || o.greatStreak < 0)
  ) {
    return false
  }
  // reviewProgress は id→数値のオブジェクト、reviewCapacity は数値（範囲は restore でクランプ）
  if (o.reviewProgress !== undefined) {
    if (typeof o.reviewProgress !== 'object' || o.reviewProgress === null || Array.isArray(o.reviewProgress))
      return false
    if (
      !Object.values(o.reviewProgress as Record<string, unknown>).every(
        (n) => typeof n === 'number' && Number.isFinite(n) && n >= 0
      )
    )
      return false
  }
  if (
    o.reviewCapacity !== undefined &&
    (typeof o.reviewCapacity !== 'number' || !Number.isFinite(o.reviewCapacity) || o.reviewCapacity < 0)
  ) {
    return false
  }
  const si = o.sprintIndex as number
  const bi = o.beatIndex as number
  if (si < 0 || si > SPRINTS.length) return false
  // キャンペーン完了（si===length）以外は、beatIndex がそのスプリントの範囲内であること
  if (si < SPRINTS.length && (bi < 0 || bi >= SPRINTS[si].beats.length)) return false
  return true
}

function loadPersisted(): Persisted | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return isValidPersisted(parsed) ? parsed : null
  } catch {
    return null
  }
}

function persistCore(core: ProgressCore) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toPersisted(core)))
  } catch {
    /* localStorage 不可環境は無視 */
  }
}

const saved = loadPersisted()
const initialCore: ProgressCore = saved ? restoreCore(saved) : freshCore(STARTING_METERS)

export const useEngagement = create<EngagementState>((set, get) => ({
  chapterTitle: CHAPTER_TITLE,
  generation: 0,
  seenPrecepts: loadSeenPrecepts(),
  foundSeeds: loadFoundSeeds(),
  ...initialCore,

  currentCeremony: () => ceremonyAt(get().sprintIndex, get().beatIndex),

  spin: (segment, pickRandom) => {
    const next = spinCore(coreOf(get()), segment, pickRandom)
    set(next)
    // travel/event は一時状態なので保存しない。素通り前進（=durableな進行）した時だけ保存
    if (next.status !== 'event' && next.status !== 'travel') persistCore(next)
  },

  // マップ移動は一時状態（travel↔event）なので永続化しない
  arrive: (location) => set(arriveCore(coreOf(get()), location)),

  proceed: () => {
    const next = proceedCore(coreOf(get()))
    set(next)
    if (next.status !== 'event') persistCore(next)
  },

  choose: (choice, tier, deductionBonus = 0) => {
    const seen = get().seenPrecepts
    let next = chooseCore(coreOf(get()), choice, tier)

    // 推理で本音を見抜けた「見抜きボーナス」：その選択の“主正メーター”を +1（上限まで）。
    // ・理解(insight)固定をやめ主正に連動＝特定メーターへの一極集中（エンディング判定の歪み）を防ぐ。
    // ・ミニゲーム会心(great)の倍率(+1)とは排他＝同じメーターに二重で乗らない（読みの冴え or 実行の冴え、どちらか）。
    // ・加算は正方向のみ＝0ルール（致命圏）の判定に影響しないので chooseCore の後段で安全に適用できる。
    const primary = next.result?.execPrimary
    if (deductionBonus > 0 && primary && next.result?.execTier !== 'great' && next.result) {
      const cur = next.meters[primary]
      const capped = Math.min(METER_MAX, cur + deductionBonus)
      const applied = capped - cur
      if (applied > 0) {
        next = {
          ...next,
          meters: { ...next.meters, [primary]: capped },
          result: { ...next.result, deductionBonus: applied },
        }
      }
    }

    // 心得手帳の更新: このイベントの心得のうち、初めて出会ったものを記録
    const eventPrecepts = next.result?.precepts ?? []
    const newPreceptIds = eventPrecepts.filter((id) => !seen.has(id))
    const seenPrecepts = newPreceptIds.length ? new Set([...seen, ...newPreceptIds]) : seen

    // 「次の機能の種」: この選択で種を掴んだら、初発見かを判定してコレクションへ加える
    const found = get().foundSeeds
    const seedId = next.result?.seedId
    const seedNew = !!seedId && SEED_BY_ID[seedId] !== undefined && !found.has(seedId)
    const foundSeeds = seedNew ? new Set([...found, seedId as string]) : found

    const result = next.result ? { ...next.result, newPreceptIds, seedNew } : next.result

    set({ ...next, result, seenPrecepts, foundSeeds })
    persistCore(next)
    if (newPreceptIds.length) persistSeenPrecepts(seenPrecepts)
    if (seedNew) persistFoundSeeds(foundSeeds)
  },

  dismissResult: () => set(dismissResultCore(coreOf(get()))),

  resolveFinale: (flag) => {
    const core = coreOf(get())
    const flags = new Set(core.flags).add(flag)
    const fin = finalEndingFor(core.meters, flags, core.backlogDone)
    const next: ProgressCore = {
      ...core,
      flags,
      status: 'ended',
      ending: fin.ending,
      finalePending: fin.finalePending,
    }
    set(next)
    persistCore(next) // フラグを永続化し、リロードしても結末が保たれる
  },

  commitBacklogOrder: (ids) => {
    const next = reorderBacklog(coreOf(get()), ids)
    set(next)
    persistCore(next)
  },

  toggleForecast: (pbiId) => {
    const next = toggleForecast(coreOf(get()), pbiId)
    set(next)
    persistCore(next)
  },

  startItem: (pbiId) => {
    const next = startItem(coreOf(get()), pbiId)
    set(next)
    persistCore(next)
  },

  reviewItem: (pbiId, depth, tier) => {
    const next = reviewItem(coreOf(get()), pbiId, depth, tier)
    set(next)
    persistCore(next)
  },

  reset: () => {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* noop */
    }
    set({ ...freshCore(STARTING_METERS), generation: get().generation + 1 })
  },
}))
