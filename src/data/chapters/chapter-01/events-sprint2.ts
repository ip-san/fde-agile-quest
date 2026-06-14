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
        label: '結城さんの約束に沿って「画面の機能数を増やす」をKPIにする',
        effects: { trust: 1 },
        resultText:
          '約束通りで結城さんは満足（信頼+）。だが機能を足しても誰も使わなければ意味がない…危うい仮説だ。',
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
          '完成度の高さに結城さんは強く満足（信頼++）。だが「完璧を待つほど学習が遅れる」。現場の反応はまだ得られない。',
        warn: true,
      },
      {
        id: 'b',
        label: '写真入力の叩き台を今スプリントで出す',
        effects: { insight: 1, culture: 1, trust: -1 },
        resultText:
          '「これで大丈夫…？」と結城さんは粗さに不安顔（未完成を見せて信頼−）。だが現場が触り、{{フィードバックループ}}が回り出す。',
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
          '締切を守り結城さんは安堵（信頼+）。動くものが早く現場に当たり、学習も速まった（{{フィードバックループ}}が短いほど学びは速い）。ただし借りた{{技術的負債}}のしわ寄せは当面チームが背負う（巻き込み−）。早めに返す前提で。',
      },
      {
        id: 'b',
        label: '品質に妥協せず、リリースを1スプリント遅らせる',
        effects: { culture: 1, trust: -1 },
        resultText:
          '締切を割り、結城さんは渋い顔（納期遅れで信頼−）。だがコードは持続可能で、チームは無理をしていない。',
      },
    ],
  },
  {
    id: 's2-daily-idea',
    sprint: 2,
    ceremony: 'daily',
    segment: 'chance',
    title: '現場からの改善案',
    narrative: '田淵さんが「ここ、こうしたら俺らもっと楽だぞ」と設計に口を出してきた。',
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
      '結城さんが「予測機能はまだ？ 経営に詰められてる」とデイリーに乗り込んできた。{{KPI}}がブレかける。',
    choices: [
      {
        id: 'a',
        label: '板挟みを避け、予測機能の開発に切り替える',
        effects: { trust: 1, insight: -1, culture: -1 },
        resultText:
          '催促に応えて結城さんは一旦満足（信頼+）。だが「誤出荷を減らす」という真の的から逸れた。',
        warn: true,
      },
      {
        id: 'b',
        label: '誤出荷の改善見込みを数字で見せ、的を守る',
        effects: { insight: 1, trust: -1 },
        resultText:
          '「予測機能じゃないのか」と結城さんは不満顔（要望を押し返して信頼−）。だが{{KPI}}を守るのもFDEの仕事だ。',
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
      'チームが「もっと速く回そう」と{{デイリースクラム}}で焦り始めた。結城さんは{{ベロシティ}}を“ノルマ”と見て増加を期待している。',
    choices: [
      {
        id: 'a',
        label: '見積りを盛って消化量を増やし、ベロシティを“成長”に見せる',
        effects: { trust: 1, culture: -1 },
        resultText:
          '数字は伸び、結城さんは満足（信頼+）。だが{{ベロシティ}}はノルマでなく予測のための実績値。盛れば{{技術的負債}}とチームの疲れが静かに積もる。',
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
          'まず動かして見せたので結城さんは進捗に安心（信頼+）。だが“何をもって正しいか”が無い。評価なき生成は、ただの祈りだ。',
        warn: true,
      },
      {
        id: 'b',
        label: '先に合否の{{評価基準}}（許容できる誤出荷率）を書いてから生成させる',
        effects: { insight: 1, trust: -1 },
        resultText:
          '着手は遅れ結城さんは渋い顔（信頼−）。だが生成の前に{{評価基準}}を決めたから、出力の良し悪しを判断できる。',
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
      '結城さんが「個人情報を含む配送データは社外に出すな」と言う。写真入力にAIを使う構成だと、ここに引っかかる。',
    choices: [
      {
        id: 'a',
        label: 'まず動かして、セキュリティは後から塞ぐ',
        effects: { trust: 1, insight: -1 },
        resultText:
          'まず動かして見せたので結城さんは進捗に安心（信頼+）。だがセキュリティは後付けするほど高くつく。終盤で構成のやり直しが待っている。',
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
      '結城さんが廊下で「その仕様でいいよ」と口頭でOKをくれた。急いでいるし、このまま進めたい。',
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
      'リリース直前。結城さんは表向き賛成だが、どこか不安そう。現場の一部も様子見だ。',
    choices: [
      {
        id: 'a',
        label: '賛成は得たので、不安は気にせず進める',
        effects: { trust: 1, insight: -1 },
        resultText:
          '賛成は得たので結城さんは一旦安心（信頼+）。だが誰が怒るかを考えず、リリース後、様子見だった人たちから反発が噴き出した。',
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
          '機能は増え、結城さんは“動いている”と一旦満足（進捗が見えて信頼+）。だが迷ったときに戻る先を見失い、高機能の沼にはまって現場の利用から遠ざかる。',
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
          '精度の数字に溺れた。業務上は90%で十分だったのに、納期だけが溶け、結城さんは「まだ出ないのか」と渋い顔（納期遅れで信頼−）。',
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
        label: 'アンケートを配り、結城さん向けに定量レポートを残す',
        effects: { trust: 1, insight: 1 },
        resultText:
          'きれいな数字が残り、結城さんは報告に満足（信頼+）。ただし「なぜその点数か」は分からない。',
      },
      {
        id: 'b',
        label: '現場に立ち、使う様子を黙って観察する',
        effects: { insight: 2 },
        resultText:
          '田淵さんが写真入力を「これなら楽だ」と笑った。{{現場主義}}は反応の質まで変える。（報告映えの信頼+は取り逃す）',
      },
    ],
  },

  // ── レトロ ──
  {
    id: 's2-retro',
    sprint: 2,
    ceremony: 'retro',
    segment: 'team',
    title: '振り返り——核心の壁',
    narrative:
      '{{レトロスペクティブ}}で、全員が同じ壁に気づいた。自動化の鍵は、田淵さんや山田さん、橋本さんの“勘”——例外処理の暗黙知だ。だが現場は、自分の仕事や価値が消えるのを恐れて、それを言葉にしない。隠している。この主軸を、どう攻略する？',
    choices: [
      {
        id: 'a',
        label: 'トップダウンで乗り切る。郷田専務の号令で、手順の提出を業務命令にする',
        effects: { trust: 1, culture: -1 },
        resultText:
          '専務の一声で話は速く進み、経営の覚えもいい（信頼+）。だが現場は渋々、表向きの手順だけを差し出した。いちばん大事な“例外”は、まだ誰の口からも出てこない。',
        warn: true,
        setsFlag: 'topDown',
      },
      {
        id: 'b',
        label: '信頼を築く。「あなたの仕事は奪わない」と約束し、現場と一緒に標準化していく',
        effects: { insight: 1, culture: 1 },
        resultText:
          '遠回りだが、田淵さんが少しだけ口を開いた。「まあ、ここだけの話な…」。隠されたノウハウへの、細い道が見えた。（号令で速く進める信頼+は取り逃す）',
        setsFlag: 'genbaTrust',
      },
    ],
  },
  {
    id: 's2-daily-repo-aicode',
    sprint: 2,
    ceremony: 'daily',
    segment: 'team',
    location: 'repo',
    hints: {
      po: '需要予測の小さな機能を実装する番だ。リポジトリで作り方を決めてきて。',
      sm: '実装の進め方でチームが迷ってる。リポジトリで方針を固めて。',
      dev: 'AIに書かせるか自分で書くか——リポジトリで線引きを決めましょう。',
    },
    title: 'AIに書かせるか、自分で書くか',
    narrative:
      'リポジトリで、需要予測の小さな機能を実装する番。受託のAIエージェントに投げれば数分で書ける。だが中身を自分で把握できるか。{{完成の定義}}は満たせるか。そして、AIトークンも有限だ。',
    choices: [
      {
        id: 'a',
        label: 'AIエージェントに丸ごと書かせて、すぐマージする',
        effects: { trust: 1, insight: -1 },
        resultText:
          '数分でPRが上がり、すぐ動いた（速さが見えて信頼+）。だが中身は誰も分かっていない。技術的負債が静かに積もり、トークンも減った。',
        warn: true,
        setsFlag: 'aiOverreliance',
        tokenCost: 500,
      },
      {
        id: 'b',
        label: '時間はかかるが、自分で設計して書き、テストを通す',
        effects: { insight: 1, culture: 1 },
        resultText:
          'AIと働く——たたき台は借りても、設計と検証は自分の手で。把握できるコードと、通るテストが残った。（即マージの“見える進捗”信頼+は取り逃す）',
      },
    ],
  },
  {
    id: 's2-daily-ai-handoff',
    sprint: 2,
    ceremony: 'daily',
    segment: 'chance',
    location: 'devroom',
    hints: {
      po: 'スピードは魅力だけど、丸投げの価値は怪しい。開発室で受託のAIを見極めて。',
      sm: 'AIに任せきりだと、後で誰も中身が分からなくなる。開発室で線引きを。',
      dev: '受託のAIエージェント、今は賢いです。開発室に繋いで使い所を相談しましょう。',
    },
    title: '速すぎるAIエージェント',
    narrative:
      '受託部門が連れてきたAIエージェントは、とにかく速い。需要予測のコードも{{WMS}}の改修案も数分で吐き出す。橋本さんは「これ全部任せちゃえば？」と半分本気だ。',
    choices: [
      {
        id: 'a',
        label: 'レビューも{{完成の定義}}も省いて、エージェントに丸投げで一気に進める',
        effects: { trust: 1, insight: -1 },
        resultText:
          '驚くほど速く形になった（進捗が見えて信頼+）。検証は後回し——「動いてるからヨシ」。便利さに、深く寄りかかり始めた。AIトークンも、ごっそり溶けた。',
        warn: true,
        setsFlag: 'aiOverreliance',
        tokenCost: 700,
      },
      {
        id: 'b',
        label: 'AIは下書きに使い、人のレビューと{{完成の定義}}を必ず通す',
        effects: { insight: 1, culture: 1 },
        resultText:
          '速さは活かしつつ、出力は人の目で受け入れる。{{ハルシネーション}}は、ここで食い止める。（“全部お任せ”の速さが持つ信頼+は取り逃す）',
      },
    ],
  },
  {
    id: 's2-daily-dod',
    sprint: 2,
    ceremony: 'daily',
    segment: 'team',
    title: '「完成」って、どこから？',
    narrative:
      'チームで{{完成の定義}}を決める。「テストもレビューもドキュメントも全部」を理想に掲げるか、続けられる現実解にするか。',
    choices: [
      {
        id: 'a',
        label: '理想を高く掲げ、フルの品質基準を一律で課す',
        effects: { culture: -1 },
        resultText:
          '基準は立派だが重すぎて、誰も守れず形骸化した。守れない{{完成の定義}}は、無いのと同じだ。',
        warn: true,
      },
      {
        id: 'b',
        label: 'まず守れる最小の{{完成の定義}}を決め、回しながら厳しくする',
        effects: { insight: 1, culture: 1 },
        resultText:
          '小さく始めて、徐々に上げる。守れる基準だけが、品質を本当に支える。',
      },
    ],
  },
  {
    id: 's2-daily-goalcreep',
    sprint: 2,
    ceremony: 'daily',
    segment: 'kokyaku',
    title: '揺らぐスプリントゴール',
    narrative:
      '{{スプリント}}の途中、結城さんが「経営が別の機能も今期に、と。このスプリントに入れられませんか」と割り込んできた。{{スプリントゴール}}が揺らぐ。',
    choices: [
      {
        id: 'a',
        label: '断りきれず、ゴールに割り込み機能を足す',
        effects: { trust: 1, culture: -1 },
        resultText:
          '結城さんは安堵した（要望に応えて信頼+）。だが焦点がぼやけ、元のゴールも割り込みも中途半端になった。',
        warn: true,
      },
      {
        id: 'b',
        label: '{{スプリントゴール}}を守り、割り込みは次の{{バックログ}}最上位として形に残す',
        effects: { insight: 1, culture: 1 },
        resultText:
          '「次に必ずやる」と約束し、今の焦点を守った。守られたゴールが、予測可能性を生む。（即応の信頼+は取り逃す）',
      },
    ],
  },
  {
    id: 's2-daily-fillrate',
    sprint: 2,
    ceremony: 'daily',
    segment: 'genba',
    title: '回転率と充足率の板挟み',
    narrative:
      '経営は「{{在庫回転率}}を上げろ、在庫を減らせ」と言う。だが現場の評価軸は{{充足率}}——{{欠品}}を出すと叱られる。結城さんは板挟みだ。',
    choices: [
      {
        id: 'a',
        label: '経営の言う通り在庫を絞り、回転率の数字を作る',
        effects: { trust: 1, insight: -1 },
        resultText:
          '回転率は上がった（経営に見せられて信頼+）。だが{{欠品}}が増え、現場は{{安全在庫}}を隠し持ち始めた。数字の裏で歪みが育つ。',
        warn: true,
      },
      {
        id: 'b',
        label: '両KPIの綱引きを可視化し、品目ごとに{{安全在庫}}の置き方を現場と決める',
        effects: { insight: 1, culture: 1 },
        resultText:
          '一律でなく、動きの速い品と遅い品で分ける。{{充足率}}と{{在庫回転率}}の両立点を、現場の知で探した。',
      },
    ],
  },
  {
    id: 's2-daily-crossdock',
    sprint: 2,
    ceremony: 'daily',
    segment: 'genba',
    title: '「クロスドッキングで在庫ゼロだ」',
    narrative:
      '「{{クロスドッキング}}にすれば在庫ゼロで速くなる」と赤城部長が乗り気だ。だが入荷と出荷の時刻が日々ズレるこの現場で、本当に回るのか。',
    choices: [
      {
        id: 'a',
        label: '号令通り、全品クロスドッキングに切り替える',
        effects: { insight: -1 },
        resultText:
          '同期が取れず、荷が通路に溢れた。理屈は正しくても、現場の{{動線}}とリズムを見ていなかった。',
        warn: true,
      },
      {
        id: 'b',
        label: '入出荷の同期が取れる一部品目だけで小さく試す',
        effects: { insight: 1 },
        resultText:
          '回る品と回らない品が見えた。{{クロスドッキング}}は、現場の時間が噛み合う所から始める。',
      },
    ],
  },
  {
    id: 's2-daily-demofail',
    sprint: 2,
    ceremony: 'daily',
    segment: 'trouble',
    title: 'レビュー前夜、機能が落ちた',
    narrative:
      '{{スプリントレビュー}}の前日、見せる予定だった機能が落ちた。郷田専務も来る。隠して別の見栄えで乗り切るか。',
    choices: [
      {
        id: 'a',
        label: '落ちた機能には触れず、見栄えのする別画面でデモを乗り切る',
        effects: { trust: 1, insight: -1 },
        resultText:
          'その場は拍手で終わった（取り繕って信頼+）。だが「動く」と思わせた経営の判断が、事実とズレ始める。',
        warn: true,
      },
      {
        id: 'b',
        label: '落ちた事実と原因、次の手を正直に共有する',
        effects: { insight: 1, culture: 1 },
        resultText:
          '気まずい沈黙のあと、郷田専務は「で、次どうする？」と前を向いた。隠さない者が、次の信頼を得る。（取り繕いの信頼+は取り逃す）',
      },
    ],
  },
  {
    id: 's2-daily-flow',
    sprint: 2,
    ceremony: 'daily',
    segment: 'team',
    title: '全員忙しいのに終わらない',
    narrative:
      'みんなが3つも4つも{{仕掛り}}を抱え、どれも終わらない。「並行した方が速い気がする」という空気。だが完了が一向に出ない。',
    choices: [
      {
        id: 'a',
        label: '各自が抱えるタスクを増やし、稼働率を上げる',
        effects: { culture: -1 },
        resultText:
          '全員忙しいのに、完了は増えない。切り替えのムダが膨らみ、{{仕掛り}}の沼にはまった。',
        warn: true,
      },
      {
        id: 'b',
        label: '{{仕掛り}}に上限を設け、終わらせてから次に着手する',
        effects: { insight: 1, culture: 1 },
        resultText:
          '一つずつ流したら、かえって早く片付いた。忙しさでなく、流れを見る。',
      },
    ],
  },
  {
    id: 's2-daily-stakeholders',
    sprint: 2,
    ceremony: 'daily',
    segment: 'kokyaku',
    title: 'それぞれの“成功”',
    narrative:
      '同じ機能でも、結城さん（情シス）は「保守が楽に」、田淵さん（現場）は「入力が減れば」、赤城部長は「コストが下がれば」と、求める成果がバラバラだ。',
    choices: [
      {
        id: 'a',
        label: '声の大きい赤城部長の要望に全部寄せる',
        effects: { insight: -1 },
        resultText:
          'コスト目線だけで作ったら、現場には響かなかった。誰の成果かを絞らず、一番強い声に流された。',
        warn: true,
      },
      {
        id: 'b',
        label: '各{{ステークホルダー}}の“成功”を並べ、今回優先する一人を明確に決める',
        effects: { insight: 1, culture: 1 },
        resultText:
          '全員は満たせない。だから誰の成果を今取りに行くかを選び、合意した。{{成果の定義}}は、相手によって違う。',
      },
    ],
  },
  {
    id: 's2-daily-refine',
    sprint: 2,
    ceremony: 'daily',
    segment: 'team',
    title: '曖昧なまま着手する？',
    narrative:
      'プランニング当日、{{バックログ}}の上位がまだ曖昧だ。「とりあえず着手しよう」という声と、「{{リファインメント}}が先だ」という声が割れる。',
    choices: [
      {
        id: 'a',
        label: '曖昧なまま着手して、走りながら考える',
        effects: { insight: -1 },
        resultText:
          '途中で前提が崩れ、作ったものを捨てた。準備不足のまま走った代償だ。',
        warn: true,
      },
      {
        id: 'b',
        label: '上位だけ手早く{{リファインメント}}し、入口の曖昧さを潰す',
        effects: { insight: 1, culture: 1 },
        resultText:
          '「何が出来たら終わりか」を先に決めた。曖昧さを入口で潰すと、後の手戻りが減る。',
      },
    ],
  },
  {
    id: 's2-daily-leadtime',
    sprint: 2,
    ceremony: 'daily',
    segment: 'chance',
    title: 'リードタイムを詰める好機',
    narrative:
      '受注から出荷までの{{リードタイム}}を、AIの{{需要予測}}で前倒しできるかもしれない。結城さんの目が輝く。だが予測を信じて先に動くリスクもある。',
    choices: [
      {
        id: 'a',
        label: '予測を全面的に信じ、先回りで在庫を積んでリードタイムを詰める',
        effects: { trust: 1, insight: -1 },
        resultText:
          '一時は速くなった（数字が出て信頼+）。だが予測が外れた品で過剰在庫が膨らみ、{{在庫回転率}}が悪化した。',
        warn: true,
      },
      {
        id: 'b',
        label: '予測の当たり外れを品目別に検証し、外しても痛くない範囲で先回りする',
        effects: { insight: 1 },
        resultText:
          '当たる品から少しずつ。{{需要予測}}は、外れる前提で安全幅を設計する。',
      },
    ],
  },
  {
    id: 's2-daily-handwork',
    sprint: 2,
    ceremony: 'daily',
    segment: 'genba',
    title: '勘で保たれる流通加工',
    narrative:
      '{{流通加工}}——ギフトのセット組みは、パートの山田さんの“勘”で品質が保たれていた。標準化したいが、本人は「見て覚えるもんだ」と言う。',
    choices: [
      {
        id: 'a',
        label: 'マニュアル化は後回しにして、山田さん頼みで回し続ける',
        effects: { culture: -1 },
        resultText:
          '今日も品質は保たれた。だが山田さんが休んだ日、セット組みは崩れる。現場の手作業は、未来のプロダクト仕様なのに。',
        warn: true,
      },
      {
        id: 'b',
        label: '山田さんの手元を撮り、勘を手順とチェック表に翻訳する',
        effects: { insight: 1, culture: 1 },
        resultText:
          '「こんなん言葉にできんよ」と笑いつつ、コツが形になった。{{流通加工}}の暗黙知が、チームの資産になる。',
      },
    ],
  },
  {
    id: 's2-daily-courage',
    sprint: 2,
    ceremony: 'daily',
    segment: 'team',
    title: '言いにくい一言',
    narrative:
      '橋本さんへの一極集中は、誰の目にも限界だ。だが本人に「権限を分けましょう」と言うのは気が重い。彼のプライドもある。',
    choices: [
      {
        id: 'a',
        label: '波風を避け、当面は橋本さん体制のまま回す',
        effects: { culture: -1 },
        resultText:
          '平穏は保たれた。だが詰まりの一点は太くなる一方で、いつか折れる。言うべきを言わない優しさは、未来を削る。',
        warn: true,
      },
      {
        id: 'b',
        label: '橋本さんに敬意を払いつつ、権限と知識を分ける提案を切り出す',
        effects: { insight: 1, culture: 1 },
        resultText:
          '「正直、しんどかった」と橋本さんは漏らした。勇気を出した一言が、属人化をほどく糸口になった。',
      },
    ],
  },
  {
    id: 's2-daily-aidata',
    sprint: 2,
    ceremony: 'daily',
    segment: 'kokyaku',
    title: '使えるデータ、使っていいデータ',
    narrative:
      'AIの予測精度を上げるには、カルゴ物流の取引先の出荷データが効く。だがそれは取引先の機微情報だ。赤城部長は「使えるものは使え」と言う。',
    choices: [
      {
        id: 'a',
        label: '同意の確認を後回しに、手元のデータを全部学習に回す',
        effects: { trust: 1, insight: -1 },
        resultText:
          '精度は上がった（成果が出て信頼+）。だが取引先の機微情報を無断で使った事実は、いつか火種になる。{{ガバナンス}}を飛ばした。',
        warn: true,
      },
      {
        id: 'b',
        label: '使える範囲を{{ガバナンス}}と取引先の同意で線引きしてから使う',
        effects: { insight: 1, culture: 1 },
        resultText:
          '使えるデータは減った。だが境界を引いたうえでの精度は、後ろ暗くない。{{ガバナンス}}は敵でなく入場券だ。',
      },
    ],
  },
  {
    id: 's2-daily-blamewar',
    sprint: 2,
    ceremony: 'daily',
    segment: 'trouble',
    title: '責任の押し付け合い',
    narrative:
      '出荷遅延が起きた途端、会議室は犯人探しの場になった。結城さん（情シス）は「現場の入力ミスだ」、業務側は「システムが落ちたからだ」と譲らない。郷田専務の機嫌が、刻一刻と悪くなる。',
    choices: [
      {
        id: 'a',
        label: '郷田専務の覚えがいい方に責任を寄せ、その場を丸く収める',
        effects: { trust: 1, culture: -1 },
        resultText:
          'うまく裁いて見せ、郷田専務の覚えはめでたい（信頼+）。だが現場は「結局どちらかが詰め腹か」と白け、火種は水面下に残った。',
        warn: true,
      },
      {
        id: 'b',
        label: '「誰の責任か」でなく「仕組みのどこが弱いか」に話を移し、両部門を同じ事実に立たせる',
        effects: { insight: 1, culture: 1 },
        resultText:
          '入力と連携の境目に落ちた穴が、両者の前で可視化された。犯人でなく原因を見ると、対立は協力に変わる。',
      },
    ],
  },
  {
    id: 's2-daily-keiri-odd',
    sprint: 2,
    ceremony: 'daily',
    segment: 'trouble',
    location: 'keiri',
    hints: {
      po: 'お客さんの数字の信頼性が気になる。経理部で売上の中身を確かめてきて。',
      sm: '現場の実数と帳簿が食い違ってるかも。経理部で突き合わせてきて。',
      dev: '実体の見えない売上があるみたいです。経理部で間宮さんに当たってください。',
    },
    title: '実体の見えない売上',
    narrative:
      '経理部の間宮さんが、画面の数字をそっと指してこぼした。「この売上……相手も品物も“ある”ことになってるのに、私、現場で見たことがないんです」。決算は締まる。だが、実体が見えない。',
    choices: [
      {
        id: 'a',
        label: '経理の数字は経理の話。現場の自動化に集中する',
        effects: { insight: -1 },
        resultText:
          '部署の壁の内側だけを見て、横断のサインを一つ見送った。数字と現場が繋がらないままでは、本当のことは見えてこない。',
        warn: true,
      },
      {
        id: 'b',
        label: '間宮さんの違和感をメモし、現場の実数と突き合わせる約束をする',
        effects: { insight: 1 },
        resultText:
          '事実・推測・願望を分けて書き留めた。会計の側に、一人の味方ができた。数字と現場が、繋がり始める。',
        setsFlag: 'fraudClue',
      },
    ],
  },
  {
    id: 's2-daily-soumu-badge',
    sprint: 2,
    ceremony: 'daily',
    segment: 'trouble',
    location: 'soumu',
    hints: {
      po: '入館証が失効して中に入れない。総務部で再発行を片付けてきて。',
      sm: '入館の手続きで現場が止まりかけてる。総務部で詰まりを解こう。',
      dev: 'ゲートで弾かれました…。総務部で更新の手続きを確かめてください。',
    },
    title: '失効した入館証',
    narrative:
      '朝、入館証がゲートで弾かれた。更新の申請が総務部で止まっていたらしい。今日は中に入れず、現場の作業まで止まりかける。窓口の守屋さんは「期限切れですので再申請を」と取り合わない。',
    choices: [
      {
        id: 'a',
        label: '現場のメンバーに頼んで、こっそり中へ通してもらう',
        effects: { trust: 1, culture: -1 },
        resultText:
          'なんとか中に入れて、今日も手は動いた（止まらず信頼+）。だが規程を破って人を巻き込んだ。総務の不信と、頼んだ相手の負い目が残る。',
        warn: true,
      },
      {
        id: 'b',
        label: '今日は粘らず、再申請と“止まった原因”そのものを総務と片付ける',
        effects: { insight: 1, culture: 1 },
        resultText:
          '一日は失ったが、手続きの不備まで直した。{{ガバナンス}}は越えるより、入場券に変える方が早い。総務との距離も縮まった。（強引に動いて見せる信頼+は取り逃す）',
      },
    ],
  },
  {
    id: 's2-daily-soumu-hyoka',
    sprint: 2,
    ceremony: 'daily',
    segment: 'kokyaku',
    location: 'soumu',
    hints: {
      po: '橋本さんの評価が不当に下げられそうだ。回付書類を握る総務部で動きを確かめて。',
      sm: 'キーパーソンが冷遇されるとチームが崩れる。総務部の守屋さんに背景を聞いてきて。',
      dev: '人事評価の起案が、総務経由で漏れてきてるみたいです。総務部で事実を確かめて。',
    },
    title: '下げられる評価',
    narrative:
      '守屋さんが声を落として教えてくれた。橋本さんの人事評価が「改革に非協力的」と低く付けられそうだ、と。実際は、属人化したシステムを一人で支えているからこそ慎重なだけ。赤城部長の差し金らしい。評価会議は近い。',
    choices: [
      {
        id: 'a',
        label: '社内政治には立ち入らない。評価は会社の問題だと割り切る',
        effects: { trust: 1, culture: -1 },
        resultText:
          '波風は立てず、経営の覚えはよい（信頼+）。だが、現場を支えてきた橋本さんが理不尽に沈むのを黙って見た。チームの目が、少し冷めた。',
        warn: true,
      },
      {
        id: 'b',
        label: '橋本さんの貢献を、事実と数字で総務・経営に示す',
        effects: { culture: 1, insight: 1 },
        resultText:
          '「彼が止まれば全部止まる」を数字で見せた。理不尽が一つ覆り、現場は「見てくれている」と感じた。誰の仕事でもないことを、拾った。（中立を装う信頼+は取り逃す）',
      },
    ],
  },
  {
    id: 's2-daily-soumu-ringi',
    sprint: 2,
    ceremony: 'daily',
    segment: 'kokyaku',
    location: 'soumu',
    hints: {
      po: '改善ツールを入れるのに総務の稟議で止まってる。総務部で承認の筋を通して。',
      sm: '承認フローがボトルネックだ。総務部で詰まりの一点を見てきて。',
      dev: '勝手に入れると後で揉めます。総務部で稟議の通し方を確かめて。',
    },
    title: '稟議という名の関門',
    narrative:
      '現場に小さな改善ツールを一つ入れる。それだけのことに、総務部の稟議と押印が要る。守屋さんに「前例がないので」と書類を止められた。スピードを取るか、筋を通すか。',
    choices: [
      {
        id: 'a',
        label: '口頭OKだけもらって先に動かし、書類は後で出す',
        effects: { trust: 1, culture: -1 },
        resultText:
          'すぐ動いて成果が見えた（信頼+）。だが手順を飛ばされた総務はへそを曲げ、次から風当たりが強くなった。口頭合意は、形にしておくべきだった。',
        warn: true,
      },
      {
        id: 'b',
        label: '正規の稟議を通し、承認の記録を残してから進める',
        effects: { culture: 1, insight: 1 },
        resultText:
          '一手間かけて承認を取った。記録が残り、組織の後ろ盾ができた。{{ガバナンス}}を入場券に変えた。（先に動いて見せる信頼+は取り逃す）',
      },
    ],
  },
  {
    id: 's2-daily-costcut',
    sprint: 2,
    ceremony: 'daily',
    segment: 'kokyaku',
    location: 'jinji',
    hints: {
      po: '人員削減の話が人事部で動いてる。現場の実力を踏まえて利害を確かめてきて。',
      sm: 'コスト目標が現場を圧迫しそう。人事部で誰がどう握ってるか見てきて。',
      dev: '人を2割減らすと誤出荷がどうなるか、人事部で前提の数字を確かめて。',
    },
    title: '「人を減らして数字を作れ」',
    narrative:
      '人事部で、新田さんが言いにくそうに切り出す。「赤城部長から——来期、庫内の人を2割減らせと」。数字の上では利益が出る。だが現場はいまでもギリギリで、削れば{{誤出荷率}}が跳ねるのは目に見えている。',
    choices: [
      {
        id: 'a',
        label: '号令通り、人員削減の計画を作って差し出す',
        effects: { trust: 1, insight: -1 },
        resultText:
          '赤城部長は「話が早い」と満足（信頼+）。だが現場は疲弊し、{{誤出荷率}}が増える芽が静かに育つ。',
        warn: true,
      },
      {
        id: 'b',
        label: '削るより{{動線}}と{{5S}}でムダを減らす案を、数字で示して押し返す',
        effects: { insight: 1, trust: -1 },
        resultText:
          '「現場の肩を持つのか」と赤城部長は不機嫌（押し返して信頼−）。だが人を削らずコストを下げる筋を、数字で通した。',
      },
    ],
  },
  {
    id: 's2-daily-hqorder',
    sprint: 2,
    ceremony: 'daily',
    segment: 'kokyaku',
    title: '本社からの一律通達',
    narrative:
      '本社経営企画から「全倉庫、在庫を一律3割削減」の通達が降りてきた。現場は{{欠品}}を恐れてざわつく。赤城部長は「本社の言う通りにしておけ」と言う。',
    choices: [
      {
        id: 'a',
        label: '通達通り、一律3割削減を現場に飲ませる',
        effects: { trust: 1, insight: -1 },
        resultText:
          '本社の覚えはいい（信頼+）。だが品目を見ない一律削減で{{欠品}}が増え、現場は裏で{{安全在庫}}を隠し持ち始めた。',
        warn: true,
      },
      {
        id: 'b',
        label: '品目別に「削れる在庫／削れない在庫」を分け、実態を本社に示す',
        effects: { insight: 1, trust: -1 },
        resultText:
          '「通達に逆らうのか」と本社は渋い顔（押し返して信頼−）。だが一律でなく実態に合わせ、{{充足率}}を守った。',
      },
    ],
  },
  {
    id: 's2-daily-ghost-stock',
    sprint: 2,
    ceremony: 'daily',
    segment: 'genba',
    location: 'warehouse',
    hints: {
      po: '帳簿の在庫を前提に経営へ報告してる。倉庫で実数を確かめてきて。',
      sm: '棚卸の差異がどうも腑に落ちない。倉庫で現物と突き合わせよう。',
      dev: '在庫データに説明のつかない高額品があります。倉庫で現物を探してみてください。',
    },
    title: '在るはずの機材が、無い',
    narrative:
      '棚を一つずつ実数で数え、形だけ動いていた帳簿と初めて突き合わせた。すると——帳簿に「導入済み」と載っている高額な{{フィジカルAI}}機材が、倉庫のどこにも見当たらない。誰の手でも実物と突き合わされてこなかったから、これまで気づかれなかった。これは、普通の{{棚卸}}差異だろうか。',
    choices: [
      {
        id: 'a',
        label: '面倒事の匂いがする。帳簿に合わせて、見なかったことにする',
        effects: { insight: -1 },
        resultText:
          '数字は帳簿に合わせた。だが“在るはずの機材が無い”という違和感に、自分から蓋をした。資料の外の事実を、また一つ閉じた。',
        warn: true,
      },
      {
        id: 'b',
        label: '実物と帳簿のズレの出所を、現場と一台ずつ突き合わせて追う',
        effects: { insight: 1 },
        resultText:
          '「この型番、見たことないっすね」と現場。導入されたはずの機材が、最初から無い。これは棚卸差異じゃない。何か、もっと大きなものの尻尾だ。',
        setsFlag: 'fraudClue',
      },
    ],
  },
]
