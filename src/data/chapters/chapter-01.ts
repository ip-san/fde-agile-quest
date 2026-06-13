import type {
  Ceremony,
  Ending,
  Epilogue,
  GameEvent,
  MeterKey,
  Meters,
  Segment,
  SprintDef,
} from '../../types'

// ───────────────────────────────────────────────────────────
// 第1章「沈黙する基幹システム」
// 顧客=中堅物流「カルゴ物流」。情シスは「在庫画面に予測機能を足せ」と言う。
// だが現場では誰もその画面を使っていない。真の課題は別にある——。
// 3スプリントのスクラムを回し、現場に入り、正しいKPIを立て、文化を残せるか。
//
// 【メーター設計の原則】
// ・信頼が下がるのは「顧客に摩擦が生じた」時だけ（要望を後回し/納期割れ/粗い
//   ものを見せる/耳の痛い事実/押し返し/案件を放る）。理由は必ず resultText に書く。
// ・チーム/プロセス系の内部的な良い選択は信頼を下げない。トレードオフは「機会コスト」
//   ＝もう一方の“速く見せる”選択が信頼+1（進捗が見える）を持ち、それを取り逃す形にする。
// ───────────────────────────────────────────────────────────

export const CHAPTER_TITLE = '第1章「沈黙する基幹システム」'

export const STARTING_METERS: Meters = {
  trust: 5,
  insight: 4,
  culture: 4,
}

/** キャンペーンを構成するスプリント群。各スプリントはセレモニーを順に巡る */
export const SPRINTS: SprintDef[] = [
  {
    n: 1,
    title: 'Sprint 1「現場を知る」',
    goal: '沈黙の理由を突き止める',
    beats: ['planning', 'daily', 'daily', 'daily', 'daily', 'daily', 'review', 'retro'],
  },
  {
    n: 2,
    title: 'Sprint 2「仮説を形にする」',
    goal: '誤出荷を減らす最小版を出す',
    beats: ['planning', 'daily', 'daily', 'daily', 'daily', 'daily', 'review', 'retro'],
  },
  {
    n: 3,
    title: 'Sprint 3「文化を残す」',
    goal: '成果を本番と人に根付かせる',
    beats: ['planning', 'daily', 'daily', 'daily', 'daily', 'daily', 'review', 'retro'],
  },
]

export const CEREMONY_LABELS: Record<Ceremony, string> = {
  planning: 'スプリントプランニング',
  daily: 'デイリースクラム',
  review: 'スプリントレビュー',
  retro: 'レトロスペクティブ',
}

export const CEREMONY_SHORT: Record<Ceremony, string> = {
  planning: 'Planning',
  daily: 'Daily',
  review: 'Review',
  retro: 'Retro',
}

export const SEGMENT_LABELS: Record<Segment, string> = {
  genba: '現場',
  kokyaku: '顧客',
  team: 'チーム',
  trouble: 'トラブル',
  chance: 'チャンス',
}

export const SEGMENT_COLORS: Record<Segment, string> = {
  genba: '#38bdf8',
  kokyaku: '#a78bfa',
  team: '#34d399',
  trouble: '#f87171',
  chance: '#fbbf24',
}

