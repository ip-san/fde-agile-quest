import type { BacklogItem } from '../../../types'

// ───────────────────────────────────────────────────────────
// 第1章のプロダクトバックログ（PBI）。
// 配列順＝プロダクトオーナーの初期優先順位（プレイヤーは「提案」として並べ替えできる）。
// 物語の弧に沿う: S1 沈黙の診断 → S2 最小版で誤出荷を減らす → S3 文化を残す。
// estimate はストーリーポイント（相対サイズ）。sprintHint は表示ヒントで、選択をハードロックしない。
// ───────────────────────────────────────────────────────────
export const PRODUCT_BACKLOG: BacklogItem[] = [
  // ── Sprint 1: 現場を知る（沈黙の理由を突き止める） ──
  {
    id: 'pbi-floor-observe',
    title: '現場を観察し、画面が使われない理由を掴む',
    detail: '{{現場主義}}で倉庫に入り、誰が・なぜ在庫画面を使わないのかを観る。',
    estimate: 3,
    sprintHint: 1,
  },
  {
    id: 'pbi-veteran-hearing',
    title: 'ベテランの暗黙知を聞き取り、要件にする',
    detail: '20年勤める現場のやり方を{{ピッキング}}手順から言語化する。',
    estimate: 5,
    sprintHint: 1,
  },
  {
    id: 'pbi-as-is-flow',
    title: '現状の出荷フローを可視化する（As-Is）',
    detail: '手書きメモも含めた今の流れを一枚に。{{誤出荷率}}の発生点を探す。',
    estimate: 2,
    sprintHint: 1,
  },
  // ── Sprint 2: 仮説を形にする（誤出荷を減らす最小版） ──
  {
    id: 'pbi-misship-mvp',
    title: '誤出荷を減らす最小版（{{MVP}}）を出す',
    detail: '全部は作らない。誤出荷に効く一点だけを、現場が今日使える形で。',
    estimate: 5,
    sprintHint: 2,
  },
  {
    id: 'pbi-picking-screen',
    title: '現場の言葉に合わせてピッキング画面を直す',
    detail: '棚番・呼称を現場の語彙に寄せ、迷いをなくす。',
    estimate: 3,
    sprintHint: 2,
  },
  {
    id: 'pbi-stock-reconcile',
    title: '帳簿在庫と実在庫のズレを可視化する',
    detail: '{{棚卸}}差異の原因を、数字で見える形にする。',
    estimate: 3,
    sprintHint: 2,
  },
  {
    id: 'pbi-feedback-loop',
    title: '現場の反応を集める{{フィードバックループ}}を作る',
    detail: '使ってもらい、声を拾い、次に直す。短い循環を回す。',
    estimate: 2,
    sprintHint: 2,
  },
  // ── Sprint 3: 文化を残す（成果を本番と人に根付かせる） ──
  {
    id: 'pbi-handoff-doc',
    title: '運用手順を文書化し、属人化を解く',
    detail: '“あの人がいないと分からない”を無くす。{{技術的負債}}の人版を返す。',
    estimate: 3,
    sprintHint: 3,
  },
  {
    id: 'pbi-dashboard-selfserve',
    title: '現場が自分で見られる{{ダッシュボード}}を用意する',
    detail: '主要な指標を現場が自分で見て、自分で動けるように。',
    estimate: 5,
    sprintHint: 3,
  },
  {
    id: 'pbi-onboarding',
    title: '新メンバーの{{オンボーディング}}導線を整える',
    detail: '仕組みが人から人へ渡るようにする。定着を左右する。',
    estimate: 2,
    sprintHint: 3,
  },
  {
    id: 'pbi-monitoring',
    title: '本番の監視と{{ロールバック}}手順を整える',
    detail: '壊れても戻せる備え。文化として残すための安全網。',
    estimate: 3,
    sprintHint: 3,
  },
]
