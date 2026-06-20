# FDE Agile Quest — loop改善 専門エージェントチーム

このゲームを `/loop`（高自律・夜間バッチ的）で継続改善するための、**制作スタジオ型**の
固定チーム。maker（書く人）と checker（見る人）を**構造的に分離**し、「書いた本人が自分で
合格にする」自己追認ループを防ぐ。各エージェントの実体は同ディレクトリの `*.md`。

## チーム憲章（全エージェント共通・各 .md 冒頭にも明記）

1. **責任分離の徹底** — 自分のスコープ外は触らない。checker / 専門家は**指摘のみ**で執筆・修正をしない。
   maker は他軸の成果物を勝手に書き換えない。
2. **真実源を絶対視** — 参照順 `docs/STORY.md`（設定の正本）→ `src/data/chapters/chapter-01/cast.ts`
   （物語バイブル）→ `docs/MOTIFS.md`（抽象核）→ 実装。矛盾する変更は作らない。**設定の正本を
   改変するなら必ず人間にエスカレーション**。同じファイル（cast.ts / STORY.md）でも「既存枠内の**追加**＝
   自走可／既存設定の**改変・retcon・新キャラ・新章**＝要承認」で線を引く（境界の定義は
   `narrative-designer.md`「真実源の編集境界」）。
3. **ゲートを緩めない** — 閾値引き下げ・ルール無効化・`.skip`・`--no-verify`・`biome-ignore` 乱用は禁止。
   根本を直す。必要なときは理由を添えて人間に確認。

> **ガードレールは指示でなく権限で固定**（`.claude/settings.local.json` の `deny`/`allow`）:
> loop は **feature ブランチで commit/push し、PR を作って“提案”する**。一方で **main へ直接 land はしない**——
> `git push ... main` / `git push --force` / `gh pr merge` は **capability レベルで禁止**。**マージは人間**が
> PR をレビューしてから行う（PR がレビューゲート）。reviewer/専門家は `Bash` を持たない（read-only）。
> ※ command-pattern による main 保護は best-effort。確実にするなら GitHub の**ブランチ保護**（main は PR 必須）
> を併用する。

## メンバー早見表

| レイヤー | agent | 種別 | 権限 |
|---|---|---|---|
| 運行 | `showrunner` | planner | read-only |
| 制作 | `narrative-designer`（物語のプロ・最終決定者） | **maker** | 物語ファイル write |
| 制作 | `ux-engineer` | **maker** | components write |
| 専門家 | `ai-dx-expert` / `fde-expert` / `agile-expert` / `logistics-expert` / `robotics-expert` | 顧問 | read-only（+Web） |
| 監修 | `story-reviewer` / `learning-designer` / `code-reviewer` | checker | read-only |
| 品質ゲート | `quality-gatekeeper` | checker+修正 | code write（自動マージ不可） |

考証の軸を分ける: **専門家＝ドメインの正確さ** / **story-reviewer＝物語の筋** /
**learning-designer＝教育価値** / **code-reviewer＝設計・可読性** / **quality-gatekeeper＝機械ゲート**。

**モデル配分（夜間バッチのコスト最適化）**: 創造性・微妙な判断が要る役は opus
（`narrative-designer` / `story-reviewer` / `learning-designer` / `showrunner` / 専門家5名＝考証の正確さは
削らない）。既存パターンに沿う実装や機械的判定が中心の役は sonnet
（`ux-engineer` / `code-reviewer` / `quality-gatekeeper`）。難所は必ず上位の監修・ゲート・人間に上がる
設計なので、sonnet 化しても品質の最終防衛線は保たれる。

## skill と agent の使い分け（棲み分け）

同じ概念が skill と agent の両方にあるのは**意図的な階層**であって重複ではない。

- **skill＝手順書（how-to）**: 今のスレッドにインライン展開して実行する。**ユーザーが単発で
  「〜して」と頼むとき**はこちら（例: 「物語レビューして」→ `story-review` skill、「品質ゲート直して」
  → `quality-fix` skill、「コードレビューして」→ home の `code-review` skill）。
