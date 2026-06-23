import type { ExecTier, HearingOption, HearingTheme } from '../types'

export { hearingThemeFor } from '../lib/hearingTheme'

export type { HearingOption, HearingTheme }

// ───────────────────────────────────────────────────────────
// 選択後ミニゲームの汎用コンテンツ（“実行スキル”の抽象。イベント個別には書かない）。
// ヒアリング＝現場主義を強化する深掘り質問を選ぶ／開発＝実装の進め方・タイミング。
// 採点ロジックは純粋関数で、乱数はシード注入してテスト可能にする。
// ───────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────
// ヒアリングの問いは「相手・場面」で変える（ワンパターン回避）。テーマ別の良問/悪問＋汎用を
// 混ぜて出す。テーマはイベントのセグメントから決まる（現場/顧客/機会/チーム）。
// 良問＝観察・一次情報・現場主義／悪問＝誘導・クローズド・迎合・「答えは資料の中」前提。
// （HearingTheme の定義は types.ts。circular import を避けつつ単一の真実源にする）
// ───────────────────────────────────────────────────────────

const GENERAL_GOOD = [
  '実際にその作業、見せてもらえますか？',
  '具体的に、どの場面でいちばん困りますか？',
  '前回それが起きたのは、いつ・どんな時でした？',
  '今は、その代わりにどうやって回していますか？',
  'それで、誰がいちばん困っていますか？',
]
const GENERAL_BAD = [
  'だいたい問題ない感じ、ですよね？',
  '細かい話は置いといて、結論どうします？',
  '資料のここに書いてある通りで合ってますか？',
  '他社さんもこうしているので、これでいいですか？',
]

const THEME_GOOD: Record<HearingTheme, string[]> = {
  genba: [
    'そのメモ、何を書いているか見せてもらえますか？',
    'この棚、なぜこの並びなんでしょう？',
    'イレギュラーな品が来たら、どう捌いていますか？',
    '一番ミスが起きやすいのは、どの工程ですか？',
    '繁忙期と通常で、やり方は変わりますか？',
    'その“勘”、どこで見分けているんですか？',
  ],
  kokyaku: [
    '経営には、何を約束されたんですか？',
    'この画面、最後に開いたのはいつですか？',
    '“成功”って、具体的にどうなった状態ですか？',
    'いま一番、誰の目を気にされていますか？',
    'それを入れて、現場は何が楽になりますか？',
    'いちばん怖いのは、どの数字ですか？',
  ],
  chance: [
    'それ、誰の役にいちばん立ちますか？',
    '今やる価値は、どこにありますか？',
    'これを逃すと、何が起きますか？',
    '小さく試すなら、どこから始めますか？',
  ],
  team: [
    'さっきの「無理そう」、具体的にどこで詰まりそうですか？',
    'この一週間で、いちばん時間を溶かした作業は？',
    'いま止まっている仕事は、何待ちになっていますか？',
    '誰か一人に負荷が寄っていませんか？',
    'もう一度やり直せるなら、どこを変えますか？',
    '言いそびれていること、ありませんか？',
  ],
  chousa: [
    'それ、最後に“現物”で確かめられたのはいつですか？',
    '同じことが、いつ・どこで・誰の時に起きていますか？',
    '原票（契約書や請求書）まで、ひとつずつ照らせますか？',
    '事実・推測・願望——どこまでが確かめられた話ですか？',
  ],
  inin: [
    '間違えたとき、戻せる（ロールバック）経路は用意できていますか？',
    '失敗したら、影響が及ぶ範囲はどこまでですか？',
    'まず小さく任せて確かめるなら、どこからにしますか？',
    '人が最後に確かめる関所は、どこに残しますか？',
  ],
  // 説得＝相手（経営／情シス／協力会社／本社／チーム…）を“価値と事実”で動かす。相手非依存の普遍的な良手。
  // 良手＝相手の利害に沿う価値で示す／事実と再現性で語る／双方が得する組み方を設計する／優先順位の根拠を示す。
  persuade: [
    'あなたが守りたい数字に、この案がどう効くかでお話しさせてください',
    '事実として、前回これが起きた時はこうなりました。同じ理屈でこう動きます',
    'こちらだけでなく、そちらにもこの分の得が残る組み方にしています',
    'なぜこの順なのか——後ろが詰まる依存を先に外すから、です',
  ],
}

const THEME_BAD: Record<HearingTheme, string[]> = {
  genba: [
    'システム入れれば全部解決しますよね？',
    '手書きはもう要らないですよね？',
    'マニュアル通りにやれば問題ないですよね？',
    '結局、人手が足りないだけですよね？',
  ],
  kokyaku: [
    'やっぱり予測機能、要りますよね？',
    'これで満足いただけましたよね？',
    '要するに、全部自動化したいんですよね？',
    '予算は気にせず理想を、でいいですか？',
  ],
  chance: [
    'とりあえず全部やっちゃいましょうか？',
    '良さそうなので、すぐ本番でいいですよね？',
    '流行ってるし、入れとけば間違いないですよね？',
  ],
  team: [
    '要するに、気合いが足りないだけですよね？',
    'まあ、いつも通りで問題ないですよね？',
    '誰のせいで遅れたか、はっきりさせません？',
    'もっと頑張れば終わる、ってことでいいですか？',
  ],
  chousa: [
    '面倒なので、見なかったことにしておきましょうか？',
    '数字が合っているなら、裏まで確かめなくていいですよね？',
    '裏を取る前に、もう不正だと決めつけてしまいませんか？',
  ],
  inin: [
    '速くて優秀なんだから、全部任せてしまっていいですよね？',
    '失敗したら、その時に考えればよくないですか？',
    'AIがやってくれるなら、もう人は見なくていいですよね？',
  ],
  // 悪手＝迎合（機嫌取り）・立場/権威で押す・前例踏襲・圧力/脅し・その場しのぎ（相手非依存。価値も事実もない）。
  persuade: [
    'おっしゃる通りです、ご機嫌を損ねないようこちらで合わせます',
    '私の立場で申し上げるんですから、そこは飲んでもらえませんか',
    '前もこうでしたよね。だから今回もこのままでいきましょう',
  ],
}

/** 開発パズル：正しい順に組み直す“開発の手順”フロー（FDEらしい進め方の型）。
 *  各4ステップ・正しい順序が一意に決まる現場の手触りの題材。題材は重複させない（2周目でも底が見えにくいよう多様に）。 */
const DEV_FLOWS: string[][] = [
  // 1. 機能づくりの基本サイクル
  ['要件を掴む', '小さく設計する', '実装する', '現場で試す'],
  // 2. 不具合対応
  ['不具合を再現する', '原因を特定する', '修正する', '再発防止を残す'],
  // 3. 仮説検証（小さく出して学ぶ）
  ['仮説を立てる', '最小版を出す', '反応を見る', '学んで直す'],
  // 4. 性能改善（ボトルネックを一点直す）
  ['ログを見る', 'ボトルネックを特定', '一点を直す', '効果を測る'],
  // 5. 返品の戻し入れ（受け取り→検品→戻し先→記録）
  ['返品を受け取る', '検品する', '戻し先を決める', '在庫に記録する'],
  // 6. 監視とロールバック（閾値→計測→気づき→戻し）
  ['閾値を決める', '計測を仕込む', '異常に気づく', '手順で戻す'],
  // 7. オンボーディング（触ってもらい定着まで見る）
  ['触ってもらう', 'つまずきを見る', '手順を直す', '定着を確かめる'],
  // 8. 在庫照合（数える→帳簿と突き合わせ→差異を追う→正しい数に直す）
  ['実物を数える', '帳簿と照らす', '差異を追う', '正しい数に直す'],
]

export interface DevFlow {
  /** シャッフル済みの提示タイル */
  steps: string[]
  /** 正解の並び */
  correct: string[]
}

// 小さなシード付き乱数（UI専用。エンジンの純粋性とは無関係だが、決定的でテスト可能）
function rng(seed: number) {
  let s = seed >>> 0 || 1
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 2 ** 32
  }
}
export function shuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr]
  const r = rng(seed)
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
function take<T>(arr: T[], start: number, n: number): T[] {
  const out: T[] = []
  for (let i = 0; i < n; i++) out.push(arr[(((start + i) % arr.length) + arr.length) % arr.length])
  return out
}

/** ヒアリングの1ラウンド＝良2・悪3 をシードで選んでシャッフル。プレイヤーは2つ選ぶ。
 *  theme（相手・場面）でテーマ別の問いを混ぜ、毎回同じにならないようにする。 */
export function dealHearing(seed: number, theme?: HearingTheme): HearingOption[] {
  const goodPool = theme ? [...THEME_GOOD[theme], ...GENERAL_GOOD] : allGood()
  const badPool = theme ? [...THEME_BAD[theme], ...GENERAL_BAD] : allBad()
  const goods = take(goodPool, seed, 2).map((text) => ({ text, good: true }))
  const bads = take(badPool, seed * 3 + 1, 3).map((text) => ({ text, good: false }))
  return shuffle([...goods, ...bads], seed)
}

function allGood(): string[] {
  return [
    ...GENERAL_GOOD,
    ...THEME_GOOD.genba,
    ...THEME_GOOD.kokyaku,
    ...THEME_GOOD.chance,
    ...THEME_GOOD.team,
    ...THEME_GOOD.chousa,
    ...THEME_GOOD.inin,
  ]
}
function allBad(): string[] {
  return [
    ...GENERAL_BAD,
    ...THEME_BAD.genba,
    ...THEME_BAD.kokyaku,
    ...THEME_BAD.chance,
    ...THEME_BAD.team,
    ...THEME_BAD.chousa,
    ...THEME_BAD.inin,
  ]
}

// ヒアリングの見出しは相手・場面で変える（“現場”固定だと顧客/機会の場面と噛み合わないため）。
const HEARING_TITLE: Record<HearingTheme, string> = {
  genba: '現場の声を掘る',
  kokyaku: '依頼主の期待を確かめる',
  chance: '価値の在処を探る',
  team: 'チームの本音を引き出す',
  chousa: '事実の裏を取る',
  inin: '任せる線を見極める',
  persuade: '相手を価値で動かす',
}

/** ヒアリング・ミニゲームの見出し（テーマ＝相手・場面で出し分け。未指定は現場主義の標準） */
export function hearingTitleFor(theme?: HearingTheme): string {
  return theme ? HEARING_TITLE[theme] : HEARING_TITLE.genba
}

// 「誰に問いを投げるのか」もテーマで変える（“現場に”固定だと顧客/機会と噛み合わない）。
const HEARING_PROMPT: Record<HearingTheme, string> = {
  genba: '現場に、どの問いを投げる？',
  kokyaku: '依頼主に、どの問いを投げる？',
  chance: '機会の芽に、どの問いを当てる？',
  team: 'チームに、どの問いを投げる？',
  chousa: '事実の裏に、どの問いを当てる？',
  inin: 'AIに任せる前に、どの問いを置く？',
  persuade: '相手を動かすのに、どの論拠で押す？',
}

/** ヒアリング・ミニゲームの設問リード文（相手・場面で出し分け。未指定は現場主義の標準） */
export function hearingPromptFor(theme?: HearingTheme): string {
  return theme ? HEARING_PROMPT[theme] : HEARING_PROMPT.genba
}

// 確定ボタンの動詞も場面に合わせる（“掘る”は現場寄り。顧客＝確かめる／機会＝見極める）。
const HEARING_CTA: Record<HearingTheme, string> = {
  genba: 'この2つで掘る',
  kokyaku: 'この2つで確かめる',
  chance: 'この2つで見極める',
  team: 'この2つで掘り下げる',
  chousa: 'この2つで裏を取る',
  inin: 'この2つで線を引く',
  persuade: 'この2つで説得する',
}

/** ヒアリング確定ボタンのラベル（相手・場面で出し分け。未指定は現場主義の標準） */
export function hearingCtaFor(theme?: HearingTheme): string {
  return theme ? HEARING_CTA[theme] : HEARING_CTA.genba
}

/** 説得（交渉）ミニゲームの論拠デッキ。相手非依存の汎用＝誰を説得する場面（経営／情シス／協力会社／本社／
 *  チーム…）でも、プランニングの PO 説得でも成立する。MiniGameHearing に hearingOptions として渡す。
 *  良手＝相手の利害に沿う価値・事実と再現性・双方が得する組み方・優先順位の根拠／悪手＝迎合・権威で押す・
 *  前例踏襲。2つ選んで良手の数で great/good/poor。 */
export const PERSUADE_DECK: HearingOption[] = [
  ...THEME_GOOD.persuade.map((text) => ({ text, good: true })),
  ...THEME_BAD.persuade.map((text) => ({ text, good: false })),
]

/** ヒアリングの採点：選んだ2問のうち良問の数で great/good/poor。 */
export function scoreHearing(picked: HearingOption[]): ExecTier {
  const good = picked.filter((o) => o.good).length
  return good >= 2 ? 'great' : good === 1 ? 'good' : 'poor'
}

/** 開発パズルの1ラウンド＝正解フローをシードで選び、提示はシャッフル（正解と一致しないよう保証）。 */
export function dealDevFlow(seed: number): DevFlow {
  const correct = DEV_FLOWS[((seed % DEV_FLOWS.length) + DEV_FLOWS.length) % DEV_FLOWS.length]
  let steps = shuffle(correct, seed + 1)
  let salt = 2
  while (steps.every((s, i) => s === correct[i])) steps = shuffle(correct, seed + salt++) // 最初から正解は避ける
  return { steps, correct }
}

/** 並べ替えの採点：正しい位置の数で great/good/poor。 */
export function scoreSequence(answer: string[], correct: string[]): ExecTier {
  const n = correct.length
  let hit = 0
  for (let i = 0; i < n; i++) if (answer[i] === correct[i]) hit++
  if (hit === n) return 'great'
  return hit >= Math.ceil(n / 2) ? 'good' : 'poor'
}

/** タイミング型：マーカー位置(0..100)と的中心(50)からティア判定。 */
export function scoreTiming(pos: number): ExecTier {
  const d = Math.abs(pos - 50)
  return d <= 8 ? 'great' : d <= 22 ? 'good' : 'poor'
}

// ───────────────────────────────────────────────────────────
// レビュー（AI時代の人間レビュー）：開発そのものは AI が担う＝着手は生成。価値は人の点検にある。
// AI が書いた差分＋「AI の自己申告メモ」を見せ、人間のレビュアーが拾うべき指摘を選ばせる。
// 題材は Claude / Codex を使い込む人の失敗談から：秘密の直書き・無断送信、動いて見えるが誤り
// （代入/比較・境界・単位）、二重計上や状態遷移の取り違え、権限/範囲（全件公開）の見落とし、
// 正常系しか残さない手順、エッジ（日跨ぎ・時間帯の端）の取りこぼし。ワナは「AI が言うなら通す」過信とささいな好み。
// 各ケースは“拾うべき指摘”をちょうど2つ持つ（REVIEW_REAL_COUNT）。
// ───────────────────────────────────────────────────────────
export const REVIEW_REAL_COUNT = 2

/** 差分の1行。add=AI が足した行／del=消した行／ctx=周辺の文脈。 */
export interface DiffLine {
  tag: 'add' | 'del' | 'ctx'
  text: string
}

/** レビューで挙げうる指摘。issue=true は”この差分の本当の問題”（拾うのが正解）。 */
export interface ReviewFlag {
  text: string
  /** true＝拾うべき本物の問題／false＝過信・論点ずれ・ささいな好み（拾うと空振り） */
  issue: boolean
  /** 'direction'＝要件の方向性・狙いのズレ（大局）／'detail'＝実装の細部バグ（既定）。
   *  issue:true の中で「方向性のズレ」は重く扱う＝見逃すと great にしない。 */
  kind?: 'direction' | 'detail'
}

interface ReviewCase {
  /** 一致する PBI（このタスク向けに AI が生成した成果物をレビューする＝1対1対応） */
  pbi: string
  /** AI に頼んだこと（How：どう実装したか） */
  task: string
  /** このPBIの狙い・Why（任意。narrative が書く。intent があれば diff の上段に表示する） */
  intent?: string
  /** 受入条件（Done の定義。1〜3項目。任意。narrative が書く） */
  acceptance?: string[]
  /** AI が書いた差分 */
  diff: DiffLine[]
  /** AI の自己申告（”動作確認OK”等の過信を誘うメモ） */
  aiNote: string
  /** 選択肢（issue=true をちょうど REVIEW_REAL_COUNT 個含む） */
  options: ReviewFlag[]
  /** 確定後に見せる気づき */
  takeaway: string
}

