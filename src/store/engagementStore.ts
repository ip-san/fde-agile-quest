import { create } from 'zustand'
import { CEREMONY_ORDER, CHAPTER_TITLE, SPRINTS, STARTING_METERS } from '../data/chapters/chapter-01'
import { PRECEPT_BY_ID } from '../data/precepts'
import {
  type Persisted,
  type ProgressCore,
  ceremonyAt,
  chooseCore,
  dismissResultCore,
  freshCore,
  proceedCore,
  restoreCore,
  spinCore,
  toPersisted,
} from '../engine/progression'
import type { Ceremony, Choice, ExecTier, GameFlag, Segment } from '../types'

const STORAGE_KEY = 'fde-agile-quest:chapter-01-v2'
// 心得手帳は「周回をまたいで集める」コレクションなので別キーで保存し、reset では消さない
const PRECEPTS_KEY = 'fde-agile-quest:precepts-seen'

interface EngagementState extends ProgressCore {
  chapterTitle: string
  /** reset のたびに +1。Roulette を key 付け替えで再マウントし、回転中の取りこぼし発火を断つ */
  generation: number
  /** これまでに出会った心得ID（周回をまたいで永続。reset では消えない） */
  seenPrecepts: Set<number>

  /** 現在のセレモニー（位置から導出）。終了後は null */
  currentCeremony: () => Ceremony | null
  spin: (segment: Segment, pickRandom: number) => void
  /** 単発セレモニーで「進める」。ルーレットを介さず直接イベントを出す */
  proceed: () => void
  /** tier＝選択後の実行ミニゲームの出来（省略時は good＝標準） */
  choose: (choice: Choice, tier?: ExecTier) => void
  dismissResult: () => void
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
  }
}

const CEREMONY_SET = new Set<string>(CEREMONY_ORDER)
// GameFlag を増やすと satisfies が未網羅をコンパイルエラーで知らせる（検証セットの取りこぼし防止）
const VALID_FLAGS = {
  wrongKpi: true,
  aiOverreliance: true,
  genbaTrust: true,
  topDown: true,
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
  ...initialCore,

  currentCeremony: () => ceremonyAt(get().sprintIndex, get().beatIndex),

  spin: (segment, pickRandom) => {
    const next = spinCore(coreOf(get()), segment, pickRandom)
    set(next)
    // イベント提示は一時状態なので保存しない。素通り前進（=durableな進行）した時だけ保存
    if (next.status !== 'event') persistCore(next)
  },

  proceed: () => {
    const next = proceedCore(coreOf(get()))
    set(next)
    if (next.status !== 'event') persistCore(next)
  },

  choose: (choice, tier) => {
    const seen = get().seenPrecepts
    const next = chooseCore(coreOf(get()), choice, tier)

    // 心得手帳の更新: このイベントの心得のうち、初めて出会ったものを記録
    const eventPrecepts = next.result?.precepts ?? []
    const newPreceptIds = eventPrecepts.filter((id) => !seen.has(id))
    const seenPrecepts = newPreceptIds.length ? new Set([...seen, ...newPreceptIds]) : seen
    const result = next.result ? { ...next.result, newPreceptIds } : next.result

    set({ ...next, result, seenPrecepts })
    persistCore(next)
    if (newPreceptIds.length) persistSeenPrecepts(seenPrecepts)
  },

  dismissResult: () => set(dismissResultCore(coreOf(get()))),

  reset: () => {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* noop */
    }
    set({ ...freshCore(STARTING_METERS), generation: get().generation + 1 })
  },
}))