- **agent＝役者（who）**: 独立コンテキスト窓＋制限ツール＋憲章/learnings を持ち、**loop / `showrunner`
  が委任して並列・隔離実行**させるための器。agent は手順を対応する skill に委ねる
  （`story-reviewer`→`story-review` / `quality-gatekeeper`→`quality-fix` /
  `code-reviewer`→`typescript-react-reviewer` / `agile-expert`→`agile-coach` / `ux-engineer`→`accessibility`）。

判断に迷ったら: **単発の手作業＝skill、夜間 loop の自動運用＝agent**。各 agent の description は
「loop運用での委任を想定」と明記してあり、キーワードでの直接起動より loop からの委任を優先する。

## 仕事のキュー＝GitHub Issue / Projects ボード

仕事は**コードより先に Issue として立つ**（テンプレ「loop タスク」）。loop が拾ってよいのは、総監督が
ボードで `Approved`(GO) 列へドラッグした Issue **だけ**。これにより「総監督の GO の有無」をボード上の
ステートで管理し、GO が無い限り loop は動かない。

- 列(Stage): `Backlog`→`Approved`(GO)→`In progress`→`In review`→`Blocked`/`Done`（詳細は `loop-runbook.md`）。
- ボード操作はスクリプトに閉じる（指揮者はコマンド1発＝トークンを使わない）:
  - 取得 `node .claude/agents/loop/next-task.mjs`（`Approved` 先頭を1行 JSON）
  - 移動 `node .claude/agents/loop/move-card.mjs <issue#> <inProgress|inReview|blocked>`
  - 初期化 `node .claude/agents/loop/setup-board.mjs`（1回だけ・要 `project` スコープ）
- **トークン空回り防止**: loop は起動直後に `next-task.mjs` を1回叩き、`Approved` が空なら
  **エージェントを1体も起動せず即スリープ**。GO がある時だけ全パイプラインを回す。
- **台帳の併用**: Issue/ボード＝仕事の真実源（総監督が触る）。`ledger/findings.md`＝loop 内部メモ（細かい🟡の
  持ち越し）、`ledger/RUNLOG.md`＝作業記録。Issue には要約だけコメントし、細粒度はファイルに残す。

## loop runbook（1イテレーション）

サブエージェントは他のサブエージェントを起動できないため、各 agent を `Agent` ツールで委任して繋ぐのは
**指揮者＝メインスレッド**の役目。実行手順の正本は **`loop-runbook.md`**（`/loop` に渡す or 夜間スケジュール）。

1. **GO ゲート**: 指揮者が `next-task.mjs` を叩く。`Approved` が空なら即スリープして終了（空回りゼロ）。
   取れたらその Issue が今夜の一手。`move-card.mjs <#> inProgress` で着手宣言＋feature ブランチを切る。
2. `showrunner` が **承認済み Issue を読み解いて**作業指示書に落とす（探索はしない）。正本改変/破壊的なら
   着手せず `Blocked` へ移し Issue にコメント。
3. 指示の maker（`narrative-designer` か `ux-engineer`）が草稿を実装。
4. **考証＋監修を、指摘が無くなるまで反復（loop-until-dry）**:
   - 物語: 召集された専門家を並列委任 → `narrative-designer` が最終セリフ確定。監修 = `story-reviewer` +
     `learning-designer`。UX: `code-reviewer`。指揮者が差分を各 agent に渡す（reviewer/専門家は shell 無し）。
   - 集めた 🔴🟡🟢 を `findings.md` に追記。**🔴 があれば maker が直して再レビュー**。🔴 ゼロでも、
     スコープ内で安く直せる🟡 は直して再レビュー。**2ラウンド連続で「新規🔴ゼロ＋対応すべき🟡ゼロ」**で dry。
   - 「指摘が無くなるまで」＝ **🔴 は必ずゼロ・対応すべき🟡もゼロ**。スコープ外の🟡だけ理由付きで open に残す。
   - 収束しない（round > 5）なら人間にエスカレーション。
