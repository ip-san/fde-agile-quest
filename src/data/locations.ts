// ───────────────────────────────────────────────────────────
// ロケーション（場所）とリモート・デイリースクラムのヒント。
//
// 主人公はたった一人でカルゴ物流に常駐している。デイリースクラムは、本社ルーメンの
// チーム（PO/スクラムマスター/開発メンバー）と画面越しに繋ぐ「リモート朝会」。
// 役割ごとに観点の違うヒントが「今日はどの場所が要注目か」を指し示す（行き先誘導）。
// プレイヤーはマップで現地3箇所（倉庫/電算室/会議室）を歩いて回り、開発室だけは
// リモート接続で“訪れる”。ルーレットで決まった今日のイベントの場所へ着くと話が始まる。
// ───────────────────────────────────────────────────────────
import type { DailyRole, GameEvent, LocationId, Segment } from '../types'

export interface LocationDef {
  id: LocationId
  /** マップやログでの正式名 */
  label: string
  /** ノードの短い見出し */
  short: string
  emoji: string
  /** リモート接続で訪れる場所（現地ではない） */
  remote?: boolean
  /** ノードの一言説明 */
  desc: string
}

export const LOCATIONS: Record<LocationId, LocationDef> = {
  warehouse: {
    id: 'warehouse',
    label: 'カルゴ物流 倉庫（現場）',
    short: '倉庫',
    emoji: '📦',
    desc: 'フォークリフトと台車の音が響く現場。棚・在庫・出荷の実物と、ベテランの手書きメモがある。',
  },
  serverroom: {
    id: 'serverroom',
    label: 'カルゴ物流 電算室',
    short: '電算室',
    emoji: '🖥️',
    desc: 'サーバと基幹システムが並ぶ部屋。ログ・配線・帳簿の数字。ここが止まると出荷も止まる。',
  },
  client: {
    id: 'client',
    label: 'カルゴ物流 情シス・会議室',
    short: '会議室',
    emoji: '🏢',
    desc: '結城係長や経営層と向き合う場。要望と政治、約束と数字がぶつかる。',
  },
  devroom: {
    id: 'devroom',
    label: 'ルーメン 開発室',
    short: '開発室',
    emoji: '💻',
    remote: true,
    desc: '本社の開発室。受託部門の仲間とAIエージェント。画面越しに繋いで“訪ねる”。',
  },
}

/** セグメントから既定の場所。イベントに location があればそちらが優先される */
export const LOCATION_BY_SEGMENT: Record<Segment, LocationId> = {
  genba: 'warehouse',
  trouble: 'serverroom',
  kokyaku: 'client',
  team: 'devroom',
  // チャンス＝現場の機会が既定。開発室やオンラインでの機会は各イベントが location で上書き
  chance: 'warehouse',
}

/** イベントが起きる場所（location 明示 → 無ければ segment 既定） */
export function locationOf(event: GameEvent): LocationId {
  return event.location ?? LOCATION_BY_SEGMENT[event.segment]
}

/** マップ表示順（現地→リモート） */
export const LOCATION_ORDER: LocationId[] = ['warehouse', 'serverroom', 'client', 'devroom']

// ───────────────────────────────────────────────────────────
// リモート朝会の役割（ルーメンのチーム）。役割ごとに「観点（レンズ）」が違う。
// ───────────────────────────────────────────────────────────
export interface DailyRoleDef {
  role: DailyRole
  /** 役割の表示名 */
  label: string
  /** 担当キャラ（cast.ts の id） */
  charId: string
  name: string
  /** Tailwind の色トークン（tile/バッジの色分け） */
  tone: 'amber' | 'violet' | 'emerald'
  /** ヒントの観点（プレイヤー教育用の一言） */
  lens: string
}

export const DAILY_ROLES: Record<DailyRole, DailyRoleDef> = {
  po: {
    role: 'po',
    label: 'PO（プロダクトオーナー）',
    charId: 'takano',
    name: '鷹野',
    tone: 'amber',
    lens: '価値・優先度',
  },
  sm: {
    role: 'sm',
    label: 'スクラムマスター',
    charId: 'kuon',
    name: '久遠',
    tone: 'violet',
    lens: 'プロセス・障害',
  },
  dev: {
    role: 'dev',
    label: '開発メンバー',
    charId: 'segawa',
    name: '瀬川',
    tone: 'emerald',
    lens: '技術・事実',
  },
}

export const DAILY_ROLE_ORDER: DailyRole[] = ['po', 'sm', 'dev']

