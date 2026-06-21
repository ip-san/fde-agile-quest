import { useFocusTrap } from '../hooks/useFocusTrap'
import { RichText } from './RichText'

interface Props {
  onClose: () => void
}

interface HowToSection {
  heading: string
  /** 箇条書き（各行 RichText 対応）。 */
  lines: string[]
}

// 「遊び方」リファレンス本文。この画面でしか使わないのでコンポーネントと同じチャンクに同梱する
// （オンデマンド読込＝初期バンドルに乗せない）。文中 {{用語}} は glossary に存在するキーのみ。
const HOW_TO_PLAY: HowToSection[] = [
  {
    heading: '🎯 目標＝顧客価値（北極星）',
    lines: [
      'FDEの仕事は〈顧客価値〉を高めること。これがゲームの基本目標です。',
      '顧客価値＝3メーター（信頼・現場理解・巻き込み）＋届けたインクリメント＋コードの良さ −技術的負債。',
      'どれか1メーターが0になると、その場で案件終了（バッドエンド）。削りすぎは命取り。',
      '全部を同時に上げる単一の正解はない。何を取り、何を手放すかを選ぶ（トレードオフ）。',
    ],
  },
  {
    heading: '🔁 スプリントの流れ',
    lines: [
      '3スプリントを通して進む。各スプリント＝プランニング → デイリー×5 → レビュー → レトロ。',
      'デイリーだけルーレット。プランニング/レビュー/レトロは「進める」で会議へ。',
      '選択のあとミニゲーム（ヒアリング/開発/レビュー/交渉）。出来（会心/標準/不発）で伸びが上下する。',
    ],
  },
  {
    heading: '🗺 デイリー（今日どこへ行く）',
    lines: [
      'ルーレット→今日の候補が3つ立つ。動けるのは1か所だけ、残りは見送り＝機会損失（後で響く）。',
      '現場で良く聞く・観るほど、隠れた課題（発見PBI）を掘り当てられる。',
    ],
  },
  {
    heading: '📋 スプリント計画（プランニング）',
    lines: [
      'ゴールを決め、{{プロダクトバックログ}}の上位（価値順）から順に{{フォーキャスト}}（予測）を組む。',
      '上位優先＝飛ばし入れはできない。下位を上げたいなら、並びをPOに提案し価値の論拠で説得する。',
      '容量（人の{{レビュー}}）を超えて積むのは自由＝“賭け”。終わらない分は{{キャリーオーバー}}（次へ持ち越し）。',
    ],
  },
  {
    heading: '🧮 カンバン（着手・レビュー）',
    lines: [
      '着手はAIが下書きを生成（生成AIトークンを消費）。価値は人の{{レビュー}}で生まれる。',
      '{{仕掛り}}（WIP）は2で詰まり、{{制約理論}}どおりレビューがボトルネックになる。',
      '浅いレビュー＝速いが技術的負債、深いレビュー＝{{完成の定義}}を満たし品質（テスト）を積む。',
    ],
  },
  {
    heading: '✅ レビューとレトロ',
    lines: [
      'レビュー：完成（{{完成の定義}}達成）分を精算し、{{ベロシティ}}と顧客価値の伸びを見る。未完は持ち越し。',
      'レトロ：プロセス改善を1つ選ぶ（レビュー容量↑ or WIP↓）。次スプリント以降に永続して効く。',
    ],
  },
  {
    heading: '📖 心得・用語',
    lines: [
      '判断するほどFDEの「心得」が集まる（下部メニュー📖）。青い専門用語はタップで意味が出る。',
      '困ったらこの「遊び方」をいつでも開ける。まずは動かして、出来事から学ぶのが近道。',
    ],
  },
]

/** 「遊び方」リファレンス。いつでも見返せるルールの一覧（下部メニューから開く）。
 *  都度教示（Coachmark）が“その場面の一言”なら、こちらは“全体の地図”。判断＝主・用語＝従。 */
export function HowToPlay({ onClose }: Props) {
  const ref = useFocusTrap<HTMLDivElement>(onClose)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg-deep)]/95 px-safe pt-safe pb-safe backdrop-blur-sm">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="howto-title"
        className="flex max-h-[92vh] w-full max-w-xl flex-col rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl"
      >
        <header className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-3">
          <h2 id="howto-title" className="text-base font-bold text-[var(--text)]">
            遊び方 — このゲームのルール
          </h2>
          <span className="rounded bg-[var(--panel)] px-2 py-0.5 text-xs text-[var(--text-sub)]">いつでも開けます</span>
        </header>

        <div className="space-y-4 overflow-y-auto px-5 py-4">
          {HOW_TO_PLAY.map((sec) => (
            <section key={sec.heading}>
              <h3 className="mb-1.5 text-sm font-bold text-[var(--text)]">{sec.heading}</h3>
              <ul className="space-y-1">
                {sec.lines.map((line) => (
                  <li key={line} className="flex gap-1.5 text-[13px] leading-relaxed text-[var(--text-body)]">
                    <span aria-hidden="true" className="text-[var(--text-sub)]">
                      ・
                    </span>
                    <span>
                      <RichText text={line} />
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <footer className="border-t border-[var(--border)] px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] w-full rounded-xl bg-[var(--panel)] py-3 font-bold text-[var(--text-body)] transition hover:bg-[var(--border)] active:scale-95"
          >
            閉じる
          </button>
        </footer>
      </div>
    </div>
  )
}
