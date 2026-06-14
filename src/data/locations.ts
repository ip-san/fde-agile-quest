// ───────────────────────────────────────────────────────────
// ロケーション（場所）とリモート・デイリースクラムのヒント。
//
// 主人公はたった一人でカルゴ物流に常駐している。デイリースクラムは、本社ルーメンの
// チーム（PO/スクラムマスター/開発メンバー）と画面越しに繋ぐ「リモート朝会」。
// 役割ごとに観点の違うヒントが「今日はどの場所が要注目か」を指し示す（行き先誘導）。
// プレイヤーはマップで現地3箇所（倉庫/電算室/会議室）を歩いて回り、開発室だけは
// リモート接続で“訪れる”。ルーレットで決まった今日のイベントの場所へ着くと話が始まる。
// ───────────────────────────────────────────────────────────
import type { DailyRole, GameEvent, GameFlag, LocationId, Segment } from '../types'
import { localizeDeep } from './chapters/chapter-01/names'

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

// 社名（カルゴ物流/ルーメン）や人名（結城）は names.ts を定義元として表示時に置換する。
export const LOCATIONS: Record<LocationId, LocationDef> = localizeDeep({
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
    desc: 'サーバと20年もの基幹が並ぶ、保守的な情シス（結城係長）の本拠地＝城。「セキュリティ上」「前例がない」とツール導入も権限もなかなか出さない、古い情シスの牙城。ここが止まると出荷も止まる。',
  },
  client: {
    id: 'client',
    label: 'カルゴ物流 情シス・会議室',
    short: '会議室',
    emoji: '🏢',
    desc: '結城係長や経営層と向き合う場。要望と政治、約束と数字がぶつかる。',
  },
  soumu: {
    id: 'soumu',
    label: 'カルゴ物流 総務部',
    short: '総務部',
    emoji: '🗄️',
    desc: '庶務・入館証・稟議・契約と請求の紙が集まる管理部門。手続きと社内政治が渦巻く場。',
  },
  jinji: {
    id: 'jinji',
    label: 'カルゴ物流 人事部',
    short: '人事部',
    emoji: '🧑‍💼',
    desc: '採用・評価・異動・人員配置を握る部署。人の処遇と社内政治が交差する場。',
  },
  keiri: {
    id: 'keiri',
    label: 'カルゴ物流 経理部',
    short: '経理部',
    emoji: '🧮',
    desc: '仕訳・決算・連結の数字を締める部署。グループの粉飾が通り、そして暴かれうる“数字の現場”。',
  },
  repo: {
    id: 'repo',
    label: 'コードリポジトリ',
    short: 'リポジトリ',
    emoji: '🗂️',
    desc: 'コードとPR・テスト・CIが集まる場所。ここで作り、直し、生成AIと技術的負債に向き合う。',
  },
  devroom: {
    id: 'devroom',
    label: 'ルーメン 開発室',
    short: '開発室',
    emoji: '💻',
    remote: true,
    desc: '本社の開発室。受託部門の仲間とAIエージェント。画面越しに繋いで“訪ねる”。',
  },
})

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
export const LOCATION_ORDER: LocationId[] = [
  'warehouse',
  'serverroom',
  'client',
  'soumu',
  'jinji',
  'keiri',
  'repo',
  'devroom',
]

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

