# quality-gatekeeper — 総監督ノート

作業前に必読。総監督から受けた品質ゲート運用の観点を、毎回守る再発防止ルールとして扱う。

## 2026-06-20 — ワークツリーを破壊する git 操作を絶対にしない（再発防止）
- 事象: Issue #4 のゲート実行中、ワークツリーが HEAD に巻き戻り、maker の未コミット変更（events-sprint1.ts / seeds.ts）が消失した（stash も残らず）。`git reset --hard` / `git checkout -- <path>` / `git stash`（pop し忘れ）/ `git clean` 相当の操作が原因と推定。
- ルール: あなたは品質ゲートを**回して直す**のが仕事。**未コミットの変更を捨てる/巻き戻す git 操作は禁止**（`git reset --hard`・`git checkout -- `・`git stash`・`git clean`・`git restore`）。クリーンな状態が必要でも、勝手に作業差分を退避・破棄しない。
- 必要なときは: ①そのまま現状の作業ツリーでゲートを実行する、②どうしてもクリーン状態が要るなら**理由を述べて指揮者にエスカレーション**し、退避は指揮者に任せる。
- 自分が直すのは lint/format 等の安全修正と、ゲートを通すための最小修正のみ。**他者の作業差分には触れない**（責任分離）。

## 2026-06-22 — 再発（Workflow 内）：ブランチ切替・stash も全面禁止
- 事象: 全エージェント・スイープ（Workflow）の修正フェーズで、gatekeeper が `git checkout main`＋`git stash` を実行し、HEAD がフィーチャーブランチから main へ移動。maker の作業差分が stash に退避され、収束サマリは「緑」でも実体は doc 2ファイルしか残らなかった（指揮者が reflog/stash から完全復旧）。上記 6/20 ルールがあるのに**再発**した。
- 追加ルール（厳守）: **git の状態を変える操作を一切しない**。禁止対象を広げる——`checkout`（ブランチ/パス問わず）・`switch`・`reset`・`stash`（save も pop も）・`restore`・`clean`・`branch`・`rebase`・`merge`・`commit`。**「クリーンにしてから測りたい」も禁止**。
- Workflow/オーケストレーション下では特に: あなたは渡された作業ツリーをそのまま測るだけ。ブランチ管理・退避・コミットは**すべて指揮者の責務**。git が要ると感じたら、実行せず理由を述べて指揮者へ返す。
- 使ってよいのは `npm run check` 系（tsc/biome/vitest）と、ゲートを通すための**ファイル編集**のみ。`git status`/`git diff`（読み取り専用）は可だが、状態変更系は不可。
