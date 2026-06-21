// ───────────────────────────────────────────────────────────
// 固有名詞の単一の真実源（社名・人名）
//
// ■ なぜこれがあるか
//   社名や人名は、イベント本文・物語・登場人物カード・マップ説明など多数の箇所に
//   “地の文”として散らばっている。後から「カルゴ物流」を別の社名に、「結城」を別の
//   姓に変えたくなったとき、全ファイルを手で書き換えるのは事故のもと。ここを唯一の
//   定義元にして、表示名を変えれば全箇所に反映される構造にしてある。
//
// ■ 使い方（リネームの手順）
//   1. 下の NAMES の該当エントリの `name`（と必要なら `reading`）を書き換えるだけ。
//      例: cargo の name を 'カルゴ物流' → '青葉ロジ' に。
//   2. それ以外は何も触らなくてよい。localizeNames()/localizeDeep() が、地の文に
//      “そのまま”書かれている canonical 綴り（変更不可）を、表示時に新しい name へ
//      置換する。データ層（EVENTS/LOCATIONS/CAST 等の export）と描画層（RichText）の
//      両方を通すので、本文・ログ・口上・人物カード・マップ説明すべてに反映される。
//   3. `canonical`（と `also`）は「本文に書かれている綴り」なので絶対に変えないこと。
//      これが置換のキー。name と canonical が一致している限り置換は恒等（=表示は不変）。
//
//   ※ 既定では全エントリ name===canonical なので、このファイルを足しても表示は一切
//     変わらない（buildSubs() が空 → localize* は no-op で短絡）。純粋に「変えられる
//     構造」を用意しただけのゼロリスクな土台。
// ───────────────────────────────────────────────────────────

export type NameId =
  | 'lumen'
  | 'cargo'
  | 'parent'
  | 'grandparent'
  | 'product'
  | 'kuon'
  | 'takano'
  | 'segawa'
  | 'yuki'
  | 'tabuchi'
  | 'hashimoto'
  | 'yamada'
  | 'goda'
  | 'akagi'
  | 'moriya'
  | 'nitta'
  | 'mamiya'

export interface NameDef {
  /** 地の文に書かれている綴り（置換キー。変更しない） */
  canonical: string
  /** 表示名。リネームするならここだけ変える */
  name: string
  /** ふりがな（人物カードなどで name に添えて出す。任意） */
  reading?: string
  kind: 'company' | 'person'
  /** canonical 以外にも本文に現れる別綴り（例: 「カルゴ物流」の略称「カルゴ」）。
   *  これらも name へ置換される（リネーム時に取りこぼさないため） */
  also?: string[]
}

/** 固有名詞の唯一の定義元。name を変えるとアプリ全体の表示が変わる。 */
export const NAMES: Record<NameId, NameDef> = {
  // ── 企業 ──
  lumen: { canonical: 'ルミクラウド', name: 'ルミクラウド', kind: 'company' },
  cargo: {
    canonical: 'カルゴ物流',
    name: 'カルゴ物流',
    reading: 'カルゴぶつりゅう',
    kind: 'company',
    also: ['カルゴ'],
  },
  parent: { canonical: 'ジェネリック電機', name: '東邦重電', kind: 'company' },
  grandparent: { canonical: 'ジェネリックロジスティクス', name: '東邦ロジスティクス', kind: 'company' },
  product: { canonical: 'StockPilot', name: 'StockPilot', kind: 'company' },
  // ── 人物（hero=「あなた」は固有名を持たないので登録しない） ──
  kuon: { canonical: '久遠', name: '久遠', reading: 'くおん', kind: 'person' },
  takano: { canonical: '鷹野', name: '鷹野', reading: 'たかの', kind: 'person' },
  segawa: { canonical: '瀬川', name: '瀬川', reading: 'せがわ', kind: 'person' },
  yuki: { canonical: '結城', name: '結城', reading: 'ゆうき', kind: 'person' },
  tabuchi: { canonical: '田淵', name: '田淵', reading: 'たぶち', kind: 'person' },
  hashimoto: { canonical: '橋本', name: '橋本', reading: 'はしもと', kind: 'person' },
  yamada: { canonical: '山田', name: '山田', reading: 'やまだ', kind: 'person' },
  goda: { canonical: '郷田', name: '郷田', reading: 'ごうだ', kind: 'person' },
  akagi: { canonical: '赤城', name: '赤城', reading: 'あかぎ', kind: 'person' },
  moriya: { canonical: '守屋', name: '守屋', reading: 'もりや', kind: 'person' },
  nitta: { canonical: '新田', name: '新田', reading: 'にった', kind: 'person' },
  mamiya: { canonical: '間宮', name: '間宮', reading: 'まみや', kind: 'person' },
}

/** 表示名（社名・人名共通）。 */
export const displayName = (id: NameId): string => NAMES[id].name
/** name にふりがなを添えた形（人物カードの見出しなど）。reading 無しなら name のみ。 */
export const nameWithReading = (id: NameId): string => {
  const d = NAMES[id]
  return d.reading ? `${d.name}（${d.reading}）` : d.name
}

/** 置換テーブル（canonical/also のうち name と異なるものだけ）。
 *  長い綴りを先に置換し、部分一致の取り違え（「カルゴ物流」より先に「カルゴ」を消す等）を防ぐ。 */
function buildSubs(): Array<{ from: string; to: string }> {
  const subs: Array<{ from: string; to: string }> = []
  for (const d of Object.values(NAMES)) {
    // リネームされていない名前は canonical も also も一切置換しない（＝完全な恒等）。
    if (d.canonical === d.name) continue
    subs.push({ from: d.canonical, to: d.name })
    for (const alt of d.also ?? []) if (alt !== d.name) subs.push({ from: alt, to: d.name })
  }
  return subs.sort((a, b) => b.from.length - a.from.length)
}

/** 地の文の canonical 綴りを現在の表示名へ置換する。リネームが無ければ恒等。 */
export function localizeNames(text: string): string {
  if (!text) return text
  const subs = buildSubs()
  if (subs.length === 0) return text
  let out = text
  for (const s of subs) out = out.split(s.from).join(s.to)
  return out
}

/** オブジェクト/配列を再帰的に走査し、全ての文字列に localizeNames を適用したコピーを返す。
 *  リネームが無ければ（subs 空）元の値をそのまま返す＝コピーも走査もしないゼロコスト。 */
export function localizeDeep<T>(value: T): T {
  if (buildSubs().length === 0) return value
  return walk(value) as T
}
function walk(value: unknown): unknown {
  if (typeof value === 'string') return localizeNames(value)
  if (Array.isArray(value)) return value.map(walk)
  if (value instanceof Set) return new Set([...value].map(walk))
  if (value instanceof Map) return new Map([...value].map(([k, v]) => [k, walk(v)]))
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) out[k] = walk(v)
    return out
  }
  return value
}
