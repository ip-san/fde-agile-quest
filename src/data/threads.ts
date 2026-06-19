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
  /** 一行説明（仕掛け→回収の筋） */
  note: string
}

// 型注釈で全 GameFlag の登録を強制（キー欠落＝コンパイルエラー）。配列型は ThreadSetVia[] 等に広がる。
export const THREADS: Record<GameFlag, Thread> = {
  wrongKpi: {
    setVia: ['choice'],
    payoffVia: ['event', 'score'],
    note: 'KPIを「画面の機能数」に置く→使われない機能の手戻りイベント＋負債スコア',
  },
  aiOverreliance: {
    setVia: ['choice'],
    payoffVia: ['event', 'score'],
    note: 'AIに頼りすぎる→品質劣化イベント＋負債スコア',
  },
  genbaTrust: { setVia: ['choice'], payoffVia: ['event'], note: '現場の信頼を得る→後続の現場イベントが解放' },
  topDown: { setVia: ['choice'], payoffVia: ['event'], note: 'トップダウンで押し込む→反発・形骸化イベント' },
  fraudClue: { setVia: ['choice'], payoffVia: ['event'], note: '不正の手がかりを掴む→循環取引イベントが解放' },
  fraudCase: { setVia: ['choice'], payoffVia: ['ending'], note: '強い証拠を固める→暴露エンディングの強度に反映' },
  exposed: { setVia: ['finale'], payoffVia: ['ending'], note: 'フィナーレで暴く→専用エンディング' },
  complicit: { setVia: ['finale'], payoffVia: ['ending'], note: 'フィナーレで黙認→専用エンディング' },
  coopted: { setVia: ['finale'], payoffVia: ['ending'], note: 'フィナーレで取り込まれる→専用エンディング' },
  missedHearing: { setVia: ['missed'], payoffVia: ['event'], note: '聞き取りを見送る→理解不足の手戻りイベント' },
  missedUpgrade: { setVia: ['missed'], payoffVia: ['event'], note: '基盤更新を見送る→後で詰まるイベント' },
  showcasePressure: {
    setVia: ['choice'],
    payoffVia: ['event'],
    note: '親会社の実証ショーケース圧力が立つ→視察/報告イベントの連鎖',
  },
  chasedPromise: {
    setVia: ['choice'],
    payoffVia: ['event'],
    note: '背景を確かめず約束を追う→後で空回りするイベント',
  },
  soloHero: { setVia: ['choice'], payoffVia: ['event'], note: '移譲せず窓口を抱える→属人化ボトルネックのイベント' },
}
