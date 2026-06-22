import { describe, expect, it } from 'vitest'
import { DISCOVERABLE_BACKLOG, EVENT_BACKLOG, PRODUCT_BACKLOG } from './chapters/chapter-01'
import {
  dealDevFlow,
  dealHearing,
  dealReview,
  type HearingTheme,
  hasReviewCaseForPbi,
  hearingCtaFor,
  hearingPromptFor,
  hearingThemeFor,
  hearingTitleFor,
  REVIEW_REAL_COUNT,
  reviewCasePbiIds,
  scoreHearing,
  scoreReview,
  scoreSequence,
  scoreTiming,
} from './minigames'

describe('レビュー作問のPBI連動（タスク内容に一致した作問が出る）', () => {
  it('レビューしうる全PBIに、内容が一致するレビュー作問がある（取りこぼし防止）', () => {
    const pbis = [...PRODUCT_BACKLOG, ...DISCOVERABLE_BACKLOG]
    const missing = pbis.filter((p) => !hasReviewCaseForPbi(p.id)).map((p) => p.id)
    expect(missing, `レビュー作問が無いPBI: ${missing.join(', ')}`).toEqual([])
  })
  it('pbiId 指定時は seed によらず同じ（そのタスクに一致した）作問が出る', () => {
    const a = dealReview(0, 'pbi-stock-reconcile')
    const b = dealReview(50, 'pbi-stock-reconcile')
    expect(a.task).toBe(b.task) // 作問は PBI で決まる＝タスク内容に連動
    expect(a.options.filter((o) => o.issue)).toHaveLength(REVIEW_REAL_COUNT)
  })
  it('レビュー作問の pbi はすべて実在する PBI を指す（孤児作問が無い・逆方向）', () => {
    // 実在する PBI＝プロダクト＋発見可＋イベント発（EVENT_BACKLOG）。イベントで持ち込まれる要望
    // （例 pbi-evt-exec-feature＝荷主向けダッシュボード）も実在の PBI なので、レビュー作問を紐づけてよい。
    const pbiIds = new Set([...PRODUCT_BACKLOG, ...DISCOVERABLE_BACKLOG, ...EVENT_BACKLOG].map((p) => p.id))
    const orphans = reviewCasePbiIds().filter((id) => !pbiIds.has(id))
    expect(orphans, `実在しないPBIを指す孤児作問: ${orphans.join(', ')}`).toEqual([])
  })
  it('pbiId 無し（フォールバック）は seed で巡回し、本物指摘 0(LGTM罠) か 2 の作問を返す', () => {
    const r = dealReview(0)
    expect(r.task).not.toBe('')
    expect([0, REVIEW_REAL_COUNT]).toContain(r.options.filter((o) => o.issue).length)
  })
  it('variety=true は題材一致の作問を避ける＝初回（一致）と必ず別の作問を出す（連続レビューで同じが続かない）', () => {
    const matched = dealReview(0, 'pbi-stock-reconcile') // 初回＝題材一致
    // どの seed でも variety は一致作問と別タスクを返す（本物指摘は 0(LGTM) か 2 のどちらか）
    for (const s of [0, 1, 2, 3, 7, 13, 100]) {
      const v = dealReview(s, 'pbi-stock-reconcile', true)
      expect(v.task, `seed=${s} で題材一致と同じ作問が出た`).not.toBe(matched.task)
      expect([0, REVIEW_REAL_COUNT]).toContain(v.options.filter((o) => o.issue).length)
    }
  })
  it('各作問の本物指摘は 0(LGTM罠＝健全コード) か 2 のどちらか・LGTM罠が複数ある（探す固定化を崩す）', () => {
    const counts = reviewCasePbiIds().map((id) => dealReview(0, id).options.filter((o) => o.issue).length)
    const bad = counts.filter((n) => n !== 0 && n !== REVIEW_REAL_COUNT)
    expect(bad, `本物指摘が 0/2 でない作問: ${bad.join(', ')}`).toEqual([])
    expect(counts.filter((n) => n === 0).length, 'LGTM罠(指摘0)の作問数').toBeGreaterThanOrEqual(2)
  })
  it('variety=true は seed で別作問へ巡回する（複数の作問が出うる＝多様）', () => {
    const tasks = new Set([0, 1, 2, 3, 4, 5, 6].map((s) => dealReview(s, 'pbi-stock-reconcile', true).task))
    expect(tasks.size).toBeGreaterThan(1) // 1種類に固定されない
  })
})

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
    const themes: HearingTheme[] = ['genba', 'kokyaku', 'chance', 'team', 'chousa', 'inin']
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
  it('hearingThemeFor: hearing 系セグメント(team含む)を themed に、その他は kokyaku に寄せる', () => {
    expect(hearingThemeFor('genba')).toBe('genba')
    expect(hearingThemeFor('kokyaku')).toBe('kokyaku')
    expect(hearingThemeFor('chance')).toBe('chance')
    expect(hearingThemeFor('team')).toBe('team')
    expect(hearingThemeFor('trouble')).toBe('kokyaku')
  })
})

