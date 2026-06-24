# LOOP_ARCHITECTURE.md — 自己改善ループの設計図

このドキュメントは、FDE Agile Quest が「夜の間に自律的に磨かれる」仕組みの設計を
**Mermaid ダイアグラム付きで俯瞰する**ためのもの。
実装の正本は `.claude/agents/loop-autonomous-playtest.md`（1ティックの動作）と
`.claude/agents/loop-runbook.md`（1 Issue の実装 SOP）。

---

## 1. マクロ構造：3 層の改善ループ

```mermaid
graph TD
    L3["L3: 総監督フィードバック・ループ<br/>（日またぎ）<br/>人間のダメ出し → learnings"]
    L2["L2: キュー・ループ<br/>（1 ティック = 1 時間）<br/>Issue → PR → マージ待ち"]
    L1["L1: レビュー収束ループ<br/>（分単位）<br/>草稿 → 指摘尽きるまで反復"]

    L3 -->|"総監督の観点が<br/>L1/L2 の品質基準を底上げ"| L2
    L2 -->|"1 Issue の実装中に<br/>L1 を回す"| L1
    L1 -->|"dry になったら<br/>L2 に戻る"| L2
```

- **L1（分単位）**: 草稿 1 件を「🔴 ゼロ」まで磨く。権限分離（書く=maker / 見る=checker）で自己追認禁止。
- **L2（1 ティック）**: Issue をキューから拾い、PR まで運ぶ。背圧で暴走防止。
- **L3（日またぎ）**: 人間の指摘を `learnings/<agent>.md` へ一般化し、次回以降の基準を底上げ。

---

## 2. 1 ティックの動作フロー（A → E）

```mermaid
flowchart TD
    START(["外部 cron<br/>1 時間ごとに起動"]) --> A

    A["A. 背圧チェック\nbackpressure.mjs\n未マージ PR を数える"]
    A -->|"blocked: true\n（PR ≥ 上限）"| E
    A -->|"blocked: false\n（余裕あり）"| B

    B["B. バッチ取得\nnext-batch.mjs\n最大 3 件 FIFO"]
    B -->|"hasTask: false\n（キュー空）"| D
    B -->|"hasTask: true\n（tasks あり）"| C

    C["C. バッチ実装\nドメイン分類 → 並列ディスパッチ\n各 worktree で独立実行"]
    C -->|"全 PR 作成完了"| RUNLOG

    D["D. 発見フェーズ\nplaytest-triage skill\n上位 3 件を Backlog に起票"]
    D -->|"新規 Issue あり"| A
    D -->|"新規 Issue ゼロ"| E

    E(["E. アイドル\n次のティックまで待機"])

    RUNLOG["RUNLOG.md / findings.md 更新"]
    RUNLOG --> END(["1 ティック完了"])
```

---

## 3. C フェーズ詳細：並列バッチ実装

最大 3 件の Issue を「ファイル競合しない組」に分けて並列実装する。

```mermaid
flowchart TD
    BATCH["B から tasks を受け取る\n（1〜3件）"]

    BATCH --> CLASSIFY["C-1. ドメイン分類\nshowrunner がタイトル/本文を読んで判定"]

    CLASSIFY --> S1["ドメイン: s1\nevents-sprint1.ts"]
    CLASSIFY --> S2["ドメイン: s2\nevents-sprint2.ts"]
    CLASSIFY --> S3["ドメイン: s3\nevents-sprint3.ts"]
    CLASSIFY --> UX["ドメイン: ux\nsrc/components/"]
    CLASSIFY --> SH["ドメイン: shared\n（複数ファイル）"]

    S1 & S2 & S3 & UX --> GROUP["C-2. グループ判定\n異ドメイン → 並列\n同ドメイン or shared → 直列先頭1件"]
    SH --> GROUP

    GROUP -->|"並列グループ\n（2 件以上・異ドメイン）"| PARALLEL
    GROUP -->|"1 件のみ\nor 全件 shared"| SERIAL

    PARALLEL["C-3. 並列ディスパッチ\n複数 Agent を同一ターンで呼び出し\nisolation: worktree で独立実行"]
    SERIAL["C-3. シングル実装\n従来通り 1 Agent"]

    PARALLEL --> RB1["worktree-A\nloop-runbook.md 手順1〜5"]
    PARALLEL --> RB2["worktree-B\nloop-runbook.md 手順1〜5"]
    PARALLEL --> RB3["worktree-C\nloop-runbook.md 手順1〜5"]
    SERIAL --> RB4["loop-runbook.md 手順1〜5"]

    RB1 & RB2 & RB3 & RB4 --> PR["PR 作成 → inReview へ移動"]
```

