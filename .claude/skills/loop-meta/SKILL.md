---
name: loop-meta
description: FDE Agile Quest の改善ループ自体を診断・改善する。loop-autonomous-playtest.md / loop-runbook.md / エージェント定義 / スキル定義 / ループスクリプトを対象に、設計の矛盾・曖昧さ・非効率を診断し feature ブランチ→PR で修正提案する。「ループを直して」「エージェントを更新して」「loop設計を見直して」「ループ構造を改善して」で呼び出す。game code（src/）・物語正本（STORY.md/cast.ts）は触らない。
---

# loop-meta — ループ構造の自己改善スキル

**改善ループ自体を改善する**手順書。ゲームや物語には触れず、**ループの設計・エージェント定義・
スキル定義・ループ設定**を対象に診断し、PR として修正提案する。

> この skill の正本は `.claude/agents/loop-meta-engineer.md`。loop からの委任はそちらへ。
> この skill は「今すぐ1回直したい」単発呼び出し用。

## スコープ（触れてよいもの）

- ループドライバ: `.claude/agents/loop-autonomous-playtest.md` / `loop-autonomous.md`
- 実装SOP: `.claude/agents/loop-runbook.md`
- エージェント定義: `.claude/agents/*.md` / `README.md`
- スキル定義: `.claude/skills/*/SKILL.md`
- ループスクリプト: `.claude/agents/loop/*.mjs`
- ループ設定: `.claude/agents/loop/config.json`
- 設計ドキュメント: `docs/LOOP_ARCHITECTURE.md` / `docs/SELF_IMPROVEMENT.md`
- learnings: `.claude/agents/learnings/<agent>.md`
- 台帳: `.claude/agents/ledger/RUNLOG.md` / `findings.md`

## 触れてはいけないもの（絶対）

- `src/` 配下のゲームコード・テスト
- `docs/STORY.md` / `src/data/chapters/chapter-01/cast.ts`（物語正本）
- ゲームデータ: `src/data/chapters/chapter-01/events-sprint*.ts`
- `biome.json` / `tsconfig.json` / `.github/workflows/` の品質閾値（緩和禁止）
- main 直 push / force-push / 自動マージ

---

## 手順

### 1. 入力を確認

**指示が具体的な場合**（「D フェーズで Skill ツールを呼ぶように書き直して」等）:
→ 手順2（問題の整理）へ直行。

**指示が曖昧な場合**（「ループを点検して」「自己診断して」等）:
→ 以下の自己診断を先に実施:
  1. `RUNLOG.md` の直近10エントリから繰り返しパターンを抽出
  2. `findings.md` の未解決🟡で loop 設計に関係するものを抽出
  3. 診断の観点7項目（明確さ/整合性/最新性/権限分離/暴走防止/トークン効率/学習ループ）を確認
  4. 問題リストと優先度（🔴🟡🟢）を**総監督に提示して GO を待つ**（自走しない）

### 2. 問題を整理（Before/After）

```
問題: <ファイル名:行番号> で <何が問題か>
影響: <どんな誤動作・非効率が起きるか>
修正: Before → After（差分）
リスク: <壊れる可能性があるもの>
```

### 3. ブランチを切って修正

```bash
git checkout -b meta/<topic>-<YYYYMMDD>
```

Edit / Write ツールでファイルを変更。

**変更後チェック**:
- [ ] ドライバの手順に矛盾がないか
- [ ] SOP の各ステップが生きているか
- [ ] README と整合するか
- [ ] 設計ドキュメントが追従しているか
- [ ] ゲートが緩まないか

### 4. PR 作成

```bash
git add <変更ファイル>
git commit -m "meta(<topic>): <変更要旨>"
gh pr create \
  --title "meta: <一行要約>" \
  --label loop-meta \
  --body "診断契機・問題・修正内容・影響範囲・テスト方法"
```

### 5. 報告・台帳更新

- PR URL を総監督に報告
- `RUNLOG.md` に1ブロック追記（何を・なぜ直したか）

---

## エスカレーション（自走せず人間に聞く）

- ループの根本的な設計変更（GO ゲート廃止・背圧上限の大幅変更・新フェーズ追加）
- エージェントの権限拡大（read-only に write を付与）
- チーム憲章の変更
- 品質ゲート閾値の変更（緩和方向はたとえ一時的でも禁止）
