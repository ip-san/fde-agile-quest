import type { ExecTier, HearingOption, HearingTheme } from '../types'

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

/** イベントのセグメントからヒアリングのテーマを決める（hearing は genba/kokyaku/chance/team で発火）。
 *  trouble をヒアリングにする場合は、調査=genba／対人=team を event.hearingTheme で明示する想定。 */
export function hearingThemeFor(segment: string): HearingTheme {
  return segment === 'genba' || segment === 'kokyaku' || segment === 'chance' || segment === 'team'
    ? segment
    : 'kokyaku'
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
// 題材は Claude / Codex を使い込む人の失敗談から：秘密の直書き・流出、架空パッケージ
// （slopsquatting＝もっともらしい嘘の依存）、WHERE 抜けの破壊的削除、動いて見えるが誤り
// （代入/比較・境界）、過剰実装と既存破壊（理解負債）。ワナは「AI が言うなら通す」過信と瑣末な好み。
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
  /** true＝拾うべき本物の問題／false＝過信・論点ずれ・瑣末な好み（拾うと空振り） */
  issue: boolean
}

interface ReviewCase {
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
  {
    task: '外部の配送APIに接続する処理を追加して',
    diff: [
      { tag: 'ctx', text: 'const url = "https://api.ship.example/v1"' },
      { tag: 'add', text: 'const API_KEY = "sk-live-7Q2x...c91a" // とりあえず直書き' },
      { tag: 'add', text: 'fetch(url, { headers: { Authorization: `Bearer ${API_KEY}` } })' },
    ],
    aiNote: '動作確認OK。すぐ使えます。',
    options: [
      { text: 'APIキーが直書き。環境変数へ出し、.gitignore とコミット前検知を確認したい', issue: true },
      { text: 'この鍵、本物なら既に漏洩扱い。無効化とローテーションが要る', issue: true },
      { text: 'AIが「動作確認OK」と言うなら、そのまま通していい', issue: false },
      { text: 'fetch より axios に統一したい（好みの範囲）', issue: false },
      { text: '変数名 API_KEY は分かりやすいので問題なし', issue: false },
    ],
    takeaway: '秘密の直書きとAIの「OK」を信じない。鍵は環境変数＋コミット前検知で止める。',
  },
  {
    task: '日付を「2026年6月20日」形式に整える処理を追加して',
    diff: [
      { tag: 'add', text: "import { wareki } from 'jp-date-pretty'   // 提案された依存" },
      { tag: 'add', text: "return wareki(d, 'YYYY年M月D日')" },
    ],
    aiNote: '定番ライブラリなので入れておきました。',
    options: [
      { text: 'jp-date-pretty が実在するか、公式レジストリで名前を目視確認したい', issue: true },
      { text: 'install を AI に自動実行させない設定か。架空名に攻撃者が先回りする例がある', issue: true },
      { text: '「定番」と書いてあるし実在するはず。そのまま通そう', issue: false },
      { text: '書式は YYYY/MM/DD に統一したい（好み）', issue: false },
      { text: 'import は1行にまとめた方が綺麗（瑣末）', issue: false },
    ],
    takeaway: 'AIは「もっともらしい嘘」の依存名を出す。名前の実在を人が確かめてから入れる。',
  },
  {
    task: '退会済みのユーザー行を片付けて',
    diff: [{ tag: 'add', text: 'DELETE FROM users;   -- 退会者を整理' }],
    aiNote: 'シンプルに書きました。',
    options: [
      { text: 'WHERE 句が無い。全件消える。対象範囲とバックアップを先に確認したい', issue: true },
      { text: '本番DBに直接つながっていないか、戻せる（可逆）か確認したい', issue: true },
      { text: 'コメントは英語に統一したい（瑣末）', issue: false },
      { text: '速度のためインデックスを足すべき（論点ずれ）', issue: false },
      { text: 'AIが書いたSQLなら、条件は合っているはず', issue: false },
    ],
    takeaway: '消す系は範囲と可逆性を最優先で見る。WHERE 抜けはAIの典型的な事故。',
  },
  {
    task: '在庫が0以下なら表示を「品切れ」にして',
    diff: [
      { tag: 'add', text: 'if (stock = 0) {' },
      { tag: 'add', text: "  label = '品切れ'" },
      { tag: 'add', text: '}' },
    ],
    aiNote: 'テストも通したので大丈夫です。',
    options: [
      { text: 'stock = 0 は代入。比較は ===。常に真になり毎回書き換わる', issue: true },
      { text: '「0以下」の指示なのに 0 だけ判定。マイナス在庫が漏れる（<= 0 では）', issue: true },
      { text: "'品切れ' は定数 SOLD_OUT にすべき（好み）", issue: false },
      { text: '波括弧の改行スタイルを揃えたい（瑣末）', issue: false },
      { text: '「テストも通した」と書いてあるので信じてよい', issue: false },
    ],
    takeaway: '動いて見えても中身は別物。代入/比較や境界条件（0以下）は人が読んで確かめる。',
  },
  {
    task: 'ログイン画面に「パスワードを表示」ボタンを1つ追加して',
    diff: [
      { tag: 'add', text: 'パスワード表示トグルを追加' },
      { tag: 'add', text: 'ついでに認証モジュールを全面書き換え／キャッシュ層を新設' },
      { tag: 'del', text: '既存の入力バリデーションを削除' },
    ],
    aiNote: 'まとめて整理しておきました。',
    options: [
      { text: '頼んだのはボタン1つ。認証の全面書き換えは過剰。差分を最小に戻したい', issue: true },
      { text: '既存のバリデーションが消えている。意図せず壊していないか', issue: true },
      { text: 'キャッシュ層、良さそうなのでまとめて入れてしまおう', issue: false },
      { text: 'ボタンのラベルは「表示/非表示」が親切（好み）', issue: false },
      { text: '行は増えたが、AIが書いたなら整合は取れているはず', issue: false },
    ],
    takeaway: '指示より大きい差分は赤信号。過剰実装と「自分が理解できない変更」を通さない。',
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

/** レビューの1ラウンドをシードで選ぶ。選択肢はシャッフルして提示（毎回同じ並びを避ける）。 */
export function dealReview(seed: number): ReviewRound {
  const c = REVIEW_CASES[((seed % REVIEW_CASES.length) + REVIEW_CASES.length) % REVIEW_CASES.length]
  const options = shuffle(c.options, seed + 5)
  return { task: c.task, diff: c.diff, aiNote: c.aiNote, options, takeaway: c.takeaway }
}

/** レビューの採点：本物の指摘を拾えたか／空振り（過信・瑣末）を出していないか。
 *  great＝本物2つを的確に・空振り0／good＝1つ以上拾い空振り1まで／poor＝それ未満（＝AIを素通し）。 */
export function scoreReview(picked: ReviewFlag[]): ExecTier {
  const caught = picked.filter((o) => o.issue).length
  const wrong = picked.filter((o) => !o.issue).length
  if (caught >= REVIEW_REAL_COUNT && wrong === 0) return 'great'
  if (caught >= 1 && wrong <= 1) return 'good'
  return 'poor'
}
