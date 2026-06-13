import { Fragment, useState } from 'react'
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
  const term = GLOSSARY[termKey]
  return (
    <span
      className="relative inline-flex cursor-help items-center font-semibold text-sky-300 underline decoration-sky-400/50 decoration-dotted underline-offset-2"
      tabIndex={0}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {term.label}
      {open && (
        <span
          role="tooltip"
          className="absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-lg border border-sky-500/40 bg-slate-900/98 p-3 text-left text-xs font-normal leading-relaxed text-slate-200 shadow-xl shadow-black/50"
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