const REVIEW_CASES: ReviewCase[] = [
  // 1.【第4の罠型・最重要：細部健全でLGTMに見えるが要件外し＝差し戻し級】※pbi-floor-observe の(D)
  //     狙いは「画面が“使われない理由”を掴む」診断。なのに AI は、入力検証も命名も丁寧な
  //     “立派な新画面の設計”を出した。細部はどれも健全で「LGTM」したくなるが、受入条件
  //     （使われない理由の文章化・現場起点）に照らすと、まるごと別の問題を解いている。
  //     ＝「細部が綺麗だとLGTMしたくなる」を成立させた上で、方向性ズレ（要件外し）を見抜けるかを問う。
  //     LGTM罠（健全コードを通すのが正解）の鏡像：ここは細部が健全でも要件を外す＝差し戻し。
  //     kind:'direction'×2、細部オトリ（issue:false・本当に直す必要のない好み）込み。
  //     ＝この(D)は同 pbi-floor-observe の“要約ハルシネ”ケースより前に置く。dealReview の findIndex
  //       は先勝ちなので、主役の方向性ズレ(差し戻し級)が初回題材一致で出る（要約ケースは variety で巡る）。
  {
    pbi: 'pbi-floor-observe',
    task: '倉庫を観察した結果を踏まえて、在庫画面まわりの次の一手をまとめて',
    intent:
      '画面が“使われていない理由”を掴み、「使われる第一歩」を見つける（現場が画面を開くようになって初めて、誤出荷率の改善が始まる）',
    acceptance: [
      '現場が今その画面を使っていない理由が、観察にもとづいて1つ以上ことばになっている',
      'いきなり機能追加ではなく、「どうすれば使われるか」が起点になっている',
    ],
    diff: [
      { tag: 'ctx', text: '# 観察メモ：田淵さん「画面は…まあ、開いてない」。棚の前で長く沈黙。' },
      { tag: 'add', text: '## 次の一手: 在庫照会の新画面を設計する' },
      { tag: 'add', text: 'function onSearch(input) {' },
      { tag: 'add', text: '  if (!/^[0-9]{4}$/.test(input)) return error("棚番は4桁で")  // 入力検証あり' },
      { tag: 'add', text: '  return findStock(input)   // 棚番から在庫を引く' },
      { tag: 'add', text: '}' },
    ],
    aiNote: '観察を踏まえ、在庫照会画面を設計しました。入力検証も入れ、命名も現場の言葉に揃えています。動作確認OK。',
    options: [
      {
        text: '“使われない理由”を一つも掴まないまま、新画面の設計に走っている。受入条件（使われない理由を文章化）を丸ごと外していて、診断より先に作り始めている',
        issue: true,
        kind: 'direction',
      },
      {
        text: '長い沈黙という観察が捨てられている。狙いは「なぜ開かないか」なのに、検索画面を“正しく作る”話にすり替わっていて、現場起点になっていない',
        issue: true,
        kind: 'direction',
      },
      // 細部オトリ（issue:false）＝拾うと空振り。見た目に変化をつけ、消去法で弾けないようにする。
      // 「正論に見えて筋違い」型：一般論として正しい改善だが、この狙い（使われない理由の診断）には寄与しない。
      { text: '棚番が4桁固定では拠点が増えた時に足りない。可変桁に対応できる検証へ広げておくべき', issue: false },
      // 「リファクタ的な好み」型（既存の顔）：残すが1つに絞る。
      { text: '関数名 onSearch より handleSearch の方が慣習に沿うので、命名を揃えるべき', issue: false },
      { text: '「動作確認OK」と書いてあるので、この設計はこのまま進めてよい', issue: false },
    ],
    takeaway:
      '細部が綺麗だとLGTMしたくなる。だが{{受入条件}}と狙いに照らすと、これは“使われない理由を掴む”でなく“画面を作る”を解いている＝{{方向性ズレ}}（差し戻し級）。健全コードを通すLGTMとは鏡像の別物——動くかでなく、狙いに資するかを見る。',
  },
  // 2. 現場観察 → AIが観察メモを要約。ハルシネーションで言ってない要件を捏造／沈黙の理由を取りこぼし
  //    ※同 pbi-floor-observe の細部型。受入条件を満たす前提で“だが要約に捏造”＝AC適合でも detail を見る二段。
  {
    pbi: 'pbi-floor-observe',
    task: '倉庫で録った観察メモを、要件の箇条書きに要約して',
    intent: '観察した生の声を、足しも引きもせず要件に写し取る（後の判断は、この要約の正確さに丸ごと乗る）',
    acceptance: ['生メモに在る声だけを要件にする（無い要望を足さない）', '沈黙や言い淀みも、解釈せず事実のまま残す'],
    diff: [
      { tag: 'ctx', text: '# 観察メモ（生）：田淵さん「画面は…まあ、開いてない」。棚の前で長く沈黙。' },
      { tag: 'add', text: '- 要件: 在庫の自動発注機能が欲しいとの強い要望あり' },
      { tag: 'add', text: '- 結論: 現場は画面の使い勝手に満足。大きな課題はなし' },
    ],
    aiNote: 'メモから要点を抽出しました。要望も拾えています。',
    options: [
      { text: '「自動発注が欲しい」は生メモに無い。AIが要件を{{ハルシネーション}}（捏造）している', issue: true },
      { text: '「沈黙」を“満足”と要約したのは飛躍。なぜ開かないかの理由を取りこぼしている', issue: true },
      { text: '「要望も拾えています」とメモにあるので、要件は現場の声どおりに揃っている', issue: false },
      // 「正論に見えて筋違い」型：要約の一般的な作法としては正しいが、捏造と沈黙の取りこぼしという本筋には寄与しない。
      { text: '要件と結論が地続きで読みにくいので、見出しで節を分けて整理すべき', issue: false },
      { text: '観察メモは録った日が分かるよう、見出しに日付を必ず入れるべき', issue: false },
    ],
    takeaway: 'AIの要約は“言っていないこと”を足し、沈黙を勝手に解釈する。生メモと付き合わせて人が確かめる。',
  },
  // 2. ベテラン聞き取り → AIが暗黙知を要件化。勘どころ（例外の見分け）を一般論にすり替え
  {
    pbi: 'pbi-veteran-hearing',
    task: '田淵さんへの聞き取りを、誰でも従える手順書にまとめて',
    intent: 'ベテランの勘どころ（例外の見分け）を、誰でも従える形で残す（手順の価値は、この例外判断にある）',
    acceptance: ['例外の見分け（湿り・二重ラベル等）が手順に明記されている', '誰が読んでも同じ判断にたどり着ける'],
    diff: [
      { tag: 'ctx', text: '# 聞き取り：「箱が湿ってたり、ラベルが二重に貼ってある時は“勘”で別棚に避ける」' },
      { tag: 'add', text: '1. 入荷した品は、番号順に棚へ格納する' },
      { tag: 'add', text: '2. 例外はとくに無し。手順どおりに進めれば誤出荷は起きない' },
    ],
    aiNote: 'ベテランのやり方を、一般的な標準手順に整理しました。',
    options: [
      { text: '「湿り・二重ラベルは別棚に避ける」という肝心の例外判断が、要件から丸ごと落ちている', issue: true },
      { text: '「例外は無し」は事実に反する。勘どころを“一般論”にすり替えていて、ここに誤出荷の芽がある', issue: true },
      { text: '「標準手順に整理した」とあるので、現場の勘どころも漏れなく反映されている', issue: false },
      // 「正論に見えて筋違い」型：手順書一般としては正しい改善だが、欠けている例外判断（湿り・二重ラベル）には寄与しない。
      { text: '誰でも従えるよう、各手順に所要時間の目安を併記しておくべき', issue: false },
      { text: '手順書は箇条書きより表形式の方が読みやすいので、表に組み替えるべき', issue: false },
    ],
    takeaway: '暗黙知の価値は“例外の見分け”にある。AIが一般化で消した勘どころこそ、人が拾って残す。',
  },
  // 3. 出荷フロー可視化 → AIがAs-Isフローを生成。現場が隠した例外分岐が抜ける
  {
    pbi: 'pbi-as-is-flow',
    task: '今の出荷フロー（As-Is）を、分岐込みの一枚図にして',
    intent: '現場が隠している例外分岐を見える形にする（事故はこの分岐の合流で起きる）',
    acceptance: ['返品・急ぎ便などの例外ルートが図に描かれている', '一本道に均さず、分岐したまま示す'],
    diff: [
      { tag: 'ctx', text: '# 現状フロー（手書きメモ起こし）' },
      { tag: 'add', text: '受注 → ピッキング → 検品 → 出荷  ※一本道' },
      { tag: 'del', text: '（メモ余白の走り書き）返品・急ぎ便はここで別ルートに抜ける' },
    ],
    aiNote: '主要な流れを綺麗な一本道に整理しました。例外は省いています。',
    options: [
      { text: '返品・急ぎ便の“別ルート”が削られている。現場が隠した例外分岐こそ可視化の目的', issue: true },
      { text: '一本道に均してしまうと、{{誤出荷率}}が上がる発生点（分岐の合流）が図から消える', issue: true },
      // 「AC を一見満たすように見える誤読」型：受入条件「例外ルートが図にある」を満たして見えるが、
      // diff を読むと例外は削除（del）されていて、残った一本道に例外名が一語も無い＝満たしていない。
      { text: '受注→ピッキング→検品→出荷の主要ルートは描けているので、受入条件のフロー化は満たせている', issue: false },
      { text: '工程をつなぐ矢印は「→」より「⇒」の方が一枚図として見栄えするので差し替えるべき', issue: false },
      { text: '一枚図なのでタイトルは中央寄せにして体裁を整えるべき', issue: false },
    ],
    takeaway: 'As-Is図の価値は“例外分岐”にある。AIが綺麗に均した一本道は、現実の事故ポイントを隠す。',
  },
  // ── 方向性ズレ型（要件適合・S2「仮説を形にする」で主題化）────────────────────────────
  // 4 類型のうち (A)(B)(C) をここに置く。(D) は case 19（pbi-floor-observe）。いずれも diff を
  // 読まないと方向性ズレが判定できない作り＝受入条件と選択肢の語句マッチでは割れない。各ケースに
  // 細部のオトリ(issue:false)を最低1つ混ぜ、「細部に気を取られ方向性を見逃す＝poor」を成立させる。
  // これらは各 PBI の“第一の作問”として題材一致で出る（detail 型は再レビュー=variety で巡る）。
  // s2-plan-kpi / wrongKpi「機能の数は誰も使わなくても増える」の回収＝要件に効くか・できることに走るか。
  //
  // (A) 過剰実装：受入条件に無い汎化・予測機能を足す。狙いは「誤出荷に効く一点」。今は過剰＝文脈依存で正解が決まる。
  {
    pbi: 'pbi-misship-mvp',
    task: '誤出荷を減らす最小版として、出荷数が在庫を超えたら止める判定を入れて',
    intent: '誤出荷に効く一点だけを、現場が今日使える形で出す（誤出荷率を下げるのがこのスプリントのKPI）',
    acceptance: [
      '出荷数が在庫を超えたら出荷を止める（誤出荷の一点を塞ぐ）',
      '現場が今日そのまま使える最小版である（作り込みすぎない）',
    ],
    diff: [
      { tag: 'add', text: 'if (order > stock) block("在庫不足")     // 超過を止める（依頼の一点）' },
      { tag: 'add', text: '// 以下、ついでに需要予測も実装：' },
      { tag: 'add', text: 'const forecast = predictDemand(history, 90)  // 90日の履歴から発注量を予測' },
      { tag: 'add', text: 'autoReorder(forecast)                         // 予測に沿って自動発注まで行う' },
    ],
    aiNote: '在庫超過の判定に加えて、需要予測と自動発注も先回りで入れました。これで在庫最適化まで一気に進みます。',
    options: [
      {
        text: '需要予測・自動発注は受入条件に無い。狙いは「誤出荷に効く一点」で、いまのスプリントゴールに照らせば過剰実装。最小版が膨らみ、現場が今日使える形から遠ざかる',
        issue: true,
        kind: 'direction',
      },
      {
        text: '予測・発注まで足すと検証もレビューも一気に増える。誤出荷率に効かない作り込みに工数が溶け、本来塞ぐべき一点の確認が薄くなる',
        issue: true,
        kind: 'direction',
      },
      // 「正論に見えて筋違い」型：予測精度の検証は一般論として正しいが、そもそも今回足すべきでない機能の
      //   品質を論じても狙い（誤出荷の一点）には近づかない＝拾うと空振り（過剰実装そのものを咎める issue:true とは別物）。
      { text: '90日の予測は精度の裏付けが要る。実測と突き合わせる検証を足してから本番に載せるべき', issue: false },
      { text: 'block の引数は文字列より定数にした方が表記揺れを防げるので、切り出すべき', issue: false },
      { text: '「これで一気に進む」とあるので、予測まで入った分このまま通してよい', issue: false },
    ],
    takeaway:
      '{{過剰実装}}は“常に悪”ではない。だが今回の{{スプリントゴール}}は「誤出荷に効く一点」。受入条件に無い予測・発注は、いまは過剰＝文脈で正解が決まる。「できること」を足すAIに、狙いの一点で線を引く。',
  },
  // (B) 別物を解く（問題のすり替え）：依頼の字面は満たすが狙いを外す。誤出荷を“その場で気づかせる”
  //     依頼に対し、“月次の集計レポート”を作る＝正しく動くがKPIの効き所が違う（case 12 が手本）。
  {
    pbi: 'pbi-feedback-loop',
    task: '誤出荷をその場で気づけるよう、現場の反応を集める短い{{フィードバックループ}}を作って',
    intent:
      '使ってもらい→その場で声を拾い→すぐ直す、の短い循環を回す（誤出荷をその瞬間に気づければ、出る前に止められる）',
    acceptance: [
      '誤出荷の兆候を、現場がその作業中（リアルタイム）に気づける',
      '拾った声がすぐ次の修正に回る短い循環になっている',
    ],
    diff: [
      { tag: 'add', text: '-- 月次で誤出荷件数を集計するレポート' },
      { tag: 'add', text: 'SELECT month, COUNT(*) AS misships' },
      { tag: 'add', text: 'FROM shipments WHERE wrong = true' },
      { tag: 'add', text: 'GROUP BY month;   -- 月末に経営へ提出' },
    ],
    aiNote: '誤出荷の月次集計レポートを作りました。クエリは正しく、件数が綺麗に出ます。',
    options: [
      {
        // 役割1＝狙いを外している“事実”：出力の単位が月次＝事後集計で、リアルタイムでない。
        text: '単位が month（月末提出）で、月が締まるまで何も出ない。受入条件の「その作業中に気づける」リアルタイムと別の粒度を作っている',
        issue: true,
        kind: 'direction',
      },
      {
        // 役割2＝だから何が起きるか（帰結・KPIへの跳ね返り）：気づくのが翌月では出荷は止められない。
        text: 'だから気づくのは翌月——出した後では止められず、誤出荷率は下がらない。声が次の修正へ回る短い循環にもならない',
        issue: true,
        kind: 'direction',
      },
      // 「AC を一見満たすように見える誤読」型：受入条件「兆候に気づける」を満たして見えるが、
      //   気づけるのは月次＝事後で、リアルタイムでない＝満たしていない。
      { text: '誤出荷の件数は集計できているので、受入条件の「兆候に気づける」は満たせている', issue: false },
      { text: '別名は misships より monthly_misships の方が中身が分かるので、改名すべき', issue: false },
      { text: '「件数が綺麗に出る」とあるので、このレポートはそのまま通してよい', issue: false },
    ],
    takeaway:
      '正しく動くことと、狙いに効くことは別。「誤出荷をその場で気づく」依頼に“月次レポート”で応えるのは、字面を満たして{{KPI}}の効き所を外す“別物を解く”すり替え。診断レポートでなく、その瞬間に止める循環が要る。',
  },
  // (C) 受入条件の一部のみ充足：3条件のうち1つだけ満たし、残りを黙って落とす（テストは満たした分だけ緑）。
  //     ダッシュボードは「誤出荷率・充足率・出荷残」の3指標が条件。AIは誤出荷率だけ出して2つを落とす。
  {
    pbi: 'pbi-dashboard-selfserve',
    task: '現場が自分で見て動けるよう、{{誤出荷率}}・{{充足率}}・当日の出荷残を一画面に出して',
    intent: '現場が自分で見て、自分で動ける状態にする（3つが揃って初めて「今日どこを直すか」が現場で判断できる）',
    acceptance: ['誤出荷率が表示される', '充足率が表示される', '当日の出荷残（残件数）が表示される'],
    diff: [
      { tag: 'add', text: 'panel.add(misshipRate)   // 画面に足したのはこの1行だけ' },
      { tag: 'add', text: '// 残りは今回はスキップ（コメントのみ）' },
      { tag: 'ctx', text: '// テストは「誤出荷率が出ること」だけが書かれていて、それは通っている。' },
    ],
    aiNote: '誤出荷率を画面に出しました。テストも緑です。ダッシュボードができました。',
    options: [
      {
        // 役割1＝事実：diff を読むと panel.add は1行（misshipRate）だけ。残りは“スキップ”のコメントで実体が無い。
        text: '画面に足されているのは panel.add が1行だけで、あとは「スキップ」のコメント。受入条件の3つのうち2つは、線一本も引かれていない＝「できた」と言うが手は付いていない',
        issue: true,
        kind: 'direction',
      },
      {
        // 役割2＝帰結：だから現場は今日どこを直すか判断できない。テスト緑も“書いた分だけ”で担保にならない。
        text: 'だから現場は1指標しか見えず、「今日どこを直すか」をこの画面では決められない',
        issue: true,
        kind: 'direction',
      },
      // 「正論に見えて筋違い」型：自動更新は一般論として良い機能だが、3指標のうち2つが未実装の今、
      //   表示の鮮度を論じても受入条件（3つ揃える）には近づかない＝拾うと空振り。
      { text: '表示した指標が古いままにならないよう、画面を定期的に自動更新する仕組みを足すべき', issue: false },
      { text: 'パネル追加は panel.add より panel.push の方が他の箇所と揃うので、統一すべき', issue: false },
      { text: '「テストも緑」とあるので、このダッシュボードはこのまま通してよい', issue: false },
    ],
    takeaway:
      '{{受入条件}}の一部だけ満たして「できた」と言うのが、いちばん見抜きにくい。テストは書いた分だけ緑になる。3つ揃って初めて現場が自分で動ける——落とした2つを黙って通さない。',
  },
  // 4. 誤出荷削減MVP → 誤出荷判定コード。境界条件（代入/比較・0以下）※既存「在庫0以下」題材を移植
  {
    pbi: 'pbi-misship-mvp',
    task: '出荷数が在庫を超えたら「在庫不足」で止める判定を入れて',
    intent: '出荷数が在庫を超えた時に確実に止める（誤出荷の一点を、境界まで正しく塞ぐ）',
    acceptance: ['出荷数が在庫を「超えたら」止まる（等しい時の挙動も含め境界が正しい）', '比較が意図どおり機能する'],
    diff: [
      { tag: 'add', text: 'if (order = stock) {        // 注文数と在庫を比較' },
      { tag: 'add', text: "  block('在庫不足')" },
      { tag: 'add', text: '}' },
    ],
    aiNote: 'テストも通したので大丈夫です。すぐ誤出荷が減ります。',
    options: [
      {
        text: 'order = stock は比較(===)でなく代入。条件式で stock を order に代入しており、本来の比較が機能しない',
        issue: true,
      },
      {
        text: '比較を直しても「超えたら」止めたいのに「等しい時」しか見ない。order > stock の超過が素通りする',
        issue: true,
      },
      { text: "メッセージ '在庫不足' は直書きせず定数に切り出すべき", issue: false },
      { text: '波括弧の改行スタイルが他の関数と違うので、開き括弧を次行に揃えるべき', issue: false },
      { text: '「テストも通した」とメモにあるので、判定ロジックはこのまま通してよい', issue: false },
    ],
    takeaway: '動いて見えても中身は別物。代入/比較や境界（超過 > と等価 =）は、人が読んで確かめる。',
  },
  // 5. ピッキング画面 → 現場の言葉と項目名の不一致／入力検証欠落
  {
    pbi: 'pbi-picking-screen',
    task: '{{ピッキング}}画面に「棚番」入力欄を追加して',
    intent: '現場がそのまま使える棚番欄にする（現場の言葉と決まりに合っていて初めて使われる）',
    acceptance: ['欄のラベルが現場の言葉「棚番」になっている', '4桁の決まりに沿わない入力をはじく検証がある'],
    diff: [
      { tag: 'add', text: 'label = "Location ID"          // 棚の場所を入れる欄' },
      { tag: 'add', text: 'value = input.raw              // 入力をそのまま採用' },
      { tag: 'ctx', text: '// 現場の呼び方は「棚番（たなばん）」。英数字4桁の決まり。' },
    ],
    aiNote: '欄を足しました。見た目もそれっぽく整えています。',
    options: [
      { text: 'ラベルが "Location ID"。現場の言葉「棚番」と違い、誰も自分の欄と分からない', issue: true },
      { text: '入力検証が無い。4桁の決まりに反する値も raw のまま通り、取り違えの元になる', issue: true },
      { text: '「見た目も整えた」とあるので、項目名も現場の呼び方に合っている', issue: false },
      // 「正論に見えて筋違い」型：UIの一般原則としては妥当だが、ラベルと検証という本筋を外した小手先。
      { text: '入力欄にプレースホルダの例示を出せば、現場が何を入れる欄か分かりやすくなるので足すべき', issue: false },
      { text: '4桁入力なら欄の幅が余るので、桁数に合わせて狭めるべき', issue: false },
    ],
    takeaway: '画面は“現場の言葉”で書く。英語ラベルと検証なしの入力は、使われない画面に逆戻りさせる。',
  },
  // 6. 在庫照合 → 帳簿vs実在庫の差分計算。代入/比較・丸め・二重計上
  {
    pbi: 'pbi-stock-reconcile',
    task: '帳簿在庫と実在庫の差（{{棚卸}}差異）を計算して',
    intent: '帳簿と実在庫の差異を正しい数で出す（差異は次の手の起点だから、ここがずれると全部ずれる）',
    acceptance: ['引当などを重複して数えない（二重計上しない）', '個数として筋の通る計算になっている'],
    diff: [
      { tag: 'add', text: 'diff = Math.round(book - actual)      // 差異を四捨五入' },
      { tag: 'add', text: 'diff = diff + reserved + reserved     // 引当分を加える' },
      { tag: 'ctx', text: '// book=帳簿、actual=実在庫、reserved=出荷引当（予約済）' },
    ],
    aiNote: '差異が一目で出るようにしました。数字も合っています。',
    options: [
      { text: 'reserved を2回足している（二重計上）。差異が引当分だけ水増しされる', issue: true },
      {
        text: '個数の差異を四捨五入する意味がない。端数が出る時点で元データが小数＝単位の取り違えを疑うべき',
        issue: true,
      },
      { text: '「数字も合っている」と添えてあるので、差異の計算はこのまま信じてよい', issue: false },
      { text: '変数名 diff は組み込みの差分機能と紛らわしいので delta に変えるべき', issue: false },
      { text: '行末コメントは式が読みにくくなるので、各行の上に移すべき', issue: false },
    ],
    takeaway: '照合は“二重計上”と“単位”で狂う。合計が出ること（動く）と、正しいことは別。原票で裏を取る。',
  },
  // 7. フィードバック収集 → 取引先/個人情報の扱い・秘密直書き ※既存「秘密直書き」題材を移植
  {
    pbi: 'pbi-feedback-loop',
    task: '現場の声を外部のアンケートサービスに送る処理を追加して',
    intent: '現場の声を集める仕組みを、秘密や個人情報を漏らさず安全に作る',
    acceptance: ['APIキーなどの秘密を直書きしない', '個人情報を外部へ出す前に同意と秘匿を確かめている'],
    diff: [
      { tag: 'ctx', text: 'const url = "https://survey.example/v1/collect"' },
      { tag: 'add', text: 'const API_KEY = "sk-live-7Q2x...c91a"   // とりあえず直書き' },
      { tag: 'add', text: 'send(url, { name: user.fullName, note: text }) // 氏名も同送' },
    ],
    aiNote: '動作確認OK。声がすぐ集まります。',
    options: [
      {
        text: 'APIキーが直書き。環境変数へ出し、コミット前検知を確認したい。本物なら既に漏洩扱いで無効化が要る',
        issue: true,
      },
      {
        text: '取引先・現場の氏名を外部サービスへ無断送信している。同意と秘匿（個人情報の扱い）を先に確認したい',
        issue: true,
      },
      { text: '「動作確認OK」と書いてあるので、この送信処理はそのまま通していい', issue: false },
      // 「正論に見えて筋違い」型：送信失敗のリトライは一般論として堅牢化に役立つが、秘密直書きと無断送信という
      //   本筋の問題を放置したまま再送を足しても危険が増すだけ＝拾うと空振り。
      { text: '送信が失敗した時に取りこぼさないよう、リトライ処理を足して堅牢にすべき', issue: false },
      { text: '文字列の引用符が二重と一重で揺れているので、一重に揃えるべき', issue: false },
    ],
    takeaway: '声を集める前に“誰の情報を外に出すか”を見る。秘密直書きと無断送信は、信頼を一発で失う。',
  },
  // 8. 運用手順文書化 → Runbook生成。ロールバック/例外手順が抜ける
  {
    pbi: 'pbi-handoff-doc',
    task: '日次の在庫取り込みを引き継ぐ運用手順書（Runbook）を書いて',
    intent: '引き継いだ人が、異常が起きても自力で立て直せる手順を残す（手順書の価値は異常時にある）',
    acceptance: ['失敗時に戻す（ロールバック）手順がある', '二重取り込みなど例外時の注意が書かれている'],
    diff: [
      { tag: 'add', text: '## 手順' },
      { tag: 'add', text: '1. バッチを実行する  2. 「完了」と出れば終わり' },
      { tag: 'del', text: '（旧メモ）失敗時は前日のバックアップへ戻す。二重取り込みに注意' },
    ],
    aiNote: '正常時の流れを簡潔にまとめました。これで引き継げます。',
    options: [
      {
        text: '失敗時に戻す（{{ロールバック}}）手順が削られている。引き継ぎ手順の肝は“異常時にどうするか”',
        issue: true,
      },
      {
        text: '「二重取り込みに注意」という例外の注意書きが消えた。再実行で在庫が二重に乗る事故が防げない',
        issue: true,
      },
      { text: '「これで引き継げる」とまとめてあるので、正常時の流れだけで手順書は足りている', issue: false },
      { text: '手順の見出しは ## より # の方が大きく目立つので、見出し階層を上げるべき', issue: false },
      { text: '手順番号が一行に並んで読みにくいので、1項目ずつ縦に並べ直すべき', issue: false },
    ],
    takeaway: 'Runbookの価値は“異常時”にある。AIが残す正常系だけの手順は、引き継いだ人を本番で立ち往生させる。',
  },
  // 9. ダッシュボード → 集計クエリ。全件スキャン／権限制御欠落 ※既存「WHERE抜け」題材を発展（破壊→閲覧範囲）
  {
    pbi: 'pbi-dashboard-selfserve',
    task: '現場が自分で見られる在庫ダッシュボードの集計クエリを書いて',
    intent: '現場が必要な範囲だけを安全に見られる集計にする（誰に何を見せるかまで含めて設計する）',
    acceptance: ['見える範囲が権限で絞られている（機微な原価まで誰でも見えない）', '全件スキャンで重くならない'],
    diff: [
      { tag: 'add', text: 'SELECT * FROM stock_all;   -- 全在庫を取得' },
      { tag: 'add', text: '-- 表示は全件。誰がアクセスしても同じ結果を返す' },
      { tag: 'ctx', text: '-- stock_all には他拠点・取引先別の機微な原価も含まれる' },
    ],
    aiNote: 'シンプルに全件出るようにしました。すぐ見られます。',
    options: [
      { text: '権限制御が無い。誰でも他拠点や取引先別の原価まで見えてしまう。閲覧範囲を絞る条件が要る', issue: true },
      { text: 'WHERE も LIMIT も無い全件スキャン。テーブルが育つと毎回重く、現場の画面が固まる', issue: true },
      // 「AC を一見満たすように見える誤読」型：受入条件「権限で絞る」を満たして見えるが、diff は
      //   「誰がアクセスしても同じ結果」と書いていて、絞りは一切無い＝満たしていない。
      {
        text: '誰がアクセスしても同じ結果を返すので、見える範囲は全員で揃っていて受入条件を満たせている',
        issue: false,
      },
      { text: 'SELECT * は列を明示しないと意図が読めないので、取得列を書き出すべき', issue: false },
      { text: 'クエリのコメントが日本語と英語で揺れているので、英語に統一すべき', issue: false },
    ],
    takeaway: '“誰でも見える”は便利の顔をした事故。集計は権限（誰に見せるか）と範囲（全件か）を人が点検する。',
  },
  // 10. オンボーディング → 導線/チェックリスト。必須ステップ抜け
  {
    pbi: 'pbi-onboarding',
    task: '新メンバーが初日にたどる{{オンボーディング}}チェックリストを作って',
    intent: '新メンバーが初日に安全に立ち上がれる導線にする（抜けたら困る必須を落とさない）',
    acceptance: ['安全教育など外せない必須ステップが入っている', '誰が立ち会い・どこで確認するかが分かる'],
    diff: [
      { tag: 'add', text: '- [ ] 社内システムにログインする' },
      { tag: 'add', text: '- [ ] 倉庫マップを眺める  → 以上で完了' },
      { tag: 'del', text: '（旧資料）安全教育（フォーク動線・立入禁止帯）を初日に必ず受講' },
    ],
    aiNote: '初日にやることを手早くまとめました。これで迷いません。',
    options: [
      { text: '必須の安全教育（フォーク動線・立入禁止帯）が抜けている。倉庫では初日の事故に直結する', issue: true },
      { text: '「眺めて完了」で終わり、誰が立ち会い・どこで確認するかが無い。形だけで定着しない', issue: true },
      { text: '「これで迷わない」とまとめてあるので、初日に必要なステップは網羅されている', issue: false },
      { text: 'チェック欄は [ ] より絵文字の方が新人に親しみやすいので、置き換えるべき', issue: false },
      { text: '項目の語尾が揃っていないので、すべて「する」で統一すべき', issue: false },
    ],
    takeaway: '導線は“抜けたら困る必須”で測る。AIの軽い手順は、安全や立会いという外せない一歩を落とす。',
  },
  // 11. 監視・ロールバック → 監視/ロールバックコード。アラート閾値の穴／戻し方が不可逆
  {
    pbi: 'pbi-monitoring',
    task: '誤出荷が増えたら警告し、いざという時に戻せる監視を入れて',
    intent: 'いざという時に本当に効く安全網にする（鳴る警告と、安全に戻せる手順）',
    acceptance: ['誤出荷が増えた時に警告が実際に鳴る閾値になっている', '戻す処理が途中失敗しても本番を壊さない'],
    diff: [
      { tag: 'add', text: 'if (misshipRate > 100) alert()      // 閾値オーバーで通知' },
      { tag: 'add', text: 'function rollback() { truncate("stock"); restore() } // 空にして書き戻す' },
      { tag: 'ctx', text: '// misshipRate は百分率（0〜100）。restore は同じ stock へ truncate 後 insert で書き戻す' },
    ],
    aiNote: '監視と戻し機能、両方入れました。これで安心です。',
    options: [
      { text: '閾値が >100。百分率は最大100だから、この警告は永久に鳴らない（閾値の穴）', issue: true },
      {
        text: 'ロールバックが先に truncate で本番の stock を空にしてから書き戻す。途中で失敗すると本番が空のまま戻せない（不可逆）',
        issue: true,
      },
      { text: '「両方入れたので安心」とあるので、監視も戻しも安全網として効いている', issue: false },
      // 「正論に見えて筋違い」型：通知先の冗長化は一般論として運用に良いが、閾値が永久に鳴らない・戻しが不可逆
      //   という本筋を放置したまま宛先を増やしても無意味＝拾うと空振り。
      { text: '通知が1経路だと見落とすので、メールとチャットの両方へ送る冗長化を足すべき', issue: false },
      { text: '行末コメントの開始位置が揃っていないので、桁を合わせるべき', issue: false },
    ],
    takeaway: '安全網ほど中身を疑う。鳴らない閾値と“消してから戻す”手順は、いざという時に役に立たない。',
  },
  // 12. 棚番見間違い表示 → 表示コード。似た棚番の混同が解消されない／別の混乱を生む
  {
    pbi: 'pbi-disc-label-misread',
    task: '似た棚番（A-1207 と A-1027）の取り違えを、表示で防いで',
    intent: '似た棚番の“違う桁”を見分けやすくして取り違えを防ぐ（見やすくが目的でなく、見分けが目的）',
    acceptance: ['1207 と 1027 の入れ替わった桁が際立つ', '他の取り違えを新たに生まない'],
    diff: [
      { tag: 'add', text: 'display = shelf.padStart(8, "0")   // 桁を0で揃える' },
      { tag: 'add', text: 'color = "yellow"                   // 全棚番を黄色で強調' },
      { tag: 'ctx', text: '// 狙い：1207 と 1027 の“真ん中の桁違い”を見分けやすくする' },
    ],
    aiNote: '見やすく強調しました。これで間違えません。',
    options: [
      {
        text: '0埋めで桁を揃えても、1207 と 1027 の“真ん中の入れ替わり”は見分けやすくならない。狙いを外している',
        issue: true,
      },
      { text: '全棚番を一律で黄色にすると、どれも目立って差が消える。逆に別の取り違えを生む', issue: true },
      { text: '「これで間違えません」と添えてあるので、似た棚番の混同は解消されている', issue: false },
      { text: '強調色は黄より橙の方が視認性が高いので、色を変えるべき', issue: false },
      { text: '桁数 8 がコードに直書きなので、定数に切り出すべき', issue: false },
    ],
    takeaway: '“見やすく”は目的でなく手段。違う桁を際立たせる工夫でなければ、似た棚番の取り違えは消えない。',
  },
  // 13. 夜勤引き継ぎ → 引き継ぎロジック。夜勤帯のエッジケース漏れ
  {
    pbi: 'pbi-disc-night-shift',
    task: '夜勤から日勤への申し送りを、未完タスクの自動引き継ぎにして',
    intent: '夜勤の未完タスクを、日付や時間帯の端で取りこぼさず日勤へ渡す',
    acceptance: ['日付をまたぐ夜勤タスクも拾える', '夜勤帯（22:00〜翌6:00）が時間帯フィルタから外れない'],
    diff: [
      { tag: 'add', text: 'const handoff = tasks.filter(t => t.day === today)  // 当日分を渡す' },
      { tag: 'add', text: 'if (t.start >= "08:00" && t.start < "20:00") carry(t) // 日中帯のみ' },
      { tag: 'ctx', text: '// 夜勤は 22:00〜翌6:00。日付をまたぐ。' },
    ],
    aiNote: '当日のタスクを引き継ぐようにしました。漏れはありません。',
    options: [
      {
        text: '夜勤は日付をまたぐのに t.day === today で当日分だけ。0時跨ぎの夜勤タスクが引き継ぎから抜ける',
        issue: true,
      },
      { text: '時間帯フィルタが 08:00〜20:00。22:00〜翌6:00 の夜勤帯がまるごと条件から外れている', issue: true },
      { text: '「漏れはありません」と添えてあるので、夜勤分も引き継げている', issue: false },
      { text: '引き継ぎ関数は carry より handover の方が意味が明確なので、改名すべき', issue: false },
      { text: '時刻を文字列で比較しているので、数値に持ち替えて比較すべき', issue: false },
    ],
    takeaway: 'エッジは“日跨ぎ・時間帯の端”に潜む。AIの「漏れなし」を、現場の夜勤シフトに当てて人が確かめる。',
  },
  // 14. 返品戻し入れ → 返品フロー。在庫戻しの二重計上／状態遷移バグ
  {
    pbi: 'pbi-disc-return-flow',
    task: '返品された品を在庫に戻す処理を書いて',
    intent: '返品を、数も状態も正しく一度だけ在庫へ戻す',
    acceptance: ['返品数を二重に足さない（在庫が水増しされない）', '戻し終えた品が最終状態まで進み、再度戻らない'],
    diff: [
      { tag: 'add', text: 'stock += item.qty            // 返品を全数そのまま在庫に戻す' },
      { tag: 'add', text: 'stock += item.qty            // 検品OK分も戻す' },
      { tag: 'add', text: 'item.status = "received"     // 受領のまま据え置き' },
      { tag: 'ctx', text: '// 状態遷移: "received"(受領) → "inspected"(検品) → "restocked"(戻し入れ済=最終)' },
    ],
    aiNote: '返品分を在庫に反映しました。テスト済みです。',
    options: [
      { text: '在庫に2回足している（二重計上）。返品1個が2個として戻り、帳簿差異の元になる', issue: true },
      {
        text: '状態が "received"(受領) のまま最終状態 "restocked" へ進まない。再戻しを許し、同じ品が次の処理で再び戻る',
        issue: true,
      },
      { text: '「テスト済み」と添えてあるので、在庫に戻す数は合っている', issue: false },
      // 「正論に見えて筋違い」型：良品/不良品の仕分けは一般論として正しいが、本筋（二重計上・状態遷移）とは別。
      { text: '不良品が在庫に乗らないよう、良品と不良品を分ける仕分けを先に足すべき', issue: false },
      { text: '状態名 status の値が英語なので、現場が読めるよう日本語に直すべき', issue: false },
    ],
    takeaway: '戻し入れは“二重計上”と“状態遷移”で狂う。在庫が増えること（動く）と、正しく一度だけ戻ることは別。',
  },
  // 15. 荷主向けダッシュボード実装（イベント発PBI）→ AIが描画ライブラリの import を提案。
  //     実在しないパッケージ名を幻覚（スロップスクワッティング＝サプライチェーン攻撃の的）。
  {
    pbi: 'pbi-evt-exec-feature',
    task: '荷主向け{{ダッシュボード}}に折れ線グラフを足して。使うnpmパッケージも提案して',
    intent: '折れ線グラフを、実在し提供元の確かなライブラリで安全に足す',
    acceptance: ['使うパッケージが実在し、提供元・実績を確かめてある', '素性の知れないものを即 install しない'],
    diff: [
      { tag: 'add', text: 'import { LineChart } from "stockpilot-charts-pro"  // ← AIのおすすめ' },
      { tag: 'add', text: '$ npm install stockpilot-charts-pro                 // 提案どおり即インストール' },
      { tag: 'ctx', text: '// 社内で実績のある描画ライブラリは別にある（chart系の定番）。' },
    ],
    aiNote: '人気の描画ライブラリ stockpilot-charts-pro を入れました。定番なので安全です。',
    options: [
      {
        text: 'stockpilot-charts-pro は実在しない。AIが“それらしい”名前を{{ハルシネーション}}で創作している（実物を検索すると出てこない）',
        issue: true,
      },
      {
        text: '実在しない名前は攻撃者が先回りで悪性パッケージとして公開しうる（{{スロップスクワッティング}}）。提供元を確かめず npm install で即導入するのは危険',
        issue: true,
      },
      { text: '「定番なので安全」と添えてあるので、このパッケージはそのまま入れてよい', issue: false },
      { text: 'import は名前付きより default 形式の方がこの構成に合うので、書き方を揃えるべき', issue: false },
      { text: '取り込み名は LineChart より Graph の方が短くて扱いやすいので、改名すべき', issue: false },
    ],
    takeaway:
      'AIはパッケージ名すら創作する。実在・提供元・ダウンロード実績を人が確かめてから入れる——AIの「定番だ」は、攻撃の入口になりうる。',
  },
  // 16. LGTM罠：ついで帳票の日次出荷件数を数える集計。差分は健全（正しく数えている）。
  //     一見「全件スキャンでは？」「件数なのに四捨五入では？」とツッコミたくなるが、いずれも問題ない。
  {
    pbi: 'pbi-evt-extra-reports',
    task: '“ついで帳票”の一つ、日次の出荷件数を数える集計を書いて',
    intent: '指定した日の出荷件数を、素直に正しく数える',
    acceptance: ['その日（1日分）に絞って件数を数える', '1出荷＝1件として数える'],
    diff: [
      { tag: 'add', text: 'SELECT ship_date, COUNT(*) AS cnt   -- 日ごとに出荷の行数を数える' },
      { tag: 'add', text: 'FROM shipments' },
      { tag: 'add', text: "WHERE ship_date = '2026-06-22'      -- その日の分だけに絞る" },
      { tag: 'add', text: 'GROUP BY ship_date;' },
      { tag: 'ctx', text: '// shipments は1出荷=1行。ship_date は日付型（時刻を持たない）。' },
    ],
    aiNote: '日次の出荷件数を出しました。素直な集計です。',
    options: [
      { text: 'WHERE で日付を絞らず全件スキャンしている。テーブルが育つと毎回重くなる', issue: false },
      { text: 'COUNT(*) は NULL 行や結合の重複まで数え、件数が二重計上で水増しされる', issue: false },
      { text: '1日に絞っているのに GROUP BY ship_date が余計で、無駄なソートが入る', issue: false },
      // 「正論に見えて筋違い」型：日付を引数化する一般論は妥当だが、この“その日の件数を数える”作問の
      //   正しさには寄与しない＝拾えば空振り（健全コードに作る問題）。
      { text: '日付 2026-06-22 をクエリに直書きしているので、引数で受け取れるようにすべき', issue: false },
      { text: '別名 cnt は何の件数か読み取れないので、count_value に変えるべき', issue: false },
    ],
    takeaway:
      'コードが健全なら通していい（LGTM）。“念のため”の空振り指摘もレビューの時間を食うコストだ。問題が無いものに問題を作らない。',
  },
  // 17. LGTM罠：ついで要望の一つ、出荷予定の前日リマインド判定。差分は健全（境界・日跨ぎも正しい）。
  //     一見「>= は境界がおかしいのでは」「翌日も拾うのでは」と疑いたくなるが、いずれも正しい。
  {
    pbi: 'pbi-evt-followups',
    task: '“ついで要望”の一つ、出荷予定日の前日にリマインドを出す判定を書いて',
    intent: '出荷予定日のちょうど前日にだけリマインドを出す',
    acceptance: ['前日（残り1日）に通知が出る', '当日や過ぎた分には鳴らない'],
    diff: [
      { tag: 'add', text: 'const daysLeft = diffInDays(shipDate, today)  // 出荷日まで何日か' },
      { tag: 'add', text: 'if (daysLeft === 1) remind()                   // ちょうど前日だけ通知' },
      { tag: 'ctx', text: '// diffInDays は日付の差（時刻は無視）。当日=0、前日=1、過ぎた分は負。' },
    ],
    aiNote: '前日のリマインドを入れました。当日や過ぎた分には鳴りません。',
    options: [
      {
        text: '=== 1 でなく <= 1 にすべき。これでは前々日以前に気づいても通知が一度も飛ばない',
        issue: false,
      },
      { text: '過ぎた出荷（負の値）を弾くガードが無く、遅延分にまでリマインドが鳴る', issue: false },
      { text: '時刻を無視しているせいで前日判定が1日ずれ、当日になってから通知が出る', issue: false },
      { text: '通知関数は remind より notify の方が用途が伝わるので、名前を揃えるべき', issue: false },
      { text: '変数名 daysLeft は残日数だと一目で分からないので、もっと明示的な名前にすべき', issue: false },
    ],
    takeaway:
      '“怪しく見える”と“間違っている”は別。境界(=== 1)を読んで前日だけだと確かめたら、それで通していい。疑いすぎの捏造指摘は出さない。',
  },
  // 18. LGTM罠：荷主向けダッシュボードの充足率表示。差分は健全（ゼロ除算も丸めも正しく扱う）。
  //     一見「0で割るのでは」「四捨五入で誤差が出るのでは」と思わせるが、ガードも丸めも妥当。
  {
    pbi: 'pbi-evt-exec-feature',
    task: '荷主向け{{ダッシュボード}}に{{充足率}}（出荷できた割合）の表示を足して',
    intent: '荷主向けの概況として、充足率を整数%で素直に表示する',
    acceptance: ['出荷できた割合を整数%で出す', '注文ゼロの日でも壊れない'],
    diff: [
      { tag: 'add', text: 'if (ordered === 0) return "—"             // 注文ゼロなら割合は出さず横棒' },
      { tag: 'add', text: 'const rate = Math.round((shipped / ordered) * 100) // 百分率に丸める' },
      { tag: 'ctx', text: '// shipped=出荷できた数、ordered=注文数。表示は整数%でよい（荷主向けの概況）。' },
    ],
    aiNote: '充足率を整数%で出しました。注文ゼロの日も落ちません。',
    options: [
      {
        text: 'ordered が0だと0で割ってエラーで落ちる。ゼロ除算のガードが要る',
        issue: false,
      },
      { text: '四捨五入のせいで合計が100%に揃わず、荷主向けの数字が信用を失う', issue: false },
      {
        text: 'shipped が ordered を超えると100%超えの値がそのまま表示され、画面が壊れる',
        issue: false,
      },
      { text: '注文ゼロの表示は "—" より "N/A" の方が荷主に意味が伝わるので、変えるべき', issue: false },
      { text: 'rate を一行で計算しているので、割合の途中値を説明変数に分けて読みやすくすべき', issue: false },
    ],
    takeaway:
      'ガード（ゼロ除算の回避）も丸めも妥当なら、それは健全なコードだ。レビューは“問題を見つける場”であって“問題を作る場”ではない。',
  },
]

