import { describe, expect, it } from 'vitest'
import { BASE_CAPACITY, PRODUCT_BACKLOG, STARTING_METERS } from '../data/chapters/chapter-01'
import type { Choice, GameEvent } from '../types'
import {
  estimateOf,
  forecastPoints,
  moveBacklogItem,
  reorderBacklog,
  resolveSprintBacklog,
  reviewBacklogProposal,
  sprintCapacity,
  toggleForecast,
} from './backlog'
import { chooseCore, freshCore, type ProgressCore, restoreCore, toPersisted } from './progression'

// 既知 PBI（テストは id を直に使うが、見積りは PRODUCT_BACKLOG から導出して内容変更に強くする）
const ID = {
  floor: 'pbi-floor-observe', // 3
  veteran: 'pbi-veteran-hearing', // 5
  asis: 'pbi-as-is-flow', // 2
} as const

const core = (over: Partial<ProgressCore> = {}): ProgressCore => ({ ...freshCore(STARTING_METERS), ...over })

describe('sprintCapacity', () => {
  it('初回（sprintIndex=0）は基準値 BASE_CAPACITY', () => {
    expect(sprintCapacity(core())).toBe(BASE_CAPACITY)
  })
  it('2スプリント目以降は前スプリントのベロシティ（昨日の天気）', () => {
    expect(sprintCapacity(core({ sprintIndex: 1, velocity: [6] }))).toBe(6)
  })
  it('前回ベロシティが0なら基準値に戻す（容量0ロックを避ける）', () => {
    expect(sprintCapacity(core({ sprintIndex: 1, velocity: [0] }))).toBe(BASE_CAPACITY)
  })
})

describe('toggleForecast', () => {
  it('プランニング中（freshCore=beat0）は予測に出し入れできる', () => {
    const c1 = toggleForecast(core(), ID.floor)
    expect(c1.sprintForecast).toEqual([ID.floor])
    const c2 = toggleForecast(c1, ID.floor)
    expect(c2.sprintForecast).toEqual([]) // もう一度で外れる
  })
  it('プランニング以外のビートでは no-op', () => {
    const c = core({ beatIndex: 1 }) // daily
    expect(toggleForecast(c, ID.floor)).toBe(c)
  })
  it('完了済み(backlogDone)の項目は予測に入れられない', () => {
    const c = core({ backlogDone: [ID.floor] })
    expect(toggleForecast(c, ID.floor).sprintForecast).toEqual([])
  })
  it('未知 id は無視', () => {
    const c = core()
    expect(toggleForecast(c, 'nope').sprintForecast).toEqual([])
  })
})

describe('forecastPoints', () => {
  it('予測の見積り合計を返す', () => {
    const c = core({ sprintForecast: [ID.floor, ID.veteran] })
    expect(forecastPoints(c)).toBe(estimateOf(ID.floor) + estimateOf(ID.veteran))
  })
})

describe('reorderBacklog / moveBacklogItem', () => {
  it('指定順に並べ替え、漏れた既知 id は末尾に補完、未知 id は捨てる', () => {
    const c = core()
    const next = reorderBacklog(c, [ID.asis, ID.floor, 'unknown'])
    expect(next.backlogOrder.slice(0, 2)).toEqual([ID.asis, ID.floor])
    expect(next.backlogOrder).toHaveLength(PRODUCT_BACKLOG.length) // 全既知 id が残る
    expect(next.backlogOrder).not.toContain('unknown')
  })
  it('moveBacklogItem は隣と入れ替え、端では no-op', () => {
    const c = core({ backlogOrder: [ID.floor, ID.veteran, ID.asis] })
    expect(moveBacklogItem(c, ID.veteran, -1).backlogOrder).toEqual([ID.veteran, ID.floor, ID.asis])
    expect(moveBacklogItem(c, ID.floor, -1).backlogOrder).toEqual([ID.floor, ID.veteran, ID.asis]) // 端
  })
})

