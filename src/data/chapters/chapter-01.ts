import type {
  BacklogItem,
  Ceremony,
  Ending,
  Epilogue,
  GameEvent,
  GameFlag,
  MeterKey,
  Meters,
  Segment,
  SprintDef,
} from '../../types'
import { PRODUCT_BACKLOG as PRODUCT_BACKLOG_RAW } from './chapter-01/backlog'
import { SPRINT1_EVENTS } from './chapter-01/events-sprint1'
import { SPRINT2_EVENTS } from './chapter-01/events-sprint2'
import { SPRINT3_EVENTS } from './chapter-01/events-sprint3'
import { localizeDeep } from './chapter-01/names'

// ───────────────────────────────────────────────────────────
// 第1章「沈黙する基幹システム」
// 顧客=中堅物流「カルゴ物流」。情シスは「在庫画面に予測機能を足せ」と言う。
// だが現場では誰もその画面を使っていない。真の課題は別にある——。
// 3スプリントのスクラムを回し、現場に入り、正しいKPIを立て、文化を残せるか。
//
// 【メーター設計の原則】
// ・信頼が下がるのは「顧客に摩擦が生じた」時だけ（要望を後回し/納期割れ/粗い
//   ものを見せる/耳の痛い事実/押し返し/案件を放る）。理由は必ず resultText に書く。
// ・チーム/プロセス系の内部的な良い選択は信頼を下げない。トレードオフは「機会コスト」
//   ＝もう一方の“速く見せる”選択が信頼+1（進捗が見える）を持ち、それを取り逃す形にする。
// ───────────────────────────────────────────────────────────

export const CHAPTER_TITLE = '第1章「沈黙する基幹システム」'

export const STARTING_METERS: Meters = {
  trust: 5,
  insight: 4,
  culture: 4,
}

/** キャンペーンを構成するスプリント群。各スプリントはセレモニーを順に巡る */
export const SPRINTS: SprintDef[] = [
  {
    n: 1,
    title: 'Sprint 1「現場を知る」',
    goal: '沈黙の理由を突き止める',
    beats: ['planning', 'daily', 'daily', 'daily', 'daily', 'daily', 'review', 'retro'],
  },
  {
    n: 2,
    title: 'Sprint 2「仮説を形にする」',
    goal: '誤出荷を減らす最小版を出す',
    beats: ['planning', 'daily', 'daily', 'daily', 'daily', 'daily', 'review', 'retro'],
  },
  {
    n: 3,
    title: 'Sprint 3「文化を残す」',
    goal: '成果を本番と人に根付かせる',
    beats: ['planning', 'daily', 'daily', 'daily', 'daily', 'daily', 'review', 'retro'],
  },
]

export const CEREMONY_LABELS: Record<Ceremony, string> = {
  planning: 'スプリントプランニング',
  daily: 'デイリースクラム',
  review: 'スプリントレビュー',
  retro: 'レトロスペクティブ',
}

export const CEREMONY_SHORT: Record<Ceremony, string> = {
  planning: 'Plan',
  daily: 'Daily',
  review: 'Review',
  retro: 'Retro',
}

/** イベント/結果/ログでの“場面”ラベル。デイリーは朝会の後の現地対応なので「業務中」と出す
 *  （モーダルに「デイリースクラム」と出して朝会と混同させない）。単発セレモニーは会議そのものなのでそのまま。 */
export const ACTION_LABELS: Record<Ceremony, string> = {
  planning: 'スプリントプランニング',
  daily: '業務中',
  review: 'スプリントレビュー',
  retro: 'レトロスペクティブ',
}

export const ACTION_SHORT: Record<Ceremony, string> = {
  planning: 'Planning',
  daily: '業務',
  review: 'Review',
  retro: 'Retro',
}

export const SEGMENT_LABELS: Record<Segment, string> = {
  genba: '現場',
  kokyaku: '顧客',
  team: 'チーム',
  trouble: 'トラブル',
  chance: 'チャンス',
}

