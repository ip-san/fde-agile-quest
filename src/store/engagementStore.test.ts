import { describe, expect, it } from 'vitest'
import type { Persisted } from '../engine/progression'
import { isValidPersisted } from './engagementStore'

// 正常な永続データ（Sprint1・最初の daily 進行中を想定）
const valid: Persisted = {
  meters: { trust: 5, insight: 4, culture: 4 },
  sprintIndex: 0,
  beatIndex: 1,
  resolvedIds: ['s1-plan-goal'],
  flags: ['wrongKpi'],
  log: [
    {
      sprint: 1,
      ceremony: 'planning',
      eventTitle: 'ゴール設定',
      choiceLabel: 'KPIを置く',
      resultText: '前に進んだ',
    },
  ],
}

describe('isValidPersisted', () => {
  it('正常な永続データは通す', () => {
    expect(isValidPersisted(valid)).toBe(true)
  })

  it('非オブジェクト/欠損は弾く', () => {
    expect(isValidPersisted(null)).toBe(false)
    expect(isValidPersisted('x')).toBe(false)
    expect(isValidPersisted({})).toBe(false)
    expect(isValidPersisted({ ...valid, meters: undefined })).toBe(false)
  })

  it('メーターが範囲外・非整数・非数値なら弾く', () => {
    expect(isValidPersisted({ ...valid, meters: { trust: 11, insight: 4, culture: 4 } })).toBe(false)
    expect(isValidPersisted({ ...valid, meters: { trust: -1, insight: 4, culture: 4 } })).toBe(false)
    expect(isValidPersisted({ ...valid, meters: { trust: 7.5, insight: 4, culture: 4 } })).toBe(false)
    expect(isValidPersisted({ ...valid, meters: { trust: '5', insight: 4, culture: 4 } })).toBe(false)
  })

  it('log 要素が LogEntry の形でない（非文字列フィールド）なら弾く', () => {
    expect(isValidPersisted({ ...valid, log: [null] })).toBe(false)
    expect(isValidPersisted({ ...valid, log: ['oops'] })).toBe(false)
    expect(
      isValidPersisted({ ...valid, log: [{ ...valid.log[0], resultText: 123 }] }),
    ).toBe(false)
    expect(
      isValidPersisted({ ...valid, log: [{ ...valid.log[0], choiceLabel: undefined }] }),
    ).toBe(false)
  })

  it('resolvedIds / flags に非文字列が混ざれば弾く', () => {
    expect(isValidPersisted({ ...valid, resolvedIds: ['ok', 5] })).toBe(false)
    expect(isValidPersisted({ ...valid, flags: [true] })).toBe(false)
  })

  it('flags が GameFlag union 外の文字列なら弾く', () => {
    expect(isValidPersisted({ ...valid, flags: ['bogusFlag'] })).toBe(false)
  })

  it('log の ceremony が Ceremony union 外なら弾く', () => {
    expect(
      isValidPersisted({ ...valid, log: [{ ...valid.log[0], ceremony: 'standup' }] }),
    ).toBe(false)
  })

  it('空の log / resolvedIds / flags は許容する', () => {
    expect(isValidPersisted({ ...valid, log: [], resolvedIds: [], flags: [] })).toBe(true)
  })

  it('sprintIndex / beatIndex の範囲外は弾く', () => {
    expect(isValidPersisted({ ...valid, sprintIndex: -1 })).toBe(false)
    expect(isValidPersisted({ ...valid, beatIndex: 999 })).toBe(false)
  })
})
