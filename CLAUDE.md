# CLAUDE.md — エージェント運用ガイド

FDE Agile Quest（FDE心得 × アジャイル/スクラムを学ぶ、TypeScript + React 19 の教材ゲーム）でエージェントが作業するための入口。人間向けの概要は `README.md` を参照。

## 真実源（最重要・この順で絶対視する）

物語の**正本はコード**（`src/data/chapters/chapter-01/`）。`docs/` はその設計意図を人間可読にしたもの。

1. `docs/STORY.md` — 設定の正本。**§3 メーター原則**と**§9 レビュー観点**は憲法。全イベントがこれを満たす。
2. `src/data/chapters/chapter-01/cast.ts` — 物語バイブル（キャラ・呼称・フェーズ・エンディング）。
3. `docs/MOTIFS.md` — 抽象化された原型（新規追加時のテンプレ）。
4. `docs/EVENT_INDEX.md` — 全イベント目録（**自動生成・手で編集しない**）。

## 開発コマンド

- `npm run dev` — ローカル起動（Vite）。
- `npm run check` — **pre-commit ゲート**: `typecheck`（tsc strict）→ `check:lint`（biome）→ `test`（vitest）。
- `npm run gen:index` — events を変えたら `docs/EVENT_INDEX.md` を再生成。

## 品質ゲート（この順で緑にする・閾値は緩めない）

1. `npm run check` — 型 + lint + ユニットテスト
2. `npm run check:all` — 上記 + `circular`（madge）+ `knip`（不要コード）+ `type-coverage`（**99%厳守**）+ `cpd`（重複）
3. `npm run build` — 本番ビルド（型エラーゼロ必須）
4. `npm run size` — バンドル予算（JS ≤164kB / CSS ≤10kB, brotli）
5. `npm run lighthouse` — a11y・best-practices ≥95%（error gate）
6. `npm run test:e2e` — Playwright + axe（WCAG A/AA）

**ゲートを緩めない**: 閾値の引き下げ・ルール無効化・`.skip` 濫用は禁止。通せないなら原因を報告してエスカレーション。

## コンテンツ追加フロー

1. `src/data/chapters/chapter-01/events-sprint*.ts` を編集
2. `npm run gen:index` で `EVENT_INDEX.md` 再生成
3. `docs/STORY.md §9` チェックリストで検証（呼称・設定継続・メーター原則・フラグ配線・エンディング整合・用語）

## Do / Don't

- ✅ data 変更と `docs/` 変更はセットでコミット / 新ロジックには `progression.test.ts` 流のテストを足す
- ❌ type-coverage 99% を割らない
- ❌ a11y（biome の error ルール）を緩めない
- ❌ `console.log` を足さない（warn・error のみ。biome が検出）
- ❌ フラグ駆動イベントの分岐（setFlag → requiresFlag の順序・排他）を壊さない
- ❌ STORY.md の**改変・retcon・新章・新キャラ**は自走しない → **人間にエスカレーション**（既存フレーム内の追加は可）

## エージェント運用

`.claude/agents/README.md`（チーム憲章）と `.claude/agents/loop-runbook.md`（1イテレーションのSOP）が運行の正本。役割は **maker（書く: narrative-designer / ux-engineer）／ checker・expert（指摘のみ・read-only）／ quality-gatekeeper（ゲート実行）** に権限分離され、自己承認が構造的に起きない。総監督のダメ出しは `director-feedback` スキルで各 `.claude/agents/learnings/<agent>.md` に蓄積し、作業前に読む。

land は feature ブランチ → PR → 人間レビューのみ。main への直 push / force-push / `gh pr merge` はしない（`.claude/settings.local.json` の `permissions.deny` で技術的に禁止）。
