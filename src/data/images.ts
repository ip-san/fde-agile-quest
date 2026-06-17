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
  // プロローグ4パネルの情景画像（cast.ts の PROLOGUE_PANELS.image）
  'prologue-boardroom', // 役員会議：横ばいの売上グラフと沈鬱な役員、末席の主人公
  'prologue-summons', // 呼び出し：会議後の廊下で社長(鷹野)が主人公に語りかける、横に久遠
  'prologue-assignment', // 送り込まれる先：棚の端末が使われず手書き台帳を書くベテラン
  'prologue-firstday', // 最初の一日：早朝の通用口に立つ主人公、倉庫の喧騒が始まる
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
