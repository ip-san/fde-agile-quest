import { useState } from 'react'
import { displayName } from '../data/chapters/chapter-01/names'
import { LOCATION_ORDER, LOCATIONS, QUIET_BY_LOCATION, type StandupVoice, standupFor } from '../data/locations'
import type { GameEvent, LocationId } from '../types'
import { RichText } from './RichText'

interface Props {
  /** 今日の“競合する候補”（別々の場所・最大3）。3役がそれぞれ別の候補を推す */
  candidates: GameEvent[]
  /** 直前に外した場所（「今日は静か」の小景）。無ければ null */
  peekLocation: LocationId | null
  /** マップで行き先を選んだ */
  onTravel: (location: LocationId) => void
}

// Tailwind は動的クラス名を解析できないので、役割の色は静的に引く
const TONE: Record<StandupVoice['tone'], { ring: string; badge: string; name: string }> = {
  amber: { ring: 'border-amber-500/40', badge: 'bg-amber-500/15 text-amber-300', name: 'text-amber-200' },
  violet: { ring: 'border-violet-500/40', badge: 'bg-violet-500/15 text-violet-300', name: 'text-violet-200' },
  emerald: { ring: 'border-emerald-500/40', badge: 'bg-emerald-500/15 text-emerald-300', name: 'text-emerald-200' },
}

/** リモート・デイリースクラム（競合する主張）＋現地マップ。
 *  3役がそれぞれ別の場所のイベントを推す。1つだけ選べる——見送った重要事は後で響く。 */
