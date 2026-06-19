---
name: quality-fix
description: FDE Agile Quest の品質ゲートを一括実行し、失敗を分類して「安全な修正は自動適用／判断が要る指摘は診断して修正／直せないものは原因と修正案を報告」まで行う。再実行で緑を確認して差分を要約する。「品質ゲート」「品質チェック」「品質修正」「自動改善」「ゲート直して」「check:all 直して」「CIを緑に」で呼び出す。
---

# quality-fix — 品質ゲートの実行と知的修正

このプロジェクトの品質ゲート（Biome / typecheck / vitest / madge / knip / type-coverage /
jscpd / size-limit / Lighthouse / Playwright+axe）を**回して、直して、緑を確認する**までを担う。
CI（`.github/workflows/ci.yml`）とローカル pre-commit が「検出」する。この skill は **検出＋修正** を担当する。

## 最重要原則（先に読む）

- **ゲートは緩めない**。閾値を下げて緑にするのは禁止。根本を直す。具体的には次を**勝手にやらない**：
  - size-limit の `limit` 引き上げ／type-coverage の `--at-least` 引き下げ
  - axe ルールや lint ルールの無効化、knip の `ignoreDependencies`/`ignore` 追加
  - `--no-verify` でのコミット、テストの `.skip`、`biome-ignore` の乱用
  これらが本当に必要な場合は**理由を添えてユーザーに確認**してから。
- **直せるものと直せないものを分ける**。判断が要るものは機械任せにせず、根拠を述べて修正する。
- **無関係な未追跡ファイルに触れない**（例: `public/review-*.html` はセッション無関係）。
- **コミットは勝手にしない**。修正後に差分を要約し、コミットするかはユーザーに委ねる
  （明示依頼があればコミット。デフォルトブランチ運用なので push 前に確認）。

## ゲート一覧（コマンド → 検出対象 → 自動修正可否）

| コマンド | 検出するもの | 自動修正 |
|---|---|---|
| `npm run check:lint`（biome） | 整形・lint・import 整順 | ✅ `biome check --write src/ scripts/` |
| `npm run typecheck` | 型エラー | ❌ 型を補う（判断） |
| `npm test`（vitest） | 単体テスト失敗 | ❌ 原因を直す（判断） |
| `npm run circular`（madge） | 実行時の循環依存 | ❌ 依存を分離（判断）。型のみ循環は `.madgerc` の skipTypeImports 対象 |
| `npm run knip` | 未使用ファイル/export/依存 | △ 個別判断（下記 playbook） |
| `npm run type-coverage` | 型カバレッジ < 99% | ❌ `any`/未型付けに型を付ける |
| `npm run cpd`（jscpd） | 重複コード > 2% | ❌ 共通化（判断） |
| `npm run size` | バンドルサイズ超過 | ❌ 原因分析（依存肥大/分割） |
| `npm run lighthouse` | perf/a11y/best-practices/seo | △ a11y/BP は個別修正 |
| `npm run test:e2e` | e2e a11y（axe, モーダル状態） | △ 違反を個別修正（下記） |

注: `size`/`lighthouse`/`test:e2e` は **`npm run build` で dist を作ってから**実行する
（preview が dist を配信するため）。

## ワークフロー

### 1. スコープ確認と一括実行

```bash
git status --short            # 無関係な未追跡を把握（触らない）
npm run check:all             # typecheck→lint→test→circular→knip→type-coverage→cpd
npm run build                 # 本番ビルド（dist 生成）
npm run size                  # サイズ予算
npm run lighthouse            # Lighthouse（要 dist）
npm run test:e2e              # e2e a11y（要 dist）
```

落ちたコマンドの**生ログを必ず読む**（件数だけで判断しない）。並行で速くしたい場合も、
失敗箇所の特定はログ本文から行う。

### 2. 失敗を3分類

- **安全修正系**: Biome の整形/lint/import → 即 `biome check --write src/ scripts/`
- **判断系**: knip 指摘・a11y/コントラスト・小さな未使用 → 下記 playbook に従って修正
- **分析系**: 型カバレッジ・循環・重複・size・perf → 原因を要約し、軽微なら修正、
  大きい/設計判断を伴うものは**修正案を提示してユーザーに確認**

### 3. 修正 playbook（このプロジェクトの実績に基づく判断）

- **knip「unused export」**:
  - その記号が**ファイル内で内部利用されている** → `export` だけ外す（モジュール private 化）。
    例: `METER_MIN` / `clampTokens` / `DAILY_ROLES` / `DailyRoleDef`。
  - **どこからも使われていない**（テスト含む） → 削除。ただし将来 API らしき公開物は
    一言確認。例: `CAST_BY_ID` を削除。
  - **テストだけが使う export** → 残す（テストは利用とみなす）。knip は通常テストを
    エントリ扱いするので誤検知なら設定ではなく実体を確認。
- **knip「unused file/dependency」**:
  - 手動実行の CLI（`scripts/*.mjs`）→ `knip.json` の `entry` で既にカバー。新規追加時のみ確認。
  - CSS 経由など静的解析で追えない依存（例 `tailwindcss`） → `ignoreDependencies` は
    **本当に追えない場合のみ**・コメント付きで（むやみに足さない）。
- **コントラスト（axe / Lighthouse a11y）**:
  - dark テーマで `text-slate-500` 等が AA(4.5:1) 未満 → より明るいトークン（`text-slate-400`）へ。
    プロジェクトは `text-slate-400` 基準で統一済み。新規の暗いテキストは 400 以上を使う。
  - 修正後は必ず `npm run build && npm run test:e2e` で axe 再検査。
- **e2e a11y（構造系: role/name/focus/aria）**: ラベル無しボタン・aria 不整合・フォーカス順序など。
  既存の `useFocusTrap` / `aria-modal` パターンに合わせて直す。ルール無効化で逃げない。
- **type-coverage 低下**: 新しく入った `any`/暗黙 any に具体型を付ける。`as any` で誤魔化さない。
- **循環依存**: 実行時の循環は依存方向を見直す（型だけなら `import type` にして `.madgerc` で除外済み）。
- **size 超過**: 何が増えたかを `npm run build` のチャンク出力で特定。不要 import/重い依存を削る。
  安易な `limit` 引き上げはしない。
- **jscpd 重複**: 重複ブロックを関数/共通化。data 配下（定型）は対象外設定済み。

### 4. 再実行して緑を確認

修正したカテゴリのコマンドを**必ず再実行**。コントラスト/perf/e2e を直したら
`npm run build` を挟んでから `size`/`lighthouse`/`test:e2e` を回す。
全部緑になるまで（または設計判断でユーザー確認が要る所で）反復する。

### 5. 要約して引き渡す

- 直した内容を「カテゴリ → 何を・なぜ」で簡潔に列挙（ファイルパス付き）。
- 自動修正と判断修正を区別して示す。
- 直さず**報告に留めた項目**（設計判断・閾値関連）は理由とともに明示。
- コミットするかをユーザーに確認（依頼があれば、品質ゲート由来の変更のみを stage して
  コミット。無関係な未追跡ファイルは含めない）。

## やってはいけないこと（再掲）

- ゲートを緩める/無効化する/`--no-verify` で迂回する（根本を直す）。
- 件数だけ見て修正する（必ず生ログ・対象ノードを読む）。
- 無関係ファイルや未確認の公開 API を勝手に消す。
- 緑になっていないのに「直った」と報告する。
