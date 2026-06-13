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
      'あなたは{{FDE}}として、物流会社カルゴ物流の現場に降り立った。情シス担当は「予測機能を経営に約束した」と急かす。この{{スプリント}}のゴールを何に置く？',
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
  {
    id: 's1-daily-ai-chores',
    sprint: 1,
    ceremony: 'daily',
    segment: 'chance',
    title: 'AIで空いた時間',
    narrative:
      '定型の集計レポート作成をAIに任せたら、毎日1時間が浮いた。この時間をどう使う？',
    choices: [
      {
        id: 'a',
        label: '浮いた時間で、別の機能を作り込む',
        effects: { trust: 1, insight: -1 },
        resultText: '機能は増えた。だがAIが生んだ余白を、また机上の開発に使ってしまった。',
      },
      {
        id: 'b',
        label: '浮いた時間で、もう一度倉庫の現場に立つ',
        effects: { insight: 2, culture: -1 },
        resultText:
          'AIで雑務を消した分、現場を見る時間が増えた。これがAIと働く本来の使い方だ。',
      },
    ],
  },
  {
    id: 's1-daily-ai-context',
    sprint: 1,
    ceremony: 'daily',
    segment: 'genba',
    title: 'AIが現場用語を取り違える',
    narrative:
      'AIに在庫手順を説明させたら「ピッキング」を別の意味に解釈し、的外れな出力。{{プロンプト}}を何度こね回しても直らない。',
    choices: [
      {
        id: 'a',
        label: '{{プロンプト}}に言葉を足し、呪文のように調整し続ける',
        effects: { insight: -1 },
        resultText:
          'プロンプトは呪文ではない。前提知識が無いまま言い回しをいじっても、的は外れたまま。',
        warn: true,
      },
      {
        id: 'b',
        label: '現場の用語と業務ルールを整理し、知識としてAIに渡す',
        effects: { insight: 1, culture: 1 },
        resultText:
          '{{RAG}}の前に、まず知識を整理する。AIの出力が一気に現場に噛み合い始めた。',
      },
    ],
  },

  {
    id: 's1-daily-legacy',
    sprint: 1,
    ceremony: 'daily',
    segment: 'trouble',
    title: '笑えない古いシステム',
    narrative:
      'カルゴ物流の基幹は20年前の{{レガシー}}。承認フローには今も紙が混じる。エンジニア仲間は「こんな古いの捨てて作り直せばいい」と笑う。',
    choices: [
      {
        id: 'a',
        label: 'レガシーを切り捨て、最新構成で作り直す前提で動く',
        effects: { insight: -1, trust: -1 },
        resultText:
          '「現場が回ってる仕組みを軽んじるな」と顧客の顔が曇る（信頼−）。{{レガシー}}には20年分の業務知識が埋まっている。',
        warn: true,
      },
      {
        id: 'b',
        label: 'レガシーと承認フローを“前提”として受け入れ、設計条件にする',
        effects: { insight: 1, culture: 1 },
        resultText:
          '{{ガバナンス}}は敵でなく入場券。古い仕組みを笑わず読み解くと、本当の制約と業務の理由が見えた。',
      },
    ],
  },
  {
    id: 's1-daily-diagram',
    sprint: 1,
    ceremony: 'daily',
    segment: 'genba',
    title: '頭の中の在庫フロー',
    narrative:
      '入庫・出庫・返品が絡む在庫の流れは複雑で、口頭で説明すると毎回こんがらがる。',
    choices: [
      {
        id: 'a',
        label: '分かっているつもりなので、頭の中のまま実装に入る',
        effects: { insight: -1 },
        resultText: '図にできない構造は、まだ見えていない。実装の途中で抜け漏れが噴き出した。',
        warn: true,
      },
      {
        id: 'b',
        label: 'ホワイトボードに在庫フローを図解し、関係者と確かめる',
        effects: { insight: 1, culture: 1 },
        resultText:
          '書けない・図にできない設計は、考え切れていない証拠。図にした瞬間、例外パターンが3つあぶり出された。',
      },
    ],
  },

  {
    id: 's1-daily-translate',
    sprint: 1,
    ceremony: 'daily',
    segment: 'genba',
    title: '「見える化したい」',
    narrative:
      '情シスは「在庫を見える化したい」と言う。だが“見える化”が現場で何を意味するかは、人によって違う。',
    choices: [
      {
        id: 'a',
        label: '言葉のまま「在庫一覧画面」を作る',
        effects: { insight: -1 },
        resultText: '顧客の言葉を業務に翻訳しなかった。出来た画面は、誰の「見える化」でもなかった。',
        warn: true,
      },
      {
        id: 'b',
        label: '「見える化」が現場で何を指すか、動作レベルまで細かく翻訳する',
        effects: { insight: 2, culture: -1 },
        resultText:
          '顧客の言葉を業務に翻訳し、細かく潜る。「本当は“出荷ミスに気づける”ことだ」と分かった。',
      },
    ],
  },
  {
    id: 's1-daily-excel',
    sprint: 1,
    ceremony: 'daily',
    segment: 'genba',
    title: '巨大なExcel',
    narrative:
      '現場は在庫をマクロだらけの巨大なExcelで管理していた。複雑だが、ちゃんと回ってはいる。',
    choices: [
      {
        id: 'a',
        label: '「Excel管理なんて」と一蹴し、無視して新システムを作る',
        effects: { insight: -1 },
        resultText:
          'Excelを軽んじた。だがあのマクロには、例外処理に滲む業務の本質が詰まっていた。',
        warn: true,
      },
      {
        id: 'b',
        label: 'Excelの中身、特に例外処理の分岐を丁寧に読み解く',
        effects: { insight: 2, culture: -1 },
        resultText:
          '現場のExcelは未来のプロダクト仕様。例外処理にこそ、業務の本質が出ていた。',
      },
    ],
  },
  {
    id: 's1-daily-rough',
    sprint: 1,
    ceremony: 'daily',
    segment: 'chance',
    title: '手が止まる',
    narrative:
      'アイデアはある。だが「ちゃんとしたものを見せないと恥ずかしい」と、手が止まっている。',
    choices: [
      {
        id: 'a',
        label: '人に見せられる完成度まで、一人で磨いてから出す',
        effects: { trust: 1, insight: -1 },
        resultText:
          '完成度は上がった。だが本番に出ないコードは、ただの仮説のまま。学びは得られない。',
        warn: true,
      },
      {
        id: 'b',
        label: '最初の解は雑でいい。動く粗いものを今日、現場に当てる',
        effects: { insight: 1, culture: 1, trust: -1 },
        resultText:
          '粗さに情シスは少し不安顔（信頼−）。だが本番に当てて初めて、仮説が学びに変わる。',
      },
    ],
  },
  {
    id: 's1-daily-cando',
    sprint: 1,
    ceremony: 'daily',
    segment: 'team',
    title: '「それは無理です」',
    narrative: '情シスが無理筋の要求。チームは「それは無理です」と即答しかけた。',
    choices: [
      {
        id: 'a',
        label: '「それはできません」とはっきり断る',
        effects: { trust: -1, insight: -1 },
        resultText:
          '断るのは簡単。だが「できません」の前に最小版を、「難しい」の前に分解を試したか？',
        warn: true,
      },
      {
        id: 'b',
        label: '「できません」の前に最小版を作り、難所を分解して見せる',
        effects: { insight: 1, culture: 1 },
        resultText:
          'できませんの前に最小版、難しいの前に分解。無理筋が、やれる形に変わった。',
      },
    ],
  },
  {
    id: 's1-daily-practice',
    sprint: 1,
    ceremony: 'daily',
    segment: 'team',
    title: '尻込みするチーム',
    narrative: '新しいツールを導入したいが、チームは「使い方が分からない」と尻込みしている。',
    choices: [
      {
        id: 'a',
        label: '誰かが教えてくれるまで待つ',
        effects: { insight: -1, culture: -1 },
        resultText: '独学を止めた組織は、置いていかれる。待っている間に、現場の課題は積もる。',
        warn: true,
      },
      {
        id: 'b',
        label: 'まず自分が量をこなして触り倒し、勘所を掴んでチームに渡す',
        effects: { insight: 1, culture: 1 },
        resultText: '独学を止めるな、量をこなせ。手を動かした分だけ、教えられることが増えた。',
      },
    ],
  },
  {
    id: 's1-daily-feedback',
    sprint: 1,
    ceremony: 'daily',
    segment: 'kokyaku',
    title: '厳しいダメ出し',
    narrative: 'レビューで現場から厳しいダメ出し。「これ、全然使えない」と。',
    choices: [
      {
        id: 'a',
        label: '「現場が分かってない」と内心で受け流す',
        effects: { insight: -1, trust: -1 },
        resultText:
          'フィードバックを痛がって閉じた。痛い指摘ほど、見落としていた資産だったのに。',
        warn: true,
      },
      {
        id: 'b',
        label: 'わからない点を即メモし、痛い指摘を資産として持ち帰る',
        effects: { insight: 1, culture: 1 },
        resultText:
          'わからないことは即メモ。フィードバックは痛いが資産。次の一手が具体的になった。',
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
    narrative:
      '{{スプリントレビュー}}は本来、完成した{{インクリメント}}を{{ステークホルダー}}と検査し、次を適応する場。だが今スプリントは現場理解に充てたので、見せられる動くものは無い。何を見せる？',
    choices: [
      {
        id: 'a',
        label: '予測機能のモック画面を見せ、進んでいる風に取り繕う',
        effects: { trust: 1, insight: -1 },
        resultText:
          'それらしい画面に情シスは安心（見栄えで信頼+）。だがレビューは“動く成果物を検査する場”。モックでの取り繕いは趣旨に反し、誤解だけが温存された。',
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
    narrative:
      'スプリント末。{{レトロスペクティブ}}は毎スプリント必ず開く場だ。今回はどう使う？',
    choices: [
      {
        id: 'a',
        label: '通り一遍で形だけ済ませ、その分の時間で開発を進める',
        effects: { trust: 1, culture: -1 },
        resultText:
          '手が動いた分だけ情シスへの見せ場は増えた（信頼+）。だが振り返りは形骸化し、やり方は変わらない。',
      },
      {
        id: 'b',
        label: '本気で振り返り、やり方を1つ改善して持ち帰る',
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
        label: '意図的に負債を借りて、まず動く{{MVP}}を締切に間に合わせる',
        effects: { insight: 1, trust: 1, culture: -1 },
        resultText:
          '締切を守り情シスは安堵（信頼+）。動くものが早く現場に当たり、学習も速まった（{{フィードバックループ}}が短いほど学びは速い）。借りた{{技術的負債}}は早めに返す前提で。',
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
      'チームが「もっと速く回そう」と{{デイリースクラム}}で焦り始めた。情シスは{{ベロシティ}}を“ノルマ”と見て増加を期待している。',
    choices: [
      {
        id: 'a',
        label: '見積りを盛って消化量を増やし、ベロシティを“成長”に見せる',
        effects: { trust: 1, culture: -1 },
        resultText:
          '数字は伸び、情シスは満足（信頼+）。だが{{ベロシティ}}はノルマでなく予測のための実績値。盛れば{{技術的負債}}とチームの疲れが静かに積もる。',
        warn: true,
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
  {
    id: 's2-daily-ai-eval',
    sprint: 2,
    ceremony: 'daily',
    segment: 'trouble',
    title: '評価基準を書く前に',
    narrative:
      '「誤出荷チェック」をAIに作らせたい。チームは「とりあえず生成して、動いたら採用しよう」と言う。',
    choices: [
      {
        id: 'a',
        label: 'まず生成させ、動いたものを採用する',
        effects: { trust: 1, insight: -1 },
        resultText:
          '動いて見えた。だが“何をもって正しいか”が無い。評価なき生成は、ただの祈りだ。',
        warn: true,
      },
      {
        id: 'b',
        label: '先に合否の{{評価基準}}（許容できる誤出荷率）を書いてから生成させる',
        effects: { insight: 1, trust: -1 },
        resultText:
          '着手は遅れ情シスは渋い顔（信頼−）。だが生成の前に{{評価基準}}を決めたから、出力の良し悪しを判断できる。',
      },
    ],
  },
  {
    id: 's2-daily-ai-code',
    sprint: 2,
    ceremony: 'daily',
    segment: 'team',
    title: 'AIが書いたコードのバグ',
    narrative:
      'AIに量産させたコードを、レビューせず本番に出していた。現場から「在庫数が時々ずれる」と苦情が来た。',
    choices: [
      {
        id: 'a',
        label: '「AIが書いたものなので」と原因をAIに帰す',
        effects: { trust: -1, culture: -1 },
        resultText:
          'AIは速度をくれるが、責任はくれない。AIが書いたコードも、本番に出した以上はお前のコードだ。',
        warn: true,
      },
      {
        id: 'b',
        label: '自分の責任とし、AI生成コードのレビュー体制を敷く',
        effects: { insight: 1, culture: 1, trust: -1 },
        resultText:
          '一時的に速度は落ちた（信頼−）。だが「AIが書いてもレビューは人」がチームの作法になった。',
      },
    ],
  },

  {
    id: 's2-daily-security',
    sprint: 2,
    ceremony: 'daily',
    segment: 'trouble',
    title: '後回しにされた制約',
    narrative:
      '情シスが「個人情報を含む配送データは社外に出すな」と言う。写真入力にAIを使う構成だと、ここに引っかかる。',
    choices: [
      {
        id: 'a',
        label: 'まず動かして、セキュリティは後から塞ぐ',
        effects: { trust: 1, insight: -1 },
        resultText:
          '動きは速い。だがセキュリティは後付けするほど高くつく。終盤で構成のやり直しが待っている。',
        warn: true,
      },
      {
        id: 'b',
        label: '社外にデータを出さない構成を、最初から設計条件にする',
        effects: { insight: 1, culture: 1, trust: -1 },
        resultText:
          '制約に合わせる手間で着手は遅れた（信頼−）。だが顧客の制約を設計条件にすると、後の地雷が消える。',
      },
    ],
  },
  {
    id: 's2-daily-pm',
    sprint: 2,
    ceremony: 'daily',
    segment: 'team',
    title: '優先順位の綱引き',
    narrative:
      'チーム内で「予測機能が先だ」「いや写真入力が先だ」と割れた。あなたはエンジニアだが、誰も交通整理をしない。',
    choices: [
      {
        id: 'a',
        label: '自分の担当機能だけ進め、優先順位の対立は放っておく',
        effects: { culture: -1, insight: -1 },
        resultText:
          '隙間に落ちた“交通整理”は、誰の仕事でもない＝お前の仕事だった。チームが空回りする。',
        warn: true,
      },
      {
        id: 'b',
        label: 'PMとして誤出荷KPIに照らし優先順位を裁き、決めたら自分も手を動かす',
        effects: { culture: 1, insight: 1 },
        resultText:
          'FDEはPMでもあり、最後はエンジニア。決めて、自ら作る背中が、チームを前に動かした。',
      },
    ],
  },
  {
    id: 's2-daily-record',
    sprint: 2,
    ceremony: 'daily',
    segment: 'kokyaku',
    title: '口頭の「OK」',
    narrative:
      '情シスが廊下で「その仕様でいいよ」と口頭でOKをくれた。急いでいるし、このまま進めたい。',
    choices: [
      {
        id: 'a',
        label: '言質は取ったので、口頭合意のまま実装を進める',
        effects: { trust: 1, insight: -1 },
        resultText:
          '後日「そんなつもりじゃなかった」と覆り、手戻りに。口頭合意は、形にしないと消える。',
        warn: true,
      },
      {
        id: 'b',
        label: '決まったことを一行のメモにして共有し、合意を形に残す',
        effects: { insight: 1, culture: 1 },
        resultText:
          '文書は官僚仕事でなく外部記憶。一行の記録が、後の「言った・言わない」を未然に防いだ。',
      },
    ],
  },
  {
    id: 's2-daily-close',
    sprint: 2,
    ceremony: 'daily',
    segment: 'team',
    title: '結論の出ない打ち合わせ',
    narrative: '30分の打ち合わせ。議論は盛り上がったが、結論が出ないまま終わりそうだ。',
    choices: [
      {
        id: 'a',
        label: '良い議論だったので、雰囲気よく解散する',
        effects: { culture: -1 },
        resultText: '次に誰が何をするか決まらず、来週また同じ議論を繰り返すことに。',
        warn: true,
      },
      {
        id: 'b',
        label: '「次の一手」と担当・期限を一つ決めてから閉じる',
        effects: { culture: 1, insight: 1 },
        resultText: '会議は次の一手を決める場。議論を閉じたことで、チームが前に進み始めた。',
      },
    ],
  },

  {
    id: 's2-daily-demo',
    sprint: 2,
    ceremony: 'daily',
    segment: 'kokyaku',
    title: '進捗を説明しろ',
    narrative: '経営会議で「進捗を説明しろ」と。立派な資料を作るか、動くデモを見せるか。',
    choices: [
      {
        id: 'a',
        label: '40枚の進捗スライドを作り込む',
        effects: { trust: 1, insight: -1 },
        resultText:
          'スライドは綺麗。だがデモは会議資料より強い。動くものを見せた人に、場は持っていかれた。',
        warn: true,
      },
      {
        id: 'b',
        label: '5分の動くデモを見せ、納品は“資料”でなく“業務の変化”だと示す',
        effects: { insight: 1, culture: 1 },
        resultText:
          'デモは百枚の資料に勝つ。成果物でなく業務の変化を語ったことで、経営の目が変わった。',
      },
    ],
  },
  {
    id: 's2-daily-exception',
    sprint: 2,
    ceremony: 'daily',
    segment: 'trouble',
    title: '矛盾だらけの例外ルール',
    narrative: '現場の運用には矛盾した例外が山ほどある。「火曜だけ手順が違う」等。',
    choices: [
      {
        id: 'a',
        label: '例外は邪魔なので、一律のルールに潰してしまう',
        effects: { insight: -1, culture: -1 },
        resultText:
          '例外を潰したら現場が回らなくなった。例外は潰すな、分類しろ。矛盾は責めず設計で受け止める。',
        warn: true,
      },
      {
        id: 'b',
        label: '例外を一つずつ分類し、顧客の矛盾は責めず設計で受け止める',
        effects: { insight: 1, culture: 1 },
        resultText:
          '例外は潰すな、分類しろ。矛盾を設計で吸収すると、現場の信頼が増した。',
      },
    ],
  },
  {
    id: 's2-daily-anxiety',
    sprint: 2,
    ceremony: 'daily',
    segment: 'kokyaku',
    title: 'どこか不安そうな顔',
    narrative:
      'リリース直前。情シスは表向き賛成だが、どこか不安そう。現場の一部も様子見だ。',
    choices: [
      {
        id: 'a',
        label: '賛成は得たので、不安は気にせず進める',
        effects: { trust: 1, insight: -1 },
        resultText:
          '誰が怒るかを考えなかった。リリース後、様子見だった人たちから反発が噴き出した。',
        warn: true,
      },
      {
        id: 'b',
        label: '誰が不安で誰が怒りうるかを先回りし、個別に話を通す',
        effects: { insight: 1, culture: 1, trust: 1 },
        resultText:
          '{{ステークホルダー}}の不安を先回り。根回しが効き、リリースは静かに受け入れられた。',
      },
    ],
  },
  {
    id: 's2-daily-return',
    sprint: 2,
    ceremony: 'daily',
    segment: 'genba',
    title: '作り込みの沼',
    narrative: '機能の作り込みに夢中になり、現場が実際に使っているかを見ていない自分に気づく。',
    choices: [
      {
        id: 'a',
        label: 'もっと高機能にすれば使われるはず、と作り込みを続ける',
        effects: { trust: 1, insight: -1, culture: -1 },
        resultText:
          '迷ったときに戻る先を見失った。高機能の沼にはまり、現場の利用から遠ざかる。',
        warn: true,
      },
      {
        id: 'b',
        label: '迷ったら本番利用と最短学習ループに戻る、と現場の利用を確かめる',
        effects: { insight: 1, culture: 1 },
        resultText:
          '迷ったら本番利用に戻れ、最短学習ループに戻れ。立ち返ると、次の一手が明確になった。',
      },
    ],
  },
  {
    id: 's2-daily-hypothesis',
    sprint: 2,
    ceremony: 'daily',
    segment: 'team',
    title: '「検討します」の誘惑',
    narrative: '「この仕様で大丈夫か？」と聞かれ、つい「検討します」「確認します」と言いそうになる。',
    choices: [
      {
        id: 'a',
        label: '「検討します」「確認します」と持ち帰る',
        effects: { insight: -1 },
        resultText:
          '検討と確認で時間が溶ける。検討の前に仮説を、確認の前に観測点を置くべきだった。',
        warn: true,
      },
      {
        id: 'b',
        label: '「検討します」の前に仮説を出し、「確認します」の前に観測点を置く',
        effects: { insight: 1, culture: 1 },
        resultText: '検討の前に仮説、確認の前に観測点。その場が、止まらず前に進んだ。',
      },
    ],
  },
  {
    id: 's2-daily-tolerance',
    sprint: 2,
    ceremony: 'daily',
    segment: 'trouble',
    title: '精度の頭打ち',
    narrative: 'AI予測の精度が92%で頭打ち。チームは「99%まで上げよう」と時間をかけたがる。',
    choices: [
      {
        id: 'a',
        label: '精度99%を目指して、ひたすらモデルを磨き続ける',
        effects: { insight: -1, trust: -1 },
        resultText:
          '精度の数字に溺れた。業務上は95%で十分だったのに、納期だけが溶けた。',
        warn: true,
      },
      {
        id: 'b',
        label: '業務上の許容誤差（誤出荷が許せる範囲）を現場と決め、そこで止める',
        effects: { insight: 1, culture: 1 },
        resultText:
          '精度より、業務上の許容誤差。「どこまでで現場が回るか」が、止め時を教えてくれた。',
      },
    ],
  },
  {
    id: 's2-daily-depth',
    sprint: 2,
    ceremony: 'daily',
    segment: 'chance',
    title: '「専門性なんて要る？」',
    narrative: '「AIが何でもやってくれる時代に、専門性なんて要る？」と若手が漏らした。',
    choices: [
      {
        id: 'a',
        label: 'たしかに、と広く浅く色々なツールを触る方針にする',
        effects: { insight: -1 },
        resultText:
          '浅い万能はAIに飲まれる。器用貧乏が量産され、誰も深い課題を解けなくなった。',
        warn: true,
      },
      {
        id: 'b',
        label: '深く潜れと伝え、自分だけの専門性を現場で鍛える方針にする',
        effects: { insight: 1, culture: 1 },
        resultText:
          '深く潜れ。浅い万能はAIに飲まれる。現場で鍛えた専門性が、AIに代えがたい武器になった。',
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
    narrative: '{{レトロスペクティブ}}。順調に見える今、この振り返りをどう使う？',
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
  {
    id: 's3-daily-ai-agent',
    sprint: 3,
    ceremony: 'daily',
    segment: 'trouble',
    title: 'AIエージェントに権限を渡すか',
    narrative:
      '在庫の補正を{{エージェント}}に自動でやらせれば運用はぐっと楽になる。だが在庫データへの書き込み権限を渡すことになる。',
    choices: [
      {
        id: 'a',
        label: '全権限を与え、丸ごと自動化して一気に楽にする',
        effects: { trust: 1, culture: -1 },
        resultText:
          '楽にはなった。だが暴走時に戻せない。{{エージェント}}より先に、権限の境界を設計すべきだった。',
        warn: true,
      },
      {
        id: 'b',
        label: '権限を最小に絞り、失敗時の{{ロールバック}}を先に用意する',
        effects: { insight: 1, culture: 1, trust: -1 },
        resultText:
          '導入は慎重になった（信頼−）。だが自動化より先に“戻し方”がある安心は、本番運用の土台になる。',
      },
    ],
  },
  {
    id: 's3-daily-ai-partner',
    sprint: 3,
    ceremony: 'daily',
    segment: 'chance',
    title: 'AIに任せきるか',
    narrative: '横展開の設計を、AIにほぼ丸投げすれば、自分は別案件に動ける。',
    choices: [
      {
        id: 'a',
        label: 'AIに丸投げして、自分は次の案件へ',
        effects: { trust: 1, insight: -1 },
        resultText:
          '速い。だが現場差をAIは知らない。「AIを使う」だけでは、また別の沈黙を生む。',
        warn: true,
      },
      {
        id: 'b',
        label: 'AIと協働し、現場知の部分は自分が判断して仕上げる',
        effects: { insight: 1, culture: 1 },
        resultText:
          'AIを“使う”でなく“共に働く”。速度はAI、判断は人。これがFDEのAIとの距離感だ。',
      },
    ],
  },

  {
    id: 's3-daily-sre',
    sprint: 3,
    ceremony: 'daily',
    segment: 'trouble',
    title: '深夜の本番障害',
    narrative:
      '本番の写真入力が深夜に停止。在庫が更新されず、朝の出荷に間に合わない。運用担当はまだ育っていない。',
    choices: [
      {
        id: 'a',
        label: '「自分の担当範囲外」として、朝の出社まで待つ',
        effects: { trust: -2, culture: -1 },
        resultText:
          '朝、出荷が止まり現場は混乱（信頼−−）。FDEはSREでもある。火が出たら、まず消すのが筋だ。',
        warn: true,
      },
      {
        id: 'b',
        label: 'SREとして即対応し、原因を直して再発防止まで入れる',
        effects: { trust: 1, insight: 1 },
        resultText: 'FDEはSREでもあり、最後はエンジニア。自ら火を消し、現場の朝を守った。',
      },
    ],
  },
  {
    id: 's3-daily-sales',
    sprint: 3,
    ceremony: 'daily',
    segment: 'kokyaku',
    title: '「で、いくらで売れる？」',
    narrative:
      '成果を見た経営が「これ、他社にも売れるんじゃないか？ いくらの価値がある？」と聞いてきた。エンジニアの自分には畑違いに感じる。',
    choices: [
      {
        id: 'a',
        label: '「営業の領域なので」と話を技術に戻す',
        effects: { trust: -1 },
        resultText:
          '境界線の上に立てなかった（信頼−）。FDEは営業でもコンサルでもある。価値を語れる人が信頼を得る。',
        warn: true,
      },
      {
        id: 'b',
        label: '誤出荷削減の効果額を試算し、営業・コンサルとして価値を言葉にする',
        effects: { trust: 1, insight: 1 },
        resultText:
          'FDEは営業でもコンサルでもある。成果を“いくらの価値か”で語れたことが、次の案件を呼んだ。',
      },
    ],
  },
  {
    id: 's3-daily-facts',
    sprint: 3,
    ceremony: 'daily',
    segment: 'kokyaku',
    title: '混ざる事実と願望',
    narrative:
      '経営への報告前。「たぶん誤出荷は半減した（はず）」「来期はゼロにできる（といいな）」と、事実と願望が頭の中で混ざっている。',
    choices: [
      {
        id: 'a',
        label: '景気のいい見込みも交えて、力強く報告する',
        effects: { trust: 1, insight: -1 },
        resultText:
          '威勢はいいが、願望を事実のように語った。後で数字がズレた時、信頼が揺らぐ火種になる。',
        warn: true,
      },
      {
        id: 'b',
        label: '事実・推測・願望を分けて報告する（実績／見込み／目標）',
        effects: { insight: 1, culture: 1 },
        resultText:
          '事実と推測と願望を切り分けた報告は、地味だが信頼に足る。経営の意思決定の土台になった。',
      },
    ],
  },

  {
    id: 's3-daily-boundary',
    sprint: 3,
    ceremony: 'daily',
    segment: 'team',
    title: '宙に浮くデータ移行',
    narrative:
      'データ移行が必要だが、「それは情シスの仕事」「いや業者の仕事」と誰も手を付けない。',
    choices: [
      {
        id: 'a',
        label: '自分の担当でもないので、決まるまで待つ',
        effects: { culture: -1, insight: -1 },
        resultText:
          '誰の仕事でもないものは、お前の仕事。境界線の上に立てず、移行は宙に浮いた。',
        warn: true,
      },
      {
        id: 'b',
        label: '境界線の上に立ち、誰も拾わない移行を自分が引き取る',
        effects: { insight: 1, culture: 1, trust: 1 },
        resultText: '境界線の上に立つ。隙間のタスクを拾った人が、案件を前に進める。',
      },
    ],
  },
  {
    id: 's3-daily-lastman',
    sprint: 3,
    ceremony: 'daily',
    segment: 'trouble',
    title: '空いたままの椅子',
    narrative: '本番切り替えの判断。「最終的に誰が責任を持つ？」と全員が顔を見合わせる。',
    choices: [
      {
        id: 'a',
        label: '責任が曖昧なので、誰かが決めるのを待つ',
        effects: { trust: -1, culture: -1 },
        resultText:
          'ラストマンの椅子が空いたまま、切り替えは延期。その場で試す者がいなかった。',
        warn: true,
      },
      {
        id: 'b',
        label: 'ラストマンとして座り、小さく切り替えてその場で試す',
        effects: { trust: 1, insight: 1 },
        resultText:
          'ラストマンとして座り、その場で試す。責任を引き受けた瞬間、場が動き出した。',
      },
    ],
  },
  {
    id: 's3-daily-drive',
    sprint: 3,
    ceremony: 'daily',
    segment: 'kokyaku',
    title: '紛糾する会議',
    narrative: '関係者会議が紛糾。皆が様子を見て、誰も決めようとしない。',
    choices: [
      {
        id: 'a',
        label: '空気を読んで、結論は次回に持ち越す',
        effects: { culture: -1 },
        resultText:
          'その場で動かす者が主導権を握る。動かなかったあなたから、主導権は静かに離れた。',
        warn: true,
      },
      {
        id: 'b',
        label: '最後に責任を取る前提で、その場で決めて動かす',
        effects: { trust: 1, insight: 1, culture: -1 },
        resultText:
          'その場で動かす者が主導権を握る。最後は自分が責任を取る、と決めた人に皆が従った。',
      },
    ],
  },
  {
    id: 's3-daily-dissent',
    sprint: 3,
    ceremony: 'daily',
    segment: 'team',
    title: '「それ、おかしくないですか」',
    narrative:
      'あなたの設計に、若手が「それ、おかしくないですか」と反論し、別の人が次々質問してくる。',
    choices: [
      {
        id: 'a',
        label: '面倒なので「決まったことだから」と議論を打ち切る',
        effects: { culture: -1, insight: -1 },
        resultText:
          '反論と質問を歓迎しなかった。以後、誰も異論を言わなくなり、欠陥が放置された。',
        warn: true,
      },
      {
        id: 'b',
        label: '反論を歓迎し、質問を喜んで、設計を一緒に鍛える',
        effects: { culture: 1, insight: 1 },
        resultText:
          '反論を歓迎しろ、質問されたら喜べ。叩かれた設計は、一人で考えたものより強くなった。',
      },
    ],
  },
  {
    id: 's3-daily-burn',
    sprint: 3,
    ceremony: 'daily',
    segment: 'trouble',
    title: 'ぶっつけ本番',
    narrative: '初めての大規模な本番切り替え。ぶっつけで行くか、手を動かして備えるか。',
    choices: [
      {
        id: 'a',
        label: '本番は初めてだが、その場で考えれば何とかなる',
        effects: { trust: -1, insight: -1 },
        resultText:
          '練習しろ、本番で初めて考えるな。案の定、想定外で炎上した――が、授業料は払った。',
        warn: true,
      },
      {
        id: 'b',
        label: 'リハーサルで練習し、炎上を“授業料つきの実地訓練”として記録する',
        effects: { insight: 1, culture: 1 },
        resultText:
          '練習しろ。小さな炎上は授業料つきの実地訓練。記録した教訓が、次の現場で効く。',
      },
    ],
  },
  {
    id: 's3-daily-craft',
    sprint: 3,
    ceremony: 'daily',
    segment: 'chance',
    title: '次の現場へ',
    narrative: '案件は終わりに近づいた。次に向けて、自分は何を磨くべきか。',
    choices: [
      {
        id: 'a',
        label: '案件が終われば一区切り。特に振り返らず次へ',
        effects: { insight: -1 },
        resultText:
          '自分の道具を磨かなければ、次の現場では通用しない。FDEの旅はここで止まる。',
        warn: true,
      },
      {
        id: 'b',
        label: '自分の道具（専門性・型）を磨き、次の現場へデプロイする準備をする',
        effects: { insight: 1, culture: 1 },
        resultText:
          '自分の道具を磨け。{{FDE}}とは、未来を現場にデプロイする仕事。次の現場が待っている。',
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
    narrative:
      '誤出荷率の推移を、完成した{{インクリメント}}とともに経営に報告する。{{PoC}}止まりにせず本番で回り始めた成果だ。',
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
    narrative:
      'キャンペーン最後の{{レトロスペクティブ}}。チームは口々に言う。「最初に“誤出荷を減らす”を{{KPI}}に選べたのが大きかった。もし“機能数を増やす”を選んでいたら、作った機能は全部やり直しでしたよ」。この案件の学びをどう残す？',
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
