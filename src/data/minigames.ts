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
  // 説得＝PO への並べ替え提案を“価値の論拠”で通す。良論拠＝顧客価値・スプリントゴール・現場の事実・依存関係。
  persuade: [
    'この順なら、今スプリントのゴールに直結する価値を先に届けられます',
    '現場で確かめた事実だと、この項目が顧客価値にいちばん効きます',
    '上位の依存を先に片づけるので、結局この順が最短で価値が出ます',
    'これを上げると、後続のリスクが減って届けきれる確度が上がります',
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
  // 弱い論拠＝個人都合・前例踏襲・権威・勘（PO は価値で動く＝これでは優先順位を動かせない）。
  persuade: [
    'とにかく自分が作りやすい順にしてもらえませんか',
    '前もこうだったので、今回もこの順でいいですよね',
    '細かい理由は抜きで、これで通してもらえますか',
  ],
}

/** 開発パズル：正しい順に組み直す“開発の手順”フロー（FDEらしい進め方の型）。 */
const DEV_FLOWS: string[][] = [
  ['要件を掴む', '小さく設計する', '実装する', '現場で試す'],
  ['不具合を再現する', '原因を特定する', '修正する', '再発防止を残す'],
  ['仮説を立てる', '最小版を出す', '反応を見る', '学んで直す'],
  ['ログを見る', 'ボトルネックを特定', '一点を直す', '効果を測る'],
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
  persuade: 'PO を価値で説得する',
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
  persuade: 'PO に、どの論拠で並べ替えを通す？',
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

/** PO 説得ミニゲームの論拠デッキ（良論拠3＋弱論拠2）。MiniGameHearing に hearingOptions として渡す。
 *  良＝価値・ゴール・現場の事実・依存／弱＝個人都合・前例・権威。2つ選んで良の数で great/good/poor。 */
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

/** レビューで挙げうる指摘。issue=true は“この差分の本当の問題”（拾うのが正解）。 */
export interface ReviewFlag {
  text: string
  /** true＝拾うべき本物の問題／false＝過信・論点ずれ・ささいな好み（拾うと空振り） */
  issue: boolean
}

interface ReviewCase {
  /** 一致する PBI（このタスク向けに AI が生成した成果物をレビューする＝1対1対応） */
  pbi: string
  /** AI に頼んだこと */
  task: string
  /** AI が書いた差分 */
  diff: DiffLine[]
  /** AI の自己申告（“動作確認OK”等の過信を誘うメモ） */
  aiNote: string
  /** 選択肢（issue=true をちょうど REVIEW_REAL_COUNT 個含む） */
  options: ReviewFlag[]
  /** 確定後に見せる気づき */
  takeaway: string
}

const REVIEW_CASES: ReviewCase[] = [
  // 1. 現場観察 → AIが観察メモを要約。ハルシネーションで言ってない要件を捏造／沈黙の理由を取りこぼし
  {
    pbi: 'pbi-floor-observe',
    task: '倉庫で録った観察メモを、要件の箇条書きに要約して',
    diff: [
      { tag: 'ctx', text: '# 観察メモ（生）：田淵さん「画面は…まあ、開いてない」。棚の前で長く沈黙。' },
      { tag: 'add', text: '- 要件: 在庫の自動発注機能が欲しいとの強い要望あり' },
      { tag: 'add', text: '- 結論: 現場は画面の使い勝手に満足。大きな課題はなし' },
    ],
    aiNote: 'メモから要点を抽出しました。要望も拾えています。',
    options: [
      { text: '「自動発注が欲しい」は生メモに無い。AIが要件を{{ハルシネーション}}（捏造）している', issue: true },
      { text: '「沈黙」を“満足”と要約したのは飛躍。なぜ開かないかの理由を取りこぼしている', issue: true },
      { text: 'AIが要約したのだから、要望は現場が言った通りのはず', issue: false },
      { text: '箇条書きは「・」より「-」で揃えたい（好み）', issue: false },
      { text: '見出しに日付を入れた方が整う（ささい）', issue: false },
    ],
    takeaway: 'AIの要約は“言っていないこと”を足し、沈黙を勝手に解釈する。生メモと付き合わせて人が確かめる。',
  },
  // 2. ベテラン聞き取り → AIが暗黙知を要件化。勘どころ（例外の見分け）を一般論にすり替え
  {
    pbi: 'pbi-veteran-hearing',
    task: '田淵さんへの聞き取りを、誰でも従える手順書にまとめて',
    diff: [
      { tag: 'ctx', text: '# 聞き取り：「箱が湿ってたり、ラベルが二重に貼ってある時は“勘”で別棚に避ける」' },
      { tag: 'add', text: '1. 入荷した品は、番号順に棚へ格納する' },
      { tag: 'add', text: '2. 例外はとくに無し。手順どおりに進めれば誤出荷は起きない' },
    ],
    aiNote: 'ベテランのやり方を、一般的な標準手順に整理しました。',
    options: [
      { text: '「湿り・二重ラベルは別棚に避ける」という肝心の例外判断が、要件から丸ごと落ちている', issue: true },
      { text: '「例外は無し」は事実に反する。勘どころを“一般論”にすり替えていて、ここに誤出荷の芽がある', issue: true },
      { text: 'AIが手順化したのだから、現場の勘もちゃんと反映されているはず', issue: false },
      { text: '番号は全角より半角に統一したい（ささい）', issue: false },
      { text: '手順は表形式にした方が読みやすい（好み）', issue: false },
    ],
    takeaway: '暗黙知の価値は“例外の見分け”にある。AIが一般化で消した勘どころこそ、人が拾って残す。',
  },
  // 3. 出荷フロー可視化 → AIがAs-Isフローを生成。現場が隠した例外分岐が抜ける
  {
    pbi: 'pbi-as-is-flow',
    task: '今の出荷フロー（As-Is）を、分岐込みの一枚図にして',
    diff: [
      { tag: 'ctx', text: '# 現状フロー（手書きメモ起こし）' },
      { tag: 'add', text: '受注 → ピッキング → 検品 → 出荷  ※一本道' },
      { tag: 'del', text: '（メモ余白の走り書き）返品・急ぎ便はここで別ルートに抜ける' },
    ],
    aiNote: '主要な流れを綺麗な一本道に整理しました。例外は省いています。',
    options: [
      { text: '返品・急ぎ便の“別ルート”が削られている。現場が隠した例外分岐こそ可視化の目的', issue: true },
      { text: '一本道に均してしまうと、{{誤出荷率}}が上がる発生点（分岐の合流）が図から消える', issue: true },
      { text: 'AIが「主要な流れ」と判断したのだから、省いた例外はささいなはず', issue: false },
      { text: '矢印は「→」より「⇒」が見栄えする（好み）', issue: false },
      { text: '図のタイトルを中央寄せにしたい（ささい）', issue: false },
    ],
    takeaway: 'As-Is図の価値は“例外分岐”にある。AIが綺麗に均した一本道は、現実の事故ポイントを隠す。',
  },
  // 4. 誤出荷削減MVP → 誤出荷判定コード。境界条件（代入/比較・0以下）※既存「在庫0以下」題材を移植
  {
    pbi: 'pbi-misship-mvp',
    task: '出荷数が在庫を超えたら「在庫不足」で止める判定を入れて',
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
      { text: "'在庫不足' は定数にすべき（好み）", issue: false },
      { text: '波括弧の改行スタイルを揃えたい（ささい）', issue: false },
      { text: '「テストも通した」と書いてあるので信じてよい', issue: false },
    ],
    takeaway: '動いて見えても中身は別物。代入/比較や境界（超過 > と等価 =）は、人が読んで確かめる。',
  },
  // 5. ピッキング画面 → 現場の言葉と項目名の不一致／入力検証欠落
  {
    pbi: 'pbi-picking-screen',
    task: '{{ピッキング}}画面に「棚番」入力欄を追加して',
    diff: [
      { tag: 'add', text: 'label = "Location ID"          // 棚の場所を入れる欄' },
      { tag: 'add', text: 'value = input.raw              // 入力をそのまま採用' },
      { tag: 'ctx', text: '// 現場の呼び方は「棚番（たなばん）」。英数字4桁の決まり。' },
    ],
    aiNote: '欄を足しました。見た目もそれっぽく整えています。',
    options: [
      { text: 'ラベルが "Location ID"。現場の言葉「棚番」と違い、誰も自分の欄と分からない', issue: true },
      { text: '入力検証が無い。4桁の決まりに反する値も raw のまま通り、取り違えの元になる', issue: true },
      { text: 'AIが画面を整えたのだから、項目名も現場に合っているはず', issue: false },
      { text: 'ボタンの色は青より緑が映える（好み）', issue: false },
      { text: '欄の幅を少し広げたい（ささい）', issue: false },
    ],
    takeaway: '画面は“現場の言葉”で書く。英語ラベルと検証なしの入力は、使われない画面に逆戻りさせる。',
  },
  // 6. 在庫照合 → 帳簿vs実在庫の差分計算。代入/比較・丸め・二重計上
  {
    pbi: 'pbi-stock-reconcile',
    task: '帳簿在庫と実在庫の差（{{棚卸}}差異）を計算して',
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
      { text: 'AIが「数字も合っている」と言うなら、計算は正しいはず', issue: false },
      { text: '変数名 diff は delta にしたい（好み）', issue: false },
      { text: 'コメントは行末でなく上の行に置きたい（ささい）', issue: false },
    ],
    takeaway: '照合は“二重計上”と“単位”で狂う。合計が出ること（動く）と、正しいことは別。原票で裏を取る。',
  },
  // 7. フィードバック収集 → 取引先/個人情報の扱い・秘密直書き ※既存「秘密直書き」題材を移植
  {
    pbi: 'pbi-feedback-loop',
    task: '現場の声を外部のアンケートサービスに送る処理を追加して',
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
      { text: 'AIが「動作確認OK」と言うなら、そのまま通していい', issue: false },
      { text: 'send より post という関数名に統一したい（好み）', issue: false },
      { text: 'url の文字列は二重引用符より一重引用符で揃えたい（ささい）', issue: false },
    ],
    takeaway: '声を集める前に“誰の情報を外に出すか”を見る。秘密直書きと無断送信は、信頼を一発で失う。',
  },
  // 8. 運用手順文書化 → Runbook生成。ロールバック/例外手順が抜ける
  {
    pbi: 'pbi-handoff-doc',
    task: '日次の在庫取り込みを引き継ぐ運用手順書（Runbook）を書いて',
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
      { text: 'AIが簡潔にまとめたのだから、正常時だけで十分なはず', issue: false },
      { text: '見出しは ## より # の方が目立つ（好み）', issue: false },
      { text: '手順番号を縦に並べたい（ささい）', issue: false },
    ],
    takeaway: 'Runbookの価値は“異常時”にある。AIが残す正常系だけの手順は、引き継いだ人を本番で立ち往生させる。',
  },
  // 9. ダッシュボード → 集計クエリ。全件スキャン／権限制御欠落 ※既存「WHERE抜け」題材を発展（破壊→閲覧範囲）
  {
    pbi: 'pbi-dashboard-selfserve',
    task: '現場が自分で見られる在庫ダッシュボードの集計クエリを書いて',
    diff: [
      { tag: 'add', text: 'SELECT * FROM stock_all;   -- 全在庫を取得' },
      { tag: 'add', text: '-- 表示は全件。誰がアクセスしても同じ結果を返す' },
      { tag: 'ctx', text: '-- stock_all には他拠点・取引先別の機微な原価も含まれる' },
    ],
    aiNote: 'シンプルに全件出るようにしました。すぐ見られます。',
    options: [
      { text: '権限制御が無い。誰でも他拠点や取引先別の原価まで見えてしまう。閲覧範囲を絞る条件が要る', issue: true },
      { text: 'WHERE も LIMIT も無い全件スキャン。テーブルが育つと毎回重く、現場の画面が固まる', issue: true },
      { text: 'AIが書いたクエリなら、見える範囲も適切に絞られているはず', issue: false },
      { text: 'SELECT * より列を明示したいが、動くので後回しでよい（好み）', issue: false },
      { text: 'コメントは英語に統一したい（ささい）', issue: false },
    ],
    takeaway: '“誰でも見える”は便利の顔をした事故。集計は権限（誰に見せるか）と範囲（全件か）を人が点検する。',
  },
  // 10. オンボーディング → 導線/チェックリスト。必須ステップ抜け
  {
    pbi: 'pbi-onboarding',
    task: '新メンバーが初日にたどる{{オンボーディング}}チェックリストを作って',
    diff: [
      { tag: 'add', text: '- [ ] 社内システムにログインする' },
      { tag: 'add', text: '- [ ] 倉庫マップを眺める  → 以上で完了' },
      { tag: 'del', text: '（旧資料）安全教育（フォーク動線・立入禁止帯）を初日に必ず受講' },
    ],
    aiNote: '初日にやることを手早くまとめました。これで迷いません。',
    options: [
      { text: '必須の安全教育（フォーク動線・立入禁止帯）が抜けている。倉庫では初日の事故に直結する', issue: true },
      { text: '「眺めて完了」で終わり、誰が立ち会い・どこで確認するかが無い。形だけで定着しない', issue: true },
      { text: 'AIがまとめたのだから、必要なステップは網羅されているはず', issue: false },
      { text: 'チェックは [ ] より絵文字が親しみやすい（好み）', issue: false },
      { text: '項目の語尾を「する」で揃えたい（ささい）', issue: false },
    ],
    takeaway: '導線は“抜けたら困る必須”で測る。AIの軽い手順は、安全や立会いという外せない一歩を落とす。',
  },
  // 11. 監視・ロールバック → 監視/ロールバックコード。アラート閾値の穴／戻し方が不可逆
  {
    pbi: 'pbi-monitoring',
    task: '誤出荷が増えたら警告し、いざという時に戻せる監視を入れて',
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
      { text: 'AIが「両方入れた」と言うなら、安全網として機能するはず', issue: false },
      { text: 'alert より notify という名前が好み（好み）', issue: false },
      { text: 'コメントの位置を揃えたい（ささい）', issue: false },
    ],
    takeaway: '安全網ほど中身を疑う。鳴らない閾値と“消してから戻す”手順は、いざという時に役に立たない。',
  },
  // 12. 棚番見間違い表示 → 表示コード。似た棚番の混同が解消されない／別の混乱を生む
  {
    pbi: 'pbi-disc-label-misread',
    task: '似た棚番（A-1207 と A-1027）の取り違えを、表示で防いで',
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
      { text: 'AIが「間違えません」と言うのだから、混同は解消されたはず', issue: false },
      { text: '色は黄より橙が映える（好み）', issue: false },
      { text: 'padStart は8でなく定数にしたい（ささい）', issue: false },
    ],
    takeaway: '“見やすく”は目的でなく手段。違う桁を際立たせる工夫でなければ、似た棚番の取り違えは消えない。',
  },
  // 13. 夜勤引き継ぎ → 引き継ぎロジック。夜勤帯のエッジケース漏れ
  {
    pbi: 'pbi-disc-night-shift',
    task: '夜勤から日勤への申し送りを、未完タスクの自動引き継ぎにして',
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
      { text: 'AIが「漏れはない」と言うのだから、夜勤も拾えているはず', issue: false },
      { text: 'carry は handover という名前にしたい（好み）', issue: false },
      { text: '時刻は文字列より数値で持ちたい（ささい）', issue: false },
    ],
    takeaway: 'エッジは“日跨ぎ・時間帯の端”に潜む。AIの「漏れなし」を、現場の夜勤シフトに当てて人が確かめる。',
  },
  // 14. 返品戻し入れ → 返品フロー。在庫戻しの二重計上／状態遷移バグ
  {
    pbi: 'pbi-disc-return-flow',
    task: '返品された品を在庫に戻す処理を書いて',
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
      { text: 'AIが「テスト済み」と言うのだから、戻し数は合っているはず', issue: false },
      {
        text: '検品で良品/不良品を分けず全数戻している。不良品まで在庫に乗るが、まずは戻し数を直すのが先（後回しでよい）',
        issue: false,
      },
      { text: 'status は英語より日本語が分かりやすい（好み）', issue: false },
    ],
    takeaway: '戻し入れは“二重計上”と“状態遷移”で狂う。在庫が増えること（動く）と、正しく一度だけ戻ることは別。',
  },
  // 15. 荷主向けダッシュボード実装（イベント発PBI）→ AIが描画ライブラリの import を提案。
  //     実在しないパッケージ名を幻覚（スロップスクワッティング＝サプライチェーン攻撃の的）。
  {
    pbi: 'pbi-evt-exec-feature',
    task: '荷主向け{{ダッシュボード}}に折れ線グラフを足して。使うnpmパッケージも提案して',
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
      { text: 'AIが「定番なので安全」と言うのだから、そのまま入れて問題ないはず', issue: false },
      { text: 'import は default より名前付きで揃えたい（好み）', issue: false },
      { text: '変数名は LineChart より Graph が短くて好み（ささい）', issue: false },
    ],
    takeaway:
      'AIはパッケージ名すら創作する。実在・提供元・ダウンロード実績を人が確かめてから入れる——AIの「定番だ」は、攻撃の入口になりうる。',
  },
]

