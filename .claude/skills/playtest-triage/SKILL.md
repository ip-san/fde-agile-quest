---
name: playtest-triage
description: FDE Agile Quest をプレイテストして、見つかった飽き・離脱点を loop の改善 Issue（Backlog）として起票する手順書。playtest-critic がプレイ → 🔴🟡 を loop-task 形式に整形 → 重複を避けて Backlog に積む（GO=Approved は人間が出す）。直さず「仕事をボードに積む」役。「プレイテストして起票」「飽き点を起票」「プレイトリアージ」「playtest triage」「ボードに積んで」で呼び出す。
---

# playtest-triage — プレイテストして改善 Issue を起票する（発見専用）

playtest-critic にプレイさせ、見つかった**飽き・離脱点を loop の Backlog Issue として起票する**だけの手順書。
**直さない・PR も作らない**。修正は loop（または `playtest-gate`）の仕事で、ここは**ボードに仕事を積む**役。

## 立ち位置（playtest-gate との違い）

| | playtest-triage（この skill） | playtest-gate |
|---|---|---|
| 役割 | **発見 → 起票**（仕事を積む） | **試す → 直す → PR**（仕事をやる） |
| 出力 | Backlog Issue（loop-task 形式） | feature ブランチ＋PR |
| 直すか | **直さない** | 直す |
| GO | 人間が後で `Approved` へ | 不要（その場で着手） |

L1/L2 の橋渡し: ここで積んだ Issue を**総監督が `Approved`(GO) に動かすと loop が拾って実装**する
（`loop-runbook.md`）。playtest-critic に「見つける役」を担わせ、空のボードを埋める入口。

## 不変条件

- **起票先は必ず `Backlog`**。`Approved`(GO) には**絶対に置かない**（GO は人間の専権・ボード哲学）。
- **直さない**。コードや本文は一切編集しない。発見と起票だけ。
- **正本改変が要る指摘**（`docs/STORY.md` / `cast.ts` 既存設定の改変・retcon・新キャラ・新章）は、
  Issue の「想定リスク」に**改変が要る旨を明記**して起票する（loop はそこに着手せず Blocked にする）。
- **スパムを作らない**: 既存 open Issue と重複する指摘は起票しない（下記の重複防止）。

## 手順

### 1. 準備
- `.claude/agents/learnings/playtest-critic.md` と `ledger/findings.md` の未解決🟡（playtest 由来）を読む
  ＝ 既知の指摘を再起票しないため。
- 既存 Issue を取得して重複チェックの土台にする: `gh issue list --state open --label loop --json number,title`

### 2. プレイ（playtest-critic）
- `Agent(subagent_type: playtest-critic)` に**対象範囲**（章/スプリント/画面/イベントID群、無指定なら通し）を渡し、
  つかみ / 中だるみ / 反復の単調さ / 手応え / 選択の重み / テンポ / 引き / 周回性 / **離脱点の名指し**を点検させ、
  🔴🟡🟢 を**局面名指し＋一工夫ヒント付き**で出させる。

### 3. 起票候補に絞る（量を制御）
- 起票するのは **🔴 を優先し、上位 N 件まで**（既定 N=3。多すぎるとボードが氾濫し GO 判断が鈍る）。
- **重複防止**: 既存 open Issue（手順1）とタイトル/局面が実質同じものは**起票しない**。findings.md に
  既出の🟡も再起票しない。落とした指摘は findings.md に「triage: 未起票（重複/上限外）」で残す。
- 🟢（強み）は起票しない（findings.md に伸ばす方向として記録するに留める）。

### 4. loop-task 形式で起票（1指摘=1 Issue）
各候補を `.github/ISSUE_TEMPLATE/loop-task.yml` の項目に**そのまま埋まる本文**に整形して起票する。
タイトルは `[loop] ` 接頭辞。本文は以下を Markdown で（フォームの各 label に対応）:

- **軸**: UX（操作感/演出/a11y）が大半。本文テンポなら「物語拡張」、用語/学びなら「学習設計」。
- **担当 maker**: UX＝`ux-engineer` / 本文・テンポ・引き＝`narrative-designer` / 不明なら「おまかせ」。
- **狙い・背景**: playtest-critic の「**どの局面で・なぜ飽きる/離脱するか**」を消費者の言葉で。
- **受け入れ条件**: 「飽きが消えたと言える状態」をチェックボックスで（例: `- [ ] 2スプリント目のレビューに"今日は違う"崩しが1つ入る`）。
- **スコープ**: 触れてよいファイル / 触れない範囲（`cast.ts` 既存設定・`STORY.md` は原則「触れない」）。
- **召集する専門家**: 物語テーマで該当するものだけ（UX 純度が高ければ無し）。
- **想定リスク・承認境界**: 既存枠内の追加なら「正本改変なし」。改変が要るなら明記（loop は Blocked 行き）。

起票コマンド（本文はヒアドキュメントで渡す）:
```
gh issue create --title "[loop] <局面>の<飽き>を崩す" --label loop --body "<上記Markdown>"
```

### 5. ボードの Backlog に積む
起票しただけではプロジェクトボードに載らないので、各 Issue を Backlog へ:
```
node .claude/agents/loop/add-card.mjs <issue番号>        # 既定で Backlog
```
- `{"ok":true,...}` を確認。`ok:false` なら error を見て対処（多くは `gh auth refresh -s project -s read:project` 不足）。

### 6. 記録・報告
- 起票した Issue 番号/URL/局面と、**重複・上限で起票しなかった指摘**を `ledger/RUNLOG.md` に1ブロック追記。
- findings.md の起票済み項目に「issued: #<番号>」を付す。
- 総監督に「**N 件を Backlog に積んだ。GO を出すならボードで `Approved` へ**」と要約報告する
  （ここで GO は出さない＝人間の判断を待つ）。

## 完全自走ドライバから呼ばれるとき
`loop-autonomous-playtest.md`（GO 廃止の自己給餌ループ）の**発見フェーズ**として呼ばれる場合は、
人間の GO が挟まらず**起票がそのまま実装対象**になる。暴走を防ぐため、この skill の不変条件を特に厳守する:
- 件数上限は `config.json` の `limits.discoverPerTick`（既定3）に従う（手順3の N）。
- 重複除外を**最近マージ済みの修正にも**広げ、「直した→また同じ指摘」を作らない。
- **検収で閉じる**: 直近マージされた局面は playtest-critic に再評価させ、飽きが減っていれば再起票しない。

## 仕上げの一言
この skill の価値は「**飽きを直す**」ではなく「**飽きを"着手可能な単位の仕事"に変えてボードに乗せる**」こと。
起票は**少なく・重複なく・受け入れ条件が明確**であるほど良い。量より、（人間運用なら GO を、自走なら実装を）
迷わせない質。