export const DAILY_ROLES: Record<DailyRole, DailyRoleDef> = localizeDeep({
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
})

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
  soumu: {
    po: [
      '今日の焦点は手続きと書類だ。総務部で利害と背景を確かめてきて。',
      '数字の裏に契約や経費が絡んでる。総務部で誰の都合かを押さえよう。',
    ],
    sm: [
      '社内の手続きが障害になってるかも。総務部で詰まりの一点を見てきて。',
      '稟議や入館の段取りで止まってないか、総務部で確かめて。',
    ],
    dev: [
      '契約や請求の書類に当たる必要があります。総務部で現物を見てきて。',
      '経費や承認の運用が気になります。総務部で実態を確かめてください。',
    ],
  },
  jinji: {
    po: [
      '今日は“人”の話だ。人事部で配置や処遇の動きを確かめてきて。',
      '数字の裏で人が動かされてる。人事部で誰の処遇かを押さえよう。',
    ],
    sm: [
      '人の配置がチームを揺らしてる。人事部で異動や評価の動きを見てきて。',
      'メンバーの士気に関わる話だ。人事部で背景を確かめて。',
    ],
    dev: [
      '評価や異動の話は僕らじゃ分かりません。人事部で事実を確かめてください。',
      '人員の話が人事部で動いてるみたいです。現地で確かめて。',
    ],
  },
  keiri: {
    po: [
      '数字の裏側が気になる。経理部で売上や決算の中身を確かめてきて。',
      'お客さんの数字の信頼性に関わる。経理部で計上の実体を押さえよう。',
    ],
    sm: [
      '現場の実数と帳簿が食い違ってないか、経理部で突き合わせてきて。',
      '部門の壁で数字が分断されてる。経理部で全体の流れを見て。',
    ],
    dev: [
      '仕訳や連結の数字に妙な符合があるかも。経理部で原票を確かめて。',
      '売上の相手と品物が実在するか、経理部のデータで裏取りしてください。',
    ],
  },
  repo: {
    po: [
      '今日は成果物そのものに向き合いたい。リポジトリでコードとPRを見てきて。',
      '価値は“動くもの”で示そう。リポジトリで実装の状態を確かめて。',
    ],
    sm: [
      'ビルドやレビューが詰まってないか、リポジトリで流れを見てきて。',
      'CIやテストが障害になってるかも。リポジトリで確かめて。',
    ],
    dev: [
      'コードとPR、技術的負債はリポジトリにあります。手を入れに行きましょう。',
      'AI任せのコードが溜まってないか、リポジトリで確かめてください。',
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
  serverroom: '電算室は施錠され、情シスの誰もいない。サーバのランプが点滅するだけで、今日はここで通せる話は無さそうだ。',
  client: '会議室は無人だった。今日は誰も呼んでいない。ここで待っていても話は進まなさそうだ。',
  soumu: '総務部は今日は穏やかだ。書類のやり取りが淡々と進むだけで、今日はここに用は無さそうだ。',
  jinji: '人事部は今日は静かだ。面談予定の貼り紙があるだけで、今日はここに用は無さそうだ。',
  keiri: '経理部は今日は静かだ。電卓とキーボードの音が続くだけで、今日はここに用は無さそうだ。',
  repo: 'リポジトリは今日は静かだ。CIのグリーンが並ぶだけで、今日はここで手を入れることは無さそうだ。',
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

// ───────────────────────────────────────────────────────────
// 朝会の“競合する主張”。3役がそれぞれ別の候補（別の場所）を推す。プレイヤーはどれに従うか選ぶ。
// 役割は候補のセグメントへの親和で割り当て（PO=価値/顧客、SM=プロセス/障害、開発=技術/事実）。
// ───────────────────────────────────────────────────────────
const SEGMENT_LEAD: Record<Segment, DailyRole> = {
  genba: 'dev',
  kokyaku: 'po',
  trouble: 'sm',
  team: 'dev',
  chance: 'po',
}

// ── 朝会の口上（advocacyLine）。10体調査が突き止めた“意味不明”の根本原因への対応 ───────────
// 設計原則:
// ① イベントtitleは“今日の論点／シーン題”（体言止め・否定文・問い・セリフ・皮肉）。価値/障害/負債と
//    「断定」せず、その役割の「気がかり」と「現地で確かめてくる観点」として語る（調査の促し）。
//    → どんな title でも称揚（粉飾やリストラを“価値”と持ち上げる等）にも非文にもならない。
// ② title は bareTitle で前後の鉤括弧を1組剥がしてから一重の「」で括る（二重カギ括弧バグの解消）。
// ③ 人事/総務/経理/不正など“価値・障害・コード”の語彙が不適切な題材は SENSITIVE バンクで中立に扱う。
// ④ 開発（瀬川）はコード視点。リポジトリ/開発室は直接コードへ、それ以外は“確かめてコードに反映”。
// 役割の人格: PO鷹野=確信の経営者 / SM久遠=問いを置く師 / dev瀬川=砕けた相棒（The Scrum Guide 2020 接地）。

/** title 前後の鉤括弧（「」『』）を1組だけ剥がす。地の文の引用や二重括弧化を防ぐ。 */
function bareTitle(t: string): string {
  const m = t.match(/^[「『]([\s\S]*)[」』]$/)
  return m ? m[1] : t
}

/** “価値/障害/コード”の語彙が不適切になる題材（人事・総務・経理・不正・社内政治）か。
 *  中立バンクで「筋を通す/事実と記録を確かめる」として扱い、称揚・矮小化を避ける。 */
function isSensitiveEvent(event: GameEvent): boolean {
  const loc = locationOf(event)
  if (loc === 'soumu' || loc === 'jinji' || loc === 'keiri') return true
  const fraud = (f?: GameFlag) => f === 'fraudClue' || f === 'fraudCase'
  return fraud(event.requiresFlag) || event.choices.some((c) => fraud(c.setsFlag))
}

type Line = (t: string, l: string) => string
const PO_LINES: Line[] = [
  (t, l) => `今日は「${t}」が気がかりだ。${l}で、お客さんにとって何がいちばん効くかを確かめてこよう。`,
  (t, l) => `「${t}」、価値の芯はどこにある。${l}で優先順位を見極めてきてほしい。`,
  (t, l) => `「${t}」の件、後回しにすると効くはずの価値を取り逃す。${l}を今日の最優先に。`,
]
const SM_LINES: Line[] = [
  (t, l) => `「${t}」、流れに響きそうだ。${l}で、どこで詰まっているか見てきなさい。`,
  (t, l) => `…急がなくていい。「${t}」が何なのか、${l}で確かめておきたい。`,
  (t, l) => `「${t}」、放っておくほど絡まる類かもしれない。${l}で様子を見てきて。`,
]
const DEV_REPO_LINES: Line[] = [
  (t, l) => `「${t}」、コードに手を入れに行きましょう。${l}でテストごと固めたいです。`,
  (t, l) => `「${t}」は実装で片がつきます。${l}でリファクタして、DoD（完成の定義）まで通しましょう。`,
  (t, l) => `「${t}」、AIに書かせた所が雑かもしれません。${l}でコードを読み直して計測を仕込みましょう。`,
]
const DEV_FIELD_LINES: Line[] = [
  (t, l) => `「${t}」、たぶんデータか実装に跳ねます。${l}で事実を確かめたら、リポジトリで直しましょう。`,
  (t, l) => `「${t}」、${l}の数字がシステムと噛み合ってるか怪しいです。事実を掴んでコードに反映を。`,
  (t, l) => `「${t}」、最後はコードに返ってきます。${l}で要件を固めて、リポジトリで形にしましょう。`,
]
// 人事・総務・経理・不正など、価値/障害/コードで語ると称揚・矮小化になる題材。役割の人格は保ちつつ中立に。
const SENSITIVE_LINES: Record<DailyRole, Line[]> = {
  po: [
    (t, l) => `「${t}」は、数字の見栄えより本質が問われる話だ。${l}で実態を確かめてこよう。`,
    (t, l) => `「${t}」、目先の数字に流されたくない。${l}で何が起きているかを見極めてきて。`,
  ],
  sm: [
    (t, l) => `「${t}」、無理に急がなくていい。${l}で何が起きているか、丁寧に確かめてきなさい。`,
    (t, l) => `「${t}」、答えは資料の外だ。${l}で現場の事実に当たってきなさい。`,
  ],
  dev: [
    (t, l) => `「${t}」、僕らの手に余るかもしれません。${l}で事実と記録だけは、きちんと押さえましょう。`,
    (t, l) => `「${t}」、まず一次情報です。${l}で何が本当か、確かめてきましょう。`,
  ],
}

/** 役割ごとの“主張”。title は調査対象として中立に括り（bareTitle＋一重「」）、その役割の観点で
 *  「現地で確かめてくる」よう促す（断定しない）。題材が人事/不正等なら中立バンク。 */
function advocacyLine(role: DailyRole, event: GameEvent, locShort: string, seed: number): string {
  const t = bareTitle(event.title)
  const pick = (bank: Line[]) => bank[Math.floor(frac(seed) * bank.length) % bank.length](t, locShort)
  if (isSensitiveEvent(event)) return pick(SENSITIVE_LINES[role])
  if (role === 'dev') {
    const loc = locationOf(event)
    return pick(loc === 'repo' || loc === 'devroom' ? DEV_REPO_LINES : DEV_FIELD_LINES)
  }
  return pick(role === 'po' ? PO_LINES : SM_LINES)
}

/** イベントidから決定的なseed（バリアント選択用） */
function idSeed(id: string): number {
  let s = 0
  for (let i = 0; i < id.length; i++) s = (s * 31 + id.charCodeAt(i)) % 100000
  return s
}

export interface StandupVoice {
  role: DailyRole
  name: string
  label: string
  tone: DailyRoleDef['tone']
  lens: string
  line: string
  /** この声が推す候補イベントの場所 */
  location: LocationId
  locationShort: string
  eventId: string
}

/** 朝会で表示する“競合する主張”。各候補に distinct な役割を割り当て、その役割の観点で推す。
 *  candidates は drawCandidates の結果（別々の場所・最大3）。 */
export function standupFor(candidates: GameEvent[]): StandupVoice[] {
  const cands = candidates.slice(0, 3)
  const used = new Set<DailyRole>()
  const assigned: { c: GameEvent; role: DailyRole | null }[] = []
  // 1巡目: 役割を割り当て。リポジトリ／開発室の候補は“コードの人”＝開発（瀬川）を優先（リポジトリへ誘導）、
  //         それ以外はセグメント親和（PO=価値/SM=プロセス/開発=技術）。
  for (const c of cands) {
    const loc = locationOf(c)
    const want: DailyRole = loc === 'repo' || loc === 'devroom' ? 'dev' : SEGMENT_LEAD[c.segment]
    if (!used.has(want)) {
      used.add(want)
      assigned.push({ c, role: want })
    } else {
      assigned.push({ c, role: null })
    }
  }
  // 2巡目: 残りの役割を埋める
  for (const a of assigned) {
    if (a.role) continue
    const free = DAILY_ROLE_ORDER.find((r) => !used.has(r))
    if (free) {
      used.add(free)
      a.role = free
    }
  }
  return assigned
    .filter((a): a is { c: GameEvent; role: DailyRole } => a.role !== null)
    .map(({ c, role }) => {
      const def = DAILY_ROLES[role]
      const loc = locationOf(c)
      const short = LOCATIONS[loc].short
      const line = c.advocacy?.[role] ?? advocacyLine(role, c, short, idSeed(c.id))
      return {
        role,
        name: def.name,
        label: def.label,
        tone: def.tone,
        lens: def.lens,
        line,
        location: loc,
        locationShort: short,
        eventId: c.id,
      }
    })
}
