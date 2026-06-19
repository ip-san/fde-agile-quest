import { describe, expect, it } from 'vitest'
import { PRODUCT_BACKLOG, STARTING_METERS } from '../data/chapters/chapter-01'
import type { Choice, GameEvent } from '../types'
import {
  canReview,
  canStart,
  estimateOf,
  forecastPoints,
  GEN_TOKEN_COST,
  moveBacklogItem,
  REVIEW_CAPACITY,
  reorderBacklog,
  resolveSprintBacklog,
  reviewBacklogProposal,
  reviewItem,
  startItem,
  toggleForecast,
  WIP_LIMIT,
} from './backlog'
import { chooseCore, freshCore, type ProgressCore, restoreCore, toPersisted } from './progression'

// 既知 PBI（テストは id を直に使うが、見積りは PRODUCT_BACKLOG から導出して内容変更に強くする）
const ID = {
  floor: 'pbi-floor-observe', // 3
  veteran: 'pbi-veteran-hearing', // 5
  asis: 'pbi-as-is-flow', // 2
} as const

const core = (over: Partial<ProgressCore> = {}): ProgressCore => ({ ...freshCore(STARTING_METERS), ...over })

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

// 作業中（デイリー）ビートのコア。着手/レビューはこの間のみ可能
const workCore = (over: Partial<ProgressCore> = {}): ProgressCore => core({ beatIndex: 1, ...over })

describe('startItem（着手＝To Do→In Progress）', () => {
  it('作業中・予測内・トークンありで着手でき、トークンを消費して進捗0で In Progress へ', () => {
    const c = workCore({ sprintForecast: [ID.floor] })
    const n = startItem(c, ID.floor)
    expect(n.inProgress).toEqual([ID.floor])
    expect(n.reviewProgress[ID.floor]).toBe(0)
    expect(n.aiTokens).toBe(c.aiTokens - GEN_TOKEN_COST)
  })
  it('WIP 上限に達していたら着手不可', () => {
    const c = workCore({ sprintForecast: [ID.floor, ID.veteran, ID.asis], inProgress: [ID.veteran, ID.asis] })
    expect(WIP_LIMIT).toBe(2)
    expect(startItem(c, ID.floor)).toBe(c) // no-op
    expect(canStart(c, ID.floor)).toBe(false)
  })
  it('プランニング中（非作業ビート）は着手不可', () => {
    const c = core({ sprintForecast: [ID.floor] }) // beat0=planning
    expect(startItem(c, ID.floor)).toBe(c)
  })
  it('トークン不足なら着手不可', () => {
    const c = workCore({ sprintForecast: [ID.floor], aiTokens: GEN_TOKEN_COST - 1 })
    expect(startItem(c, ID.floor)).toBe(c)
    expect(canStart(c, ID.floor)).toBe(false)
  })
})

describe('reviewItem（レビュー＝In Progress→Done）', () => {
  it('深いレビューはレビュー容量を消費し、進捗とカバレッジを積む', () => {
    const c = workCore({
      inProgress: [ID.floor],
      reviewProgress: { [ID.floor]: 0 },
      reviewCapacity: 6,
      repoCoverage: 0,
    })
    const n = reviewItem(c, ID.floor, 'thorough', 'good') // gain=2×1×1=2（est 3 未達）
    expect(n.reviewProgress[ID.floor]).toBe(2)
    expect(n.reviewCapacity).toBe(4) // thorough cost 2
    expect(n.repoCoverage).toBeGreaterThan(0) // テストで coverage 増
    expect(n.inProgress).toEqual([ID.floor]) // まだ Done でない
  })
  it('見積りに達したら Done（In Progress から外れ backlogDone へ）', () => {
    const c = workCore({ inProgress: [ID.floor], reviewProgress: { [ID.floor]: 0 }, reviewCapacity: 6 })
    const n = reviewItem(c, ID.floor, 'thorough', 'great') // 2×1.5×1=3 ≥ est3 → Done
    expect(n.inProgress).toEqual([])
    expect(n.backlogDone).toContain(ID.floor)
    expect(n.reviewProgress[ID.floor]).toBeUndefined()
  })
  it('浅いレビューは負債を増やす', () => {
    const c = workCore({ inProgress: [ID.floor], reviewProgress: { [ID.floor]: 0 }, reviewCapacity: 6, repoDebt: 0 })
    const n = reviewItem(c, ID.floor, 'quick', 'good')
    expect(n.repoDebt).toBeGreaterThan(0)
    expect(n.reviewCapacity).toBe(5) // quick cost 1
  })
  it('レビュー容量が無ければ no-op', () => {
    const c = workCore({ inProgress: [ID.floor], reviewProgress: { [ID.floor]: 0 }, reviewCapacity: 0 })
    expect(reviewItem(c, ID.floor, 'thorough', 'good')).toBe(c)
    expect(canReview(c, ID.floor)).toBe(false)
  })
})

