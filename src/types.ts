// ───────────────────────────────────────────────────────────
// FDE Agile Quest ドメインモデル
// キャンペーン = スプリント × スクラムセレモニー。
// 各セレモニーで「ルーレットを回す→イベント発生→トレードオフ判断→メーター増減」。
// ───────────────────────────────────────────────────────────

/** メーター。すべて 0..10。「全部を上げる単一最適解」はない＝価値同士のトレードオフ。
 *  どれか1つでも0になると、その時点で案件は失敗（バッドエンド）。 */
export interface Meters {
  /** 顧客の信頼 */
  trust: number
  /** 現場理解度 */
  insight: number
  /** チームの巻き込み度（アジャイル文化） */
  culture: number
}

/** メーターのキー */
export type MeterKey = keyof Meters

/** ゲーム内フラグ（選択で立ち、後のイベント出現条件になる）。生stringだとタイポを検知できないためユニオンで縛る */
export type GameFlag = 'wrongKpi'

/** 進行状態 */
export type Status = 'playing' | 'event' | 'ended'

/** スクラムのセレモニー（スプリントの中の節目） */
export type Ceremony = 'planning' | 'daily' | 'review' | 'retro'

/** ルーレットのセグメント＝イベントの種類（現場の不確実性） */
export type Segment = 'genba' | 'kokyaku' | 'team' | 'trouble' | 'chance'

/** メーターへの効果（指定キーのみ加算） */
export type Effects = Partial<Meters>

/** 1つの選択肢（トレードオフ。正解はない） */
export interface Choice {
  id: string
  /** 選択肢ラベル。{{用語}} で用語を埋め込める */
  label: string
  effects: Effects
  /** 選択後に表示される結果テキスト。{{用語}} 可 */
  resultText: string
  /** この選択で立つフラグ（例: 'wrongKpi'）。後スプリントの手戻りイベントを誘発 */
  setsFlag?: GameFlag
  /** 危険な選択（UIで警告表示） */
  warn?: boolean
}

/** ルーレットで引かれるイベント */
export interface GameEvent {
  id: string
  /** 所属スプリント番号（1始まり） */
  sprint: number
  /** どのセレモニーで起きるか */
  ceremony: Ceremony
  segment: Segment
  title: string
  /** 状況描写。{{用語}} で用語を埋め込める */
  narrative: string
  choices: Choice[]
  /** このフラグが立っている時だけ出現する（手戻りイベント等） */
  requiresFlag?: GameFlag
}

/** スプリント定義 */
export interface SprintDef {
  /** スプリント番号（1始まり） */
  n: number
  title: string
  /** スプリントゴール */
  goal: string
  /** このスプリントで巡るセレモニーの並び（=ビート列） */
  beats: Ceremony[]
}

/** 用語集エントリ（従＝いつの間にか慣れる） */
export interface Term {
  key: string
  label: string
  reading?: string
  desc: string
}

/** エピローグ（結末画面に出す文章）。通常エンディングと失敗エピローグの共通形 */
export interface Epilogue {
  id: string
  title: string
  /** 振り返り文（FDE心得を引いて） */
  reflection: string
}

/** 通常エンディング定義（メーターの組み合わせで判定） */
export interface Ending extends Epilogue {
  /** この順に条件評価し、最初にマッチしたものを採用 */
  match: (m: Meters) => boolean
}

/** イベントログの1エントリ */
export interface LogEntry {
  sprint: number
  ceremony: Ceremony
  eventTitle: string
  choiceLabel: string
  resultText: string
}

/** 判断直後に「結果を一度ちゃんと見せる」ための結果ビュー */
export interface ResultView {
  eventTitle: string
  ceremony: Ceremony
  segment: Segment
  choiceLabel: string
  resultText: string
  /** 選んだ選択肢のメーター増減（差分表示用） */
  effects: Effects
  warn?: boolean
}
