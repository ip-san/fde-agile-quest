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
        sprintGoal: '予測機能の着手（約束を守る）',
        effects: { trust: 1, insight: -1 },
        resultText:
          '“約束を守ってくれる人”として結城さんは安心し、信頼が増した。だが背景を確かめないまま手が動き出す。このゴールの置き方は、後で響くかもしれない。',
        setsFlag: 'chasedPromise',
        warn: true,
      },
      {
        id: 'b',
        label: '「なぜ画面が使われないかを突き止める」をゴールにする',
        sprintGoal: '画面が使われない理由を突き止める',
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
    missedFlag: 'missedHearing',
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
        restraint: true,
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
    deduction: {
      prompt: 'この沈黙の“本当の理由”はどれだ？',
      reveal:
        '機能でも納期でも予算でもない。現場の仕事に画面が合っておらず、誰も信用していない。{{現場主義}}で「なぜ使われないか」を掴むのが先だ。',
      options: [
        {
          id: 'deadline',
          text: 'リリースを急ぎすぎて、現場への告知が足りなかった',
          miss: '告知の問題なら一度は開かれるはず。3ヶ月ゼロは、もっと根が深い。',
        },
        {
          id: 'distrust',
          text: '現場の実務に画面が合っておらず、そもそも信用されていない',
          truth: true,
        },
        {
          id: 'budget',
          text: '予算が足りず、機能が中途半端なまま止まっている',
          miss: '機能の多寡の話ではない。使われない画面は、機能を足しても使われない。',
        },
        {
          id: 'staff',
          text: '人手が足りず、入力する余裕が現場にない',
          miss: '忙しさは理由になりうるが、手書きメモは続いている。問題は“手間”でなく“信用”だ。',
        },
      ],
    },
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
      {
        id: 'c',
        label: '今は問い詰めず、静かに現場とログを観察し続ける',
        effects: { insight: 1 },
        resultText: '結論を急がず観察に徹した。{{経験主義}}——事実を溜めてから動く。沈黙の輪郭が、少しずつ濃くなる。',
        restraint: true,
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
        warn: true,
      },
      {
        id: 'b',
        label: '掴んだ現場の文脈ごと共有し、別途{{リファインメント}}で一緒に並べ替える',
        effects: { culture: 1 },
        resultText:
          '別途{{リファインメント}}の時間を取ったぶん着手は遅れたが、チームが「なぜ」を理解して自走し始めた。（速く見せる信頼+は取り逃す＝機会コスト）',
      },
      {
        id: 'c',
        label: 'あえて答えを出さず「どう思う？」と問い返し、チームが考えるのを待つ',
        effects: { culture: 1, trust: -1 },
        resultText:
          'すぐ答えを与えない沈黙が、チームの{{自己組織化}}を促した。だが結城さんには“決めない人”に映り、信頼は少し揺れた。',
        restraint: true,
      },
    ],
  },
  {
    id: 's1-daily-scope',
    sprint: 1,
    ceremony: 'daily',
    segment: 'kokyaku',
    title: '増えていく要望',
    narrative: '結城さんが「ついでにこの帳票も」と次々に要望を足してくる。{{バックログ}}が膨らみ始めた。',
    choices: [
      {
        id: 'a',
        label: '断ると角が立つので、全部引き受ける',
        effects: { trust: 1, culture: -1, insight: -1 },
        resultText: '“何でも応えてくれる”と結城さんは満悦（信頼+）。だが的が散り、チームは振り回されて疲れる。',
        warn: true,
      },
      {
        id: 'b',
        label: '今の{{スプリント}}ゴールに照らし、一緒に「今はやらない」を決める',
        effects: { insight: 1, culture: 1 },
        resultText: 'ゴールを示して線引きすると、結城さんも「確かに」と一旦納得（信頼は据え置き）。的が絞れた。',
      },
    ],
  },
  {
    id: 's1-daily-soumu-access',
    sprint: 1,
    ceremony: 'daily',
    segment: 'kokyaku',
    location: 'soumu',
    hints: {
      po: '現場に入れないと何も始まらない。総務部で、立ち入りの壁が外せるか確かめてきて。',
      sm: '手続きで初動が止まりそう。総務部で何が要るのか確かめてきて。',
      dev: '入館証や立ち入り範囲は総務部の管轄です。まず総務部で話を。',
    },
    title: '総務という関所',
    narrative:
      '常駐初日。倉庫の奥に入るには総務部の承認が要ると言われた。総務部の守屋さんは「規程ですので」と杓子定規だ。ここを敵に回すと、この先ずっとやりにくい。{{ガバナンス}}は、越えるべき壁か、それとも——。',
    choices: [
      {
        id: 'a',
        label: '最低限の手続きだけ済ませ、とにかく早く現場へ入る',
        effects: { trust: 1, insight: -1 },
        resultText:
          '早く現場に立てた（動きが見えて信頼+）。だが総務の担当の表情は固いまま。社内の事情や力学を聞きそびれた。',
        warn: true,
      },
      {
        id: 'b',
        label: '総務の担当に目的を説明し、規程の範囲で協力を取りつける',
        effects: { insight: 1, culture: 1 },
        resultText:
          '「そういうことなら」と担当が動いてくれた。{{ガバナンス}}は敵でなく入場券。社内に一人、味方ができた。（すぐ動く“見える進捗”の信頼+は取り逃す）',
      },
    ],
  },
  {
    id: 's1-daily-jinji-roster',
    sprint: 1,
    ceremony: 'daily',
    segment: 'kokyaku',
    location: 'jinji',
    hints: {
      po: '人手不足の正体を知りたい。人事部で勤怠と配置のデータを見てきて。',
      sm: '負荷の偏りがボトルネックかも。人事部で残業の集中を確かめて。',
      dev: '誰にどれだけ仕事が乗ってるか、人事部の勤怠データで分かります。確かめてください。',
    },
    title: '偏る残業',
    narrative:
      '人事部の新田さんが、勤怠データをそっと見せてくれた。すると、ある一人——橋本さんに、残業が異常に偏っていた。人が足りないのではない。仕事が一人に集まっているのだ。{{制約理論}}でいう詰まりの一点が、数字にも出ていた。',
    deduction: {
      prompt: '「人が足りない」の裏にある“本当の詰まり”はどれだ？',
      reveal:
        '人手不足ではない。仕事が橋本さん一人に集中している——属人化という{{制約理論}}の詰まりだ。増員より先に、一極集中を解く。',
      options: [
        {
          id: 'headcount',
          text: '単純に人手が足りず、増員すれば解決する',
          miss: '増員しても仕事の集まり方が同じなら、また誰かに偏る。問題は人数でなく流れ方。',
        },
        {
          id: 'bottleneck',
          text: '仕事が橋本さん一人に集中している（属人化＝ボトルネック）',
          truth: true,
        },
        {
          id: 'person',
          text: '橋本さんの仕事が遅く、本人の問題だ',
          miss: '個人を責めても詰まりは動かない。偏りは仕組みが生む。',
        },
        {
          id: 'busy',
          text: '繁忙期で、たまたま残業が増えただけ',
          miss: '一時の波なら全員に散る。一人だけ突出しているのは構造のサインだ。',
        },
      ],
    },
    choices: [
      {
        id: 'a',
        label: '人事の数字は人事の領分。深入りせず、現場の改善に集中する',
        effects: { insight: -1 },
        resultText: '横断のサインを一つ見送った。部署の壁の内側だけを見ていては、詰まりの全体像は掴めない。',
        warn: true,
      },
      {
        id: 'b',
        label: '偏りの事実を持ち帰り、“属人化＝ボトルネック”の仮説に繋げる',
        effects: { insight: 2 },
        resultText:
          '勤怠という人事の数字が、現場の構造を照らした。橋本さんへの一極集中——{{制約理論}}の詰まりに、名前がついた。',
      },
    ],
  },
  {
    id: 's1-daily-ally',
    sprint: 1,
    ceremony: 'daily',
    segment: 'chance',
    missedFlag: 'missedHearing',
    title: '思わぬ味方',
    narrative: '現場のパートさんが「私、前から不便だと思ってたんです」と声をかけてきた。改善のヒントの宝庫だ。',
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
    narrative: '定型の集計レポート作成を{{エージェント}}に任せたら、毎日1時間が浮いた。この時間をどう使う？',
    choices: [
      {
        id: 'a',
        label: '浮いた時間で、別の機能を作り込む',
        effects: { trust: 1, insight: -1 },
        resultText:
          '機能が増え、結城さんは進捗が見えて一旦満足（信頼+）。だがAIが生んだ余白を、また机上の開発に使ってしまった。',
        warn: true,
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
        repo: { debt: 1 },
        resultText: '{{プロンプト}}は呪文ではない。前提知識が無いまま言い回しをいじっても、的は外れたまま。',
        warn: true,
      },
      {
        id: 'b',
        label: '現場の用語と業務ルールを整理し、知識としてAIに渡す',
        effects: { insight: 1, culture: 1 },
        repo: { coverage: 10 },
        resultText: '{{RAG}}の前に、まず知識を整理する。AIの出力が一気に現場に噛み合い始めた。',
      },
    ],
  },

  {
    id: 's1-daily-jousys-gate',
    sprint: 1,
    ceremony: 'daily',
    segment: 'kokyaku',
    location: 'serverroom',
    title: '開かない城門',
    narrative:
      '現場改善の小さなツールを一つ入れたい。だが電算室は情シスの城だ。結城係長は「セキュリティ上、許可できません」「前例がありません」と、にべもない。古い情シスの“守り”——変えないことが、いつしか彼の仕事になっている。',
    choices: [
      {
        id: 'a',
        label: '情シスを通さず、現場にこっそり入れて回す',
        effects: { culture: 1, trust: -1 },
        resultText:
          '現場はすぐ楽になった（巻き込み+）。だが後で発覚し、結城さんは「話が違う」と態度を硬化させた（顔を潰して信頼−）。野良ツールは、いつか必ず刺さる。',
        warn: true,
      },
      {
        id: 'b',
        label: '「壊したくない」という結城さんの不安に向き合い、最小構成＋戻し方を添えて一緒に通す',
        effects: { insight: 1, culture: 1 },
        resultText:
          '{{ガバナンス}}は敵でなく入場券。リスクを下げた提案に、結城さんも「それなら」と城門を半分開けた。（即提供の信頼+は取り逃す）',
      },
    ],
  },
  {
    id: 's1-daily-legacy',
    sprint: 1,
    ceremony: 'daily',
    segment: 'trouble',
    missedFlag: 'missedUpgrade',
    title: '笑えない古いシステム',
    narrative:
      'カルゴ物流の基幹は20年前の{{レガシー}}。承認フローには今も紙が混じる。エンジニア仲間は「こんな古いの捨てて作り直せばいい」と笑う。',
    choices: [
      {
        id: 'a',
        label: 'レガシーを切り捨て、最新構成で作り直す前提で動く',
        effects: { insight: -1, trust: -1 },
        repo: { debt: 1 },
        resultText:
          '「現場が回ってる仕組みを軽んじるな」と顧客の顔が曇る（信頼−）。{{レガシー}}には20年分の業務知識が埋まっている。',
        warn: true,
      },
      {
        id: 'b',
        label: 'レガシーと承認フローを“前提”として受け入れ、設計条件にする',
        effects: { insight: 1, culture: 1 },
        repo: { coverage: 10 },
        resultText: '{{ガバナンス}}は敵でなく入場券。古い仕組みを笑わず読み解くと、本当の制約と業務の理由が見えた。',
      },
    ],
  },
  {
    id: 's1-daily-diagram',
    sprint: 1,
    ceremony: 'daily',
    segment: 'genba',
    title: '頭の中の在庫フロー',
    narrative: '入庫・出庫・返品が絡む在庫の流れは{{複雑系}}で、口頭で説明すると毎回こんがらがる。',
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
        seedId: 'exception-flow',
      },
    ],
  },

  {
    id: 's1-daily-translate',
    sprint: 1,
    ceremony: 'daily',
    segment: 'genba',
    title: '「見える化したい」',
    narrative: '結城さんは「在庫を見える化したい」と言う。だが“見える化”が現場で何を意味するかは、人によって違う。',
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
          '顧客の言葉を業務に翻訳し、細かく潜る。「本当は“出荷ミスに気づける”ことだ」と{{成果の定義}}が定まった。ただし細かく潜るぶんチームの開発は止まった（巻き込み−）。',
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
      '現場は在庫をマクロだらけの巨大なExcelで管理していた。立派な{{レガシー}}だ。複雑だが、ちゃんと回ってはいる。',
    choices: [
      {
        id: 'a',
        label: '「Excel管理なんて」と一蹴し、無視して新システムを作る',
        effects: { insight: -1 },
        resultText: 'Excelを軽んじた。だがあのマクロには、例外処理に滲む業務の本質が詰まっていた。',
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
    narrative: 'アイデアはある。だが「ちゃんとしたものを見せないと恥ずかしい」と、手が止まっている。',
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
        label: '最初の解は雑でいい。動く粗い{{MVP}}を今日、現場に当てる',
        effects: { insight: 1, culture: 1, trust: -1 },
        resultText: '粗さに結城さんは少し不安顔（信頼−）。だが本番に当てて初めて、仮説が学びに変わる。',
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
        resultText: 'できませんの前に{{MVP}}、難しいの前に分解。無理筋が、やれる形に変わった。',
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
        resultText:
          '独学を止めるな、量をこなせ。手を動かしたぶんだけ、チームへの{{オンボーディング}}で教えられることが増えた。',
      },
    ],
  },
  {
    id: 's1-daily-feedback',
    sprint: 1,
    ceremony: 'daily',
    segment: 'kokyaku',
    title: '厳しいダメ出し',
    narrative: '{{レビュー}}で現場から厳しいダメ出し。「これ、全然使えない」と。',
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
        resultText: 'わからないことは即メモ。フィードバックは痛いが資産。次の一手が具体的になった。',
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
          'それらしい画面に結城さんは安心（見栄えで信頼+）。だが{{レビュー}}は“動く成果物を検査する場”。モックでの取り繕いは趣旨に反し、誤解だけが温存された。',
      },
      {
        id: 'b',
        label: '「画面が使われていない事実」と現場の声を率直に見せる',
        effects: { insight: 1, culture: 1, trust: -1 },
        resultText: '「自分たちの失敗を見せられた」と空気は重く、信頼は一旦下がった。だが全員が同じ事実に立てた。',
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
    narrative: 'スプリント末。{{レトロスペクティブ}}は毎スプリント必ず開く場だ。今回はどう使う？',
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
        resultText: 'チームが自分でプロセスを直し始めた。（見せ場づくりの信頼+は取り逃す＝機会コスト）',
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
        resultText: '数字は合った。だが原因は闇のまま、来月もまた同じ棚がズレる。「答えは資料の外」を素通りした。',
        warn: true,
      },
      {
        id: 'b',
        label: '田淵さんの言う“いつもズレる棚”に張り付いて原因を観察する',
        effects: { insight: 1 },
        resultText: '入庫の置き場と棚番の振り方が、現場の運用とズレていた。差異の正体は、現場の動きの中にあった。',
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
        resultText: '経営への見栄えは保たれた（進捗が見えて信頼+）。だが本当の障害は、水面下に沈んだままだ。',
        warn: true,
      },
      {
        id: 'b',
        label: '「今日いちばんの詰まりは何か」を問う場に変え、{{自己組織化}}を促す',
        effects: { insight: 1, culture: 1 },
        resultText: 'ぽつりと「実は…」が出始めた。報告から、助け合いの場へ。（見栄えの信頼+は取り逃す）',
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
        resultText: '「ただの画面追加」は、引当ルールの沼だった。読み違えたぶん、手戻りが出た。',
        warn: true,
      },
      {
        id: 'b',
        label: '複雑系と見て、まず一部署で小さく試し、反応で学ぶ',
        effects: { insight: 1 },
        resultText: '小さく出したら、想定外の例外がすぐ見つかった。{{複雑系}}は、計画よりも実験で解く。',
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
      '夕方、出荷直前に{{WMS}}が固まった。橋本さんは外出中。現場がざわつく。自分が飛び込めば、たぶん今日は間に合う。',
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
        resultText: '正論で田淵さんは口を閉じた。沈黙の奥にあった本当の要件を、自分の手で閉じてしまった。',
        warn: true,
      },
      {
        id: 'b',
        label: '二度手間の正体——{{WMS}}と手書きの二重入力を、田淵さんと再現してみる',
        effects: { insight: 1 },
        resultText: 'システムが、現場の最後の一歩に届いていなかった。沈黙は、まだ見つかっていない要件だった。',
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
      '{{フィジカルAI}}による自動化の鍵は、田淵さんや山田さんの“勘”だ。だが、コツを聞くと決まって同じ言葉が返る。「これは見て覚えるもんだ」「言葉になんかできんよ」。——彼らは、自動化が自分の仕事を奪うと気づいている。だから、ノウハウを隠している。',
    choices: [
      {
        id: 'a',
        label: '隠すなら仕方ない、と外から見える範囲だけで自動化を設計する',
        effects: { insight: -1 },
        resultText: '表面だけで作った仕組みは、肝心の例外で必ず破れる。隠された“勘”こそが、この案件の本丸だったのに。',
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

  // ── 買収の皮肉アーク（親会社ジェネリック電機の登場・起点）──
  // 「フィジカルAI実証の場」として買われたのに現場はアナログ、という落差。
  // どちらを選んでも showcasePressure が立ち、視察(s2)→報告(s3)の連鎖が確実に続く。
  {
    id: 's1-daily-showcase-order',
    sprint: 1,
    ceremony: 'daily',
    segment: 'kokyaku',
    location: 'client',
    hints: {
      po: 'グループから視察の話が来てる。会議室で結城さんと方針を握ってきて。',
      sm: '上の期待と現場の実力に開きがある。会議室で擦り合わせを。',
      dev: '“AI実証”の中身、現状とかけ離れてる気がします。会議室で現実を確かめて。',
    },
    title: '親会社からの「実証デモ」要求',
    narrative:
      'グループ総本山ジェネリック電機の経営企画から通達が届いた。「来月、{{フィジカルAI}}実証の視察に伺う。成果のデモを用意されたい」。だが現場は基本のIT化すらまだ——ロボットもAIも、夢のまた夢だ。「StockPilot」すら使われていないのに。結城さんは青ざめる。「“実証の場”として買われた手前、何も無いとは言えない…」。',
    choices: [
      {
        id: 'a',
        label: 'とりあえず“AIらしい”画面を急ごしらえして、体裁だけ整える',
        effects: { trust: 1, insight: -1 },
        resultText:
          '結城さんは一旦ほっとした（信頼+）。だが現場の実態から目を背け、見栄えのデモを取り繕う道に足を踏み入れた。夢と現実の溝は、埋まらないまま化粧される。',
        warn: true,
        setsFlag: 'showcasePressure',
      },
      {
        id: 'b',
        label: '「実証の前に、まず基本のIT化と自動化が要る」と現実を正直に上げる',
        effects: { insight: 1, culture: 1 },
        resultText:
          '見栄えのデモで上を一時的に安心させる信頼+は取り逃した。だが結城さんと「本物の一歩」を約束した。{{フィジカルAI}}は、地に足のついたIT化の、その先にしかない。',
        setsFlag: 'showcasePressure',
      },
    ],
  },
]
