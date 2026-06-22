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

## 持ち越しバックログ（次の一手・優先候補）

下の日付別エントリに散在する `[open]` 🟡 を、showrunner が次イテレーションで拾いやすいよう優先度順に集約した一覧（2026-06-22 / R5 時点）。詳細・根拠は各日付エントリ参照。**着手したら該当行を resolved にし、ここからも消す。**

### 対応候補（actionable）
1. ~~選択UIの `SelectableItem` 共通化~~ → **[resolved] PR #22**（SelectableCheckItem＋useGlyphSelection 抽出、cpd 7.27%→3.07%）。2026-06-22
2. ~~BacklogPanel.tsx 1307行の分割~~ → **[resolved] loop/backlogpanel-split-20260622**（backlog/PlanningView.tsx・KanbanView.tsx・BacklogShared.tsx へ分割、振る舞い不変・公開API不変・circular無・knip clean）。2026-06-22
3. ~~(物語/学習) S3デイリー requiresFlag回収の過密~~ → **[resolved/部分] loop/s3-recovery-declutter**（D-3: location分散で「1場所1代表」衝突を緩和＝serverroomの山4→2・fraudClue3件を別location維持・rework→warehouse/joushi-deprioritized→client。data のみ・engine無改修・313緑）。2026-06-22
   - [open] (記録) **D-1（自分の選択の帰結を review/retro へ確実提示）は engine 制約で不可**＝s2-retro が必須で全員 topDown/genbaTrust を立て、s3-review/retro 単発ビートが常にそのバリアント(avail[0])に占有されるため、deprioritized/soloHero を移すと到達不能になる。到達不能を作らないため見送り。残る死蔵（枠5<同時解放6+）は変動＝味として A 許容（agile-expert 推奨どおり）。根治には engine 改修（drawの回収複数提示等）が必要＝別途要判断。
4. ~~(学習・要承認) s2-daily-debt の取り立て連鎖~~ → **[resolved] loop/debt-collection**（総監督承認のもと新フラグ `borrowedDebt`＝types/threads/store登録、s2-daily-debt choice a に setsFlag＋repo debt+2、新イベント s2-daily-debt-collection を**S2に配置＝#3を悪化させず**、undone-debt とは「約束履行」軸で機構差別化（b: trust据え置き）。story🟢/learning🟢/全ゲート緑）。2026-06-22
   - [open] (🟡低) learning/story — 取り立てイベントの surface は requiresFlag共通の確率依存（#3 と同根）／先送りの「利息逓増（複利感）」は任意の磨き込み余地。いずれも誤学習はせず・致命でない。
5. ~~(UX/a11y・要実機) ミニゲームの SR/音まわり~~ → **[resolved/精査] コード変更不要（ux-engineer a11y精査）**: ①グリフ再マウントは `aria-hidden` で SR 通知対象外・状態は `aria-pressed` が伝え既に安全（CSS-only化は iOS<17.4 切捨てのため不採用）／②aria-live 3秒は27字の可読性に必要で短縮せず／③sfx.ts は既に user-gesture 起点で `ctx.resume()`・WebAudio仕様で past-time スケジュールは resume 後に発火＝手当て済み。2026-06-22
   - [open] (要実機・申し送り) 最終確認は実機のみ: (a) iOS Safari でヒアリング初回タップの tick が鳴るか（初回無音なら resume 完了前スケジュールを再検討）／(b) VoiceOver で選択ON/OFF時に二重読み上げが無いか（期待: aria-pressed の切替のみ）。