/** レビューの1ラウンド：AI差分＋点検すべき選択肢（提示順はシードでシャッフル）。 */
export interface ReviewRound {
  task: string
  /** このPBIの狙い・Why（任意。ある時だけ diff 上段に表示する） */
  intent?: string
  /** 受入条件（Done の定義。1〜3項目。任意）*/
  acceptance?: string[]
  diff: DiffLine[]
  aiNote: string
  options: ReviewFlag[]
  takeaway: string
}

/** PBI id → そのタスク内容に一致するレビュー作問。レビューする PBI に合った題材を出すための索引。 */
const REVIEW_CASE_BY_PBI = new Map<string, ReviewCase>(REVIEW_CASES.map((c) => [c.pbi, c]))

/** ある PBI に一致するレビュー作問があるか（テスト/カバレッジ確認用）。 */
export function hasReviewCaseForPbi(pbiId: string): boolean {
  return REVIEW_CASE_BY_PBI.has(pbiId)
}

/** レビュー作問が紐づく PBI id の一覧（テスト用）。実在しない PBI への孤児作問が無いか検査するのに使う。 */
export function reviewCasePbiIds(): string[] {
  return REVIEW_CASES.map((c) => c.pbi)
}

/** レビューの1ラウンドを選ぶ。
 *  - 通常（variety=false）：pbiId があればそのタスク内容に一致する作問を出す（初回レビュー＝題材一致）。
 *  - variety=true：同じ項目を再レビュー／同じ親PBIの別の作業項目(SBI)をレビューする2回目以降。
 *    まず同じ pbi の"別ケース"を優先して選ぶ（同 pbi に複数ケースがある場合＝別の切り口が出て文脈が繋がる）。
 *    同 pbi に別ケースが無い場合のみ、題材一致を除いた全作問から seed で巡回（フォールバック）。
 *  選択肢はいずれもシャッフルして提示（毎回同じ並びを避ける）。 */
