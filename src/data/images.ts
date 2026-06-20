// ───────────────────────────────────────────────────────────
// 画像マニフェスト（実写ドキュメンタリー風 / nano-banana 生成）。
// public/img/{key}.jpg を置き、key を AVAILABLE_IMAGES に足すと表示される
//（未登録は描画しない＝404を出さない）。
//
// 画像は2系統（問題と結果で別の絵にする）:
//   ・イベント＝状況の画像: 個別 `${eventId}` / テーマ `theme__${segment}`
//   ・結果＝顛末の画像     : 個別 `${eventId}__${choiceId}__r` / テーマ `theme__${segment}__r`
// 個別があればそれを、無ければセグメント共通のテーマ画像を使う（使い回し）。
// ───────────────────────────────────────────────────────────
import type { GameEvent, Segment } from '../types'

export const AVAILABLE_IMAGES = new Set<string>([
  // 問題（状況）のテーマ画像。public/img/theme__{segment}.jpg
  'theme__genba',
  'theme__kokyaku',
  'theme__team',
  'theme__trouble',
  'theme__chance',
  // 結果（顛末）の個別画像 public/img/{eventId}__{choiceId}__r.jpg は、
  // 問題画像と必ず別の絵を用意できたものだけここに追加する（同一絵の流用は不可）。
  's1-daily-warehouse__b__r', // 田淵さんの手書き台帳を一緒に覗く（信頼の入口）
  's2-daily-ghost-stock__b__r', // 空の棚番をデータと照合する手元（不正暴露の入口・結果）
  's2-retro__b__r', // FDEと田淵さんが並んで手順書を書く（genbaTrust選択の結果・信頼の入口）
  // 状況（問題）の個別画像 public/img/{eventId}.jpg
  's2-daily-ghost-stock', // 空の棚＝在るはずの機材が無い（不正暴露の入口）
  's2-daily-showcase-visit', // スーツの視察団と手書き台帳の田淵さん・期待と現実のギャップ
  's2-daily-missed-context', // 「うちの流れと違う」と田淵さんに指摘される的外れなMVP（現場ヒアリング省略の代償）
  's2-daily-mvp', // スマホで手書きメモを撮影するFDE・小さな一手の着想（MVP）
  's2-daily-repo-aicode', // AI生成コードを前に思案するFDE（AIに書かせるか自分で書くか）
  's3-daily-ai-regression', // 夜のオフィスで集中して原因を探るエンジニア（AIモデル退化の立て直し）
  's1-daily-soumu-access', // 総務部の受付カウンターで入館証の手続きを待つFDE（保守的な総務との折衝）
  's2-daily-keiri-odd', // 経理部で数値を指す経理担当と眉をひそめるFDE（実体の見えない売上＝手がかり）
  's3-daily-circular', // 同じシリアルが複数社を巡る循環取引データ（不正暴露の核心）
  's3-review-topdown', // 本番デモが崩れ赤いエラーが並ぶ画面と凍りつくFDE（主軸の山場）
  's3-review-trust', // 現場の勘が組み込まれデモ成功・専務の視線が現場へ（主軸の山場）
  's3-retro-trust', // 田淵さんが「仕事を奪いに来たと思ってた」と打ち明ける最終レトロ（genbaTrustルートのフィナーレ）
  's3-daily-soumu-paper', // 守屋さんが棚の奥からファイルを出す（不正暴露の紙側）
  's2-retro', // レトロで「暗黙知・課題」が赤丸・腕組みの田淵さん（主軸の分岐点）
  's1-plan-goal', // 「予測機能を約束した」と急かす結城さん・FDEが初日に迫られる選択（ゲーム最初のイベント）
  's1-daily-showcase-order', // 親会社のPhysicalAIデモ指令・窓越し倉庫と書類「Gap vs. Reality」（kokyaku）
  's2-daily-stakeholders', // 会議室・3者が同じ資料に全く違う反応（ステークホルダーごとに「成功」が違う）
  's3-daily-showcase-report', // 役員会議室・地味な成果を発表するFDE・失望した役員たち（期待vs現実の落差）
  's3-daily-handoff-trust', // 倉庫事務室・ベテランが「抜けたら元に戻るんじゃ」と前傾みで問いかける
  's2-daily-promise-gap', // タスク消化するFDE・ガラス越しに手書き作業が続く倉庫（ゴールの空回り）
  's1-daily-standup-zombie', // 全員が紙を読む形骸化したデイリー・触られないカンバン（zombie standup）
  's1-daily-cando', // 腕組みの係長・反論しかける若手・代案を書く3人目（無理筋要求と「できません」の分岐）
  's2-daily-pair', // ベロシティ折れ線を指す係長・うつむくチーム（ノルマ化の圧力）
  's2-daily-pm', // 2人が別の付箋を指し合う・間で困り顔のリード（優先順位の綱引き）
  's3-daily-dissent', // 若手が反論・シニアが受容・周囲が前のめり（心理的安全性のシーン）
  's3-daily-credit', // 演台で自信満々の部長・背後に黙って座る作業服チーム（横取りされる手柄）
  's2-plan-kpi', // KPI設定会議：「機能数」か「誤出荷率」か（wrongKpiFlagの起点）
  's2-daily-costcut', // 人事部で新田さんが人員削減の書類を前に切り出す（「人を減らして数字を作れ」）
  's2-daily-blamewar', // 会議室で責任を押し付け合う結城さんと業務側・専務の機嫌が悪化（組織の機能不全）
  's2-daily-demofail', // レビュー前夜・エラー画面を前に深夜一人で向き合うFDE（本番前夜の危機）
  's3-daily-faction', // 課長がFDEに耳打ち・背後で現場が凍りつく（契約解除と出向の脅し）
  's3-daily-mentor', // 夜の倉庫で久遠さんがコーヒーを差し出す（FDE哲学の問い）
  's3-daily-stuck-base', // 警告ログが流れるレガシー基盤（missedUpgradeの着地点）
  's3-daily-lastman', // 空いた椅子を囲み全員が顔を見合わせる（組織のAccountability欠如）
  's3-daily-keiri-closing', // 経理部で間宮さんと連結決算の循環を記録（不正暴露の会計ルート）
  's3-daily-rework', // 誰も使わない新機能タブと、メモを続ける現場（wrongKpiの着地点）
  's3-retro-topdown', // 沈んだチームと現場の溝・頭を下げるFDE（topDownルートの結末）
  's1-daily-warehouse', // 倉庫の片隅・田淵さんが手書きノートで棚卸し・端末は埃をかぶる（最初の遭遇）
  's1-daily-tanaoroshi', // 田淵さんが「毎月この棚だけズレる」と棚を指差す月次棚卸（暗黙知の入口）
  's1-daily-5s', // 人気商品が遠い棚に・動線が交差する倉庫レイアウト（誤出荷の物理的原因）
  's1-daily-silentui', // 「どうせ紙に書き写すんだ」・印刷画面と手書きノートが並ぶ（StockPilotが使われない理由の芯）
  's1-daily-ally', // 現場パートさんが「前から不便だと思ってた」と声をかける（思わぬ味方）
  's2-daily-ai-handoff', // AIが猛速でコードを生成・橋本さんが「全部任せちゃえば？」（丸投げの誘惑）
  's3-daily-scope-creep', // 成功後に「ついでにあれも」と要望が膨らむホワイトボード（スコープクリープ）
  's1-daily-cynefin', // 「ただの画面追加でしょ？」と言う結城さん・実は部署ごとに違う複雑な引当ロジック（複雑系の罠）
  's3-daily-3pl', // 赤城部長が「3PLに出せば？」とコスト表を示す・現場の知が外に出ていく分岐点
  's1-daily-hideknowhow', // 田淵さんが口を閉ざす・「見て覚えるもんだ」（ノウハウを隠す恐れ）
  's1-daily-feedback', // 「これ、全然使えない」と言われるレビューシーン（Sprint1序盤の厳しいダメ出し）
  's1-daily-jousys-gate', // サーバ室の扉で腕組みの結城係長・申請書を持つFDE（開かない城門）
  's1-retro', // Sprint1初レトロ・付箋だらけのホワイトボードを前にチームが集まる（形か本気か）
  's2-daily-shadow-it', // 「シャドーIT禁止」付箋・三者の攻防（野良ツール発覚）
  // troubleセグメント個別画像
  's1-daily-logs', // 沈黙するアクセスログ（誰も使っていない在庫画面）
  's1-daily-bottleneck', // 橋本さんの机に行列・ホワイトボードにWMSトラブル・棚番変更・配車（詰まりの一点）
  's1-daily-incident', // 夕方のWMSフリーズ・ERROR画面を囲む作業員・一人は電話中（出荷直前の危機）
  's3-daily-sre', // 深夜の空いたオフィスで一人エンジニア・エナジードリンク・エラーログ画面（本番障害）
  's3-daily-blame', // 役員が前傾みで指さし・チームが俯く会議室（「誰のミスだ」犯人探し）
  's2-daily-soumu-badge', // 赤いERRORランプのゲートで困惑するエンジニア・受付で書類を持つ総務（失効した入館証）
  's2-daily-tolerance', // 精度の頭打ち（AIモデル精度92%で横ばい・チームが限界に直面）
  's3-daily-metrics', // 誰がダッシュボードを見るか（誰もいない前に稼働し続けるダッシュボード）
  's3-daily-ai-agent', // AIエージェントに権限を渡すか（サーバ室でアクセス権限を前に葛藤するエンジニア）
  's3-daily-leadership', // 壁の時計・全員が顔を見合わせ沈黙する会議室（「誰が決めるのか」）
  // chanceセグメント個別画像
  's2-daily-idea', // 倉庫事務室・ベテランがエンジニアのノートPCを指差し改善案を提案（現場からの改善案）
  's2-daily-leadtime', // 会議室・係長がグラフ画面に身を乗り出す・需要予測への期待
  's3-daily-scale', // 役員会議室・地図を指す役員・拠点展開の野心（横展開の誘い）
  's1-daily-rough', // オフィスで手を止めるエンジニア・完璧主義で出せない手が固まる
  's3-daily-ai-partner', // デュアルモニターでAI出力を批判的に精査するエンジニア（AIと協働）
  's3-daily-craft', // 夕暮れの会社玄関に立つエンジニア・次の現場へ向かう静かな決意
  's1-daily-ai-chores', // AIで定型作業を終えたエンジニアが窓の外を見つめる（空いた時間をどう使うか）
  's2-daily-depth', // 若手がAIコードを指して「専門性なんて要る？」・先輩が眉をひそめる（専門性の議論）
  // genbaセグメント個別画像
  's1-daily-ai-context', // AIが現場用語を取り違える（生成した手順が現場の言葉と噛み合わない）
  's1-daily-diagram', // 頭の中の在庫フロー（言語化できない暗黙知を図解しようとする）
  's1-daily-translate', // 「見える化したい」（現場の要望をシステム要件に翻訳する難しさ）
  's1-daily-excel', // 巨大なExcel（現場が独自に作り上げた複雑な管理表との格闘）
  's2-daily-return', // 作り込みの沼（機能の作り込みに夢中になり現場を見失う）
  's2-daily-fillrate', // 回転率と充足率の板挟み（削減要求と欠品リスクの間で引き裂かれる倉庫管理者）
  's2-daily-crossdock', // クロスドッキングで在庫ゼロだ（理想の物流改革案と現実のスケジュール乖離）
  's2-daily-handwork', // 勘で保たれる流通加工（ベテランの手作業の暗黙知をどう受け継ぐか）
  's3-daily-genba', // 定着の確認（新しいプロセスが現場に根付いているか共に確かめる巡回）
  's3-daily-prod', // もう少し磨いてから？（本番デプロイ前の完璧主義と出荷判断の葛藤）
  // teamセグメント個別画像
  's1-daily-standup', // デイリースクラムにて（チームの状況確認・誰が何をやるか）
  's1-daily-practice', // 尻込みするチーム（最初のスプリントでのチーム実践の迷い）
  's1-daily-estimate', // 「もう2つ、足せませんか」（スプリント中の追加見積もり要求）
  's2-daily-ai-code', // AIが書いたコードのバグ（AI生成コードの問題をチームで対処）
  's2-daily-close', // 結論の出ない打ち合わせ（ファシリテーション不足で決まらない）
  's2-daily-hypothesis', // 「検討します」の誘惑（仮説検証を避けて先送りするチーム）
  's2-daily-dod', // 「完成」って、どこから？（DoD合意なき完成基準の曖昧さ）
  's2-daily-flow', // 全員忙しいのに終わらない（WIP制限なしのフロー問題）
  's2-daily-refine', // 曖昧なまま着手する？（リファインメント不足でスプリント入りする葛藤）
  's2-daily-courage', // 言いにくい一言（心理的安全性・勇気ある発言の分岐点）
  's3-daily-onboard', // 引き継ぎのデイリー（新メンバーをボードで迎え入れるベテラン）
  's3-daily-boundary', // 宙に浮くデータ移行（情シスとベンダーが互いに指差し・誰も引き取らないタスク）
  's3-retro', // 最後のレトロスペクティブ（学びを言語化するチームの円陣・東京スカイツリーが見える）
  's3-daily-handover2', // 手順書か、橋本さんか（業務手順書を無視して人に聞く群衆）
  's3-daily-retro-owner', // 「やろう」で終わる改善（担当者名のないアクションアイテムで頷くチーム）
  's3-daily-bottleneck', // 窓口が、あなたで止まる（一人の開発者に群がる行列・属人化の帰結）
  // kokyakuセグメント個別画像
  's1-daily-scope', // 増えていく要望（次々と付箋を追加するステークホルダー）
  's1-daily-jinji-roster', // 偏る残業（人事部で棒グラフを指差す・一人への集中が一目瞭然）
  's1-review', // スプリントレビュー：まだ"機能"はない（空のスクリーンの前で困惑するPO）
  's2-daily-pressure', // 横やりの催促（上司がデイリースクラムに乗り込んで予測機能を迫る）
  's2-daily-record', // 口頭の「OK」（廊下での口頭承認・メモなし）
  's2-daily-demo', // 進捗を説明しろ（経営会議で進捗デモ要求）
  's2-daily-anxiety', // どこか不安そうな顔（リリース直前の不安なステークホルダー）
  's2-review', // スプリントレビュー：現場が触る（現場が叩き台を操作）
  's2-daily-goalcreep', // 揺らぐスプリントゴール（スプリント中の割り込み要求）
  's2-daily-aidata', // 使えるデータ、使っていいデータ（AIデータ活用倫理）
  's2-daily-jousys-perm', // 本番は、渡さない（サーバールームで情シスが権限拒否）
  's2-daily-soumu-hyoka', // 橋本さんの評価問題（総務部の人事評価書類）
  's2-daily-soumu-ringi', // 総務部の稟議承認（稟議書が総務で詰まる）
  's2-daily-hqorder', // 本社からの一律通達（本社から在庫3割削減通達）
  's3-plan-handoff', // 本番化の構え（最終スプリントのプランニング）
  's3-daily-referral', // 広がる評判（別部署からアプローチ）
  's3-daily-sales', // 「で、いくらで売れる？」（経営が商用化を尋ねる）
  's3-daily-facts', // 混ざる事実と願望（事実と仮定が混在する報告書）
  's3-daily-drive', // 紛糾する会議（誰も決めない会議）
  's3-review', // 最終レビュー：成果を語る（専務への最終報告）
  's3-daily-outcome', // 「動く」と「使われる」の谷（完成したが使われないシステム）
  's3-daily-numbers', // 数字だけ並べるか（数字のみの最終報告）
  's3-daily-subcon', // 下請けへの値下げ要求（下請けへの圧力）
  // プロローグ4パネルの情景画像（cast.ts の PROLOGUE_PANELS.image）
  'prologue-boardroom', // 役員会議：横ばいの売上グラフと沈鬱な役員、末席の主人公
  'prologue-summons', // 呼び出し：会議後の廊下で社長(鷹野)が主人公に語りかける、横に久遠
  'prologue-assignment', // 送り込まれる先：棚の端末が使われず手書き台帳を書くベテラン
  'prologue-firstday', // 最初の一日：早朝の通用口に立つ主人公、倉庫の喧騒が始まる
  'map-cargo', // 現地マップの俯瞰イラスト背景（Travel の背景画像マップ）
])

export function imageUrl(key: string): string {
  return `${import.meta.env.BASE_URL}img/${key}.jpg`
}

/** 利用可能な最初のキーを返す（個別 > テーマ）。無ければ null */
function pick(keys: string[]): string | null {
  for (const k of keys) if (AVAILABLE_IMAGES.has(k)) return k
  return null
}

/** イベント（問題）の状況画像キー */
export function eventImage(event: GameEvent): string | null {
  return pick([event.id, `theme__${event.segment}`])
}

/** 結果（選択後）の顛末画像キー。問題の状況画像とは別物にするため、専用の個別画像のみ
 *  （無ければ結果には画像を出さない＝問題画像と必ず異なる）。segment は将来のテーマ結果画像用に保持 */
export function resultImage(eventId: string, choiceId: string, _segment: Segment): string | null {
  return pick([`${eventId}__${choiceId}__r`])
}
