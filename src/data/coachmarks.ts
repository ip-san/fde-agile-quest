// ───────────────────────────────────────────────────────────
// 都度教示（コーチマーク）の型と“キー一覧”だけを置く軽量モジュール（初期バンドル常駐）。
// 本文テキストは coachmarkContent.ts（遅延の Coachmark コンポーネントからのみ参照）に分離し、
// 初期バンドルに乗せない。Board はここの COACHMARK_KEYS だけを見て「出すか/出さないか」を決める。
// ───────────────────────────────────────────────────────────

export interface Coachmark {
  /** 既読管理キー＝セレモニー名 or 'intro'/'minigame'（localStorage: fde-agile-quest:coach:<key>） */
  key: string
  /** 出来事の前に一拍で読ませる見出し */
  title: string
  /** 「今この場面で何をするか」を2〜3文で。RichText 対応（{{用語}} 可） */
  body: string
}

/** どのキーにコーチマークがあるか（Board が“出すか出さないか”の判定だけに使う軽量リスト）。
 *  本文 COACHMARKS は別ファイル（coachmarkContent.ts）にあり、遅延チャンクにしか乗らない。
 *  ※ coachmarkContent.ts にキーを足したら、ここにも足すこと。 */
export const COACHMARK_KEYS: readonly string[] = ['intro', 'planning', 'daily', 'review', 'retro', 'minigame']
