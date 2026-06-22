import { describe, expect, it } from 'vitest'
import { PRODUCT_BACKLOG, STARTING_METERS } from '../data/chapters/chapter-01'
import type { Choice, GameEvent } from '../types'
import {
  acceptRequestedPbi,
  canAddToForecast,
  canPullIntoSprint,
  canReview,
  canSplit,
  canStart,
  deliveredPbiIds,
  estimateOf,
  forecastPoints,
  GEN_TOKEN_COST,
  isDiscoverablePbi,
  isEventPbi,
  isKnownPbi,
  isUnrefinedPbi,
  moveBacklogItem,
  pullIntoSprint,
  REVIEW_CAPACITY_PER_DAY,
  refinePbi,
  reorderBacklog,
  resolveSprintBacklog,
  revealPbi,
  reviewBacklogProposal,
  reviewCapacityFor,
  reviewItem,
  splitIntoSbi,
  startItem,
  toggleForecast,
  WIP_LIMIT,
  wipLimitFor,
} from './backlog'
import { advanceCore, chooseCore, freshCore, type ProgressCore, restoreCore, toPersisted } from './progression'

// 既知 PBI（テストは id を直に使うが、見積りは PRODUCT_BACKLOG から導出して内容変更に強くする）
const ID = {
  floor: 'pbi-floor-observe', // 3
  veteran: 'pbi-veteran-hearing', // 5
  asis: 'pbi-as-is-flow', // 2
} as const

const core = (over: Partial<ProgressCore> = {}): ProgressCore => ({ ...freshCore(STARTING_METERS), ...over })

// 発見可（初期は伏せ）PBI。ヒアリングで掘り当てるまでプロダクトバックログに出ない。
const DISC = 'pbi-disc-label-misread'
// イベント発（初期は伏せ）PBI。イベント選択（addsPbi）で受け入れるまで出ない。
const EVT = 'pbi-evt-exec-feature' // 3