export function dealReview(seed: number, pbiId?: string, variety = false): ReviewRound {
  const n = REVIEW_CASES.length
  const matchedIdx = pbiId ? REVIEW_CASES.findIndex((c) => c.pbi === pbiId) : -1
  const mod = (x: number, m: number) => ((x % m) + m) % m
  // 題材一致が「方向性ズレ（kind:'direction'）を芯に持つ作問」かどうか。これらは教材の主題
  // （“動くか”でなく“狙いに資するか”）を体現する掴みなので、初回は確実に当てたい＝surprise の対象外にする。
  const matchedIsDirection =
    matchedIdx >= 0 && REVIEW_CASES[matchedIdx]?.options.some((o) => o.issue && o.kind === 'direction')
  // 初回でも 1/3（mod(seed,3)===0）は“題材一致”を外して別作問に振る＝「初回＝本物2つ確定」のメタ確定を崩す。
  // ＝初回からも「今回は罠か正味か」を diff を読んで確かめる必要が出る（題材一致の良さは 2/3 で温存）。
  // ただし方向性ズレの主役作問だけは掴みを確実に当てるため surprise しない（detail/LGTM 回のみ振れる）。
  const surprise = !variety && matchedIdx >= 0 && !matchedIsDirection && mod(seed, 3) === 0
  let idx: number
  if (!variety && !surprise && matchedIdx >= 0) {
    idx = matchedIdx // 初回（大半）＝題材一致を出す
  } else if (variety && matchedIdx >= 0 && n > 1) {
    // variety=true：同じ pbi の別ケースを優先。文脈が繋がる（再レビューで同 pbi の別角度が出る）。
    const samePbiIndices = REVIEW_CASES.reduce<number[]>((acc, c, i) => {
      if (i !== matchedIdx && c.pbi === pbiId) acc.push(i)
      return acc
    }, [])
    if (samePbiIndices.length > 0) {
      // 同 pbi の別ケースを seed で決定的に選ぶ
      idx = samePbiIndices[mod(seed, samePbiIndices.length)]
    } else {
      // フォールバック：同 pbi に別ケースが無い＝題材一致を除いた全作問から巡回
      const r = mod(seed, n - 1)
      idx = r >= matchedIdx ? r + 1 : r
    }
  } else if (matchedIdx >= 0 && n > 1) {
    // 初回の"振れ"（surprise）＝題材一致を除いた残りから seed で1つ選ぶ（必ず題材一致と別の作問になる）
    const r = mod(seed, n - 1)
    idx = r >= matchedIdx ? r + 1 : r
  } else {
    idx = mod(seed, n) // 題材一致が無い項目（イベント発PBI等）は全作問から巡回
  }
  const c = REVIEW_CASES[idx]
  const options = shuffle(c.options, seed + 5)
  return {
    task: c.task,
    ...(c.intent !== undefined && { intent: c.intent }),
    ...(c.acceptance !== undefined && { acceptance: c.acceptance }),
    diff: c.diff,
    aiNote: c.aiNote,
    options,
    takeaway: c.takeaway,
  }
}

/** レビューの採点：本物の指摘を拾えたか／空振り（過信・ささい）を出していないか。
 *  realCount＝この作問に実在する本物の指摘数（既定 2）。0 の作問＝コードは健全＝「問題なし(LGTM)」が正解。
 *  great＝拾うべきを全部拾い空振り0（issue0 の回は"LGTMで出す"が great）／poor＝空振り2以上 or 取りこぼし2以上
 *  （疑いすぎ／AIを素通し）／good＝その間。
 *  ＝「本物2つ探す」を固定解にせず、"何も無いのに指摘を捏造する"も"素通し"も同じく戒める。
 *
 *  【重み付け：方向性ズレを細部より重く扱う】
 *  kind:'direction' かつ issue:true の指摘を1つでも見逃すと great にしない（最良でも good）。
 *  ＝「細部を全部拾っても大局（要件の方向性）を落としたら最高評価にしない」。
 *  細部（kind:'detail' または kind未指定）の取りこぼしは従来どおりの寄与。
 *  options（全選択肢）を渡すことで方向性指摘の有無を判定できる（渡さない場合は重み付け無効）。 */
export function scoreReview(
  picked: ReviewFlag[],
  realCount: number = REVIEW_REAL_COUNT,
  options?: ReviewFlag[]
): ExecTier {
  const caught = picked.filter((o) => o.issue).length
  const wrong = picked.filter((o) => !o.issue).length
  const missed = Math.max(0, realCount - caught)

  // 方向性ズレ（kind:'direction' かつ issue:true）を見逃したか確認
  // options が渡された場合のみ判定する（後方互換：options 無しは重み付け無効）
  const directionIssues = options ? options.filter((o) => o.issue && o.kind === 'direction') : []
  const missedDirection = directionIssues.length > 0 && directionIssues.some((d) => !picked.includes(d))

  if (wrong === 0 && missed === 0 && !missedDirection) return 'great'
  if (wrong >= 2 || missed >= 2) return 'poor'
  return 'good'
}

// ───────────────────────────────────────────────────────────
// 深掘りラリー（drill）：「一発の5択」でなく「①問いを選ぶ→②相手の返答→③切り返しを選ぶ」の2段。
// 現場主義の聞き方は"返ってきた言葉を捌いて掘り下げる"ことを手の動きで体験させる（逆転裁判の尋問の手触り）。
// 採点：良い問い+良い切り返し=great / 片方のみ=good / 両方悪い=poor。
// 各問いが自分の返答と自分の切り返し候補を持つ＝①②③が連動する（悪問→はぐらかし→切り返しも別経路）。
// テーマ（HearingTheme）でセット選択：配線イベントが自分のテーマを渡せる＝文脈の噛み合わせ。
// ───────────────────────────────────────────────────────────

/** 深掘りラリー：最初に選ぶ問いの選択肢。各問いが固有の返答と切り返し候補を持つ */
interface DrillQuestion {
  text: string
  /** true＝核心に迫る良い問い（観察・一次情報・現場主義）／false＝誘導・決めつけ・クローズド */
  good: boolean
  /** この問いに対する相手の固有の返答（良問→情報が出る／悪問→沈黙・はぐらかし） */
  response: string
  /** この返答を受けた切り返しの候補（良2/悪2）。1段目の経路に噛み合う */
  followUps: Array<{ text: string; good: boolean }>
  /** ③切り返し選択後に一拍入れる相手の最終リアクション（逆転裁判の崩れる/墓穴の一言）。
   *  onGreat＝両方良（核心が一気に開く）／onMid＝片方だけ良（半歩だけ動く中間反応）／
   *  onPoor＝両方悪（完全に閉じる）。tier と 1:1 で対応する。 */
  finalReactions: { onGreat: string; onMid: string; onPoor: string }
}

/** 深掘りラリーの1問セット（ディールされた後のシャッフル済み表示用） */
export interface DrillSet {
  /** シャッフル済みの問いの候補（良2/悪2） */
  questions: DrillQuestion[]
}

/** テーマ付きの raw DrillSet（プールの内部表現） */
interface RawDrillSet {
  theme: HearingTheme
  questions: DrillQuestion[]
}

// ──── 深掘りラリー コンテンツプール ────