export const EVENTS: GameEvent[] = [
  // ═══ Sprint 1「現場を知る」═══════════════════════════
  // ── プランニング ──
  {
    id: 's1-plan-goal',
    sprint: 1,
    ceremony: 'planning',
    segment: 'kokyaku',
    title: 'はじめてのスプリント計画',
    narrative:
      '情シス担当は「予測機能を経営に約束した」と急かす。この{{スプリント}}のゴールを何に置く？',
    choices: [
      {
        id: 'a',
        label: '約束通り「予測機能の着手」をゴールにする',
        effects: { trust: 1, insight: -1 },
        resultText:
          '“約束を守ってくれる人”として情シスは安心し、信頼が増した。だが背景を確かめないまま手が動き出す。',
      },
      {
        id: 'b',
        label: '「なぜ画面が使われないかを突き止める」をゴールにする',
        effects: { insight: 1, culture: 1, trust: -1 },
        resultText:
          '「予測機能は後回しか…」と情シスは不安げ。約束した手前、信頼は少し揺らいだ。だが正しい問いを立てた。',
      },
    ],
  },

  // ── デイリー ──
  {
    id: 's1-daily-warehouse',
    sprint: 1,
    ceremony: 'daily',
    segment: 'genba',
    title: '倉庫の片隅',
    narrative:
      '倉庫に入ると、20年勤めるベテランが手書きのメモで在庫を数えていた。「システム？ あの画面な。使ってないよ」。',
    choices: [
      {
        id: 'a',
        label: '気にせず仕様書通りに実装を進める',
        effects: { insight: -1 },
        resultText: '{{現場主義}}を欠いた一歩。「資料の外」を見落とした。',
        warn: true,
      },
      {
        id: 'b',
        label: 'もう一日、開発の手を止めて作業を観察する',
        effects: { insight: 2, culture: -1 },
        resultText:
          '手書きメモの理由が見えた。{{現場主義}}は深い。ただし丸一日チームから離れ、開発は止まった（巻き込み−）。',
      },
      {
        id: 'c',
        label: 'ベテランに30分だけヒアリングする',
        effects: { insight: 1 },
        resultText: '断片は掴めた。語られないことはまだ闇の中。',
      },
    ],
  },
  {
    id: 's1-daily-logs',
    sprint: 1,
    ceremony: 'daily',
    segment: 'trouble',
    title: '沈黙するアクセスログ',
    narrative:
      'アクセスログを見ると、在庫画面はこの3ヶ月ほぼ開かれていない。{{チャーン}}どころか最初から使われていない。',
    choices: [
      {
        id: 'a',
        label: '波風を立てず、見なかったことにする',
        effects: { insight: -1 },
        resultText: '不都合な事実を飛ばした。判断の土台が砂のまま。',
        warn: true,
      },
      {
        id: 'b',
        label: '情シスに「なぜ使われていないのか」を率直に問う',
        effects: { insight: 2, trust: -1 },
        resultText:
          '「うちのやり方を否定するのか」と情シスはむっとした（耳の痛い指摘で信頼−）。だが沈黙の理由が言葉になった。',
      },
    ],
  },
  {
    id: 's1-daily-standup',
    sprint: 1,
    ceremony: 'daily',
    segment: 'team',
    title: 'デイリースクラムにて',
    narrative:
      '{{デイリースクラム}}で若手が「で、結局何を作ればいいんすか？」と{{バックログ}}の優先順位を求めてくる。',
    choices: [
      {
        id: 'a',
        label: '自分で全部決め、指示書を渡してすぐ着手させる',
        effects: { trust: 1, culture: -1 },
        resultText:
          '着手が速く、情シスは「お、動き出した」と安心（進捗が見えて信頼+）。だがチームは指示待ちになった。',
      },
      {
        id: 'b',
        label: '掴んだ現場の文脈ごと共有し、一緒に並べ替える',
        effects: { culture: 1 },
        resultText:
          '段取りに半日かけたが、チームが「なぜ」を理解して自走し始めた。（速く見せる信頼+は取り逃す＝機会コスト）',
      },
    ],
  },
  {
    id: 's1-daily-scope',
    sprint: 1,
    ceremony: 'daily',
    segment: 'kokyaku',
    title: '増えていく要望',
    narrative:
      '情シスが「ついでにこの帳票も」と次々に要望を足してくる。{{バックログ}}が膨らみ始めた。',
    choices: [
      {
        id: 'a',
        label: '断ると角が立つので、全部引き受ける',
        effects: { trust: 1, culture: -1, insight: -1 },
        resultText:
          '“何でも応えてくれる”と情シスは満悦（信頼+）。だが的が散り、チームは振り回されて疲れる。',
        warn: true,
      },
      {
        id: 'b',
        label: '今の{{スプリント}}ゴールに照らし、一緒に「今はやらない」を決める',
        effects: { insight: 1, culture: 1 },
        resultText:
          'ゴールを示して線引きすると、情シスも「確かに」と一旦納得（信頼は据え置き）。的が絞れた。',
      },
    ],
  },
  {
    id: 's1-daily-ally',
    sprint: 1,
    ceremony: 'daily',
    segment: 'chance',
    title: '思わぬ味方',
    narrative:
      '現場のパートさんが「私、前から不便だと思ってたんです」と声をかけてきた。改善のヒントの宝庫だ。',
    choices: [
      {
        id: 'a',
        label: '忙しいので「また後で」と流す',
        effects: { insight: -1 },
        resultText: '一次情報の入口を一つ閉じてしまった。',
        warn: true,
      },
      {
        id: 'b',
        label: '15分もらって、不便リストを一緒に書き出す',
        effects: { insight: 2, culture: 1 },
        resultText: '現場の当事者が味方になった。{{オンボーディング}}の核になりそうだ。',
      },
    ],
  },

  // ── レビュー ──
  {
    id: 's1-review',
    sprint: 1,
    ceremony: 'review',
    segment: 'kokyaku',
    title: 'スプリントレビュー：まだ“機能”はない',
    narrative: '{{スプリントレビュー}}。立派な機能はまだない。何を見せる？',
    choices: [
      {
        id: 'a',
        label: '予測機能のモック画面を見せ、進んでいる風に取り繕う',
        effects: { trust: 1, insight: -1 },
        resultText:
          'それらしい画面に情シスは安心（見栄えで信頼+）。だが誤解が温存され、学びは共有されない。',
      },
      {
        id: 'b',
        label: '「画面が使われていない事実」と現場の声を率直に見せる',
        effects: { insight: 1, culture: 1, trust: -1 },
        resultText:
          '「自分たちの失敗を見せられた」と空気は重く、信頼は一旦下がった。だが全員が同じ事実に立てた。',
      },
    ],
  },

  // ── レトロ ──
  {
    id: 's1-retro',
    sprint: 1,
    ceremony: 'retro',
    segment: 'team',
    title: 'レトロスペクティブ',
    narrative: 'スプリント末。{{レトロスペクティブ}}に時間を割くか、開発を一歩でも進めるか。',
    choices: [
      {
        id: 'a',
        label: '振り返りは省き、実装を進めて情シスに見せ場を作る',
        effects: { trust: 1, culture: -1 },
        resultText:
          '手が動いた分だけ情シスへの見せ場は増えた（信頼+）。だがチームの学びは流れ、やり方は変わらない。',
      },
      {
        id: 'b',
        label: '15分だけ振り返り、やり方を1つ改善する',
        effects: { culture: 2 },
        resultText:
          'チームが自分でプロセスを直し始めた。（見せ場づくりの信頼+は取り逃す＝機会コスト）',
      },
    ],
  },

  // ═══ Sprint 2「仮説を形にする」═══════════════════════
  // ── プランニング ──
  {
    id: 's2-plan-kpi',
    sprint: 2,
    ceremony: 'planning',
    segment: 'kokyaku',
    title: 'KPIを定める',
    narrative:
      'このスプリントの成功を測る{{KPI}}を1つ決める。何を「良くなった」とみなすかで、この先すべてが変わる。',
    choices: [
      {
        id: 'a',
        label: '情シスの約束に沿って「画面の機能数を増やす」をKPIにする',
        effects: { trust: 1 },
        resultText:
          '約束通りで情シスは満足（信頼+）。だが機能を足しても誰も使わなければ意味がない…危うい仮説だ。',
        setsFlag: 'wrongKpi',
        warn: true,
      },
      {
        id: 'b',
        label: '「誤出荷率を下げる」を真のKPIにする',
        effects: { insight: 1, culture: 1 },
        resultText:
          '現場も経営も頷く成果指標。上位の{{KPI}}が定まれば下位の打ち手は自ずと決まる。',
      },
      {
        id: 'c',
        label: '無難に「在庫画面のアクセス数」をKPIにする',
        effects: {},
        resultText: '測りやすいが、アクセスが増えても誤出荷が減るとは限らない。',
      },
    ],
  },
  // ── デイリー ──
  {
    id: 's2-daily-mvp',
    sprint: 2,
    ceremony: 'daily',
    segment: 'genba',
    title: '最初の一手',
    narrative:
      '現場のメモを写真で撮るだけで在庫に反映される、小さな{{MVP}}の構想が浮かぶ。',
    choices: [
      {
        id: 'a',
        label: '完璧な予測エンジンまで作り込んでから出す',
        effects: { trust: 2, culture: -1, insight: -1 },
        resultText:
          '完成度の高さに情シスは強く満足（信頼++）。だが「完璧を待つほど学習が遅れる」。現場の反応はまだ得られない。',
        warn: true,
      },
      {
        id: 'b',
        label: '写真入力の叩き台を今スプリントで出す',
        effects: { insight: 1, culture: 1, trust: -1 },
        resultText:
          '「これで大丈夫…？」と情シスは粗さに不安顔（未完成を見せて信頼−）。だが現場が触り、{{フィードバックループ}}が回り出す。',
      },
    ],
  },
  {
    id: 's2-daily-debt',
    sprint: 2,
    ceremony: 'daily',
    segment: 'trouble',
    title: '締切と技術的負債',
    narrative: '締切が迫る。きれいに作るか、{{技術的負債}}を承知で速く出すか。',
    choices: [
      {
        id: 'a',
        label: '意図的に負債を借りて、まず動くものを締切に間に合わせる',
        effects: { insight: 1, trust: 1, culture: -1 },
        resultText:
          '締切を守り情シスは安堵（信頼+）。学習も速まった。借りた{{技術的負債}}は早めに返す前提で。',
      },
      {
        id: 'b',
        label: '品質に妥協せず、リリースを1スプリント遅らせる',
        effects: { culture: 1, trust: -1 },
        resultText:
          '締切を割り、情シスは渋い顔（納期遅れで信頼−）。だがコードは持続可能で、チームは無理をしていない。',
      },
    ],
  },
  {
    id: 's2-daily-idea',
    sprint: 2,
    ceremony: 'daily',
    segment: 'chance',
    title: '現場からの改善案',
    narrative: 'ベテランが「ここ、こうしたら俺らもっと楽だぞ」と設計に口を出してきた。',
    choices: [
      {
        id: 'a',
        label: '自分の設計が正しいので丁重に断る',
        effects: { culture: -1, insight: -1 },
        resultText: '一貫性は保てたが、現場の当事者意識を一つ削いだ。',
        warn: true,
      },
      {
        id: 'b',
        label: 'その場で取り入れて一緒に直す',
        effects: { insight: 1, culture: 1 },
        resultText: '現場が「自分たちの道具」と感じ始めた。{{オンボーディング}}が要らないほどに。',
      },
    ],
  },
  {
    id: 's2-daily-pressure',
    sprint: 2,
    ceremony: 'daily',
    segment: 'kokyaku',
    title: '横やりの催促',
    narrative:
      '情シスが「予測機能はまだ？ 経営に詰められてる」とデイリーに乗り込んできた。{{KPI}}がブレかける。',
    choices: [
      {
        id: 'a',
        label: '板挟みを避け、予測機能の開発に切り替える',
        effects: { trust: 1, insight: -1, culture: -1 },
        resultText:
          '催促に応えて情シスは一旦満足（信頼+）。だが「誤出荷を減らす」という真の的から逸れた。',
        warn: true,
      },
      {
        id: 'b',
        label: '誤出荷の改善見込みを数字で見せ、的を守る',
        effects: { insight: 1, trust: -1 },
        resultText:
          '「予測機能じゃないのか」と情シスは不満顔（要望を押し返して信頼−）。だが{{KPI}}を守るのもFDEの仕事だ。',
      },
    ],
  },
  {
    id: 's2-daily-pair',
    sprint: 2,
    ceremony: 'daily',
    segment: 'team',
    title: 'ベロシティの罠',
    narrative:
      'チームが「もっと速く回そう」と{{デイリースクラム}}で焦り始めた。品質と速度のどちらを取る。',
    choices: [
      {
        id: 'a',
        label: '見積りを切り詰め、こなす量を増やして進捗を見せる',
        effects: { trust: 1, culture: -1 },
        resultText:
          '消化数が伸び、情シスは数字に満足（信頼+）。だが{{技術的負債}}とチームの疲れが静かに積もる。',
      },
      {
        id: 'b',
        label: 'ペアで難所を潰し、持続可能なペースを守る',
        effects: { culture: 1 },
        resultText:
          '速度は落ち着いたが、チームが燃え尽きずに学び合っている。（数字を見せる信頼+は取り逃す）',
      },
    ],
  },

  // ── レビュー ──
  {
    id: 's2-review',
    sprint: 2,
    ceremony: 'review',
    segment: 'kokyaku',
    title: 'スプリントレビュー：現場が触る',
    narrative: '叩き台を現場が使ってみる回。反応をどう拾う？',
    choices: [
      {
        id: 'a',
        label: 'アンケートを配り、情シス向けに定量レポートを残す',
        effects: { trust: 1, insight: 1 },
        resultText:
          'きれいな数字が残り、情シスは報告に満足（信頼+）。ただし「なぜその点数か」は分からない。',
      },
      {
        id: 'b',
        label: '現場に立ち、使う様子を黙って観察する',
        effects: { insight: 2 },
        resultText:
          'ベテランが写真入力を「これなら楽だ」と笑った。{{現場主義}}は反応の質まで変える。（報告映えの信頼+は取り逃す）',
      },
    ],
  },

  // ── レトロ ──
  {
    id: 's2-retro',
    sprint: 2,
    ceremony: 'retro',
    segment: 'team',
    title: 'レトロスペクティブ',
    narrative: '{{レトロスペクティブ}}。順調に見える今、振り返りに時間を割くか。',
    choices: [
      {
        id: 'a',
        label: '順調なので早めに切り上げ、開発を前に進める',
        effects: { trust: 1, culture: -1 },
        resultText:
          '手を動かした分だけ情シスへの進捗は見える（信頼+）。だが小さな違和感が言語化されず積もる。',
      },
      {
        id: 'b',
        label: '良かったこと・改善を全員で出し切る',
        effects: { culture: 2 },
        resultText: 'チームの自己改善が回り始めた。（進捗を見せる信頼+は取り逃す）',
      },
    ],
  },

  // ═══ Sprint 3「文化を残す」═══════════════════════════
  // ── プランニング ──
  {
    id: 's3-plan-handoff',
    sprint: 3,
    ceremony: 'planning',
    segment: 'kokyaku',
    title: '本番化の構え',
    narrative:
      '写真入力は誤出荷を着実に減らし始めた。{{PoC}}で終わらせず本番に根付かせる段だ。最終スプリントのゴールは？',
    choices: [
      {
        id: 'a',
        label: '自分が運用も握り、頼れる窓口であり続ける',
        effects: { trust: 1, culture: -2 },
        resultText:
          '「あなたがいれば安心」と情シスは頼り切る（信頼+）。だが自分が抜けたら止まる仕組みになっていく。',
        warn: true,
      },
      {
        id: 'b',
        label: '社内メンバーへの{{オンボーディング}}と移譲をゴールにする',
        effects: { culture: 1 },
        resultText:
          '「太く残す」に舵を切った。自分の見せ場は減るが、組織に根づく形へ。（頼られる信頼+は取り逃す）',
      },
    ],
  },

  // ── デイリー（wrongKpi なら手戻りが混ざる）──
  {
    id: 's3-daily-rework',
    sprint: 3,
    ceremony: 'daily',
    segment: 'trouble',
    requiresFlag: 'wrongKpi',
    title: '手戻り——使われない新機能',
    narrative:
      '「機能数を増やす」KPIに沿って予測タブを足したが、現場は相変わらずメモのまま。上位の仮説が間違っていたので、下位の作業がまるごと無駄になった。',
    choices: [
      {
        id: 'a',
        label: 'KPIの誤りを認め、「誤出荷率」に立て直して作り直す',
        effects: { insight: 1, trust: -1 },
        resultText:
          '「作り直し…？」と情シスは渋い顔（前提の誤りを認めて信頼−）。痛い手戻りだが軌道修正した。上が崩れたら下は全部やり直す。',
      },
      {
        id: 'b',
        label: '引き返せず、機能をさらに足して押し切る',
        effects: { trust: -2, insight: -1 },
        resultText:
          '使われない機能を重ねるうち、成果の出なさに情シスの失望が深まる（信頼−−）。沈黙する画面に沈黙する機能が積み上がる。',
        warn: true,
      },
    ],
  },
  {
    id: 's3-daily-onboard',
    sprint: 3,
    ceremony: 'daily',
    segment: 'team',
    title: '引き継ぎのデイリー',
    narrative: '社内の若手が運用を引き取ろうとしている。',
    choices: [
      {
        id: 'a',
        label: '自分でやった方が速いので巻き取る',
        effects: { trust: 1, culture: -2 },
        resultText:
          '今日は速く回り、情シスも安心（信頼+）。だが運用が自分に依存し、組織は賢くならない。',
        warn: true,
      },
      {
        id: 'b',
        label: '任せて、詰まったところだけ支える',
        effects: { culture: 1 },
        resultText:
          '若手が運用を語れるようになった。文化が人に宿る。（自分が握る安心の信頼+は取り逃す）',
      },
    ],
  },
  {
    id: 's3-daily-genba',
    sprint: 3,
    ceremony: 'daily',
    segment: 'genba',
    title: '定着の確認',
    narrative: '新しいやり方が本当に根付いたか。現場へ確かめに行くか。',
    choices: [
      {
        id: 'a',
        label: 'リモートで数字だけ確認して済ます',
        effects: { insight: -1 },
        resultText: '数字は良い。だが現場の小さな不満は拾えていない。',
      },
      {
        id: 'b',
        label: '現場に通い、定着を肌で確かめ微調整する',
        effects: { insight: 1, trust: 1, culture: -1 },
        resultText:
          '「最後まで見てくれた」と現場は信頼を寄せる（信頼+）。細かな使いづらさも潰した。ただし丸一日チームを離れた（巻き込み−）。',
      },
    ],
  },
  {
    id: 's3-daily-scale',
    sprint: 3,
    ceremony: 'daily',
    segment: 'chance',
    title: '横展開の誘い',
    narrative:
      '経営から「他拠点にも広げたい」と声がかかった。{{ペルソナ}}は拠点ごとに少し違う。',
    choices: [
      {
        id: 'a',
        label: '期待に応え、今の成功をそのまま全拠点にコピーする',
        effects: { trust: 1, insight: -1 },
        resultText:
          'スピード感に経営は満足（信頼+）。だが拠点差を無視したコピーは、また別の「沈黙」を生むかも。',
      },
      {
        id: 'b',
        label: 'まず1拠点で現場を見てから広げる、と丁寧に説明する',
        effects: { insight: 1, culture: 1 },
        resultText:
          '勢いには水を差したが、経営も「確かに」と納得（信頼は据え置き）。学んだやり方を作法として残せそうだ。',
      },
    ],
  },
  {
    id: 's3-daily-referral',
    sprint: 3,
    ceremony: 'daily',
    segment: 'kokyaku',
    title: '広がる評判',
    narrative:
      '誤出荷が減ったと評判が立ち、別部署の部長が「うちにも来てくれ」と接触してきた。',
    choices: [
      {
        id: 'a',
        label: '今の案件を放って、すぐ新しい部署に乗り換える',
        effects: { trust: -1, culture: -1, insight: -1 },
        resultText:
          '目新しさに飛びつき、今の現場の定着を置き去りに。「もう興味ないのか」と熱が冷め、信頼が削れた。',
        warn: true,
      },
      {
        id: 'b',
        label: '今の定着を見届けつつ、紹介は次の入口として丁寧に繋ぐ',
        effects: { trust: 1, culture: 1 },
        resultText:
          '最後までやり切る姿勢が信頼を呼ぶ（信頼+）。「太く残す」が評判になって広がる。',
      },
    ],
  },
  {
    id: 's3-daily-metrics',
    sprint: 3,
    ceremony: 'daily',
    segment: 'trouble',
    title: '誰がダッシュボードを見るか',
    narrative:
      '誤出荷率の{{ダッシュボード}}を作ったが、自分が抜けたら誰も見ない懸念がある。',
    choices: [
      {
        id: 'a',
        label: '自分が毎朝チェックして情シスに報告し続ける',
        effects: { trust: 1, culture: -2 },
        resultText:
          '毎朝の報告に情シスは安心（信頼+）。だが運用が自分に依存し、組織には根付かない。',
        warn: true,
      },
      {
        id: 'b',
        label: '現場のリーダーが見て動ける運用に組み替える',
        effects: { culture: 1, insight: 1 },
        resultText:
          '数字が現場の手に渡った。{{フィードバックループ}}が自走し始める。（毎朝報告の信頼+は取り逃す）',
      },
    ],
  },

  // ── レビュー ──
  {
    id: 's3-review',
    sprint: 3,
    ceremony: 'review',
    segment: 'kokyaku',
    title: '最終レビュー：成果を語る',
    narrative: '誤出荷率の推移を経営に報告する。',
    choices: [
      {
        id: 'a',
        label: '数字を少し盛って、成功をきれいに見せる',
        effects: { trust: 1, culture: -1, insight: -1 },
        resultText:
          'きれいな成果に拍手（その場の信頼+）。だが事実とズレた時、信頼は一気に崩れる火種を抱えた。',
        warn: true,
      },
      {
        id: 'b',
        label: '成果も残課題も正直に共有する',
        effects: { trust: 1, insight: 1 },
        resultText: '誠実な報告が、次の一手への確かな信頼を生んだ（信頼+）。',
      },
    ],
  },

  // ── レトロ ──
  {
    id: 's3-retro',
    sprint: 3,
    ceremony: 'retro',
    segment: 'team',
    title: '最後のレトロスペクティブ',
    narrative: 'キャンペーン最後の{{レトロスペクティブ}}。この案件の学びをどう残す？',
    choices: [
      {
        id: 'a',
        label: '成功を自分の手柄としてまとめ、経営に売り込む',
        effects: { trust: 1, culture: -2 },
        resultText:
          '個人の評価は上がった（信頼+）。だが学びは自分に閉じ、チームには残らない。',
        warn: true,
      },
      {
        id: 'b',
        label: 'チームと組織の学びとして言語化し残す',
        effects: { culture: 2 },
        resultText:
          '現場の学びがプロダクトと人に残った。「太く残す」一手。（手柄にする信頼+は取り逃す）',
      },
    ],
  },
]

