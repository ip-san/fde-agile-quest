import { useState } from 'react'
import type { Character } from '../data/chapters/chapter-01/cast'
import { CAST, PROLOGUE_PANELS } from '../data/chapters/chapter-01/cast'
import { displayName } from '../data/chapters/chapter-01/names'
import { AVAILABLE_IMAGES, imageUrl } from '../data/images'
import { METER_META } from '../data/meters'
import { useFocusTrap } from '../hooks/useFocusTrap'

interface Props {
  onClose: () => void
  /** reset のたびに +1。0=初回、1以上=2周目以降 */
  generation?: number
}

const SIDE_LABEL: Record<string, string> = {
  lumen: `${displayName('lumen')}（主人公の会社）`,
  cargo: `${displayName('cargo')}（顧客）`,
  mentor: '導き手',
}

/** プロローグに必ず出す主要人物の id（出会いの順・物語の核となる6人）。
 *  それ以外は「全員を見る」アコーディオンに格納し、初見の認知負荷を下げる。 */
const FEATURED_CAST_IDS = ['hero', 'kuon', 'takano', 'yuki', 'tabuchi', 'hashimoto']

function CastCard({ c }: { c: Character }) {
  return (
    <li className="rounded-xl border border-[var(--border)] bg-[var(--panel)]/40 px-3 py-2">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="text-sm font-bold text-[var(--text)]">{c.name}</span>
        <span className="text-[11px] text-amber-300">{c.role}</span>
        <span className="ml-auto rounded bg-[var(--bg-deep)]/50 px-1.5 py-0.5 text-[10px] text-[var(--text-sub)]">
          {SIDE_LABEL[c.side]}
        </span>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-[var(--text-body)]">{c.blurb}</p>
      {/* 効く軸＝この相手に最も響く判断（キャラごとに正解の軸が違う）。 */}
      {c.meterTie && (
        <span
          className={`mt-1.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${METER_META[c.meterTie].chip}`}
        >
          効く軸：<span aria-hidden="true">{METER_META[c.meterTie].icon}</span> {METER_META[c.meterTie].full}
        </span>
      )}
    </li>
  )
}

/** オープニング。SaaSベンダーのエンジニアが"第一号のFDE"として物流現場へ潜入する導入。
 *  パネルを順に送り、最後に登場人物を見せてからゲーム本編へ。Esc でスキップ可能。
 *  2周目以降（generation > 0）は登場人物ページに直行し、即はじめるボタンを前面表示。 */