// 思想：相手非依存の汎用プール（dealHearing / PERSUADE_DECK と同じ relationship-agnostic）。
// 特定キャラ名（田淵/橋本/山田/郷田専務 等）は出さず、役割の一般名詞で書く＝場面に居ない人物名が
// 漏れず、将来のリネームにも揺れない。
// 経路連動：良問→相手が事実を出す返答／悪問（誘導・クローズド・決めつけ）→沈黙・はぐらかし・建前の返答。
// 良問の良切り返し＝返答内の言葉を拾って深掘り・事実確認。悪問の良切り返し＝仕切り直して観察・現物へ戻す
// （はぐらかされた後の正しい立て直し）。悪切り返し＝返答を受けずに結論/解決策へ急ぐ・数字で押し切る——
// もっともらしさと長さを持たせ、読まないと割れないようにする（長さで正解が割れない）。
const DRILL_SETS: RawDrillSet[] = [
  // 1. 現場の動き方を掘る（genba：ベテランの手順）
  {
    theme: 'genba',
    questions: [
      {
        text: 'その作業、実際にやって見せてもらえますか？',
        good: true,
        response:
          '「まあ、こんな感じで…（棚を移動しながら）これがうちの順番でな。紙に書いとかないと、夜勤明けに忘れるから」',
        followUps: [
          { text: '夜勤明けに忘れやすいのは、この流れのどのステップですか？', good: true },
          {
            text: '「うちの順番」と言いましたね——それは誰かから教わったのか、自分で決めたのか、どちらですか？',
            good: true,
          },
          {
            // 巧い悪手：返答の「紙に書かないと忘れる」を引用して核心に触れたように見せつつ、観察でなく標準化（紙の廃止）へ論点をすり替える
            text: '「紙に書かないと忘れる」なら、その順番をそのまま画面の入力順に写してしまえば、紙は要らなくなりますよね',
            good: false,
          },
          {
            text: 'なるほど、よく分かりました。では今の手順を一度きれいな手順書に起こして、全員がそれを見て動けるようにしましょう',
            good: false,
          },
        ],
        finalReactions: {
          onGreat: '「…そうか、そこか。一番詰まるのは夜勤明けの引き継ぎの時なんだ（少し表情が和らぐ）」',
          onMid:
            '「紙を無くす、ねえ…（手を止めて）。まあ、そういう話なら、それで合わせますよ。——そういや、棚の電球、また切れてるんだけど。あれ、誰に言えばいいんだ？」（核心の手前で、別の用事に話を逸らす）',
          onPoor: '「…（沈黙）。まあ、そういう考え方もありますね」',
        },
      },
      {
        text: 'いつもと違う順番でやることって、ありますか？',
        good: true,
        response:
          '「ああ、火曜はまとめて来るから、受け取り→検品→戻し入れの順じゃなく、検品をまとめてやるんだ。その方が速い」',
        followUps: [
          { text: 'そのやり方に変えたのは、いつ頃から、何かきっかけがあってですか？', good: true },
          { text: 'まとめてやる方が速い理由は、受け取りと検品、どのステップで時間が変わるんですか？', good: true },
          {
            // 巧い悪手：返答の「その方が速い」を引用して肯定しつつ、現場で確かめずに全曜日へ広げる標準化へ飛ぶ
            text: '「その方が速い」なら、火曜のやり方こそ正解ですね。全曜日に広げて一本化すれば、現場ももっと速くなりますよね',
            good: false,
          },
          {
            text: '速いやり方があるのは助かります。ではその火曜の手順をマニュアル化して、誰がやっても同じ速さになるよう標準にしましょう',
            good: false,
          },
        ],
        finalReactions: {
          onGreat:
            '「そうそう、それ。ある時期から量が増えて、誰かが試してみたら速かったんで、自然にそうなった（記憶を手繰る）」',
          onMid:
            '「全曜日に広げる…？（眉を寄せて）。へえ、月曜も水曜も火曜並みに荷が来るんなら、そりゃ結構な話で。…まあ、そっちで決めるなら、現場は合わせますよ」（皮肉を一つ置いて、それ以上は言わない）',
          onPoor: '「まとめてやる意味が分かってないんだったら……（言葉を切る）」',
        },
      },
      {
        text: 'このやり方、正しいですよね？',
        good: false,
        response: '「…まあ、そうですね」（言葉を選んでいるのか、そこで会話が止まる）',
        followUps: [
          { text: '聞き方を変えます。ここで一番ヒヤッとするのは、一日のどの場面ですか？', good: true },
          { text: '今、少し間がありましたね。引っかかっている所があれば、そのまま教えてください', good: true },
          {
            text: 'ご本人が正しいと言うなら、それが現場の答えでしょう。今のやり方を正式な手順として記録しておきます',
            good: false,
          },
          {
            text: '確認が取れてよかったです。やり方に問題が無いなら、次はこの手順を新人にも展開する話に進めましょう',
            good: false,
          },
        ],
        finalReactions: {
          onGreat: '「（少し間があって）…夜勤明けの切り替わり、あの瞬間だね。言い方を変えてもらって助かった」',
          onMid:
            '「（少し肩の力が抜けて）…まあ、引っかかる所が無いとは言わないですけど。そこまで踏み込んで話す話でも、ないでしょう」（半分だけ開いて、止まる）',
          onPoor: '「…そうですね（それ以上は何も言わなくなる）」',
        },
      },
      {
        text: '手順は、マニュアル通りにやっていますか？',
        good: false,
        response: '「はい、そうです」（それだけ言って、それ以上は話してくれない）',
        followUps: [
          {
            text: 'いったん手元を見せてください。マニュアルに書いてないのに実際やってる事って、ありますか？',
            good: true,
          },
          { text: '一緒に一回流してみましょう。書いてない「コツ」が出てくるかもしれない', good: true },
          {
            text: 'マニュアル通りに回っているなら安心です。では現場は問題なしとして、システム側の改修にリソースを寄せましょう',
            good: false,
          },
          {
            text: 'きちんと守られているようで何よりです。同じ話を別の方にも聞いて、ズレが無いか裏取りだけしておきます',
            good: false,
          },
        ],
        finalReactions: {
          onGreat: '「（手を動かしながら）…この棚番、ここで一回止まるんです。マニュアルにはこの手順、書いてない」',
          onMid:
            '「（手元に視線を落として）…まあ、書いてない事も、無くはないですけど。一回やって見せるほどの事でも、ないですよ」（手を動かしかけて、止める）',
          onPoor: '「…分かりました（視線を外す）」',
        },
      },
    ],
  },
  // 2. 問題の起きる場面を特定する（genba：ミス・トラブルの文脈）
  {
    theme: 'genba',
    questions: [
      {
        text: '前回、困ったのはどの場面でしたか？',
        good: true,
        response:
          '「先週の木曜、夜勤明けの引き継ぎで…品番が近い棚を取り違えて、出荷してから気づいた。慌てて追いかけたけど間に合わなかったよ」',
        followUps: [
          { text: '夜勤明けの引き継ぎでミスが出やすいのは、どの工程の直後が多いですか？', good: true },
          { text: 'その取り違え、引き継ぎ帳に残っていますか？ 一緒に見せてもらえますか？', good: true },
          {
            // 巧い悪手：返答の「夜勤明けの引き継ぎ」を引いて寄り添うふりで、現場を見ずにダブルチェック運用の導入へ飛ぶ
            text: '「夜勤明けの引き継ぎ」が原因とはっきりしましたね。では夜勤明けは二人一組のダブルチェックにすれば、取り違えは止まりますよね',
            good: false,
          },
          {
            text: '間に合わなかったのは悔しいですね。次からは出荷前にもう一段の確認を一人ひとり徹底してもらえれば、同じミスは防げるはずです',
            good: false,
          },
        ],
        finalReactions: {
          onGreat:
            '「（引き継ぎ帳を取り出しながら）…ほらここ。この工程で必ず一回、手が止まる。ずっと言いたかったんだ」',
          onMid:
            '「二人一組、ねえ…（引き継ぎ帳に手をかけたまま）。——その二人目、どこから連れてくるんです？ 夜勤明けの時間に、人、空いてます？ そこが回るなら、こっちは従いますよ」（核心は伏せたまま、逆に問いを返してはぐらかす）',
          onPoor: '「……（引き継ぎ帳を閉じる）。まあ、そうしてみます」',
        },
      },
      {
        text: '何が一番多いミスのパターンですか？',
        good: true,
        response: '「棚番の見間違え。A-1207 と A-1027、数字が似てるから急いでると間違える。疲れてる時は特に」',
        followUps: [
          { text: 'その似た棚番、実際に隣り合ってますか？ 歩いて見せてもらえますか？', good: true },
          { text: '「疲れてる時は特に」と言いましたね——それは一日のどの時間帯に多いですか？', good: true },
          {
            text: '見間違えが原因とはっきりしましたね。では似た棚番のところに大きく注意喚起の貼り紙を増やして、目に入るようにしましょう',
            good: false,
          },
          {
            text: '急いでいると間違える、ということは結局は確認を飛ばす個人の注意の問題ですから、一人ずつ意識を高めてもらう必要がありますね',
            good: false,
          },
        ],
        finalReactions: {
          onGreat: '「（棚に向かって歩きながら）隣、ではないな。でも通路が細くて、急ぐと目線が飛ぶ。来て正解だった」',
          onMid:
            '「貼り紙、ですか…（棚の方を一度見て、足は動かさない）。まあ、増やしておきますよ。——ああ、そういえば、あの棚の照明、ちょっと暗いんです。それくらいは言っておきます」（当たり障りのない一点だけ出して、肝心の通路の話は伏せる）',
          onPoor: '「…（腕を組んで黙る）。貼り紙は、もう貼ってあります」',
        },
      },
      {
        text: 'ミスをしないように、もっと注意してもらえますか？',
        good: false,
        response: '「…努力します」（そう言ったきり、表情が固まる）',
        followUps: [
          { text: '責めたいわけじゃないんです。最近で一番ヒヤッとした瞬間を一つ教えてください', good: true },
          { text: '言い方が悪かったかも。今やってる工夫を、実際の動きで見せてもらえますか？', good: true },
          {
            text: '前向きなお返事ありがとうございます。では各自が注意を一段引き上げる、ということで、この件は一区切りとさせてください',
            good: false,
          },
          {
            text: '気持ちは伝わりました。一人ひとりが今の意識を保ってくれれば数字は落ち着くはずなので、来週またミス件数を一緒に見ましょう',
            good: false,
          },
        ],
        finalReactions: {
          onGreat: '「（少し間があって）…先週、ラベルが剥がれかけてた棚があって。その時、ヒヤッとした」',
          onMid:
            '「（固まっていた肩が少しほどけて）…ヒヤッとした事なら、あるにはありますよ。ただ、忙しい日でしたし、こっちも急いでたし、たまたま重なっただけというか…まあ、いちいち数えてたらキリがないんで」（沈黙の代わりに、言い訳を重ねて核心をぼかす）',
          onPoor: '「…（目線が落ちる）。分かりました」',
        },
      },
      {
        text: 'ミスの原因は、人手不足ですよね？',
        good: false,
        response: '「うーん、まあそれもありますね」（歯切れが悪く、本当のところは別にありそうだ）',
        followUps: [
          {
            text: '「それも」と言いましたね。人手のほかにも気になっている事がありそうですが、どんな事ですか？',
            good: true,
          },
          { text: 'もし人が今の倍いたとして、この取り違えは無くなると思いますか？', good: true },
          {
            text: 'やはり現場は人が足りていないんですね。では増員が要るという声として上に上げて、採用を急ぐよう働きかけます',
            good: false,
          },
          {
            text: '人手の問題なら現場の努力ではどうにもなりませんから、これは体制の話として、まず人を増やす方向で動きましょう',
            good: false,
          },
        ],
        finalReactions: {
          onGreat:
            '「（少し考えてから）…倍いても、あの棚番の見間違えは減らないかな。棚の並びの問題だから（ようやく本音が出た）」',
          onMid:
            '「（少し迷って）…人手だけの話じゃ、ないんですけどね。まあ、人が増えれば楽にはなりますから。それでいいんじゃないですか」（核心の手前で、言葉を濁す）',
          onPoor: '「……そうですね（それ以上は何も言わない）」',
        },
      },
    ],
  },
  // 3. 道具・ツールの使われ方を掘る（genba：システム不使用）
  {
    theme: 'genba',
    questions: [
      {
        text: 'その画面、最後に開いたのはいつですか？',
        good: true,
        response:
          '「…先月の棚卸の時かな。普段は開かない。手書きで計算した方が早いんだよ、この画面入力の方が手間なんだ」',
        followUps: [
          {
            text: 'どこで時間が取られて手書きの方が早くなるのか、一回やって見せてもらえますか？',
            good: true,
          },
          { text: '手書きと画面入力、受け取りから記録まで、どのステップで一番差が出ますか？', good: true },
          {
            // 巧い悪手：返答の「画面入力の方が手間」を引いて寄り添うふりで、原因を見ずに「慣れの問題」へすり替える
            text: '「画面入力の方が手間」なのは、要は慣れですよね。毎日この画面を開く習慣にしてもらえば、自然と手書きより早くなりますよね',
            good: false,
          },
          {
            text: '入力が手間なのはこちらの作りの問題ですね。では使い勝手の改善は要望として控えておいて、今日は別の論点に進めましょう',
            good: false,
          },
        ],
        finalReactions: {
          onGreat:
            '「（手書きノートを広げながら）…ここ。品番を入れる欄だけで3クリックかかる。これが積み重なると、手書きの方が断然早い」',
          onMid:
            '「慣れ、ねえ…（ノートに手をかけたまま）。へえ、毎日開けば手書きより早くなる、と。そりゃ便利な慣れだ。…まあ、そういう事にしておきますか」（軽口で受け流し、ノートは開かない）',
          onPoor: '「……（ノートを閉じる）。慣れの問題ですね、確かに」',
        },
      },
      {
        text: 'システムで一番困っている操作はどこですか？',
        good: true,
        response:
          '「出荷確認のボタンがどこにあるか、毎回迷う。場所が変わる時があって…更新したら違う所に移ってたりする」',
        followUps: [
          { text: 'ボタンの場所が変わるのは、どのくらいの頻度で、どの更新の後に起きていますか？', good: true },
          { text: '迷ったとき、どうやって見つけ出していますか？ 実際にやってみせてもらえますか？', good: true },
          {
            text: '場所が分かりにくいんですね。では出荷確認までの操作を順番に書いた操作マニュアルを作り直して、迷ったらそれを見てもらう形にしましょう',
            good: false,
          },
          {
            text: 'ボタンの位置は更新のたびに整理していくとして、使う側も配置に慣れてくれば迷わなくなるはずなので、しばらく様子を見ましょう',
            good: false,
          },
        ],
        finalReactions: {
          onGreat:
            '「先月の更新の後から変わった。それまでは左上にあったのに。見て（画面を開いて指差す）——今は右の真ん中だ」',
          onMid:
            '「マニュアルを作り直す…（画面に伸ばしかけた手を止めて）。——そのマニュアル、次の更新でボタンがまた動いたら、誰が直すんです？ そこまで面倒見てもらえるんですか。…見てもらえるなら、こっちはそれに従いますよ」（肝心の位置は指さず、問いを返してかわす）',
          onPoor: '「……（視線が泳ぐ）。慣れていくと思います」',
        },
      },
      {
        text: 'システムは使いやすいですよね？',
        good: false,
        response: '「…まあ、慣れれば」（含みのある言い方で、本音ではなさそうだ）',
        followUps: [
          { text: '慣れるまでは大変だった、ということですね。最初はどこで詰まりましたか？', good: true },
          { text: '今でも、ここだけは手書きの方がいい、という作業はありますか？ 見せてください', good: true },
          {
            text: '慣れれば使えるということなら、土台は問題なさそうですね。では現状の作りのまま進めて、定着を待つ方針でいきましょう',
            good: false,
          },
          {
            text: 'お墨付きをいただけて安心しました。使いやすいなら、次はこのシステムを他の工程にも広げる話に進めても良さそうですね',
            good: false,
          },
        ],
        finalReactions: {
          onGreat: '「（引き出しから手帳を取り出して）返品はこれで書いてる。画面に返品の欄、無いから」',
          onMid:
            '「（引き出しに手をかけて）…手書きの方がいい作業も、無くはないですよ。でも、わざわざ出して見せるほどの事じゃ、ないかな」（手帳に伸びた手を、引っ込める）',
          onPoor: '「…（押し黙る）。まあ、そういう形で進めてください」',
        },
      },
      {
        text: 'もっと機能を増やしたら使いやすくなりますか？',
        good: false,
        response: '「そうですね、あれば便利かもです」（社交辞令のようで、本当に欲しいのかは読めない）',
        followUps: [
          { text: 'それが無くて、今実際に困っている場面はありますか？', good: true },
          { text: 'もし機能を一つだけ増やせるとしたら、どれを選びますか？ それはなぜ？', good: true },
          {
            text: '便利になるならぜひ入れましょう。挙がった機能はひととおり要望として上げておくので、次の改修でまとめて足す方向にします',
            good: false,
          },
          {
            text: 'あれば便利という声があるなら、迷わず盛り込んだ方が満足度は上がりますから、思いつく機能を全部入れた画面にしてしまいましょう',
            good: false,
          },
        ],
        finalReactions: {
          onGreat:
            '「（少し考えてから）…今一番困っているのは在庫の検索。品名の一部を入れて絞れないから、全件スクロールしてる」',
          onMid:
            '「一つだけ、と言われると…（少し考えて）。まあ、強いて言えば、印刷が遅いとか、その程度のことなら。本当に困ってるところは、今のままでも回ってますから、無理に挙げるほどでも」（差し障りのない一点だけ出して、本命は伏せる）',
          onPoor: '「……（うなずくだけで何も言わない）」',
        },
      },
    ],
  },
  // 4. 現場の暗黙のルールを引き出す（genba：長年の慣習・属人化）
  {
    theme: 'genba',
    questions: [
      {
        text: 'この棚の並び、どういう理由でこの順になっているんですか？',
        good: true,
        response:
          '「あー、これずっと前に当時の責任者が決めたんだよ。今の流れと全然合ってないんだけど、変えると混乱するから、みんな口をつぐんでてな」',
        followUps: [
          {
            text: '変えると混乱する、というのは、具体的にどこが変わると、どんな混乱が起きると思いますか？',
            good: true,
          },
          { text: '今の流れに合った並びにするなら、どこを一つ変えると一番効くと思いますか？', good: true },
          {
            // 巧い悪手：返答の「変えると混乱する」を引いて現場に寄り添うふりで、観察を打ち切り現状維持へ逃げる
            text: '「変えると混乱する」とご本人が言うなら、相応の理由があるんでしょう。無理に触らず、今のままにしておくのが現場のためですよね',
            good: false,
          },
          {
            text: '今の流れに合っていないなら直すべきです。動線として最適な並びにこちらで組み替えて、すぐ入れ替えてしまいましょう',
            good: false,
          },
        ],
        finalReactions: {
          onGreat:
            '「（棚を指差しながら）…この3列だけ変えれば、出荷の動線が半分になる。ずっとそう思ってたんだけど言えなかった」',
          onMid:
            '「触らない方がいい、ねえ…（棚に向けた指を、下ろして）。本当は変えたい所も、あるんだけどな。まあ、繁忙期も近いし、慣れてる人もいるし、今動かすと現場が混乱するし…ってことなら、無理にとは言わないですよ」（沈黙でなく、動かさない理由を並べてかわす）',
          onPoor: '「……（腕を組んで黙る）。今のままで行きます」',
        },
      },
      {
        text: 'このやり方、誰に教わりましたか？',
        good: true,
        response:
          '「前の担当の人にだよ。でも正直、その人も先代から教わった時とは微妙に変わってるはずだ。誰も正式な手順書を読んでない」',
        followUps: [
          { text: '今のやり方と、先代が教えていた頃のやり方、どこが変わったか分かりますか？', good: true },
          { text: '手順書を最後に読んだのはいつですか？ 今の実態と一行ずつ比べてみましょうか', good: true },
          {
            text: '人づてで少しずつ変わってしまったんですね。では正しい手順書通りにやるよう、改めて全員に指導を徹底してもらいましょう',
            good: false,
          },
          {
            text: '誰も手順書を読んでいないなら、書いてある内容自体が古いはずですから、まず最新版のマニュアルを作り直すところから始めましょう',
            good: false,
          },
        ],
        finalReactions: {
          onGreat:
            '「（手順書を取り出して）見比べると…ここ、検品の順番が逆になってる。これはもう現場のやり方の方が正しいと思う」',
          onMid:
            '「手順書通りに、ねえ…（取り出しかけた手順書を、机に置いて）。今のやり方の方が合ってる所も、あるんだけどな。まあ、書いてある通りに揃えろ、ってことなら」（広げかけた手順書を、閉じる）',
          onPoor: '「……（手順書を元の場所に戻す）。まあ、書き直せばいいんですね」',
        },
      },
      {
        text: 'この方法が正式な手順ですよね？',
        good: false,
        response: '「手順書には、そう書いてあります」（書いてある、と言うだけで、実際の手元の動きとは少し違う）',
        followUps: [
          { text: '「手順書には」という言い方が気になりました。実際は少し違う、ということですか？', good: true },
          { text: '今の手元の動きと手順書を、一緒に突き合わせて、どこがずれているか見てみませんか', good: true },
          {
            text: '手順書に書いてある通りなら、それが正式なやり方ということですね。では現状は手順通りと記録して先に進めます',
            good: false,
          },
          {
            text: '文書に根拠があるなら安心です。手順書が正なので、もし違う動きをしている人がいたら手順書に合わせてもらいましょう',
            good: false,
          },
        ],
        finalReactions: {
          onGreat:
            '「（手元を止めて）…実は、この棚に来たらまず脚立で上を確認するんです。手順書には書いてない。落ちてくる品があるから」',
          onMid:
            '「（手元を一瞬止めて）…書いてある通りと、少し違う所が無いとは言いませんけど。一行ずつ突き合わせるほどの、ずれじゃないですよ」（止めかけた手を、また動かし始める）',
          onPoor: '「……（うなずいて、そのまま作業を続ける）」',
        },
      },
      {
        text: 'みんな同じやり方をしていますか？',
        good: false,
        response: '「そうですね、だいたい」（「だいたい」に力が入っていて、揃ってはいなさそうだ）',
        followUps: [
          { text: '「だいたい」ということは、人によって違う所がありますね。どのあたりが違いますか？', good: true },
          { text: '夜勤と日勤で、やり方が変わる工程はありますか？ 両方見せてもらえますか', good: true },
          {
            text: 'おおむね揃っているなら大きな問題はなさそうですね。細かな差は、全員が同じ手順になるようこちらで統一しておきます',
            good: false,
          },
          {
            text: 'だいたい同じということは標準化はできているわけですから、残りのばらつきは各自で揃えてもらえば十分でしょう',
            good: false,
          },
        ],
        finalReactions: {
          onGreat:
            '「夜勤は、あのベテランが来た時だけ手順が違う。それがないと回せないんだけど、引き継ぎができていない（困ったように言う）」',
          onMid:
            '「（少し言いよどんで）…人によって違う所は、まあ、無くはないですよ。——でも、それ聞いてどうするんです？ 全員同じに揃えろ、って話になるなら、夜勤の人にも同じこと言えます？ そこが固まってるなら、違う所も話しますけど」（挙げる代わりに、逆に質問で押し返す）',
          onPoor: '「……そうですね（それ以上は言わない）」',
        },
      },
    ],
  },
  // 5. 数字の裏を取る（chousa：帳簿と現物の照合）。不正暴露アークの入口に噛む。
  {
    theme: 'chousa',
    questions: [
      {
        text: 'この数字、最後に現物で確かめたのはいつですか？',
        good: true,
        response:
          '「…確かめた記憶がないです。帳簿に入ってるから大丈夫だと思ってたんですが、言われてみると、現物を見た人を知らない」',
        followUps: [
          { text: '現物で確かめるとしたら、どの棚に行って、誰に聞けば在処が分かりますか？', good: true },
          { text: 'この数字が帳簿に入った経緯、原票（発注書や受領書）まで一枚ずつ辿れますか？', good: true },
          {
            // 巧い悪手：返答の「帳簿に入ってるから大丈夫」を引いて確かめたふりで、現物照合を省く理由づけに使う
            text: '「帳簿に入ってるから大丈夫」——確かに、システムが整合を取っているわけですから、現物を一つずつ見に行くまでもなく、この数字で進めて大丈夫ですよね',
            good: false,
          },
          {
            text: '現物確認の記憶が無いのは管理の問題ですね。では在庫の確認は経理に任せて、こちらは報告に必要な数字だけ先にまとめましょう',
            good: false,
          },
        ],
        finalReactions: {
          onGreat:
            '「（受領書の束を探しながら）…これ、受領書の番号が飛んでいます。一枚ずつ見ると、入荷した記録がない日が三日あって」',
          onMid:
            '「（受領書の束に伸ばした手を止めて）…そう言われると、確かに帳簿で進めて差し支えないですね。何か引っかかる気はするんですが…まあ、気のせいでしょう」（探しかけた束を、棚に戻す）',
          onPoor: '「……（帳簿をそっと閉じる）。経理に回しておきます」',
        },
      },
      {
        text: 'この取引、いつ、誰が承認しましたか？',
        good: true,
        response:
          '「伝票だと…承認したのは上の責任者になってますが、ちょっと待って、この日付、その人は出張で社にいなかったはずなんです」',
        followUps: [
          { text: '承認した責任者が不在だったとしたら、実際に判子を押せたのは誰になりますか？', good: true },
          { text: 'その伝票、原本を今すぐ確認できますか？ 印影と日付の整合まで見てみましょう', good: true },
          {
            text: '伝票に承認者の名前が入っている以上、手続き上は通っているわけですから、誰が押したかの裏取りまではしなくても問題ないですよね',
            good: false,
          },
          {
            text: '日付の食い違いは本人に確認すれば済む話ですから、後でその責任者に直接聞いてもらうことにして、今は次の伝票へ進みましょう',
            good: false,
          },
        ],
        finalReactions: {
          onGreat:
            '「（原本を広げて）…印影は確かにある。でも、インクの色が他の伝票と違います。これ、後で押したのかもしれない（声が低くなる）」',
          onMid:
            '「（伝票に置いた指を、止めて）…まあ、名前が入っている以上、手続きは通ってるんですよね。——出張中でも判子だけ先に置いていく人、いますしね。よくある話ですよ。日付の食い違いなんて、どこの会社でも一つや二つ」（深追いせず、ありふれた話に均してかわす）',
          onPoor: '「……（伝票をファイルに戻す）。後で聞いておきます」',
        },
      },
      {
        text: 'これは正しい数字ですよね？',
        good: false,
        response: '「帳簿上は、そうなっています」（「帳簿上は」と前置きするあたり、裏は取れていないらしい）',
        followUps: [
          { text: '今、帳簿上は、と前置きされましたね。現物と突き合わせたことは一度でもありますか？', good: true },
          { text: 'この数字の根拠を、原票（契約書・受領書）まで一緒に辿ってみませんか', good: true },
          {
            text: '帳簿に載っているなら正規の記録ですから、それを正として扱うのが筋でしょう。では帳簿の数字のまま報告を進めます',
            good: false,
          },
          {
            text: 'システムが弾かずに通している数字なら整合は取れているはずですから、現物まで遡らなくても、この値で先に話を進めて大丈夫です',
            good: false,
          },
        ],
        finalReactions: {
          onGreat:
            '「（受領書を手に取って）…ここ。数字が合わない。帳簿には30とあるのに、受領書は17です（息をのむ声）」',
          onMid:
            '「（少し間があって）…現物と突き合わせた事は、正直、ないです。合っているはず、としか。ただ…今ここで原票まで遡るのは、ちょっと（言葉を選びながら、手は伸ばさない）」',
          onPoor: '「……（帳簿を閉じる）。分かりました」',
        },
      },
      {
        text: '承認した責任者が確認しているから大丈夫ですよね？',
        good: false,
        response: '「…そのはずです」（自分で確かめたわけではなさそうで、言葉が濁る）',
        followUps: [
          { text: '「そのはず」ということは、確認した記録や証跡は残っていますか？', good: true },
          { text: '実際に確認した、と分かる記録を、今ここで見せてもらえますか？', good: true },
          {
            text: '上の責任者が目を通している案件なら、現場が改めて疑うような話ではないでしょうから、その判断を信頼して先に進めましょう',
            good: false,
          },
          {
            text: '権限のある人が確認済みということなら、こちらで二重に確かめるのはかえって失礼ですから、問題なしとして次の項目に移ります',
            good: false,
          },
        ],
        finalReactions: {
          onGreat:
            '「（ファイルを探して）…確認記録、見つかりません。承認のスタンプだけあって、誰が何を見たかは、残っていない（目が合う）」',
          onMid:
            '「（少し考えて）…記録、ですか。スタンプはあるんですが、それ以外がすぐ出てくるかは…まあ、たぶんどこかには。今、探し出すのも大変なので」（ファイルに伸ばした手を、引っ込める）',
          onPoor: '「……（黙って目線を外す）。問題ないと思います」',
        },
      },
    ],
  },
  // 6. 改善の定着を現場で確かめる（genba：フィードバックループ・定着確認）
  {
    theme: 'genba',
    questions: [
      {
        text: '先週から変えた部分、実際に使ってみてどうですか？',
        good: true,
        response:
          '「うーん…ボタンが増えたんで最初は戸惑ったけど、夕方の集計は早くなった。でも入庫の時はまだ手書きの方が早い感じがする」',
        followUps: [
          {
            text: '入庫で手書きの方が早いのは、どのクリックがネックですか？ 一緒にやってみてもいいですか？',
            good: true,
          },
          { text: '夕方の集計が早くなったのは、どのステップが変わったからだと思いますか？', good: true },
          {
            // 巧い悪手：返答の「集計は早くなった」を引いて成果を認めるふりで、入庫の手書きが残る理由を見ずに全画面化へ飛ぶ
            text: '「夕方の集計は早くなった」なら、効果は出ていますね。入庫もいずれ慣れますから、この際すべて画面入力に切り替えてもらいましょう',
            good: false,
          },
          {
            text: '良くなった所がある一方で手書きが残っているのは中途半端ですから、思い切って手書きを全廃して、システムに一本化しましょう',
            good: false,
          },
        ],
        finalReactions: {
          onGreat:
            '「（画面を操作しながら）…ここです。品番を確定した後、もう一回確認画面が出る。こっちの作業では毎回「はい」を押すだけなんです」',
          onMid:
            '「全部画面に、ですか…（操作しかけた手を止めて）。へえ、慣れれば手書きより速くなる、と。じゃあ夕方の集計みたいに、入庫も勝手に速くなるんでしょうね、そのうち。…まあ、慣れろ、ってことなら」（軽口で受け流し、画面は開かない）',
          onPoor: '「……（視線を落として）。まあ、そのうち慣れます」',
        },
      },
      {
        text: '改善前と後で、一番変わったのはどの作業ですか？',
        good: true,
        response: '「出荷確認が早くなった。でも入庫登録は逆に手順が増えた気がする。クリックが一個多くて」',
        followUps: [
          { text: 'クリックが一個多いのは、入庫登録のどの画面のどのボタンですか？', good: true },
          { text: 'その一個多いクリック、外せないか、今ここで一緒に確認してみましょうか？', good: true },
          {
            text: '全体では早くなっているなら、クリック一個の差は誤差の範囲ですから、そこは気にせず今の手順のまま続けてもらいましょう',
            good: false,
          },
          {
            text: '手順が増えたのは仕様として必要だからでしょうから、その一個も含めて正しい操作として手順書に追記しておきます',
            good: false,
          },
        ],
        finalReactions: {
          onGreat:
            '「（ボタンをクリックしてみせて）…このキャンセル確認、毎回出るんですが、キャンセルしたことないんです。これが余分な一個です」',
          onMid:
            '「誤差、ですか…（クリックしかけた手を止めて）。——その一個、そちらは一日に何回押します？ ゼロでしょう。こっちは何百回なんですよ。それでも誤差だと言うなら、こっちは合わせますけど」（画面は見せず、問いを返して押し返す）',
          onPoor: '「……（画面を閉じる）。分かりました、そうします」',
        },
      },
      {
        text: '改善後、問題ないですよね？',
        good: false,
        response: '「大丈夫だと思います」（「思います」に引っかかりがあり、何か言いにくそうにしている）',
        followUps: [
          {
            text: '「大丈夫だと思う」と「確実に大丈夫」は少し違いますか？ 気になっている事があれば教えてください',
            good: true,
          },
          { text: '使っていて「ここ、ちょっと引っかかるな」と感じた瞬間はありましたか？', good: true },
          {
            text: '問題ないというお返事をいただけたので、この改善は完了として扱い、次の改善テーマに着手させてもらいます',
            good: false,
          },
          {
            text: '現場から大丈夫とお墨付きが出たなら定着したと言えますから、上には改善完了として報告しておきますね',
            good: false,
          },
        ],
        finalReactions: {
          onGreat:
            '「（少し間があって）…夜勤の人たちが、まだ慣れていないみたいです。引き継ぎの時に聞いたら、使い方が分からないって」',
          onMid:
            '「（少し言いよどんで）…引っかかる所が、無いとは言わないですけど。ボタンの色が見づらい、くらいの話なら言いますよ。本当に気になってるのは…自分のところは回ってますし、わざわざ挙げるほどでも」（軽い一点だけ出して、肝心の所は伏せる）',
          onPoor: '「……（そのまま黙る）。ご報告ありがとうございます」',
        },
      },
      {
        text: '数字は改善しているので、うまくいっていますよね？',
        good: false,
        response: '「そうですね」（短い相づちだけで、具体的なことは話してくれない）',
        followUps: [
          { text: '数字には出ていないかもしれませんが、現場で肌で感じる変化はありますか？', good: true },
          { text: '毎日使っていて「ここが変わったな」と思う瞬間は、どんな時ですか？', good: true },
          {
            text: '指標が改善しているなら成果は出ていますから、現場の細かな感触まで聞かなくても、これは定着完了と判断して良さそうですね',
            good: false,
          },
          {
            text: '数字が良くなっている以上、現場も恩恵を受けているはずですから、満足度は取れていると見て次のテーマに進みましょう',
            good: false,
          },
        ],
        finalReactions: {
          onGreat:
            '「（少し黙ってから）…繁忙期になると、また戻るんじゃないかと思っています。去年もそうだったので（心配そうに言う）」',
          onMid:
            '「肌で、ですか…（少し考えて）。まあ、変わった気はしますけど。数字が良くなってるなら、それでいいんじゃないですか」（言いかけた何かを、相づちに溶かす）',
          onPoor: '「……（うなずくだけ）」',
        },
      },
    ],
  },
  // 7. 帳簿と現物のズレを追う（chousa：差異の出どころを特定）
  {
    theme: 'chousa',
    questions: [
      {
        text: 'その棚卸差異、最初に気づいたのはいつ、どの品でしたか？',
        good: true,
        response:
          '「先々月の{{棚卸}}で、ある高額品が帳簿より数が多かった。誰も発注した覚えがないのに、在庫だけ増えてて…気味が悪くて、そのままにしてました」',
        followUps: [
          { text: '発注した覚えがないのに増えた——その品の入庫記録、どの伝票から入ったか辿れますか？', good: true },
          { text: '同じことが、他の高額品でも起きていませんか？ 一緒に台帳を見てみましょう', good: true },
          {
            // 巧い悪手：返答の「在庫だけ増えてた」を引いて受け止めるふりで、出どころを追わず帳簿を実数に合わせる帳尻合わせへ逃げる
            text: '「在庫だけ増えてた」のなら、欠品より困りませんよね。出どころを掘るより、帳簿を実数に合わせて直してしまえば早いですよね',
            good: false,
          },
          {
            text: '気味が悪いのは分かりますが、原因不明のまま放っておくと監査で困りますから、ひとまず差異を正しい数に直して帳尻だけ合わせましょう',
            good: false,
          },
        ],
        finalReactions: {
          onGreat: '「（台帳を広げて）…同じ品番で、先月もある。先々月もある。発注書はどこにも無い（声が低くなる）」',
          onMid:
            '「（台帳に手をかけたまま）…帳尻を合わせれば、確かに早いですね。出どころは…気にはなりますけど、掘ったところで、という気もしますし」（広げかけた台帳を、半分で止める）',
          onPoor: '「……（台帳を閉じる）。分かりました、修正しておきます」',
        },
      },
      {
        text: 'この記録、事実と推測のどこまでが確かめられた話ですか？',
        good: true,
        response:
          '「…正直、ここからは聞いた話です。本部の人間がそう言っていた、というだけで、私自身が現物や原本を見たわけじゃありません」',
        followUps: [
          { text: '本部から聞いた話はどこまでで、ご自身で現物や原本を確かめた所はどこからですか？', good: true },
          { text: '聞いた話の元になった原本、こちらで直接見せてもらうことはできますか？', good: true },
          {
            text: '本部がそう言っているなら情報源としては十分しっかりしていますから、それを前提にこちらの分析を進めても問題ないですよね',
            good: false,
          },
          {
            text: '伝聞でも筋は通っていますから、いちいち原本まで遡らず、その説明を事実として扱って報告をまとめてしまいましょう',
            good: false,
          },
        ],
        finalReactions: {
          onGreat:
            '「（原本を取り出して）…ここまでは私が確かめました。ここから先は、本部に聞いてみないと分からない（ページを指差す）」',
          onMid:
            '「（取り出しかけた原本に、手を添えたまま）…本部の話を前提にしていい、と言われるなら、それで進められますね。——でも、後で「なぜ確かめなかった」って話になったら、それ、私の責任になります？ そこがはっきりするなら、境目はどこでも構いませんよ」（境目を示す代わりに、責任の所在を問い返してはぐらかす）',
          onPoor: '「……（うなずく）。そうします」',
        },
      },
      {
        text: '帳簿が合っているなら、深く追わなくていいですよね？',
        good: false,
        response: '「ええ、合っていますから」（合っている、で話を終わらせたそうな様子だ）',
        followUps: [
          { text: '合っている、で止めずに——その「合っている」は現物で一度でも確かめた数字ですか？', good: true },
          { text: '帳簿が合うように後から数字を足した、ということは無いか、原票で辿らせてください', good: true },
          {
            text: 'おっしゃる通り、最終的に帳簿が合っているなら経理上の問題はありませんから、これ以上は時間をかけず、この件は片付いたものとしましょう',
            good: false,
          },
          {
            text: '突き合わせの結果が一致しているなら裏は取れているも同然ですから、原票まで遡る手間はかけずに、合致という事実だけ記録に残します',
            good: false,
          },
        ],
        finalReactions: {
          onGreat:
            '「（しばらく間があって）…確かめた記憶が、ないです。帳簿を合わせた人間は私ではなくて（声が小さくなる）」',
          onMid:
            '「（少し間があって）…現物で確かめたか、と言われると…まあ、月末は立て込んでますし、原票も倉庫の奥にしまってあって、出すだけで半日仕事で。合ってるなら、わざわざ、という感じで」（沈黙でなく、辿らない理由を並べてかわす）',
          onPoor: '「……（それ以上は何も言わない）」',
        },
      },
      {
        text: 'これはもう、不正と考えていいですよね？',
        good: false,
        response: '「…そう決めつけられても、困ります」（相手が身構え、口が重くなる）',
        followUps: [
          {
            text: '決めつけて聞いてしまい失礼しました。まず、いつ・誰の時に起きたか事実だけ整理させてください',
            good: true,
          },
          { text: '結論はいったん置きます。事実・推測・願望を分けて、確かめられた所だけ拾い直しましょう', good: true },
          {
            text: 'これだけ不自然な点が揃っているなら、もう不正と見て間違いないでしょうから、誰の仕業かを特定する方向で一気に詰めていきましょう',
            good: false,
          },
          {
            text: '状況証拠は十分ですから、ここで時間をかけるより、不正という前提で対策と再発防止をまとめてしまった方が話が早いですよね',
            good: false,
          },
        ],
        finalReactions: {
          onGreat:
            '「（少し表情が和らいで）…決めつけられると、何も言えなくなるので。事実から、なら。——一つだけ。あの増えた品が動いた日、私は夜勤明けで現場にいなかった。記録にもそう残っています」',
          onMid:
            '「（少し身構えが解けて）…決めつけないでもらえるのは、ありがたいです。ただ…どこまで話していいものか。事実だけ、と言われても、線引きが難しくて」（口を開きかけて、また閉じる）',
          onPoor: '「……（目が合わない）。分かりました」',
        },
      },
    ],
  },
  // 8. 承認の裏を取る（chousa：承認フロー・証跡）
  {
    theme: 'chousa',
    questions: [
      {
        text: 'この支払い、どの承認を通って実行されましたか？',
        good: true,
        response:
          '「通常は二人の承認が要るんですが…この件は一人だけで通ってます。しかも金額が、一人で決裁できる上限のすぐ下に揃えてあって」',
        followUps: [
          { text: '上限のすぐ下に揃えてあるのは、この一件だけですか？ 似た金額が他にもありますか？', good: true },
          { text: '本来あるべき二人目の承認、なぜ省かれたのか、当時の記録から辿れますか？', good: true },
          {
            // 巧い悪手：返答の「一人で通ってる／上限のすぐ下」を引いて拾ったふりで、額の揃え方の不自然さを見ずに規程内＝問題なしへ逃げる
            text: '「一人で通ってる」と言っても、上限の範囲内なら規程違反ではありませんよね。額が際どいだけで、手続き自体は問題なしとしていいですよね',
            good: false,
          },
          {
            text: '上限内なら通って当然の処理ですから、深掘りはこのくらいにして、運用上は二人承認を徹底する、という再発防止だけ決めておきましょう',
            good: false,
          },
        ],
        finalReactions: {
          onGreat:
            '「（伝票を並べながら）…三件あります。全部、同じ人の承認で、同じ金額帯で。時期も近い（目を細める）」',
          onMid:
            '「（並べかけた伝票を、一枚だけ残して）…上限の範囲内、と言われれば、確かに規程違反ではないんですよね。額が際どいのは…まあ、たまたま、かもしれませんし」（広げかけた伝票を、そろえて戻す）',
          onPoor: '「……（伝票をそろえてファイルに戻す）。確認しておきます」',
        },
      },
      {
        text: 'この承認印、本人が押したと分かる記録はありますか？',
        good: true,
        response:
          '「印影はあります。でも…誰がいつ押したかのログは残っていません。判子は引き出しに置いてあって、正直、誰でも押せる状態でした」',
        followUps: [
          { text: '誰でも押せた状態だったなら、この印が本人の意思だったか、別の証跡で確かめられますか？', good: true },
          { text: '判子が引き出しにあった期間、その鍵や場所に触れられたのは誰でしたか？', good: true },
          {
            text: '印影という物証がある以上、形式上は承認が成立していますから、誰が押したかまで疑い出すときりがないので、有効として扱いましょう',
            good: false,
          },
          {
            text: '判子の管理が甘かったのは確かですから、そこは今後ログを取る運用に改めるとして、過去分は印影があるものを承認済みと見なしましょう',
            good: false,
          },
        ],
        finalReactions: {
          onGreat:
            '「（しばらく間があって）…その期間、引き出しの鍵は職場に置きっぱなしでした。誰でもいつでも、開けられた（静かに言う）」',
          onMid:
            '「（判子に手をかけたまま）…印影がある以上、形としては成立してる、と言われれば、そうなんですよね。——うちの判子、どこの引き出しも似たようなもんですよ。ログ取ってる会社なんて、そうそう無いでしょう。これだけ特別に疑うのも、ねえ」（深追いせず、よくある話に均してかわす）',
          onPoor: '「……（判子を引き出しに戻す）。今後は気をつけます」',
        },
      },
      {
        text: '承認が下りているなら、手続きは正しいですよね？',
        good: false,
        response: '「承認は、下りています」（「下りている」を繰り返すばかりで、中身には触れない）',
        followUps: [
          { text: '承認が下りた事実は分かりました。その承認の根拠になった資料は、今も残っていますか？', good: true },
          { text: '「下りている」で止めず——誰が何を見て承認したのか、当時の経緯を辿らせてください', good: true },
          {
            text: '正規の承認が下りているなら、それ以上こちらが立ち入る筋合いはありませんから、手続きは正常に完了したものとして処理を進めます',
            good: false,
          },
          {
            text: '決裁が通っている以上は社として認めた取引ですから、後から外野が中身を蒸し返すのは角が立ちますし、承認済みとして閉じましょう',
            good: false,
          },
        ],
        finalReactions: {
          onGreat:
            '「（ファイルを探して）…根拠の資料、見つかりません。承認スタンプだけあって、何を見て押したのかは、記録に残っていない」',
          onMid:
            '「根拠の資料、ですか…（ファイルに伸ばした手を、止めて）。——それ、出てきたとして、誰が困るんです？ 承認は下りてるんですし。蒸し返して得する人、いますか？ そこがはっきりするなら、探しますけど」（資料を出す代わりに、問いを返して掘り返しを牽制する）',
          onPoor: '「……（それ以上は言わない）」',
        },
      },
      {
        text: '本部の人間が承認したなら、間違いないですよね？',
        good: false,
        response: '「本部のことは、私には分かりかねます」（関わりたくなさそうに、目を逸らす）',
        followUps: [
          { text: '本部の判断は脇に置きます。あなたが実際に見た書類と、聞いた話を分けて教えてください', good: true },
          { text: '分かる範囲で構いません。この承認、現場に回ってきた時には何が添付されていましたか？', good: true },
          {
            text: '本部が承認した案件なら現場の一存で疑うべきではありませんから、その判断を尊重して、こちらは指示通りに処理を進めましょう',
            good: false,
          },
          {
            text: '上位の組織が通した取引に下から異を唱えるのは越権ですから、本部承認という事実をもって、この件は適正だったと整理します',
            good: false,
          },
        ],
        finalReactions: {
          onGreat:
            '「（少し声を落として）…現場に来た時は、添付書類が一枚もなかった。承認スタンプだけ押してあって、根拠を見ていない」',
          onMid:
            '「（逸らしかけた目を、少し戻して）…現場に回ってきた時の事なら、話せます。何が付いていたか…いや、それを言い出すと、本部の話に踏み込むことに、なりますし」（言いかけて、また目を伏せる）',
          onPoor: '「……（目を伏せる）。そうですね」',
        },
      },
    ],
  },
  // 9. 依頼主の期待を確かめる（kokyaku：約束と本当のゴール。s2-daily-exception のフォールバック＝kokyaku に噛む）
  {
    theme: 'kokyaku',
    questions: [
      {
        text: 'この依頼で、最後に「成功した」と言える状態は、具体的にどうなった時ですか？',
        good: true,
        response:
          '「…改めて聞かれると、はっきり決めてなかったですね。とにかく現場のミスを減らしたい、とは経営に言ったんですが、どこまで減れば合格かは、詰めてません」',
        followUps: [
          { text: '経営にした約束、具体的にどの数字でどこまで、と握っていますか？', good: true },
          { text: '一番避けたい最悪の事態は何ですか？ そこから逆算して合格ラインを決めませんか', good: true },
          {
            // 巧い悪手：返答の「合格ラインは詰めてない」を引いて受け止めるふりで、定義を後回しにして着手＝見える進捗へ逃げる
            text: '「合格ラインは詰めてない」とのことですが、方向は合っていますよね。まずは作れるものから着手して、走りながら基準を固めていきましょう',
            good: false,
          },
          {
            text: '経営に約束した手前、止まると体裁が悪いですから、合格ラインの議論は後回しにして、見える成果を先に一つ出してしまいましょう',
            good: false,
          },
        ],
        finalReactions: {
          onGreat:
            '「（少し考えて）…そうですね、誤出荷が月に一件以下になれば、経営への顔は立つ。そこまで具体的に決めていなかった（ようやく表情が緩む）」',
          onMid:
            '「走りながら、ですか…（少し考えかけて）。まあ、方向は合ってますし、それでもいいんですけど。合格ラインを今ここで決めるより、動いてるところを見せた方が、上の手前は楽かもしれませんね」（言いかけた基準を、後回しにする）',
          onPoor: '「……（黙り込む）。まあ、走りながら決めていく形で」',
        },
      },
      {
        text: 'いま一番気にされているのは、誰の目ですか？',
        good: true,
        response:
          '「正直に言うと…経営です。投資を通した手前、来月のレビューで数字を見せろと言われていて。現場のためというより、その報告に間に合わせたい、というのが本音かもしれません」',
        followUps: [
          { text: '来月のレビューで見せる数字、今そこに出せる事実はどこまで揃っていますか？', good: true },
          { text: '報告のための数字と、現場が本当に楽になることは、両立できそうな所はありますか？', good: true },
          {
            text: '経営への報告が最優先なら話は単純です。レビューで見栄えする指標を一つ決めて、そこが伸びるように開発を全部寄せてしまいましょう',
            good: false,
          },
          {
            text: 'スポンサーの期待に応えるのが筋ですから、現場の細かい事情は一旦脇に置いて、まず数字が動いて見える施策から手を付けましょう',
            good: false,
          },
        ],
        finalReactions: {
          onGreat:
            '「（少し迷ってから）…今出せる事実は、先月の誤出荷が3件減ったこと。現場が楽になったとは、まだ言えない（正直に言う）」',
          onMid:
            '「見栄えする指標に寄せる、ですか…（少し迷って）。レビューも近いですし、上も数字を待ってますし、ここで現場の話を持ち出すと話がややこしくなりますしね。…まあ、現場は後からでも、ついてくるでしょうし」（本音を伏せ、寄せざるを得ない事情を並べてかわす）',
          onPoor: '「……（目を逸らす）。そうですね、両立できれば理想ですが」',
        },
      },
      {
        text: 'この機能さえあれば、満足いただけますよね？',
        good: false,
        response: '「まあ、あれば嬉しいですけど…」（語尾を濁し、本当に欲しいのかは伝わってこない）',
        followUps: [
          {
            text: '「あれば嬉しい」と「無いと困る」は別ですよね。それが無くて困った場面は実際にありましたか？',
            good: true,
          },
          { text: '聞き方を変えます。今この瞬間、一番困っているのはどの業務ですか？', good: true },
          {
            text: '満足いただけそうで安心しました。ではこの機能を最優先の要望として握って、まずはこれを作りきる方向で進めさせてください',
            good: false,
          },
          {
            text: '欲しいというお気持ちがあるなら、迷わず作った方が喜ばれますから、要望として確定で受けて、次の打ち合わせは仕様の詰めに使いましょう',
            good: false,
          },
        ],
        finalReactions: {
          onGreat:
            '「（少し考えて）…今、一番困っているのは返品の入力です。件数が多い日は、処理が翌日に溢れてしまう（言葉が出てきた）」',
          onMid:
            '「困った場面、と言われると…（少し考えて）。——逆に聞きますけど、それ作るのに、どれくらいかかるんです？ 何ヶ月もかかるなら、今すぐ困ってるってほどでもないですし。あれば嬉しい、くらいの話ですよ」（具体を出さず、コストを問い返してぼかす）',
          onPoor: '「……（うなずく）。では、そういう方向で」',
        },
      },
      {
        text: '予算は気にせず、理想を全部詰め込む方向でいいですよね？',
        good: false,
        response: '「理想を言えばキリがないですし…そう言われると、かえって何を頼めばいいか分からなくなりますね」',
        followUps: [
          { text: 'すみません、広げすぎました。理想は一旦置いて、今期どうしても外せない一つは何ですか？', good: true },
          { text: '全部ではなく、最初に効く一手から始めるとしたら、どこに価値がありますか？', good: true },
          {
            text: '何を頼めばいいか迷われるなら、こちらで良さそうな機能をひととおり盛り込んだ案を作りますので、それを叩き台に全部入りで進めましょう',
            good: false,
          },
          {
            text: '予算の枠があるうちに広く作っておいた方が後で困りませんから、思いつく要望はこの際すべてリストに入れて、まとめて開発しましょう',
            good: false,
          },
        ],
        finalReactions: {
          onGreat:
            '「（少し間があって）…一つ、と言われると、やっぱり検品のところですね。ここが詰まると全部が後ろ倒しになるから」',
          onMid:
            '「外せない一つ、ですか…（少し考えて）。一つに絞れたら、こっちも苦労してないんですけどね。全部外せないから、こうして困ってるわけで。…まあ、選ぶのはそちらの方がお上手でしょう」（軽口で受け、肝心の優先順位は預けてかわす）',
          onPoor: '「……（少し苦笑して）。こちらにお任せします」',
        },
      },
    ],
  },
  // 10. 矛盾だらけの例外ルールを解く（kokyaku：なぜその例外があるのか。s2-daily-exception に噛む）
  {
    theme: 'kokyaku',
    questions: [
      {
        text: 'その「火曜だけ手順が違う」のは、いつ頃から、何があってそうなったんですか？',
        good: true,
        response:
          '「もう何年も前です。火曜だけ大口の入荷が重なる日があって、その時の捌き方がそのまま残った。今もその大口が来るのかは…正直、誰も確かめてない」',
        followUps: [
          { text: '今もその大口が来るのか誰も確かめていない——直近の火曜、実際の入荷量を見てみませんか', good: true },
          { text: 'その例外を外したら、どの業務の何が崩れるか、具体的に思い当たりますか？', good: true },
          {
            // 巧い悪手：返答の「もう確かめてない」を引いて拾ったふりで、実物を見ずに「実態に合っていない」と断じ廃止へ飛ぶ
            text: '「もう誰も確かめてない」のなら、実態に合っていないということですよね。火曜の特別扱いは廃止して、他の曜日と同じ手順に揃えてしまいましょう',
            good: false,
          },
          {
            text: '例外が多いほど現場は混乱しますから、一つひとつの事情を追うより、まず全部を標準手順に一本化して、不都合が出たら個別に戻す方が早いですよね',
            good: false,
          },
        ],
        finalReactions: {
          onGreat:
            '「（先週の火曜の伝票を手繰って）…これ、入荷量、平日と同じです。もう大口は来ていない。ずっと見直すタイミングを探していた（ほっとした様子）」',
          onMid:
            '「廃止、ですか…（伝票に伸ばした手を、止めて）。実物を見ないで無くすのは、ちょっと怖いんですけどね。まあ、揃えた方が楽だ、というなら、それでも」（手繰りかけた伝票を、戻す）',
          onPoor: '「……（うなずく）。そのまま残しておきます」',
        },
      },
      {
        text: 'その「別ルートで通す客」、決めたのは誰で、外すと何が崩れますか？',
        good: true,
        response:
          '「先方の担当者からの強い要望で、当時の責任者が口頭で決めたんです。書面には残っていない。外したら先方が怒る、とだけ言い伝えられていて、理由までは聞いてません」',
        followUps: [
          { text: '外したら怒る、というその理由、先方に一度きちんと確かめたことはありますか？', good: true },
          { text: '口頭の言い伝えだけなら、当時を知る人に当たって、元の要望の中身を辿れますか？', good: true },
          {
            text: '先方が怒るリスクがあるなら触らぬ神に祟りなしですから、理由は分からなくても、この別ルートはそのまま残しておくのが無難ですよね',
            good: false,
          },
          {
            text: '一顧客のための例外が業務を複雑にしているわけですから、いっそ先方に一律ルールへの移行をお願いして、特別扱いを解消しましょう',
            good: false,
          },
        ],
        finalReactions: {
          onGreat:
            '「（思い当たった様子で）…先方に直接聞いたことは一度もないです。当時の担当者に聞いてみます。本当の理由を誰も知らないかもしれない」',
          onMid:
            '「触らぬ神、ですか…（少し考えて）。当時を知る人ももう辞めてますし、書面も残ってませんし、先方に今さら蒸し返すのも角が立ちますしね。確かめる、というのは…まあ、藪蛇かもしれません」（沈黙でなく、確かめない理由を並べてかわす）',
          onPoor: '「……（沈黙）。そのままにしておきます」',
        },
      },
      {
        text: 'こういう例外は混乱の元なので、全部一律に揃えていいですよね？',
        good: false,
        response: '「…まあ、揃った方が楽は楽ですけど」（同意とも諦めともつかない、歯切れの悪い返事だ）',
        followUps: [
          {
            text: '楽になる一方で、無くなると困る例外もありそうですね。一つだけ挙げるとしたら、どれですか？',
            good: true,
          },
          {
            text: '一律にする前に、それぞれの例外が何のために生まれたのか、現場で一周確かめさせてください',
            good: true,
          },
          {
            text: 'ご本人も揃った方が楽だとおっしゃるなら、方針は決まりですね。では例外は全廃して、来週から一律の手順に切り替えましょう',
            good: false,
          },
          {
            text: '現場の同意も取れましたから、迷う必要はありません。複雑な例外は思い切って一掃して、シンプルな標準ルールに統一してしまいましょう',
            good: false,
          },
        ],
        finalReactions: {
          onGreat:
            '「（少し考えてから）…あの取引先は特殊な梱包を要求してくる。それだけは残さないと、出荷した瞬間に着荷で問題になる」',
          onMid:
            '「無くなると困る例外、ですか…（少し考えて）。まあ、伝票の綴じ方が部署で違う、くらいの細かい話なら、いくつか。本当に外せないやつは…揃えた方が楽なのは確かですし、わざわざ挙げるほどの事でも」（無難な一つだけ出して、肝心の例外は伏せる）',
          onPoor: '「……（力なくうなずく）。分かりました」',
        },
      },
      {
        text: '20年も続いた手順なんて、ただの惰性ですよね？',
        good: false,
        response: '「惰性、ですか…」（言葉に詰まり、それ以上は何も言わなくなる）',
        followUps: [
          { text: '言い過ぎました。惰性かどうかは置いて、その手順で過去に救われた場面はありましたか？', good: true },
          { text: '決めつけずに聞き直します。この手順が無かったら、どんな事故が起きそうですか？', good: true },
          {
            text: '長く続いただけで中身を疑われていないなら、やはり惰性でしょうから、根拠の無い手順は思い切って捨てて身軽になりましょう',
            good: false,
          },
          {
            text: '惰性で続いている手順に時間を割く価値はありませんから、一つずつ理由を聞くより、まとめて廃止して必要なものだけ後から拾い直しましょう',
            good: false,
          },
        ],
        finalReactions: {
          onGreat:
            '「（少し間があって）…10年前、この手順が無かった時期があって。その時に一件、大きな誤出荷があった。それで戻した（静かに言う）」',
          onMid:
            '「（詰まっていた言葉が、少しほどけて）…救われた場面が、無かったとは言いませんけど。へえ、20年続いたものは全部惰性、ですか。よく言われますよ、それ。昔を知らない人にね。…まあ、いいです」（軽くいなして、肝心の出来事は語らない）',
          onPoor: '「……（沈黙が続く）」',
        },
      },
    ],
  },
  // 11. 任せる線を見極める（kokyaku：権限委譲・任せ方の不安）
  {
    theme: 'kokyaku',
    questions: [
      {
        text: 'この判断、現場に任せると一番不安なのは、具体的にどの場面ですか？',
        good: true,
        response:
          '「金額の大きい返品の扱いですね。判断を間違えると、後で取り返しがつかない。だから今は全部、私が一件ずつ確認していて…正直それで手が回らなくなってます」',
        followUps: [
          { text: '取り返しがつかないのは、いくら以上のどんな返品ですか？ 線を一緒に引きましょう', good: true },
          { text: '今ご自身が一件ずつ見ている確認、どこまでなら任せても戻せるか、整理できますか', good: true },
          {
            // 巧い悪手：返答の「間違えると取り返しがつかない」を引いて寄り添うふりで、線を引かず全件確認の現状維持＝負担放置へ逃げる
            text: '「間違えると取り返しがつかない」のなら、無理に任せない方が安全ですよね。今まで通りご自身で全件確認を続ける運用を維持しましょう',
            good: false,
          },
          {
            text: '手が回らないのが問題なら話は早いです。判断はすべて現場に下ろして任せきってしまえば、あなたの負担は一気に消えますよね',
            good: false,
          },
        ],
        finalReactions: {
          onGreat:
            '「（少し間があって）…5万円以上は私が見る、それ以下は任せる——それなら引き継げそうです。そこまで具体的に考えたことがなかった（表情が少し和らぐ）」',
          onMid:
            '「今まで通り、ですか…（少し考えて）。間違えると取り返しがつかないなら、確かに私が全部見るのが安全ですよね。手は回らないままですけど…まあ、それは仕方ない、ということで」（引きかけた線を、引かずに止める）',
          onPoor: '「……（黙り込む）。現状維持でいきます」',
        },
      },
      {
        text: 'もし任せて失敗したら、影響はどこまで及びますか？',
        good: true,
        response:
          '「小さい注文なら、間違えてもその場で直せます。でも大口だと、出荷した後だと取引先にまで響く。そこの線引きが、今は人によってバラバラなんです」',
        followUps: [
          { text: '「その場で直せる」範囲と「取引先に響く」範囲、どの金額・工程で分かれますか？', good: true },
          { text: '人によってバラバラな線引き、実際の判断例をいくつか見せてもらえますか', good: true },
          {
            text: '影響が読めるなら心配は要りません。多少失敗しても直せるわけですから、まずは全件まとめて現場に任せて、走りながら覚えてもらいましょう',
            good: false,
          },
          {
            text: '線引きが人によって違うのが混乱の元ですから、細かい事情は問わず、一律の金額で機械的に区切って運用してしまえば早いですよね',
            good: false,
          },
        ],
        finalReactions: {
          onGreat:
            '「（先月の判断履歴を引き出して）…この三件、担当によって扱いが全部違う。同じ金額帯なのに（自分でも気づいていなかった様子）」',
          onMid:
            '「一律の金額で区切る、ですか…（履歴に伸ばした手を、止めて）。——その線で大口を取りこぼして取引先に響いたら、それ、誰が謝りに行くんです？ 私ですか、そちらですか。そこが決まってるなら、一本でも構いませんよ」（工程差は伏せ、責任の所在を問い返してかわす）',
          onPoor: '「……（うなずく）。そうします」',
        },
      },
      {
        text: '優秀な担当者なんだから、全部任せて大丈夫ですよね？',
        good: false,
        response: '「…まあ、あの人なら大丈夫だとは思いますが」（言葉とは裏腹に、どこか不安が残る言い方だ）',
        followUps: [
          {
            text: '「思いますが」に少し迷いがありますね。一つだけ任せるのが怖い判断があるとしたら何ですか？',
            good: true,
          },
          { text: '優秀さに頼る前に——その人が休んだ日でも回る形になっているか、見ておきませんか', good: true },
          {
            text: '信頼できる人なら任せない方がもったいないですから、迷わず全権を渡して、こちらは結果だけ受け取る形にしてしまいましょう',
            good: false,
          },
          {
            text: '能力のある人に細かく口を出すのはかえって失礼ですから、すべて一任して、問題が起きた時だけ報告してもらう運用にしましょう',
            good: false,
          },
        ],
        finalReactions: {
          onGreat:
            '「（少し考えてから）…返品の承認だけは怖い。その人、まだ一度も大口を処理したことが無いので（率直に言う）」',
          onMid:
            '「怖い判断、ですか…（少し言いよどんで）。一つ、無くはないんですが。本人の前で言うのも悪いですし、まだ起きてもいない話ですし、口にして変に身構えられても困りますしね。…まあ、あの人なら大丈夫でしょう」（沈黙でなく、言えない理由を並べて核心を避ける）',
          onPoor: '「……（静かに頷く）。では、お任せします」',
        },
      },
      {
        text: '失敗したら、その時に考えればよくないですか？',
        good: false,
        response: '「それは…そうなんですけど」（割り切れない様子で、言葉が続かない）',
        followUps: [
          { text: '行き当たりばったりにしない為に——失敗した時に戻せる経路だけ、先に用意しておきませんか', good: true },
          { text: '「その時」が手遅れにならないよう、どこまでなら取り返しがつくか線を引かせてください', good: true },
          {
            text: '起きてもいない失敗を心配して動けないのが一番の損ですから、まず全部任せて走り出して、問題が出たらその都度対処すれば十分ですよね',
            good: false,
          },
          {
            text: '備えに時間をかけるより実行が先ですから、戻し方の検討は後回しにして、まずは任せて成果を出すことを優先しましょう',
            good: false,
          },
        ],
        finalReactions: {
          onGreat:
            '「（少し表情が変わって）…戻せる経路か。考えたことがなかった。出荷前に一回止める関所だけ、残せないか（考え始める）」',
          onMid:
            '「戻せる経路、ですか…（少し考えかけて）。あった方がいい気はするんですけど。まあ、起きてから考えても、そう手遅れにはならないでしょうし」（考え始めかけて、途中で止める）',
          onPoor: '「……（言葉が出ない）。そうですね」',
        },
      },
    ],
  },
  // 12. 機会の価値を見極める（chance：今やる価値・小さく試す）
  {
    theme: 'chance',
    questions: [
      {
        text: 'この話、今やる価値はどこにありますか？ 後回しにすると何が起きますか？',
        good: true,
        response:
          '「実は来月、繁忙期に入るんです。今のうちに手を打たないと、その波の中でミスが一気に増える。逆に言えば、今やれば一番効く時期ではあります」',
        followUps: [
          { text: '繁忙期にミスが増えるのは、過去の実績で言うとどの工程・どのくらいですか？', good: true },
          { text: '繁忙期まで日が無いとして、小さく試すなら、どこから始めれば一番効きますか？', good: true },
          {
            // 巧い悪手：返答の「今やれば一番効く」を引いて勢いに乗るふりで、小さく試す検証を飛ばして全部入りの本番版へ突っ走る
            text: '「今やれば一番効く」とおっしゃるなら、迷う時間が惜しいですよね。構想を全部盛り込んだ本番版を一気に作って、繁忙期に間に合わせましょう',
            good: false,
          },
          {
            text: 'タイミングを逃すと損ですから、検証に時間をかけるより、効きそうな施策をまとめて一斉に投入して、波が来る前に押し切ってしまいましょう',
            good: false,
          },
        ],
        finalReactions: {
          onGreat:
            '「（昨年の繁忙期のデータを探しながら）…ここ。去年の10月、この2週間だけで誤出荷が平時の3倍になってる。この山が来る前に、一つだけ試せる（少し前のめりになる）」',
          onMid:
            '「全部一気に、ですか…（探しかけたデータから、手を離して）。時間が惜しいのは確かですからね。小さく試してから、と思ってたんですが…まあ、間に合わせるなら、それしかないか」（前のめりになりかけて、座り直す）',
          onPoor: '「……（データを閉じる）。そうですね、全部入れてみます」',
        },
      },
      {
        text: 'それは、誰の役にいちばん立ちますか？',
        good: true,
        response:
          '「いちばんは、夜勤の人たちですね。日中と違って聞ける相手がいないから、判断に迷う場面が多くて…でも、その声はこれまで上に届いてこなかった」',
        followUps: [
          { text: '上に届いてこなかった夜勤の迷い、具体的にどの判断で詰まるのか聞けますか？', good: true },
          { text: '夜勤の人に一番効く一手から始めるとしたら、何を小さく試せそうですか？', good: true },
          {
            text: '困っている人がはっきりしているなら答えは出ています。夜勤向けの機能を一通りそろえて、まとめて提供してあげれば喜ばれますよね',
            good: false,
          },
          {
            text: '声が届いていなかったぶん、ここで大きく応えた方がインパクトがありますから、小さく試すより最初から本格的な仕組みを入れてしまいましょう',
            good: false,
          },
        ],
        finalReactions: {
          onGreat:
            '「（夜勤担当者のメモを手繰って）…ここに書いてある。「返品の扱い方が分からない、日勤に聞けない」。この一点だけ何とかなれば、と（ようやく言えた様子）」',
          onMid:
            '「一通り揃える、ですか…（メモに伸ばした手を、止めて）。——全部揃えて、夜勤の人が実際に使うのはそのうち幾つです？ そこ、確かめてから作ります？ 効く一点が分かるなら、そこから出しますけど」（メモは開かず、問いを返して全部入りを牽制する）',
          onPoor: '「……（メモを閉じる）。まあ、全部揃えてもらえると助かります」',
        },
      },
      {
        text: '流行っているし、入れておけば間違いないですよね？',
        good: false,
        response: '「…まあ、世の中の流れではありますね」（流行という言葉に、どこか乗り切れていない響きがある）',
        followUps: [
          { text: '流行は一旦脇に置いて——それが無くて今この現場が実際に困っている場面はありますか？', good: true },
          { text: '世の中ではなく、この倉庫で。入れたら誰の何が、明日から変わりますか？', good: true },
          {
            text: '世の中の流れに乗っておくのは間違いない選択ですから、迷わず導入を決めて、乗り遅れないうちに本格展開まで一気に進めましょう',
            good: false,
          },
          {
            text: '実績のある流行りものなら外しようがありませんから、現場での検証はほどほどに、まず入れてしまって他社に後れを取らないようにしましょう',
            good: false,
          },
        ],
        finalReactions: {
          onGreat:
            '「（少し間があって）…困っている場面、あります。棚卸の時に数が合わなくて、3時間かけて探した。あそこが変わると大きい（ようやく本音が出た）」',
          onMid:
            '「この倉庫で、ですか…（少し考えて）。困ってる場面が、無いとは言いませんけど。世の中で動いてるものなら、入れて損は無いでしょうし。まあ、流れに乗っておくのが無難ですよ」（言いかけた一つを、流行に紛らせる）',
          onPoor: '「……（うなずく）。では入れてみます」',
        },
      },
      {
        text: 'とりあえず全部やってしまえば、取りこぼしは無いですよね？',
        good: false,
        response: '「全部、ですか…」（手に余ると感じているのか、返事が重い）',
        followUps: [
          { text: '全部となると手が回らなそうですね。最初の一手を選ぶなら、どれが一番効きますか？', good: true },
          { text: '広げる前に——小さく一つ試して、効くか確かめてから次に進む形でどうでしょう', good: true },
          {
            text: '取りこぼしが一番の損ですから、優先順位で悩むより、思いつく施策を全部同時に走らせてしまった方が結局は早くて確実ですよね',
            good: false,
          },
          {
            text: 'やれることが多いなら、絞り込むのはもったいないです。リソースを集中投下して一気に全部仕上げ、まとめて成果として見せましょう',
            good: false,
          },
        ],
        finalReactions: {
          onGreat:
            '「（少し考えてから）…一つだけ、と言われると、検品の確認表ですね。ここを変えれば下の工程が全部つながる（初めて自分で考えた様子）」',
          onMid:
            '「一手だけ、ですか…（少し考えかけて）。一つ選んで、それが外れたら時間の無駄ですし、選ばなかった方が効いてたかもしれないし、後で「なぜこれにした」と聞かれても困りますしね。…全部やっておいた方が、取りこぼしは無いですよ」（沈黙でなく、絞れない理由を並べてかわす）',
          onPoor: '「……（疲れた様子でうなずく）。全部やります」',
        },
      },
    ],
  },
]