describe('reviewBacklogProposal（PO が並べ替え提案を審査）', () => {
  const MVP = 'pbi-misship-mvp' // sprintHint 2（sprint1 では非ゴール）
  const base = { sprintIndex: 0, backlogDone: [] as string[], backlogOrder: [ID.floor, ID.veteran, ID.asis, MVP] }

  it('既にゴール優先（sprintHint=今sprint が上位）なら全面承認', () => {
    const v = reviewBacklogProposal(base, [ID.floor, ID.veteran, ID.asis, MVP])
    expect(v.accepted).toBe(true)
    expect(v.floated).toEqual([])
    expect(v.order).toEqual([ID.floor, ID.veteran, ID.asis, MVP])
  })

  it('非ゴール項目の下にゴール項目が埋もれていたら、PO が上に戻す（部分採用）', () => {
    // 非ゴールの MVP を先頭にし、ゴールの floor を下げた提案
    const v = reviewBacklogProposal(base, [MVP, ID.floor, ID.veteran, ID.asis])
    expect(v.accepted).toBe(false)
    expect(v.floated).toEqual([ID.floor, ID.veteran, ID.asis]) // 非ゴールより下のゴール項目
    // ゴール項目（提案内の相対順を保つ）→ 非ゴール の順に補正
    expect(v.order).toEqual([ID.floor, ID.veteran, ID.asis, MVP])
  })

  it('ゴール項目どうしの相対順は提案を尊重する', () => {
    const v = reviewBacklogProposal(base, [ID.asis, ID.floor, ID.veteran, MVP])
    expect(v.accepted).toBe(true) // 非ゴールは末尾のまま＝補正不要
    expect(v.order).toEqual([ID.asis, ID.floor, ID.veteran, MVP])
  })

  it('完了済みは末尾に寄せ、漏れた既知 id は補完する', () => {
    const v = reviewBacklogProposal({ ...base, backlogDone: [ID.floor] }, [ID.veteran, ID.asis])
    expect(v.order[v.order.length - 1]).toBe(ID.floor) // done は末尾
    expect(v.order).toContain(MVP) // 提案漏れの既知 id も残る
  })
})

describe('resolveSprintBacklog', () => {
  it('容量内は優先順に done、超過はキャリーオーバー、ベロシティ記録、予測クリア', () => {
    // order: floor(3) < veteran(5) < asis(2)。容量=BASE(8)。予測は順不同で渡す
    const c = core({
      backlogOrder: [ID.floor, ID.veteran, ID.asis],
      sprintForecast: [ID.asis, ID.veteran, ID.floor],
    })
    const { core: next, review } = resolveSprintBacklog(c)
    expect(review.capacity).toBe(BASE_CAPACITY)
    expect(review.done.map((d) => d.id)).toEqual([ID.floor, ID.veteran]) // 優先順・累積8まで
    expect(review.carryover.map((d) => d.id)).toEqual([ID.asis]) // 超過
    expect(review.velocity).toBe(8)
    expect(next.velocity[0]).toBe(8)
    expect(next.backlogDone).toEqual([ID.floor, ID.veteran])
    expect(next.sprintForecast).toEqual([]) // 精算後はクリア
  })

  it('全部 done（容量内）なら culture +1', () => {
    const c = core({ sprintForecast: [ID.floor, ID.veteran] }) // 3+5=8 = 容量
    const { core: next, review } = resolveSprintBacklog(c)
    expect(review.carryover).toEqual([])
    expect(review.cultureDelta).toBe(1)
    expect(next.meters.culture).toBe(STARTING_METERS.culture + 1)
  })

  it('過剰予測でキャリーオーバーが出ると culture −1', () => {
    const c = core({ sprintForecast: [ID.floor, ID.veteran, ID.asis] }) // 10 > 8
    const { review } = resolveSprintBacklog(c)
    expect(review.carryover.length).toBeGreaterThan(0)
    expect(review.cultureDelta).toBe(-1)
  })

  it('予測ゼロなら無変化（ナッジなし）', () => {
    const c = core({ sprintForecast: [] })
    const { core: next, review } = resolveSprintBacklog(c)
    expect(review.cultureDelta).toBe(0)
    expect(review.velocity).toBe(0)
    expect(next.meters.culture).toBe(STARTING_METERS.culture)
  })

  it('culture が上限10ならクランプし、実差分を報告する', () => {
    const c = core({ meters: { ...STARTING_METERS, culture: 10 }, sprintForecast: [ID.floor] })
    const { core: next, review } = resolveSprintBacklog(c)
    expect(next.meters.culture).toBe(10)
    expect(review.cultureDelta).toBe(0) // 実際には動いていない
  })
})

