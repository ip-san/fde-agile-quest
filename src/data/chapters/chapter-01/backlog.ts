import type { BacklogItem } from '../../../types'

// ───────────────────────────────────────────────────────────
// 第1章のプロダクトバックログ（PBI）。
// 配列順＝プロダクトオーナーの初期優先順位（プレイヤーは「提案」として並べ替えできる）。
// 物語の弧に沿う: S1 沈黙の診断 → S2 最小版で誤出荷を減らす → S3 文化を残す。
// estimate はストーリーポイント（相対サイズ）。sprintHint は表示ヒントで、選択をハードロックしない。
// ───────────────────────────────────────────────────────────
// stakeholder（機構②）＝この項目を“推す”相手。joushi＝情シス(結城・進捗を見せたい発注側)／genba＝現場(田淵・使える物が欲しい側)。
// スプリント精算で「一方のゴールを届け他方を未達」のとき、後回しにした側の反応フラグが立つ（resolveSprintBacklog）。
// ★初期割当。narrative-designer が物語上の綱引きに合わせて見直す前提（S2/S3 に両者のゴールが混在するよう配分）。
export const PRODUCT_BACKLOG: BacklogItem[] = [
  // ── Sprint 1: 現場を知る（沈黙の理由を突き止める）＝この章の入口は全て現場側 ──
  {
    id: 'pbi-floor-observe',
    title: '現場を観察し、画面が使われない理由を掴む',
    detail: '{{現場主義}}で倉庫に入り、誰が・なぜ在庫画面を使わないのかを観る。',
    estimate: 3,
    sprintHint: 1,
    stakeholder: 'genba',
  },
  {
    id: 'pbi-veteran-hearing',
    title: 'ベテランの暗黙知を聞き取り、要件にする',
    detail: '20年勤める現場のやり方を{{ピッキング}}手順から言語化する。',
    estimate: 5,
    sprintHint: 1,
    stakeholder: 'genba',
    split: [
      { title: '手順をそのまま聞き取る', estimate: 3 },
      { title: '勘どころを要件に言語化する', estimate: 2 },
    ],
  },
  {
    id: 'pbi-as-is-flow',
    title: '現状の出荷フローを可視化する（As-Is）',
    detail: '手書きメモも含めた今の流れを一枚に。{{誤出荷率}}の発生点を探す。',
    estimate: 2,
    sprintHint: 1,
    stakeholder: 'genba',
  },
  // ── Sprint 2: 仮説を形にする（誤出荷を減らす最小版）＝結城の数字 vs 現場の使い勝手 ──
  {
    id: 'pbi-misship-mvp',
    title: '誤出荷を減らす最小版（{{MVP}}）を出す',
    detail: '全部は作らない。誤出荷に効く一点だけを、現場が今日使える形で。',
    estimate: 5,
    sprintHint: 2,
    stakeholder: 'joushi', // 結城が経営に約束した“誤出荷削減”の数字に直結
    split: [
      { title: '誤出荷に効く一点を実装する', estimate: 3 },
      { title: '現場が今日使える形に調整する', estimate: 2 },
    ],
  },
  {
    id: 'pbi-picking-screen',
    title: '現場の言葉に合わせてピッキング画面を直す',
    detail: '棚番・呼称を現場の語彙に寄せ、迷いをなくす。',
    estimate: 3,
    sprintHint: 2,
    stakeholder: 'genba',
  },
  {
    id: 'pbi-stock-reconcile',
    title: '帳簿在庫と実在庫のズレを可視化する',
    detail: '{{棚卸}}差異の原因を、数字で見える形にする。',
    estimate: 3,
    sprintHint: 2,
    stakeholder: 'joushi', // 帳簿の数字を見せる＝情シス・発注側の関心
  },
  {
    id: 'pbi-feedback-loop',
    title: '現場の反応を集める{{フィードバックループ}}を作る',
    detail: '使ってもらい、声を拾い、次に直す。短い循環を回す。',
    estimate: 2,
    sprintHint: 2,
    stakeholder: 'genba',
  },
  // ── Sprint 3: 文化を残す（成果を本番と人に根付かせる）＝結城の運用安心 vs 現場への定着 ──
  {
    id: 'pbi-handoff-doc',
    title: '運用手順を文書化し、属人化を解く',
    detail: '“あの人がいないと分からない”を無くす。{{技術的負債}}の人版を返す。',
    estimate: 3,
    sprintHint: 3,
    stakeholder: 'genba',
  },
  {
    id: 'pbi-dashboard-selfserve',
    title: '現場が自分で見られる{{ダッシュボード}}を用意する',
    detail: '主要な指標を現場が自分で見て、自分で動けるように。',
    estimate: 5,
    sprintHint: 3,
    stakeholder: 'joushi', // 指標を可視化＝発注側が成果を見たい関心
    split: [
      { title: '主要な指標を集計する', estimate: 2 },
      { title: '現場が見られる画面にする', estimate: 3 },
    ],
  },
  {
    id: 'pbi-onboarding',
    title: '新メンバーの{{オンボーディング}}導線を整える',
    detail: '仕組みが人から人へ渡るようにする。定着を左右する。',
    estimate: 2,
    sprintHint: 3,
    stakeholder: 'genba',
  },
  {
    id: 'pbi-monitoring',
    title: '本番の監視と{{ロールバック}}手順を整える',
    detail: '壊れても戻せる備え。文化として残すための安全網。',
    estimate: 3,
    sprintHint: 3,
    stakeholder: 'joushi', // 本番の安定・安全＝発注側(情シス)が握りたい運用の安心
  },
]