export const ENDINGS: Ending[] = [
  {
    id: 'disliked',
    title: '現場に嫌われたFDE',
    reflection:
      '正しさを急ぎ、信頼を後回しにした。境界線の上に立つには、まず人の隣に立つこと。技術より先に、信頼が土台になる。',
    match: (m) => m.trust <= 2,
  },
  {
    id: 'orderTaker',
    title: '言われた通り作る人',
    reflection:
      '現場の沈黙を聞かず、要望をそのまま実装した。「答えは資料の外にある」。FDEは御用聞きではなく、真の課題の発見者だ。',
    match: (m) => m.insight <= 3,
  },
  {
    id: 'hero',
    title: 'ヒーロー止まり',
    reflection:
      '成果は出した。だが自分が抜けたら止まる仕組みを残した。FDEの仕事は組織を賢くすることまで。文化が残って初めて「太く残した」と言える。',
    match: (m) => m.culture <= 2 && m.trust >= 4,
  },
  {
    id: 'trueFde',
    title: '真のFDE',
    reflection:
      '現場に入り、正しいKPIを立て、小さく出して大きく学び、文化を残した。沈黙していたシステムが、現場の言葉で動き始めた。小さく作り、大きく学び、太く残す——体現できた。',
    match: (m) => m.trust >= 7 && m.insight >= 6 && m.culture >= 6,
  },
  {
    id: 'decent',
    title: '及第点のFDE',
    reflection:
      '案件は前に進んだ。現場・顧客・組織のどこかにまだ伸びしろがある。次の案件では、トレードオフのどれを取り戻すだろう。',
    match: () => true,
  },
]

