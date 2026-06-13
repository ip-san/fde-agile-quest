// 第1章 Sprint 2 のイベント定義。chapter-01.ts（バレル）が結合する。
// 設計原則・キャラ陣は ./cast.ts と chapter-01.ts 冒頭コメントを参照。
import type { GameEvent } from '../../../types'

export const SPRINT2_EVENTS: GameEvent[] = [

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
          '締切を守り情シスは安堵（信頼+）。動くものが早く現場に当たり、学習も速まった（{{フィードバックループ}}が短いほど学びは速い）。ただし借りた{{技術的負債}}のしわ寄せは当面チームが背負う（巻き込み−）。早めに返す前提で。',
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
          'まず動かして見せたので情シスは進捗に安心（信頼+）。だが“何をもって正しいか”が無い。評価なき生成は、ただの祈りだ。',
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
          'AIは速度をくれるが、責任はくれない。原因をAIに帰したことで現場は「直す気がない」と受け取り、信頼が削れた（責任回避で信頼−）。AIが書いたコードも、本番に出した以上はお前のコードだ。',
        warn: true,
      },
      {
        id: 'b',
        label: '自分の責任とし、AI生成コードのレビュー体制を敷く',
        effects: { insight: 1, culture: 1 },
        resultText:
          'レビューを挟むぶん一時的に速度は落ちた（速く出す信頼+は取り逃す＝機会コスト）。だが「AIが書いてもレビューは人」がチームの作法になった。',
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
          'まず動かして見せたので情シスは進捗に安心（信頼+）。だがセキュリティは後付けするほど高くつく。終盤で構成のやり直しが待っている。',
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
        effects: { insight: -1 },
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
        effects: { insight: -1 },
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
          '例外は潰すな、分類しろ。矛盾を設計で吸収すると、現場が回り続け、当事者意識が増した。',
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
          '賛成は得たので情シスは一旦安心（信頼+）。だが誰が怒るかを考えず、リリース後、様子見だった人たちから反発が噴き出した。',
        warn: true,
      },
      {
        id: 'b',
        label: '誰が不安で誰が怒りうるかを先回りし、個別に話を通す',
        effects: { insight: 1, culture: 1 },
        resultText:
          '{{ステークホルダー}}の不安を先回り。根回しが効き、リリースは静かに受け入れられた。（押し切れば得られた“その場の信頼+”は取り逃す）',
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
          '機能は増え、情シスは“動いている”と一旦満足（進捗が見えて信頼+）。だが迷ったときに戻る先を見失い、高機能の沼にはまって現場の利用から遠ざかる。',
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
          '精度の数字に溺れた。業務上は90%で十分だったのに、納期だけが溶け、情シスは「まだ出ないのか」と渋い顔（納期遅れで信頼−）。',
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
]
