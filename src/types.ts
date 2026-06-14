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
export type GameFlag =
  | 'wrongKpi'
  | 'aiOverreliance'
  | 'genbaTrust'
  | 'topDown'
  // 不正暴露アーク: 手がかり / 強い証拠 / フィナーレの選択（暴く・黙認・取り込まれる）
  | 'fraudClue'
  | 'fraudCase'
  | 'exposed'
  | 'complicit'
  | 'coopted'

/** 進行状態。travel＝デイリーでルーレット後、リモート朝会＋現地マップ移動の最中 */
export type Status = 'playing' | 'travel' | 'event' | 'ended'

/** 主人公が動き回る場所。現地6箇所（倉庫/電算室/会議室/総務部/人事部/経理部）＋リモート接続の開発室。
 *  デイリーのマップ移動で選ぶ */
export type LocationId =
  | 'warehouse'
  | 'serverroom'
  | 'client'
  | 'soumu'
  | 'jinji'
  | 'keiri'
  | 'repo'
  | 'devroom'

/** リモート・デイリースクラムで話す役割（画面の向こうのルーメンのチーム）。
 *  役割ごとに「ヒントの観点」が違う＝スクラムの役割を自然に学ぶ */
export type DailyRole = 'po' | 'sm' | 'dev'

/** スクラムのセレモニー（スプリントの中の節目） */
export type Ceremony = 'planning' | 'daily' | 'review' | 'retro'

/** ルーレットのセグメント＝イベントの種類（現場の不確実性） */
export type Segment = 'genba' | 'kokyaku' | 'team' | 'trouble' | 'chance'

/** 選択後の「実行」ミニゲームの種類（開発＝タイミング型／ヒアリング＝選択型） */
export type MiniGameKind = 'dev' | 'hearing'

/** ミニゲームの出来。倍率＝選択の主正メーターを great:+1 / good:±0 / poor:-1 する */
export type ExecTier = 'great' | 'good' | 'poor'

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
  /** 生成AIに頼る選択が消費するトークン量（消費型リソース）。残量が足りないと選べない＝AIショートカット封印 */
  tokenCost?: number
  /** リポジトリの健全度への影響（開発の質）。coverage=テストカバレッジ増減(%)、debt=技術的負債増減。
   *  良い開発（レビュー/DoD/検証/リファクタ）で coverage+、雑な開発（丸投げ/省略）で debt+/coverage-。 */
  repo?: { coverage?: number; debt?: number }
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
  /** 選択後の実行ミニゲームの種類。未指定なら segment から既定（作る/直す=dev、人と現場=hearing） */
  minigame?: MiniGameKind
  /** このイベントが起きる場所。未指定なら segment から既定（locations.ts の LOCATION_BY_SEGMENT） */
  location?: LocationId
  /** リモート朝会の役割別ヒント（任意）。未指定の役割は場所テンプレから自動生成。
   *  山場のイベントだけ手書きして印象づける */
  hints?: Partial<Record<DailyRole, string>>
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
  /** 画像パス導出用 */
  eventId: string
  choiceId: string
  eventTitle: string
  ceremony: Ceremony
  segment: Segment
  choiceLabel: string
  resultText: string
  /** 実際に適用されたメーター増減（ミニゲームの倍率込み・差分表示用） */
  effects: Effects
  warn?: boolean
  /** 実行ミニゲームの出来と、倍率で増減した主正メーター（結果バッジ表示用） */
  execTier?: ExecTier
  execPrimary?: MeterKey | null
  execDelta?: number
  minigameKind?: MiniGameKind
  /** この選択で消費した生成AIトークン（表示用。0/未消費なら省略） */
  tokenSpent?: number
  /** このイベントが体現するFDE心得のID（手帳に集まる） */
  precepts: number[]
  /** このうち、今回はじめて出会った心得のID（「NEW」表示用）。store が埋める */
  newPreceptIds: number[]
}
