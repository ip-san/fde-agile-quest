# loop 実行体（指揮者プロンプト）

これは **loop の指揮者＝メインスレッドが従う実行手順**。サブエージェントは他のサブエージェントを
起動できないため、各 agent を `Agent` ツールで委任して繋ぐのは**このメインスレッドの役目**。
`/loop` に渡す、または夜間スケジュールから起動する想定。

> 使い方の例: `/loop @.claude/agents/loop-runbook.md を1イテレーション実行して`
> （無人運用は ScheduleWakeup / cron で本ファイルの手順を繰り返す）

## 不変条件（毎イテレーション厳守）
- **作業は feature ブランチ**（`git switch -c loop/<topic>-<date>`）。**main を直さない**。
- **PR で提案する**: feature ブランチに commit/push し、PR を作成/更新する。ただし **main への直接 land・
  `git push --force`・`gh pr merge`（自動マージ）は capability で禁止**（settings の deny）。**マージは人間**。
- **ゲートを緩めない・真実源を絶対視・責任分離**（チーム憲章）。
- 破壊的/正本改変は着手せず `findings.md` に「人間提案」で残す。

## 1イテレーションの手順

### 0. 準備
- `.claude/agents/ledger/findings.md` と `RUNLOG.md` を読む。前回の未解決と文脈を把握。

### 1. 一手を決める（showrunner）
- `Agent(subagent_type: showrunner)` に「今夜の一手」を作らせる。出力＝作業指示書
  （対象 maker・スコープ・召集する専門家・受け入れ条件・リスク）。
- 人間承認が要る判定なら、ここで止めて `findings.md` に人間提案を追記し、run log を書いて**終了**。

### 2. 実装（maker）
- 指示書のスコープで `Agent(subagent_type: narrative-designer)` か `ux-engineer` に草稿を作らせる。

### 3. 考証＋監修 → **指摘が無くなるまで反復（loop-until-dry）**
物語テーマなら専門家、UX なら code-reviewer。**指揮者が差分（変更ファイル/イベントID）を各 agent に渡す**
（reviewer/専門家は shell を持たないため）。

```
round = 1
loop:
  - 物語: 召集された専門家（ai-dx/fde/agile/logistics/robotics の該当者）を並列委任 →
          その🔴🟡を narrative-designer に渡し、最終セリフを確定させる
  - 監修を並列委任: 物語 = story-reviewer + learning-designer / UX = code-reviewer
       ＋ **UX変更時は操作感・a11yレーンも必須**（code-reviewer だけでは「手応え/当たり判定/
         スクリーンリーダー」を拾えない）。指揮者が以下を回す:
         (a) `accessibility` スキルを変更コンポーネントに適用（WCAG/キーボード/SR/コントラスト）
         (b) ux-engineer に dev 起動＋実機スクショで**操作の手応えを自己点検**させる
             ＝ ON/OFF・押下・確定が「視覚（色＋動き）・聴覚（効果音）・触覚（押下感）」の
                3層で伝わるか（手応えが1層しか無い箇所は🟡として findings.md へ）
  - 全員の 🔴🟡🟢 を集約し、findings.md に追記（source/対象/重大度/round）
  - 🔴 が1件でもあれば → maker に修正させて round += 1、再度このループへ
  - 🔴 がゼロなら → 🟡 を評価:
       * 今イテレーションのスコープ内で安く直せる🟡 → maker に直させて再レビュー（round += 1）
       * スコープ外/設計判断が要る🟡 → findings.md に「open（次回以降）」で残す（ここでは追わない）
  - 2ラウンド連続で「新規🔴ゼロ かつ 新規の対応すべき🟡ゼロ」になったら dry とみなしループ終了
安全弁: round が 5 を超えても dry にならなければ、収束しない旨を run log に記し人間にエスカレーション。
```
> 「指摘が無くなるまで」= **🔴 は必ずゼロ**にし、**対応すべき🟡もゼロ**になるまで回す。残すのは
> スコープ外として意図的に open にした🟡だけ（理由を findings.md に明記）。

### 4. 品質ゲート（quality-gatekeeper）
- `Agent(subagent_type: quality-gatekeeper)` に `check:all` ＋ build/size/lighthouse/e2e を緑にさせる。
- 緑にできない（ゲートを緩めないと無理 / 設計判断）→ 人間にエスカレーションし run log に記して**終了**。

### 5. PR 可否ゲート → 記録
- 条件「全ゲート緑 ∧ 専門家/監修の🔴ゼロ ∧ 対応すべき🟡ゼロ ∧ 非破壊 ∧ 正本未改変」を満たすか判定。
  - 満たす → feature ブランチに **commit → push → PR を作成/更新**（＝提案）。`RUNLOG.md` に PR URL・差分要約・
    ブランチ名・残🟡を記録。**main 直 land・force-push・自動マージはしない**（deny）。
  - 欠ける → 何が欠けたかを `RUNLOG.md` と `findings.md` に記し、人間にエスカレーション。
- `findings.md` の今回解決した項目を resolved にする。

### 6. 次イテレーション
- 無人運用なら `ScheduleWakeup` で次回へ。各回の冒頭で必ず 0. から（findings/RUNLOG を読む）。

## 朝の引き継ぎ
人間は朝に `RUNLOG.md`（何をしたか・残課題）と `findings.md`（open な🟡・人間提案）を見て、
PR をレビュー → 良ければ**マージ**、要修正なら `director-feedback` で観点を learnings に残す。