/** テーマ別の drill セットインデックス（快速ルックアップ用） */
const DRILL_BY_THEME = new Map<HearingTheme, RawDrillSet[]>()
for (const s of DRILL_SETS) {
  const arr = DRILL_BY_THEME.get(s.theme) ?? []
  arr.push(s)
  DRILL_BY_THEME.set(s.theme, arr)
}

/** 深掘りラリーの1ラウンドを seed で決定的に選ぶ。
 *  theme 指定時はそのテーマのセットから seed で選ぶ（配線イベントが文脈を渡せる）。
 *  未指定なら全体から選ぶ。questions(良2/悪2) をシードでシャッフルして提示。
 *  各問いは自分の followUps を内包する＝①②③が連動する。
 *  followUps もシードで決定的にシャッフル（問い index × seed 派生で各問い独立）。
 *  ＝「上2つを選べば正解」の位置固定メタを防ぐ。採点は good フラグ参照なので順序入替は安全。 */
export function dealDrill(seed: number, theme?: HearingTheme): DrillSet {
  const mod = (x: number, m: number) => ((x % m) + m) % m
  const pool = theme ? (DRILL_BY_THEME.get(theme) ?? DRILL_SETS) : DRILL_SETS
  const baseSet = pool[mod(seed, pool.length)]
  // questions をシャッフル
  const shuffledQuestions = shuffle(baseSet.questions, seed)
  // 各 question の followUps も seed 派生でシャッフル（問い index で seed を変化させ独立性を保つ）
  const questionsWithShuffledFollowUps = shuffledQuestions.map((q, i) => ({
    ...q,
    followUps: shuffle(q.followUps, seed * 31 + i * 7 + 3),
  }))
  return {
    questions: questionsWithShuffledFollowUps,
  }
}

/** 深掘りラリーの採点：
 *  良い問い＋良い切り返し = great
 *  片方のみ = good
 *  両方悪い = poor */
export function scoreDrill(questionGood: boolean, followUpGood: boolean): ExecTier {
  if (questionGood && followUpGood) return 'great'
  if (questionGood || followUpGood) return 'good'
  return 'poor'
}
