import { describe, expect, it } from 'vitest'
import { DISCOVERABLE_BACKLOG, EVENT_BACKLOG, PRODUCT_BACKLOG } from './chapters/chapter-01'
import {
  DEMO_PERSUADE_DECK,
  dealDevFlow,
  dealDrill,
  dealHearing,
  dealReview,
  GOALCREEP_PERSUADE_DECK,
  type HearingTheme,
  hasReviewCaseForPbi,
  hearingCtaFor,
  hearingPromptFor,
  hearingThemeFor,
  hearingTitleFor,
  PERSUADE_DECK,
  persuadeDeckFor,
  REVIEW_REAL_COUNT,
  reviewCasePbiIds,
  scoreDrill,
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
  it('pbiId 指定の初回は大半が題材一致（"振れ"でない seed は決定的に同じ作問）', () => {
    // surprise でない seed（mod(seed,3)≠0）どうしは題材一致で決定的に同じ作問になる
    const a = dealReview(1, 'pbi-stock-reconcile') // 1%3=1＝題材一致
    const b = dealReview(2, 'pbi-stock-reconcile') // 2%3=2＝題材一致
    expect(a.task).toBe(b.task)
    expect(a.options.filter((o) => o.issue)).toHaveLength(REVIEW_REAL_COUNT)
  })
  it('初回でも一部 seed で"振れ"が混じる＝「初回＝必ず本物2つ」のメタを崩す（複数作問が出うる）', () => {
    const tasks = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8].map((s) => dealReview(s, 'pbi-stock-reconcile').task))
    expect(tasks.size, '初回が常に同一作問なら振れが効いていない').toBeGreaterThan(1)
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
    const matched = dealReview(1, 'pbi-stock-reconcile') // 1%3≠0＝"振れ"でない初回＝題材一致
    // どの seed でも variety は一致作問と別タスクを返す（本物指摘は 0(LGTM) か 2 のどちらか）
    for (const s of [0, 1, 2, 3, 7, 13, 100]) {
      const v = dealReview(s, 'pbi-stock-reconcile', true)
      expect(v.task, `seed=${s} で題材一致と同じ作問が出た`).not.toBe(matched.task)
      expect([0, REVIEW_REAL_COUNT]).toContain(v.options.filter((o) => o.issue).length)
    }
  })
  it('各作問の本物指摘は 0(LGTM罠＝健全コード) か 2 のどちらか・LGTM罠が複数ある（探す固定化を崩す）', () => {
    // seed=1（1%3≠0＝"振れ"でない）で各 PBI の題材一致作問を引き、実issue数を数える
    const counts = reviewCasePbiIds().map((id) => dealReview(1, id).options.filter((o) => o.issue).length)
    const bad = counts.filter((n) => n !== 0 && n !== REVIEW_REAL_COUNT)
    expect(bad, `本物指摘が 0/2 でない作問: ${bad.join(', ')}`).toEqual([])
    expect(counts.filter((n) => n === 0).length, 'LGTM罠(指摘0)の作問数').toBeGreaterThanOrEqual(2)
  })
  it('variety=true は seed で別作問へ巡回する（複数の作問が出うる＝多様）', () => {
    const tasks = new Set([0, 1, 2, 3, 4, 5, 6].map((s) => dealReview(s, 'pbi-stock-reconcile', true).task))
    expect(tasks.size).toBeGreaterThan(1) // 1種類に固定されない
  })
  it('variety=true で同 pbi に複数ケースがある時、同 pbi の別ケースが出る', () => {
    // pbi-floor-observe はケース[0](方向性ズレ) と [1](ハルシネ) の2件を持つ。
    // variety 時は初回（[0]=matchedIdx）とは別の同 pbi ケース（[1]）が優先して出る。
    const matched = dealReview(1, 'pbi-floor-observe') // 初回：[0]の direction 主役作問
    for (const s of [0, 1, 2, 3, 7, 13]) {
      const v = dealReview(s, 'pbi-floor-observe', true)
      // variety は同 pbi の別ケース＝[1] を出す（matched.task と異なる）
      expect(v.task, `seed=${s} で初回と同じ作問が出た`).not.toBe(matched.task)
      // かつ同じ pbi の問いなので文脈が繋がる
      expect([0, REVIEW_REAL_COUNT]).toContain(v.options.filter((o) => o.issue).length)
    }
  })
  it('variety=true で同 pbi に別ケースがない時、全作問から巡回（フォールバック）', () => {
    // pbi-stock-reconcile はケースが1件のみ＝variety はフォールバックして全作問から巡回。
    const matched = dealReview(1, 'pbi-stock-reconcile')
    for (const s of [0, 1, 2, 3, 7, 13]) {
      const v = dealReview(s, 'pbi-stock-reconcile', true)
      expect(v.task, `seed=${s} で初回と同じ作問が出た`).not.toBe(matched.task)
      expect([0, REVIEW_REAL_COUNT]).toContain(v.options.filter((o) => o.issue).length)
    }
  })
})

