import { describe, expect, it } from 'vitest'
import {
  dealDevFlow,
  dealHearing,
  type HearingTheme,
  hearingThemeFor,
  scoreHearing,
  scoreSequence,
  scoreTiming,
} from './minigames'

describe('dealHearing', () => {
  it('良2・悪3 の5択を返し、同じ seed で決定的', () => {
    const a = dealHearing(7)
    expect(a).toHaveLength(5)
    expect(a.filter((o) => o.good)).toHaveLength(2)
    expect(a.filter((o) => !o.good)).toHaveLength(3)
    expect(dealHearing(7)).toEqual(a) // 決定的
  })
  it('seed が違えば内容/並びが変わりうる', () => {
    const same = [1, 2, 3, 4].every((s) => JSON.stringify(dealHearing(s)) === JSON.stringify(dealHearing(0)))
    expect(same).toBe(false)
  })
  it('テーマ指定でも良2・悪3を保ち、テーマが違えば問いが変わる（ワンパターン回避）', () => {
    const themes: HearingTheme[] = ['genba', 'kokyaku', 'chance']
    for (const t of themes) {
      const r = dealHearing(7, t)
      expect(r.filter((o) => o.good)).toHaveLength(2)
      expect(r.filter((o) => !o.good)).toHaveLength(3)
    }
    // 同 seed でもテーマが違えば顔ぶれが変わる（少なくとも1ペアで不一致）
    const sets = themes.map((t) =>
      dealHearing(7, t)
        .map((o) => o.text)
        .sort()
        .join('|')
    )
    expect(new Set(sets).size).toBeGreaterThan(1)
  })
  it('hearingThemeFor: hearing 系セグメントを themed に、その他は kokyaku に寄せる', () => {
    expect(hearingThemeFor('genba')).toBe('genba')
    expect(hearingThemeFor('kokyaku')).toBe('kokyaku')
    expect(hearingThemeFor('chance')).toBe('chance')
    expect(hearingThemeFor('trouble')).toBe('kokyaku')
  })
})

describe('scoreHearing', () => {
  const g = { text: 'g', good: true }
  const b = { text: 'b', good: false }
  it('良問の数で great/good/poor', () => {
    expect(scoreHearing([g, g])).toBe('great')
    expect(scoreHearing([g, b])).toBe('good')
    expect(scoreHearing([b, b])).toBe('poor')
  })
})

describe('scoreTiming', () => {
  it('中央に近いほど great→good→poor', () => {
    expect(scoreTiming(50)).toBe('great')
    expect(scoreTiming(42)).toBe('great') // d=8 境界
    expect(scoreTiming(41)).toBe('good') // d=9
    expect(scoreTiming(72)).toBe('good') // d=22 境界
    expect(scoreTiming(73)).toBe('poor') // d=23
    expect(scoreTiming(0)).toBe('poor')
  })
})

describe('dealDevFlow', () => {
  it('正解フローと、それを並べ替えた提示を返す（最初から正解ではない・決定的）', () => {
    const f = dealDevFlow(5)
    expect([...f.steps].sort()).toEqual([...f.correct].sort()) // 同じ要素集合
    expect(f.steps).not.toEqual(f.correct) // 最初から正解の並びにはしない
    expect(dealDevFlow(5)).toEqual(f) // 決定的
  })
})

describe('scoreSequence', () => {
  const correct = ['a', 'b', 'c', 'd']
  it('正しい位置の数で great/good/poor', () => {
    expect(scoreSequence(['a', 'b', 'c', 'd'], correct)).toBe('great') // 4/4
    expect(scoreSequence(['a', 'b', 'd', 'c'], correct)).toBe('good') // 2/4
    expect(scoreSequence(['b', 'a', 'd', 'c'], correct)).toBe('poor') // 0/4
    expect(scoreSequence(['a', 'c', 'b', 'd'], correct)).toBe('good') // 2/4（境界 ceil(4/2)=2）
  })
})
