import { useState } from 'react'
import { dealHearing, type HearingOption, type HearingTheme, scoreHearing } from '../../data/minigames'
import { sfxTick } from '../../engine/sfx'
import type { ExecTier } from '../../types'

interface Props {
  seed: number
  theme?: HearingTheme
  onResolve: (tier: ExecTier) => void
}

/** ヒアリング・ミニゲーム：5つの問いから「深掘りになる質問」を2つ選ぶ（現場主義）。
 *  theme で相手・場面に応じた問いを出す（毎回同じにならないように）。 */
export function MiniGameHearing({ seed, theme, onResolve }: Props) {
  const [options] = useState<HearingOption[]>(() => dealHearing(seed, theme))
  const [picked, setPicked] = useState<number[]>([])
  const ready = picked.length === 2

  const toggle = (i: number) => {
    const has = picked.includes(i)
    if (!has && picked.length >= 2) return // 早期: 確実な上限到達時は音も鳴らさない
    sfxTick(!has)
    setPicked((p) => {
      if (!has && p.length >= 2) return p // 二重ガード: 連打でも上限を超えない
      return has ? p.filter((x) => x !== i) : [...p, i]
    })
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-300">
        現場に、どの問いを投げる？ <span className="text-slate-400">深掘りになる質問を2つ選ぶ</span>
      </p>
      <ul className="space-y-2">
        {options.map((o, i) => {
          const on = picked.includes(i)
          return (
            <li key={o.text}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => toggle(i)}
                data-initial-focus={i === 0 ? true : undefined}
                className={`block w-full rounded-xl border px-4 py-3 text-left text-sm transition active:scale-[0.98] ${
                  on
                    ? 'border-sky-400 bg-sky-500/20 text-slate-100 ring-1 ring-sky-400/60'
                    : 'border-slate-700 bg-slate-800/40 text-slate-200 hover:border-sky-500/50 hover:bg-slate-800'
                }`}
              >
                <span
                  key={on ? 'on' : 'off'}
                  className={`mr-1.5 text-base ${on ? 'check-pop text-sky-300' : 'text-slate-400'}`}
                  aria-hidden="true"
                >
                  {on ? '☑' : '☐'}
                </span>
                {o.text}
              </button>
            </li>
          )
        })}
      </ul>
      <button
        type="button"
        disabled={!ready}
        onClick={() => onResolve(scoreHearing(picked.map((i) => options[i])))}
        className="min-h-[44px] w-full rounded-xl bg-sky-500 py-3 font-bold text-slate-950 transition hover:bg-sky-400 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-400"
      >
        {ready ? 'この2つで掘る' : `あと ${2 - picked.length} つ選ぶ`}
      </button>
    </div>
  )
}
