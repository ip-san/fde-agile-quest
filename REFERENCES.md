# 参考文献・出典

FDE Agile Quest の世界観・学習コンテンツ・ゲーム設計が着想を得た一次資料をまとめる。
本作はこれらを**教材として引用・翻案**したものであり、原典の権利は各著作者に帰属する。
ゲーム内のテキストは原典の要約・再構成・物語化であって、原文の転載ではない。

## 1. マインドセット（学習の主題）

- **FDE心得100箇条** — アクセンチュア・テクノロジー（Zenn / acntechjp）
  - <https://zenn.dev/acntechjp/articles/da7ee421bb05fd>
  - 現場主義・実装主義・役割横断・顧客KPI志向。`src/data/precepts.ts` の100箇条と、
    各イベントが体現する「心得」マッピング（`EVENT_PRECEPTS`）の土台。

## 2. 設計手法（このプロダクトの作り方）

- **仮説のミルフィーユ**（note）— Core → Why → What → How の4層で仮説を積む壁打ち手法
  - コンセプト設計書（`/Users/…/.claude/plans/` の設計メモ）の骨格に使用。

## 3. スクラム（ゲームの構造とイベント題材）

- **The Scrum Guide 2020** — Ken Schwaber & Jeff Sutherland
  - 英語: <https://scrumguides.org/scrum-guide.html>
  - 日本語: <https://scrumguides.org/docs/scrumguide/v2020/2020-Scrum-Guide-Japanese.pdf>
  - 3つの確約 / 5つのイベント / 3つの責任 / 5つの価値基準 / 経験主義。
    キャンペーンの「Sprint × セレモニー」構造と、多くの判断イベントの題材。
- **The Scrum Guide Expansion Pack（2025）**
  - 公式: <https://scrumexpansion.org/>
  - Definition of Outcome（成果の定義）、Product Thinking、Stakeholder、複雑系（Cynefin）、
    AI統合、Flow/WIP、分散リーダーシップ等。第2幕・第3幕の上級イベント題材。

## 4. 物流ドメイン（現場の本物感）

- **JAVADA ビジネス・キャリア検定 ロジスティクス分野** — 中央職業能力開発協会
  - サンプル試験: <https://www.javada.or.jp/jigyou/gino/business/sample_test_r07l.html>
  - 区分: ロジスティクス（BASIC級）／ロジスティクス管理（2・3級）／
    ロジスティクス・オペレーション（2・3級）。
  - 倉庫管理・ピッキング・棚卸・誤出荷率・在庫回転率・充足率・3PL・WMS/TMS 等の用語と
    現場ディテール（`src/data/glossary.ts` の物流用語、`カルゴ物流／LOGI-PRO倉庫` の描写）。

## 5. 物語の重厚さ（ナラティブの型）

- **The Phoenix Project**（邦題『The DevOps 逆転だ！』）— Gene Kim, Kevin Behr, George Spafford
  - 崩壊寸前の中心事件、再登場キャラ、属人化したボトルネック（Brent 型）、
    メンター（Erik 型）、技術的負債が後で爆発する因果——プロローグと連続ストーリーの型。
  - キャラ・3幕構成は `src/data/chapters/chapter-01/cast.ts` に物語バイブルとして定義。

---

### 引用方針

- ゲーム内の用語解説（`glossary.ts`）・心得（`precepts.ts`）・イベント文は、上記原典の
  概念を**日本語で要約・翻案**したもので、原文をそのまま転載していない。
- スクラムガイドは Attribution-ShareAlike（CC BY-SA 4.0）で提供されている。本作の二次的
  教材としての利用はこの方針に沿う。商用利用や再配布の際は各原典のライセンスを確認のこと。
