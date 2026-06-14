import type { ExecTier } from '../types'

// ───────────────────────────────────────────────────────────
// 選択後ミニゲームの汎用コンテンツ（“実行スキル”の抽象。イベント個別には書かない）。
// ヒアリング＝現場主義を強化する深掘り質問を選ぶ／開発＝実装の進め方・タイミング。
// 採点ロジックは純粋関数で、乱数はシード注入してテスト可能にする。
// ───────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────
// ヒアリングの問いは「相手・場面」で変える（ワンパターン回避）。テーマ別の良問/悪問＋汎用を
// 混ぜて出す。テーマはイベントのセグメントから決まる（現場/顧客/機会）。
// 良問＝観察・一次情報・現場主義／悪問＝誘導・クローズド・迎合・「答えは資料の中」前提。
// ───────────────────────────────────────────────────────────
export type HearingTheme = 'genba' | 'kokyaku' | 'chance'

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
}

export interface HearingOption {
  text: string
  good: boolean
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
function shuffle<T>(arr: T[], seed: number): T[] {
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
  return [...GENERAL_GOOD, ...THEME_GOOD.genba, ...THEME_GOOD.kokyaku, ...THEME_GOOD.chance]
}
function allBad(): string[] {
  return [...GENERAL_BAD, ...THEME_BAD.genba, ...THEME_BAD.kokyaku, ...THEME_BAD.chance]
}

/** イベントのセグメントからヒアリングのテーマを決める（hearing は genba/kokyaku/chance で発火） */
export function hearingThemeFor(segment: string): HearingTheme {
  return segment === 'genba' || segment === 'kokyaku' || segment === 'chance' ? segment : 'kokyaku'
}

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
