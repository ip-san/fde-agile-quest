# SELF_IMPROVEMENT.md — このプロジェクトの自己改善の仕組み

FDE Agile Quest が「回すほど良くなる」ための仕組みを 1 枚で俯瞰するドキュメント。
**ここは入口（地図）であって正本ではない**。各仕組みの正本は下表のファイル。詳細はそちらを参照する。

| 仕組み | 正本ファイル | 役割 |
|---|---|---|
| 改善ループの運行 | `.claude/agents/loop-runbook.md` | 1 イテレーションの SOP |
| 無人夜間運用 | `.claude/agents/loop-autonomous.md` | runbook を連続実行する上位ドライバ |
| チーム構成と権限分離 | `.claude/agents/README.md` | maker / checker / 専門家 / ゲートの憲章 |
| 総監督フィードバックの学習 | `.claude/skills/director-feedback/SKILL.md` | 指摘を再発防止ルールに一般化 |
| 学習の保管庫 | `.claude/agents/learnings/<agent>.md` | 各 agent が作業前に必読する観点 |
| 引き継ぎ台帳 | `.claude/agents/ledger/findings.md` / `RUNLOG.md` | イテレーション跨ぎの記憶 |
| 物語の正本 | `docs/STORY.md` / `cast.ts` | 改善が守るべき設定の憲法 |

---

## 全体像：3 つの改善ループが入れ子になっている

```
[L3] 総監督フィードバック・ループ（人間 → チームの恒久学習）
  └─ [L2] 仕事のキュー・ループ（Issue/ボード → PR → マージ）
        └─ [L1] レビュー収束ループ（草稿 → 指摘が尽きるまで反復）
```

- **L1（分単位）** = 1 つの成果物を「指摘ゼロ」まで磨く（loop-until-dry）。
- **L2（1 イテレーション）** = GO の出た Issue 1 件を草稿→レビュー→ゲート→PR まで運ぶ。
- **L3（日をまたぐ）** = 総監督の好みを learnings に蓄積し、L2/L1 の品質基準そのものを底上げする。

回すほど L3 が効いて、チームが総監督の美意識へ収束していく——これがこのプロジェクトの自己改善の核。

---

## L1：レビュー収束ループ（loop-until-dry）

1 つの草稿を、指摘（🔴🟡🟢）が尽きるまで反復で磨く。正本は `loop-runbook.md` §3。

- **権限分離が前提**: 書く人（maker）と見る人（checker/専門家）を構造的に分け、**書いた本人が自分で合格にする自己追認を禁止**する。
- **収束条件**: 🔴 は必ずゼロ、対応すべき🟡 もゼロ。スコープ外として意図的に open にした🟡 だけ `findings.md` に残す。
- **dry 判定**: 2 ラウンド連続で「新規🔴ゼロ＋対応すべき🟡ゼロ」。
- **安全弁**: round > 5 で収束しなければ人間へエスカレーション。

考証の軸は多重化されている（README 早見表）:
専門家＝ドメインの正確さ / story-reviewer＝物語の筋 / learning-designer＝教育価値 / code-reviewer＝設計・可読性 / **playtest-critic＝面白さ・飽きにくさ（"正しいが退屈"への対抗軸）** / quality-gatekeeper＝機械ゲート。

---

## L2：仕事のキュー・ループ（Issue/Projects 駆動）

仕事は**コードより先に Issue として立つ**。loop が拾えるのは総監督が `Approved`(GO) 列へ動かした Issue **だけ**。
正本は `loop-runbook.md`（1 回）と `loop-autonomous.md`（連続実行）。

```
GO ゲート(next-task.mjs) → 着手宣言(inProgress＋feature ブランチ)
  → showrunner が Issue を作業指示書に落とす
  → maker が草稿（L1 レビュー収束）
  → quality-gatekeeper が check:all＋build/size/lighthouse/e2e を緑に
  → PR 可否ゲート → commit/push/PR 作成(inReview) → 次の GO へ
```

自己改善を支える設計上の要点:

- **GO の無い夜はトークンを使わない**: `Approved` が空ならエージェント 0 体で即スリープ（空回りゼロ）。
- **ガードレールは指示でなく権限で固定**: main 直 push / force-push / `gh pr merge` は `settings.local.json` の `deny` で capability レベル禁止。**マージは必ず人間**（PR がレビューゲート）。
- **真実源を絶対視**: `STORY.md` / `cast.ts` の改変・retcon・新キャラ・新章は自走しない → 人間へエスカレーション。既存枠内の追加のみ自走可。
- **収束しない 1 件で全体を止めない**: review round>5 / ゲート緑化不可 / 正本改変は `Blocked` にコメントして次へ。

---

## L3：総監督フィードバック・ループ（learnings）

**総監督が出来栄えに不満を持って指摘したら、その観点を該当エージェントが恒久的に覚えて今後改善する。**
正本は `director-feedback` スキルと `learnings/<agent>.md`。