// ───────────────────────────────────────────────────────────
// 発見可バックログ（DISCOVERABLE）。
// 初期のプロダクトバックログには現れない“現場に埋もれた候補”。
// ヒアリングで現場の声を良く掘り当てる（Choice.discoversPbi）と、初めてプロダクトバックログに加わる。
// ＝「現場の声 → バックログ項目」という発見→還元の筋を、ゲーム機構として体現する。
// narrative-designer が各ヒアリングイベントの選択肢（discoversPbi）と本文を、ここの項目に結び付ける。
// ───────────────────────────────────────────────────────────
export const DISCOVERABLE_BACKLOG: BacklogItem[] = [
  {
    id: 'pbi-disc-label-misread',
    title: '似た棚番の“見間違い”を減らす表示にする',
    detail: '田淵さんの「いつもズレる棚」から判明：一桁違いの隣接棚番を急ぐと取り違える。表示の工夫で防ぐ。',
    estimate: 2,
    sprintHint: 2,
    discoverable: true,
  },
  {
    id: 'pbi-disc-night-shift',
    title: '夜勤帯だけの“引き継ぎ漏れ”を埋める',
    detail: '田淵さんへの聞き取りから判明：夜勤の申し送りが口頭だけで、抜けが出荷ミスに繋がる。',
    estimate: 3,
    sprintHint: 2,
    discoverable: true,
    // “深い本音”の信頼ゲート（①）。STARTING trust=5 では届かず、1段(=6)貯めて初めて夜勤帯の本音が出る。
    // ＝一発で真実は湧かない。掘り損ねた周回は S3 の誤出荷トラブル（s3-daily-night-shift-miss）で高コストに顕在化。
    requiresTrust: 6,
    // 掘り損ね（poor／ゲート未達で深く聞こうとして空振った場合も含む）は沈黙させず、この機会損失フラグを立てる。
    // ＝浅い選択(s1-daily-warehouse a/b)の setsFlag と同じ flag に集約し、深い空振りも S3 で回収される。
    missedFlag: 'missedNightShift',
  },
  {
    id: 'pbi-disc-return-flow',
    title: '返品の戻し入れ手順を決める',
    detail: '在庫フローの図解から判明：返品だけ戻し先が宙に浮き在庫差異の一因に。誰も手順を持っていない。',
    estimate: 3,
    sprintHint: 3,
    discoverable: true,
  },
]

// ───────────────────────────────────────────────────────────
// イベント発バックログ（EVENT_BACKLOG）。
// ステークホルダーが“イベントで持ち込む”新しい要望。初期は伏せ（discoverable）、
// 該当イベントの選択（Choice.addsPbi）で初めてプロダクトバックログに現れる。
// ＝「断れずにスプリントへ割り込ませる」か「次のために形に残す」かを、同じ要望で対比させる機構の素材。
// 初期は伏せ（freshCore の backlogOrder に入らない）。origin:'event' で UI バッジを発見可(discoverable)と
// 出し分ける（acceptRequestedPbi が追加を担う）。discoverable は付けない＝発見可PBIとは別系統。
// ───────────────────────────────────────────────────────────
export const EVENT_BACKLOG: BacklogItem[] = [
  {
    // s1-daily-scope「増えていく要望」：結城が次々に足す“ついで帳票”。
    id: 'pbi-evt-extra-reports',
    title: '結城さんが足したがる“ついで帳票”を束ねる',
    detail: '「これも」「あれも」と積み上がった追加帳票。今のゴールには効かないが、要望として消えはしない。',
    estimate: 2,
    sprintHint: 1,
    // 初期は伏せ（freshCore の backlogOrder に入らない）。origin:'event' で発見可(discoverable)と区別する。
    origin: 'event',
    stakeholder: 'joushi',
  },
  {
    // s2-daily-goalcreep「揺らぐスプリントゴール」：経営が今期に、と差し込む別機能。
    id: 'pbi-evt-exec-feature',
    title: '経営が「今期に」と求める別機能を入れる',
    detail: '誤出荷削減のゴールとは別筋。経営の体面に直結し、結城さんは断りきれずに持ってきた。',
    estimate: 3,
    sprintHint: 2,
    origin: 'event',
    stakeholder: 'joushi',
  },
  {
    // s3-daily-scope-creep「ついでにあれも」：成功の機運で一気に膨らむ追加要望。
    id: 'pbi-evt-followups',
    title: '成功の機運で膨らんだ“ついで要望”を捌く',
    detail: '成果が出た途端あれもこれもと噴き出した要望群。勢いに乗るほど、焦点は溶けやすい。',
    estimate: 3,
    sprintHint: 3,
    origin: 'event',
    stakeholder: 'joushi',
  },
]
