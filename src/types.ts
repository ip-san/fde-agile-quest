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
  // 機会損失アーク: 朝会で“競合する優先”の1つを選ぶと、見送った重要事が後で響く
  | 'missedHearing' // 現場の聞き取りを見送った＝理解不足の手戻り
  | 'missedUpgrade' // 基盤の更新/対応を見送った＝後で詰まる
  | 'missedNightShift' // 夜勤帯の“深い本音”を掘り当てられなかった（信頼ゲート未達／浅い聞き取り）＝後で誤出荷として顕在化
  // カンバン→物語の橋: 浅い(quick)レビューのまま DoD を妥協して Ship した＝undone work。
  // 後段で demofail/debt のトラブル回として“負債の取り立て”を呼ぶ（narrative 側で requiresFlag 配線）。
  | 'shippedUndone'
  // 機構②: スプリント精算で“どちらのステークホルダーを優先したか”の非対称トレードオフを記録。
  // 一方のゴール項目を届けて他方を未達にした＝後段で後回しにされた側が遅れて反応する（機会コスト型）。
  | 'deprioritizedJoushi' // 情シス(結城)のゴール項目を後回し＝発注者の不安・面子（trust摩擦）として後で響く
  | 'deprioritizedGenba' // 現場(田淵)のゴール項目を後回し＝理解不足・手戻り（insight機会損失）として後で響く
  // 買収の皮肉アーク: 親会社(ジェネリック電機)の“フィジカルAI実証ショーケース”圧力が立つ。
  // 夢（実証）と現実（アナログ現場）の落差を巡る連鎖（視察→報告）の起点フラグ
  | 'showcasePressure'
  // プランニングの決定が後で響くアーク（プランニング→ストーリー分岐）:
  | 'chasedPromise' // S1: 背景を確かめず“約束（予測機能）”を追ってゴールにした → 後で空回り
  | 'groundedGoal' // S1: 現場の沈黙を起点に“なぜ使われないか”をゴールに据えた → 後で芯を捉える
  | 'soloHero' // S3: 移譲せず“自分が運用の窓口”をゴールにした → 後で属人化のボトルネック

/** 進行状態。travel＝デイリーでルーレット後、リモート朝会＋現地マップ移動の最中 */
export type Status = 'playing' | 'travel' | 'event' | 'ended'

/** 主人公が動き回る場所。現地6箇所（倉庫/電算室/会議室/総務部/人事部/経理部）＋リモート接続の開発室。
 *  デイリーのマップ移動で選ぶ。リポジトリはコードに触れる“画面の中”であり行き先ではない
 *  （状態確認は下部メニューの専用パネル、コード作業は開発室に繋いで行う）。 */
export type LocationId = 'warehouse' | 'serverroom' | 'client' | 'soumu' | 'jinji' | 'keiri' | 'devroom'

/** リモート・デイリースクラムで話す役割（画面の向こうのルミクラウドのチーム）。
 *  役割ごとに「ヒントの観点」が違う＝スクラムの役割を自然に学ぶ */
export type DailyRole = 'po' | 'sm' | 'dev'

/** スクラムのセレモニー（スプリントの中の節目） */
export type Ceremony = 'planning' | 'daily' | 'review' | 'retro'

/** ルーレットのセグメント＝イベントの種類（現場の不確実性） */
export type Segment = 'genba' | 'kokyaku' | 'team' | 'trouble' | 'chance'

/** 選択後の「実行」ミニゲームの種類（開発＝タイミング型／ヒアリング＝選択型／レビュー＝AI差分の点検） */
export type MiniGameKind = 'dev' | 'hearing' | 'review'

/** ヒアリングの問いを「相手・場面」で変えるテーマ（現場/依頼主/機会/チーム）。
 *  既定はイベントの segment から導出（hearingThemeFor）。問いプール・見出しは minigames.ts。 */
export type HearingTheme = 'genba' | 'kokyaku' | 'chance' | 'team' | 'chousa' | 'inin'

