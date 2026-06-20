import { describe, expect, it } from 'vitest'
import type { Persisted } from '../engine/progression'
import { isValidPersisted, sanitizeSeenPrecepts } from './engagementStore'

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
    expect(isValidPersisted({ ...valid, log: [{ ...valid.log[0], resultText: 123 }] })).toBe(false)
    expect(isValidPersisted({ ...valid, log: [{ ...valid.log[0], choiceLabel: undefined }] })).toBe(false)
  })

  it('resolvedIds / flags に非文字列が混ざれば弾く', () => {
    expect(isValidPersisted({ ...valid, resolvedIds: ['ok', 5] })).toBe(false)
    expect(isValidPersisted({ ...valid, flags: [true] })).toBe(false)
  })

  it('flags が GameFlag union 外の文字列なら弾く', () => {
    expect(isValidPersisted({ ...valid, flags: ['bogusFlag'] })).toBe(false)
  })

  it('log の ceremony が Ceremony union 外なら弾く', () => {
    expect(isValidPersisted({ ...valid, log: [{ ...valid.log[0], ceremony: 'standup' }] })).toBe(false)
  })

  it('空の log / resolvedIds / flags は許容する', () => {
    expect(isValidPersisted({ ...valid, log: [], resolvedIds: [], flags: [] })).toBe(true)
  })

  it('sprintIndex / beatIndex の範囲外は弾く', () => {
    expect(isValidPersisted({ ...valid, sprintIndex: -1 })).toBe(false)
    expect(isValidPersisted({ ...valid, beatIndex: 999 })).toBe(false)
  })
  it('sprintIndex / beatIndex の非整数（小数・NaN）を弾く（ソフトロック防止）', () => {
    expect(isValidPersisted({ ...valid, beatIndex: 2.5 })).toBe(false)
    expect(isValidPersisted({ ...valid, sprintIndex: 1.5 })).toBe(false)
    expect(isValidPersisted({ ...valid, beatIndex: Number.NaN })).toBe(false)
  })
  it('aiTokens は任意。負値/非整数/NaN は弾くが、上限超過は破棄せず通す（restore で clamp）', () => {
    expect(isValidPersisted({ ...valid, aiTokens: 1500 })).toBe(true)
    expect(isValidPersisted({ ...valid })).toBe(true) // 旧セーブ（aiTokens 無し）
    expect(isValidPersisted({ ...valid, aiTokens: 999999 })).toBe(true) // 上限超過は全消しせず clamp に委ねる
    expect(isValidPersisted({ ...valid, aiTokens: -1 })).toBe(false)
    expect(isValidPersisted({ ...valid, aiTokens: 12.5 })).toBe(false)
    expect(isValidPersisted({ ...valid, aiTokens: Number.NaN })).toBe(false)
  })
  it('velocity / valueHistory の sparse な穴（JSON往復の null）は通す（restore で 0 に正規化）', () => {
    // index=sprintIndex を保つ sparse 配列は JSON.stringify で穴が null になる。これで全消ししない。
    expect(isValidPersisted({ ...valid, velocity: [null, null, 8] })).toBe(true)
    expect(isValidPersisted({ ...valid, valueHistory: [null, 40, null] })).toBe(true)
  })
  it('velocity / valueHistory は型が壊れた要素（非数値・負・非配列）なら弾く', () => {
    expect(isValidPersisted({ ...valid, valueHistory: ['x'] })).toBe(false)
    expect(isValidPersisted({ ...valid, valueHistory: [-1] })).toBe(false)
    expect(isValidPersisted({ ...valid, valueHistory: 'nope' })).toBe(false)
    expect(isValidPersisted({ ...valid, valueBaseline: 'x' })).toBe(false)
  })
})

describe('sanitizeSeenPrecepts', () => {
  it('実在する心得ID（1..100）だけを残す', () => {
    expect([...sanitizeSeenPrecepts([1, 50, 100])]).toEqual([1, 50, 100])
  })
  it('範囲外・非整数・非数値・非配列を除外する（101/100 を防ぐ）', () => {
    expect([...sanitizeSeenPrecepts([0, 101, 99999, 3.5, '5', null, 42])]).toEqual([42])
    expect(sanitizeSeenPrecepts('nope').size).toBe(0)
    expect(sanitizeSeenPrecepts(null).size).toBe(0)
  })
})
