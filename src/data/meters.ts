import type { MeterKey } from '../types'

// ───────────────────────────────────────────────────────────
// 3メーターの表示メタ（短ラベル/正式名/アイコン/色）を一元管理。
// MeterHUD・ResultModal・Prologue が各々で持っていたラベル/色マップを集約し、
// 「現場」と「理解」の表記ゆれ等を防ぐ（型は MeterKey を共有）。
// ───────────────────────────────────────────────────────────

export interface MeterMeta {
  /** HUD・結果差分の短ラベル */
  short: string
  /** 文中で使う正式名 */
  full: string
  icon: string
  /** HUD のバー色（Tailwind bg-*） */
  bar: string
  /** チップ用の背景＋文字色（Prologue「効く軸」等） */
  chip: string
}

export const METER_META: Record<MeterKey, MeterMeta> = {
  trust: {
    short: '信頼',
    full: '顧客の信頼',
    icon: '🤝',
    bar: 'bg-violet-400',
    chip: 'bg-violet-500/15 text-violet-200',
  },
  insight: { short: '現場', full: '現場理解', icon: '🔍', bar: 'bg-sky-400', chip: 'bg-sky-500/15 text-sky-200' },
  culture: {
    short: '巻込',
    full: '巻き込み',
    icon: '🌱',
    bar: 'bg-emerald-400',
    chip: 'bg-emerald-500/15 text-emerald-200',
  },
}
