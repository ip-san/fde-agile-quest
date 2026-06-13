import { Fragment, useId, useRef, useState } from 'react'
import { GLOSSARY } from '../data/glossary'

/** {{用語}} を含む文字列を、用語ホバー解説つきに変換して描画する */
export function RichText({ text }: { text: string }) {
  const parts = text.split(/(\{\{.+?\}\})/g)
  return (
    <>
      {parts.map((part, i) => {
        const m = part.match(/^\{\{(.+?)\}\}$/)
        if (!m) return <Fragment key={i}>{part}</Fragment>
        const term = GLOSSARY[m[1]]
        if (!term) return <Fragment key={i}>{m[1]}</Fragment>
        return <TermChip key={i} termKey={m[1]} />
      })}
    </>
  )
}

function TermChip({ termKey }: { termKey: string }) {
  const [open, setOpen] = useState(false)
  // 画面上部の用語は下向き、下部は上向きにツールチップを出す（モーダル端での見切れ回避）
  const [below, setBelow] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const tipId = useId()
  const term = GLOSSARY[termKey]

  const show = () => {
    const r = btnRef.current?.getBoundingClientRect()
    if (r) setBelow(r.top < window.innerHeight * 0.42)
    setOpen(true)
  }

  return (
    <span className="relative inline-flex">
      <button
        ref={btnRef}
        type="button"
        aria-expanded={open}
        aria-describedby={open ? tipId : undefined}
        className="inline-flex cursor-help items-center font-semibold text-sky-300 underline decoration-sky-400/50 decoration-dotted underline-offset-2"
        onClick={() => (open ? setOpen(false) : show())}
        onMouseEnter={show}
        onMouseLeave={() => setOpen(false)}
        onFocus={show}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && open) {
            e.stopPropagation()
            setOpen(false)
          }
        }}
      >
        {term.label}
      </button>
      {open && (
        <span
          id={tipId}
          role="tooltip"
          className={`absolute left-1/2 z-50 w-64 max-w-[80vw] -translate-x-1/2 rounded-lg border border-sky-500/40 bg-slate-900/98 p-3 text-left text-xs font-normal leading-relaxed text-slate-200 shadow-xl shadow-black/50 ${
            below ? 'top-full mt-2' : 'bottom-full mb-2'
          }`}
        >
          <span className="mb-1 block font-bold text-sky-300">
            {term.label}
            {term.reading && (
              <span className="ml-1 text-[10px] text-slate-400">（{term.reading}）</span>
            )}
          </span>
          {term.desc}
        </span>
      )}
    </span>
  )
}