export function Prologue({ onClose, generation = 0 }: Props) {
  // 2周目以降は登場人物ページ（キャストページ）を直接表示
  const initialStep = generation > 0 ? PROLOGUE_PANELS.length : 0
  // index 0..panels-1 がパネル、panels が登場人物ページ
  const [step, setStep] = useState(initialStep)
  // 登場人物「全員を見る」展開状態
  const [castExpanded, setCastExpanded] = useState(false)
  const ref = useFocusTrap<HTMLDivElement>(onClose)
  const lastPanel = PROLOGUE_PANELS.length - 1
  const onCast = step === PROLOGUE_PANELS.length
  const panel = PROLOGUE_PANELS[Math.min(step, lastPanel)]

  const next = () => setStep((s) => Math.min(s + 1, PROLOGUE_PANELS.length))

  const featuredCast = CAST.filter((c) => FEATURED_CAST_IDS.includes(c.id))
  const restCast = CAST.filter((c) => !FEATURED_CAST_IDS.includes(c.id))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg-deep)]/95 px-safe pt-safe pb-safe backdrop-blur-sm">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label="プロローグ"
        className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl"
      >
        <div className="space-y-4 px-6 py-6">
          <div className="sticky top-0 z-10 -mx-6 -mt-6 flex items-center justify-between gap-2 border-b border-[var(--border)] bg-[var(--card)]/95 px-6 py-3 backdrop-blur-sm">
            <p className="text-xs font-semibold tracking-wide text-amber-400">
              PROLOGUE ── 第1章「沈黙する基幹システム」
            </p>
            {/* 上部のショートカット。登場人物ページは一覧が長いので、下までスクロールせず開始できるよう常時表示する。 */}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-[44px] shrink-0 items-center rounded-lg border border-[var(--border)] px-3 py-2 text-xs text-[var(--text-sub)] transition hover:bg-[var(--panel)]"
            >
              {onCast ? 'はじめる' : 'スキップ'}
            </button>
          </div>

          {!onCast ? (
            <article className="space-y-3">
              {panel.image && AVAILABLE_IMAGES.has(panel.image) && (
                <img
                  src={imageUrl(panel.image)}
                  alt=""
                  className="h-44 w-full rounded-xl object-cover sm:h-52"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              )}
              <h1 className="text-lg font-bold text-[var(--text)]">{panel.heading}</h1>
              <p className="whitespace-pre-line text-[15px] leading-relaxed text-[var(--text-body)]">{panel.body}</p>
              <div className="flex items-center gap-1.5 pt-1" aria-hidden="true">
                {PROLOGUE_PANELS.map((p, i) => (
                  <span
                    key={p.heading}
                    className={`h-1.5 rounded-full transition-all ${
                      i === step ? 'w-6 bg-[var(--accent)]' : 'w-1.5 bg-[var(--border)]'
                    }`}
                  />
                ))}
              </div>
            </article>
          ) : (
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h1 className="text-lg font-bold text-[var(--text)]">登場人物</h1>
                {generation > 0 && (
                  <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
                    2周目以降
                  </span>
                )}
              </div>
              {/* 二重構造の舞台モチーフ：表（受託の常駐）と裏（文化変革）の二面性を明示し、群像の意味づけをする。 */}
              <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-xs leading-relaxed text-violet-100">
                <p className="font-semibold text-violet-200">
                  <span aria-hidden="true">🎭</span> 二重の任務
                </p>
                <p className="mt-0.5">
                  表の顔は、「StockPilot」を直しに来た常駐エンジニア。だが裏には、二つの本当の任務がある。
                  ひとつは、現場にアジャイルの文化を根づかせ
                  <span className="font-semibold">あなたが去っても回り続ける組織</span>を残すこと。
                  もうひとつは、現場でしか掴めない<span className="font-semibold">"次の機能の種"</span>
                  を吸い上げ、自社SaaS「StockPilot」へ還元すること。
                  AIで誰でもソフトを作れる時代に、現場に立つFDEだけが見つけられる価値が、会社の生き残る道だ。
                </p>
              </div>
              <p className="text-xs text-[var(--text-sub)]">
                この物語で何度も顔を合わせる相手。彼らとの距離が、3つのメーターになる。
              </p>
              {/* 主要6人：プロローグで必ず出会う人物 */}
              <ul className="space-y-2">
                {featuredCast.map((c) => (
                  <CastCard key={c.id} c={c} />
                ))}
              </ul>
              {/* 残り7人：「全員を見る」で展開（初見の認知負荷を下げる） */}
              {restCast.length > 0 && (
                <div>
                  <button
                    type="button"
                    aria-expanded={castExpanded}
                    aria-controls="prologue-rest-cast"
                    onClick={() => setCastExpanded((v) => !v)}
                    className="flex min-h-[44px] w-full items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2 text-xs text-[var(--text-sub)] transition hover:bg-[var(--panel)]"
                  >
                    <span>{castExpanded ? '閉じる' : `他の登場人物（${restCast.length}人）を見る`}</span>
                    <span aria-hidden="true" className={`transition-transform ${castExpanded ? 'rotate-180' : ''}`}>
                      ▾
                    </span>
                  </button>
                  <ul id="prologue-rest-cast" hidden={!castExpanded} className="mt-2 space-y-2">
                    {restCast.map((c) => (
                      <CastCard key={c.id} c={c} />
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            {onCast ? (
              <button
                type="button"
                onClick={onClose}
                data-initial-focus
                className="min-h-[44px] rounded-xl bg-[var(--accent)] px-6 py-3 font-bold text-[var(--bg)] transition hover:bg-[var(--accent-hover)] active:scale-95"
              >
                現場に立つ（はじめる）
              </button>
            ) : (
              <button
                type="button"
                onClick={next}
                data-initial-focus
                className="min-h-[44px] rounded-xl bg-[var(--accent)] px-6 py-3 font-bold text-[var(--bg)] transition hover:bg-[var(--accent-hover)] active:scale-95"
              >
                {step === lastPanel ? '登場人物を見る' : '次へ（Enter）'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
