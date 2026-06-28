import { useEffect, useRef, useState } from 'react'
import { ACTION_LABELS, SEGMENT_COLORS, SEGMENT_LABELS } from '../data/chapters/chapter-01'
import { eventImage, imageUrl } from '../data/images'
import { canAfford } from '../engine/progression'
import { sfxDecide } from '../engine/sfx'
import { useFocusTrap } from '../hooks/useFocusTrap'
import type { Choice, GameEvent } from '../types'
import { RichText } from './RichText'

/** 時限選択（LIPS）の持ち時間（秒）。学習を妨げないよう寛容に。opt-in（既定OFF）。 */
const TIMED_SECONDS = 15

interface Props {
  event: GameEvent
  unexpected: boolean
  /** 生成AIの残りトークン。tokenCost を超える選択は「残量不足」で選べない＝AIショートカット封印 */
  aiTokens: number
  /** 推理で本音を見抜けた時の開示ヒント（核心が"開く"）。外した／推理なしなら undefined */
  revealHint?: string
  /** 時限選択を有効にするか（設定でON。静観の選択肢があるイベントだけカウントダウンする）。 */
  timed?: boolean
  onChoose: (choice: Choice) => void
}

export function EventModal({ event, unexpected, aiTokens, revealHint, timed, onChoose }: Props) {
  const ref = useFocusTrap<HTMLDivElement>()
  const titleId = `event-title-${event.id}`
  const segId = `event-seg-${event.id}`
  const eventImgKey = eventImage(event)

  // 時限選択（LIPS の「無回答＝沈黙も選択」の移植）。静観の選択肢があるイベントだけ作動し、
  // 時間切れ＝その静観を自動選択する。迷っている間に「動かない」を選んだことになる。
  // ※ warn 付き静観（罠）は自動選択対象にしない（迷って時間切れで最悪手を強制しない）。
  const restraintChoice = event.choices.find((c) => c.restraint && !c.warn)
  // 解除＝WCAG 2.2.1（Timing Adjustable）。本人操作でこの判断の制限時間を止められる。
  // [外部依存の明示] timerOff・remaining・firedRef は useState/useRef の初期値によってリセットされる。
  // このリセットは Board.tsx が <EventModal key={currentEvent.id} /> と渡すことで
  // イベント切り替え時に再マウントを保証している。Board 側の key 付与をやめると
  // 前イベントの timerOff=true や firedRef=true が次イベントに持ち越されるため注意。
  const [timerOff, setTimerOff] = useState(false)
  const timerOn = !!timed && !!restraintChoice && !timerOff
  const [remaining, setRemaining] = useState(TIMED_SECONDS)
  const firedRef = useRef(false)
  // ref で最新の restraintChoice/onChoose を追跡し、deps に含めなくても stale にならない
  // （timerOn が変化した時点の最新値が ref に入っているため）
  const restraintChoiceRef = useRef(restraintChoice)
  restraintChoiceRef.current = restraintChoice
  const onChooseRef = useRef(onChoose)
  onChooseRef.current = onChoose
  useEffect(() => {
    if (!timerOn || !restraintChoiceRef.current) return
    const tick = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000)
    const fire = setTimeout(() => {
      if (firedRef.current || !restraintChoiceRef.current) return
      firedRef.current = true
      sfxDecide()
      onChooseRef.current(restraintChoiceRef.current)
    }, TIMED_SECONDS * 1000)
    return () => {
      clearInterval(tick)
      clearTimeout(fire)
    }
  }, [timerOn])

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:px-safe sm:pt-safe sm:pb-safe">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        // 止まったセグメント名をアクセシブルネームに含め、フォーカス移動時に必ず読み上げる。
        // ルーレットの結果通知は背景の aria-live にあり aria-modal 下で取りこぼれ得るため
        aria-labelledby={`${segId} ${titleId}`}
        // スマホ＝下から立ち上がるボトムシート（親指の届く下部に内容を寄せる）／デスクトップ＝中央ダイアログ
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl sm:max-h-[90vh] sm:rounded-2xl"
      >
        <header
          className="flex flex-wrap items-center gap-2 rounded-t-2xl px-5 py-3"
          style={{ backgroundColor: `${SEGMENT_COLORS[event.segment]}22` }}
        >
          <span className="rounded-full bg-[var(--bg-deep)]/60 px-2.5 py-0.5 text-xs font-bold text-[var(--text-body)]">
            {ACTION_LABELS[event.ceremony]}
          </span>
          <span
            id={segId}
            className="rounded-full px-2.5 py-0.5 text-xs font-bold text-[var(--bg)]"
            style={{ backgroundColor: SEGMENT_COLORS[event.segment] }}
          >
            {SEGMENT_LABELS[event.segment]}
          </span>
          <h2 id={titleId} className="w-full text-base font-bold text-[var(--text)]">
            {event.title}
          </h2>
        </header>

        {/* 状況の実写ドキュメンタリー風画像（問題に1枚・あれば） */}
        {eventImgKey && (
          <img
            src={imageUrl(eventImgKey)}
            alt=""
            className="h-32 w-full object-cover sm:h-44"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
        )}

        <div className="space-y-4 px-5 pt-4 pb-safe">
          {unexpected && (
            <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
              想定外の展開。現場は狙い通りには動かない。
            </p>
          )}

          {/* 時限選択のカウントダウン（時間切れ＝🕯静観を自動選択）。 */}
          {timerOn && (
            <div>
              <div className="mb-1 flex items-center justify-between gap-2 text-[11px] font-semibold text-amber-300">
                <span>時限選択</span>
                <span className="flex items-center gap-2">
                  <span className="tabular-nums">残り {remaining}秒（時間切れ＝静観）</span>
                  {/* WCAG 2.2.1: 本人操作で制限時間を解除できる */}
                  <button
                    type="button"
                    onClick={() => setTimerOff(true)}
                    className="rounded border border-amber-400/40 px-1.5 py-0.5 text-[10px] text-amber-200 transition hover:bg-[var(--accent)]/10"
                  >
                    解除
                  </button>
                </span>
              </div>
              <div
                className="h-1 overflow-hidden rounded-full bg-[var(--border)]"
                role="progressbar"
                aria-label="判断の残り時間"
                aria-valuenow={remaining}
                aria-valuemin={0}
                aria-valuemax={TIMED_SECONDS}
              >
                <div
                  className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-1000 ease-linear motion-reduce:transition-none"
                  style={{ width: `${(remaining / TIMED_SECONDS) * 100}%` }}
                />
              </div>
              {/* SR向けは毎秒読み上げず、節目（5/3/1秒）だけ通知する */}
              <span className="sr-only" aria-live="polite">
                {remaining === 5 || remaining === 3 || remaining === 1 ? `残り${remaining}秒` : ''}
              </span>
            </div>
          )}

          <p className="text-sm leading-relaxed text-[var(--text-body)]">
            <RichText text={event.narrative} />
          </p>

          {/* 推理で見抜いた本音（核心が"開く"）。手探りで選ぶのと、本音を掴んで選ぶのとの差。 */}
          {revealHint && (
            <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              見抜いた本音：
              <RichText text={revealHint} />
            </p>
          )}

          <div className="space-y-2">
            {/* 注記は選択肢の"上"に置き、選択肢を親指の届く最下段に配置（HIG: 主操作を下部に） */}
            <div className="flex flex-wrap items-baseline justify-between gap-x-2">
              <p className="text-xs font-semibold text-[var(--text-sub)]">あなたの判断は？</p>
              <p className="text-xs text-[var(--text-sub)]">※ 正解はない。結果は決めてから分かる</p>
            </div>
            {event.choices.length > 2 && (
              <p
                aria-label={`選択肢が${event.choices.length}つあります。分岐が深い回です`}
                className="inline-flex items-center gap-1 rounded-full bg-violet-500/15 px-2.5 py-0.5 text-xs font-bold text-violet-300"
              >
                <span aria-hidden="true">◈</span>
                {event.choices.length}択 — 分岐が深い回
              </p>
            )}
            {event.choices.map((c) => {
              const cost = c.tokenCost ?? 0
              // 生成AIに頼る選択は、残量が足りなければ封印（engine の canAfford と同一述語）
              const locked = !canAfford(aiTokens, c)
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    // タイマーの自動発火と手動クリックの二重 onChoose を防ぐ（同tick競合ガード）。
                    firedRef.current = true
                    // 判断を確定した瞬間の"決め"の合図（＝突きつける手応え）。
                    // この後ミニゲーム→結果開示へ。決定的瞬間の音は ResultModal が鳴らす。
                    sfxDecide()
                    onChoose(c)
                  }}
                  disabled={locked}
                  aria-label={
                    locked
                      ? `${c.label}（AIトークン残量不足のため選べません。必要 ${cost} / 残り ${aiTokens}）`
                      : undefined
                  }
                  className={`group block w-full rounded-xl border px-4 py-3 text-left transition ${
                    locked
                      ? 'cursor-not-allowed border-[var(--border)] bg-[var(--card)]/40 opacity-50'
                      : 'border-[var(--border)] bg-[var(--panel)]/40 hover:border-[var(--link)] hover:bg-[var(--panel)]'
                  }`}
                >
                  {/* 「静観」スタンス＝今は動かない選択を識別表示（LIPSの「沈黙も選択」の移植）。 */}
                  {c.restraint && (
                    <span className="mb-1 inline-block rounded bg-[var(--border)]/60 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--text-body)]">
                      静観
                    </span>
                  )}
                  <span className="block text-sm font-medium text-[var(--text)]">
                    {/* メーター増減と⚠は選択前は伏せ、結果画面で初めて見せる（判断＝賭けにする）。
                        選択肢ラベルは外側が button なので、用語チップ(button)を入れ子にしない */}
                    <RichText text={c.label} interactive={false} />
                  </span>
                  {/* AIトークンの"価格"だけは残す（残量不足の封印を成立させる資源コスト） */}
                  {cost > 0 && (
                    <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs font-semibold tabular-nums ${
                          locked ? 'bg-rose-500/15 text-rose-300' : 'bg-cyan-500/15 text-cyan-300'
                        }`}
                      >
                        AI −{cost}
                        {locked && '（残量不足）'}
                      </span>
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
