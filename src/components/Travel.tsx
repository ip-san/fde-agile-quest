import { useState } from 'react'
import {
  type DailyHint,
  hintsFor,
  LOCATION_ORDER,
  LOCATIONS,
  QUIET_BY_LOCATION,
} from '../data/locations'
import type { GameEvent, LocationId } from '../types'
import { RichText } from './RichText'

interface Props {
  /** 今日のイベント（ヒント生成に使う。場所はプレイヤーには伏せる） */
  event: GameEvent
  /** ヒントの variant 選択用シード */
  seed: number
  /** 直前に外した場所（「今日は静か」の小景を出す）。無ければ null */
  peekLocation: LocationId | null
  /** マップで行き先を選んだ */
  onTravel: (location: LocationId) => void
}

// Tailwind は動的クラス名を解析できないので、役割の色は静的に引く
const TONE: Record<DailyHint['tone'], { ring: string; badge: string; name: string }> = {
  amber: { ring: 'border-amber-500/40', badge: 'bg-amber-500/15 text-amber-300', name: 'text-amber-200' },
  violet: { ring: 'border-violet-500/40', badge: 'bg-violet-500/15 text-violet-300', name: 'text-violet-200' },
  emerald: { ring: 'border-emerald-500/40', badge: 'bg-emerald-500/15 text-emerald-300', name: 'text-emerald-200' },
}

/** リモート・デイリースクラム（役割別ヒント）＋現地マップ移動。
 *  主人公は一人カルゴ物流に常駐。画面の向こうのルーメンのチームが行き先を示す。 */
export function Travel({ event, seed, peekLocation, onTravel }: Props) {
  const hints = hintsFor(event, seed)
  const [reduceMotion] = useState(
    () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  )

  return (
    <div className="flex w-full flex-col gap-4">
      {/* リモート朝会パネル（ビデオ会議の演出） */}
      <section className="rounded-2xl border border-slate-700 bg-slate-900/60 p-3">
        <div className="mb-2 flex items-center justify-between px-1">
          <h2 className="text-sm font-bold text-slate-100">
            <span aria-hidden="true">📡</span> リモート・デイリースクラム
          </h2>
          <span className="flex items-center gap-1 text-[11px] font-semibold text-rose-300">
            <span
              className={`inline-block h-2 w-2 rounded-full bg-rose-500 ${reduceMotion ? '' : 'animate-pulse'}`}
              aria-hidden="true"
            />
            LIVE
          </span>
        </div>
        <p className="mb-2.5 px-1 text-[11px] text-slate-400">
          あなたは一人、カルゴ物流に。画面の向こうは本社ルーメンのチーム。今日の行き先を相談しよう。
        </p>

        {/* 役割タイル（ビデオ会議グリッド） */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {hints.map((h) => {
            const tone = TONE[h.tone]
            return (
              <div
                key={h.role}
                className={`rounded-xl border ${tone.ring} bg-slate-950/40 p-2.5`}
              >
                <div className="mb-1 flex items-center gap-1.5">
                  <span className={`text-sm font-bold ${tone.name}`}>{h.name}</span>
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${tone.badge}`}>
                    {h.label}
                  </span>
                  <span className="ml-auto text-[10px] text-slate-500">👀 {h.lens}</span>
                </div>
                <p className="text-xs leading-relaxed text-slate-200">
                  <RichText text={h.line} />
                </p>
              </div>
            )
          })}
          {/* あなた＝現地タイル */}
          <div className="rounded-xl border border-sky-500/40 bg-sky-950/30 p-2.5">
            <div className="mb-1 flex items-center gap-1.5">
              <span className="text-sm font-bold text-sky-200">あなた</span>
              <span className="rounded bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-sky-300">
                FDE・現地
              </span>
              <span className="ml-auto text-[10px] text-slate-500">📍 カルゴ物流</span>
            </div>
            <p className="text-xs leading-relaxed text-slate-400">
              （ヒントを手がかりに、今日はどこへ向かう？）
            </p>
          </div>
        </div>
      </section>

      {/* 行き先を外した時の小景 */}
      {peekLocation && (
        <p
          role="status"
          className="rounded-xl border border-slate-700 bg-slate-900/40 px-3 py-2 text-xs text-slate-400"
        >
          {LOCATIONS[peekLocation].emoji} {QUIET_BY_LOCATION[peekLocation]}
        </p>
      )}

      {/* 現地マップ：行き先を選ぶ */}
      <section>
        <h2 className="mb-2 px-1 text-xs font-semibold text-slate-400">
          🗺️ どこへ向かう？（行き先を選ぶ）
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {LOCATION_ORDER.map((id, i) => {
            const loc = LOCATIONS[id]
            return (
              <button
                key={id}
                type="button"
                onClick={() => onTravel(id)}
                data-initial-focus={i === 0 ? '' : undefined}
                className="flex flex-col gap-1 rounded-xl border border-slate-700 bg-slate-900/50 p-3 text-left transition hover:border-sky-400 hover:bg-slate-800/60 active:scale-95"
              >
                <span className="flex items-center gap-1.5 text-sm font-bold text-slate-100">
                  <span aria-hidden="true">{loc.emoji}</span>
                  {loc.short}
                  {loc.remote && (
                    <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                      リモート
                    </span>
                  )}
                </span>
                <span className="text-[11px] leading-snug text-slate-400">{loc.desc}</span>
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}
