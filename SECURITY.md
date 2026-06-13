# セキュリティ方針 / 既知の `npm audit` 指摘について

本プロジェクトの**本番成果物（`dist/`：GitHub Pages で配信する静的 HTML/CSS/JS）**には、
ビルドツール（vite / esbuild / vitest 等）は一切含まれません。production dependencies は
`react` / `react-dom` / `zustand` のみです。

## 受容している既知の指摘（accepted risk）

`npm audit` で **esbuild の高深刻度1件**が残ります。これは意図的に受容しています。

- 該当: **GHSA-gv7w-rqvm-qjhr**
  「Missing binary integrity verification in Deno module enables RCE via `NPM_CONFIG_REGISTRY`」
- 影響範囲: esbuild を **Deno**（`deno.land/x/esbuild` 等）経由で導入した場合のバイナリ取得経路。
  本プロジェクトは **npm/Node 上で `vite build` する構成**であり、この Deno 導入経路は実行されません。
  → 当プロジェクトの実装・配信には**到達しない経路**（npm 構成における実質的 false positive）。
- dev 限定: esbuild / vite は devDependencies。ビルド出力には混入しません。

### なぜ修正版へ上げないか

パッチ版は **esbuild 0.28.1** ですが、これは **vite 6 のビルドを破壊**します
（`Transforming destructuring to the configured target environment is not supported yet` で `vite build` が失敗）。
一方 `vite-plugin-pwa@0.21` は **vite ≤6 のみ対応**のため、vite 7/8 へ上げて esbuild 0.28 を使う逃げ道も塞がれています。
よって「ビルドの安定性」を優先し、esbuild は vite 6 同梱の 0.25 系（CORS 系 GHSA-67mh-4wv8-2f99 は 0.25.0 で修正済み）に据え置いています。

### 再評価の条件（解消したら本ファイルから削除）

- `vite-plugin-pwa` が vite 7/8 に対応 → vite を上げて esbuild 0.28+ を採用、または
- esbuild が「0.28 系で vite 6 のビルドを壊さない」修正を出す。

## 開発時の運用

`npm run dev` / `vitest` を起動したまま**信頼できない Web サイトを開かない**こと
（dev サーバ系 advisory の前提条件を満たさないため）。dev サーバを外部公開しない。

## これまでに解消した指摘

- esbuild dev-server CORS（GHSA-67mh-4wv8-2f99）: vite 6 同梱の esbuild 0.25.x で修正済み。
- vite 5 / vite-node 系の path traversal 等: **vitest を 4 系へ更新**して解消（テスト専用・本番ビルドの vite 6 とは独立）。