describe('dealDrill', () => {
  it('questions(4件) を返し、同じ seed で決定的', () => {
    const d = dealDrill(7)
    expect(d.questions).toHaveLength(4)
    expect(dealDrill(7)).toEqual(d) // 決定的
  })
  it('questions は良2/悪2 の構成', () => {
    for (const seed of [0, 1, 2, 3, 10, 99]) {
      const d = dealDrill(seed)
      expect(d.questions.filter((q) => q.good)).toHaveLength(2)
      expect(d.questions.filter((q) => !q.good)).toHaveLength(2)
    }
  })
  it('各 question は response と followUps(良2/悪2) と finalReactions を持つ', () => {
    const d = dealDrill(5)
    for (const q of d.questions) {
      expect(q.response).toBeTruthy()
      expect(q.followUps).toHaveLength(4)
      expect(q.followUps.filter((f) => f.good)).toHaveLength(2)
      expect(q.followUps.filter((f) => !f.good)).toHaveLength(2)
      // finalReactions が3キーすべて存在する
      expect(q.finalReactions.onGreat).toBeTruthy()
      expect(q.finalReactions.onMid).toBeTruthy()
      expect(q.finalReactions.onPoor).toBeTruthy()
    }
  })
  it('followUps は seed によって順序が変わる（「上2つが正解」の位置固定メタを防ぐ）', () => {
    // 同じセットを異なる seed で引いた時、少なくとも1問で followUps の並びが違う
    const seeds = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
    // 全 seed で全問いの followUps の並びを取得
    const orders = seeds.map((s) =>
      dealDrill(s).questions.map((q) => q.followUps.map((f) => (f.good ? 'G' : 'B')).join(''))
    )
    // 全 seed で全問いの followUps が同一ならシャッフルが効いていない
    const allSame = orders.every((o) => JSON.stringify(o) === JSON.stringify(orders[0]))
    expect(allSame, 'followUps の順序が全 seed で固定（シャッフルが効いていない）').toBe(false)
    // さらに、「最初の2つが常に good（GGBB 固定）」でないことを確認
    const allFirstTwoGood = orders.every((o) => o.every((q) => q.startsWith('GG')))
    expect(allFirstTwoGood, 'followUps が常に良問から始まる（位置固定）').toBe(false)
  })
  it('questions の並びも seed によって変わる（ワンパターン回避）', () => {
    // 同じ seed は決定的（上でテスト済み）。違う seed では別の並びが出る
    const texts = new Set(
      [0, 1, 2, 3, 4, 5].map((s) =>
        dealDrill(s)
          .questions.map((q) => q.text)
          .join('|')
      )
    )
    expect(texts.size, 'questions の並びが全 seed で同一').toBeGreaterThan(1)
  })
  it('seed が違えば内容/並びが変わりうる（ワンパターン回避）', () => {
    const same = [1, 2, 3, 4, 5].every(
      (s) => JSON.stringify(dealDrill(s).questions) === JSON.stringify(dealDrill(0).questions)
    )
    expect(same).toBe(false)
  })
  it('theme 指定で対応テーマのセットが選ばれる（chousa は調査型の questions を返す）', () => {
    const d = dealDrill(0, 'chousa')
    expect(d.questions).toHaveLength(4)
    // chousa テーマのセットは全問いに response が含まれる
    for (const q of d.questions) {
      expect(q.response).toBeTruthy()
    }
  })
  it('theme 未指定は全セットから選ぶ（複数 seed で異なるセットが出うる）', () => {
    const texts = new Set([0, 1, 2, 3, 4, 5].map((s) => dealDrill(s).questions[0].text))
    expect(texts.size).toBeGreaterThan(1)
  })
})

