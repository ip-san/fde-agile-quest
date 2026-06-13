import { Fragment, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { GLOSSARY } from '../data/glossary'

/** {{用語}} を含む文字列を、用語ホバー解説つきに変換して描画する。
 *  interactive=false のときは button を作らず（＝ボタン内に置いても入れ子にならない）、
 *  native の title 属性つき span で軽い解説だけ出す（選択肢ラベル等で使う） */
export function RichText({ text, interactive = true }: { text: string; interactive?: boolean }) {
  const parts = text.split(/(\{\{.+?\}\})/g)
  return (
    <>
      {parts.map((part, i) => {
        const m = part.match(/^\{\{(.+?)\}\}$/)
        if (!m) return <Fragment key={i}>{part}</Fragment>
        const term = GLOSSARY[m[1]]
        if (!term) return <Fragment key={i}>{m[1]}</Fragment>
        if (!interactive) {
          const tip = `${term.label}${term.reading ? `（${term.reading}）` : ''}：${term.desc}`
          return (
            <span
              key={i}
              title={tip}
              className="font-semibold text-sky-300 underline decoration-sky-400/50 decoration-dotted underline-offset-2"
            >
              {term.label}
            </span>
          )
        }
        return <TermChip key={i} termKey={m[1]} />
      })}
    </>
  )
}

interface TipPos {
  top: number
  left: number
  width: number
  below: boolean
}

/** チップの位置から、ビューポート内に必ず収まる固定座標を計算する（スマホ端での見切れ回避）。
 *  幅は画面幅-16px を上限にクランプし、左右は画面端から8pxの余白に収める。 */
function computePos(rect: DOMRect): TipPos {
  const margin = 8
  const vw = window.innerWidth
  const width = Math.min(288, vw - margin * 2)
  const center = rect.left + rect.width / 2
  const left = Math.min(Math.max(center - width / 2, margin), vw - width - margin)
  const below = rect.top < window.innerHeight * 0.42
  const top = below ? rect.bottom + 8 : rect.top - 8
  return { top, left, width, below }
}

function TermChip({ termKey }: { termKey: string }) {
  const [pos, setPos] = useState<TipPos | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const tipId = useId()
  const term = GLOSSARY[termKey]
  const open = pos !== null

  const show = () => {
    const r = btnRef.current?.getBoundingClientRect()
    if (r) setPos(computePos(r))
  }
  const hide = () => setPos(null)

  return (
    <span className="inline-flex">
      <button
        ref={btnRef}
        type="button"
        aria-expanded={open}
        aria-describedby={open ? tipId : undefined}
        className="inline-flex cursor-help items-center font-semibold text-sky-300 underline decoration-sky-400/50 decoration-dotted underline-offset-2"
        onClick={() => (open ? hide() : show())}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && open) {
            e.stopPropagation()
            hide()
          }
        }}
      >
        {term.label}
      </button>
      {open &&
        pos &&
        createPortal(
          <span
            id={tipId}
            role="tooltip"
            style={{
              position: 'fixed',
              top: pos.top,
              left: pos.left,
              width: pos.width,
              transform: pos.below ? undefined : 'translateY(-100%)',
            }}
            className="z-[60] rounded-lg border border-sky-500/40 bg-slate-900/98 p-3 text-left text-xs font-normal leading-relaxed text-slate-200 shadow-xl shadow-black/50"
          >
            <span className="mb-1 block font-bold text-sky-300">
              {term.label}
              {term.reading && (
                <span className="ml-1 text-[10px] text-slate-400">（{term.reading}）</span>
              )}
            </span>
            {term.desc}
          </span>,
          document.body,
        )}
    </span>
  )
}