export const SEGMENT_COLORS: Record<Segment, string> = {
  genba: '#38bdf8',
  kokyaku: '#a78bfa',
  team: '#34d399',
  trouble: '#f87171',
  chance: '#fbbf24',
}

// 固有名詞（社名・人名）は names.ts を唯一の定義元として、表示時に現在の表示名へ置換する。
// リネームが無ければ localizeDeep は元の値をそのまま返す（恒等・ゼロコスト）。
export const EVENTS: GameEvent[] = localizeDeep([...SPRINT1_EVENTS, ...SPRINT2_EVENTS, ...SPRINT3_EVENTS])

// プロダクトバックログ（PBI）。配列順＝POの初期優先順位。固有名詞は表示名へ置換して公開する。
export const PRODUCT_BACKLOG: BacklogItem[] = localizeDeep(PRODUCT_BACKLOG_RAW)

export const ENDINGS: Ending[] = [
  {
    id: 'disliked',
    title: '現場に嫌われたFDE',
    reflection:
      '正しさを急ぎ、信頼を後回しにした。境界線の上に立つには、まず人の隣に立つこと。技術より先に、信頼が土台になる。',
    match: (m) => m.trust <= 2,
  },
  {
    id: 'orderTaker',
    title: '言われた通り作る人',
    reflection:
      '現場の沈黙を聞かず、要望をそのまま実装した。「答えは資料の外にある」。FDEは御用聞きではなく、真の課題の発見者だ。',
    match: (m) => m.insight <= 3,
  },
  {
    id: 'hero',
    title: 'ヒーロー止まり',
    reflection:
      '成果は出した。だが自分が抜けたら止まる仕組みを残した。FDEの仕事は組織を賢くすることまで。文化が残って初めて「太く残した」と言える。',
    match: (m) => m.culture <= 2 && m.trust >= 4,
  },
  {
    id: 'trueFde',
    title: '真のFDE',
    reflection:
      '現場に入り、正しいKPIを立て、小さく出して大きく学び、文化を残した。沈黙していたシステムが、現場の言葉で動き始めた。小さく作り、大きく学び、太く残す——体現できた。',
    match: (m) => m.trust >= 7 && m.insight >= 6 && m.culture >= 6,
  },
  {
    id: 'decent',
    title: '及第点のFDE',
    reflection:
      '案件は前に進んだ。現場・顧客・組織のどこかにまだ伸びしろがある。次の案件では、トレードオフのどれを取り戻すだろう。',
    match: () => true,
  },
]

// ───────────────────────────────────────────────────────────
// 失敗エピローグ（あるある）。3ゲージのどれかが0になった瞬間に表示される。
// 0になった次元ごとに、現場で「よくある」嫌な結末を描く。
// ───────────────────────────────────────────────────────────
export const FAILURE_EPILOGUES: Record<MeterKey, Epilogue> = {
  trust: {
    id: 'fail-trust',
    title: '「もう、来なくていいです」',
    reflection:
      '正論を振りかざし、約束を後回しにし、信頼を使い果たした。ある朝、入館証は無効になっていた。すれ違う担当者はもう目を合わせない。引き継ぎもされないまま、あなたの名前はプロジェクトから静かに消えた。——技術より先に、信頼が土台だった。',
  },
  insight: {
    id: 'fail-insight',
    title: '「結局あれ、何だったんですかね」',
    reflection:
      '会議室の資料だけで設計を進め、現場の沈黙を最後まで聞かなかった。完成した立派なシステムは誰にも開かれず、倉庫では今日もベテランが手書きメモを走らせている。半年後、その機能は「使われていない一覧」に載っていた。——答えは、最後まで資料の外にあった。',
  },
  culture: {
    id: 'fail-culture',
    title: '「あの人がいないと、何も分からない」',
    reflection:
      '何でも自分で巻き取り、速さと引き換えにチームを置き去りにした。メンバーはいつしか指示待ちになり、あなたが休んだ一日、すべてが止まった。あなたが去ると、仕組みごと記憶から消えた。——巻き込めなかった文化は、根付かずに枯れる。',
  },
}