// ───────────────────────────────────────────────────────────
// 失敗エピローグ（あるある）。3ゲージのどれかが0になった瞬間に表示される。
// 0になった次元ごとに、現場で「よくある」嫌な結末を描く。
// ───────────────────────────────────────────────────────────
export const FAILURE_EPILOGUES: Record<MeterKey, Epilogue> = {
  trust: {
    id: 'fail-trust',
    title: '「もう、来なくていいです」',
    reflection:
      '正論を振りかざし、約束を後回しにし、信頼を使い果たした。ある朝、入館証は無効になっていた。すれ違う担当者はもう目を合わせない。引き継ぎもされないまま、あなたの名前はプロジェクトから静かに消えた。——技術より先に、信頼が土台だった。',
  },
  insight: {
    id: 'fail-insight',
    title: '「結局あれ、何だったんですかね」',
    reflection:
      '会議室の資料だけで設計を進め、現場の沈黙を最後まで聞かなかった。完成した立派なシステムは誰にも開かれず、倉庫では今日もベテランが手書きメモを走らせている。半年後、その機能は「使われていない一覧」に載っていた。——答えは、最後まで資料の外にあった。',
  },
  culture: {
    id: 'fail-culture',
    title: '「あの人がいないと、何も分からない」',
    reflection:
      '何でも自分で巻き取り、速さと引き換えにチームを置き去りにした。メンバーはいつしか指示待ちになり、あなたが休んだ一日、すべてが止まった。あなたが去ると、仕組みごと記憶から消えた。——巻き込めなかった文化は、根づかずに枯れる。',
  },
}

// テスト/型補助用に Ceremony の並びを公開
export const CEREMONY_ORDER: Ceremony[] = ['planning', 'daily', 'review', 'retro']