export function Travel({ candidates, peekLocation, onTravel }: Props) {
  const voices = standupFor(candidates)
  const liveLocations = new Set(voices.map((v) => v.location))
  const [reduceMotion] = useState(
    () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  )

  // マップは“地理”として読ませる：現地（歩いて回る）とリモート（画面越し）でゾーンを分ける。
  const onsiteLocations = LOCATION_ORDER.filter((id) => !LOCATIONS[id].remote)
  const remoteLocations = LOCATION_ORDER.filter((id) => LOCATIONS[id].remote)

  /** マップのノード（行き先ボタン）。★＝今日の論点（朝会で誰かが推した場所）。 */
  const renderNode = (id: LocationId, initialFocus: boolean) => {
    const loc = LOCATIONS[id]
    const live = liveLocations.has(id)
    return (
      <button
        key={id}
        type="button"
        onClick={() => onTravel(id)}
        data-initial-focus={initialFocus ? '' : undefined}
        className={`flex flex-col gap-1 rounded-xl border p-3 text-left transition active:scale-95 ${
          live
            ? 'border-amber-500/50 bg-amber-950/20 hover:border-amber-300 hover:bg-amber-900/30'
            : 'border-slate-700 bg-slate-900/50 hover:border-sky-400 hover:bg-slate-800/60'
        }`}
      >
        <span className="flex items-center gap-1.5 text-sm font-bold text-slate-100">
          {live && <span aria-hidden="true">★</span>}
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
  }

  return (
    <div className="flex w-full flex-col gap-4">
      {/* リモート朝会パネル（競合する主張） */}
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
          本社{displayName('lumen')}のチームが、各自の観点（価値／プロセス／技術）で気づきを共有する。
          <span className="text-slate-300">今日どこへ向かうかを決めるのは、開発者であるあなた自身だ</span>
          ——どれを採る？（動けるのは1箇所。選ばなかった方は見送りになる）
        </p>

        {/* 役割タイル（それぞれ別の候補を主張） */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {voices.map((v) => {
            const tone = TONE[v.tone]
            return (
              <div key={v.role} className={`rounded-xl border ${tone.ring} bg-slate-950/40 p-2.5`}>
                <div className="mb-1 flex items-center gap-1.5">
                  <span className={`text-sm font-bold ${tone.name}`}>{v.name}</span>
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${tone.badge}`}>{v.label}</span>
                  <span className="ml-auto text-[10px] text-slate-400">👀 {v.lens}</span>
                </div>
                <p className="text-xs leading-relaxed text-slate-200">
                  <RichText text={v.line} />
                </p>
                <p className="mt-1 text-[10px] text-slate-400">
                  {LOCATIONS[v.location].emoji} 推す行き先：{v.locationShort}
                </p>
              </div>
            )
          })}
          {/* あなた＝現地タイル */}
          <div className="rounded-xl border border-sky-500/40 bg-sky-950/30 p-2.5">
            <div className="mb-1 flex items-center gap-1.5">
              <span className="text-sm font-bold text-sky-200">あなた</span>
              <span className="rounded bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-sky-300">
                FDE（開発者）
              </span>
              <span className="ml-auto text-[10px] text-slate-400">📍 {displayName('cargo')}（現地）</span>
            </div>
            <p className="text-xs leading-relaxed text-slate-400">（どれが今日の“本当の火種”か。1つに賭ける）</p>
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

      {/* 朝会→マップの転換。「声は聞いた、行き先はあなたが決める」を一目で。 */}
      <div className="flex items-center gap-2 px-1 text-[10px] font-semibold text-slate-500">
        <span className="h-px flex-1 bg-slate-700" />
        <span aria-hidden="true">▼</span>
        <span>声は聞いた。行き先を決める</span>
        <span aria-hidden="true">▼</span>
        <span className="h-px flex-1 bg-slate-700" />
      </div>

      {/* 現地マップ：朝会パネル（実線カード）と視覚言語を変える——設計図グリッド＋破線フレーム＝「地図」。
          現在地ピンと現地／リモートのゾーン分けで“どこを歩くか”を空間として読ませる。 */}
      <section
        aria-label="現地マップ"
        className="overflow-hidden rounded-2xl border-2 border-dashed border-sky-700/60 bg-slate-950/70 bg-[size:18px_18px] p-3 [background-image:linear-gradient(rgba(56,189,248,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(56,189,248,0.05)_1px,transparent_1px)]"
      >
        <div className="mb-2 flex items-center justify-between gap-2 px-1">
          <h2 className="text-sm font-bold text-sky-100">
            <span aria-hidden="true">🗺️</span> 現地マップ — どこへ向かう？
          </h2>
          <span className="shrink-0 rounded-full border border-sky-700/60 bg-slate-900/70 px-2 py-0.5 text-[10px] text-sky-300">
            ★＝今日の論点 / 1つ選ぶと他は見送り
          </span>
        </div>

        {/* 現在地ピン（あなたはカルゴ物流に常駐している＝地図の起点） */}
        <p className="mb-3 flex items-center gap-1.5 rounded-lg border border-sky-600/40 bg-sky-950/40 px-2 py-1.5 text-[11px] text-sky-200">
          <span aria-hidden="true">📍</span>
          <span>
            現在地：<span className="font-bold">{displayName('cargo')}</span>に常駐中（あなた＝FDE）。
            下のノードへ歩いて向かう。
          </span>
        </p>

        {/* 現地ゾーン（歩いて回れる場所） */}
        <p className="mb-1.5 px-1 text-[10px] font-semibold tracking-wide text-slate-400">
          📍 現地（{displayName('cargo')}・歩いて移動）
        </p>
        <div className="grid grid-cols-2 gap-2">{onsiteLocations.map((id, i) => renderNode(id, i === 0))}</div>

        {/* リモートゾーンへの接続線（物理的に離れた場所＝画面越しに“訪ねる”） */}
        {remoteLocations.length > 0 && (
          <>
            <div className="my-2 flex items-center gap-2 px-1 text-[10px] font-semibold text-emerald-300/70">
              <span className="h-px flex-1 border-t border-dashed border-emerald-700/50" />
              <span aria-hidden="true">📡</span>
              <span>リモート接続</span>
              <span className="h-px flex-1 border-t border-dashed border-emerald-700/50" />
            </div>
            <div className="grid grid-cols-2 gap-2">{remoteLocations.map((id) => renderNode(id, false))}</div>
          </>
        )}
      </section>
    </div>
  )
}
