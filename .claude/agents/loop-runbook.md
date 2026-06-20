# loop 実行体（指揮者プロンプト）— Issue/Projects 駆動版

これは **loop の指揮者＝メインスレッドが従う実行手順**。サブエージェントは他のサブエージェントを
起動できないため、各 agent を `Agent` ツールで委任して繋ぐのは**このメインスレッドの役目**。
`/loop` に渡す、または夜間スケジュールから起動する想定。

> 使い方の例: `/loop @.claude/agents/loop-runbook.md を1イテレーション実行して`
> （無人運用は ScheduleWakeup / cron で本ファイルの手順を繰り返す）

## このループの仕事のキュー＝GitHub Projects ボード

仕事は**コードより先に Issue として立っている**。loop が拾ってよいのは、総監督がボードで
`Approved` 列へ動かした Issue だけ（＝**GO サイン**）。

| 列(Stage) | 意味 | loop |
|---|---|---|
| `Backlog` | 起票済み・未承認（総監督が検討中） | 触らない |
| `Approved` | **GO**。総監督がここへドラッグ＝着手許可 | **FIFO で1件拾う** |
| `In progress` | loop が着手中（二重取得防止＋進捗可視化） | loop が移動 |
| `In review` | PR 提出済み・人間マージ待ち | loop→人間 |
| `Blocked` | 人間判断が必要（エスカレーション） | loop が移動→人間 |
| `Done` | マージ済み（PR merged で自動 / 人間） | 自動 |

ボード操作はスクリプトに閉じてある（指揮者はコマンド1発で叩く＝トークンを使わない）:
- 取得: `node .claude/agents/loop/next-task.mjs` → `Approved` 先頭を1行 JSON で返す
- 移動: `node .claude/agents/loop/move-card.mjs <issue#> <inProgress|inReview|blocked>`

## 不変条件（毎イテレーション厳守）
- **作業は feature ブランチ**（`git switch -c loop/<topic>-<date>`）。**main を直さない**。
- **PR で提案する**: feature ブランチに commit/push し PR を作成/更新。**main 直 land・`git push --force`・
  `gh pr merge`（自動マージ）は capability で禁止**（settings の deny）。**マージは人間**。
- **GO の無い Issue には絶対に着手しない**（`Approved` 以外の列は触らない）。
- **ゲートを緩めない・真実源を絶対視・責任分離**（チーム憲章）。
- 破壊的/正本改変が要る Issue は着手せず `Blocked` へ移し、理由を Issue にコメント。

## 1イテレーションの手順

### 0. GO ゲート（最初の関門・トークン節約の要）
```
node .claude/agents/loop/next-task.mjs
```
- `{"hasTask":false}` → **エージェントを1体も起動せず終了**。無人運用なら `ScheduleWakeup` で
  長め（例: 30分〜数時間）に再起動を予約して**このイテレーションは即終了**。空回りで一切トークンを使わない。
- `{"hasTask":false,"error":...}` → スコープ/ボード未設定。`RUNLOG.md` に1行残して人間にエスカレーション。
- `{"hasTask":true, number, title, url, body, ...}` → これが**今夜の一手**。`body` が作業指示書の素。次へ。

### 1. 着手宣言＋指示書の確定（showrunner）
- `node .claude/agents/loop/move-card.mjs <number> inProgress`（二重取得防止・進捗可視化）。
- `git switch -c loop/<topic>-<date>` で feature ブランチを切る。
- `.claude/agents/ledger/findings.md`（前回までの未解決🟡・内部メモ）を読む。
- `Agent(subagent_type: showrunner)` に **Issue 本文（body）＋ findings の関連項目**を渡し、
  **作業指示書に落とさせる**（探索はしない＝コスト減）。指示書 = 対象 maker・スコープ・召集する専門家・
  受け入れ条件・リスク。
- showrunner が「これは正本改変/破壊的/承認境界の外」と判定したら → **2 へ進まず**
  `node .claude/agents/loop/move-card.mjs <number> blocked` ＋ `gh issue comment <number> -b "<理由と人間への提案>"`
  → `RUNLOG.md` に記録して**終了**。

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
       * 今 Issue の受け入れ条件/スコープ内で安く直せる🟡 → maker に直させて再レビュー（round += 1）
       * スコープ外/設計判断が要る🟡 → findings.md に「open（次回以降）」で残す（ここでは追わない）
  - 2ラウンド連続で「新規🔴ゼロ かつ 新規の対応すべき🟡ゼロ」になったら dry とみなしループ終了
安全弁: round が 5 を超えても dry にならなければ、収束しない旨を Issue にコメント＋run log に記し人間へ。
```
> 「指摘が無くなるまで」= **🔴 は必ずゼロ**にし、**対応すべき🟡もゼロ**になるまで回す。残すのは
> スコープ外として意図的に open にした🟡だけ（理由を findings.md に明記）。

### 4. 品質ゲート（quality-gatekeeper）
- `Agent(subagent_type: quality-gatekeeper)` に `check:all` ＋ build/size/lighthouse/e2e を緑にさせる。
- 緑にできない（ゲートを緩めないと無理 / 設計判断）→ `move-card.mjs <number> blocked` ＋ Issue にコメント
  ＋ run log に記して**終了**。

### 5. PR 可否ゲート → 記録
- 条件「全ゲート緑 ∧ 専門家/監修の🔴ゼロ ∧ 対応すべき🟡ゼロ ∧ 非破壊 ∧ 正本未改変 ∧ 受け入れ条件充足」を判定。
  - 満たす → feature ブランチに **commit → push → PR を作成/更新**。PR 本文に `Closes #<number>` を入れる
    （マージで Issue が閉じ、ボードの built-in workflow が `Done` へ自動移動）。その後
    `node .claude/agents/loop/move-card.mjs <number> inReview` ＋
    `gh issue comment <number> -b "PR: <PR URL> / 差分要約 / 残🟡"`。`RUNLOG.md` にも記録。
    **main 直 land・force-push・自動マージはしない**（deny）。
  - 欠ける → 何が欠けたかを Issue コメント＋`RUNLOG.md`＋`findings.md` に記し、`blocked` へ移動して人間へ。
- `findings.md` の今回解決した項目を resolved にする。

### 6. 次イテレーション
- 無人運用なら `ScheduleWakeup` で次回へ。**毎回 0.（GO ゲート）から**。`Approved` が空なら即スリープ。

## 朝の引き継ぎ
- 総監督は **ボードの `In review` 列**を見る＝レビュー待ち PR の一覧。PR をレビュー → 良ければ**マージ**
  （Issue が閉じ→`Done` へ自動）、要修正なら `director-feedback` で観点を learnings に残す。
- `Blocked` 列＝loop が判断を仰いでいる Issue。コメントの提案を見て、進めるなら `Approved` へ戻す
  （改変を許すなら受け入れ条件に明記してから）、却下なら閉じる。
- 新しい仕事は Issue を起票（テンプレ「loop タスク」）→ `Backlog`。GO を出すときだけ `Approved` へドラッグ。

## 台帳の役割分担（Issue と ファイルの併用）
- **Issue / ボード = 仕事の真実源**（GO 判定・状態・人間との往復）。総監督が触るのはこちら。
- **`ledger/findings.md` = loop 内部メモ**（イテレーション内/跨ぎの🟡・専門家の細かい指摘の持ち越し）。
  Issue に毎回書くと冗長なので、細粒度の指摘はここに残し、要約だけ Issue にコメントする。
- **`ledger/RUNLOG.md` = 作業記録**（何をしたか）。Issue コメントと重複しすぎない範囲で1ブロック追記。
