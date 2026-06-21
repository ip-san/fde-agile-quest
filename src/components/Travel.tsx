import { useState } from 'react'
import { displayName } from '../data/chapters/chapter-01/names'
import { AVAILABLE_IMAGES, imageUrl } from '../data/images'
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

// 設計図グリッド背景（画像マップ未生成時のフォールバック＝見取り図に使う）
const BLUEPRINT =
  'bg-[size:16px_16px] [background-image:linear-gradient(rgba(56,189,248,0.11)_1px,transparent_1px),linear-gradient(90deg,rgba(56,189,248,0.11)_1px,transparent_1px)]'

// 俯瞰イラストマップ（public/img/map-cargo.jpg）。生成・取り込み・AVAILABLE_IMAGES 登録が済むと
// 背景画像マップに自動で切り替わる（未登録ならフォールバックの見取り図）。
const MAP_IMG = 'map-cargo'
// 物理6拠点＋現在地の、画像上の位置（%）。生成画像の部屋配置（奥3／手前3）に合わせる。
// 取り込み後に実物を見ながら微調整する前提の初期値。
const MAP_PIN_COORDS: Record<string, { x: number; y: number }> = {
  warehouse: { x: 30, y: 22 },
  serverroom: { x: 57, y: 20 },
  client: { x: 80, y: 19 },
  soumu: { x: 16, y: 77 },
  jinji: { x: 41, y: 81 },
  keiri: { x: 87, y: 80 },
  you: { x: 50, y: 56 },
}

/** リモート・デイリースクラム（競合する主張）＋現地マップ。
 *  3役がそれぞれ別の場所のイベントを推す。1つだけ選べる——見送った重要事は後で響く。 */