describe('scoreDrill', () => {
  it('良い問い＋良い切り返し = great', () => {
    expect(scoreDrill(true, true)).toBe('great')
  })
  it('良い問い＋悪い切り返し = good', () => {
    expect(scoreDrill(true, false)).toBe('good')
  })
  it('悪い問い＋良い切り返し = good', () => {
    expect(scoreDrill(false, true)).toBe('good')
  })
  it('両方悪い = poor', () => {
    expect(scoreDrill(false, false)).toBe('poor')
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

describe('説得の文脈別デッキ（汎用は温存し demo／goalcreep だけ差し替え）', () => {
  it('persuadeDeckFor(): 未指定は汎用、demo/goalcreep は各専用デッキ（既存挙動を壊さない）', () => {
    expect(persuadeDeckFor()).toBe(PERSUADE_DECK)
    expect(persuadeDeckFor('demo')).toBe(DEMO_PERSUADE_DECK)
    expect(persuadeDeckFor('goalcreep')).toBe(GOALCREEP_PERSUADE_DECK)
  })
  it('demo デッキは良手（誠実に価値を示す）と悪手（spin）の混合＝scoreHearing がそのまま機能する', () => {
    expect(DEMO_PERSUADE_DECK.filter((o) => o.good).length).toBeGreaterThanOrEqual(2)
    expect(DEMO_PERSUADE_DECK.filter((o) => !o.good).length).toBeGreaterThanOrEqual(1)
    // 良手2つで great、悪手2つで poor＝既存の採点機構にそのまま乗る
    const good = DEMO_PERSUADE_DECK.filter((o) => o.good)
    const bad = DEMO_PERSUADE_DECK.filter((o) => !o.good)
    expect(scoreHearing([good[0], good[1]])).toBe('great')
    expect(scoreHearing([bad[0], bad[1]])).toBe('poor')
  })
  it('goalcreep デッキは良手（事実で線を引く）と悪手（迎合・先送り・全部呑む）の混合＝scoreHearing がそのまま機能する', () => {
    expect(GOALCREEP_PERSUADE_DECK.filter((o) => o.good).length).toBeGreaterThanOrEqual(2)
    expect(GOALCREEP_PERSUADE_DECK.filter((o) => !o.good).length).toBeGreaterThanOrEqual(1)
    const good = GOALCREEP_PERSUADE_DECK.filter((o) => o.good)
    const bad = GOALCREEP_PERSUADE_DECK.filter((o) => !o.good)
    expect(scoreHearing([good[0], good[1]])).toBe('great')
    expect(scoreHearing([bad[0], bad[1]])).toBe('poor')
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
  it('方向性ズレの主役作問は surprise 対象外＝初回はどの seed でも必ず題材一致で出る', () => {
    // pbi-floor-observe の題材一致は (D)「細部健全だが要件外し＝差し戻し級」＝方向性ズレの掴み。
    // surprise(mod(seed,3)===0) でも別作問に振らさず、初回は常に direction を芯に持つ作問が出る。
    for (const s of [0, 1, 2, 3, 6, 9]) {
      const r = dealReview(s, 'pbi-floor-observe')
      expect(r.options.some((o) => o.issue && o.kind === 'direction')).toBe(true)
    }
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

describe('scoreReview 重み付け（方向性ズレを細部より重く）', () => {
  const dir = { text: 'direction-issue', issue: true, kind: 'direction' as const }
  const det = { text: 'detail-issue', issue: true, kind: 'detail' as const }
  const noise = { text: 'noise', issue: false }
  // options（全選択肢）は重み付け判定に使う
  const optionsWith = [dir, det, noise, noise, noise]
  const optionsDetailOnly = [det, det, noise, noise, noise]

  it('方向性も細部も拾えば great（全部拾い・空振り0）', () => {
    expect(scoreReview([dir, det], 2, optionsWith)).toBe('great')
  })
  it('方向性を見逃すと great にならない（細部だけ全部拾っても最良で good）', () => {
    // dir を見逃して det だけ拾う → great でなく good
    expect(scoreReview([det], 2, optionsWith)).toBe('good')
  })
  it('方向性を拾って細部を見逃しても good（細部の取りこぼしは重みが低い）', () => {
    // dir だけ拾い、det は見逃す → good（poor にはならない）
    expect(scoreReview([dir], 2, optionsWith)).toBe('good')
  })
  it('方向性指摘が無い作問（detail のみ）では従来どおり great になれる', () => {
    expect(scoreReview([det, det], 2, optionsDetailOnly)).toBe('great')
  })
  it('方向性指摘が無い作問でも空振り過多は poor', () => {
    expect(scoreReview([det, noise, noise], 2, optionsDetailOnly)).toBe('poor')
  })
  it('options なし（後方互換）では方向性重み付けは無効＝従来ロジック通り', () => {
    // options を渡さなければ方向性見逃しでも great になれる（後方互換）
    expect(scoreReview([dir, det])).toBe('great')
  })
  it('細部を選んだこと自体は減点しない（方向性も拾えば great）', () => {
    // det（細部）も dir（方向性）も拾う → great（細部を見たことは罰しない）
    expect(scoreReview([dir, det], 2, optionsWith)).toBe('great')
  })
  it('方向性を見逃し空振りも多ければ poor', () => {
    // dir を見逃し + noise を2つ選ぶ → poor（空振り2以上）
    expect(scoreReview([noise, noise], 2, optionsWith)).toBe('poor')
  })
})
