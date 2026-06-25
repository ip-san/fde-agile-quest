import type { GameFlag } from '../types'

// ───────────────────────────────────────────────────────────
// 伏線レジストリ（フレームワーク化 Phase 1）。
// 各 GameFlag が「どう仕掛けられ（setVia）／どう回収されるか（payoffVia）」を一箇所で宣言する。
// GameFlag を増やすと satisfies が未登録をコンパイルエラーで知らせる＝伏線の張りっぱなしを型で防ぐ。
// 宣言とデータ（setsFlag/missedFlag/requiresFlag）の食い違いは threads.test.ts が検知する。
//
// 役割の分離（フラグが兼ねる3つの回収経路）:
//   event  … requiresFlag 付きイベントの出現で回収（分岐の支払い）
//   ending … finalEndingFor が結末に反映して回収
//   score  … 負債/顧客価値スコアに反映して回収
// 仕掛けの経路:
//   choice … 選択肢の setsFlag で能動的に立つ
//   missed … 重要候補を見送ると missedFlag で立つ（機会損失＝負の伏線）
//   finale … 不正暴露アークのフィナーレ選択（resolveFinale）で立つ
// ───────────────────────────────────────────────────────────

// choice/missed はイベントデータ（setsFlag/missedFlag）と threads.test で突き合わせる。
// finale/kanban はデータ外の経路（resolveFinale／カンバンの reviewItem）で立つため、データ突合の対象外。
type ThreadSetVia = 'choice' | 'missed' | 'finale' | 'kanban'
type ThreadPayoffVia = 'event' | 'ending' | 'score'

interface Thread {
  /** どう仕掛けるか（伏線が立つ経路）。1つ以上 */
  setVia: ThreadSetVia[]
  /** どう回収するか（伏線が結実する経路）。1つ以上 */
  payoffVia: ThreadPayoffVia[]
  /** 一行説明（仕掛け→回収の筋。開発用＝回収先まで書く） */
  note: string
  /** プレイヤー向けの“ぼかし”一文（盤面の未回収伏線で表示。回収先はネタバレしない） */
  teaser: string
}

