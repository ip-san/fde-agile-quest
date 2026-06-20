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

// 設計図グリッド背景（朝会パネルの実線カードと視覚言語を変える＝「見取り図／地図」と認識させる）
const BLUEPRINT =
  'bg-[size:16px_16px] [background-image:linear-gradient(rgba(56,189,248,0.11)_1px,transparent_1px),linear-gradient(90deg,rgba(56,189,248,0.11)_1px,transparent_1px)]'

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

  /** 見取り図の“部屋”。1度目のタップで選択（下に詳細）、選択中の部屋をもう一度押すと向かう。
   *  ★＝今日の論点（朝会で誰かが推した場所）。壁線＝border-2 で部屋らしく描く。 */
  const renderRoom = (id: LocationId, initialFocus: boolean) => {
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
        className={`group relative -m-px flex min-h-[62px] w-full flex-col items-center justify-center gap-0.5 border-2 p-1 text-center shadow-inner transition active:scale-95 ${
          selected
            ? 'z-10 border-sky-300 bg-sky-900/50'
            : live
              ? 'z-10 border-amber-400/70 bg-amber-950/40 hover:bg-amber-900/40'
              : 'border-slate-500/70 bg-slate-900/45 hover:z-10 hover:border-sky-400/70 hover:bg-slate-800/60'
        }`}
      >
        {live && (
          <span aria-hidden="true" className="absolute right-1 top-0.5 text-[11px] leading-none text-amber-300">
            ★
          </span>
        )}
        <span aria-hidden="true" className="text-xl leading-none">
          {loc.emoji}
        </span>
        <span
          className={`text-[10px] font-bold leading-none ${
            selected ? 'text-sky-100' : live ? 'text-amber-200' : 'text-slate-200'
          }`}
        >
          {loc.short}
        </span>
      </button>
    )
  }

  // 見取り図の行：上段＝奥の3部屋、下段＝手前の4部屋（current order: 倉庫/電算室/会議室 ｜ 総務/人事/経理/リポジトリ）
  const backRooms = onsiteLocations.slice(0, 3)
  const frontRooms = onsiteLocations.slice(3)

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

      {/* 現地マップ＝常駐先の“見取り図（フロアプラン）”。部屋を壁線で描き、廊下でつなぎ、方位と現在地を置く。
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

        {/* 見取り図キャンバス（建物の外壁＝太線、設計図グリッド背景） */}
        <div
          className={`relative overflow-hidden rounded-md border-[3px] border-slate-500/70 bg-slate-950/60 p-2 ${BLUEPRINT}`}
        >
          {/* 図面の見出し（カルトゥーシュ）と方位 */}
          <div className="mb-1.5 flex items-center justify-between px-0.5">
            <span className="text-[9px] font-semibold tracking-wide text-slate-500">
              🏭 {displayName('cargo')}・見取り図
            </span>
            <span className="flex flex-col items-center leading-none text-slate-500" aria-hidden="true">
              <span className="text-[8px] font-bold text-sky-400">N</span>
              <span className="text-[11px]">🧭</span>
            </span>
          </div>

          {/* 奥の3部屋（壁を共有して間取り図に） */}
          <div className="grid grid-cols-3">{backRooms.map((id, i) => renderRoom(id, i === 0))}</div>

          {/* 廊下（部屋をつなぐ通路）＋現在地 */}
          <div className="my-1.5 flex items-center justify-center gap-2 rounded border border-dashed border-slate-600/60 bg-slate-800/30 py-1 text-[9px] font-semibold text-slate-400">
            <span className="h-px w-4 bg-slate-600" aria-hidden="true" />
            <span className="relative flex items-center gap-1 text-sky-200">
              <span className="relative flex h-3 w-3 items-center justify-center" aria-hidden="true">
                <span
                  className={`absolute inline-flex h-3 w-3 rounded-full bg-sky-400/40 ${reduceMotion ? '' : 'animate-ping'}`}
                />
                <span className="relative h-1.5 w-1.5 rounded-full bg-sky-300" />
              </span>
              現在地（あなた）— 廊下
            </span>
            <span className="h-px w-4 bg-slate-600" aria-hidden="true" />
          </div>

          {/* 手前の4部屋（壁を共有して間取り図に） */}
          <div className="grid grid-cols-4">{frontRooms.map((id) => renderRoom(id, false))}</div>
        </div>

        {/* リモートゾーン：物理的に離れた場所＝画面越しに“訪ねる”。破線で隔てる */}
        {remoteLocations.length > 0 && (
          <div className="mt-2.5 flex flex-col items-center">
            <div className="flex w-full items-center gap-2 px-2 text-[10px] font-semibold text-emerald-300/70">
              <span className="h-px flex-1 border-t border-dashed border-emerald-700/50" />
              <span aria-hidden="true">📡</span>
              <span>リモート接続（画面越し）</span>
              <span className="h-px flex-1 border-t border-dashed border-emerald-700/50" />
            </div>
            <div className="mt-1.5 flex w-full justify-center gap-1.5">
              {remoteLocations.map((id) => (
                <div key={id} className="w-36">
                  {renderRoom(id, false)}
                </div>
              ))}
            </div>
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
