---
name: playtest-gate
description: FDE Agile Quest を「プレイテスト起点」で改善する1サイクルを束ねる手順書。playtest-critic がプレイして飽き・離脱点を突き → maker（narrative-designer / ux-engineer）が対応 → 全監修＋品質ゲートを指摘が尽きるまで回す。単発で「プレイテストして直して」と頼むとき用。「プレイテスト」「遊んで直して」「飽き点つぶし」「プレイ体験を回して」「playtest gate」で呼び出す。
---

# playtest-gate — プレイテスト駆動の改善ゲート（束ね手順）

「**プレイヤー（playtest-critic）が試す → 他（maker）が対応 → 全員でレビューする**」を
**1サイクルとして束ねる**ための手順書。`loop` のフルパイプライン（Issue/ボード駆動）を回すほどでない、
**単発の「プレイして直して」**用に、起点を *プレイテスト* に固定した薄いラッパ。

## この skill の立ち位置（重複を作らない）

- 束ねる主体は **指揮者＝メインスレッド**。**サブエージェントは他のサブエージェントを起動できない**ため、
  各 agent を `Agent` ツールで委任して繋ぐのは指揮者の仕事（`.claude/agents/loop-runbook.md:3`）。
- **ゲートの本体は再実装しない**。考証＋監修の loop-until-dry、品質ゲート、PR 可否判定は
  **`loop-runbook.md` ステップ3〜5 の手順をそのまま使う**。この skill はそこへ
  「**playtest 起点**」という入口を足すだけ。詳細・不変条件は runbook が正本。
- `loop` との違いは **入口だけ**: GO ゲート（ボードの `Approved`）は要らない。総監督が直接
  「プレイテストして」と頼んだ時点が GO。それ以外（feature ブランチ・PR で提案・main 直 land 禁止・
  ゲート不緩和・真実源絶対視）は **runbook と完全に同じ**。

## 手順

### 0. 準備
- `git switch -c playtest/<topic>-<date>` で **feature ブランチ**を切る（main を直さない）。
- `.claude/agents/ledger/findings.md` の未解決🟡（特に playtest-critic 由来）を読む。

### 1. プレイ（playtest-critic）← この skill の起点
- `Agent(subagent_type: playtest-critic)` に**対象範囲**（章/スプリント/画面/イベントID群、無指定なら通し）を渡し、
  「飽きっぽい消費者」目線で **つかみ / 中だるみ / 反復の単調さ / 手応え / 選択の重み / テンポ / 引き /
  周回性 / 離脱点**を点検させ、🔴🟡🟢 を**局面名指し＋一工夫ヒント付き**で出させる。
- 出た 🔴🟡🟢 を `findings.md` に追記（source=playtest-critic / 対象 / 重大度 / round=0）。

### 2. 一手のトリアージ（showrunner）
- 🔴🟡 が複数なら `Agent(subagent_type: showrunner)` に **playtest の指摘＋findings** を渡し、
  「**最小で価値が高く・低リスクな一手**」を1つ選ばせ、対象 maker・スコープ・召集する専門家・
  受け入れ条件・リスクの**作業指示書**に落とさせる（探索はさせない＝コスト減）。
- 指示が「正本改変 / retcon / 新キャラ / 新章 / 破壊的」に触れるなら → **着手せず人間にエスカレーション**
  （`docs/STORY.md` の改変は自走しない。既存枠内の追加は可）。

### 3. 対応（maker）
- 指示書のスコープで `Agent(subagent_type: narrative-designer)`（本文・選択肢・テンポ・引き）か
  `ux-engineer`（操作感・手応え・演出・a11y）に**対応を実装**させる。
- 「飽き・作業化」への対応は**演出/崩し/バリエーション**が中心になりがち。UX 変更なら手応えの3層
  （視覚＝色＋動き／聴覚＝効果音／触覚＝押下感）が揃うかを意識させる。

### 4. 全員でレビュー → 指摘が尽きるまで反復（loop-until-dry）
**`loop-runbook.md` ステップ3 をそのまま実行**。指揮者が差分（変更ファイル/イベントID）を各 agent に渡す
（reviewer/専門家は shell 無し）。**playtest-critic を必ず再走**させ、直した結果が
「本当に飽きなくなったか／新たな中だるみを生んでいないか」を確認するのがこの skill の肝。

- 物語テーマ: 召集された専門家（ai-dx / fde / agile / logistics / robotics の該当者）を並列委任 →
  🔴🟡 を narrative-designer に渡し最終セリフを確定。監修 = `story-reviewer` + `learning-designer`
  + **`playtest-critic`（再走）**。
- UX: `code-reviewer` ＋ `accessibility` スキル（変更コンポーネントに WCAG/キーボード/SR/コントラスト）
  ＋ ux-engineer に dev 起動＋実機スクショで**手応えの自己点検** ＋ **`playtest-critic`（再走）**。
- 集約した 🔴🟡🟢 を `findings.md` に追記。**🔴 があれば maker が直して再レビュー**。🔴 ゼロでも
  スコープ内で安く直せる🟡 は直して再レビュー。**2ラウンド連続で「新規🔴ゼロ＋対応すべき🟡ゼロ」**で dry。
- 残すのは**スコープ外として意図的に open にした🟡だけ**（理由を findings.md に明記）。
- 収束しない（round > 5）→ 収束しない旨を記録して人間へ。

### 5. 品質ゲート（quality-gatekeeper）
- `Agent(subagent_type: quality-gatekeeper)`（または指揮者が直接 Bash）で `check:all` ＋
  build/size/lighthouse/e2e を**緩めずに**緑にする。緑にできない→人間にエスカレーション。
  - 委任する場合は委任後に `git status` で**差分保持を必ず検証**（ワークツリー reset 事故の回避）。

### 6. PR で提案（人間がマージ）
- 条件「全ゲート緑 ∧ 🔴ゼロ ∧ 対応すべき🟡ゼロ ∧ 非破壊 ∧ 正本未改変 ∧ 受け入れ条件充足」を満たすか判定。
  - 満たす → feature ブランチに **commit → push → PR を作成**。PR 本文に**何を飽き対策として変えたか**を要約。
    `RUNLOG.md` にも記録。**main 直 land・force-push・自動マージはしない**（capability で禁止）。
  - 欠ける → 何が欠けたかを `findings.md` / `RUNLOG.md` に記し、人間へ。
- `findings.md` の今回解決した項目（特に起点の playtest 指摘）を resolved にする。

## 仕上げの一言
このサイクルの成否は **「直した後に playtest-critic を再走させ、飽きが実際に消えたかを確認したか」**で決まる。
maker の対応で満足して再走を省くと「直したつもり」で終わる。**起点と検収の両方を playtest-critic に握らせる**こと。