/** ミニゲームの出来。倍率＝選択の主正メーターを great:+1 / good:±0 / poor:-1 する */
export type ExecTier = 'great' | 'good' | 'poor'

/** スプリントバックログ項目のレビュー深さ。浅い＝速いが負債、深い＝テストで品質を積む */
export type ReviewDepth = 'quick' | 'thorough'

/** レトロで選べるプロセス改善レバー（機構：Retro 昇格）。capacity＝レビューの量／wip＝質。 */
export type RetroLever = 'capacity' | 'wip'

/** メーターへの効果（指定キーのみ加算） */
export type Effects = Partial<Meters>

/** ヒアリングの問いの選択肢。good:true＝核心に迫る良い問い／good:false＝場をズラす/誘導/決めつけ等の悪い問い。
 *  単一の真実源をこの低層モジュールに置き、minigames.ts と各ミニゲームはここを import/re-export する。 */
export interface HearingOption {
  text: string
  good: boolean
}

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
  /** プランニングの選択肢のみ：この狙いを選ぶと、その周回のスプリントゴール表示になる */
  sprintGoal?: string
  /** レトロの選択肢のみ：選んだプロセス改善を次スプリント以降に効かせる（機構：Retro 昇格）。
   *  'capacity'＝レビュー容量+1（制約理論：ボトルネックを広げる）／'wip'＝WIP上限−1（フロー改善）。
   *  1レトロ1つ＝他は見送り（機会コスト）。retroImprovements に積まれ canStart/精算リセットに反映。 */
  retroLever?: RetroLever
  /** 危険な選択（UIで警告表示） */
  warn?: boolean
  /** 「静観」スタンス＝今は動かない／観察する／即答しない選択（サクラ大戦LIPSの「沈黙も選択」の移植）。
   *  UIで識別表示する。多くの場面で賢手だが、動くべき局面では悪手になりうる＝単一最適解はない。 */
  restraint?: boolean
  /** この選択で“発見”する「次の機能の種」のID（seeds.ts）。現場の観察から製品(StockPilot)へ還元する種。 */
  seedId?: string
  /** この選択（主にヒアリング）で“掘り当てる”発見可PBIのID（DISCOVERABLE_BACKLOG）。
   *  現場の声がプロダクトバックログの新項目になる＝発見をバックログへ還元する。ヒアリングの出来が poor だと掘り当てられない。 */
  discoversPbi?: string
  /** 生成AIに頼る選択が消費するトークン量（消費型リソース）。残量が足りないと選べない＝AIショートカット封印 */
  tokenCost?: number
  /** リポジトリの健全度への影響（開発の質）。coverage=テストカバレッジ増減(%)、debt=技術的負債増減。
   *  良い開発（レビュー/DoD/検証/リファクタ）で coverage+、雑な開発（丸投げ/省略）で debt+/coverage-。 */
  repo?: { coverage?: number; debt?: number }
}

/** 推理（見抜く）の選択肢。建前・ノイズに紛れた「本音（真の制約）」を1つだけ truth にする。 */
export interface DeductionOption {
  id: string
  /** 候補の文（証言・建前・ノイズ）。{{用語}} 可 */
  text: string
  /** これが現場の本音（正解）か。1つの Deduction にちょうど1つだけ true */
  truth?: boolean
  /** 外したときの一言（なぜ本音でないか）。{{用語}} 可 */
  miss?: string
}

/** 選択の前に挟む「現場の本音を見抜く」推理ステップ（任意）。GameEvent.deduction でのみ使用。
 *  当てると本音ヒントを得て選択へ（情報優位）、外すと手探りで選択へ。正解探し＝逆転裁判の“見抜く”快感の移植。 */