```
総監督のダメ出し
  → director-feedback スキルが ①本質を聞き取り ②責任 agent を特定
     ③一回限りでなく一般化した観点に直し ④learnings/<agent>.md へ日付付き追記
  → 各 agent は作業開始前に自分の learnings を必読し、毎回守る再発防止ルールにする
```

- **一般化が肝**: ✕「この朝会のセリフを直す」→ ◯「SM の口上で同じ語尾を 3 連続で繰り返さない」。
- **責任の所在に記録**: 言い回し＝narrative-designer / 操作感＝ux-engineer / 考証漏れ＝該当専門家 / 矛盾の見逃し＝story-reviewer / 教育価値＝learning-designer / 設計＝code-reviewer / 一手の選び方＝showrunner。
- **版で残す**: 古い観点は消さず「（YYYY-MM-DD 更新）」で履歴を保つ。

呼び出しトリガー: 「総監督」「ダメ出し」「フィードバック記録」「指摘を覚えて」「この観点を覚えて」。

---

## 補助：記憶と自己保守の仕組み

- **引き継ぎ台帳**:
  - `ledger/findings.md` = 非ブロッキング🟡 と人間提案をイテレーション間で持ち越す内部メモ。showrunner が次の一手の優先候補として読む。
  - `ledger/RUNLOG.md` = 作業記録。朝に人間が追える粒度。
  - Issue/ボード = 仕事の真実源（総監督が触る）。細粒度は台帳、要約だけ Issue にコメント。
- **自己生成ドキュメント**: events を変えたら `npm run gen:index` で `docs/EVENT_INDEX.md` を再生成（手で編集しない）。
- **品質ゲートを緩めない**: 閾値引き下げ・ルール無効化・`.skip`・`--no-verify`・`biome-ignore` 乱用は禁止。type-coverage 99% 厳守。通せなければ根本を直すか人間へ。

---

## ループの起動方法（総監督が叩くコマンド）

Claude Code（CLI / デスクトップアプリ）のプロンプトに以下を入力する。

```
/loop @.claude/agents/loop-autonomous-playtest.md を1ティック（A〜E）実行して。完全自走モード。固定1時間間隔なので各ティックでは自前の ScheduleWakeup はせず、1ティックぶんだけ実行して終了する。
```

> **`/loop` は Claude Code のビルトインスキル**。先頭の `/loop` がスキルを起動し、
> 続くテキスト（`@.claude/agents/…`）がそのスキルへの引数として渡される。

### 各ティックで起きること（A → E）

| ステップ | 内容 | 結果 |
|---|---|---|
| **A** 背圧チェック | 未マージ PR 数を確認。上限（10）に達していれば停止。 | blocked / clear |
| **B** バッチ取得 | キューから最大3件を FIFO で取得。 | タスクあり / キュー空 |
| **C** 実装 | ドメイン分類 → ぶつからない組を並列 Agent で実装 → PR 作成。 | In review へ |
| **D** 発見（キュー空のとき） | `playtest-triage` スキルで飽き点を最大3件 Backlog に起票。 | 次ティックの種 |
| **E** アイドル | 何もなければ次ティックまで待機。 | — |

### 止め方
Claude Code のセッションを閉じるか、`/loop` のセッションを終了する。
外部 cron で回す場合は cron ジョブを削除する。

### 朝の確認ポイント
- **GitHub Projects ボード** → `In review` 列にある PR をレビュー・マージする
- **`RUNLOG.md`** → 夜間に何をやったかの1行ダイジェスト
- **`Blocked` 列** → エスカレーションが必要な Issue にコメントが付いている

### ループ内でスキルが呼ばれる仕組み
C フェーズは `Agent` ツールでエージェント（narrative-designer 等）を直接起動する。
D フェーズは `Skill` ツールで `playtest-triage` スキルを呼ぶ（スキルは `.claude/skills/` に定義）。
コマンドとして起動できるもの（スキルとして定義済み）は `Skill` ツール経由、
それ以外の作業（実装・レビュー等）は `Agent` ツール経由——これが使い分けの原則。

---

## 総監督（人間）の関わりどころ

自己改善ループは自走するが、**価値判断とマージは常に人間**が握る。

| やること | 場所 |
|---|---|
| 仕事を出す | Issue 起票 → `Backlog`、GO を出すときだけ `Approved` へドラッグ |
| 成果を取り込む | ボードの `In review`（PR）をレビュー → 良ければマージ（→`Done` 自動） |
| 判断を返す | `Blocked` のコメントを見て `Approved` へ戻す or 却下 |
| チームを育てる | 不満を `director-feedback` で learnings に残す（= L3 を回す） |

> このファイルを更新したら、各正本（`.claude/agents/*.md` 等）との齟齬が無いか確認すること。
> 正本が動いたらここは追従する側。**ここを正本にしない。**
</content>
</invoke>
