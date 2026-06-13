// 第1章 Sprint 1 のイベント定義。chapter-01.ts（バレル）が結合する。
// 設計原則・キャラ陣は ./cast.ts と chapter-01.ts 冒頭コメントを参照。
import type { GameEvent } from '../../../types'

export const SPRINT1_EVENTS: GameEvent[] = [
  // ═══ Sprint 1「現場を知る」═══════════════════════════
  // ── プランニング ──
  {
    id: 's1-plan-goal',
    sprint: 1,
    ceremony: 'planning',
    segment: 'kokyaku',
    title: 'はじめてのスプリント計画',
    narrative:
      'あなたは{{FDE}}として、物流会社カルゴ物流の現場に降り立った。情シスの結城係長は「予測機能を経営に約束した」と急かす。この{{スプリント}}のゴールを何に置く？',
    choices: [
      {
        id: 'a',
        label: '約束通り「予測機能の着手」をゴールにする',
        effects: { trust: 1, insight: -1 },
        resultText:
          '“約束を守ってくれる人”として結城さんは安心し、信頼が増した。だが背景を確かめないまま手が動き出す。',
      },
      {
        id: 'b',
        label: '「なぜ画面が使われないかを突き止める」をゴールにする',
        effects: { insight: 1, culture: 1, trust: -1 },
        resultText:
          '「予測機能は後回しか…」と結城さんは不安げ。約束した手前、信頼は少し揺らいだ。だが正しい問いを立てた。',
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
      '倉庫に入ると、20年勤めるベテランの田淵さんが手書きのメモで在庫を数えていた。「システム？ あの画面な。使ってないよ」。',
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
        label: '田淵さんに30分だけヒアリングする',
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
        label: '結城さんに「なぜ使われていないのか」を率直に問う',
        effects: { insight: 2, trust: -1 },
        resultText:
          '「うちのやり方を否定するのか」と結城さんはむっとした（耳の痛い指摘で信頼−）。だが沈黙の理由が言葉になった。',
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
      '{{デイリースクラム}}でその日の作業に迷いが出た。若手が「で、結局何を作ればいいんすか？」と{{バックログ}}の優先順位を求めてくる。',
    choices: [
      {
        id: 'a',
        label: '自分で全部決め、指示書を渡してすぐ着手させる',
        effects: { trust: 1, culture: -1 },
        resultText:
          '着手が速く、結城さんは「お、動き出した」と安心（進捗が見えて信頼+）。だがチームは指示待ちになった。',
      },
      {
        id: 'b',
        label: '掴んだ現場の文脈ごと共有し、別途{{リファインメント}}で一緒に並べ替える',
        effects: { culture: 1 },
        resultText:
          '別途リファインメントの時間を取ったぶん着手は遅れたが、チームが「なぜ」を理解して自走し始めた。（速く見せる信頼+は取り逃す＝機会コスト）',
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
      '結城さんが「ついでにこの帳票も」と次々に要望を足してくる。{{バックログ}}が膨らみ始めた。',
    choices: [
      {
        id: 'a',
        label: '断ると角が立つので、全部引き受ける',
        effects: { trust: 1, culture: -1, insight: -1 },
        resultText:
          '“何でも応えてくれる”と結城さんは満悦（信頼+）。だが的が散り、チームは振り回されて疲れる。',
        warn: true,
      },
      {
        id: 'b',
        label: '今の{{スプリント}}ゴールに照らし、一緒に「今はやらない」を決める',
        effects: { insight: 1, culture: 1 },
        resultText:
          'ゴールを示して線引きすると、結城さんも「確かに」と一旦納得（信頼は据え置き）。的が絞れた。',
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
        resultText: '機能が増え、結城さんは進捗が見えて一旦満足（信頼+）。だがAIが生んだ余白を、また机上の開発に使ってしまった。',
      },
      {
        id: 'b',
        label: '浮いた時間で、もう一度倉庫の現場に立つ',
        effects: { insight: 2, culture: -1 },
        resultText:
          'AIで雑務を消したぶん、現場を見る時間が増えた。これがAIと働く本来の使い方だ。ただし丸一日チームから離れ、開発は止まった（巻き込み−）。',
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
      '結城さんは「在庫を見える化したい」と言う。だが“見える化”が現場で何を意味するかは、人によって違う。',
    choices: [
      {
        id: 'a',
        label: '言葉のまま「在庫一覧画面」を作る',
        effects: { insight: -1 },
        resultText: '顧客の言葉を業務に翻訳しなかった。できた画面は、誰の「見える化」でもなかった。',
        warn: true,
      },
      {
        id: 'b',
        label: '「見える化」が現場で何を指すか、動作レベルまで細かく翻訳する',
        effects: { insight: 2, culture: -1 },
        resultText:
          '顧客の言葉を業務に翻訳し、細かく潜る。「本当は“出荷ミスに気づける”ことだ」と分かった。ただし細かく潜るぶんチームの開発は止まった（巻き込み−）。',
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
          '現場のExcelは未来のプロダクト仕様。例外処理にこそ、業務の本質が出ていた。ただし読み解きに時間を割いたぶん開発は止まった（巻き込み−）。',
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
          '“きちんとしたものを出してくれる”と結城さんは安心（完成度が見えて信頼+）。だが本番に出ないコードは、ただの仮説のまま。学びは得られない。',
        warn: true,
      },
      {
        id: 'b',
        label: '最初の解は雑でいい。動く粗いものを今日、現場に当てる',
        effects: { insight: 1, culture: 1, trust: -1 },
        resultText:
          '粗さに結城さんは少し不安顔（信頼−）。だが本番に当てて初めて、仮説が学びに変わる。',
      },
    ],
  },
  {
    id: 's1-daily-cando',
    sprint: 1,
    ceremony: 'daily',
    segment: 'team',
    title: '「それは無理です」',
    narrative: '結城さんが無理筋の要求。チームは「それは無理です」と即答しかけた。',
    choices: [
      {
        id: 'a',
        label: '「それはできません」とはっきり断る',
        effects: { trust: -1, insight: -1 },
        resultText:
          '代案を出さず即「できません」と断り、結城さんは突き放された顔（押し返して信頼−）。だが「できません」の前に最小版を、「難しい」の前に分解を試したか？',
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
        resultText: '独学を止めるな、量をこなせ。手を動かしたぶんだけ、教えられることが増えた。',
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
        effects: { insight: -1 },
        resultText:
          'フィードバックを痛がって閉じた。痛い指摘ほど、見落としていた資産だったのに。（指摘を拒んで現場理解が後退）',
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
          'それらしい画面に結城さんは安心（見栄えで信頼+）。だがレビューは“動く成果物を検査する場”。モックでの取り繕いは趣旨に反し、誤解だけが温存された。',
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
          '手が動いたぶんだけ結城さんへの見せ場は増えた（信頼+）。だが振り返りは形骸化し、やり方は変わらない。',
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
  {
    id: 's1-daily-bottleneck',
    sprint: 1,
    ceremony: 'daily',
    segment: 'trouble',
    title: '何でも屋の橋本さん',
    narrative:
      'WMSの不具合も、棚番の変更も、配車の調整も——気づけば全部「橋本さんに聞いて」で回っている。{{制約理論}}でいう詰まりの一点が、彼一人に集中していた。今日も彼の前に小さな行列ができている。',
    choices: [
      {
        id: 'a',
        label: '今日を回すため、橋本さんにまとめて捌いてもらう',
        effects: { trust: 1, culture: -1 },
        resultText:
          '出荷は今日も無事に出た（進捗が見えて信頼+）。だが橋本さん頼みの構造はより固まり、彼が倒れたら全部止まる。',
        warn: true,
      },
      {
        id: 'b',
        label: '橋本さんの頭の中の手順を聞き取り、ホワイトボードに見える化する',
        effects: { insight: 1, culture: 1 },
        resultText:
          '「これ、俺しか知らんかったのか」。詰まりの一点が言葉になり、他の人も手を出せる糸口が見えた。（今日の“早さ”が持つ信頼+は取り逃す）',
      },
    ],
  },
  {
    id: 's1-daily-tanaoroshi',
    sprint: 1,
    ceremony: 'daily',
    segment: 'genba',
    title: '毎月ズレる棚',
    narrative:
      '月次の{{棚卸}}で、また帳簿在庫と実在庫がズレた。経理は「数字だけ合わせて」と急かす。だが田淵さんは「毎月この棚だけズレるんだよな」とつぶやいた。',
    choices: [
      {
        id: 'a',
        label: '帳簿を実数に上書きし、辻褄を合わせて先へ進む',
        effects: { insight: -1 },
        resultText:
          '数字は合った。だが原因は闇のまま、来月もまた同じ棚がズレる。「答えは資料の外」を素通りした。',
        warn: true,
      },
      {
        id: 'b',
        label: '田淵さんの言う“いつもズレる棚”に張り付いて原因を観察する',
        effects: { insight: 1 },
        resultText:
          '入庫の置き場と棚番の振り方が、現場の運用とズレていた。差異の正体は、現場の動きの中にあった。',
      },
    ],
  },
  {
    id: 's1-daily-standup-zombie',
    sprint: 1,
    ceremony: 'daily',
    segment: 'team',
    title: '報告会になったデイリー',
    narrative:
      '{{デイリースクラム}}が、いつのまにか「昨日やったこと・今日やること」の報告会になっていた。誰も困りごとを出さず、{{タイムボックス}}だけが過ぎていく。上に見せる進捗表は、綺麗だ。',
    choices: [
      {
        id: 'a',
        label: '波風を立てず、報告会のまま上向きの進捗を整える',
        effects: { trust: 1, culture: -1 },
        resultText:
          '経営への見栄えは保たれた（進捗が見えて信頼+）。だが本当の障害は、水面下に沈んだままだ。',
        warn: true,
      },
      {
        id: 'b',
        label: '「今日いちばんの詰まりは何か」を問う場に変え、{{自己組織化}}を促す',
        effects: { insight: 1, culture: 1 },
        resultText:
          'ぽつりと「実は…」が出始めた。報告から、助け合いの場へ。（見栄えの信頼+は取り逃す）',
      },
    ],
  },
  {
    id: 's1-daily-cynefin',
    sprint: 1,
    ceremony: 'daily',
    segment: 'chance',
    title: '「ただの画面追加でしょ？」',
    narrative:
      '結城さんは「この改修、ただの画面追加でしょ？」と軽く言う。だが触ってみると、在庫引当のロジックが部署ごとに違う。{{複雑系}}の匂いがした。簡単と決めて突っ込むか。',
    choices: [
      {
        id: 'a',
        label: 'Simpleな改修と決めて、見積もり通り一気に作り込む',
        effects: { insight: -1 },
        resultText:
          '「ただの画面追加」は、引当ルールの沼だった。読み違えたぶん、手戻りが出た。',
        warn: true,
      },
      {
        id: 'b',
        label: '複雑系と見て、まず一部署で小さく試し、反応で学ぶ',
        effects: { insight: 1 },
        resultText:
          '小さく出したら、想定外の例外がすぐ見つかった。{{複雑系}}は、計画よりも実験で解く。',
      },
    ],
  },
  {
    id: 's1-daily-5s',
    sprint: 1,
    ceremony: 'daily',
    segment: 'genba',
    title: '交差する動線',
    narrative:
      '{{誤出荷率}}が下がらない。結城さんは「入力チェックを足そう」と言う。だが倉庫を歩くと、よく出る品が遠い棚にあり、{{動線}}が交差して取り違えが起きていた。',
    choices: [
      {
        id: 'a',
        label: 'システム側の入力チェックだけ足して、画面で防ぐ',
        effects: { trust: 1, insight: -1 },
        resultText:
          '結城さんは「対応してくれた」と一旦安心（信頼+）。だが取り違えの現物は、現場で起き続ける。原因は{{5S}}と棚配置にあった。',
        warn: true,
      },
      {
        id: 'b',
        label: '現場と一緒に{{5S}}と棚番・{{動線}}を見直す',
        effects: { insight: 1, culture: 1 },
        resultText:
          'よく出る品を手前へ、交差をほどく。誤りの芽を、現場の手で摘み始めた。（画面で“やってる感”を出す信頼+は取り逃す）',
      },
    ],
  },
  {
    id: 's1-daily-estimate',
    sprint: 1,
    ceremony: 'daily',
    segment: 'team',
    title: '「もう2つ、足せませんか」',
    narrative:
      '結城さんが「次のスプリント、もう2つ機能を足せませんか。経営に見せたいんです」と詰めてくる。チームの{{ベロシティ}}の実績からすると、明らかに積みすぎだ。',
    choices: [
      {
        id: 'a',
        label: '結城さんの顔を立て、できると約束して多めに積む',
        effects: { trust: 1, culture: -1 },
        resultText:
          '「やってくれる」と結城さんは喜んだ（期待に応えて信頼+）。だが無理な約束がチームを締め上げ、品質が軋み始める。',
        warn: true,
      },
      {
        id: 'b',
        label: '{{ベロシティ}}の実績を見せ、入る量を正直に伝えて代案を出す',
        effects: { culture: 1 },
        resultText:
          '「それなら優先順位を決めましょう」。{{経験主義}}で、守れる約束に絞った。（顔を立てる信頼+は取り逃す）',
      },
    ],
  },
  {
    id: 's1-daily-incident',
    sprint: 1,
    ceremony: 'daily',
    segment: 'trouble',
    title: '出荷直前のフリーズ',
    narrative:
      '夕方、出荷直前にWMSが固まった。橋本さんは外出中。現場がざわつく。自分が飛び込めば、たぶん今日は間に合う。',
    choices: [
      {
        id: 'a',
        label: '自分が全部巻き取って、とにかく今日の出荷を通す',
        effects: { trust: 1, culture: -1 },
        resultText:
          '出荷は間に合った（その場の信頼+）。だが復旧手順は自分の頭の中だけ。属人化の主が、橋本さんから自分に移っただけだった。',
        warn: true,
      },
      {
        id: 'b',
        label: '復旧しながら手順と原因を記録に残し、結城さんと共有する',
        effects: { insight: 1, culture: 1 },
        resultText:
          '焦って抱え込まず、手順と原因を残しながら直し切った。次に誰かが直せる形になり、障害が学びに変わる。（自分だけで即復旧する“その場の信頼+”は取り逃す）',
      },
    ],
  },
  {
    id: 's1-daily-silentui',
    sprint: 1,
    ceremony: 'daily',
    segment: 'chance',
    title: '「どうせ紙に書き写すんだ」',
    narrative:
      '田淵さんがぽつり。「あの在庫画面な、入れてもどうせ紙に書き写すんだ。二度手間だろ」。「StockPilot」が使われない理由の、芯に触れた気がした。',
    choices: [
      {
        id: 'a',
        label: '「仕様通りなので、運用でカバーしてください」と返す',
        effects: { insight: -1 },
        resultText:
          '正論で田淵さんは口を閉じた。沈黙の奥にあった本当の要件を、自分の手で閉じてしまった。',
        warn: true,
      },
      {
        id: 'b',
        label: '二度手間の正体——WMSと手書きの二重入力を、田淵さんと再現してみる',
        effects: { insight: 1 },
        resultText:
          'システムが、現場の最後の一歩に届いていなかった。沈黙は、まだ見つかっていない要件だった。',
      },
    ],
  },
  {
    id: 's1-daily-hideknowhow',
    sprint: 1,
    ceremony: 'daily',
    segment: 'genba',
    title: '「これは、見て覚えるもん」',
    narrative:
      '自動化の鍵は、田淵さんや山田さんの“勘”だ。だが、コツを聞くと決まって同じ言葉が返る。「これは見て覚えるもんだ」「言葉になんかできんよ」。——彼らは、自動化が自分の仕事を奪うと気づいている。だから、ノウハウを隠している。',
    choices: [
      {
        id: 'a',
        label: '隠すなら仕方ない、と外から見える範囲だけで自動化を設計する',
        effects: { insight: -1 },
        resultText:
          '表面だけで作った仕組みは、肝心の例外で必ず破れる。隠された“勘”こそが、この案件の本丸だったのに。',
        warn: true,
      },
      {
        id: 'b',
        label: 'なぜ隠すのか——「仕事を奪われる」という恐れの方を、まず正面から受け止める',
        effects: { insight: 1, culture: 1 },
        resultText:
          '「自動化したら、俺らは用済みだろ」。本音が出た。隠されたノウハウの前に、隠したくなる理由がある。そこに、この物語の主軸があった。',
      },
    ],
  },
]