// ───────────────────────────────────────────────────────────
// 不正暴露アークのフィナーレ。手がかり(fraudClue)を掴んでキャンペーンを完走すると、
// 通常エンディングの前に「暴露の決断」が出る（App/store が finalePending で制御）。
// ───────────────────────────────────────────────────────────
export const FINALE_EPILOGUES: Record<'expose' | 'exposeWeak' | 'complicit' | 'coopted', Epilogue> = localizeDeep({
  expose: {
    id: 'finale-expose',
    title: '告発したFDE',
    reflection:
      '固めた“動かぬ証拠”を、あなたは外に出した。循環取引の輪は白日の下にさらされ、ジェネリックは揺れる。買収された外様のカルゴ物流の行く末も不透明になり、現場の雇用に痛みも走るだろう。それでも——あなたは“見栄えの数字”でなく“本物の数字”の側に立った。正しさは、いつもほろ苦い。だが、沈黙していた現場が、初めて本当のことを言える場所になった。',
  },
  exposeWeak: {
    id: 'finale-expose-weak',
    title: '届かなかった告発',
    reflection:
      '違和感は確かにあった。だが決定的な“動かぬ証拠”を、あなたは固めきれていなかった。状況証拠だけで踏み切った告発を、グループはあっさり否認し、闇に葬った。煙たがられたあなたは、現場を去ることになる。——正しさは、証拠の裏付けがあって初めて世界を動かす。次は、固めてから動け。',
  },
  complicit: {
    id: 'finale-complicit',
    title: '見て見ぬふりのFDE',
    reflection:
      '証拠は、引き出しの奥にしまった。案件はうまく回ったように見える。だが——あなたが現場と築いた“本物の成果”は、グループの粉飾を化粧するために使われた。数字を盛る側の、いちばん上等な道具。鏡を見るたび、田淵さんの顔が浮かぶ。',
  },
  coopted: {
    id: 'finale-coopted',
    title: '取り込まれたFDE',
    reflection:
      '口止めに応じ、昇進と報酬を受け取った。肩書きは増え、財布は厚くなる。だが、現場の信頼も、自分の手で出した成果も、保身と引き換えに静かに腐っていく。あなたはもう、現場の側の人間ではない。——FDEが守るべきだったものを、自分で売った。',
  },
})

export interface FinaleChoice {
  id: string
  label: string
  /** この選択で立つフラグ（結末を永続化） */
  flag: GameFlag
  /** 対応するフィナーレ・エピローグ */
  ending: keyof typeof FINALE_EPILOGUES
  warn?: boolean
}

/** 「暴露の決断」。fraudClue を掴んだ周回でのみ、完走後に提示される */
export const FINALE: { prompt: string; choices: FinaleChoice[] } = localizeDeep({
  prompt:
    '現場をIT化して実数を可視化したら、“導入済み”のはずの{{フィジカルAI}}機材が、倉庫のどこにも無かった。掘るほどに、グループの数字の裏に影が差す——カルゴ物流を踏み台に、同じ機材を書類の上だけで巡らせる、架空の循環取引の影。本物の成果を出そうとして、本物でない数字にたどり着いてしまった。さあ、どうする。（“動かぬ証拠”を固めていれば、告発は通る。）',
  choices: [
    { id: 'expose', label: '証拠を公にし、不正を告発する', flag: 'exposed', ending: 'expose' },
    {
      id: 'complicit',
      label: '見なかったことにして、案件を無難に終える',
      flag: 'complicit',
      ending: 'complicit',
      warn: true,
    },
    {
      id: 'coopted',
      label: '口止めに応じ、昇進と報酬を受け取る',
      flag: 'coopted',
      ending: 'coopted',
      warn: true,
    },
  ],
})

// テスト/型補助用に Ceremony の並びを公開
export const CEREMONY_ORDER: Ceremony[] = ['planning', 'daily', 'review', 'retro']