describe('acceptRequestedPbi（イベント発の要望を受け入れる）', () => {
  it('toSprint=false：プロダクトバックログ末尾に積み、暫定見積り（要リファインメント）にする', () => {
    const { core: next, added } = acceptRequestedPbi(core(), EVT, false)
    expect(added?.id).toBe(EVT)
    expect(next.backlogOrder).toContain(EVT)
    expect(next.backlogOrder[next.backlogOrder.length - 1]).toBe(EVT) // 末尾
    expect(next.unrefinedPbis).toContain(EVT) // Ready でない
    expect(next.sprintForecast).not.toContain(EVT) // 今スプリントには入れない
  })
  it('toSprint=true：今スプリント予測へ割り込みで足し、Ready 扱い（unrefined にしない）', () => {
    const { core: next, added } = acceptRequestedPbi(core(), EVT, true)
    expect(added?.id).toBe(EVT)
    expect(next.backlogOrder).toContain(EVT) // 全体像にも現れる
    expect(next.sprintForecast).toContain(EVT) // 今スプリントへ割り込み
    expect(next.unrefinedPbis).not.toContain(EVT) // 合意済み＝即着手可
  })
  it('既に backlogOrder にある／未知の id は no-op（added:null・二重追加しない）', () => {
    const once = acceptRequestedPbi(core(), EVT, false).core
    const { core: twice, added } = acceptRequestedPbi(once, EVT, false)
    expect(added).toBeNull()
    expect(twice.backlogOrder.filter((id) => id === EVT)).toHaveLength(1)
    expect(acceptRequestedPbi(core(), 'pbi-nope', true).added).toBeNull()
  })
  it('isEventPbi はイベント発PBIにだけ真（通常PBIには偽）', () => {
    expect(isEventPbi(EVT)).toBe(true)
    expect(isEventPbi(ID.floor)).toBe(false)
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

describe('上位優先の予測選択（飛ばし入れ禁止／canAddToForecast）', () => {
  // freshCore の backlogOrder 先頭2件（PO 順の上位2つ）を使う
  const top0 = freshCore(STARTING_METERS).backlogOrder[0]
  const top1 = freshCore(STARTING_METERS).backlogOrder[1]

  it('先頭（最上位）は入れられる／その下位は上位未選択だと入れられない', () => {
    expect(canAddToForecast(core(), top0)).toBe(true)
    expect(canAddToForecast(core(), top1)).toBe(false) // top0 未選択のうちは飛ばし入れ不可
  })
  it('上位を入れると、その次が入れられるようになる（上から順に詰める）', () => {
    const c1 = toggleForecast(core(), top0)
    expect(c1.sprintForecast).toEqual([top0])
    expect(canAddToForecast(c1, top1)).toBe(true)
    const c2 = toggleForecast(c1, top1)
    expect(c2.sprintForecast).toEqual([top0, top1])
  })
  it('飛ばし入れ（下位を直接）は toggleForecast でも no-op', () => {
    expect(toggleForecast(core(), top1).sprintForecast).toEqual([])
  })
  it('外すのはその1件だけ（下位は巻き込まない）。上位優先は“入れる”側で担保する', () => {
    const c = core({ sprintForecast: [top0, top1] })
    // 上位(top0)を外しても下位(top1)は残る＝巻き添えにしない
    expect(toggleForecast(c, top0).sprintForecast).toEqual([top1])
    // 末尾(top1)だけ外せば top0 は残る
    expect(toggleForecast(c, top1).sprintForecast).toEqual([top0])
  })
  it('途中を外して“穴”ができると、その穴を埋めるまで下位は新規追加できない（上から詰め直し）', () => {
    const top2 = freshCore(STARTING_METERS).backlogOrder[2]
    // top0,top1 を入れた後 top0 を外す＝[top1]（top0 が穴）
    const holed = core({ sprintForecast: [top1] })
    expect(canAddToForecast(holed, top2)).toBe(false) // 上位の穴(top0)が埋まるまで下位不可
    expect(canAddToForecast(holed, top0)).toBe(true) // 穴(top0)は埋められる
  })
})

describe('pullIntoSprint（スプリント途中の追加引き込み・スコープ再交渉）', () => {
  // 作業中ビート（daily）で、既に予測に1件ある状態から追加する
  const workCore = (over: Partial<ProgressCore> = {}): ProgressCore =>
    core({ beatIndex: 1, sprintForecast: [ID.floor], ...over })

  it('作業中ビートでは Ready な未予測項目を末尾に引き込める', () => {
    const next = pullIntoSprint(workCore(), ID.veteran)
    expect(next.sprintForecast).toEqual([ID.floor, ID.veteran])
  })
  it('プランニング中（beat0）は no-op（出し入れは toggleForecast が担う）', () => {
    const c = core({ sprintForecast: [ID.floor] }) // beat0 = planning
    expect(pullIntoSprint(c, ID.veteran)).toBe(c)
  })
  it('既に予測済み／完了済み／未知 id は引き込めない', () => {
    const c = workCore()
    expect(pullIntoSprint(c, ID.floor)).toBe(c) // 既に予測済み → 同一参照で no-op
    expect(pullIntoSprint(workCore({ backlogDone: [ID.veteran] }), ID.veteran).sprintForecast).toEqual([ID.floor])
    expect(pullIntoSprint(workCore(), 'nope').sprintForecast).toEqual([ID.floor])
  })
  it('未リファインメント（暫定見積り）は Ready になるまで引き込めない', () => {
    const c = workCore({ unrefinedPbis: [ID.veteran] })
    expect(pullIntoSprint(c, ID.veteran).sprintForecast).toEqual([ID.floor])
    expect(canPullIntoSprint(c, ID.veteran)).toBe(false)
  })
  it('canPullIntoSprint は作業中・Ready・未予測・未done のときだけ true', () => {
    expect(canPullIntoSprint(workCore(), ID.veteran)).toBe(true)
    expect(canPullIntoSprint(core({ sprintForecast: [ID.floor] }), ID.veteran)).toBe(false) // planning
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

  it('説得 great＝提案どおり全面採用（ゴール補正もしない）', () => {
    // good なら floated されるはずの「非ゴール先頭」提案も、great では提案順のまま通る
    const v = reviewBacklogProposal(base, [MVP, ID.floor, ID.veteran, ID.asis], 'great')
    expect(v.accepted).toBe(true)
    expect(v.rejected).toBe(false)
    expect(v.floated).toEqual([])
    expect(v.order).toEqual([MVP, ID.floor, ID.veteran, ID.asis])
  })

  it('説得 poor＝却下。PO は現状の公式順を維持して優先順位は動かない', () => {
    const v = reviewBacklogProposal(base, [MVP, ID.floor, ID.veteran, ID.asis], 'poor')
    expect(v.rejected).toBe(true)
    expect(v.accepted).toBe(false)
    expect(v.order).toEqual(base.backlogOrder) // 現状順のまま
  })

  it('説得 good（既定）＝従来どおりゴール直結を上に補正する', () => {
    const v = reviewBacklogProposal(base, [MVP, ID.floor, ID.veteran, ID.asis], 'good')
    expect(v.rejected).toBe(false)
    expect(v.floated).toEqual([ID.floor, ID.veteran, ID.asis])
    expect(v.order).toEqual([ID.floor, ID.veteran, ID.asis, MVP])
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
      reviewCapacity: 4,
      repoCoverage: 0,
    })
    const n = reviewItem(c, ID.floor, 'thorough', 'good') // gain=2×1×1=2（est 3 未達）
    expect(n.reviewProgress[ID.floor]).toBe(2)
    expect(n.reviewCapacity).toBe(2) // 日次4 から thorough cost 2 を消費
    expect(n.repoCoverage).toBeGreaterThan(0) // テストで coverage 増
    expect(n.inProgress).toEqual([ID.floor]) // まだ Done でない
  })
  it('見積りに達したら Done（In Progress から外れ backlogDone へ）', () => {
    const c = workCore({ inProgress: [ID.floor], reviewProgress: { [ID.floor]: 0 }, reviewCapacity: 4 })
    const n = reviewItem(c, ID.floor, 'thorough', 'great') // 2×1.5×1=3 ≥ est3 → Done
    expect(n.inProgress).toEqual([])
    expect(n.backlogDone).toContain(ID.floor)
    expect(n.reviewProgress[ID.floor]).toBeUndefined()
  })
  it('浅いレビューは負債を増やす', () => {
    const c = workCore({ inProgress: [ID.floor], reviewProgress: { [ID.floor]: 0 }, reviewCapacity: 4, repoDebt: 0 })
    const n = reviewItem(c, ID.floor, 'quick', 'good')
    expect(n.repoDebt).toBeGreaterThan(0)
    expect(n.reviewCapacity).toBe(3) // 日次4 から quick cost 1 を消費
  })
  it('レビュー容量が無ければ no-op', () => {
    const c = workCore({ inProgress: [ID.floor], reviewProgress: { [ID.floor]: 0 }, reviewCapacity: 0 })
    expect(reviewItem(c, ID.floor, 'thorough', 'good')).toBe(c)
    expect(canReview(c, ID.floor)).toBe(false)
  })
  it('機構③: 浅い(quick)レビューで Done させると shippedUndone（DoD妥協Ship）フラグが立つ', () => {
    // est3 の floor を残り 0.5 まで詰めた状態から quick good(+1) で Done させる
    const c = workCore({ inProgress: [ID.floor], reviewProgress: { [ID.floor]: 2.5 }, reviewCapacity: 4 })
    const n = reviewItem(c, ID.floor, 'quick', 'good')
    expect(n.backlogDone).toContain(ID.floor) // Done 済み
    expect(n.flags.has('shippedUndone')).toBe(true) // DoD を妥協して Ship＝負債の取り立てフラグ
    expect(n.shippedUndoneIds).toContain(ID.floor) // どの項目を妥協 Ship したか id でも記録（UI出し分け用）
  })
  it('機構③: 深い(thorough)レビューで Done させても shippedUndone は立たない（DoD 達成）', () => {
    const c = workCore({ inProgress: [ID.floor], reviewProgress: { [ID.floor]: 2.5 }, reviewCapacity: 4 })
    const n = reviewItem(c, ID.floor, 'thorough', 'good') // +2 → Done、深いので DoD 達成
    expect(n.backlogDone).toContain(ID.floor)
    expect(n.flags.has('shippedUndone')).toBe(false)
    expect(n.shippedUndoneIds).not.toContain(ID.floor) // 深いレビューは DoD未達Ship に記録しない
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
    expect(next.reviewCapacity).toBe(2) // 精算は reviewCapacity を触らない（日次資源＝次の daily 進入時に advanceCore がリセット）
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

  it('予測過多でも着手分は完遂・未着手を持ち越し（仕掛りゼロ）なら culture +1', () => {
    // 予測を多めに積み、着手した floor/veteran は Done。asis は一度も着手せず持ち越し。
    // ペナルティ判定は仕掛り(inProgress)基準＝未着手の積み過ぎは罰しない（Scrum: 未完了PBIを戻すのは正常）。
    const c = core({
      sprintForecast: [ID.floor, ID.veteran, ID.asis],
      backlogDone: [ID.floor, ID.veteran],
      inProgress: [],
    })
    const { review } = resolveSprintBacklog(c)
    expect(review.carryover.map((d) => d.id)).toEqual([ID.asis])
    expect(review.cultureDelta).toBe(1)
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

describe('機構②: ステークホルダー間の非対称トレードオフ（resolveSprintBacklog のフラグ）', () => {
  // S2(sprintIndex=1) のゴール: genba=picking-screen/feedback-loop, joushi=misship-mvp/stock-reconcile
  const S2 = 1
  const GENBA = 'pbi-picking-screen'
  const JOUSHI = 'pbi-misship-mvp'

  it('現場のゴールを届け、情シスのゴールを未達 → deprioritizedJoushi（結城を後回し）', () => {
    const c = core({ sprintIndex: S2, sprintForecast: [GENBA, JOUSHI], backlogDone: [GENBA] })
    const { core: next } = resolveSprintBacklog(c)
    expect(next.flags.has('deprioritizedJoushi')).toBe(true)
    expect(next.flags.has('deprioritizedGenba')).toBe(false)
  })
  it('情シスのゴールを届け、現場のゴールを未達 → deprioritizedGenba（田淵を後回し）', () => {
    const c = core({ sprintIndex: S2, sprintForecast: [GENBA, JOUSHI], backlogDone: [JOUSHI] })
    const { core: next } = resolveSprintBacklog(c)
    expect(next.flags.has('deprioritizedGenba')).toBe(true)
    expect(next.flags.has('deprioritizedJoushi')).toBe(false)
  })
  it('両方届けた／両方未達では、どちらの非対称フラグも立たない（明確なトレードオフのみ）', () => {
    const both = core({ sprintIndex: S2, sprintForecast: [GENBA, JOUSHI], backlogDone: [GENBA, JOUSHI] })
    const n1 = resolveSprintBacklog(both).core
    expect(n1.flags.has('deprioritizedJoushi')).toBe(false)
    expect(n1.flags.has('deprioritizedGenba')).toBe(false)
    // 両方未達（着手中で engaged だが Done 無し）＝容量不足。後回しの“選択”ではないので発火しない
    const neither = core({ sprintIndex: S2, sprintForecast: [GENBA, JOUSHI], inProgress: [GENBA], backlogDone: [] })
    const n2 = resolveSprintBacklog(neither).core
    expect(n2.flags.has('deprioritizedJoushi')).toBe(false)
    expect(n2.flags.has('deprioritizedGenba')).toBe(false)
  })
})

describe('機構：Retro 昇格（レトロ改善が次スプリントに効く）', () => {
  it('reviewCapacityFor: capacity 投資1つにつきレビュー容量 +1', () => {
    expect(reviewCapacityFor([])).toBe(REVIEW_CAPACITY_PER_DAY)
    expect(reviewCapacityFor(['capacity'])).toBe(REVIEW_CAPACITY_PER_DAY + 1)
    expect(reviewCapacityFor(['capacity', 'capacity'])).toBe(REVIEW_CAPACITY_PER_DAY + 2)
    expect(reviewCapacityFor(['wip'])).toBe(REVIEW_CAPACITY_PER_DAY) // wip は容量に効かない
  })
  it('wipLimitFor: wip 改善1つにつき仕掛り上限 −1（下限1）', () => {
    expect(wipLimitFor([])).toBe(WIP_LIMIT)
    expect(wipLimitFor(['wip'])).toBe(WIP_LIMIT - 1)
    expect(wipLimitFor(['wip', 'wip'])).toBe(1) // 下限1（0未満にしない）
    expect(wipLimitFor(['capacity'])).toBe(WIP_LIMIT) // capacity は WIP に効かない
  })
  it('精算(resolveSprintBacklog)は reviewCapacity を触らない（容量は日次資源＝daily進入時にリセット）', () => {
    const c = core({ retroImprovements: ['capacity'], reviewCapacity: 1 })
    const { core: next } = resolveSprintBacklog(c)
    expect(next.reviewCapacity).toBe(1) // 据え置き。回復は次スプリント最初の daily ビートで advanceCore が行う
  })
  it('wip 改善(focus)中は深いレビューが積む coverage が増える＝量(capacity)に対する質(wip)の固有メリット', () => {
    const baseCore = { inProgress: [ID.floor], reviewProgress: { [ID.floor]: 0 }, reviewCapacity: 4, repoCoverage: 0 }
    const plain = reviewItem(workCore({ ...baseCore }), ID.floor, 'thorough', 'good')
    const focused = reviewItem(workCore({ ...baseCore, retroImprovements: ['wip'] }), ID.floor, 'thorough', 'good')
    expect(focused.repoCoverage).toBeGreaterThan(plain.repoCoverage) // focus で質が上がる
  })
  it('canStart: wip 改善で仕掛り上限が下がり、上限に達したら着手不可', () => {
    // wip 改善1つ＝WIP上限1。すでに1件着手中なら2件目は着手できない
    const c = workCore({
      retroImprovements: ['wip'],
      sprintForecast: [ID.floor, ID.veteran],
      inProgress: [ID.veteran],
      aiTokens: 999,
    })
    expect(canStart(c, ID.floor)).toBe(false)
    // 改善なし（WIP=2）なら同条件で2件目を着手できる
    const c2 = { ...c, retroImprovements: [] }
    expect(canStart(c2, ID.floor)).toBe(true)
  })

  it('daily ビートに進入すると reviewCapacity が日次リセットされ、capacity レバーが即時反映される', () => {
    // S2 planning（sprintIndex=1, beatIndex=0）から最初の daily（beatIndex=1）へ進入。
    // ビートシーケンス = [planning,daily×5,review,retro]。S1 retro で capacity を積んだ状態で、
    // 次スプリント最初の daily 進入時に reviewCapacityFor(['capacity'])=5 へリセットされる（即時反映）。
    const planningCore = core({
      sprintIndex: 1,
      beatIndex: 0, // planning（daily でない＝まだリセットされていない）
      retroImprovements: ['capacity'],
      reviewCapacity: 0, // planning では消費できないので 0 でも可
      status: 'playing',
    })
    const firstDaily = advanceCore(planningCore)
    expect(firstDaily.beatIndex).toBe(1) // 最初の daily
    expect(firstDaily.reviewCapacity).toBe(REVIEW_CAPACITY_PER_DAY + 1) // 4 + capacity1 = 5（日次リセット＋即時反映）
  })

  it('daily→daily の進行でも毎日リセットされ、前日の残容量は繰り越さない（使い切り）', () => {
    // daily（beatIndex=1）で消費途中（残3）→ 次の daily（beatIndex=2）へ進入すると、残3は破棄され満タンへ戻る。
    const dailyCore = core({
      sprintIndex: 0,
      beatIndex: 1, // daily ビート
      retroImprovements: [], // レバー無し＝日次4
      reviewCapacity: 3, // 消費途中（繰り越さない）
      status: 'playing',
    })
    const next = advanceCore(dailyCore)
    expect(next.sprintIndex).toBe(0)
    expect(next.beatIndex).toBe(2) // 次の daily
    expect(next.reviewCapacity).toBe(REVIEW_CAPACITY_PER_DAY) // 残3は繰り越さず日次4へリセット
  })

  it('daily→review（非daily）への進行では reviewCapacity は据え置き（review では消費できない）', () => {
    // 最後の daily（beatIndex=5）→ review（beatIndex=6）。review は daily でないのでリセットしない。
    const lastDaily = core({
      sprintIndex: 0,
      beatIndex: 5, // 最後の daily
      retroImprovements: [],
      reviewCapacity: 1, // 使い残し
      status: 'playing',
    })
    const next = advanceCore(lastDaily)
    expect(next.beatIndex).toBe(6) // review ビート
    expect(next.reviewCapacity).toBe(1) // 非daily なので据え置き
  })
})

describe('発見可PBI（ヒアリングで掘り当てる）', () => {
  it('発見可PBIは既知だが初期のプロダクトバックログ（backlogOrder）には現れない', () => {
    expect(isKnownPbi(DISC)).toBe(true)
    expect(isDiscoverablePbi(DISC)).toBe(true)
    expect(core().backlogOrder).not.toContain(DISC)
    expect(PRODUCT_BACKLOG.map((p) => p.id)).not.toContain(DISC)
  })

  it('revealPbi で末尾に追加され、revealed を返す。既出/未知では no-op', () => {
    const c = core()
    const r1 = revealPbi(c, DISC)
    expect(r1.revealed?.id).toBe(DISC)
    expect(r1.core.backlogOrder.at(-1)).toBe(DISC)
    // 既に出ていれば再追加しない
    expect(revealPbi(r1.core, DISC).revealed).toBeNull()
    expect(revealPbi(r1.core, DISC).core.backlogOrder.filter((id) => id === DISC)).toHaveLength(1)
    // 未知 id は no-op
    expect(revealPbi(c, 'nope').revealed).toBeNull()
  })

  it('機構：Refinement — 掘り当てた直後は未リファインメント（暫定）で予測に積めない／リファインメントで Ready 化', () => {
    const revealed = revealPbi(core(), DISC).core
    expect(isUnrefinedPbi(revealed, DISC)).toBe(true) // 発見直後は暫定
    // 暫定のままでは予測に積めない（toggleForecast が no-op）
    expect(toggleForecast(revealed, DISC).sprintForecast).not.toContain(DISC)
    // プランニング中にリファインメントすると Ready 化する
    const refined = refinePbi(revealed, DISC)
    expect(isUnrefinedPbi(refined, DISC)).toBe(false)
    // DISC は末尾＝上位優先で「上位を全部入れてから」でないと積めない。上位を予測済みにすると積める。
    const higher = refined.backlogOrder.filter((id) => id !== DISC)
    const ready = { ...refined, sprintForecast: higher }
    expect(toggleForecast(ready, DISC).sprintForecast).toContain(DISC)
  })
  it('機構：Refinement — refinePbi はプランニング以外・未リファインメントでない id では no-op', () => {
    const revealed = revealPbi(core(), DISC).core
    const daily = { ...revealed, beatIndex: 1 } // daily
    expect(refinePbi(daily, DISC)).toBe(daily) // プランニング外は no-op
    expect(refinePbi(revealed, ID.floor)).toBe(revealed) // 未リファインメントでない id は no-op
  })

  it('ヒアリング選択(discoversPbi)を good/great で解決すると掘り当ててバックログに加わる', () => {
    const ev: GameEvent = {
      id: 's1-hearing',
      sprint: 1,
      ceremony: 'daily',
      segment: 'genba',
      title: '聞き取り',
      narrative: 'N',
      choices: [],
    }
    const ch: Choice = { id: 'a', label: 'L', effects: {}, resultText: 'R', discoversPbi: DISC }
    const c = core({ status: 'event', currentEvent: ev })
    const next = chooseCore(c, ch, 'good')
    expect(next.backlogOrder).toContain(DISC)
    expect(next.result?.discoveredPbi).toEqual({ id: DISC, title: expect.any(String) })
  })

  it('ヒアリングの出来が poor だと掘り当てられない（バックログに加わらない）', () => {
    const ev: GameEvent = {
      id: 's1-hearing',
      sprint: 1,
      ceremony: 'daily',
      segment: 'genba',
      title: '聞き取り',
      narrative: 'N',
      choices: [],
    }
    const ch: Choice = { id: 'a', label: 'L', effects: {}, resultText: 'R', discoversPbi: DISC }
    const next = chooseCore(core({ status: 'event', currentEvent: ev }), ch, 'poor')
    expect(next.backlogOrder).not.toContain(DISC)
    expect(next.result?.discoveredPbi).toBeUndefined()
  })

  it('掘り当て済みの発見可PBIは永続化往復で保たれ、未発見のものは復元で勝手に現れない', () => {
    const revealed = revealPbi(core(), DISC).core
    const round = restoreCore(toPersisted(revealed))
    expect(round.backlogOrder).toContain(DISC) // 発見済みは残る
    // 未発見状態のセーブを復元しても、発見可PBIは補完で混入しない
    const fresh = restoreCore(toPersisted(core()))
    expect(fresh.backlogOrder).not.toContain(DISC)
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
      shippedUndoneIds: [ID.veteran], // DoD未達Ship（backlogDone の部分集合）も往復で保たれる
      retroImprovements: ['capacity', 'wip'], // レトロ改善も往復で保たれる
      unrefinedPbis: [ID.asis], // 未リファインメント（既知∧バックログ内∧未done）も往復で保たれる
      velocity: [5, 0],
    })
    const round = restoreCore(toPersisted(c))
    expect(round.backlogOrder.slice(0, 3)).toEqual([ID.asis, ID.floor, ID.veteran])
    expect(round.sprintForecast).toEqual([ID.floor])
    expect(round.backlogDone).toEqual([ID.veteran])
    expect(round.shippedUndoneIds).toEqual([ID.veteran])
    expect(round.retroImprovements).toEqual(['capacity', 'wip'])
    expect(round.unrefinedPbis).toEqual([ID.asis])
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

describe('PBI→作業項目(SBI)分割', () => {
  const V1 = 'pbi-veteran-hearing#1' // split 3
  const V2 = 'pbi-veteran-hearing#2' // split 2
  it('プランニング中、forecast の split 持ち PBI を作業項目に展開する（位置を保つ・合計見積り不変）', () => {
    // veteran は backlogOrder 先頭でないので forecast を直接セット（分割アクションのみを検証）。
    const before = core({ sprintForecast: [ID.veteran] }) // beat0=planning・素のまま forecast（est5）
    expect(forecastPoints(before)).toBe(5)
    const after = splitIntoSbi(before, ID.veteran)
    expect(after.sprintForecast).toEqual([V1, V2])
    expect(estimateOf(V1)).toBe(3)
    expect(estimateOf(V2)).toBe(2)
    expect(forecastPoints(after)).toBe(5) // 分割しても合計は親と同じ
  })
  it('split 定義の無い PBI・プランニング以外・forecast 外は no-op', () => {
    expect(splitIntoSbi(core({ sprintForecast: [ID.floor] }), ID.floor).sprintForecast).toEqual([ID.floor]) // 分割定義なし
    const daily = core({ sprintForecast: [ID.veteran], beatIndex: 1 }) // daily（非planning）
    expect(splitIntoSbi(daily, ID.veteran).sprintForecast).toEqual([ID.veteran]) // 展開されない
    expect(splitIntoSbi(core(), ID.veteran).sprintForecast).toEqual([]) // forecast 外
  })
  it('canSplit: プランニング・split定義あり・forecast に素のまま入っている時だけ true', () => {
    const planned = core({ sprintForecast: [ID.veteran] })
    expect(canSplit(planned, ID.veteran)).toBe(true)
    expect(canSplit(core(), ID.veteran)).toBe(false) // forecast 外
    expect(canSplit(core({ sprintForecast: [ID.floor] }), ID.floor)).toBe(false) // split 定義なし
    expect(canSplit(splitIntoSbi(planned, ID.veteran), ID.veteran)).toBe(false) // 既に分割済み（素のidが無い）
  })
  it('外す（toggleForecast）は分割済みでも配下の作業項目をまとめて外す', () => {
    const split = splitIntoSbi(core({ sprintForecast: [ID.veteran] }), ID.veteran)
    expect(split.sprintForecast).toEqual([V1, V2])
    const removed = toggleForecast(split, ID.veteran)
    expect(removed.sprintForecast).toEqual([])
  })
  it('各作業項目を独立にレビュー→Done。親PBIは全作業項目完了で“納品”（deliveredPbiIds）', () => {
    // daily ビートで V1(est3)/V2(est2) をレビュー。thorough gain2 で到達＝Done、全完了で親納品。
    let c = core({
      beatIndex: 1,
      reviewCapacity: 10, // 容量律速を避けて分割→Done→納品の機構だけを検証
      sprintForecast: [V1, V2],
      inProgress: [V1, V2],
      reviewProgress: { [V1]: 0, [V2]: 0 },
    })
    // V1 を est3 まで（thorough gain2 × 2回 = 4 ≥ 3）
    c = reviewItem(c, V1, 'thorough', 'good')
    c = reviewItem(c, V1, 'thorough', 'good')
    expect(c.backlogDone).toContain(V1)
    expect(deliveredPbiIds(c.backlogDone)).not.toContain('pbi-veteran-hearing') // まだ V2 未完＝親は未納品
    c = reviewItem(c, V2, 'thorough', 'good') // est2、gain2 で Done
    expect(c.backlogDone).toContain(V2)
    expect(deliveredPbiIds(c.backlogDone)).toContain('pbi-veteran-hearing') // 全作業項目完了＝親納品
  })
  it('deliveredPbiIds: 割らずに素のまま Done した PBI も納品に数える（恒等の安全弁）', () => {
    expect(deliveredPbiIds([ID.floor, ID.asis])).toEqual(expect.arrayContaining([ID.floor, ID.asis]))
    expect(deliveredPbiIds([V1])).not.toContain('pbi-veteran-hearing') // 片方だけでは未納品
  })
  it('canStart/startItem: 分割後の作業項目(SBI)も着手できる（PBI_BY_ID.has で落とさない）', () => {
    // daily ビート・予測内の SBI を着手 → In Progress へ。素の PBI と同様に扱える。
    const c = core({ beatIndex: 1, sprintForecast: [V1, V2] })
    expect(canStart(c, V1)).toBe(true)
    const started = startItem(c, V1)
    expect(started.inProgress).toContain(V1)
    expect(started.reviewProgress[V1]).toBe(0)
  })
})