### ドメイン分類キーワード早見表

| ドメイン | タイトルに含まれるキーワード | 主なファイル |
|---|---|---|
| `s1` | `s1-` / `Sprint1` / `S1` のみ | `events-sprint1.ts` |
| `s2` | `s2-` / `Sprint2` / `S2中盤` / `S2後半` | `events-sprint2.ts` |
| `s3` | `s3-` / `Sprint3` / `S3` のみ | `events-sprint3.ts` |
| `ux` | `ResultModal` / `コンポーネント` / `UI` / `画面` / `操作感` / `a11y` | `src/components/` |
| `shared` | 複数スプリントをまたぐ / 上記に当てはまらない | 複数ファイル |

---

## 4. 暴走防止の三層

```mermaid
graph LR
    subgraph "安全網（GO なしでも破綻しない）"
        BP["① 背圧\nPR ≥ 上限で生産停止\n人間のマージ速度が律速"]
        RATE["② 発見レート制限\n1 ティック 3 件まで\n重複起票しない"]
        BLOCK["③ 自動 Blocked\n正本改変・破壊的変更は\n自走しない → 人間へ"]
        MERGE["④ マージは人間\ncapability deny で禁止\n最終ゲートは PR"]
    end
    BP --> RATE --> BLOCK --> MERGE
```

---

## 5. ループの収束と停止

```mermaid
stateDiagram-v2
    [*] --> Running : /loop 起動
    Running --> Backpressure : PR ≥ 上限
    Running --> Implementing : キューあり
    Running --> Discovering : キュー空
    Backpressure --> Running : 人間がマージ
    Implementing --> Running : PR 作成完了
    Discovering --> Running : 新規 Issue あり
    Discovering --> Idle : 発見ゼロ
    Idle --> Running : 次ティック
    Running --> [*] : /loop 停止
```

収束トリガー:
- **背圧で止まる**: `In review` の PR が上限に達したらアイドル（人間のマージ待ち）
- **キューと発見が枯れる**: やることが何もなければ長めのアイドル
- **手動停止**: 総監督が `/loop` を止めたとき

---

## 6. 関連ファイル一覧

| ファイル | 役割 |
|---|---|
| `.claude/agents/loop-autonomous-playtest.md` | 1 ティックの動作正本（**このドキュメントの実装元**） |
| `.claude/agents/loop-runbook.md` | 1 Issue を実装する SOP（L1 + L2 の手順書） |
| `.claude/agents/loop/next-batch.mjs` | キューから最大 N 件を返すスクリプト |
| `.claude/agents/loop/next-auto.mjs` | キューから 1 件を返すスクリプト（単体実行用） |
| `.claude/agents/loop/backpressure.mjs` | 背圧チェックスクリプト |
| `.claude/agents/loop/config.json` | 上限・バッチサイズ等の設定 |
| `.claude/agents/ledger/RUNLOG.md` | ティックごとの作業記録（朝の引き継ぎ） |
| `.claude/agents/ledger/findings.md` | 非ブロッキング指摘の持ち越し台帳 |
| `docs/SELF_IMPROVEMENT.md` | 3 層ループの概念説明（入口ドキュメント） |
| `.claude/agents/loop-meta-engineer.md` | ループ構造の自己改善エージェント（メタ改善担当） |
| `.claude/skills/loop-meta/SKILL.md` | 単発でループ構造を診断・修正するスキル |

> **このファイルは設計図（地図）であって正本ではない。**
> 正本は各 `.claude/agents/*.md` とスクリプト群。実装が変わったらここを追従する。
