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
      { text: '「要望も拾えています」とメモにあるので、要件は現場の声どおりに揃っている', issue: false },
      { text: '箇条書きの記号が「・」と「-」で混在しているので「-」に統一すべき', issue: false },
      { text: '観察メモは録った日が分かるよう、見出しに日付を必ず入れるべき', issue: false },
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
      { text: '「標準手順に整理した」とあるので、現場の勘どころも漏れなく反映されている', issue: false },
      { text: '手順番号の表記が揺れているので、半角数字に統一すべき', issue: false },
      { text: '手順書は箇条書きより表形式の方が読みやすいので、表に組み替えるべき', issue: false },
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
      { text: '「主要な流れを整理した」とあるので、省かれた例外は図に入れるほどではない', issue: false },
      { text: '工程をつなぐ矢印は「→」より「⇒」の方が一枚図として見栄えするので差し替えるべき', issue: false },
      { text: '一枚図なのでタイトルは中央寄せにして体裁を整えるべき', issue: false },
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
      { text: '入力欄の確定ボタンは青より緑の方が押せると伝わるので、色を変えるべき', issue: false },
      { text: '4桁入力なら欄の幅が余るので、桁数に合わせて狭めるべき', issue: false },
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
      { text: '送信は send より post という関数名の方が意図が伝わるので統一すべき', issue: false },
      { text: '文字列の引用符が二重と一重で揺れているので、一重に揃えるべき', issue: false },
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
    diff: [
      { tag: 'add', text: 'SELECT * FROM stock_all;   -- 全在庫を取得' },
      { tag: 'add', text: '-- 表示は全件。誰がアクセスしても同じ結果を返す' },
      { tag: 'ctx', text: '-- stock_all には他拠点・取引先別の機微な原価も含まれる' },
    ],
    aiNote: 'シンプルに全件出るようにしました。すぐ見られます。',
    options: [
      { text: '権限制御が無い。誰でも他拠点や取引先別の原価まで見えてしまう。閲覧範囲を絞る条件が要る', issue: true },
      { text: 'WHERE も LIMIT も無い全件スキャン。テーブルが育つと毎回重く、現場の画面が固まる', issue: true },
      { text: '「すぐ見られる」と添えてあるので、見える範囲は適切に絞られている', issue: false },
      { text: 'SELECT * は列を明示しないと意図が読めないので、取得列を書き出すべき', issue: false },
      { text: 'クエリのコメントが日本語と英語で揺れているので、英語に統一すべき', issue: false },
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
      { text: '通知関数は alert より notify の方が用途が伝わるので、名前を変えるべき', issue: false },
      { text: '行末コメントの開始位置が揃っていないので、桁を合わせるべき', issue: false },
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
      {
        text: '検品で良品/不良品を分けず全数戻しているので、不良品が在庫に乗らないよう仕分け処理を先に足すべき',
        issue: false,
      },
      { text: '状態名 status の値が英語なので、現場が読めるよう日本語に直すべき', issue: false },
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
      { text: '日付 2026-06-22 をクエリに直書きしているので、変数に出して使い回せるようにすべき', issue: false },
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
  // 初回でも 1/3（mod(seed,3)===0）は“題材一致”を外して別作問に振る＝「初回＝本物2つ確定」のメタ確定を崩す。
  // ＝初回からも「今回は罠か正味か」を diff を読んで確かめる必要が出る（題材一致の良さは 2/3 で温存）。
  const surprise = !variety && matchedIdx >= 0 && mod(seed, 3) === 0
  let idx: number
  if (!variety && !surprise && matchedIdx >= 0) {
    idx = matchedIdx // 初回（大半）＝題材一致を出す
  } else if (matchedIdx >= 0 && n > 1) {
    // 再レビュー or 初回の“振れ”＝題材一致を除いた残りから seed で1つ選ぶ（必ず題材一致と別の作問になる）
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
 *  realCount＝この作問に実在する本物の指摘数（既定 2）。0 の作問＝コードは健全＝「問題なし(LGTM)」が正解。
 *  great＝拾うべきを全部拾い空振り0（issue0 の回は"LGTMで出す"が great）／poor＝空振り2以上 or 取りこぼし2以上
 *  （疑いすぎ／AIを素通し）／good＝その間。
 *  ＝「本物2つ探す」を固定解にせず、"何も無いのに指摘を捏造する"も"素通し"も同じく戒める。 */
export function scoreReview(picked: ReviewFlag[], realCount: number = REVIEW_REAL_COUNT): ExecTier {
  const caught = picked.filter((o) => o.issue).length
  const wrong = picked.filter((o) => !o.issue).length
  const missed = Math.max(0, realCount - caught)
  if (wrong === 0 && missed === 0) return 'great'
  if (wrong >= 2 || missed >= 2) return 'poor'
  return 'good'
}
