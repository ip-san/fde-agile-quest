import { describe, expect, it } from 'vitest'
import { dealDevSteps, dealHearing, scoreHearing, scoreTiming } from './minigames'

describe('dealHearing', () => {
  it('良2・悪3 の5択を返し、同じ seed で決定的', () => {
    const a = dealHearing(7)
    expect(a).toHaveLength(5)
    expect(a.filter((o) => o.good)).toHaveLength(2)
    expect(a.filter((o) => !o.good)).toHaveLength(3)
    expect(dealHearing(7)).toEqual(a) // 決定的
  })
  it('seed が違えば内容/並びが変わりうる', () => {
    // 少なくともいくつかの seed で並びが一致しないこと（固定化していない）
    const same = [1, 2, 3, 4].every((s) => JSON.stringify(dealHearing(s)) === JSON.stringify(dealHearing(0)))
    expect(same).toBe(false)
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

describe('dealDevSteps', () => {
  it('great/good/poor を1つずつ含む3択を返す（決定的）', () => {
    const s = dealDevSteps(5)
    expect(s).toHaveLength(3)
    expect(new Set(s.map((x) => x.tier))).toEqual(new Set(['great', 'good', 'poor']))
    expect(dealDevSteps(5)).toEqual(s)
  })
})