describe('chooseCore × レビューでのバックログ精算', () => {
  const reviewEvent = (): GameEvent => ({
    id: 's1-review',
    sprint: 1,
    ceremony: 'review',
    segment: 'kokyaku',
    title: 'レビュー',
    narrative: 'N',
    choices: [],
  })
  const ch: Choice = { id: 'a', label: 'L', effects: {}, resultText: 'R' }

  it('レビューのイベントを解決すると backlogReview が付き、メーターがナッジされ予測がクリアされる', () => {
    const c = core({
      status: 'event',
      currentEvent: reviewEvent(),
      sprintForecast: [ID.floor, ID.veteran], // 8 = 容量 → 全 done → culture +1
    })
    const next = chooseCore(c, ch)
    expect(next.result?.backlogReview).toBeDefined()
    expect(next.result?.backlogReview?.velocity).toBe(8)
    expect(next.meters.culture).toBe(STARTING_METERS.culture + 1)
    expect(next.sprintForecast).toEqual([])
    expect(next.velocity[0]).toBe(8)
  })

  it('レビュー以外のイベントでは backlogReview は付かない', () => {
    const c = core({
      status: 'event',
      currentEvent: { ...reviewEvent(), id: 's1-daily', ceremony: 'daily' },
      sprintForecast: [ID.floor],
    })
    const next = chooseCore(c, ch)
    expect(next.result?.backlogReview).toBeUndefined()
    expect(next.sprintForecast).toEqual([ID.floor]) // 精算されない
  })
})

describe('永続化ラウンドトリップ / 旧セーブ復元', () => {
  it('toPersisted → restoreCore でバックログ状態が保たれる', () => {
    const c = core({
      backlogOrder: [ID.asis, ID.floor, ID.veteran],
      sprintForecast: [ID.floor],
      backlogDone: [ID.veteran],
      velocity: [5, 0],
    })
    const round = restoreCore(toPersisted(c))
    expect(round.backlogOrder.slice(0, 3)).toEqual([ID.asis, ID.floor, ID.veteran])
    expect(round.sprintForecast).toEqual([ID.floor])
    expect(round.backlogDone).toEqual([ID.veteran])
    expect(round.velocity).toEqual([5, 0])
  })

  it('旧セーブ（バックログ欄なし）は正本のシード順で補完される', () => {
    const persisted = toPersisted(core())
    const bag = persisted as unknown as Record<string, unknown>
    delete bag.backlogOrder
    delete bag.sprintForecast
    delete bag.backlogDone
    delete bag.velocity
    const restored = restoreCore(persisted)
    expect(restored.backlogOrder).toEqual(PRODUCT_BACKLOG.map((p) => p.id))
    expect(restored.sprintForecast).toEqual([])
    expect(restored.backlogDone).toEqual([])
    expect(restored.velocity).toEqual([])
  })

  it('未知 id や done 済みの予測は復元時に正規化される', () => {
    const c = core({
      backlogOrder: [ID.floor, 'ghost'],
      sprintForecast: [ID.veteran, 'ghost'],
      backlogDone: [ID.veteran],
    })
    const restored = restoreCore(toPersisted(c))
    expect(restored.backlogOrder).not.toContain('ghost')
    expect(restored.backlogOrder).toHaveLength(PRODUCT_BACKLOG.length) // 欠けた既知 id を補完
    expect(restored.sprintForecast).toEqual([]) // veteran は done、ghost は未知 → 両方除外
  })
})
