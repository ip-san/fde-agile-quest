// @vitest-environment jsdom
// jsdom は AudioContext を持たないため、sfx の各関数は安全に no-op になる。
// primeAudio が例外を投げないことを確認する（mobile-audio unlock パターンの実装保証）。

import { afterEach, describe, expect, it } from 'vitest'
import {
  isMuted,
  primeAudio,
  sfxDanger,
  sfxDecide,
  sfxPrecept,
  sfxReveal,
  sfxSpin,
  sfxStop,
  sfxTick,
  toggleMuted,
} from './sfx'

describe('sfx – jsdom (AudioContext 非対応環境)', () => {
  // muted は module-scope の状態。各テスト後に false へ正規化し、テスト順に依存しないようにする。
  afterEach(() => {
    if (isMuted()) toggleMuted()
  })

  it('primeAudio は例外を投げない', () => {
    expect(() => primeAudio()).not.toThrow()
  })

  it('primeAudio は複数回呼んでも例外を投げない（冪等）', () => {
    expect(() => {
      primeAudio()
      primeAudio()
      primeAudio()
    }).not.toThrow()
  })

  it('各効果音関数が例外を投げない', () => {
    expect(() => sfxTick(true)).not.toThrow()
    expect(() => sfxTick(false)).not.toThrow()
    expect(() => sfxDecide()).not.toThrow()
    expect(() => sfxReveal('impact')).not.toThrow()
    expect(() => sfxReveal('good')).not.toThrow()
    expect(() => sfxReveal('bad')).not.toThrow()
    expect(() => sfxReveal('normal')).not.toThrow()
    expect(() => sfxDanger()).not.toThrow()
    expect(() => sfxPrecept()).not.toThrow()
    expect(() => sfxSpin()).not.toThrow()
    expect(() => sfxStop()).not.toThrow()
  })

  it('isMuted / toggleMuted は AudioContext なしで動作する', () => {
    const initial = isMuted()
    const toggled = toggleMuted()
    expect(toggled).toBe(!initial)
    // 元に戻す
    toggleMuted()
  })
})