interface Deduction {
  /** 問い（例: この現場の“本当の問題”はどれだ？） */
  prompt: string
  /** 候補。ちょうど1つが truth。表示はこの順 */
  options: DeductionOption[]
  /** 見抜いたときに開示する本音のヒント（選択画面に表示）。{{用語}} 可 */
  reveal: string
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
  /** 選択の前に挟む「本音を見抜く」推理（任意）。当てると本音ヒントを得て選択へ。 */
  deduction?: Deduction
  choices: Choice[]
  /** このフラグが立っている時だけ出現する（手戻りイベント等） */
  requiresFlag?: GameFlag
  /** 物語の縦糸の“入口”。デイリー候補で最優先し、そのスプリントで未遭遇のまま最後のデイリーに来たら必ず提示する
   *  （ルーレットの引きで主軸/不正の入口を取り逃して物語が断片化するのを防ぐ）。1スプリント高々1つ。 */
  pinned?: boolean
  /** 選択後の実行ミニゲームの種類。未指定なら segment から既定（作る/直す=dev、人と現場=hearing） */
  minigame?: MiniGameKind
  /** ヒアリングのミニゲームで提示する“このイベント固有の現場の声”（任意）。
   *  指定するとこのイベントの場面に合った問い（良問2＋悪問3 が目安）が出る。
   *  未指定なら従来どおりテーマ別の汎用プール（dealHearing）にフォールバック。
   *  good:true＝核心に迫る良い問い／good:false＝場をズラす/誘導/決めつけ等の悪い問い。 */
  hearingOptions?: HearingOption[]
  /** ヒアリングの問いのテーマ（相手・場面）を明示する（任意）。未指定なら segment から既定（hearingThemeFor）。
   *  主に trouble セグメントをヒアリングにする時に使う：調査=genba／対人=team を意図どおり出すため。 */
  hearingTheme?: HearingTheme
  /** このイベントが起きる場所。未指定なら segment から既定（locations.ts の LOCATION_BY_SEGMENT） */
  location?: LocationId
  /** リモート朝会の役割別ヒント（任意）。未指定の役割は場所テンプレから自動生成。
   *  山場のイベントだけ手書きして印象づける */
  hints?: Partial<Record<DailyRole, string>>
  /** この候補を“見送った”時に立つ機会損失フラグ（任意）。朝会で別の優先を選ぶと後で響く */
  missedFlag?: GameFlag
  /** 朝会で各役割がこの候補を推す“主張”（任意）。未指定なら役割×場所テンプレから自動生成 */
  advocacy?: Partial<Record<DailyRole, string>>
  /** 人員削減・コスト圧力・社内政治など、「価値/障害/コード」の語彙で語ると称揚・矮小化に
   *  なる題材。場所（人事/総務/経理）や不正フラグで拾えないもの（本社通達・下請け値下げ等）を
   *  明示マークし、朝会を中立バンク＋禁止語フォールバックに回す（isSensitiveEvent の単一の真実源）。 */
  sensitive?: boolean
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

/** プロダクトバックログ項目（PBI）。章ごとに用意する“やりたいこと”の元データ。
 *  配列順＝プロダクトオーナーの初期優先順位。プレイヤーは並べ替え（提案）し、
 *  プランニングで上位を「予測（フォーキャスト）」としてスプリントバックログに引く。 */
export interface BacklogItem {
  id: string
  /** 項目名。{{用語}} 埋め込み可 */
  title: string
  /** 1行補足（任意） */
  detail?: string
  /** ストーリーポイント（相対サイズの見積り。1,2,3,5,8…） */
  estimate: number
  /** 物語上どのスプリントに資するかのヒント（表示用。選択をハードロックはしない） */
  sprintHint?: number
  /** 初期は伏せられた“発見可”PBI。プロダクトバックログには最初は出ず、ヒアリングで掘り当てると現れる
   *  （DISCOVERABLE_BACKLOG に置く。通常の PRODUCT_BACKLOG とは別管理）。 */
  discoverable?: boolean
  /** 発見可PBIの“信頼ゲート”（任意）。この信頼(trust)に達していないと、良いヒアリングでも掘り当てられない。
   *  ＝深い本音は現場の信頼を貯めて初めて出る（一発で真実が湧く美化を避ける）。未指定＝ゲート無し。
   *  掘り損ねた重要PBIは、後段で強制イベントとして高コストに顕在化させる（narrative 側で配線）。 */
  requiresTrust?: number
  /** 掘り損ね（poor／信頼ゲート未達でこのPBIを発見できなかった）時に立てる機会損失フラグ（任意）。
   *  ＝深く聞こうとして空振った選択も“沈黙”させず、後段の強制イベントで機会コストを顕在化させる。
   *  未指定＝掘り損ねても何も立たない（重要でないPBI）。 */
  missedFlag?: GameFlag
  /** このPBIを“推す”ステークホルダー（任意）。機構②：スプリント精算で「どちらを優先したか」の
   *  非対称トレードオフを判定するのに使う。情シス(発注者・結城)＝進捗を見せたい側／現場(田淵)＝使える物が欲しい側。
   *  未指定＝どちらの綱引きにも属さない（文化・基盤などの中立項目）。 */
  stakeholder?: 'joushi' | 'genba'
}

/** スプリント末（レビュー）のバックログ精算結果。done は二値（DoD未達は部分点なし）。 */
export interface BacklogReview {
  /** このスプリントで完成（DoD達成）した項目 */
  done: { id: string; title: string; estimate: number }[]
  /** 予測したが容量を超え、次へ持ち越した項目（キャリーオーバー） */
  carryover: { id: string; title: string; estimate: number }[]
  /** 今スプリントのベロシティ（完了ポイント合計） */
  velocity: number
  /** 着手の完遂度に応じた culture の増減（+1/0/−1） */
  cultureDelta: number
  /** このスプリントで顧客価値（北極星）が前スプリント（初回は開始時）からどれだけ伸びたか。
   *  ＝「成果がどれだけ前進したか」をレビューで可視化する（成長の手応え）。progression が埋める。 */
  valueGain?: number
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

/** エンディング判定の文脈。3メーター（道中の関係性）に加え、
 *  「去り際に残した仕組みの実体」＝レガシーが定着したか（太く残せたか）を持つ。
 *  ＝判断（ルーレット層）と実装（バックログ層）の両方が結末に合流する単一の入力。 */
export interface EndingContext {
  meters: Meters
  /** 「太く残す」PBI（手順書/オンボーディング/監視）を過半 Ship し、かつ属人化させなかった
   *  （soloHero でない）＝仕組みが自分なしで回る状態を残せたか。最上位エンディングの AND 関門。
   *  ★Ship 数（出力）ではなく「どの成果を・定着まで残したか」で読む（velocity 至上主義を避ける）。 */
  legacyEmbedded: boolean
}

/** 通常エンディング定義（メーター＋レガシーの組み合わせで判定） */
export interface Ending extends Epilogue {
  /** この順に条件評価し、最初にマッチしたものを採用 */
  match: (ctx: EndingContext) => boolean
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
  /** 推理で本音を見抜けた「見抜きボーナス」で加算された理解（選択効果とは別枠の表示用）。 */
  deductionBonus?: number
  /** この選択で発見した「次の機能の種」のID（seeds.ts）。表示用。 */
  seedId?: string
  /** その種が今回はじめての発見か（「NEW」演出用。store が埋める）。 */
  seedNew?: boolean
  /** この選択で動いたテストカバレッジ（負債ドラッグ適用後の実値）／技術的負債の差分（表示用） */
  coverageDelta?: number
  /** うち、会心(great)実行の“腕前”でコード品質に上乗せされた分（あれば。会心＝純増の演出用）。 */
  skillCoverageBonus?: number
  /** 会心(great)を連続した回数（great時のみ。2以上で“実装の波”を演出）。 */
  greatStreak?: number
  debtDelta?: number
  /** このイベントが体現するFDE心得のID（手帳に集まる） */
  precepts: number[]
  /** このうち、今回はじめて出会った心得のID（「NEW」表示用）。store が埋める */
  newPreceptIds: number[]
  /** スプリントレビューの結果に添える、バックログの精算（レビューのイベントのみ）。 */
  backlogReview?: BacklogReview
  /** この選択（ヒアリング）で新たにプロダクトバックログに掘り当てた発見可PBI（表示用）。 */
  discoveredPbi?: { id: string; title: string }
}