describe('resolveSprintBacklog（カンバン精算）', () => {
  it('スプリント中に Done した分を velocity に、未Done をキャリーオーバー、状態をリセット', () => {
    const c = core({
      sprintForecast: [ID.floor, ID.veteran, ID.asis],
      backlogDone: [ID.floor, ID.veteran], // スプリント中に Done
      inProgress: [ID.asis],
      reviewProgress: { [ID.asis]: 1 },
      reviewCapacity: 2,
    })
    const { core: next, review } = resolveSprintBacklog(c)
    expect(review.done.map((d) => d.id)).toEqual([ID.floor, ID.veteran])
    expect(review.carryover.map((d) => d.id)).toEqual([ID.asis])
    expect(review.velocity).toBe(8) // 3+5
    expect(next.velocity[0]).toBe(8)
    expect(review.cultureDelta).toBe(-1) // 未Done を持ち越し
    expect(next.sprintForecast).toEqual([])
    expect(next.inProgress).toEqual([])
    expect(next.reviewProgress).toEqual({})
    expect(next.reviewCapacity).toBe(REVIEW_CAPACITY) // 次スプリントへリセット
  })

  it('予測を全部 Done＝WIP規律で完遂なら culture +1', () => {
    const c = core({ sprintForecast: [ID.floor, ID.veteran], backlogDone: [ID.floor, ID.veteran] })
    const { core: next, review } = resolveSprintBacklog(c)
    expect(review.carryover).toEqual([])
    expect(review.cultureDelta).toBe(1)
    expect(next.meters.culture).toBe(STARTING_METERS.culture + 1)
  })

  it('予測ゼロなら無変化（ナッジなし）', () => {
    const { core: next, review } = resolveSprintBacklog(core({ sprintForecast: [] }))
    expect(review.cultureDelta).toBe(0)
    expect(review.velocity).toBe(0)
    expect(next.meters.culture).toBe(STARTING_METERS.culture)
  })

  it('予測しただけで未着手（カンバンに触っていない）なら罰しない＝ナッジ0', () => {
    // 予測はあるが Done も In Progress も無い＝engaged でない
    const c = core({ sprintForecast: [ID.floor, ID.veteran], backlogDone: [], inProgress: [] })
    const { review } = resolveSprintBacklog(c)
    expect(review.carryover.length).toBe(2)
    expect(review.cultureDelta).toBe(0) // “使わなかった”は減点しない
  })

  it('着手したが終わらず持ち越し＝engaged で未完 → culture −1', () => {
    const c = core({ sprintForecast: [ID.floor, ID.veteran], backlogDone: [], inProgress: [ID.floor] })
    const { review } = resolveSprintBacklog(c)
    expect(review.cultureDelta).toBe(-1)
  })

  it('culture 上限10はクランプし実差分を報告', () => {
    const c = core({
      meters: { ...STARTING_METERS, culture: 10 },
      sprintForecast: [ID.floor],
      backlogDone: [ID.floor],
    })
    const { core: next, review } = resolveSprintBacklog(c)
    expect(next.meters.culture).toBe(10)
    expect(review.cultureDelta).toBe(0)
  })
})

describe('chooseCore × レビューでのカンバン精算', () => {
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

  it('レビューのイベント解決で backlogReview が付き、Done分が velocity に、予測がクリアされる', () => {
    const c = core({
      status: 'event',
      currentEvent: reviewEvent(),
      sprintForecast: [ID.floor, ID.veteran],
      backlogDone: [ID.floor, ID.veteran], // スプリント中に Done 済み
    })
    const next = chooseCore(c, ch)
    expect(next.result?.backlogReview?.velocity).toBe(8)
    expect(next.meters.culture).toBe(STARTING_METERS.culture + 1)
    expect(next.sprintForecast).toEqual([])
    expect(next.velocity[0]).toBe(8)
  })

  it('レビュー以外のイベントでは精算されない', () => {
    const c = core({
      status: 'event',
      currentEvent: { ...reviewEvent(), id: 's1-daily', ceremony: 'daily' },
      sprintForecast: [ID.floor],
    })
    const next = chooseCore(c, ch)
    expect(next.result?.backlogReview).toBeUndefined()
    expect(next.sprintForecast).toEqual([ID.floor])
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

  it('カンバン状態（inProgress/reviewProgress/reviewCapacity）も往復で保たれる', () => {
    const c = core({
      sprintForecast: [ID.floor, ID.veteran],
      inProgress: [ID.floor],
      reviewProgress: { [ID.floor]: 2 },
      reviewCapacity: 3,
    })
    const round = restoreCore(toPersisted(c))
    expect(round.inProgress).toEqual([ID.floor])
    expect(round.reviewProgress).toEqual({ [ID.floor]: 2 })
    expect(round.reviewCapacity).toBe(3)
  })

  it('In Progress は予測外・done済みを除外し、進捗もそれに合わせて正規化される', () => {
    const c = core({
      sprintForecast: [ID.floor],
      inProgress: [ID.floor, ID.veteran], // veteran は予測外
      reviewProgress: { [ID.floor]: 1, [ID.veteran]: 9 },
    })
    const round = restoreCore(toPersisted(c))
    expect(round.inProgress).toEqual([ID.floor])
    expect(round.reviewProgress).toEqual({ [ID.floor]: 1 }) // veteran 分は落ちる
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
