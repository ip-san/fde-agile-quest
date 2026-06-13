# FDE Agile Quest

プログラマーを **FDE（Forward Deployed Engineer）** へリスキリングする、**ルーレット駆動の判断キャンペーン PWA**。

> 動くものは、百枚のスライドに勝つ。

## これは何

FDE主人公として案件を渡り歩き、**ルーレットを回す → 現場でイベント発生 → トレードオフ判断（正解なし）→ メーターが動く** を繰り返して、組織の文化を変えていくソロ向けゲーム。
プレイを通じて、FDE心得（現場主義・実装主義・役割横断・顧客KPI志向）と、アジャイル/スクラム・IT・マーケの用語に「いつの間にか」慣れることを狙う。

- **運が決めるのはお題（現場の不確実性）、勝敗を分けるのは判断。**
- メーター: 顧客の信頼 / 現場理解 / 巻き込み / 残スプリント。**全部を上げる単一最適解はない。**
- 用語は文中に埋め込み、ホバーで解説（従）。

詳しい設計思想（仮説のミルフィーユによる壁打ち）は `docs/` や企画メモを参照。

## 開発

```bash
npm install
npm run dev        # ローカル起動（http://localhost:5173）
npm test           # ゲームロジックの単体テスト（Vitest）
npm run typecheck  # 型チェック
npm run build      # 本番ビルド（dist/）
npm run preview    # 本番ビルドをプレビュー
```

## 技術スタック

React 19 + TypeScript + Vite + Tailwind CSS v4 + Zustand。
`vite-plugin-pwa` でインストール可能・オフライン対応。GitHub Actions → GitHub Pages 自動デプロイ（`base: /fde-agile-quest/`）。

## 構成

```
src/
  types.ts                      ドメインモデル
  data/
    glossary.ts                 用語集（{{用語}} ホバー解説）
    chapters/chapter-01.ts      第1章「沈黙する基幹システム」のイベント/エンディング
  engine/game.ts                純粋ロジック（効果適用・抽選・エンディング判定）+ テスト
  store/engagementStore.ts      Zustand 状態管理（localStorage 永続化）
  components/
    Board.tsx                   盤面（ヘッダー / HUD / ルーレット / ログ）
    Roulette.tsx                回転ルーレット（SVG）
    EventModal.tsx              イベント＝判断モーダル
    MeterHUD.tsx / EventLog.tsx / EndingScreen.tsx / RichText.tsx
```

## 章の足し方

`src/data/chapters/` に新しい章ファイルを追加し、`PHASES` / `EVENTS` / `ENDINGS` を定義する。
イベントの `segment` がルーレットのどのマスで引かれるかを決め、`narrative` / `label` / `resultText` に `{{用語}}` を埋め込むと自動でホバー解説が付く。
