# loop 自走ドライバ（無人夜間運用 / ローカル /loop）

`loop-runbook.md`（1イテレーションの手順）を**自分のペースで連続実行**するための上位ドライバ。
夜間にこれを `/loop` に渡して起動し、総監督が `Approved`(GO) にした Issue を空になるまで処理して、
あとはアイドル（GO 待ち）でスリープし続ける。**GO が無い夜は一切トークンを使わない**のが要。

## 起動方法（総監督）
就寝前に Claude Code セッションでこれを実行する:
```
/loop @.claude/agents/loop-autonomous.md
```
（interval を渡さない＝モデルが自分でペースを決める「dynamic」モード。`ScheduleWakeup` で再起動を予約する）
> ローカル方式のため**このセッション/PC を起動したままにする**こと。止めたいときは `/loop` を停止。
> 朝はボードの `In review`（レビュー待ち PR）と `Blocked`（判断待ち）を見る。

## 1ティックの動作（毎回これを実行）

### A. GO ゲート（最初に必ず・トークン節約の要）
```
node .claude/agents/loop/next-task.mjs
```
- `{"hasTask":false}` → **エージェントを1体も起動しない**。`ScheduleWakeup`（idle 用に長め＝下記）で再起動を
  予約し、このティックは**即終了**。空回りゼロ。
- `{"hasTask":false,"error":...}` → ボード/スコープ異常。`RUNLOG.md` に1行残し、`ScheduleWakeup`（idle）で
  予約して終了（無人なので止めない。朝に人間が気づける）。
- `{"hasTask":true,...}` → B へ。

### B. 1イテレーション実行（GO がある間は連続・スリープを挟まない）
`loop-runbook.md` の手順 1〜5 を**そのまま1回**実行する（着手=inProgress / showrunner=Issue を指示書化 /
maker / 考証＋監修を loop-until-dry / 品質ゲート / PR=inReview）。完了したら**スリープせず A に戻る**
（`Approved` がまだ残っていれば次を即処理）。上限なし＝`Approved` が空になるまで B を繰り返す。

### C. アイドル（Approved が空になったら）
`Approved` が空＝処理し切った。`ScheduleWakeup(delaySeconds: 1800, reason: "GO 待ち（Approved 空）")` で
30分後に再起動を予約して終了。次のティックはまた A から。総監督が新たに GO を出せば次の周回で拾う。

## 無人運用での安全弁（runbook の不変条件に加えて厳守）
- **作業は feature ブランチ・PR で提案のみ**。main 直 land / `git push --force` / 自動マージは capability で禁止。
  **マージは人間**（PR がレビューゲート）。
- **GO の無い Issue には着手しない**（`Approved` 以外の列に触れない）。
- **正本改変・破壊的変更・受け入れ条件が曖昧なもの**は着手せず `Blocked` へ移し Issue にコメントして次へ。
- **品質ゲートは指揮者が直接 Bash で回す**（`check:all` → `build` → `size` → `lighthouse` → `test:e2e`）。
  失敗の **安全な自動修正（format 等）も指揮者が実行**。それでも直らない/判断が要るものだけ
  `quality-gatekeeper` に委任する。**委任後は必ず `git status` で作業差分が保持されているか検証**する
  （過去にゲート中の `git reset` 相当で未コミット変更が消えた事故あり。learnings/quality-gatekeeper.md 参照）。
- **収束しない（review が round>5 / ゲートが緑にできない）**→ その Issue を `Blocked` にしてコメントし、
  次の Issue へ（無人なので1件で全体を止めない）。
- **ティックごとに `findings.md` / `RUNLOG.md` を更新**し、朝に人間が追えるようにする。

## 収束（いつ止まるか）
- 上限は設けない（Approved を空にするまで処理）。空になったら C のアイドルに入り、GO 待ちで回り続ける。
- 完全に止めるのは総監督が `/loop` を停止したとき。