// 型注釈で全 GameFlag の登録を強制（キー欠落＝コンパイルエラー）。配列型は ThreadSetVia[] 等に広がる。
export const THREADS: Record<GameFlag, Thread> = {
  wrongKpi: {
    setVia: ['choice'],
    payoffVia: ['event', 'score'],
    note: 'KPIを「画面の機能数」に置く→使われない機能の手戻りイベント＋負債スコア',
    teaser: '測る指標を、取り違えているかもしれない。',
  },
  aiOverreliance: {
    setVia: ['choice'],
    payoffVia: ['event', 'score'],
    note: 'AIに頼りすぎる→品質劣化イベント＋負債スコア',
    teaser: 'AIに頼りすぎたツケが、どこかに溜まっている。',
  },
  genbaTrust: {
    setVia: ['choice'],
    payoffVia: ['event'],
    note: '現場の信頼を得る→後続の現場イベントが解放',
    teaser: '現場との間に、芽生えたものがある。',
  },
  topDown: {
    setVia: ['choice'],
    payoffVia: ['event'],
    note: 'トップダウンで押し込む→反発・形骸化イベント',
    teaser: '上から通したやり方に、きしみが残っている。',
  },
  fraudClue: {
    setVia: ['choice'],
    payoffVia: ['event'],
    note: '不正の手がかりを掴む→循環取引イベントが解放',
    teaser: '数字の奥に、見過ごせない違和感がある。',
  },
  fraudCase: {
    setVia: ['choice'],
    payoffVia: ['event', 'ending'],
    note: '強い証拠を固める→章中レトロで確証を手に収める着地ビート、暴露エンディングの強度に反映',
    teaser: '掴んだ証拠の重みは、まだ宙づりだ。',
  },
  exposed: { setVia: ['finale'], payoffVia: ['ending'], note: 'フィナーレで暴く→専用エンディング', teaser: '—' },
  complicit: { setVia: ['finale'], payoffVia: ['ending'], note: 'フィナーレで黙認→専用エンディング', teaser: '—' },
  coopted: {
    setVia: ['finale'],
    payoffVia: ['ending'],
    note: 'フィナーレで取り込まれる→専用エンディング',
    teaser: '—',
  },
  missedHearing: {
    setVia: ['missed'],
    payoffVia: ['event'],
    note: '聞き取りを見送る→理解不足の手戻りイベント',
    teaser: '拾い損ねた現場の声が、まだどこかにある。',
  },
  missedUpgrade: {
    setVia: ['missed'],
    payoffVia: ['event'],
    note: '基盤更新を見送る→後で詰まるイベント',
    teaser: '後回しにした基盤が、静かにきしんでいる。',
  },
  missedNightShift: {
    // ①の信頼ゲート見逃しの“顕在化”。2経路で立つ：
    //  - choice: 浅い対応（s1-daily-warehouse の仕様書通り/観察どまり）の setsFlag
    //  - missed: 深い聞き取りを選んでも信頼ゲート未達/poor で掘り損ねた時、PBI(pbi-disc-night-shift)の
    //    missedFlag を engine が立てる（＝“掘り損ね”＝見送りの一種）。
    setVia: ['choice', 'missed'],
    payoffVia: ['event'],
    note: '夜勤帯の本音を掘り損ねる（浅い聞き取り）→S3で引き継ぎ漏れ起因の誤出荷トラブルが強制発火',
    teaser: '夜勤帯まで、聞けていない声が残っている。',
  },
  showcasePressure: {
    setVia: ['choice'],
    payoffVia: ['event'],
    note: '親会社の実証ショーケース圧力が立つ→視察/報告イベントの連鎖',
    teaser: '上が掲げた“実証”の旗が、現場に圧をかけている。',
  },
  chasedPromise: {
    setVia: ['choice'],
    payoffVia: ['event'],
    note: '背景を確かめず約束を追う→後で空回りするイベント',
    teaser: '確かめずに追った約束が、宙に浮いている。',
  },
  groundedGoal: {
    setVia: ['choice'],
    payoffVia: ['event'],
    note: '現場の沈黙を起点にゴールを据える→S1で“確かめる”を並べ替える／S2で芯を捉える回収',
    teaser: '現場の沈黙を起点に据えたゴールが、芽を探している。',
  },
  soloHero: {
    setVia: ['choice'],
    payoffVia: ['event'],
    note: '移譲せず窓口を抱える→属人化ボトルネックのイベント',
    teaser: '自分が抱え込んだ役割が、いつか詰まる。',
  },
  shippedUndone: {
    // カンバンの reviewItem（quick 完了）で立つ＝データ外の経路なので 'kanban'。
    // 負債スコアで回収（quick レビューが debt を積む）＋ s2-daily-undone-debt の event 回で“取り立て”を物語化。
    setVia: ['kanban'],
    payoffVia: ['score', 'event'],
    note: '浅いレビューのまま DoD を妥協して Ship（reviewItem quick 完了で立つ）→負債スコア＋ s2-daily-undone-debt（DoD を一つ飛ばして Done にした判断の取り立てが現場で表に出る）で回収',
    teaser: 'DoD を妥協して通したものが、取り立てを待っている。',
  },
  borrowedDebt: {
    // s2-daily-debt の choice a（締切のために意図的に負債を借りる）の setsFlag で立つ。
    // “借りた者勝ち”にしないため、同じS2終盤の s2-daily-debt-collection で取り立てが来る（event）。
    // さらに choice a 自身が repo.debt+2 を積むので、負債スコアでも実際にツケが残る（score）。
    setVia: ['choice'],
    payoffVia: ['event', 'score'],
    note: '締切のため意図的に負債を借りる（s2-daily-debt a＝結城さんに「後で必ず返す」と握った約束つきの借入）→負債スコア＋ s2-daily-debt-collection（同S2終盤に早くもきしむ取り立て。約束履行で回収＝守れば信頼据え置き／反故で破ると重い）で回収。借りた者勝ちにしない。shippedUndoneの“黙ったDoD妥協”とは別軸＝約束したか否か',
    teaser: '「後で必ず返す」と握った約束の、期日が近づいている。',
  },
  deprioritizedJoushi: {
    // 機構②: スプリント精算(resolveSprintBacklog)で立つ＝データ外経路なので 'kanban'。
    // s3-daily-joushi-deprioritized（発注者＝結城の不安・面子＝trust摩擦）で回収。
    setVia: ['kanban'],
    payoffVia: ['event', 'score'],
    note: '現場のゴールを届け情シス(結城)のゴールを後回し→ s3-daily-joushi-deprioritized で発注者の不安・面子として回収（trust摩擦・非対称に重い）',
    teaser: '進捗を見せたい相手を、後回しにしたかもしれない。',
  },
  deprioritizedGenba: {
    // 機構②: スプリント精算で立つ＝データ外経路 'kanban'。
    // s3-daily-genba-deprioritized（現場＝田淵の後回し＝insight機会損失/手戻り）で回収。
    setVia: ['kanban'],
    payoffVia: ['event', 'score'],
    note: '情シスのゴールを届け現場(田淵)のゴールを後回し→ s3-daily-genba-deprioritized で現場の手戻り・機会損失として回収（insight・機会損失アークの時間差）',
    teaser: '使える物を待つ現場を、後回しにしたかもしれない。',
  },
  retroCapacity: {
    // s1-retro choice b（capacity レバー＝レビューの量を増やす）の setsFlag で立つ。
    // 次レトロ(s2-retro-cap)が「キャリーオーバーは確かに減った」と前回の手応えを受けて始まる＝改善が効いた実感の回収。
    // genbaTrust/topDown とは別軸（同じレトロで両方立ちうる）。プロセス改善の連続性だけを担う。
    setVia: ['choice'],
    payoffVia: ['event'],
    note: 's1-retro で capacity レバー（レビューの量を増やす）を選ぶ→ s2-retro-cap が前スプリントの手応え（キャリーオーバー減）を受けて始まる＝改善が効いた実感の回収',
    teaser: '前回のカイゼンが、次の振り返りに効いてくる。',
  },
  retroWip: {
    // s1-retro choice c（wip レバー＝仕掛りを絞る）の setsFlag で立つ。
    // 次レトロ(s2-retro-wip)が「一つずつ深く仕上がるリズムになった」と前回の手応えを受けて始まる。
    setVia: ['choice'],
    payoffVia: ['event'],
    note: 's1-retro で wip レバー（仕掛りを絞る）を選ぶ→ s2-retro-wip が前スプリントの手応え（流れを作れた実感）を受けて始まる＝改善が効いた実感の回収',
    teaser: '前回のカイゼンが、次の振り返りに効いてくる。',
  },
}

/** いま盤面で追う「未回収の伏線」＝フラグが立っていて、まだ回収イベントが解決していないもの。
 *  ending/score 回収（フィナーレ・結末・スコア）は盤面では追わない（結末で締まる）。
 *  isPayoffResolved: そのフラグの requiresFlag イベントが既に解決済みか（Board が EVENTS×resolvedIds で判定）。 */
export function openThreads(
  flags: Iterable<GameFlag>,
  isPayoffResolved: (flag: GameFlag) => boolean
): { flag: GameFlag; teaser: string }[] {
  const out: { flag: GameFlag; teaser: string }[] = []
  for (const f of new Set(flags)) {
    const t = THREADS[f]
    if (!t.payoffVia.includes('event')) continue
    if (isPayoffResolved(f)) continue
    out.push({ flag: f, teaser: t.teaser })
  }
  return out
}
