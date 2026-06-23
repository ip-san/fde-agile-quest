// @vitest-environment node
// pickHeadline は DOM 不要の純関数テスト。
import { describe, expect, it } from 'vitest'
import type { Meters, ResultView } from '../types'
import { type HeadlineKind, pickHeadline } from './ResultModal'

/** テスト用の ResultView 最小セット */
const base = (): Pick<ResultView, 'execTier' | 'tierResultText' | 'newPreceptIds' | 'backlogReview'> => ({
  execTier: undefined,
  tierResultText: undefined,
  newPreceptIds: [],
  backlogReview: undefined,
})

const noMeter: (keyof Meters)[] = []
const withDanger: (keyof Meters)[] = ['trust']

describe('pickHeadline — 5段階優先度', () => {
  it('1) dangerMeters がある場合は danger を返す', () => {
    const result: HeadlineKind = pickHeadline(base(), withDanger)
    expect(result).toBe('danger')
  })

  it('1) onBrink でも danger を返す（danger 優先度が最高）', () => {
    const r = { ...base(), execTier: 'great' as const, tierResultText: '会心！', newPreceptIds: [1] }
    expect(pickHeadline(r, withDanger)).toBe('danger')
  })

  it('2) great + tierResultText は greatExit を返す（dangerMeters なし）', () => {
    const r = { ...base(), execTier: 'great' as const, tierResultText: '踏ん張った！' }
    expect(pickHeadline(r, noMeter)).toBe('greatExit')
  })

  it('2) great でも tierResultText がなければ greatExit にならない', () => {
    const r = { ...base(), execTier: 'great' as const, tierResultText: undefined }
    // newPreceptIds も無く backlogReview も無ければ normal
    expect(pickHeadline(r, noMeter)).toBe('normal')
  })

  it('2) poor + tierResultText は greatExit にならない（danger/precept/valueGain/normal）', () => {
    const r = { ...base(), execTier: 'poor' as const, tierResultText: '詰めが甘かった' }
    expect(pickHeadline(r, noMeter)).toBe('normal')
  })

  it('3) 新規心得がある場合は precept を返す（danger/greatExit なし）', () => {
    const r = { ...base(), newPreceptIds: [5, 12] }
    expect(pickHeadline(r, noMeter)).toBe('precept')
  })

  it('3) precept は greatExit より低優先度', () => {
    const r = { ...base(), execTier: 'great' as const, tierResultText: '会心！', newPreceptIds: [1] }
    expect(pickHeadline(r, noMeter)).toBe('greatExit')
  })

  it('4) backlogReview.valueGain>0 の場合は valueGain を返す', () => {
    const r = {
      ...base(),
      backlogReview: {
        done: [],
        carryover: [],
        velocity: 5,
        cultureDelta: 0,
        valueGain: 3,
      },
    }
    expect(pickHeadline(r, noMeter)).toBe('valueGain')
  })

  it('4) backlogReview.valueGain===0 は valueGain にならない', () => {
    const r = {
      ...base(),
      backlogReview: {
        done: [],
        carryover: [],
        velocity: 0,
        cultureDelta: 0,
        valueGain: 0,
      },
    }
    expect(pickHeadline(r, noMeter)).toBe('normal')
  })

  it('4) backlogReview.valueGain<0 は valueGain にならない', () => {
    const r = {
      ...base(),
      backlogReview: {
        done: [],
        carryover: [],
        velocity: 0,
        cultureDelta: -1,
        valueGain: -2,
      },
    }
    expect(pickHeadline(r, noMeter)).toBe('normal')
  })

  it('5) 何もなければ normal を返す', () => {
    expect(pickHeadline(base(), noMeter)).toBe('normal')
  })

  it('danger + tierResultText あり: danger を返す（tier 情報は危険圏に勝てない）', () => {
    // headlineKind=danger の時、tierResultText があっても danger が返る。
    // JSX 側では `headlineKind !== 'greatExit'` ガードにより tierResultText が下部に表示される。
    const r = { ...base(), execTier: 'great' as const, tierResultText: '会心！' }
    expect(pickHeadline(r, withDanger)).toBe('danger')
  })

  it('danger + tierResultText: greatExit より danger 優先（headlineKind !== greatExit ガードを確認）', () => {
    // danger のとき headlineKind !== 'greatExit' は true なので tierResultText の下部表示パスが開く。
    // （greatExit 主役ブロックとは排他であり、danger 時は下部経路のみ）
    const r = { ...base(), execTier: 'great' as const, tierResultText: '踏ん張った' }
    const kind = pickHeadline(r, withDanger)
    expect(kind).toBe('danger')
    // danger 時は headlineKind !== 'greatExit' が true → tierResultText の下部表示が開く
    expect(kind !== 'greatExit').toBe(true)
  })

  it('4) valueGain は precept より低優先度', () => {
    const r = {
      ...base(),
      newPreceptIds: [7],
      backlogReview: {
        done: [],
        carryover: [],
        velocity: 5,
        cultureDelta: 0,
        valueGain: 10,
      },
    }
    expect(pickHeadline(r, noMeter)).toBe('precept')
  })
})