export function Travel({ candidates, peekLocation, onTravel }: Props) {
  const voices = standupFor(candidates)
  const liveLocations = new Set(voices.map((v) => v.location))
  const [reduceMotion] = useState(
    () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  )

  // マップは“地理”として読ませる。ゾーンは2つ：
  //  ・物理の建物（見取り図に描く部屋）＝歩いて回る
  //  ・画面の中（デジタル）＝リモートの開発室。物理の部屋とは別物。
  // リポジトリ自体は“行き先”にしない（状態確認は下部メニューのパネルに集約）。
  // コードに触れる作業は「開発室に繋いでリポジトリを開く」として devroom 経由で扱う。
  const floorRooms = LOCATION_ORDER.filter((id) => !LOCATIONS[id].remote)
  const digitalLocations = LOCATION_ORDER.filter((id) => LOCATIONS[id].remote)

  // 選択中の拠点（タップ→下に詳細→「向かう」で確定）。初期値は今日の論点があればそこ。
  const [selectedId, setSelectedId] = useState<LocationId>(
    () => LOCATION_ORDER.find((id) => liveLocations.has(id)) ?? 'warehouse'
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

  // 俯瞰イラストマップ画像が取り込み済みなら背景画像マップ、無ければ見取り図にフォールバック。
  const hasMapImg = AVAILABLE_IMAGES.has(MAP_IMG)

  /** 画像マップ上の“ピン”。背景イラストの上に重ねる。タップ→詳細、選択中の再タップで向かう。 */
  const renderMapPin = (id: LocationId, initialFocus: boolean) => {
    const loc = LOCATIONS[id]
    const live = liveLocations.has(id)
    const selected = id === selectedId
    const c = MAP_PIN_COORDS[id] ?? { x: 50, y: 50 }
    return (
      <button
        key={id}
        type="button"
        aria-pressed={selected}
        aria-label={`${loc.label}${live ? '（今日の論点）' : ''}`}
        data-initial-focus={initialFocus ? '' : undefined}
        onClick={() => (selected ? onTravel(id) : setSelectedId(id))}
        style={{ left: `${c.x}%`, top: `${c.y}%` }}
        className="group absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5 transition active:scale-95"
      >
        <span
          className={`relative flex h-9 w-9 items-center justify-center rounded-full border-2 text-base shadow-lg backdrop-blur-sm transition ${
            selected
              ? 'border-sky-300 bg-sky-900/85 ring-2 ring-sky-400/50'
              : live
                ? 'border-amber-300 bg-amber-950/80 ring-2 ring-amber-400/50'
                : 'border-slate-200/70 bg-slate-900/80 group-hover:border-sky-300'
          }`}
        >
          <span aria-hidden="true">{loc.emoji}</span>
          {live && (
            <span aria-hidden="true" className="absolute -right-1 -top-2 text-xs leading-none text-amber-300">
              ★
            </span>
          )}
        </span>
        <span
          className={`max-w-[6rem] truncate rounded px-1 text-[10px] font-bold leading-tight shadow-sm ${
            selected
              ? 'bg-sky-500/30 text-sky-50'
              : live
                ? 'bg-amber-500/25 text-amber-100'
                : 'bg-slate-950/70 text-slate-100'
          }`}
        >
          {loc.short}
        </span>
      </button>
    )
  }

  // 見取り図の行（フォールバック）：上段＝奥の3部屋、下段＝手前の3部屋（倉庫/電算室/会議室 ｜ 総務/人事/経理）
  const backRooms = floorRooms.slice(0, 3)
  const frontRooms = floorRooms.slice(3)

  const selectedLoc = LOCATIONS[selectedId]
  const selectedLive = liveLocations.has(selectedId)

  return (
    <div className="flex w-full flex-col gap-4">
      {/* リモート朝会パネル（競合する主張） */}
      <section className="rounded-2xl border border-slate-700 bg-slate-900/60 p-3">
        <div className="mb-2 flex items-center justify-between px-1">
          <h2 className="text-sm font-bold text-slate-100">リモート・デイリースクラム</h2>
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
          。どれを採る？（動けるのは1箇所。選ばなかった方は見送りになる）
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
                  <span className="ml-auto text-[10px] text-slate-400">{v.lens}</span>
                </div>
                <p className="text-xs leading-relaxed text-slate-200">
                  <RichText text={v.line} />
                </p>
                <p className="mt-1 text-[10px] text-slate-400">
                  <span aria-hidden="true">{LOCATIONS[v.location].emoji}</span> 推す行き先：{v.locationShort}
                </p>
              </div>
            )
          })}
          {/* あなた＝現地タイル */}
          <div className="rounded-xl border border-sky-500/40 bg-sky-950/30 p-2.5">
            <div className="mb-1 flex items-center gap-1.5">
              <span className="text-sm font-bold text-sky-200">あなた</span>
              <span className="rounded bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-sky-300">
                開発者（FDE）
              </span>
              <span className="ml-auto text-[10px] text-slate-400">{displayName('cargo')}（現地）</span>
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
          <h2 className="text-sm font-bold text-sky-100">現地マップ — どこへ向かう？</h2>
          <span className="shrink-0 rounded-full border border-sky-700/60 bg-slate-900/70 px-2 py-0.5 text-[10px] text-sky-300">
            ★＝今日の論点
          </span>
        </div>

        {hasMapImg ? (
          /* 俯瞰イラストマップ：背景画像そのものが地図。拠点はその上のピン。 */
          <div className="relative aspect-[16/10] w-full overflow-hidden rounded-md border-[3px] border-slate-500/70 bg-slate-950/60">
            <img
              src={imageUrl(MAP_IMG)}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover"
            />
            {/* ピンの可読性のための薄い暗幕 */}
            <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-slate-950/10 to-slate-950/40" />
            {/* 図面の見出しと方位 */}
            <span className="absolute left-2 top-1.5 rounded bg-slate-950/60 px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-slate-200 backdrop-blur-sm">
              {displayName('cargo')}
            </span>
            <span
              className="absolute right-2 top-1.5 flex flex-col items-center leading-none text-slate-200"
              aria-hidden="true"
            >
              <span className="text-[8px] font-bold text-sky-300">N</span>
            </span>
            {/* 拠点ピン */}
            {floorRooms.map((id, i) => renderMapPin(id, i === 0))}
            {/* 現在地ピン（あなた） */}
            <div
              className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
              style={{ left: `${MAP_PIN_COORDS.you.x}%`, top: `${MAP_PIN_COORDS.you.y}%` }}
            >
              <span className="relative flex h-7 w-7 items-center justify-center" aria-hidden="true">
                <span
                  className={`absolute inline-flex h-7 w-7 rounded-full bg-sky-400/40 ${reduceMotion ? '' : 'animate-ping'}`}
                />
                <span className="relative text-base drop-shadow">📍</span>
              </span>
              <span className="rounded bg-sky-500/40 px-1 text-[9px] font-bold text-sky-50 shadow-sm">あなた</span>
            </div>
          </div>
        ) : (
          /* フォールバック：見取り図（壁線＋設計図グリッド）。画像マップ未生成時のみ。 */
          <div
            className={`relative overflow-hidden rounded-md border-[3px] border-slate-500/70 bg-slate-950/60 p-2 ${BLUEPRINT}`}
          >
            <div className="mb-1.5 flex items-center justify-between px-0.5">
              <span className="text-[9px] font-semibold tracking-wide text-slate-500">
                {displayName('cargo')}・見取り図
              </span>
              <span className="flex flex-col items-center leading-none text-slate-500" aria-hidden="true">
                <span className="text-[8px] font-bold text-sky-400">N</span>
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

            {/* 手前の3部屋（壁を共有して間取り図に） */}
            <div className="grid grid-cols-3">{frontRooms.map((id) => renderRoom(id, false))}</div>
          </div>
        )}

        {/* 画面の中（デジタル）ゾーン：建物の部屋ではなく“画面越し”のコード／開発。物理マップと分離する。 */}
        {digitalLocations.length > 0 && (
          <div className="mt-2.5">
            <div className="flex w-full items-center gap-2 px-2 text-[10px] font-semibold text-emerald-300/80">
              <span className="h-px flex-1 border-t border-dashed border-emerald-700/50" />
              <span>画面の中（コード／リモート・歩いては行けない）</span>
              <span className="h-px flex-1 border-t border-dashed border-emerald-700/50" />
            </div>
            {/* デジタル拠点は中央寄せ（開発室1つでも中央に置く。複数になれば横並びで均等に） */}
            <div className="mt-1.5 flex flex-wrap justify-center gap-1.5">
              {digitalLocations.map((id) => (
                <div key={id} className="w-[calc(50%-0.375rem/2)]">
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