/** レビューの1ラウンド：AI差分＋点検すべき選択肢（提示順はシードでシャッフル）。 */
export interface ReviewRound {
  task: string
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
 *    題材一致の作問を“避けて” seed で別の作問に巡回させ、連続レビューで同じミニゲームが続かないようにする
 *    （＝何度も見ると別の種類の問題が出てくる、という体験。AIコードレビューの実感に沿う）。
 *  選択肢はいずれもシャッフルして提示（毎回同じ並びを避ける）。 */
export function dealReview(seed: number, pbiId?: string, variety = false): ReviewRound {
  const n = REVIEW_CASES.length
  const matchedIdx = pbiId ? REVIEW_CASES.findIndex((c) => c.pbi === pbiId) : -1
  const mod = (x: number, m: number) => ((x % m) + m) % m
  let idx: number
  if (!variety && matchedIdx >= 0) {
    idx = matchedIdx // 初回＝題材一致を出す
  } else if (matchedIdx >= 0 && n > 1) {
    // 2回目以降＝題材一致を除いた残りから seed で1つ選ぶ（必ず初回と別の作問になる）
    const r = mod(seed, n - 1)
    idx = r >= matchedIdx ? r + 1 : r
  } else {
    idx = mod(seed, n) // 題材一致が無い項目（イベント発PBI等）は全作問から巡回
  }
  const c = REVIEW_CASES[idx]
  const options = shuffle(c.options, seed + 5)
  return { task: c.task, diff: c.diff, aiNote: c.aiNote, options, takeaway: c.takeaway }
}

/** レビューの採点：本物の指摘を拾えたか／空振り（過信・ささい）を出していないか。
 *  great＝本物2つを的確に・空振り0／good＝1つ以上拾い空振り1まで／poor＝それ未満（＝AIを素通し）。 */
export function scoreReview(picked: ReviewFlag[]): ExecTier {
  const caught = picked.filter((o) => o.issue).length
  const wrong = picked.filter((o) => !o.issue).length
  if (caught >= REVIEW_REAL_COUNT && wrong === 0) return 'great'
  if (caught >= 1 && wrong <= 1) return 'good'
  return 'poor'
}
