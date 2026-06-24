// @vitest-environment node
// pickHeadline / splitHeadlineSentence は DOM 不要の純関数テスト。
import { describe, expect, it } from 'vitest'
import type { Meters, ResultView } from '../types'
import { type HeadlineKind, pickHeadline, splitHeadlineSentence } from './ResultModal'

/** テスト用の ResultView 最小セット */
const base = (): Pick<ResultView, 'execTier' | 'tierResultText' | 'newPreceptIds' | 'backlogReview' | 'effects'> => ({
  execTier: undefined,
  tierResultText: undefined,
  newPreceptIds: [],
  backlogReview: undefined,
  effects: {},
})

const noMeter: (keyof Meters)[] = []
const withDanger: (keyof Meters)[] = ['trust']

/** テスト用のメーター最小セット */
const defaultMeters: Meters = { trust: 5, insight: 5, culture: 5 }

describe('splitHeadlineSentence — normal ヘッドライン分割', () => {
  it('句点がある場合、最初の句点を含む部分を head に、残りを rest に返す', () => {
    const { head, rest } = splitHeadlineSentence('結城さんの顔がほどけた。"約束を守ってくれる人"。信頼が増す。')
    expect(head).toBe('結城さんの顔がほどけた。')
    expect(rest).toBe('"約束を守ってくれる人"。信頼が増す。')
  })

  it('句点が1つだけの場合、全文が head、rest は空文字', () => {
    const { head, rest } = splitHeadlineSentence('見なかったことにした。')
    expect(head).toBe('見なかったことにした。')
    expect(rest).toBe('')
  })

  it('句点がない場合、全文が head、rest は空文字', () => {
    const { head, rest } = splitHeadlineSentence('句点のないテキスト')
    expect(head).toBe('句点のないテキスト')
    expect(rest).toBe('')
  })

  it('先頭直後に句点がある場合も正しく分割する', () => {
    const { head, rest } = splitHeadlineSentence('短文。残り部分。')
    expect(head).toBe('短文。')
    expect(rest).toBe('残り部分。')
  })

  it('rest の先頭スペースはトリムされる', () => {
    const { head, rest } = splitHeadlineSentence('head部分。 　rest部分。')
    expect(head).toBe('head部分。')
    expect(rest).toBe('rest部分。')
  })
})

