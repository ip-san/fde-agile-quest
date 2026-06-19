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

type ThreadSetVia = 'choice' | 'missed' | 'finale'
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
    teaser: '上から通したやり方に、軋みが残っている。',
  },
  fraudClue: {
    setVia: ['choice'],
    payoffVia: ['event'],
    note: '不正の手がかりを掴む→循環取引イベントが解放',
    teaser: '数字の奥に、見過ごせない違和感がある。',
  },
  fraudCase: {
    setVia: ['choice'],
    payoffVia: ['ending'],
    note: '強い証拠を固める→暴露エンディングの強度に反映',
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
    teaser: '後回しにした基盤が、静かに軋んでいる。',
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
  soloHero: {
    setVia: ['choice'],
    payoffVia: ['event'],
    note: '移譲せず窓口を抱える→属人化ボトルネックのイベント',
    teaser: '自分が抱え込んだ役割が、いつか詰まる。',
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