describe('ヒアリングの見出し・設問リード・確定ラベル（相手/場面で出し分け）', () => {
  const themes: HearingTheme[] = ['genba', 'kokyaku', 'chance', 'team', 'chousa', 'inin']
  it('テーマごとに6種とも文言が異なる（“現場”固定の解消）', () => {
    for (const fn of [hearingTitleFor, hearingPromptFor, hearingCtaFor]) {
      const set = new Set(themes.map((t) => fn(t)))
      expect(set.size).toBe(6)
    }
  })
  it('未指定（theme=undefined）は現場主義の標準にフォールバック', () => {
    expect(hearingTitleFor()).toBe(hearingTitleFor('genba'))
    expect(hearingPromptFor()).toBe(hearingPromptFor('genba'))
    expect(hearingCtaFor()).toBe(hearingCtaFor('genba'))
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

describe('dealReview', () => {
  it('差分・AIメモ・5択を返し、拾うべき指摘をちょうど2つ含む（決定的）', () => {
    const r = dealReview(4)
    expect(r.diff.length).toBeGreaterThan(0)
    expect(r.aiNote).toBeTruthy()
    expect(r.options).toHaveLength(5)
    expect(r.options.filter((o) => o.issue)).toHaveLength(REVIEW_REAL_COUNT)
    expect(r.takeaway).toBeTruthy()
    expect(dealReview(4)).toEqual(r) // 決定的
  })
  it('seed が違えば題材/並びが変わりうる', () => {
    const same = [1, 2, 3, 4, 5].every((s) => JSON.stringify(dealReview(s)) === JSON.stringify(dealReview(0)))
    expect(same).toBe(false)
  })
})

describe('scoreReview', () => {
  const real = { text: 'r', issue: true }
  const noise = { text: 'n', issue: false }
  it('本物2つ的確・空振り0で great', () => {
    expect(scoreReview([real, real])).toBe('great')
  })
  it('1つ以上拾い空振り1までは good', () => {
    expect(scoreReview([real])).toBe('good')
    expect(scoreReview([real, noise])).toBe('good')
  })
  it('素通し（0件）や空振り過多は poor', () => {
    expect(scoreReview([])).toBe('poor') // realCount=2 で何も拾わない＝AIを素通し
    expect(scoreReview([noise, noise])).toBe('poor')
    expect(scoreReview([real, noise, noise])).toBe('poor') // 拾えても空振り2は poor
  })
  it('LGTM罠（realCount=0＝健全コード）：何も指摘せず出す＝great／捏造はコスト', () => {
    expect(scoreReview([], 0)).toBe('great') // 健全なので LGTM が正解
    expect(scoreReview([noise], 0)).toBe('good') // 念のための空振り1＝good（軽い捏造）
    expect(scoreReview([noise, noise], 0)).toBe('poor') // 無いのに2つ捏造＝poor（オオカミ少年）
  })
})