6. ~~(物語) s3-daily-stuck-base choice b のリカバリ感~~ → **[resolved] loop/carryover-6-7**（s3側resultTextを先回り↔痛んでから追いついた の非対称に、2文へ圧縮）。2026-06-22
7. ~~(設計・小) Board.tsx bumpCoach→useReducer/useMemo化、Travel.tsx renderRoom/renderMapPin→Room/MapPinコンポーネント化、MiniGameReview revealed分離~~ → **[resolved] loop/carryover-6-7**（振る舞い不変・型統一・dead key除去）。2026-06-22
8. **(設計・小／#2分割中に確認＝既存) PlanningView の editState draft は useState初期値のみで backlogOrder 外部変更時の再同期パスが無い（モーダル再マウント前提で実害低）。KanbanView の `retroImprovements` が独立prop＋coreフィールドの二重ルート（現状同一ソースで無害だが将来乖離リスク）。** いずれも分割前 main から既存・分割で新規導入ではない。

### 対応不要（意図的・記録のみ）
- chapter-01.ts FINALE/exposed系 — 第1章では到達不能なドーマント（「次章へ繰延」明示済み・意図的）。第2章実装時に活性化。
- s3-review-topdown choice b の支配選択化 — 逃げ道復活（R5仕様バグ修正）の必然的帰結。「過ちの精算ビート」局面で許容、resultTextの抑制表現で過剰報酬の誤学習も回避済み（learning-designer判定：致命傷なし）。
- 用語「フォーキャスト」→「スプリント予測」（公式日本語訳準拠）= **[resolved] PR #23**（2026-06-22・バックログ外の総監督依頼）。

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

### 2026-06-22 / 総監督直接GO / loop/all-agents-review-20260622（全エージェント総出レビュー R5＋仕様バグ監査）

専門家5＋監修3を現状main全体に並列適用→makerが修正→再考証をdryまで反復。総監督指示「仕様バグ（後でゲームが成立しなくなる矛盾含む）は絶対に直す」を受け、ゲーム整合性の敵対的監査を追加実施。

- [resolved] (🔴相当) code-reviewer / minigame/MiniGameDev.tsx:57 — `window.setTimeout(onResolve)` がアンマウント未クリア（420ms以内のアンマウントで unmounted 後 onResolve 発火の latent バグ）。→ timerRef 化＋useEffect cleanup で clearTimeout。さらに onResolveRef で stale closure も塞ぎ Roulette の escapeRef パターンに統一。（round1-3 / 2026-06-22）
- [resolved] (🔴/仕様バグ) engine監査 / events-sprint3.ts:702-733 s3-review-topdown — 単発レビューの強制イベントが2択とも trust− で、trust=1到達時に回避不能の強制失敗（兄弟3イベントは安全選択あり＝不変条件違反）。総監督承認の上、choice b を `{insight:1,trust:-1}`→`{insight:1}` にし逃げ道を復活、resultTextを整合書換。story🟢/learning🟢（観点1-2強化）。（2026-06-22）
- [resolved] (🟡) 複数 / cast.ts — canonical「カルゴ物流」表記とSTORY.md表示名「翠流物流」の乖離→読み替え注記を追記。（round1）
- [resolved] (🟡) agile / events-sprint1.ts:773 s1-review・:807 s1-retro・events-sprint3.ts:731 s3-review-topdown・:855 s3-retro-trust — forecast/commitment語法の混線・レビュー/レトロ役割境界・DoD未達の完成扱い明示。fortcast語法をキャンペーン全体で統一。（round1-3）
- [resolved] (🟡) story / events-sprint3.ts:673 s3-daily-craft — 久遠同席前提のhearingを自己内省/田淵向けに再ターゲット（場面二重化解消）。（round1）
- [resolved] (🟡) learning / events-sprint3.ts:531/564/595 boundary/lastman/drive — 「責任引受＝無条件に得」の支配選択化を、メーター値不変のままb resultTextに機会コスト一文をadditive追記し緩和。（round1）
- [resolved] (🟡) ai-dx / glossary.ts:162 RAG・logistics / locations.ts:40 serverroom — 説明補強（ハルシネーション抑制の狙い／出荷停止の主語を基幹WMSへ）。（round1）
- [resolved] (🟡) code-reviewer / Roulette/Travel/MiniGameDev — prefers-reduced-motion スナップショット重複→ usePrefersReducedMotion フックに共通化。MiniGameDevPuzzle のフォーカスを confirmRef+useEffect 方式へ統一・data-initial-focus 表記統一・full二重フォーカスをhasFocusedRefで1回化。（round1-3）
- [open] (🟡) engine監査 / events-sprint3.ts S3デイリー群 — requiresFlag回収イベントがS3デイリー5枠に対し過密で、1周回で解放された回収の一部が死蔵しうる（進行は止まらない＝体験ムラ）。「1周回で確実に拾える上限」の設計課題。次イテレーション候補。
- [open] (🟡) engine監査 / chapter-01.ts FINALE/exposed系 — 第1章では finalEndingFor が常に finalePending:false で到達不能なドーマント（コメントで「次章へ繰延」明示済み・意図的）。第2章実装時に活性化。
- [open] (🟡) learning / events-sprint3.ts:726 s3-review-topdown b — 逃げ道復活の必然的帰結でbがメーター上の支配選択（aは二重罰）。「過ちの精算ビート」局面では許容範囲・resultTextの抑制表現で過剰報酬の誤学習は回避済み（learning-designer判定：致命傷なし・再修正不要）。
- [open] (🟡) learning / s2-daily-debt — 技術的負債を借りる選択に取り立て連鎖が無く「借りた者勝ち」誤読余地。setsFlag/新イベント接続=mechanics改変につきスコープ外。
- [open] (🟡/設計) code-reviewer / BacklogPanel.tsx 1307行・state machine union化、Board.tsx命名/IIFE、Travel.tsx renderRoom/Pinコンポーネント化 — リファクタ規模大・設計判断。別イテレーション。
- 監査サマリ: 専門家fde🟢logistics🟢robotics🟢ai-dx🟢agile🟢／監修story🟢learning🟢code🟢。**ゲーム整合性: ソフトロック/クラッシュ/到達不能/結末不定の🔴ゼロ**（エンディングは`match:()=>true`＋`?? endings[last]`で二重網羅・フラグ配線はthreads.test/term-coverage/game.testで構造担保・discoversPbi手動検証OK）。全ゲート緑（vitest313/build/size160.47kB<164/CSS9.15<10/e2e3-3 axe/lighthouse）。round3＋仕様バグ修正再考証で dry。