describe('pickHeadline — 7段階優先度', () => {
  it('1) dangerMeters がある場合は danger を返す', () => {
    const result: HeadlineKind = pickHeadline(base(), withDanger, defaultMeters)
    expect(result).toBe('danger')
  })

  it('1) onBrink でも danger を返す（danger 優先度が最高）', () => {
    const r = { ...base(), execTier: 'great' as const, tierResultText: '会心！', newPreceptIds: [1] }
    expect(pickHeadline(r, withDanger, defaultMeters)).toBe('danger')
  })

  it('2) great + tierResultText は greatExit を返す（dangerMeters なし）', () => {
    const r = { ...base(), execTier: 'great' as const, tierResultText: '踏ん張った！' }
    expect(pickHeadline(r, noMeter, defaultMeters)).toBe('greatExit')
  })

  it('2) great でも tierResultText がなければ greatExit にならない', () => {
    const r = { ...base(), execTier: 'great' as const, tierResultText: undefined }
    // newPreceptIds も無く backlogReview も無ければ normal
    expect(pickHeadline(r, noMeter, defaultMeters)).toBe('normal')
  })

  it('3) poor + tierResultText は poorExit を返す', () => {
    const r = { ...base(), execTier: 'poor' as const, tierResultText: '詰めが甘かった' }
    expect(pickHeadline(r, noMeter, defaultMeters)).toBe('poorExit')
  })

  it('3) poor でも tierResultText がなければ poorExit にならない', () => {
    const r = { ...base(), execTier: 'poor' as const, tierResultText: undefined }
    expect(pickHeadline(r, noMeter, defaultMeters)).toBe('normal')
  })

  it('3) poorExit は greatExit より低優先度', () => {
    // great + poor の両方が揃うことは通常ないが、greatExit が優先されることを確認
    const r = { ...base(), execTier: 'great' as const, tierResultText: '会心！' }
    expect(pickHeadline(r, noMeter, defaultMeters)).toBe('greatExit')
  })

  it('3) poorExit は danger より低優先度', () => {
    const r = { ...base(), execTier: 'poor' as const, tierResultText: '詰めが甘かった' }
    expect(pickHeadline(r, withDanger, defaultMeters)).toBe('danger')
  })

  it('4) 新規心得がある場合は precept を返す（danger/greatExit/poorExit なし）', () => {
    const r = { ...base(), newPreceptIds: [5, 12] }
    expect(pickHeadline(r, noMeter, defaultMeters)).toBe('precept')
  })

  it('4) precept は greatExit より低優先度', () => {
    const r = { ...base(), execTier: 'great' as const, tierResultText: '会心！', newPreceptIds: [1] }
    expect(pickHeadline(r, noMeter, defaultMeters)).toBe('greatExit')
  })

  it('4) precept は poorExit より低優先度', () => {
    const r = { ...base(), execTier: 'poor' as const, tierResultText: '詰めが甘かった', newPreceptIds: [1] }
    expect(pickHeadline(r, noMeter, defaultMeters)).toBe('poorExit')
  })

  it('5) backlogReview.valueGain>0 の場合は valueGain を返す', () => {
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
    expect(pickHeadline(r, noMeter, defaultMeters)).toBe('valueGain')
  })

  it('5) backlogReview.valueGain===0 は valueGain にならない', () => {
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
    expect(pickHeadline(r, noMeter, defaultMeters)).toBe('normal')
  })

  it('5) backlogReview.valueGain<0 は valueGain にならない', () => {
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
    expect(pickHeadline(r, noMeter, defaultMeters)).toBe('normal')
  })

  it('6) effects.culture>0 かつ meters.culture>=6 の場合は cultureLand を返す', () => {
    const r = { ...base(), effects: { culture: 1 } }
    const m: Meters = { trust: 5, insight: 5, culture: 6 }
    expect(pickHeadline(r, noMeter, m)).toBe('cultureLand')
  })

  it('6) effects.culture>0 でも meters.culture<6 なら cultureLand にならない（閾値未満）', () => {
    const r = { ...base(), effects: { culture: 1 } }
    const m: Meters = { trust: 5, insight: 5, culture: 5 }
    expect(pickHeadline(r, noMeter, m)).toBe('normal')
  })

  it('6) effects.culture===0 かつ meters.culture>=6 でも cultureLand にならない（delta ゼロ）', () => {
    const r = { ...base(), effects: { culture: 0 } }
    const m: Meters = { trust: 5, insight: 5, culture: 8 }
    expect(pickHeadline(r, noMeter, m)).toBe('normal')
  })

  it('6) cultureLand は precept より低優先度（precept が勝つ）', () => {
    const r = { ...base(), newPreceptIds: [3], effects: { culture: 2 } }
    const m: Meters = { trust: 5, insight: 5, culture: 7 }
    expect(pickHeadline(r, noMeter, m)).toBe('precept')
  })

  it('7) 何もなければ normal を返す', () => {
    expect(pickHeadline(base(), noMeter, defaultMeters)).toBe('normal')
  })

  it('danger + tierResultText あり: danger を返す（tier 情報は危険圏に勝てない）', () => {
    // headlineKind=danger の時、tierResultText があっても danger が返る。
    // JSX 側では `headlineKind !== 'greatExit'` ガードにより tierResultText が下部に表示される。
    const r = { ...base(), execTier: 'great' as const, tierResultText: '会心！' }
    expect(pickHeadline(r, withDanger, defaultMeters)).toBe('danger')
  })

  it('danger + tierResultText: greatExit より danger 優先（headlineKind !== greatExit ガードを確認）', () => {
    // danger のとき headlineKind !== 'greatExit' は true なので tierResultText の下部表示パスが開く。
    // （greatExit 主役ブロックとは排他であり、danger 時は下部経路のみ）
    const r = { ...base(), execTier: 'great' as const, tierResultText: '踏ん張った' }
    const kind = pickHeadline(r, withDanger, defaultMeters)
    expect(kind).toBe('danger')
    // danger 時は headlineKind !== 'greatExit' が true → tierResultText の下部表示が開く
    expect(kind !== 'greatExit').toBe(true)
  })

  it('5) valueGain は precept より低優先度', () => {
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
    expect(pickHeadline(r, noMeter, defaultMeters)).toBe('precept')
  })
})
