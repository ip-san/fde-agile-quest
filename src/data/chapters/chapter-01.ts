import type {
  Ceremony,
  Ending,
  Epilogue,
  GameEvent,
  MeterKey,
  Meters,
  Segment,
  SprintDef,
} from '../../types'
import { SPRINT1_EVENTS } from './chapter-01/events-sprint1'
import { SPRINT2_EVENTS } from './chapter-01/events-sprint2'
import { SPRINT3_EVENTS } from './chapter-01/events-sprint3'

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
  planning: 'Planning',
  daily: 'Daily',
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

export const EVENTS: GameEvent[] = [...SPRINT1_EVENTS, ...SPRINT2_EVENTS, ...SPRINT3_EVENTS]

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

// テスト/型補助用に Ceremony の並びを公開
export const CEREMONY_ORDER: Ceremony[] = ['planning', 'daily', 'review', 'retro']
