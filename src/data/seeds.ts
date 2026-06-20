// ───────────────────────────────────────────────────────────
// 「次の機能の種」＝FDEが現場でしか掴めないプロダクトの種を吸い上げ、自社SaaS「StockPilot」へ還元する。
// 現場を観る選択（choice.seedId）で“発見”し、周回をまたいでリポジトリ画面に集まる（X/全）。
// 出典思想: FDE は現場の一次情報を製品に還元する（プロダクト・フィードバックループ）。
// ───────────────────────────────────────────────────────────

export interface FeatureSeed {
  id: string
  /** 製品に還元する機能アイデア */
  title: string
  /** どの現場の観察から芽生えたか（一行） */
  from: string
}

export const SEEDS: FeatureSeed[] = [
  { id: 'photo-input', title: '写真でメモ→在庫へ自動反映', from: '手書きメモで数えるベテランの手元' },
  { id: 'exception-flow', title: 'イレギュラー品の例外フロー登録', from: '図にして初めて見えた例外パターン' },
  { id: 'stock-alert', title: '在庫差異の早期アラート', from: '帳簿と実数のズレ' },
  {
    id: 'genba-dashboard',
    title: '現場リーダーが自分で見る誤出荷ダッシュボード',
    from: '数字を読む役が一人に依存する運用',
  },
  { id: 'guided-onboarding', title: '新人向けのガイド付き手順', from: '運用を引き取ろうとする若手' },
  // legacy-bridge は中立な出自イベント s1-daily-legacy（choice b）と懲罰分岐 s3-daily-stuck-base（choice b）の
  // 双方で拾える。源流で正しく向き合った player も種を得られ、他5種との非対称を解消（発見は集合追加で冪等）。
  { id: 'legacy-bridge', title: 'レガシー基盤との安全な橋渡し', from: '20年ものの基幹システム' },
]

export const SEED_BY_ID: Record<string, FeatureSeed> = Object.fromEntries(SEEDS.map((s) => [s.id, s]))
