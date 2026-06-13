import type { ExecTier } from '../types'

// ───────────────────────────────────────────────────────────
// 選択後ミニゲームの汎用コンテンツ（“実行スキル”の抽象。イベント個別には書かない）。
// ヒアリング＝現場主義を強化する深掘り質問を選ぶ／開発＝実装の進め方・タイミング。
// 採点ロジックは純粋関数で、乱数はシード注入してテスト可能にする。
// ───────────────────────────────────────────────────────────

/** 良い深掘り質問（観察・一次情報・現場主義）。 */
const HEARING_GOOD = [
  '実際にその作業、見せてもらえますか？',
  '具体的に、どの場面でいちばん困りますか？',
  '前回それが起きたのは、いつ・どんな時でした？',
  '今は、その代わりにどうやって回していますか？',
  'それで、誰がいちばん困っていますか？',
  'そのメモ、なぜ必要なんでしょう？',
  '肌感覚だと、どのくらいの頻度で起きますか？',
  'もし今のやり方が無くなったら、何が一番こまりますか？',
]

/** 悪い質問（誘導・クローズド・表面的・「答えは資料の中」前提）。 */
const HEARING_BAD = [
  'やっぱり予測機能、要りますよね？',
  'これで満足いただけましたよね？',
  'だいたい問題ない感じ、ですよね？',
  '要するに、全部自動化したいんですよね？',
  '他社さんもこうしているので、これでいいですか？',
  '細かい話は置いといて、結論どうします？',
  '資料のここに書いてある通りで合ってますか？',
]

export interface HearingOption {
  text: string
  good: boolean
}

/** 開発（reduced-motion フォールバック）の実装の進め方。tier 付き。 */
export interface DevStep {
  text: string
  tier: ExecTier
}
const DEV_STEPS: DevStep[] = [
  { text: '小さく動く版をまず出し、現場の反応で直す', tier: 'great' },
  { text: 'ひと通り設計してから、まとめて実装する', tier: 'good' },
  { text: '完璧を目指して作り込み、最後にまとめて見せる', tier: 'poor' },
]

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

/** ヒアリングの1ラウンド＝良2・悪3 をシードで選んでシャッフル。プレイヤーは2つ選ぶ。 */
export function dealHearing(seed: number): HearingOption[] {
  const goods = take(HEARING_GOOD, seed, 2).map((text) => ({ text, good: true }))
  const bads = take(HEARING_BAD, seed * 3 + 1, 3).map((text) => ({ text, good: false }))
  return shuffle([...goods, ...bads], seed)
}

/** ヒアリングの採点：選んだ2問のうち良問の数で great/good/poor。 */
export function scoreHearing(picked: HearingOption[]): ExecTier {
  const good = picked.filter((o) => o.good).length
  return good >= 2 ? 'great' : good === 1 ? 'good' : 'poor'
}

/** 開発フォールバックの3択をシードでシャッフル（tier 付き）。 */
export function dealDevSteps(seed: number): DevStep[] {
  return shuffle(DEV_STEPS, seed)
}

/** タイミング型：マーカー位置(0..100)と的中心(50)からティア判定。 */
export function scoreTiming(pos: number): ExecTier {
  const d = Math.abs(pos - 50)
  return d <= 8 ? 'great' : d <= 22 ? 'good' : 'poor'
}
