# findings 台帳（指摘の引き継ぎ）

監修・専門家の指摘（特に非ブロッキングの🟡）と「人間提案（要承認）」を**イテレーション間で持ち越す**ための
台帳。指揮者が各レビュー後に追記し、showrunner が次の一手の最優先候補として読む。

## 運用
- レビュー直後、指揮者が新規指摘を追記する。
- 🔴 はそのイテレーション内で解決（loop-until-dry）。解決したら `resolved` に。
- 🟡 はスコープ外なら `open` で残す（理由付き）。次回 showrunner が拾う。
- 「人間提案（要承認）」は破壊的/正本改変の候補。人間が判断するまで `proposal` のまま。
- 解決済みは消さず `resolved`（日付）で版を残す（剪定は人間が定期的に）。

## 形式
```
- [status] (severity) source / file:eventID — 指摘の要旨。（round / 日付）
  status   = open | resolved | proposal
  severity = 🔴 | 🟡 | 提案
  source   = story-reviewer | learning-designer | code-reviewer | ai-dx-expert | … | showrunner
```

## エントリ

<!-- ここに指揮者が追記する。 -->

### 2026-06-20 / loop/ux-select-feedback-20260620（選択フィードバック: tick音+check-pop）

- [resolved] (🔴) code-reviewer / MiniGameHearing.tsx — 上限2ガードが stale クロージャの `picked.length` 依存で、連打（同一レンダー内の複数 toggle）で3件選択され得た。→ `setPicked` updater 内に `p.length >= 2` の二重ガードを追加し状態を権威化、`sfxTick` は updater 外維持で StrictMode 音重複も回避。（round1→2 / 2026-06-20 / PR #3）
- [resolved] (🟡) ux-engineer+reviewer / minigame/*.tsx — ring 薄い(/40→/60)・OFFグリフ暗い(slate-500→400)・Review上限なしのコメント欠如・Review内 `tone` 変数名被り(→cellStyle)。in-scope の4件を修正。（round1→2 / 2026-06-20 / PR #3）
- [open] (🟡) code-reviewer / minigame/*.tsx — `<span key={on?'on':'off'}>` のグリフ再マウントでアニメをリセットする手法は、SR（NVDA/VoiceOver）が button 内 DOM 変化をコンテンツ変更として通知する可能性。実機VoiceOver確認が必要。代替: `@starting-style`/`animation-play-state` で DOM 再マウントを避ける。（round1 / 静的判断の範囲、要実機）
- [resolved] (🟡) ux-engineer / minigame/*.tsx — check-pop は ON 時のみ。OFF時に色変化のみ。→ Issue #5 で `check-unpop`（控えめな縮みフェード）を追加。初回ロードの全OFFでは出さない（touchedRef でガード）・reduced-motion 無効。（2026-06-20 / Issue #5）
- [resolved] (🟡) ux-engineer / MiniGameHearing.tsx — 上限2到達後の3つ目タップが完全無反応で誤認され得る。→ Issue #5 で確定ボタンの shake ＋ `role=status aria-live=polite` 補足「すでに2つ選択中…」を追加（3秒で自動解除・再タップで延長、reduced-motion 無効、権威ガード不変）。（2026-06-20 / Issue #5）
- [open] (🟡) ux-engineer / engine/sfx.ts — AudioContext suspended（mobile Safari 等）で初回 tick が無音になり得る。tick は毎クリック鳴るため気づかれやすい。ただし sfxDecide/sfxSpin と共通の既存課題で新規ではない。（round1）
- [resolved] (提案) showrunner / data/seeds.ts:25 — `legacy-bridge` シードが懲罰分岐(`missedUpgrade`)でしか拾えず他5種と非対称。→ Issue #4 で中立イベント `s1-daily-legacy` choice b に seedId バインド追加し対称化（missedFlag の排他構造で二重発見は起きず冪等）。（2026-06-20 / Issue #4）
- [proposal] (提案) showrunner / components/Board.tsx:44 — localStorage boolean の try/catch 定型が4箇所重複。コード品質レーンの小リファクタ候補。
- [open] (🟡) quality-gatekeeper / minigame/MiniGame{Hearing,Review}.tsx — 選択UI(`<button>`+チェックグリフ)が両ファイルで重複（cpdクローン、今回22→26行に微増）。既存クローンの延長で新規ではないが、`SelectableItem` 共通コンポーネント抽出のリファクタ候補。設計判断のため別イテレーション。

### 2026-06-20 / Issue #4 / loop/legacy-bridge-seed-20260620（legacy-bridge 発見導線の対称化）

- [resolved] (🟡) story-reviewer / events-sprint1.ts:397,406 — s1-daily-legacy の choice a と b で「20年分の業務知識が埋まった」を逐語重複し読み味が単調。→ b の resultText を「承認フローを設計条件に組み込むと、20年ものの基幹を捨てず安全に橋渡しする道筋が立った」へ言い換えて解消（a は不変）。（round1→2 / 2026-06-20 / Issue #4）
- [resolved] (🟡) logistics-expert / events-sprint1.ts:406 — 「橋渡し」の対象が抽象／「読み解くと…見えた」の即時性が現場感覚より軽い。→ 上記 b 改稿で対象を「20年ものの基幹」に明示し「道筋が立った」へ。（round1→2 / 2026-06-20 / Issue #4）
- [open] (🟡) learning-designer+fde / events-sprint3.ts s3-daily-stuck-base choice b — 同一 seed legacy-bridge を s1（先回りの発見）と s3（リカバリ）の両方が出すため、s3 側 resultText の語り口を「種を見つけ損ねたが橋渡しの価値に追いついた」等リカバリ感に寄せると学びが明確化。**今回スコープ外（s3 は触れない指示）** のため次イテレーション候補。（round1 / 2026-06-20 / Issue #4）
- 考証/監修サマリ: fde🟢・logistics🟢・story-reviewer🟢・learning-designer🟢。round2 で 🔴ゼロ・対応すべき🟡ゼロ → dry。

### 2026-06-20 / Issue #5 / loop/select-feedback-allstates-20260620（選択の手応えを全状態で揃える）

- [resolved] (🔴) code-reviewer / index.css:63, MiniGameReview.tsx:12 — スコープ外の引用符の意図しない変更（diff 汚染）。→ U+201C/U+201D にバイト単位で復帰。（round1→2 / 2026-06-20 / Issue #5）
- [resolved] (🟡) code-reviewer / MiniGameHearing.tsx — limitHit タイマーが再タップで延長されない（useEffect 依存の state 変化頼み）。→ toggle 内で clearTimeout→setTimeout し延長、useEffect は cleanup 専用に。（round1→2 / 2026-06-20 / Issue #5）
- [resolved] (🟡) code-reviewer / MiniGameHearing.test.tsx — 新規 limitHit 演出のテスト不足。→ aria-live 表示／3秒後解除／再タップ延長の3テストを追加（vi.useFakeTimers）。239件緑。（round1→2 / 2026-06-20 / Issue #5）
- [open] (🟡) code-reviewer / MiniGameReview.tsx — revealed フェーズと選択フェーズが同一 map 内に同居し、revealed 分岐では glyphKey 等の計算が未使用になる。将来の混入リスク。コンポーネント/関数分離のリファクタ候補（設計判断・スコープ外）。（round1 / 2026-06-20 / Issue #5）
- [open] (🟡) code-reviewer / MiniGameHearing.tsx — 上限 aria-live は3秒残る。VoiceOver/NVDA は空化を無音で行うため、2s 程度への短縮余地（任意・微調整）。（round1 / 2026-06-20 / Issue #5）
- [open] (🟡) code-reviewer / MiniGameHearing.tsx — disabled の確定ボタンに shake が当たる組み合わせ（reduced-motion で緩和済み・許容範囲）。shake 対象を別要素にする案は任意。（round1 / 2026-06-20 / Issue #5）
- 監修サマリ: code-reviewer（設計＋a11y）round2 で dry（🔴ゼロ・対応すべき🟡ゼロ）。a11y は ux-engineer 実機自己点検＋e2e axe でも担保。