5. `quality-gatekeeper` が `check:all` ＋ build/size/lighthouse/e2e を**緩めずに**緑にする。緑にできなければ
   人間にエスカレーション。
6. **PR 可否ゲート**: 「全ゲート緑 ∧ 🔴ゼロ ∧ 対応すべき🟡ゼロ ∧ 非破壊 ∧ 正本未改変 ∧ 受け入れ条件充足」
   を満たすか判定。満たせば **feature ブランチに commit → push → PR（本文に `Closes #<#>`）を作成/更新**し、
   `move-card.mjs <#> inReview` ＋ Issue に PR URL をコメント。`RUNLOG.md` にも記録。欠けたら `Blocked` へ移し
   理由をコメント。**main 直 land・force-push・自動マージはしない**。
7. `ScheduleWakeup` で次イテレーションへ（毎回 GO ゲートから）。**朝に総監督が** ボードの `In review` を見て
   PR をレビュー → 良ければ**マージ**（Issue が閉じ→`Done` 自動移動）、要修正なら `director-feedback` で
   観点を learnings に残す。`Blocked` は判断を仰いでいる Issue。

### 高自律の安全弁
作業は常に feature ブランチ・**PR で提案（main 直 land / force-push / 自動マージは capability で禁止）**・
**マージは人間**・専門家/監修の🔴と品質ゲートはブロッキング・**設定正本の改変/retcon/破壊的変更は必ず人間**・
レビューは指摘が尽きるまで反復。これで「高自律」と「ゲート不緩和・真実源絶対視」を両立する。

## 総監督フィードバックの取り込み（learnings ループ）

**総監督（あなた）が出来栄えに不満を持って指摘したら、その観点を該当エージェントが恒久的に覚えて
今後の仕事を改善する**——そのための仕組み。

- 各エージェントは作業開始前に自分の **総監督ノート** `.claude/agents/learnings/<agent>.md` を必読し、
  そこに書かれた観点を**毎回守る再発防止ルール**として扱う。
- 指摘の記録は **`director-feedback` スキル**が担う（トリガー:「総監督」「ダメ出し」「フィードバック記録」
  「指摘を覚えて」）。スキルは①不満の本質を理解し、②責任を持つエージェントを特定し、③**一回限りの
  修正でなく一般化した観点**に直して、④その `learnings/<agent>.md` に日付付きで追記し、⑤誰に何を
  記録したか報告する。
- 記録先の判断指針: 言い回し/トーン＝`narrative-designer`、操作感/見た目＝`ux-engineer`、考証漏れ＝該当
  専門家、矛盾の見逃し＝`story-reviewer`、教育価値の薄さ＝`learning-designer`、設計/可読性＝`code-reviewer`、
  一手の選び方＝`showrunner`。複数該当なら複数に記録。
- 観点は**簡潔・一般化・検証可能**に（「このセリフを直す」ではなく「SMの口上で同じ語尾を繰り返さない」）。

これにより、loop が回るほどチームは総監督の好みに収束していく。

## 既存資産の再利用（重複を作らない）
- `story-reviewer` → スキル `story-review` を手順書として実行
- `quality-gatekeeper` → スキル `quality-fix` を手順書として実行
- `code-reviewer` → スキル `typescript-react-reviewer` / `ux-engineer` → スキル `accessibility`
- `agile-expert` → スキル `agile-coach` を活用
- 専門家の根拠資料 → `REFERENCES.md`（一次資料＋資格試験カタログ）。不足時のみ Web で裏取り

## ワークツリーへの同期
`.claude/worktrees/*/.claude/` に同じ skills が複製されている。エージェントを使う必要が出た
ワークツリーには、このディレクトリを同期すること（親側が正）。
