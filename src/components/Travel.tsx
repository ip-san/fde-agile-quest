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

// ── 現地マップのレイアウト（ゲーム風の“拠点が点在する地図”）──────────────────────────
// 各拠点の座標（キャンバス内の %）。'you' は現在地ピン。現地7拠点を空間配置し、
// devroom（リモート）はキャンバス外の別ゾーンに置く（物理的に離れている＝画面越し）。
const MAP_COORDS: Record<string, { x: number; y: number }> = {
  warehouse: { x: 20, y: 19 },
  serverroom: { x: 73, y: 17 },
  client: { x: 16, y: 46 },
  soumu: { x: 49, y: 45 },
  keiri: { x: 83, y: 47 },
  jinji: { x: 33, y: 74 },
  repo: { x: 80, y: 72 },
  you: { x: 53, y: 92 },
}
// 拠点をつなぐ“通路”（地図らしさの演出のみ。導線の意味は持たせない）。
const MAP_EDGES: [string, string][] = [
  ['warehouse', 'serverroom'],
  ['warehouse', 'client'],
  ['warehouse', 'soumu'],
  ['serverroom', 'keiri'],
  ['soumu', 'serverroom'],
  ['soumu', 'client'],
  ['soumu', 'keiri'],
  ['soumu', 'jinji'],
  ['jinji', 'repo'],
  ['keiri', 'repo'],
  ['you', 'soumu'],
]
// 設計図グリッド背景（朝会パネルの実線カードと視覚言語を変える＝「地図」と認識させる）
const BLUEPRINT =
  'bg-[size:18px_18px] [background-image:linear-gradient(rgba(56,189,248,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(56,189,248,0.06)_1px,transparent_1px)]'

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

  // 選択中の拠点（タップ→下に詳細→「向かう」で確定）。初期値は今日の論点があればそこ。
  const [selectedId, setSelectedId] = useState<LocationId>(
    () => onsiteLocations.find((id) => liveLocations.has(id)) ?? onsiteLocations[0] ?? 'warehouse'
  )

  /** マップの拠点ピン。1度目のタップで選択（下に詳細）、選択中の拠点をもう一度押すと向かう。
   *  ★＝今日の論点（朝会で誰かが推した場所）。 */
  const renderPin = (id: LocationId, initialFocus: boolean) => {
    const loc = LOCATIONS[id]
    const live = liveLocations.has(id)
    const selected = id === selectedId
    return (
      <button
        key={id}
        type="button"
        aria-pressed={selected}
        aria-label={`${loc.label}${live ? '（今日の論点）' : ''}`}
        data-initial-focus={initialFocus ? '' : undefined}
        onClick={() => (selected ? onTravel(id) : setSelectedId(id))}
        className="group flex flex-col items-center gap-0.5 transition active:scale-95"
      >
        <span
          className={`relative flex h-9 w-9 items-center justify-center rounded-full border text-base shadow-md transition ${
            selected
              ? 'border-sky-300 bg-sky-900/80 ring-2 ring-sky-400/60'
              : live
                ? 'border-amber-400/70 bg-amber-950/70 ring-2 ring-amber-400/40'
                : 'border-slate-600 bg-slate-900/85 group-hover:border-sky-400'
          }`}
        >
          <span aria-hidden="true">{loc.emoji}</span>
          {live && (
            <span aria-hidden="true" className="absolute -right-1 -top-1.5 text-[11px] leading-none text-amber-300">
              ★
            </span>
          )}
        </span>
        <span
          className={`max-w-[5rem] truncate rounded px-1 text-[9px] font-bold leading-tight ${
            selected ? 'bg-sky-500/25 text-sky-100' : live ? 'text-amber-200' : 'text-slate-200'
          }`}
        >
          {loc.short}
        </span>
      </button>
    )
  }

  const selectedLoc = LOCATIONS[selectedId]
  const selectedLive = liveLocations.has(selectedId)

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

      {/* 現地マップ：ゲーム風に“拠点が点在する地図”として描く。SVGで通路をつなぎ、現在地ピンを置く。
          朝会パネル（実線カードの列）とは視覚言語が完全に別物＝「地図」と即認識できる。 */}
      <section
        aria-label="現地マップ"
        className="rounded-2xl border-2 border-dashed border-sky-700/60 bg-slate-950/40 p-3"
      >
        <div className="mb-2 flex items-center justify-between gap-2 px-1">
          <h2 className="text-sm font-bold text-sky-100">
            <span aria-hidden="true">🗺️</span> 現地マップ — どこへ向かう？
          </h2>
          <span className="shrink-0 rounded-full border border-sky-700/60 bg-slate-900/70 px-2 py-0.5 text-[10px] text-sky-300">
            ★＝今日の論点
          </span>
        </div>

        {/* 地図キャンバス：拠点を座標配置し、SVGの通路でつなぐ */}
        <div
          className={`relative h-[330px] w-full overflow-hidden rounded-xl border border-sky-800/50 bg-slate-950/60 ${BLUEPRINT}`}
        >
          <span className="pointer-events-none absolute left-2 top-1.5 z-10 text-[9px] font-semibold tracking-wide text-slate-500">
            📍 {displayName('cargo')}（常駐先・歩いて移動）
          </span>

          {/* 通路（道）。% 座標を viewBox 0..100 にそのまま対応させる */}
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-0 h-full w-full"
            aria-hidden="true"
          >
            <title>拠点をつなぐ通路</title>
            {MAP_EDGES.map(([a, b]) => {
              const p = MAP_COORDS[a]
              const q = MAP_COORDS[b]
              return (
                <line
                  key={`${a}-${b}`}
                  x1={p.x}
                  y1={p.y}
                  x2={q.x}
                  y2={q.y}
                  stroke="#38bdf8"
                  strokeOpacity={0.22}
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  vectorEffect="non-scaling-stroke"
                />
              )
            })}
          </svg>

          {/* 拠点ピン */}
          {onsiteLocations.map((id, i) => {
            const c = MAP_COORDS[id] ?? { x: 50, y: 50 }
            return (
              <div
                key={id}
                className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${c.x}%`, top: `${c.y}%` }}
              >
                {renderPin(id, i === 0)}
              </div>
            )
          })}

          {/* 現在地ピン（あなた＝カルゴ物流に常駐） */}
          <div
            className="absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
            style={{ left: `${MAP_COORDS.you.x}%`, top: `${MAP_COORDS.you.y}%` }}
          >
            <span className="relative flex h-7 w-7 items-center justify-center">
              <span
                className={`absolute inline-flex h-7 w-7 rounded-full bg-sky-400/30 ${reduceMotion ? '' : 'animate-ping'}`}
                aria-hidden="true"
              />
              <span aria-hidden="true" className="relative text-base">
                📍
              </span>
            </span>
            <span className="rounded bg-sky-500/30 px-1 text-[9px] font-bold text-sky-100">あなた</span>
          </div>
        </div>

        {/* リモートゾーン：物理的に離れた場所＝画面越しに“訪ねる”。破線で隔てる */}
        {remoteLocations.length > 0 && (
          <div className="mt-2.5 flex flex-col items-center">
            <div className="flex w-full items-center gap-2 px-2 text-[10px] font-semibold text-emerald-300/70">
              <span className="h-px flex-1 border-t border-dashed border-emerald-700/50" />
              <span aria-hidden="true">📡</span>
              <span>リモート接続</span>
              <span className="h-px flex-1 border-t border-dashed border-emerald-700/50" />
            </div>
            <div className="mt-1.5 flex justify-center gap-5">{remoteLocations.map((id) => renderPin(id, false))}</div>
          </div>
        )}

        {/* 選択中の拠点の詳細＋「向かう」。説明文はピンに載らないのでここに出す */}
        <div className="mt-3 rounded-xl border border-slate-700 bg-slate-900/70 p-3">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <span aria-hidden="true">{selectedLoc.emoji}</span>
            <span className="text-sm font-bold text-slate-100">{selectedLoc.short}</span>
            {selectedLive && (
              <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
                ★ 今日の論点
              </span>
            )}
            {selectedLoc.remote && (
              <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                リモート
              </span>
            )}
          </div>
          <p className="text-[11px] leading-relaxed text-slate-400">{selectedLoc.desc}</p>
          <button
            type="button"
            onClick={() => onTravel(selectedId)}
            className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg bg-sky-600 px-3 py-2 text-sm font-bold text-white transition hover:bg-sky-500 active:scale-95"
          >
            <span aria-hidden="true">▶</span> {selectedLoc.short}へ向かう
            <span className="text-[10px] font-normal text-sky-200">（他は見送り）</span>
          </button>
        </div>
      </section>
    </div>
  )
}
