import { create } from 'zustand'
import { CHAPTER_TITLE, SPRINTS, STARTING_METERS } from '../data/chapters/chapter-01'
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
import type { Ceremony, Choice, Segment } from '../types'

const STORAGE_KEY = 'fde-agile-quest:chapter-01-v2'

interface EngagementState extends ProgressCore {
  chapterTitle: string
  /** reset のたびに +1。Roulette を key 付け替えで再マウントし、回転中の取りこぼし発火を断つ */
  generation: number

  /** 現在のセレモニー（位置から導出）。終了後は null */
  currentCeremony: () => Ceremony | null
  spin: (segment: Segment, pickRandom: number) => void
  /** 単発セレモニーで「進める」。ルーレットを介さず直接イベントを出す */
  proceed: () => void
  choose: (choice: Choice) => void
  dismissResult: () => void
  reset: () => void
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

/** 永続データの妥当性検証（旧スキーマ・破損・章改訂で範囲外なら破棄して新規開始） */
function isValidPersisted(x: unknown): x is Persisted {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  const m = o.meters as Record<string, unknown> | undefined
  if (!m) return false
  for (const k of ['trust', 'insight', 'culture']) {
    if (typeof m[k] !== 'number' || !Number.isFinite(m[k] as number)) return false
  }
  if (typeof o.sprintIndex !== 'number' || typeof o.beatIndex !== 'number') return false
  if (!Array.isArray(o.resolvedIds) || !Array.isArray(o.flags) || !Array.isArray(o.log)) return false
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

  choose: (choice) => {
    const next = chooseCore(coreOf(get()), choice)
    set(next)
    persistCore(next)
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