// ───────────────────────────────────────────────────────────
// 場所×役割のヒント・テンプレート（行き先誘導）。同じ「今日の行き先」を、役割の
// 観点で言い換える。variant はイベントのシードで1つ選ぶ（軽い反復回避）。
// イベント側に hints があれば、その役割だけ上書きする。
// ───────────────────────────────────────────────────────────
const LOCATION_HINTS: Record<LocationId, Record<DailyRole, string[]>> = {
  warehouse: {
    po: [
      '今日いちばん価値があるのは現場の実態だ。倉庫を最優先で見てきて。',
      'お客さんの痛みは“出荷”に出る。まず倉庫に立ってほしい。',
    ],
    sm: [
      '倉庫の作業の流れ、どこかで詰まってる気がする。歩いて確かめて。',
      '現場の動きを止めてる障害がないか、倉庫で見てきて。',
    ],
    dev: [
      '在庫の数字、実物と合ってない疑いがあります。倉庫で現物を。',
      '倉庫のオペ、システムと別物で回ってるかも。現地で観察を。',
    ],
  },
  serverroom: {
    po: [
      '基幹システムが止まれば出荷も止まる。電算室の件、最優先で。',
      'お客さんが一番怖いのは“出荷が止まる”こと。電算室を優先しよう。',
    ],
    sm: [
      '電算室まわりの対応で、昨日から手が止まってる。障害を取り除こう。',
      'システムの詰まりがボトルネックっぽい。電算室で流れを見て。',
    ],
    dev: [
      '電算室のサーバログ、妙な空白があります。現地で確かめてください。',
      'システムの構成がドキュメントと違う気が。電算室で実物を。',
    ],
  },
  client: {
    po: [
      '今日は顧客の期待値を握り直したい。会議室で結城さんと話して。',
      '優先度を決めるのは顧客の声だ。会議室で要望の芯を聞いてきて。',
    ],
    sm: [
      '顧客との約束と現場の実力に開きがある。会議室で擦り合わせを。',
      '関係者の足並みが乱れてる。会議室で期待を揃えてきて。',
    ],
    dev: [
      '要望の裏にある“本当に困ってること”を会議室で掘ってください。',
      '会議室で出てくる数字、根拠が曖昧かも。前提を確かめて。',
    ],
  },
  devroom: {
    po: [
      'こっち（開発室）の手も借りよう。リモートで繋いで段取りを決めたい。',
      '本社の力を使う価値がある。開発室にリモートで入って。',
    ],
    sm: [
      'チームの連携を切らさないように。開発室にリモートで顔を出して。',
      '一人で抱えないで。開発室と繋いで障害を共有しよう。',
    ],
    dev: [
      '実装やAIの相談、開発室にリモートで入ってくれれば手伝います。',
      'コードとデータはこっちで見ます。開発室にリモート接続を。',
    ],
  },
}

/** 「今日は静か」＝行き先を外した時の小景（ペナルティ無し）。ヒント読みを促す */
export const QUIET_BY_LOCATION: Record<LocationId, string> = {
  warehouse: '倉庫は今日は落ち着いている。フォークリフトが行き交うだけで、今日はここに用は無さそうだ。',
  serverroom: '電算室のサーバは静かに回っている。ランプの点滅を眺めても、今日はここで起きることは無さそうだ。',
  client: '会議室は無人だった。今日は誰も呼んでいない。ここで待っていても話は進まなさそうだ。',
  devroom: '開発室にリモートで繋いだが、みな別の作業中。今日はここで動くことは無さそうだ。',
}

/** 決定的な擬似乱数（シード→0..1）。variant 選択に使う（Math.random は使わない＝再現性） */
function frac(seed: number): number {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

export interface DailyHint {
  role: DailyRole
  label: string
  name: string
  tone: DailyRoleDef['tone']
  lens: string
  line: string
}

/** リモート朝会で表示する役割別ヒント（行き先誘導）。イベントの location を全役割が指す。
 *  イベント側 hints があればその役割を上書き。variant は seed で1つ選ぶ。 */
export function hintsFor(event: GameEvent, seed: number): DailyHint[] {
  const loc = locationOf(event)
  return DAILY_ROLE_ORDER.map((role, i) => {
    const def = DAILY_ROLES[role]
    const override = event.hints?.[role]
    const pool = LOCATION_HINTS[loc][role]
    const line = override ?? pool[Math.floor(frac(seed + i * 97) * pool.length) % pool.length]
    return { role, label: def.label, name: def.name, tone: def.tone, lens: def.lens, line }
  })
}
